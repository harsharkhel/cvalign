import io
from typing import Tuple

from PyPDF2 import PdfReader

from docx import Document


def read_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    texts = []
    for page in reader.pages:
        texts.append(page.extract_text() or "")
    return "\n".join(texts).strip()


def read_docx(file_bytes: bytes) -> str:
    doc = Document(io.BytesIO(file_bytes))
    texts = [p.text for p in doc.paragraphs if p.text]
    return "\n".join(texts).strip()


def extract_resume_text(filename: str, file_bytes: bytes) -> Tuple[str, str]:
    """
    Returns: (candidate_name_guess, extracted_text)
    MVP: candidate name is best-effort from first non-empty line.
    """
    extracted = ""
    lower = filename.lower()
    if lower.endswith(".pdf"):
        extracted = read_pdf(file_bytes)
    elif lower.endswith(".docx"):
        extracted = read_docx(file_bytes)
    else:
        raise ValueError("Invalid file type. Only PDF and DOCX are allowed.")

    # Clean/basic normalize
    extracted = extracted.replace("\r\n", "\n").strip()

    candidate = None
    for line in extracted.splitlines():
        line = line.strip()
        if line:
            candidate = line[:80]
            break

    return candidate or None, extracted
