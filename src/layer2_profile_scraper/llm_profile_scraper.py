import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import os
import re
import asyncio
from typing import List, Dict, Any, Optional
from urllib.parse import urljoin, urlparse
import json
from dotenv import load_dotenv
from crawl4ai import AsyncWebCrawler
from config.layer2_config import PROFILE_SITE_CONFIG
from src.shared.models.doctor import Doctor
from src.shared.utils.scraper_utils import get_random_user_agent, handle_request_with_retry, get_browser_config

from pydantic import BaseModel

from crawl4ai import AsyncWebCrawler, CacheMode, CrawlerRunConfig, LLMExtractionStrategy


class ProfileLink(BaseModel):
    """Model for profile links detected by LLM."""
    url: str
    text: str  # The link text or description
    confidence: str  # High, Medium, Low


class ProfileLinkExtractor(BaseModel):
    """Model for extracting profile links using LLM."""
    profile_links: List[ProfileLink]


class LLMProfileScraper:
    """
    Intelligent profile scraper that uses LLM to detect profile links and scrape detailed information.
    """

    def __init__(self, profile_config: dict, delay_between_profiles: int = 3):
        self.profile_config = profile_config
        self.delay_between_profiles = delay_between_profiles
        self.link_extraction_strategy = None
        self.profile_extraction_strategy = None
        
    def get_link_extraction_strategy(self) -> LLMExtractionStrategy:
        """
        Returns the LLM extraction strategy for detecting profile links.
        """
        if not self.link_extraction_strategy:
            instruction = self.profile_config.get("profile_detection", {}).get(
                "instruction", 
                "Find all links that lead to individual doctor or therapist profiles."
            )
            
            self.link_extraction_strategy = LLMExtractionStrategy(
                provider="anthropic/claude-3-haiku-20240307",
                api_token=os.getenv("ANTHROPIC_API_KEY"),
                schema=ProfileLinkExtractor.model_json_schema(),
                extraction_type="schema",
                instruction=f"""
                {instruction}
                
                IMPORTANT: You must return a JSON object with a "profile_links" array containing link objects.
                
                For each profile link found, extract:
                1. url: The href attribute or link URL (required)
                2. text: The visible text of the link or nearby context (required)
                3. confidence: Rate as 'High' if clearly a profile link, 'Medium' if likely, 'Low' if uncertain (required)
                
                Look for these specific patterns:
                - Links with text containing therapist/doctor names
                - Links with titles like "Dr.", "Dipl.-Psych.", "M.Sc."
                - Clickable names that appear to be individual practitioners
                - Links to individual detail pages or profiles
                - Any "View Profile", "Details", "More Info" type buttons
                
                Example output format:
                {{
                  "profile_links": [
                    {{
                      "url": "/therapeut/12345-dr-example",
                      "text": "Dr. Example Name, Psychotherapist",
                      "confidence": "High"
                    }}
                  ]
                }}
                
                Only return links that appear to lead to individual profile pages of therapists or doctors.
                Do not include general navigation links, contact pages, or category pages.
                """,
                input_format="markdown",
                verbose=True,
            )
        return self.link_extraction_strategy

    def get_profile_extraction_strategy(self, extraction_instruction: str) -> LLMExtractionStrategy:
        """
        Returns the LLM extraction strategy for detailed profile information.
        """
        if not self.profile_extraction_strategy:
            self.profile_extraction_strategy = LLMExtractionStrategy(
                provider="anthropic/claude-3-haiku-20240307",
                api_token=os.getenv("ANTHROPIC_API_KEY"),
                schema=Doctor.model_json_schema(),
                extraction_type="schema",
                instruction=extraction_instruction,
                input_format="markdown",
                verbose=True,
            )
        return self.profile_extraction_strategy

    async def extract_profile_urls_from_page(
        self, 
        crawler: AsyncWebCrawler, 
        page_url: str, 
        session_id: str
    ) -> List[str]:
        """
        Extract profile URLs from a listing page using LLM.
        
        Args:
            crawler: The web crawler instance
            page_url: URL of the listing page
            session_id: Session identifier for the crawler
            
        Returns:
            List of profile URLs
        """
        try:
            print(f"Extracting profile URLs from: {page_url}")
            
            # Fetch the page with LLM extraction for links
            result = await crawler.arun(
                url=page_url,
                config=CrawlerRunConfig(
                    cache_mode=CacheMode.BYPASS,
                    extraction_strategy=self.get_link_extraction_strategy(),
                    session_id=session_id,
                ),
            )
            
            if not result.success:
                print(f"Failed to fetch page for profile URL extraction: {result.error_message}")
                return []
                
            if not result.extracted_content:
                print("No content extracted for profile URL detection")
                return []
            
            # Parse the extracted links
            try:
                extracted_data = json.loads(result.extracted_content)
                
                # Handle different response formats
                if isinstance(extracted_data, list):
                    # If it's a list of profile link objects directly
                    profile_links = []
                    for item in extracted_data:
                        if isinstance(item, dict) and "url" in item:
                            profile_links.append(item)
                    
                    # If we didn't find any valid profile links, check if it's nested
                    if not profile_links and extracted_data:
                        for item in extracted_data:
                            if isinstance(item, dict) and "profile_links" in item:
                                profile_links = item["profile_links"]
                                break
                                
                elif isinstance(extracted_data, dict):
                    profile_links = extracted_data.get("profile_links", [])
                else:
                    print(f"Unexpected extracted data format: {type(extracted_data)}")
                    return []
                
                if not profile_links:
                    print("No profile links found by LLM")
                    print(f"Raw extracted data: {extracted_data}")
                    return []
                
                # Process and validate URLs
                valid_urls = []
                base_domain = self.profile_config.get("base_domain", "")
                expected_patterns = self.profile_config.get("expected_profile_patterns", [])
                
                for link in profile_links:
                    url = link.get("url", "")
                    text = link.get("text", "")
                    confidence = link.get("confidence", "Low")
                    
                    if not url:
                        continue
                    
                    # Clean up malformed URLs
                    if url.startswith("</"):
                        url = url[2:]  # Remove the leading </
                    elif url.startswith("<"):
                        url = url[1:]  # Remove the leading <
                    
                    # For psychotherapeutensuche, fix the URL structure
                    if "psychotherapeutensuche.de" in base_domain:
                        # Remove incorrect path parts and construct proper URL
                        if url.startswith("/"):
                            # Direct path from root
                            full_url = base_domain + url
                        elif "therapeuten/seite/" in url or "/therapeuten/" in url:
                            # Extract the profile part after the last /
                            parts = url.split("/")
                            if len(parts) > 0:
                                profile_part = parts[-1] if parts[-1] else parts[-2]
                                # Check if it looks like a profile (contains name and numbers)
                                if "-" in profile_part and any(char.isdigit() for char in profile_part):
                                    full_url = f"{base_domain}/{profile_part}/"
                                else:
                                    continue  # Skip non-profile links
                            else:
                                continue
                        else:
                            # Try direct construction
                            if url.startswith(base_domain):
                                full_url = url
                            else:
                                full_url = f"{base_domain}/{url.lstrip('/')}"
                    else:
                        # For other domains, use original logic
                        full_url = urljoin(base_domain, url)
                    
                    # Validate URL format
                    if not self._is_valid_url(full_url):
                        print(f"Invalid URL format: {full_url}")
                        continue
                    
                    # Check if URL matches expected patterns (optional validation)
                    pattern_match = any(pattern in full_url for pattern in expected_patterns) if expected_patterns else True
                    
                    # Additional filtering for psychotherapeutensuche to avoid navigation links
                    if "psychotherapeutensuche.de" in full_url:
                        # Skip common navigation/utility pages
                        skip_patterns = [
                            "/suche/", "/magazin/", "/psychotherapie/", "/selbsthilfe/", 
                            "/hilfspakete/", "/fuer-fachkollegen/", "/fragen-antworten/",
                            "/kontakt/", "/agb/", "/impressum/", "/datenschutz/", "/sitemap/",
                            "/login/", "/registrierung/", "/404/"
                        ]
                        if any(skip_pattern in full_url for skip_pattern in skip_patterns):
                            continue
                        
                        # Only include URLs that look like profile URLs (contain name-number pattern)
                        if not (re.search(r'[a-z]+-[a-z]+-\d+', full_url) or re.search(r'[a-z]+-\d+', full_url)):
                            continue
                    
                    print(f"Found profile link: {full_url} (confidence: {confidence}, text: '{text[:50]}...')")
                    
                    # Prioritize high and medium confidence links
                    if confidence in ["High", "Medium"] or pattern_match:
                        if full_url not in valid_urls:
                            valid_urls.append(full_url)
                
                print(f"Extracted {len(valid_urls)} valid profile URLs")
                return valid_urls
                
            except json.JSONDecodeError as e:
                print(f"Error parsing JSON from profile URL extraction: {e}")
                return []
                
        except Exception as e:
            print(f"Error extracting profile URLs: {e}")
            return []

    def _is_valid_url(self, url: str) -> bool:
        """
        Validate if a URL is properly formatted.
        """
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except Exception:
            return False

    async def scrape_profile_details(
        self, 
        crawler: AsyncWebCrawler, 
        profile_url: str, 
        session_id: str,
        extraction_instruction: str
    ) -> Optional[Dict]:
        """
        Scrape detailed information from a single profile page.
        """
        try:
            print(f"Scraping profile details: {profile_url}")
            
            # Scrape the profile page with LLM extraction
            result = await crawler.arun(
                url=profile_url,
                config=CrawlerRunConfig(
                    cache_mode=CacheMode.BYPASS,
                    extraction_strategy=self.get_profile_extraction_strategy(extraction_instruction),
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
                    
                # Clean up unwanted fields
                if isinstance(profile_data, dict):
                    # Remove error and other unwanted fields
                    unwanted_fields = ['error', 'timestamp', 'source']
                    for field in unwanted_fields:
                        profile_data.pop(field, None)
                
                # Add the profile URL to the data
                profile_data["profile_url"] = profile_url
                
                # Validate that we got meaningful data
                if self._validate_profile_data(profile_data):
                    return profile_data
                else:
                    print(f"Profile data validation failed for {profile_url}")
                    return None
                
            except json.JSONDecodeError as e:
                print(f"Error parsing JSON from profile {profile_url}: {e}")
                return None
                
        except Exception as e:
            print(f"Error scraping profile {profile_url}: {e}")
            return None

    def _validate_profile_data(self, profile_data: Dict, min_fields: int = 3) -> bool:
        """
        Validate that profile data contains meaningful information.
        """
        if not profile_data:
            return False
            
        # Count non-null, non-empty fields
        meaningful_fields = 0
        for key, value in profile_data.items():
            if value is not None and value != "" and value != []:
                meaningful_fields += 1
        
        return meaningful_fields >= min_fields

    async def scrape_multiple_profiles(
        self,
        crawler: AsyncWebCrawler,
        profile_urls: List[str],
        session_id: str,
        extraction_instruction: str,
        max_profiles: int = 10
    ) -> List[Dict]:
        """
        Scrape multiple profile pages with rate limiting.
        """
        scraped_profiles = []
        
        # Limit the number of profiles to scrape
        urls_to_scrape = profile_urls[:max_profiles]
        
        print(f"Scraping {len(urls_to_scrape)} profiles...")
        
        for i, profile_url in enumerate(urls_to_scrape):
            profile_data = await self.scrape_profile_details(
                crawler, profile_url, session_id, extraction_instruction
            )
            
            if profile_data:
                scraped_profiles.append(profile_data)
                print(f"✓ Successfully scraped profile {i+1}/{len(urls_to_scrape)}")
            else:
                print(f"✗ Failed to scrape profile {i+1}/{len(urls_to_scrape)}")
            
            # Rate limiting between profiles
            if i < len(urls_to_scrape) - 1:  # Don't wait after the last profile
                await asyncio.sleep(self.delay_between_profiles)
        
        print(f"Completed scraping {len(scraped_profiles)} profiles out of {len(urls_to_scrape)} attempted")
        return scraped_profiles

    def merge_listing_and_profile_data(
        self, 
        listing_data: List[Dict], 
        profile_urls: List[str],
        profile_data: List[Dict]
    ) -> List[Dict]:
        """
        Merge data from listing pages with detailed profile data.
        """
        # Create a mapping of profile URLs to profile data
        profile_map = {}
        for profile in profile_data:
            profile_url = profile.get("profile_url")
            if profile_url:
                profile_map[profile_url] = profile
        
        merged_data = []
        
        for i, listing_doc in enumerate(listing_data):
            # Start with listing data
            merged_doc = listing_doc.copy()
            
            # Add profile URL if available
            if i < len(profile_urls):
                profile_url = profile_urls[i]
                merged_doc["profile_url"] = profile_url
                
                # If we have detailed profile data, merge it
                if profile_url in profile_map:
                    profile_info = profile_map[profile_url]
                    
                    # Merge profile data, giving preference to profile data over listing data
                    for key, value in profile_info.items():
                        if value is not None and value != [] and value != "":
                            merged_doc[key] = value
            
            merged_data.append(merged_doc)
        
        return merged_data 