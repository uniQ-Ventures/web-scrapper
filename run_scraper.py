#!/usr/bin/env python3
"""
Simple entry point for the Two-Layer Web Scraper

This script provides an easy way to run the scraper from the root directory.
"""

import sys
import os
import subprocess
from pathlib import Path

def main():
    """Main entry point"""
    print("🚀 Two-Layer Web Scraper")
    print("=" * 40)
    print("1. Complete Workflow (Both Layers)")
    print("2. Layer 1 Only (Basic Data)")
    print("3. Layer 2 Only (Profile Enhancement)")
    print("4. Test Profile Detection")
    print("5. Exit")
    print("=" * 40)
    
    choice = input("Select an option (1-5): ").strip()
    
    if choice == "1":
        print("\n🔄 Running complete workflow...")
        subprocess.run([sys.executable, "scripts/run_complete_workflow.py"])
    
    elif choice == "2":
        print("\n🔄 Running Layer 1 (Basic Data)...")
        os.chdir("src/layer1_basic_scraper")
        subprocess.run([sys.executable, "main.py"])
    
    elif choice == "3":
        print("\n🔄 Running Layer 2 (Profile Enhancement)...")
        os.chdir("src/layer2_profile_scraper")
        subprocess.run([sys.executable, "profile_scraper_main.py", "--mode", "enhance"])
    
    elif choice == "4":
        print("\n🧪 Testing Profile Detection...")
        os.chdir("src/layer2_profile_scraper")
        subprocess.run([sys.executable, "profile_scraper_main.py", "--mode", "test"])
    
    elif choice == "5":
        print("👋 Goodbye!")
        return
    
    else:
        print("❌ Invalid choice. Please select 1-5.")
        main()

if __name__ == "__main__":
    main() 