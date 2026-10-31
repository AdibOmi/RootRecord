"""Import every model here so Alembic autogenerate and relationships can see them."""

from app.models.base import Base
from app.models.patient import Patient, PatientSex, Prescription, PrescriptionStatus
from app.models.user import RefreshToken, User, UserRole

__all__ = [
    "Base",
    "Patient",
    "PatientSex",
    "Prescription",
    "PrescriptionStatus",
    "RefreshToken",
    "User",
    "UserRole",
]
