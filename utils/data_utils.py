import csv

from models.doctor import Doctor


def is_duplicate_venue(venue_name: str, seen_names: set) -> bool:
    return venue_name in seen_names


def is_complete_venue(venue: dict, required_keys: list) -> bool:
    # Always consider a venue complete, since we allow null values
    return True


def save_venues_to_csv(venues: list, filename: str):
    if not venues:
        print("No doctors to save.")
        return

    # Use field names from the Doctor model
    fieldnames = Doctor.model_fields.keys()

    with open(filename, mode="w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(venues)
    print(f"Saved {len(venues)} doctors to '{filename}'.")
