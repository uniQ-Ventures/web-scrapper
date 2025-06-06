import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import asyncio
import json
import os
from typing import List, Tuple
from dotenv import load_dotenv
from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig, LLMExtractionStrategy

from config.layer1_config import (
    BASE_URL,
    CSS_SELECTOR,
    REQUIRED_KEYS,
    DELAY_BETWEEN_PAGES,
    MAX_RETRIES,
    BATCH_SIZE,
    BATCH_BREAK_TIME,
    MAX_PAGES,
)
from src.shared.models.doctor import Doctor
from src.shared.utils.data_utils import save_venues_to_csv

load_dotenv()


def get_browser_config() -> BrowserConfig:
    """Returns the browser configuration for the crawler."""
    return BrowserConfig(
        browser_type="chromium",
        headless=False,
        verbose=True,
    )


def get_llm_strategy() -> LLMExtractionStrategy:
    """Returns the configuration for the language model extraction strategy."""
    return LLMExtractionStrategy(
        provider="anthropic/claude-3-haiku-20240307",
        api_token=os.getenv("ANTHROPIC_API_KEY"),
        schema=Doctor.model_json_schema(),
        extraction_type="schema",
        instruction=(
            "Extract all doctor/therapist profiles with 'name', 'experience', 'location', "
            "'consultation_fee', and 'Specialization' from the following content. "
            "Also extract any profile URLs or links to detailed pages for each practitioner."
        ),
        input_format="markdown",
        verbose=True,
    )


async def fetch_and_process_page(
    crawler: AsyncWebCrawler,
    page_number: int,
    base_url: str,
    css_selector: str,
    llm_strategy: LLMExtractionStrategy,
    session_id: str,
    required_keys: List[str],
    seen_names: set,
) -> Tuple[List[dict], bool, str]:
    """Fetches and processes a single page of doctor profiles."""
    
    # Fetch with extraction strategy
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
    try:
        extracted_data = json.loads(result.extracted_content)
        if isinstance(extracted_data, list):
            profiles = extracted_data
        else:
            profiles = [extracted_data] if extracted_data else []
    except json.JSONDecodeError:
        print(f"Failed to parse JSON from page {page_number}")
        return [], True, ""

    # Filter out duplicates and incomplete profiles
    valid_profiles = []
    for profile in profiles:
        if isinstance(profile, dict) and 'name' in profile:
            if profile['name'] not in seen_names:
                seen_names.add(profile['name'])
                valid_profiles.append(profile)

    print(f"Page {page_number}: Found {len(valid_profiles)} valid profiles")

    # Simple next page detection (this is basic - you might need to enhance)
    next_page_url = None
    is_last_page = True
    
    if len(valid_profiles) > 0:  # If we found profiles, assume there might be more pages
        if page_number < MAX_PAGES:
            # For psychotherapeutensuche, construct next page URL
            if "psychotherapeutensuche" in base_url:
                next_page_url = base_url.replace(f"/seite/{page_number}/", f"/seite/{page_number + 1}/")
                if f"/seite/{page_number}/" not in base_url:
                    # First page, add page number
                    next_page_url = base_url.rstrip('/') + f"/seite/{page_number + 1}/"
                is_last_page = False

    return valid_profiles, is_last_page, next_page_url


async def process_page_with_retry(
    crawler: AsyncWebCrawler,
    url: str,
    css_selector: str,
    llm_strategy: any,
    session_id: str,
    required_keys: List[str],
    seen_names: set,
    page_number: int,
    retry_count: int = 0,
) -> Tuple[List[dict], bool, str]:
    """
    Process a single page with retry logic and exponential backoff.
    """
    try:
        return await fetch_and_process_page(
            crawler,
            page_number,
            url,
            css_selector,
            llm_strategy,
            session_id,
            required_keys,
            seen_names,
        )
    except Exception as e:
        if retry_count >= MAX_RETRIES:
            print(f"Failed to process page {page_number} after {MAX_RETRIES} retries: {str(e)}")
            return [], True, ""
            
        # Exponential backoff
        wait_time = (2 ** retry_count) * DELAY_BETWEEN_PAGES
        print(f"Retrying page {page_number} in {wait_time} seconds...")
        await asyncio.sleep(wait_time)
        
        return await process_page_with_retry(
            crawler,
            url,
            css_selector,
            llm_strategy,
            session_id,
            required_keys,
            seen_names,
            page_number,
            retry_count + 1,
        )


async def crawl_therapists():
    """
    Main function to crawl therapist profile data.
    """
    # Initialize configurations
    browser_config = get_browser_config()
    llm_strategy = get_llm_strategy()
    session_id = "therapist_crawl_session"

    # Initialize state variables
    all_therapists = []
    seen_names = set()
    current_page = 1
    current_url = BASE_URL

    print("\nStarting therapist profile extraction...")
    print(f"Initial URL: {current_url}")
    print(f"Using CSS selector: {CSS_SELECTOR}")

    # Start the web crawler context
    async with AsyncWebCrawler(config=browser_config) as crawler:
        while True:
            # Check if we've reached the maximum number of pages
            if MAX_PAGES > 0 and current_page > MAX_PAGES:
                print(f"Reached maximum number of pages ({MAX_PAGES})")
                break
            
            # Fetch and process data from the current page
            therapists, is_last_page, next_page_url = await process_page_with_retry(
                crawler,
                current_url,
                CSS_SELECTOR,
                llm_strategy,
                session_id,
                REQUIRED_KEYS,
                seen_names,
                current_page,
            )

            if is_last_page or not next_page_url:
                print(f"No more pages to process after page {current_page}")
                break

            if not therapists:
                print(f"No therapists extracted from page {current_page}")
                break

            # Add the therapists from this page to the total list
            all_therapists.extend(therapists)
            
            # Save progress after each page
            save_venues_to_csv(all_therapists, "data/therapists.csv")
            print(f"Progress saved: {len(all_therapists)} total therapists")
            
            # Update the URL for the next page
            current_url = next_page_url
            print(f"Next page URL: {current_url}")
            
            # Take a break between pages if we're not done
            if current_page % BATCH_SIZE == 0:
                print(f"Taking a {BATCH_BREAK_TIME} second break after batch...")
                await asyncio.sleep(BATCH_BREAK_TIME)
            else:
                print(f"Waiting {DELAY_BETWEEN_PAGES} seconds before next page...")
                await asyncio.sleep(DELAY_BETWEEN_PAGES)
            
            current_page += 1

    # Final save of all collected therapists
    if all_therapists:
        save_venues_to_csv(all_therapists, "data/therapists.csv")
        print(f"\nFinal save: {len(all_therapists)} total therapists saved to 'data/therapists.csv'")
    else:
        print("No therapists were found during the crawl")

    # Display usage statistics for the LLM strategy
    llm_strategy.show_usage()


async def main():
    """
    Entry point of the script.
    """
    await crawl_therapists()


if __name__ == "__main__":
    asyncio.run(main())
