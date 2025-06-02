from pydantic import BaseModel


class Doctor(BaseModel):
    """
    Represents the data structure of a Doctor's profile.
    """

    name: str
    experience: str
    location: str
    consultation_fee: str
    Specialization: str
