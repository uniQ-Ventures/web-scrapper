# Website configurations
WEBSITES = {
    "psychotherapeutensuche": {
        "base_url": "https://www.psychotherapeutensuche.de/therapeuten/?search%5BsearchRequest%5D%5Bquery%5D=&cHash=55e7422e2568fd86d5ea6c100b6570de",
        "css_selector": "#c304 > div",
        "pagination": {
            "type": "path",
            "path_format": "/seite/{page}/",
            "base_path": "/therapeuten/",
            "domain": "www.psychotherapeutensuche.de"
        }
    },
    "apa_locator": {
        "base_url": "https://locator.apa.org/results/1/New%20York,%20NY/25/",
        "css_selector": "#search_results",
        "pagination": {
            "type": "path_segment",
            "path_format": "{page}",  # Just append the page number to the base URL
            "preserve_query": True
        }
    },
    "apollo247": {
        "base_url": "https://www.apollo247.com/specialties/general-physician-internal-medicine",
        "css_selector": "#mainContainerCT > div.DoctorList_mainContent__URif4 > div.DoctorList_rightSection__p9znK > div.List_doctorList__H0eu4",
        "pagination": {
            "type": "query_param",
            "param_name": "page",
            "preserve_other_params": True
        }
    }
}

# Alternative name for backwards compatibility
SITE_CONFIG = WEBSITES

# Active website configuration (change this to switch between websites)
ACTIVE_WEBSITE = "psychotherapeutensuche"

# Get the active configuration
ACTIVE_CONFIG = WEBSITES[ACTIVE_WEBSITE]
BASE_URL = ACTIVE_CONFIG["base_url"]
CSS_SELECTOR = ACTIVE_CONFIG["css_selector"]
PAGINATION_CONFIG = ACTIVE_CONFIG["pagination"]

# Common settings
REQUIRED_KEYS = [
    "name",
    "experience",
    "location",
    "consultation_fee",
    "Specialization",
]

# Set default values for missing fields
DEFAULT_VALUES = {
    "experience": None,
    "consultation_fee": None,
    "location": None,
    "Specialization": []
}

# Pagination settings
MAX_PAGES = 2  # Maximum number of pages to scrape, set to -1 for unlimited

# Rate limiting settings
DELAY_BETWEEN_PAGES = 10  # seconds
MAX_RETRIES = 3
BATCH_SIZE = 5  
BATCH_BREAK_TIME = 30  # seconds
