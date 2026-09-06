"""Split unidata.json into reviewable university and program CSV files."""
from collections import Counter, defaultdict
import csv
import json
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
SOURCE = BACKEND_DIR / "unidata.json"
UNIVERSITIES_OUTPUT = BACKEND_DIR / "universities_deduped.csv"
PROGRAMS_OUTPUT = BACKEND_DIR / "programs.csv"


def clean(value):
    return str(value or "").strip()


def first_filled(current, candidate):
    return current or clean(candidate)


def main():
    with SOURCE.open("r", encoding="utf-8") as file:
        rows = json.load(file)

    groups = defaultdict(list)
    for row in rows:
        groups[clean(row.get("university")).casefold()].append(row)

    universities = []
    programs = []
    program_counts = Counter()

    for university_id, (normalized_name, group) in enumerate(groups.items(), start=1):
        first = group[0]
        name = clean(first.get("university"))
        merged = {
            "id": university_id,
            "name": name,
            "city": "",
            "province": "",
            "sector": "",
            "website_url": "",
        }
        for row in group:
            merged["city"] = first_filled(merged["city"], row.get("city") or row.get("city_norm"))
            merged["website_url"] = first_filled(merged["website_url"], row.get("url"))
        universities.append(merged)
        program_counts[name] = len(group)

        for row in group:
            programs.append({
                "id": len(programs) + 1,
                "university_id": university_id,
                "degree_name": clean(row.get("program")),
                "merit_formula": clean(row.get("merit_raw") or row.get("eligibility_raw")),
            })

    with UNIVERSITIES_OUTPUT.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=["id", "name", "city", "province", "sector", "website_url"])
        writer.writeheader()
        writer.writerows(universities)

    with PROGRAMS_OUTPUT.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=["id", "university_id", "degree_name", "merit_formula"])
        writer.writeheader()
        writer.writerows(programs)

    print(f"Total records: {len(rows)}")
    print(f"Unique university count: {len(universities)}")
    print(f"Program row count: {len(programs)}")
    print("Top 10 universities by program count:")
    for name, count in program_counts.most_common(10):
        print(f"  {count:>3} programs | {name}")
    print(f"Wrote: {UNIVERSITIES_OUTPUT.name}")
    print(f"Wrote: {PROGRAMS_OUTPUT.name}")


if __name__ == "__main__":
    main()
