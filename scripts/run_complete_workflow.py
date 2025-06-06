#!/usr/bin/env python3
"""
Complete Two-Layer Workflow Runner

This script runs the complete workflow:
1. Layer 1: Scrape basic data + profile URLs → therapists.csv
2. Layer 2: Enhance with detailed profile data → detailed_therapists.csv

Usage:
    python run_complete_workflow.py
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
import argparse
import os
from datetime import datetime
import subprocess
from pathlib import Path
import time


async def run_layer_1():
    """Run Layer 1 scraping."""
    print("🔄 Starting Layer 1: Basic data extraction with profile URLs")
    print("-" * 60)
    
    layer1_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src', 'layer1_basic_scraper')
    sys.path.append(layer1_path)
    from main import crawl_therapists
    await crawl_therapists()
    
    if os.path.exists("data/therapists.csv"):
        print("✅ Layer 1 completed successfully!")
        print("📄 Basic data saved to: therapists.csv")
        return True
    else:
        print("❌ Layer 1 failed - no output file created")
        return False


async def run_layer_2():
    """Run Layer 2 enhancement."""
    print("\n🔄 Starting Layer 2: Profile enhancement")
    print("-" * 60)
    
    layer2_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src', 'layer2_profile_scraper')
    sys.path.append(layer2_path)
    from profile_scraper_main import run_enhance_mode
    await run_enhance_mode()
    
    if os.path.exists("data/detailed_therapists.csv"):
        print("✅ Layer 2 completed successfully!")
        print("📄 Enhanced data saved to: detailed_therapists.csv")
        return True
    else:
        print("❌ Layer 2 failed - no enhanced output created")
        return False


def show_summary():
    """Show summary of generated files."""
    print("\n📊 WORKFLOW SUMMARY")
    print("=" * 60)
    
    files_info = [
        ("data/therapists.csv", "Layer 1: Basic data + profile URLs"),
        ("data/detailed_therapists.csv", "Layer 2: Enhanced profile data")
    ]
    
    for filename, description in files_info:
        if os.path.exists(filename):
            file_size = os.path.getsize(filename)
            modified_time = datetime.fromtimestamp(os.path.getmtime(filename))
            
            print(f"✅ {filename}")
            print(f"   {description}")
            print(f"   Size: {file_size:,} bytes")
            print(f"   Modified: {modified_time.strftime('%Y-%m-%d %H:%M:%S')}")
            
            # Count records
            try:
                import csv
                with open(filename, 'r', encoding='utf-8') as file:
                    reader = csv.DictReader(file)
                    record_count = sum(1 for _ in reader)
                print(f"   Records: {record_count}")
            except Exception:
                pass
            print()
        else:
            print(f"❌ {filename} - Not found")
            print(f"   {description}")
            print()


async def main():
    """Main workflow function."""
    parser = argparse.ArgumentParser(description="Two-Layer Web Scraper Workflow")
    parser.add_argument(
        "--layer", 
        choices=["1", "2", "both"], 
        default="both",
        help="Which layer to run: 1 (basic), 2 (enhance), both (complete workflow)"
    )
    parser.add_argument(
        "--skip-layer1", 
        action="store_true",
        help="Skip Layer 1 if therapists.csv already exists"
    )
    
    args = parser.parse_args()
    
    print("🚀 TWO-LAYER WEB SCRAPER WORKFLOW")
    print("=" * 60)
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    layer1_success = False
    layer2_success = False
    
    # Run Layer 1
    if args.layer in ["1", "both"]:
        if args.skip_layer1 and os.path.exists("data/therapists.csv"):
            print("⏭️  Skipping Layer 1 - therapists.csv already exists")
            layer1_success = True
        else:
            layer1_success = await run_layer_1()
    else:
        layer1_success = os.path.exists("data/therapists.csv")
    
    # Run Layer 2
    if args.layer in ["2", "both"] and layer1_success:
        layer2_success = await run_layer_2()
    elif args.layer == "2" and not layer1_success:
        print("❌ Cannot run Layer 2 - data/therapists.csv not found. Run Layer 1 first.")
    
    # Show summary
    show_summary()
    
    # Final status
    print("🎯 FINAL STATUS")
    print("=" * 60)
    
    if args.layer == "1":
        if layer1_success:
            print("✅ Layer 1 completed successfully!")
            print("➡️  Next step: Run Layer 2 with --layer 2")
        else:
            print("❌ Layer 1 failed")
    elif args.layer == "2":
        if layer2_success:
            print("✅ Layer 2 completed successfully!")
            print("🎉 Detailed profile data is ready!")
        else:
            print("❌ Layer 2 failed")
    elif args.layer == "both":
        if layer1_success and layer2_success:
            print("🎉 COMPLETE WORKFLOW SUCCESSFUL!")
            print("✅ Layer 1: Basic data extracted")
            print("✅ Layer 2: Profiles enhanced")
            print("📊 Both CSV files ready for analysis")
        elif layer1_success:
            print("⚠️  Partial success - Layer 1 completed, Layer 2 failed")
        else:
            print("❌ Workflow failed at Layer 1")


if __name__ == "__main__":
    asyncio.run(main()) 