import pdfplumber
import docx
import os
from dataclasses import dataclass

@dataclass
class ParsedResume:
    raw_text: str
    filename: str
    file_type: str
    char_count: int
    word_count: int

def parse_resume(file_path: str) -> ParsedResume:
    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pdf":
        text = _parse_pdf(file_path)
        file_type = "pdf"
    elif ext in [".docx", ".doc"]:
        text = _parse_docx(file_path)
        file_type = "docx"
    else:
        raise ValueError(f"Unsupported file type: {ext}")

    return ParsedResume(
        raw_text=text,
        filename=os.path.basename(file_path),
        file_type=file_type,
        char_count=len(text),
        word_count=len(text.split())
    )

def _parse_pdf(file_path: str) -> str:
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text.strip()

def _parse_docx(file_path: str) -> str:
    doc = docx.Document(file_path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs).strip()
