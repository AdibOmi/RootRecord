import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.errors import BadRequest, Conflict, NotFound
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.schemas.common import PageParams
from app.schemas.user import UserCreate, UserUpdate
from app.services.auth_service import revoke_all_for_user


def get(db: Session, user_id: uuid.UUID) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise NotFound("User")
    return user


def list_users(
    db: Session,
    params: PageParams,
    *,
    q: str | None = None,
    role: UserRole | None = None,
    is_active: bool | None = None,
) -> tuple[list[User], int]:
    stmt = select(User)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(User.full_name.ilike(like), User.email.ilike(like)))
    if role is not None:
        stmt = stmt.where(User.role == role)
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.order_by(User.full_name).offset(params.offset).limit(params.page_size)
    ).all()
    return list(rows), total


def _ensure_email_free(db: Session, email: str, exclude_id: uuid.UUID | None = None) -> None:
    stmt = select(User.id).where(User.email == email)
    if exclude_id is not None:
        stmt = stmt.where(User.id != exclude_id)
    if db.scalar(stmt) is not None:
        raise Conflict("A staff account with this email already exists", code="email_taken")


def create(db: Session, data: UserCreate) -> User:
    email = data.email.lower()
    _ensure_email_free(db, email)
    user = User(
        email=email,
        full_name=data.full_name,
        phone=data.phone,
        role=data.role,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    db.commit()
    return user


def _ensure_not_last_admin(db: Session, user: User) -> None:
    if user.role != UserRole.ADMIN:
        return
    active_admins = db.scalar(
        select(func.count()).where(User.role == UserRole.ADMIN, User.is_active.is_(True))
    )
    if (active_admins or 0) <= 1:
        raise BadRequest("The clinic must keep at least one active admin", code="last_admin")


def update(db: Session, user: User, data: UserUpdate) -> User:
    changes = data.model_dump(exclude_unset=True)
    if "email" in changes and changes["email"] is not None:
        changes["email"] = changes["email"].lower()
        _ensure_email_free(db, changes["email"], exclude_id=user.id)
    if changes.get("role") not in (None, user.role):
        _ensure_not_last_admin(db, user)
    for field, value in changes.items():
        if value is None and field != "phone":
            continue
        setattr(user, field, value)
    db.commit()
    return user


def set_active(db: Session, user: User, active: bool, acting_user: User) -> User:
    if not active:
        if user.id == acting_user.id:
            raise BadRequest("You cannot deactivate your own account", code="self_deactivate")
        _ensure_not_last_admin(db, user)
        revoke_all_for_user(db, user.id)
    user.is_active = active
    db.commit()
    return user


def reset_password(db: Session, user: User, new_password: str) -> None:
    user.password_hash = hash_password(new_password)
    revoke_all_for_user(db, user.id)
    db.commit()


def ensure_bootstrap_admin(db: Session, email: str, password: str, name: str) -> User | None:
    """Create the first admin if the clinic has none. Returns the new user, if any."""
    if db.scalar(select(User.id).where(User.role == UserRole.ADMIN).limit(1)) is not None:
        return None
    user = User(
        email=email.lower(),
        full_name=name,
        role=UserRole.ADMIN,
        password_hash=hash_password(password),
    )
    db.add(user)
    db.commit()
    return user
