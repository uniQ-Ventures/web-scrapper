#!/usr/bin/env python3
"""
Test script to verify the project structure and imports work correctly.
This script doesn't require API keys.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_layer1_imports():
    """Test Layer 1 imports"""
    print("🧪 Testing Layer 1 imports...")
    try:
        from config.layer1_config import (
            BASE_URL,
            CSS_SELECTOR,
            REQUIRED_KEYS,
            DELAY_BETWEEN_PAGES,
            MAX_RETRIES,
            BATCH_SIZE,
            BATCH_BREAK_TIME,
            MAX_PAGES,
            SITE_CONFIG
        )
        print("✅ Layer 1 config imports: SUCCESS")
        print(f"   BASE_URL: {BASE_URL[:50]}...")
        print(f"   CSS_SELECTOR: {CSS_SELECTOR}")
        print(f"   REQUIRED_KEYS: {REQUIRED_KEYS}")
    except Exception as e:
        print(f"❌ Layer 1 config imports: FAILED - {e}")
        return False
    
    try:
        from src.shared.models.doctor import Doctor
        print("✅ Doctor model import: SUCCESS")
        
        # Test creating a doctor instance
        doctor = Doctor(
            name="Test Doctor",
            experience="5 years",
            location="Test City",
            consultation_fee="$100",
            Specialization="General Medicine"
        )
        print(f"   Doctor model fields: {list(doctor.model_fields.keys())}")
    except Exception as e:
        print(f"❌ Doctor model import: FAILED - {e}")
        return False
    
    try:
        from src.shared.utils.data_utils import save_venues_to_csv
        print("✅ Data utils import: SUCCESS")
    except Exception as e:
        print(f"❌ Data utils import: FAILED - {e}")
        return False
    
    return True

def test_layer2_imports():
    """Test Layer 2 imports"""
    print("\n🧪 Testing Layer 2 imports...")
    try:
        from config.layer2_config import PROFILE_SITE_CONFIG
        print("✅ Layer 2 config imports: SUCCESS")
        print(f"   Available sites: {list(PROFILE_SITE_CONFIG.keys())}")
    except Exception as e:
        print(f"❌ Layer 2 config imports: FAILED - {e}")
        return False
    
    try:
        # Test importing the profile scraper (without initializing it)
        import src.layer2_profile_scraper.profile_scraper_main
        print("✅ Profile scraper main import: SUCCESS")
    except Exception as e:
        print(f"❌ Profile scraper main import: FAILED - {e}")
        return False
    
    return True

def test_data_structure():
    """Test data directory and file structure"""
    print("\n🧪 Testing data directory structure...")
    import os
    
    # Check if data directory exists
    if os.path.exists("data"):
        print("✅ Data directory exists")
        
        # List existing CSV files
        csv_files = [f for f in os.listdir("data") if f.endswith('.csv')]
        if csv_files:
            print(f"   Existing CSV files: {csv_files}")
        else:
            print("   No CSV files found (this is okay for a fresh install)")
    else:
        print("⚠️  Data directory doesn't exist, creating it...")
        os.makedirs("data", exist_ok=True)
        print("✅ Data directory created")
    
    return True

def test_workflow_scripts():
    """Test workflow scripts imports"""
    print("\n🧪 Testing workflow scripts...")
    try:
        import scripts.run_complete_workflow
        print("✅ Complete workflow script import: SUCCESS")
    except Exception as e:
        print(f"❌ Complete workflow script import: FAILED - {e}")
        return False
    
    return True

def main():
    """Run all tests"""
    print("🚀 Testing Project Structure")
    print("=" * 50)
    
    tests = [
        test_layer1_imports,
        test_layer2_imports,
        test_data_structure,
        test_workflow_scripts
    ]
    
    results = []
    for test in tests:
        results.append(test())
    
    print("\n📊 Test Results Summary")
    print("=" * 50)
    
    if all(results):
        print("🎉 ALL TESTS PASSED!")
        print("✅ Project structure is correctly organized")
        print("✅ All imports are working")
        print("✅ Ready to add API keys and run scraper")
        print("\n📝 Next steps:")
        print("1. Copy env.example to .env")
        print("2. Add your Anthropic API key to .env")
        print("3. Run: python run_scraper.py")
    else:
        print("❌ Some tests failed")
        print("🔧 Please fix the issues above before running the scraper")
        
        failed_count = sum(1 for r in results if not r)
        print(f"\n📈 Results: {len(results) - failed_count}/{len(results)} tests passed")

if __name__ == "__main__":
    main() 