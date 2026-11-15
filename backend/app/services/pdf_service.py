"""A filed prescription as a clean PDF for the patient (typed, not the handwritten photo)."""

import re
from datetime import date
from pathlib import Path

from fpdf import FPDF, FontFace
from fpdf.enums import XPos, YPos

from app.core.config import get_settings
from app.models.patient import Prescription
from app.services.patient_service import format_code

FONTS = Path(__file__).resolve().parent.parent / "assets" / "fonts"

INK = (33, 37, 41)
MUTED = (108, 117, 125)
RULE = (206, 212, 218)


def _day(value: date | None) -> str:
    return value.strftime("%d/%m/%Y") if value else ""


def filename(prescription: Prescription) -> str:
    assert prescription.patient is not None
    name = re.sub(r"[^A-Za-z0-9]+", "-", prescription.patient.full_name).strip("-") or "patient"
    day = prescription.visit_date.isoformat() if prescription.visit_date else "prescription"
    return f"prescription-{name}-{day}.pdf"


class _Pdf(FPDF):
    def __init__(self) -> None:
        super().__init__(format="A4")
        self.set_margins(18, 16, 18)
        self.set_auto_page_break(True, margin=18)
        self.add_font("NotoSans", "", FONTS / "NotoSans-Regular.ttf")
        self.add_font("NotoSans", "B", FONTS / "NotoSans-Bold.ttf")
        # Bangla falls back to its own font, shaped with HarfBuzz so conjuncts join up.
        self.add_font("NotoSansBengali", "", FONTS / "NotoSansBengali-Regular.ttf")
        self.add_font("NotoSansBengali", "B", FONTS / "NotoSansBengali-Bold.ttf")
        self.set_fallback_fonts(["NotoSansBengali"])
        self.set_text_shaping(True)
        self.set_text_color(*INK)

    def footer(self) -> None:
        self.set_y(-12)
        self.set_font("NotoSans", "", 8)
        self.set_text_color(*MUTED)
        self.cell(0, 5, f"Page {self.page_no()}/{{nb}}", align="R")

    def rule(self) -> None:
        self.set_draw_color(*RULE)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())

    def heading(self, text: str) -> None:
        self.ln(3)
        self.set_font("NotoSans", "B", 10)
        self.set_text_color(*MUTED)
        self.cell(0, 6, text.upper(), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(*INK)

    def body(self, text: str) -> None:
        self.set_font("NotoSans", "", 11)
        self.multi_cell(0, 6, text, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    def bullets(self, items: list[str]) -> None:
        self.set_font("NotoSans", "", 11)
        for item in items:
            self.cell(5, 6, "•")
            self.multi_cell(0, 6, item, new_x=XPos.LMARGIN, new_y=YPos.NEXT)


def render(prescription: Prescription) -> bytes:
    patient = prescription.patient
    assert patient is not None
    settings = get_settings()
    pdf = _Pdf()
    pdf.set_title(f"Prescription - {patient.full_name}")
    pdf.set_author(settings.clinic_name)
    pdf.add_page()

    # Clinic header
    pdf.set_font("NotoSans", "B", 16)
    pdf.cell(0, 8, settings.clinic_name, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    contact = " · ".join(filter(None, [settings.clinic_address, settings.clinic_phone]))
    if contact:
        pdf.set_font("NotoSans", "", 9)
        pdf.set_text_color(*MUTED)
        pdf.multi_cell(0, 5, contact, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_text_color(*INK)
    pdf.ln(3)
    pdf.rule()
    pdf.ln(3)

    # Patient line
    pdf.set_font("NotoSans", "B", 12)
    pdf.cell(0, 7, patient.full_name, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    details = [
        f"ID {format_code(patient.patient_code)}",
        f"{patient.age_years} years" if patient.age_years is not None else None,
        patient.sex.value.title() if patient.sex else None,
        patient.phone,
        f"Date {_day(prescription.visit_date)}" if prescription.visit_date else None,
    ]
    pdf.set_font("NotoSans", "", 10)
    pdf.set_text_color(*MUTED)
    pdf.multi_cell(0, 5, "   ·   ".join(d for d in details if d), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_text_color(*INK)
    pdf.ln(2)
    pdf.rule()

    if prescription.chief_complaint:
        pdf.heading("Complaint")
        pdf.body(prescription.chief_complaint)
    if prescription.diagnosis:
        pdf.heading("Diagnosis")
        pdf.body(prescription.diagnosis)
    if prescription.procedures:
        pdf.heading("Treatment done")
        pdf.bullets(prescription.procedures)

    if prescription.medications:
        pdf.heading("Medicines (Rx)")
        pdf.set_font("NotoSans", "", 10)
        with pdf.table(
            col_widths=(38, 14, 16, 16, 22),
            line_height=6,
            padding=1.5,
            borders_layout="HORIZONTAL_LINES",
            headings_style=FontFace(emphasis="BOLD", color=MUTED),
        ) as table:
            header = table.row()
            for label in ("Medicine", "Strength", "Dose", "Duration", "Instructions"):
                header.cell(label)
            for med in prescription.medications:
                row = table.row()
                row.cell(med["name"])
                for key in ("dosage", "frequency", "duration", "instructions"):
                    row.cell(med.get(key) or "")

    if prescription.advice:
        pdf.heading("Advice")
        pdf.bullets(prescription.advice)

    if prescription.follow_up_date:
        pdf.ln(4)
        pdf.set_font("NotoSans", "B", 11)
        pdf.cell(0, 7, f"Next visit: {_day(prescription.follow_up_date)}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.ln(6)
    pdf.set_font("NotoSans", "", 9)
    pdf.set_text_color(*MUTED)
    checked = (
        f"Checked by {prescription.verified_by.full_name}"
        if prescription.verified_by
        else "Typed from the handwritten prescription; not yet checked by the doctor."
    )
    pdf.cell(0, 5, checked, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    return bytes(pdf.output())
