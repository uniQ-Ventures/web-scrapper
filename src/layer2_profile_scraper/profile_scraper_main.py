#!/usr/bin/env python3
"""
Layer 2 Profile Scraper - Detailed profile scraping for doctors/therapists

This script can:
1. Run independently to scrape profiles from listing pages
2. Load existing Layer 1 data and enhance it with detailed profile information
3. Work with any of the configured websites using intelligent LLM-based profile detection

Usage:
    python profile_scraper_main.py --mode standalone    # Start fresh with listing pages
    python profile_scraper_main.py --mode enhance      # Enhance existing CSV data
    python profile_scraper_main.py --mode test         # Test profile detection only
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import asyncio
import argparse
import csv
import os
from typing import List, Dict, Any

from crawl4ai import AsyncWebCrawler
from dotenv import load_dotenv

from config.layer1_config import ACTIVE_WEBSITE, WEBSITES, DELAY_BETWEEN_PAGES
from config.layer2_config import (
    ACTIVE_PROFILE_CONFIG,
    ENABLE_PROFILE_SCRAPING,
    MAX_PROFILES_PER_PAGE,
    DELAY_BETWEEN_PROFILES,
    PROFILE_EXTRACTION_INSTRUCTION,
    PROFILE_CSV_FILENAME,
    SAVE_PROGRESS_AFTER_PROFILES,
    MIN_PROFILE_DATA_FIELDS
)
from src.layer2_profile_scraper.llm_profile_scraper import LLMProfileScraper
from src.shared.utils.scraper_utils import get_browser_config
from src.shared.utils.data_utils import save_venues_to_csv
from config.layer2_config import PROFILE_SITE_CONFIG
from src.shared.models.doctor import Doctor
from src.shared.utils.data_utils import save_to_csv, load_existing_data, append_to_csv

load_dotenv()


async def scrape_profiles_from_listing_page(
    crawler: AsyncWebCrawler,
    listing_url: str,
    session_id: str,
    scraper: LLMProfileScraper
) -> List[Dict]:
    """
    Scrape profiles from a single listing page.
    """
    print(f"\n=== Processing listing page: {listing_url} ===")
    
    # Extract profile URLs from the listing page
    profile_urls = await scraper.extract_profile_urls_from_page(
        crawler, listing_url, session_id
    )
    
    if not profile_urls:
        print("No profile URLs found on this page")
        return []
    
    print(f"Found {len(profile_urls)} profile URLs")
    
    # Scrape detailed information from each profile
    detailed_profiles = await scraper.scrape_multiple_profiles(
        crawler,
        profile_urls,
        session_id,
        PROFILE_EXTRACTION_INSTRUCTION,
        MAX_PROFILES_PER_PAGE
    )
    
    return detailed_profiles


async def run_standalone_mode():
    """
    Run standalone profile scraping starting from listing pages.
    """
    print("=== STANDALONE PROFILE SCRAPING MODE ===")
    print(f"Website: {ACTIVE_WEBSITE}")
    print(f"Base URL: {WEBSITES[ACTIVE_WEBSITE]['base_url']}")
    
    if not ENABLE_PROFILE_SCRAPING:
        print("Profile scraping is disabled in configuration. Exiting.")
        return
    
    browser_config = get_browser_config()
    scraper = LLMProfileScraper(ACTIVE_PROFILE_CONFIG, DELAY_BETWEEN_PROFILES)
    session_id = "profile_scraping_session"
    
    all_profiles = []
    base_url = WEBSITES[ACTIVE_WEBSITE]['base_url']
    
    async with AsyncWebCrawler(config=browser_config) as crawler:
        # For now, just scrape the first page
        # TODO: Add pagination support if needed
        profiles = await scrape_profiles_from_listing_page(
            crawler, base_url, session_id, scraper
        )
        
        all_profiles.extend(profiles)
        
        # Save progress
        if all_profiles:
            save_venues_to_csv(all_profiles, PROFILE_CSV_FILENAME)
            print(f"\nSaved {len(all_profiles)} detailed profiles to {PROFILE_CSV_FILENAME}")
        else:
            print("No profiles were successfully scraped")


async def run_enhance_mode():
    """
    Enhance existing CSV data with detailed profile information.
    Reads profile URLs from therapists.csv and scrapes detailed data.
    """
    print("=== ENHANCE EXISTING DATA MODE ===")
    
    # Check if existing CSV file exists
    existing_csv = "data/therapists.csv"  # From Layer 1
    if not os.path.exists(existing_csv):
        print(f"No existing CSV file found at {existing_csv}")
        print("Please run the main scraper first (python main.py)")
        return
    
    # Load existing data
    existing_data = []
    with open(existing_csv, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        existing_data = list(reader)
    
    print(f"Loaded {len(existing_data)} existing records")
    
    if not existing_data:
        print("No data found in existing CSV file")
        return
    
    # Extract profile URLs from existing data
    profile_urls = []
    records_with_urls = []
    
    for record in existing_data:
        profile_url = record.get("profile_url", "").strip()
        if profile_url:
            profile_urls.append(profile_url)
            records_with_urls.append(record)
        else:
            print(f"No profile URL found for {record.get('name', 'Unknown')}")
    
    print(f"Found {len(profile_urls)} records with profile URLs to process")
    
    if not profile_urls:
        print("No profile URLs found in existing data. Cannot proceed with enhancement.")
        return
    
    # Initialize scraper
    browser_config = get_browser_config()
    scraper = LLMProfileScraper(ACTIVE_PROFILE_CONFIG, DELAY_BETWEEN_PROFILES)
    session_id = "enhance_session"
    
    enhanced_data = []
    
    async with AsyncWebCrawler(config=browser_config) as crawler:
        print(f"\nStarting to enhance {len(profile_urls)} profiles...")
        
        # Process profiles in batches for progress saving
        batch_size = SAVE_PROGRESS_AFTER_PROFILES
        
        for i in range(0, len(profile_urls), batch_size):
            batch_urls = profile_urls[i:i + batch_size]
            batch_records = records_with_urls[i:i + batch_size]
            
            print(f"\nProcessing batch {i//batch_size + 1}: profiles {i+1} to {min(i+batch_size, len(profile_urls))}")
            
            # Scrape detailed profiles for this batch
            detailed_profiles = await scraper.scrape_multiple_profiles(
                crawler,
                batch_urls,
                session_id,
                PROFILE_EXTRACTION_INSTRUCTION,
                len(batch_urls)  # Process all URLs in the batch
            )
            
            # Merge basic data with detailed profile data
            batch_enhanced = scraper.merge_listing_and_profile_data(
                batch_records,
                batch_urls,
                detailed_profiles
            )
            
            enhanced_data.extend(batch_enhanced)
            
            # Save progress after each batch
            if enhanced_data:
                save_venues_to_csv(enhanced_data, PROFILE_CSV_FILENAME)
                print(f"Progress saved: {len(enhanced_data)} enhanced profiles in {PROFILE_CSV_FILENAME}")
            
            print(f"Batch {i//batch_size + 1} completed. Total enhanced: {len(enhanced_data)}")
    
    # Final save and summary
    if enhanced_data:
        save_venues_to_csv(enhanced_data, PROFILE_CSV_FILENAME)
        print(f"\n🎉 Enhancement completed!")
        print(f"📊 Enhanced {len(enhanced_data)} profiles out of {len(profile_urls)} attempted")
        print(f"💾 Saved detailed data to: {PROFILE_CSV_FILENAME}")
        
        # Calculate success rate
        successful_enhancements = sum(1 for record in enhanced_data 
                                    if record.get('about') or record.get('education') or record.get('phone'))
        success_rate = (successful_enhancements / len(enhanced_data)) * 100 if enhanced_data else 0
        print(f"📈 Success rate: {success_rate:.1f}% ({successful_enhancements}/{len(enhanced_data)})")
    else:
        print("❌ No profiles were successfully enhanced")


async def run_test_mode():
    """
    Test profile URL detection without scraping full profiles.
    """
    print("=== TEST MODE - Profile URL Detection ===")
    
    browser_config = get_browser_config()
    scraper = LLMProfileScraper(ACTIVE_PROFILE_CONFIG, DELAY_BETWEEN_PROFILES)
    session_id = "test_session"
    
    base_url = WEBSITES[ACTIVE_WEBSITE]['base_url']
    
    async with AsyncWebCrawler(config=browser_config) as crawler:
        profile_urls = await scraper.extract_profile_urls_from_page(
            crawler, base_url, session_id
        )
        
        print(f"\n=== TEST RESULTS ===")
        print(f"Found {len(profile_urls)} profile URLs:")
        
        for i, url in enumerate(profile_urls, 1):
            print(f"  {i}. {url}")
        
        if profile_urls:
            print(f"\nTest successful! Found {len(profile_urls)} profile links")
            
            # Optionally test scraping one profile
            test_one = input("\nTest scraping one profile? (y/n): ").lower().strip()
            if test_one == 'y' and profile_urls:
                print(f"\nTesting profile scraping on: {profile_urls[0]}")
                profile_data = await scraper.scrape_profile_details(
                    crawler, profile_urls[0], session_id, PROFILE_EXTRACTION_INSTRUCTION
                )
                
                if profile_data:
                    print("\n✓ Profile scraping test successful!")
                    print("Sample extracted data:")
                    for key, value in profile_data.items():
                        if value:
                            print(f"  {key}: {str(value)[:100]}{'...' if len(str(value)) > 100 else ''}")
                else:
                    print("\n✗ Profile scraping test failed")
        else:
            print("No profile URLs found. Check the configuration or website structure.")


def main():
    """
    Main entry point with command line argument parsing.
    """
    parser = argparse.ArgumentParser(description="Layer 2 Profile Scraper")
    parser.add_argument(
        "--mode", 
        choices=["standalone", "enhance", "test"], 
        default="test",
        help="Scraping mode: standalone (fresh start), enhance (enhance existing data), test (test only)"
    )
    
    args = parser.parse_args()
    
    print(f"Starting profile scraper in {args.mode} mode...")
    
    if args.mode == "standalone":
        asyncio.run(run_standalone_mode())
    elif args.mode == "enhance":
        asyncio.run(run_enhance_mode())
    elif args.mode == "test":
        asyncio.run(run_test_mode())


if __name__ == "__main__":
    main() 