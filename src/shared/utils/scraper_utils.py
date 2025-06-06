import json
import os
import random
import time
from typing import List, Set, Tuple

from crawl4ai import (
    AsyncWebCrawler,
    BrowserConfig,
    CacheMode,
    CrawlerRunConfig,
    LLMExtractionStrategy,
)

from src.shared.models.doctor import Doctor
from src.shared.utils.data_utils import is_complete_venue, is_duplicate_venue
from src.shared.utils.pagination import PaginationHandler
from config.layer1_config import PAGINATION_CONFIG


def get_browser_config() -> BrowserConfig:
    """
    Returns the browser configuration for the crawler.

    Returns:
        BrowserConfig: The configuration settings for the browser.
    """
    # https://docs.crawl4ai.com/core/browser-crawler-config/
    return BrowserConfig(
        browser_type="chromium",  # Type of browser to simulate
        headless=False,  # Whether to run in headless mode (no GUI)
        verbose=True,  # Enable verbose logging
    )


def get_llm_strategy() -> LLMExtractionStrategy:
    """
    Returns the configuration for the language model extraction strategy.

    Returns:
        LLMExtractionStrategy: The settings for how to extract data using LLM.
    """
    return LLMExtractionStrategy(
        provider="anthropic/claude-3-haiku-20240307",
        api_token=os.getenv("ANTHROPIC_API_KEY"),
        schema=Doctor.model_json_schema(),
        extraction_type="schema",
        instruction=(
            "Extract all doctor profiles with 'name', 'experience', 'location', "
            "'consultation_fee', and 'Specialization' from the following content."
        ),
        input_format="markdown",
        verbose=True,
    )


def get_profile_url_extraction_strategy() -> LLMExtractionStrategy:
    """
    Returns LLM strategy specifically for extracting profile URLs during Layer 1.
    """
    from utils.llm_profile_scraper import ProfileLinkExtractor
    
    return LLMExtractionStrategy(
        provider="anthropic/claude-3-haiku-20240307",
        api_token=os.getenv("ANTHROPIC_API_KEY"),
        schema=ProfileLinkExtractor.model_json_schema(),
        extraction_type="schema",
        instruction="""
        Find all links that lead to individual therapist or doctor profiles.
        Look for clickable names, profile links, or detail pages for individual practitioners.
        
        Return only links that lead to individual profile pages, not general navigation.
        For each link found, extract:
        1. url: The href attribute or link URL
        2. text: The visible text or practitioner name
        3. confidence: Rate as 'High', 'Medium', or 'Low'
        """,
        input_format="markdown",
        verbose=True,
    )


async def extract_profile_urls_from_page(
    crawler: AsyncWebCrawler,
    page_url: str,
    session_id: str
) -> List[str]:
    """
    Extract profile URLs from a listing page during Layer 1 scraping.
    """
    try:
        from profile_config import ACTIVE_PROFILE_CONFIG
        from utils.llm_profile_scraper import LLMProfileScraper
        
        scraper = LLMProfileScraper(ACTIVE_PROFILE_CONFIG)
        profile_urls = await scraper.extract_profile_urls_from_page(
            crawler, page_url, session_id
        )
        return profile_urls
    except Exception as e:
        print(f"Could not extract profile URLs during Layer 1: {e}")
        return []


async def check_no_results(
    crawler: AsyncWebCrawler,
    url: str,
    session_id: str,
) -> bool:
    """
    Checks if the "No Results Found" message is present on the page.

    Args:
        crawler (AsyncWebCrawler): The web crawler instance.
        url (str): The URL to check.
        session_id (str): The session identifier.

    Returns:
        bool: True if "No Results Found" message is found, False otherwise.
    """
    # Fetch the page without any CSS selector or extraction strategy
    result = await crawler.arun(
        url=url,
        config=CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,
            session_id=session_id,
        ),
    )

    if result.success:
        if "No Results Found" in result.cleaned_html:
            return True
    else:
        print(
            f"Error fetching page for 'No Results Found' check: {result.error_message}"
        )

    return False


