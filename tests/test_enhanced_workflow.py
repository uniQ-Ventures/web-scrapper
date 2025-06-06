#!/usr/bin/env python3
"""
Test the complete two-layer workflow:
1. Layer 1: Extract basic data + profile URLs → save to therapists.csv
2. Layer 2: Read therapists.csv, enhance with detailed data → save to detailed_therapists.csv
"""

import asyncio
import csv
import os
from pathlib import Path


async def test_layer_1_with_profile_urls():
    """Test Layer 1 scraping with profile URL extraction."""
    print("=== TESTING LAYER 1 WITH PROFILE URLs ===")
    
    # Import here to avoid circular imports
    from main import crawl_therapists
    
    # Run Layer 1 scraping
    print("Running Layer 1 scraping...")
    await crawl_therapists()
    
    # Check if therapists.csv was created and has profile URLs
    if os.path.exists("therapists.csv"):
        with open("therapists.csv", 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            data = list(reader)
            
        print(f"✓ therapists.csv created with {len(data)} records")
        
        # Check for profile URLs
        records_with_urls = [row for row in data if row.get('profile_url', '').strip()]
        print(f"✓ {len(records_with_urls)} records have profile URLs")
        
        # Show sample profile URLs
        print("\nSample profile URLs:")
        for i, record in enumerate(records_with_urls[:3]):
            print(f"  {i+1}. {record['name']}: {record['profile_url']}")
        
        return len(records_with_urls) > 0
    else:
        print("❌ therapists.csv not found")
        return False


async def test_layer_2_enhancement():
    """Test Layer 2 enhancement mode."""
    print("\n=== TESTING LAYER 2 ENHANCEMENT ===")
    
    if not os.path.exists("therapists.csv"):
        print("❌ therapists.csv not found. Run Layer 1 first.")
        return False
    
    # Import and run Layer 2 enhancement
    from profile_scraper_main import run_enhance_mode
    
    print("Running Layer 2 enhancement...")
    await run_enhance_mode()
    
    # Check if detailed_therapists.csv was created
    if os.path.exists("detailed_therapists.csv"):
        with open("detailed_therapists.csv", 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            enhanced_data = list(reader)
            
        print(f"✓ detailed_therapists.csv created with {len(enhanced_data)} records")
        
        # Check enhancement success
        enhanced_records = [
            row for row in enhanced_data 
            if row.get('about', '').strip() or row.get('education', '').strip() or row.get('phone', '').strip()
        ]
        
        success_rate = (len(enhanced_records) / len(enhanced_data)) * 100 if enhanced_data else 0
        print(f"✓ {len(enhanced_records)} records successfully enhanced ({success_rate:.1f}%)")
        
        # Show sample enhanced data
        print("\nSample enhanced data:")
        for i, record in enumerate(enhanced_records[:2]):
            print(f"\n  {i+1}. {record['name']}:")
            for field in ['about', 'education', 'phone', 'email']:
                value = record.get(field, '').strip()
                if value:
                    display_value = value[:100] + "..." if len(value) > 100 else value
                    print(f"     {field}: {display_value}")
        
        return len(enhanced_records) > 0
    else:
        print("❌ detailed_therapists.csv not found")
        return False


def validate_csv_structure():
    """Validate the structure of generated CSV files."""
    print("\n=== VALIDATING CSV STRUCTURE ===")
    
    files_to_check = [
        ("therapists.csv", "Layer 1 output"),
        ("detailed_therapists.csv", "Layer 2 output")
    ]
    
    for filename, description in files_to_check:
        if os.path.exists(filename):
            with open(filename, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                headers = reader.fieldnames
                data = list(reader)
            
            print(f"\n✓ {description} ({filename}):")
            print(f"  - Records: {len(data)}")
            print(f"  - Fields: {len(headers)}")
            print(f"  - Key fields: {', '.join(headers[:5])}...")
            
            # Check for profile URLs
            if "profile_url" in headers:
                url_count = sum(1 for row in data if row.get('profile_url', '').strip())
                print(f"  - Profile URLs: {url_count}/{len(data)}")
        else:
            print(f"❌ {description} ({filename}) not found")


async def test_complete_workflow():
    """Test the complete two-layer workflow."""
    print("🚀 TESTING COMPLETE TWO-LAYER WORKFLOW")
    print("=" * 50)
    
    try:
        # Test Layer 1
        layer1_success = await test_layer_1_with_profile_urls()
        
        if layer1_success:
            # Test Layer 2
            layer2_success = await test_layer_2_enhancement()
            
            # Validate CSV structure
            validate_csv_structure()
            
            if layer1_success and layer2_success:
                print("\n🎉 COMPLETE WORKFLOW TEST SUCCESSFUL!")
                print("✓ Layer 1: Basic data + profile URLs saved to therapists.csv")
                print("✓ Layer 2: Enhanced data saved to detailed_therapists.csv")
                print("✓ Both CSV files validated")
            else:
                print("\n⚠️ Partial success - some issues found")
        else:
            print("\n❌ Layer 1 failed - cannot proceed to Layer 2")
            
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
    
    print("\n" + "=" * 50)
    print("Test complete!")


if __name__ == "__main__":
    asyncio.run(test_complete_workflow()) 