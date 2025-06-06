# Profile Scraping Configuration (Layer 2)
# This handles the detailed scraping of individual doctor/therapist profiles

# Website-specific profile scraping configurations
PROFILE_WEBSITES = {
    "psychotherapeutensuche": {
        "enabled": True,
        "base_domain": "https://www.psychotherapeutensuche.de",
        "profile_detection": {
            "method": "llm",  # Use LLM to detect profile links
            "instruction": (
                "Find all links that lead to individual therapist or doctor profiles. "
                "Look for clickable therapist names that lead to detailed profile pages. "
                "The links typically end with therapist names and numbers like '/name-surname-123456/' "
                "Return the full href attributes of these profile links."
            )
        },
        "expected_profile_patterns": [
            "-15", "-12", "-10", "-11", "-13", "-14", "-16", "-17", "-18", "-19"  # Common ID patterns
        ]
    },
    "apa_locator": {
        "enabled": True,
        "base_domain": "https://locator.apa.org",
        "profile_detection": {
            "method": "llm",
            "instruction": (
                "Find all links that lead to individual psychologist profiles. "
                "Look for '/profile/' links that contain psychologist names, "
                "typically in format '/profile/firstname-lastname'. "
                "Return the full href attributes of these profile links."
            )
        },
        "expected_profile_patterns": [
            "/profile/", "/locator/profile/"
        ]
    },
    "apollo247": {
        "enabled": True,
        "base_domain": "https://www.apollo247.com",
        "profile_detection": {
            "method": "llm",
            "instruction": (
                "Find all links that lead to individual doctor profiles. "
                "Look for '/doctors/' links that contain doctor names and UUIDs, "
                "typically in format '/doctors/dr-name-uuid?source=Listing_Page'. "
                "Return the full href attributes of these profile links."
            )
        },
        "expected_profile_patterns": [
            "/doctors/dr-", "?source=Listing_Page"
        ]
    }
}

# Alternative name for backwards compatibility
PROFILE_SITE_CONFIG = PROFILE_WEBSITES

# Active profile website (should match the ACTIVE_WEBSITE in config.py)
ACTIVE_PROFILE_WEBSITE = "psychotherapeutensuche"

# Get the active profile configuration
ACTIVE_PROFILE_CONFIG = PROFILE_WEBSITES[ACTIVE_PROFILE_WEBSITE]

# Profile scraping settings
ENABLE_PROFILE_SCRAPING = True  # Set to False to disable profile scraping
MAX_PROFILES_PER_PAGE = 10  # Maximum number of profiles to scrape per listing page
DELAY_BETWEEN_PROFILES = 3  # seconds between profile requests
PROFILE_TIMEOUT = 30  # seconds to wait for profile page to load
MAX_PROFILE_RETRIES = 2  # Maximum retries for failed profile requests

# Profile data extraction settings
PROFILE_EXTRACTION_INSTRUCTION = """
Extract detailed doctor/therapist profile information from this page. Look for:

1. Personal & Professional Info:
   - Full name, title, credentials
   - Years of experience or experience description
   - Professional biography or about section

2. Contact Information:
   - Phone number, email address
   - Practice address or location
   - Website or professional links

3. Professional Details:
   - Education and degrees
   - Certifications and licenses
   - Languages spoken
   - Areas of specialization or expertise

4. Practice Information:
   - Services offered or treatments provided
   - Conditions or disorders treated
   - Treatment approaches or methodologies
   - Age groups served (children, adults, seniors)
   - Insurance plans accepted
   - Consultation fees or pricing
   - Availability or appointment information

5. Ratings & Reviews:
   - Patient ratings or star ratings
   - Number of reviews
   - Patient testimonials

Return empty lists for missing list fields and null for missing string fields.
Extract only factual information that is clearly stated on the page.
"""

# Validation settings
MIN_PROFILE_DATA_FIELDS = 3  # Minimum number of non-null fields to consider a profile successfully scraped
REQUIRED_PROFILE_FIELDS = ["name"]  # Fields that must be present for a valid profile

# Output settings
PROFILE_CSV_FILENAME = "data/detailed_therapists.csv"
SAVE_PROGRESS_AFTER_PROFILES = 5  # Save progress after every N profiles scraped 