"""Management commands: `python -m app.cli <command>`."""

import sys

from app.core.config import get_settings
from app.core.db import SessionLocal
from app.services.user_service import ensure_bootstrap_admin


def bootstrap_admin() -> None:
    s = get_settings()
    with SessionLocal() as db:
        user = ensure_bootstrap_admin(
            db, s.bootstrap_admin_email, s.bootstrap_admin_password, s.bootstrap_admin_name
        )
    if user:
        print(f"[bootstrap] Created admin account: {user.email}")
    else:
        print("[bootstrap] Admin account already exists, skipping.")


COMMANDS = {"bootstrap-admin": bootstrap_admin}


def main() -> None:
    if len(sys.argv) != 2 or sys.argv[1] not in COMMANDS:
        print(f"Usage: python -m app.cli [{' | '.join(COMMANDS)}]")
        sys.exit(1)
    COMMANDS[sys.argv[1]]()


if __name__ == "__main__":
    main()