async def fetch_and_process_page(
    crawler: AsyncWebCrawler,
    page_number: int,
    base_url: str,
    css_selector: str,
    llm_strategy: LLMExtractionStrategy,
    session_id: str,
    required_keys: List[str],
    seen_names: Set[str],
) -> Tuple[List[dict], bool, str]:
    """
    Fetches and processes a single page of doctor profiles.
    Now also extracts profile URLs for Layer 2 processing.
    Returns: (profiles, is_last_page, next_page_url)
    """
    # First fetch the page without extraction to get the HTML content
    initial_result = await crawler.arun(
        url=base_url,
        config=CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,
            session_id=session_id,
        ),
    )

    if not initial_result.success:
        print(f"Error fetching page {page_number}: {initial_result.error_message}")
        return [], True, ""

    # Check if this is the last page
    if PaginationHandler.check_last_page(initial_result.cleaned_html):
        return [], True, ""

    # Get the next page URL using the pagination configuration
    next_page_url = PaginationHandler.get_next_page_url(
        base_url, 
        page_number + 1, 
        initial_result.cleaned_html,
        PAGINATION_CONFIG
    )

    # Extract profile URLs for Layer 2 processing
    print(f"Extracting profile URLs for Layer 2 processing...")
    profile_urls = await extract_profile_urls_from_page(crawler, base_url, session_id)
    print(f"Found {len(profile_urls)} profile URLs for Layer 2")

    # Now fetch with extraction strategy for basic doctor data
    result = await crawler.arun(
        url=base_url,
        config=CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,
            extraction_strategy=llm_strategy,
            css_selector=css_selector,
            session_id=session_id,
        ),
    )

    if not (result.success and result.extracted_content):
        print(f"Error extracting content from page {page_number}: {result.error_message}")
        return [], True, ""

    # Parse extracted content
    extracted_data = json.loads(result.extracted_content)
    if not extracted_data:
        print(f"No doctors found on page {page_number}.")
        return [], True, ""

    # Process doctors and add profile URLs
    complete_doctors = []
    for i, doctor in enumerate(extracted_data):
        print("Processing doctor:", doctor)

        if doctor.get("error") is False:
            doctor.pop("error", None)

        if not is_complete_venue(doctor, required_keys):
            continue

        if is_duplicate_venue(doctor["name"], seen_names):
            print(f"Duplicate doctor '{doctor['name']}' found. Skipping.")
            continue

        # Add profile URL if available
        if i < len(profile_urls):
            profile_url = profile_urls[i]
            
            # Clean up malformed URLs
            if profile_url.startswith("</"):
                profile_url = profile_url[2:]  # Remove the leading </
            elif profile_url.startswith("<"):
                profile_url = profile_url[1:]  # Remove the leading <
            
            # For psychotherapeutensuche, fix the URL structure
            if "psychotherapeutensuche.de" in profile_url:
                if "therapeuten/</" in profile_url:
                    # Extract just the profile part
                    if profile_url.endswith("/"):
                        profile_part = profile_url.split("/")[-2]
                    else:
                        profile_part = profile_url.split("/")[-1]
                    
                    # Construct proper URL
                    if profile_part and "-" in profile_part:
                        profile_url = f"https://www.psychotherapeutensuche.de/{profile_part}/"
                elif not profile_url.startswith("https://"):
                    # Handle relative URLs
                    profile_url = f"https://www.psychotherapeutensuche.de{profile_url}"
            
            doctor["profile_url"] = profile_url
            print(f"Added profile URL for {doctor['name']}: {profile_url}")
        else:
            doctor["profile_url"] = ""

        seen_names.add(doctor["name"])
        complete_doctors.append(doctor)

    if not complete_doctors:
        print(f"No complete doctor profiles found on page {page_number}.")
        return [], True, ""

    print(f"Extracted {len(complete_doctors)} doctors from page {page_number}.")
    return complete_doctors, False, next_page_url or ""


def get_random_user_agent() -> str:
    """Return a random user agent string"""
    user_agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
    ]
    return random.choice(user_agents)


def handle_request_with_retry(url: str, max_retries: int = 3, delay: float = 1.0):
    """Handle HTTP requests with retry logic"""
    import requests
    
    for attempt in range(max_retries):
        try:
            headers = {'User-Agent': get_random_user_agent()}
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            return response
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            time.sleep(delay * (2 ** attempt))  # Exponential backoff
    
    return None
