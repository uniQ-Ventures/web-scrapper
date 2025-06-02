import asyncio
import time
from typing import List, Tuple

from crawl4ai import AsyncWebCrawler
from dotenv import load_dotenv

from config import (
    BASE_URL,
    CSS_SELECTOR,
    REQUIRED_KEYS,
    DELAY_BETWEEN_PAGES,
    MAX_RETRIES,
    BATCH_SIZE,
    BATCH_BREAK_TIME,
    MAX_PAGES,
)
from utils.data_utils import save_venues_to_csv
from utils.scraper_utils import (
    fetch_and_process_page,
    get_browser_config,
    get_llm_strategy,
)

load_dotenv()


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
            save_venues_to_csv(all_therapists, "therapists.csv")
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
        save_venues_to_csv(all_therapists, "therapists.csv")
        print(f"\nFinal save: {len(all_therapists)} total therapists saved to 'therapists.csv'")
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
