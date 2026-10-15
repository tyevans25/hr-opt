from src.parsers.resume import parse_resume

resume = parse_resume("Resume_Tyra_Evans_Data_Scientist_2026-07-2.pdf")

print(f"File: {resume.filename}")
print(f"Type: {resume.file_type}")
print(f"Words: {resume.word_count}")
print(f"Chars: {resume.char_count}")
print(f"\n--- EXTRACTED TEXT ---\n")
print(resume.raw_text)
