import json
import os
from typing import List, Set, Tuple

from crawl4ai import (
    AsyncWebCrawler,
    BrowserConfig,
    CacheMode,
    CrawlerRunConfig,
    LLMExtractionStrategy,
)

from models.doctor import Doctor
from utils.data_utils import is_complete_venue, is_duplicate_venue
from utils.pagination import PaginationHandler
from config import PAGINATION_CONFIG


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

    # Now fetch with extraction strategy
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

    # Process doctors
    complete_doctors = []
    for doctor in extracted_data:
        print("Processing doctor:", doctor)

        if doctor.get("error") is False:
            doctor.pop("error", None)

        if not is_complete_venue(doctor, required_keys):
            continue

        if is_duplicate_venue(doctor["name"], seen_names):
            print(f"Duplicate doctor '{doctor['name']}' found. Skipping.")
            continue

        seen_names.add(doctor["name"])
        complete_doctors.append(doctor)

    if not complete_doctors:
        print(f"No complete doctor profiles found on page {page_number}.")
        return [], True, ""

    print(f"Extracted {len(complete_doctors)} doctors from page {page_number}.")
    return complete_doctors, False, next_page_url or ""
