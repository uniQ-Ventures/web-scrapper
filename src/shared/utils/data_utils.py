import csv
import os

from src.shared.models.doctor import Doctor


def is_duplicate_venue(venue_name: str, seen_names: set) -> bool:
    return venue_name in seen_names


def is_complete_venue(venue: dict, required_keys: list) -> bool:
    # Always consider a venue complete, since we allow null values
    return True


def clean_venue_data(venue: dict) -> dict:
    """
    Clean venue data to only include fields defined in the Doctor model.
    This prevents CSV writing errors from unknown fields.
    """
    model_fields = set(Doctor.model_fields.keys())
    cleaned_venue = {}
    
    for key, value in venue.items():
        if key in model_fields:
            cleaned_venue[key] = value
        # Skip unknown fields silently
    
    return cleaned_venue


def save_venues_to_csv(venues: list, filename: str):
    if not venues:
        print("No doctors to save.")
        return

    # Clean all venues to only include model fields
    cleaned_venues = [clean_venue_data(venue) for venue in venues]

    # Use field names from the Doctor model
    fieldnames = list(Doctor.model_fields.keys())

    with open(filename, mode="w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(cleaned_venues)
    print(f"Saved {len(cleaned_venues)} doctors to '{filename}'.")


def save_to_csv(data: list, filename: str):
    """Alias for save_venues_to_csv for backwards compatibility"""
    return save_venues_to_csv(data, filename)


def load_existing_data(filename: str) -> list:
    """Load existing data from CSV file"""
    if not os.path.exists(filename):
        return []
    
    data = []
    try:
        with open(filename, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            data = list(reader)
    except Exception as e:
        print(f"Error loading data from {filename}: {e}")
    
    return data


def append_to_csv(new_data: list, filename: str):
    """Append new data to existing CSV file"""
    if not new_data:
        return
    
    # Load existing data
    existing_data = load_existing_data(filename)
    
    # Combine and save
    all_data = existing_data + new_data
    save_venues_to_csv(all_data, filename)
