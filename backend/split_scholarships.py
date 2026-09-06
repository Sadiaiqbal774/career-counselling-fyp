"""Deduplicate scholarships_full.json into a reviewable CSV."""
import csv
import json
from collections import defaultdict
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
SOURCE = BACKEND_DIR / "scholarships_full.json"
OUTPUT = BACKEND_DIR / "scholarships_deduped.csv"
FIELDS = [
    "id", "name", "provider", "provinces", "basis", "provider_type",
    "eligibility_raw", "income_cap_pkr", "min_merit_pct", "coverage", "source_url",
]


def clean(value):
    return "" if value is None else str(value).strip()


def serialize_provinces(value):
    if isinstance(value, list):
        return ", ".join(clean(item) for item in value if clean(item))
    return clean(value)


def main():
    with SOURCE.open("r", encoding="utf-8") as file:
        rows = json.load(file)

    groups = defaultdict(list)
    for row in rows:
        groups[clean(row.get("name")).casefold()].append(row)

    unique_rows = []
    duplicate_groups = []
    for normalized_name, group in groups.items():
        if not normalized_name:
            continue
        if len(group) > 1:
            duplicate_groups.append((group[0].get("name", ""), len(group)))
        source = group[0]
        unique_rows.append({
            "id": clean(source.get("id")),
            "name": clean(source.get("name")),
            "provider": clean(source.get("provider")),
            "provinces": serialize_provinces(source.get("provinces")),
            "basis": clean(source.get("basis")),
            "provider_type": clean(source.get("provider_type")),
            "eligibility_raw": clean(source.get("eligibility_raw")),
            "income_cap_pkr": clean(source.get("income_cap_pkr")),
            "min_merit_pct": clean(source.get("min_merit_pct")),
            "coverage": clean(source.get("coverage")),
            "source_url": clean(source.get("source_url")),
        })

    with OUTPUT.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(unique_rows)

    income_count = sum(bool(row["income_cap_pkr"]) for row in unique_rows)
    merit_count = sum(bool(row["min_merit_pct"]) for row in unique_rows)
    print(f"Total records read: {len(rows)}")
    print(f"Unique scholarships after dedup: {len(unique_rows)}")
    print(f"Duplicate name groups found: {len(duplicate_groups)}")
    if duplicate_groups:
        for name, count in duplicate_groups:
            print(f"  {count} records | {name}")
    print(f"Non-null income_cap_pkr: {income_count}/{len(unique_rows)}")
    print(f"Non-null min_merit_pct: {merit_count}/{len(unique_rows)}")
    print(f"Wrote: {OUTPUT.name}")


if __name__ == "__main__":
    main()
