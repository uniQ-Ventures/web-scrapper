from typing import Optional, Dict
import re
from urllib.parse import urljoin, urlparse, parse_qs, urlencode

class PaginationHandler:
    """Handles different types of pagination patterns for web scraping."""
    
    @staticmethod
    def detect_pagination_type(url: str, html_content: str) -> str:
        """
        Detects the type of pagination based on URL and page content.
        Returns: 'query_param', 'path_param', 'next_button', or 'unknown'
        """
        # Check for query parameter pagination (e.g. ?page=2)
        if any(param in url.lower() for param in ['page', 'p', 'pg']):
            return 'query_param'
            
        # Check for path parameter pagination (e.g. /page/2)
        if re.search(r'/(?:page|p)/\d+', url):
            return 'path_param'
            
        # Check for next button in HTML
        if re.search(r'class="[^"]*(?:next|pagination)[^"]*"', html_content):
            return 'next_button'
            
        return 'unknown'

    @staticmethod
    def get_next_page_url(current_url: str, current_page: int, html_content: str, pagination_config: Dict) -> Optional[str]:
        """
        Generates the URL for the next page based on the pagination configuration.
        
        Args:
            current_url: The current page URL
            current_page: The next page number to generate
            html_content: The HTML content of the current page
            pagination_config: Configuration dictionary with pagination settings
        
        Returns:
            The URL for the next page, or None if it cannot be determined
        """
        pagination_type = pagination_config.get("type", "unknown")
        
        if pagination_type == "path":
            # Handle path-based pagination (psychotherapeutensuche.de style)
            domain = pagination_config["domain"]
            base_path = pagination_config["base_path"]
            path_format = pagination_config["path_format"]
            
            # Parse the current URL to preserve query parameters
            parsed_url = urlparse(current_url)
            query = parsed_url.query
            
            # Construct the new path with the page number
            new_path = base_path + path_format.format(page=current_page)
            
            # Build the complete URL
            next_url = f"https://{domain}{new_path}"
            if query:
                next_url += f"?{query}"
                
            return next_url
            
        elif pagination_type == "path_segment":
            # Handle path segment pagination (APA locator style)
            # Split the URL into parts
            parsed_url = urlparse(current_url)
            path_parts = parsed_url.path.rstrip('/').split('/')
            
            # Replace or append the page number
            if len(path_parts) > 0:
                path_parts[-1] = str(current_page)
            else:
                path_parts.append(str(current_page))
            
            # Reconstruct the URL
            new_path = '/'.join(path_parts)
            next_url = f"{parsed_url.scheme}://{parsed_url.netloc}{new_path}"
            
            # Preserve query parameters if specified
            if pagination_config.get("preserve_query", False) and parsed_url.query:
                next_url += f"?{parsed_url.query}"
                
            return next_url
            
        elif pagination_type == "query_param":
            # Handle query parameter pagination (Apollo247 style)
            parsed_url = urlparse(current_url)
            query_params = parse_qs(parsed_url.query)
            
            # Get the parameter name for pagination
            page_param = pagination_config.get("param_name", "page")
            
            if pagination_config.get("preserve_other_params", True):
                # Update or add the page parameter
                query_params[page_param] = [str(current_page)]
            else:
                # Only use the page parameter
                query_params = {page_param: [str(current_page)]}
            
            # Build the new query string
            new_query = urlencode(query_params, doseq=True)
            
            # Reconstruct the URL
            return f"{parsed_url.scheme}://{parsed_url.netloc}{parsed_url.path}?{new_query}"
            
        elif pagination_type == "next_button":
            # Extract next page URL from HTML content
            next_link_match = re.search(r'<a[^>]+class="[^"]*(?:next|pagination)[^"]*"[^>]+href="([^"]+)"', html_content)
            if next_link_match:
                next_url = next_link_match.group(1)
                return urljoin(current_url, next_url)
                
        return None

    @staticmethod
    def check_last_page(html_content: str) -> bool:
        """
        Checks if this is the last page based on common patterns.
        Returns True if this appears to be the last page.
        """
        # Check for common "no more results" indicators
        no_results_patterns = [
            r'No [Mm]ore [Rr]esults',
            r'End of [Rr]esults',
            r'[Ll]ast [Pp]age',
            r'class="[^"]*disabled[^"]*"[^>]*>Next',
            r'class="[^"]*pagination[^"]*"[^>]*>(?!.*Next)',
            r'class="[^"]*(?:next|pagination)[^"]*"[^>]*disabled',
        ]
        
        return any(re.search(pattern, html_content) for pattern in no_results_patterns) 