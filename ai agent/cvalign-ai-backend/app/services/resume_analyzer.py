import re
from typing import Dict, List, Tuple

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# MVP keyword/skill dictionary
SKILL_DICTIONARY: Dict[str, List[str]] = {
    "Programming": ["Python", "Java", "C", "C++", "JavaScript", "TypeScript"],
    "Frontend": ["HTML", "CSS", "React", "Next.js", "Tailwind", "Tailwind CSS"],
    "Backend": ["FastAPI", "Flask", "Django", "Node.js", "REST API", "REST"],
    "Database": ["SQL", "MySQL", "PostgreSQL", "MongoDB", "SQLite"],
    "AI/ML": ["Machine Learning", "Deep Learning", "NLP", "scikit-learn", "Pandas", "NumPy", "TensorFlow", "PyTorch"],
    "Tools": ["Git", "GitHub", "Docker", "Postman", "VS Code", "Linux"],
    "Marketing/Content": ["SEO", "Content Writing", "Digital Marketing", "Canva", "Social Media Marketing", "Email Marketing"],
    "Soft Skills": ["Communication", "Teamwork", "Leadership", "Problem Solving"],
}


def normalize_text(text: str) -> str:
    text = text or ""
    text = text.replace("\r\n", "\n")
    text = re.sub(r"\s+", " ", text).strip().lower()
    return text


def extract_skills_from_text(text: str) -> Tuple[List[str], Dict[str, List[str]]]:
    """
    Simple rule-based extraction:
    - match dictionary keywords case-insensitively
    - return matched skills list + category breakdown.
    """
    raw = text or ""
    t = raw.lower()

    matched_skills: List[str] = []
    category_breakdown: Dict[str, List[str]] = {}

    for category, skills in SKILL_DICTIONARY.items():
        cat_matches = []
        for s in skills:
            # word boundary-ish match (works reasonably for tokens)
            token = s.lower()
            if token and token in t:
                cat_matches.append(s)
        if cat_matches:
            category_breakdown[category] = cat_matches
            matched_skills.extend(cat_matches)

    # Deduplicate preserving order
    seen = set()
    deduped = []
    for s in matched_skills:
        if s not in seen:
            seen.add(s)
            deduped.append(s)

    return deduped, category_breakdown


def tfidf_similarity(resume_text: str, job_description: str) -> float:
    resume_text = normalize_text(resume_text)
    job_description = normalize_text(job_description)

    if not resume_text.strip() or not job_description.strip():
        return 0.0

    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
    tfidf = vectorizer.fit_transform([resume_text, job_description])
    sim = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
    # cosine similarity in [-1,1], but TF-IDF cosine is [0,1]
    return float(max(0.0, min(1.0, sim)))


def compute_skill_match(resume_skills: List[str], jd_skills: List[str]) -> float:
    if not jd_skills:
        return 0.0
    resume_set = set(map(str.lower, resume_skills))
    jd_set = set(map(str.lower, jd_skills))
    matched = resume_set.intersection(jd_set)
    return float(len(matched) / max(1, len(jd_set)))


def final_ats_score(text_similarity: float, skill_match_score: float) -> float:
    return float((0.60 * text_similarity) + (0.40 * skill_match_score) * 1.0 * 1.0) * 100.0 / 1.0


def analyze(resume_text: str, job_description: str) -> Dict:
    resume_skills, resume_categories = extract_skills_from_text(resume_text)
    jd_skills, jd_categories = extract_skills_from_text(job_description)

    matched = sorted(list(set(resume_skills).intersection(set(jd_skills))), key=str.lower)
    missing = sorted(list(set(jd_skills).difference(set(resume_skills))), key=str.lower)

    text_sim = tfidf_similarity(resume_text, job_description)
    skill_match = compute_skill_match(resume_skills, jd_skills)

    # Ensure scale 0-100
    ats_style = (0.60 * text_sim + 0.40 * skill_match) * 100.0

    return {
        "text_similarity_score": float(text_sim),
        "skill_match_score": float(skill_match),
        "ats_score": float(ats_style),
        "matched_skills": matched,
        "missing_skills": missing,
        "resume_skills": resume_skills,
        "jd_skills": jd_skills,
        "skill_category_analysis": {
            "resume": resume_categories,
            "job_description": jd_categories,
        },
    }
