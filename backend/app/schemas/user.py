import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, EmailStr, Field, StringConstraints

from app.core.validators import BDPhone
from app.models.user import UserRole
from app.schemas.common import ORMModel

Password = Annotated[str, Field(min_length=8, max_length=128)]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]


class UserOut(ORMModel):
    id: uuid.UUID
    email: str
    full_name: str
    phone: str | None
    role: UserRole
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime


class UserCreate(BaseModel):
    email: EmailStr
    full_name: Name
    phone: BDPhone | None = None
    role: UserRole
    password: Password


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: Name | None = None
    phone: BDPhone | None = None
    role: UserRole | None = None


class PasswordReset(BaseModel):
    new_password: Password


class PasswordChange(BaseModel):
    current_password: str
    new_password: Password


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
