from typing import Dict, List


TECH_KEYWORDS = [
    "python",
    "sql",
    "fastapi",
    "flask",
    "django",
    "react",
    "node.js",
    "javascript",
    "typescript",
]


def generate_rule_based_suggestions(analysis: Dict) -> Dict[str, List[str]]:
    matched = set([s.lower() for s in analysis.get("matched_skills", [])])
    missing = analysis.get("missing_skills", [])

    suggestions: List[str] = []
    improved_bullets: List[str] = []

    ats_score = float(analysis.get("ats_score", 0.0))

    if ats_score < 60:
        suggestions.append("Your resume-match is low. Add more job-specific keywords from the job description naturally.")
        suggestions.append("Add a dedicated 'Technical Skills' section listing relevant technologies/tools used.")
    else:
        suggestions.append("Your resume-match is decent. Final improvements: emphasize the most relevant projects and tools used.")

    if missing:
        # add top missing suggestions (up to 5)
        suggestions.append(f"Add these missing skills/keywords (from JD) where applicable: {', '.join(missing[:5])}.")

    # Rule: missing common tech keywords
    lowered = " ".join(analysis.get("resume_skills", [])).lower()
    for kw in TECH_KEYWORDS:
        if kw not in matched and kw not in lowered:
            suggestions.append(f"Consider including '{kw}' if it is part of your real experience (projects/skills).")
            break

    # Rule: improved bullets template
    improved_bullets.extend([
        "Developed a Python-based resume analysis pipeline that extracts PDF/DOCX text, performs TF-IDF similarity scoring, and returns an ATS-style match breakdown.",
        "Implemented rule-based keyword/skill matching against job descriptions to generate matched skills, missing skills, and tailored improvement suggestions.",
        "Built secure JWT authentication for protected APIs and stored analysis history in SQL database tables.",
    ])

    # Remove overly generic duplicates
    dedup = []
    seen = set()
    for s in suggestions:
        if s not in seen:
            dedup.append(s)
            seen.add(s)

    return {"suggestions": dedup, "improved_bullets": improved_bullets}
