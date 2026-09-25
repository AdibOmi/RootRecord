"""Shared validation helpers (Bangladesh-specific formats)."""

import re
from typing import Annotated

from pydantic import AfterValidator

_BD_MOBILE = re.compile(r"^01[3-9]\d{8}$")


def normalize_bd_phone(value: str) -> str:
    """Accept 01XXXXXXXXX, 8801XXXXXXXXX or +8801XXXXXXXXX; return +8801XXXXXXXXX."""
    digits = re.sub(r"[\s\-()]", "", value)
    if digits.startswith("+"):
        digits = digits[1:]
    if digits.startswith("880"):
        digits = "0" + digits[3:]
    if not _BD_MOBILE.match(digits):
        raise ValueError("Enter a valid Bangladeshi mobile number (01XXXXXXXXX)")
    return "+88" + digits


BDPhone = Annotated[str, AfterValidator(normalize_bd_phone)]
