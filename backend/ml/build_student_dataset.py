"""
Synthetic Rule-Based Student Dataset Generator (v2)

This script generates synthetic student assessment data based on domain-defined career interest
profiles and academic background eligibility rules. It is designed for training career guidance
classification models without requiring a 'Marks' column.

Target Interest Profiles (mean ratings on a 1-5 scale, order: Math, Biology, Computer, Communication, Leadership; std=0.7):
- MBBS:                 Math 1.8, Biology 4.8, Computer 1.8, Communication 3.8, Leadership 3.0
- Pharmacy:             Math 2.8, Biology 4.4, Computer 2.2, Communication 2.2, Leadership 2.0
- Biotechnology:        Math 3.6, Biology 3.8, Computer 3.8, Communication 1.8, Leadership 1.8
- Psychology:           Math 1.6, Biology 3.2, Computer 1.6, Communication 4.6, Leadership 2.6
- Law:                  Math 1.8, Biology 1.8, Computer 1.8, Communication 4.8, Leadership 4.8
- Engineering:          Math 4.8, Biology 1.6, Computer 3.0, Communication 2.0, Leadership 3.4
- BSCS:                 Math 4.2, Biology 1.2, Computer 4.8, Communication 1.8, Leadership 1.8
- Software Engineering: Math 3.0, Biology 1.2, Computer 4.8, Communication 3.4, Leadership 3.4
- Data Science:         Math 4.9, Biology 2.0, Computer 3.9, Communication 1.6, Leadership 2.4
- BBA:                  Math 3.0, Biology 1.4, Computer 2.0, Communication 3.8, Leadership 4.8
- Accounting:           Math 4.2, Biology 1.2, Computer 2.8, Communication 1.8, Leadership 3.0
- Economics:            Math 3.8, Biology 1.8, Computer 1.6, Communication 3.6, Leadership 2.4
- Media Studies:        Math 1.4, Biology 1.6, Computer 3.6, Communication 4.8, Leadership 3.0
- Education:            Math 2.4, Biology 2.8, Computer 1.4, Communication 4.2, Leadership 4.2

Background Eligibility Rules:
- Pre-Medical:     MBBS, Pharmacy, Biotechnology, Psychology, Law, BSCS, Software Engineering, Data Science
- Pre-Engineering: Engineering, BSCS, Software Engineering, Data Science, BBA
- ICS:             BSCS, Software Engineering, Data Science, Engineering, BBA
- Commerce:        Accounting, BBA, Economics, Law, Media Studies
- Arts:            Law, Media Studies, Psychology, Education, BBA

Dataset Generation Rules:
- 40 rows for each allowed (Background, career) pair.
- Each interest score sampled from Normal(mean, 0.7), rounded and clipped to [1, 5].
- 5% label noise: for 5% of rows, replace the label with another career allowed in the same background.
- Random seed: 42.
- Destination: backend/student_dataset_v2.csv
- Columns: Math, Biology, Computer, Communication, Leadership, Background, Career
"""

from pathlib import Path
import numpy as np
import pandas as pd

# Random seed for reproducibility
RANDOM_SEED = 42

# Background to allowed Careers mapping
BACKGROUND_CAREERS = {
    "Pre-Medical": ["MBBS", "Pharmacy", "Biotechnology", "Psychology", "Law", "BSCS", "Software Engineering", "Data Science"],
    "Pre-Engineering": ["Engineering", "BSCS", "Software Engineering", "Data Science", "BBA"],
    "ICS": ["BSCS", "Software Engineering", "Data Science", "Engineering", "BBA"],
    "Commerce": ["Accounting", "BBA", "Economics", "Law", "Media Studies"],
    "Arts": ["Law", "Media Studies", "Psychology", "Education", "BBA"],
}

# Reverse mapping: Career to allowed Backgrounds
CAREER_BACKGROUNDS = {}
for bg, careers in BACKGROUND_CAREERS.items():
    for career in careers:
        CAREER_BACKGROUNDS.setdefault(career, []).append(bg)

