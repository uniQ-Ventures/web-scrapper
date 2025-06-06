import asyncio
import json
import re
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse

from crawl4ai import AsyncWebCrawler, CacheMode, CrawlerRunConfig, LLMExtractionStrategy
from bs4 import BeautifulSoup

from models.doctor import Doctor


class ProfileScraper:
    """
    Handles scraping of individual doctor profiles from listing pages.
    """

    def __init__(self, profile_config: dict, delay_between_profiles: int = 2):
        self.profile_config = profile_config
        self.delay_between_profiles = delay_between_profiles
        self.profile_extraction_strategy = None
        
    def get_profile_extraction_strategy(self) -> LLMExtractionStrategy:
        """
        Returns the LLM extraction strategy specifically for profile pages.
        """
        if not self.profile_extraction_strategy:
            self.profile_extraction_strategy = LLMExtractionStrategy(
                provider="anthropic/claude-3-haiku-20240307",
                api_token=None,  # Will use environment variable
                schema=Doctor.model_json_schema(),
                extraction_type="schema",
                instruction=(
                    "Extract detailed doctor profile information including: "
                    "about/bio, education, certifications, languages, services, "
                    "conditions treated, insurance accepted, contact information, "
                    "ratings, years of experience, treatment approaches, and age groups served. "
                    "Return empty lists for missing list fields and null for missing string fields."
                ),
                input_format="markdown",
                verbose=True,
            )
        return self.profile_extraction_strategy

    def extract_profile_urls_from_html(self, html_content: str, base_domain: str) -> List[str]:
        """
        Extract profile URLs from the listing page HTML.
        
        Args:
            html_content: The HTML content of the listing page
            base_domain: The base domain to resolve relative URLs
            
        Returns:
            List of profile URLs
        """
        if not self.profile_config.get("enabled", False):
            return []
            
        soup = BeautifulSoup(html_content, 'html.parser')
        profile_urls = []
        
        url_selector = self.profile_config.get("profile_url_selector", "")
        url_attribute = self.profile_config.get("profile_url_attribute", "href")
        
        if not url_selector:
            return []
            
        # Find all elements matching the profile URL selector
        profile_elements = soup.select(url_selector)
        
        for element in profile_elements:
            url = element.get(url_attribute)
            if url:
                # Convert relative URLs to absolute URLs
                full_url = urljoin(base_domain, url)
                if full_url not in profile_urls:
                    profile_urls.append(full_url)
                    
        return profile_urls

    async def scrape_profile_details(
        self, 
        crawler: AsyncWebCrawler, 
        profile_url: str, 
        session_id: str
    ) -> Optional[Dict]:
        """
        Scrape detailed information from a single profile page.
        
        Args:
            crawler: The web crawler instance
            profile_url: URL of the profile page to scrape
            session_id: Session identifier for the crawler
            
        Returns:
            Dictionary containing the scraped profile data or None if failed
        """
        try:
            print(f"Scraping profile: {profile_url}")
            
            # Scrape the profile page with LLM extraction
            result = await crawler.arun(
                url=profile_url,
                config=CrawlerRunConfig(
                    cache_mode=CacheMode.BYPASS,
                    extraction_strategy=self.get_profile_extraction_strategy(),
                    session_id=session_id,
                ),
            )
            
            if not result.success:
                print(f"Failed to scrape profile {profile_url}: {result.error_message}")
                return None
                
            if not result.extracted_content:
                print(f"No content extracted from profile {profile_url}")
                return None
                
            # Parse the extracted JSON content
            try:
                profile_data = json.loads(result.extracted_content)
                if isinstance(profile_data, list) and profile_data:
                    profile_data = profile_data[0]  # Take the first result if it's a list
                    
                # Add the profile URL to the data
                profile_data["profile_url"] = profile_url
                
                return profile_data
                
            except json.JSONDecodeError as e:
                print(f"Error parsing JSON from profile {profile_url}: {e}")
                return None
                
        except Exception as e:
            print(f"Error scraping profile {profile_url}: {e}")
            return None

    async def scrape_multiple_profiles(
        self,
        crawler: AsyncWebCrawler,
        profile_urls: List[str],
        session_id: str,
        max_profiles: int = 20
    ) -> List[Dict]:
        """
        Scrape multiple profile pages with rate limiting.
        
        Args:
            crawler: The web crawler instance
            profile_urls: List of profile URLs to scrape
            session_id: Session identifier for the crawler
            max_profiles: Maximum number of profiles to scrape
            
        Returns:
            List of dictionaries containing scraped profile data
        """
        scraped_profiles = []
        
        # Limit the number of profiles to scrape
        urls_to_scrape = profile_urls[:max_profiles]
        
        print(f"Scraping {len(urls_to_scrape)} profiles...")
        
        for i, profile_url in enumerate(urls_to_scrape):
            profile_data = await self.scrape_profile_details(crawler, profile_url, session_id)
            
            if profile_data:
                scraped_profiles.append(profile_data)
                print(f"Successfully scraped profile {i+1}/{len(urls_to_scrape)}")
            else:
                print(f"Failed to scrape profile {i+1}/{len(urls_to_scrape)}")
            
            # Rate limiting between profiles
            if i < len(urls_to_scrape) - 1:  # Don't wait after the last profile
                await asyncio.sleep(self.delay_between_profiles)
        
        print(f"Completed scraping {len(scraped_profiles)} profiles out of {len(urls_to_scrape)} attempted")
        return scraped_profiles

    def merge_listing_and_profile_data(
        self, 
        listing_data: List[Dict], 
        profile_data: List[Dict]
    ) -> List[Dict]:
        """
        Merge data from listing pages with detailed profile data.
        
        Args:
            listing_data: Basic information from listing pages
            profile_data: Detailed information from profile pages
            
        Returns:
            List of merged doctor profiles
        """
        # Create a mapping of profile URLs to profile data
        profile_map = {}
        for profile in profile_data:
            profile_url = profile.get("profile_url")
            if profile_url:
                profile_map[profile_url] = profile
        
        merged_data = []
        
        for listing_doc in listing_data:
            # Start with listing data
            merged_doc = listing_doc.copy()
            
            # If we have a profile URL for this doctor, merge the profile data
            profile_url = listing_doc.get("profile_url")
            if profile_url and profile_url in profile_map:
                profile_info = profile_map[profile_url]
                
                # Merge profile data, giving preference to profile data over listing data
                for key, value in profile_info.items():
                    if value is not None and value != []:  # Only overwrite if profile has meaningful data
                        merged_doc[key] = value
            
            merged_data.append(merged_doc)
        
        return merged_data 