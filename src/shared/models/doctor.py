from pydantic import BaseModel
from typing import List, Optional


class Doctor(BaseModel):
    """
    Represents the data structure of a Doctor's profile.
    """
    # Basic information (from listing pages)
    name: str
    experience: Optional[str] = None
    location: Optional[str] = None
    consultation_fee: Optional[str] = None
    Specialization: Optional[str] = None
    
    # Profile URL (to track where detailed info comes from)
    profile_url: Optional[str] = None
    
    # Detailed information (from individual profile pages)
    about: Optional[str] = None
    education: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    services: Optional[List[str]] = None
    conditions_treated: Optional[List[str]] = None
    insurance_accepted: Optional[List[str]] = None
    availability: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    ratings: Optional[str] = None
    years_of_experience: Optional[str] = None
    treatment_approaches: Optional[List[str]] = None
    age_groups: Optional[List[str]] = None
