#!/usr/bin/env python3
"""
Test script for LLM-based profile scraping functionality.
Run this to test profile URL extraction and scraping before running the full scraper.
"""

import asyncio
from crawl4ai import AsyncWebCrawler
from utils.llm_profile_scraper import LLMProfileScraper
from utils.scraper_utils import get_browser_config
from config import ACTIVE_WEBSITE, WEBSITES
from profile_config import ACTIVE_PROFILE_CONFIG, PROFILE_EXTRACTION_INSTRUCTION


async def test_profile_url_extraction():
    """Test extracting profile URLs from a listing page using LLM."""
    print("Testing LLM-based profile URL extraction...")
    
    browser_config = get_browser_config()
    base_url = WEBSITES[ACTIVE_WEBSITE]["base_url"]
    
    async with AsyncWebCrawler(config=browser_config) as crawler:
        scraper = LLMProfileScraper(ACTIVE_PROFILE_CONFIG)
        
        profile_urls = await scraper.extract_profile_urls_from_page(
            crawler, base_url, "test_session"
        )
        
        print(f"\n=== URL EXTRACTION RESULTS ===")
        print(f"Found {len(profile_urls)} profile URLs:")
        
        for i, url in enumerate(profile_urls[:10], 1):  # Show first 10
            print(f"  {i}. {url}")
        
        return profile_urls[:3]  # Return first 3 for testing


async def test_single_profile_scraping(profile_urls):
    """Test scraping a single profile page."""
    if not profile_urls:
        print("No profile URLs to test with")
        return
    
    print(f"\n=== TESTING SINGLE PROFILE SCRAPING ===")
    
    browser_config = get_browser_config()
    scraper = LLMProfileScraper(ACTIVE_PROFILE_CONFIG)
    
    async with AsyncWebCrawler(config=browser_config) as crawler:
        test_url = profile_urls[0]
        print(f"Testing with URL: {test_url}")
        
        profile_data = await scraper.scrape_profile_details(
            crawler, 
            test_url, 
            "test_session",
            PROFILE_EXTRACTION_INSTRUCTION
        )
        
        if profile_data:
            print("\n✓ Successfully scraped profile data:")
            meaningful_fields = 0
            for key, value in profile_data.items():
                if value and value != [] and value != "":
                    meaningful_fields += 1
                    display_value = str(value)[:100] + "..." if len(str(value)) > 100 else str(value)
                    print(f"  {key}: {display_value}")
            
            print(f"\nExtracted {meaningful_fields} meaningful fields")
            
            # Test data validation
            is_valid = scraper._validate_profile_data(profile_data)
            print(f"Profile data validation: {'✓ PASSED' if is_valid else '✗ FAILED'}")
            
        else:
            print("\n✗ Failed to scrape profile data")


async def test_multiple_profiles(profile_urls):
    """Test scraping multiple profiles."""
    if len(profile_urls) < 2:
        print("Need at least 2 profile URLs to test multiple scraping")
        return
    
    print(f"\n=== TESTING MULTIPLE PROFILE SCRAPING ===")
    
    browser_config = get_browser_config()
    scraper = LLMProfileScraper(ACTIVE_PROFILE_CONFIG, delay_between_profiles=1)  # Faster for testing
    
    async with AsyncWebCrawler(config=browser_config) as crawler:
        # Test with just 2 profiles for speed
        test_urls = profile_urls[:10]
        
        detailed_profiles = await scraper.scrape_multiple_profiles(
            crawler,
            test_urls,
            "test_session",
            PROFILE_EXTRACTION_INSTRUCTION,
            max_profiles=2
        )
        
        print(f"\n=== MULTIPLE SCRAPING RESULTS ===")
        print(f"Successfully scraped {len(detailed_profiles)} out of {len(test_urls)} profiles")
        
        for i, profile in enumerate(detailed_profiles, 1):
            meaningful_fields = sum(1 for v in profile.values() if v and v != [] and v != "")
            print(f"  Profile {i}: {meaningful_fields} meaningful fields")


async def main():
    """Main test function."""
    print("=== LLM-BASED PROFILE SCRAPING TEST ===")
    print(f"Active website: {ACTIVE_WEBSITE}")
    print(f"Profile scraping enabled: {ACTIVE_PROFILE_CONFIG.get('enabled', False)}")
    print(f"Base domain: {ACTIVE_PROFILE_CONFIG.get('base_domain', 'Not set')}")
    
    if not ACTIVE_PROFILE_CONFIG.get("enabled", False):
        print("Profile scraping is disabled in configuration. Exiting.")
        return
    
    try:
        # Test URL extraction
        profile_urls = await test_profile_url_extraction()
        
        if profile_urls:
            # Test single profile scraping
            await test_single_profile_scraping(profile_urls)
            
            # Test multiple profile scraping
            if len(profile_urls) > 1:
                test_multiple = input("\nTest multiple profile scraping? (y/n): ").lower().strip()
                if test_multiple == 'y':
                    await test_multiple_profiles(profile_urls)
        else:
            print("\n❌ No profile URLs found. Please check:")
            print("  1. Website accessibility")
            print("  2. Profile detection configuration")
            print("  3. Expected URL patterns")
    
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
    
    print("\n=== TEST COMPLETE ===")


if __name__ == "__main__":
    asyncio.run(main()) 