# Target interest profiles (means on 1-5 scale: Math, Biology, Computer, Communication, Leadership)
CAREER_PROFILES = {
    "MBBS": {
        "Math": 1.8, "Biology": 4.8, "Computer": 1.8, "Communication": 3.8, "Leadership": 3.0
    },
    "Pharmacy": {
        "Math": 2.8, "Biology": 4.4, "Computer": 2.2, "Communication": 2.2, "Leadership": 2.0
    },
    "Biotechnology": {
        "Math": 3.6, "Biology": 3.8, "Computer": 3.8, "Communication": 1.8, "Leadership": 1.8
    },
    "Psychology": {
        "Math": 1.6, "Biology": 3.2, "Computer": 1.6, "Communication": 4.6, "Leadership": 2.6
    },
    "Law": {
        "Math": 1.8, "Biology": 1.8, "Computer": 1.8, "Communication": 4.8, "Leadership": 4.8
    },
    "Engineering": {
        "Math": 4.8, "Biology": 1.6, "Computer": 3.0, "Communication": 2.0, "Leadership": 3.4
    },
    "BSCS": {
        "Math": 4.2, "Biology": 1.2, "Computer": 4.8, "Communication": 1.8, "Leadership": 1.8
    },
    "Software Engineering": {
        "Math": 3.0, "Biology": 1.2, "Computer": 4.8, "Communication": 3.4, "Leadership": 3.4
    },
    "Data Science": {
        "Math": 4.9, "Biology": 2.0, "Computer": 3.9, "Communication": 1.6, "Leadership": 2.4
    },
    "BBA": {
        "Math": 3.0, "Biology": 1.4, "Computer": 2.0, "Communication": 3.8, "Leadership": 4.8
    },
    "Accounting": {
        "Math": 4.2, "Biology": 1.2, "Computer": 2.8, "Communication": 1.8, "Leadership": 3.0
    },
    "Economics": {
        "Math": 3.8, "Biology": 1.8, "Computer": 1.6, "Communication": 3.6, "Leadership": 2.4
    },
    "Media Studies": {
        "Math": 1.4, "Biology": 1.6, "Computer": 3.6, "Communication": 4.8, "Leadership": 3.0
    },
    "Education": {
        "Math": 2.4, "Biology": 2.8, "Computer": 1.4, "Communication": 4.2, "Leadership": 4.2
    },
}

SKILL_COLUMNS = ["Math", "Biology", "Computer", "Communication", "Leadership"]
ROWS_PER_PAIR = 40
STD_DEV = 0.7
NOISE_RATE = 0.05


def generate_dataset(seed: int = RANDOM_SEED) -> pd.DataFrame:
    """Generate synthetic student dataset based on career profiles and eligibility rules."""
    rng = np.random.default_rng(seed)
    rows = []

    for bg, careers in BACKGROUND_CAREERS.items():
        for career in careers:
            profile = CAREER_PROFILES[career]
            for _ in range(ROWS_PER_PAIR):
                row_data = {}
                for skill in SKILL_COLUMNS:
                    mean_val = profile[skill]
                    sampled = rng.normal(loc=mean_val, scale=STD_DEV)
                    clamped = int(np.clip(np.round(sampled), 1, 5))
                    row_data[skill] = clamped
                row_data["Background"] = bg
                row_data["Career"] = career
                rows.append(row_data)

    df = pd.DataFrame(rows)

    # Inject 5% label noise: replace career label with another career allowed in the same Background
    n_noise = int(round(NOISE_RATE * len(df)))
    noise_indices = rng.choice(len(df), size=n_noise, replace=False)

    for idx in noise_indices:
        bg = df.loc[idx, "Background"]
        current_career = df.loc[idx, "Career"]
        alt_careers = [c for c in BACKGROUND_CAREERS[bg] if c != current_career]
        df.loc[idx, "Career"] = rng.choice(alt_careers)

    # Ensure column ordering: Math, Biology, Computer, Communication, Leadership, Background, Career
    columns_order = SKILL_COLUMNS + ["Background", "Career"]
    return df[columns_order]


def main():
    script_dir = Path(__file__).resolve().parent
    backend_dir = script_dir.parent
    output_path = backend_dir / "student_dataset_v2.csv"

    print(f"Generating student dataset (seed={RANDOM_SEED}, std={STD_DEV}, noise={NOISE_RATE * 100:.0f}%)...")
    df = generate_dataset(seed=RANDOM_SEED)

    df.to_csv(output_path, index=False)
    print(f"Saved dataset to {output_path} ({len(df)} rows)")

    print("\n" + "=" * 60)
    print("Head of the CSV (first 5 rows):")
    print("=" * 60)
    print(df.head())

    print("\n" + "=" * 60)
    print("Rows per Career:")
    print("=" * 60)
    print(df["Career"].value_counts().sort_index())

    print("\n" + "=" * 60)
    print("Crosstab (Background x Career):")
    print("=" * 60)
    pd.set_option('display.max_columns', 20)
    pd.set_option('display.width', 1200)
    ct = pd.crosstab(df["Background"], df["Career"], margins=True)
    print(ct.to_string())


if __name__ == "__main__":
    main()
