#!/usr/bin/env python3
"""
Test basic functionality without requiring API keys
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_csv_operations():
    """Test CSV operations with sample data"""
    print("🧪 Testing CSV operations...")
    
    try:
        from src.shared.utils.data_utils import save_venues_to_csv, load_existing_data
        from src.shared.models.doctor import Doctor
        
        # Create sample data
        sample_doctors = [
            {
                "name": "Dr. Test One",
                "experience": "5 years",
                "location": "Test City",
                "consultation_fee": "$100",
                "Specialization": "General Medicine",
                "profile_url": "https://example.com/profile1"
            },
            {
                "name": "Dr. Test Two", 
                "experience": "10 years",
                "location": "Another City",
                "consultation_fee": "$150",
                "Specialization": "Cardiology",
                "profile_url": "https://example.com/profile2"
            }
        ]
        
        # Test saving to CSV
        test_filename = "data/test_doctors.csv"
        save_venues_to_csv(sample_doctors, test_filename)
        print(f"✅ Successfully saved sample data to {test_filename}")
        
        # Test loading from CSV
        loaded_data = load_existing_data(test_filename)
        print(f"✅ Successfully loaded {len(loaded_data)} records from CSV")
        
        # Verify data integrity
        if len(loaded_data) == len(sample_doctors):
            print("✅ Data integrity check passed")
        else:
            print(f"❌ Data integrity check failed: expected {len(sample_doctors)}, got {len(loaded_data)}")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ CSV operations test failed: {e}")
        return False

def test_config_loading():
    """Test configuration loading"""
    print("\n🧪 Testing configuration loading...")
    
    try:
        from config.layer1_config import BASE_URL, CSS_SELECTOR, ACTIVE_WEBSITE
        from config.layer2_config import PROFILE_SITE_CONFIG, ACTIVE_PROFILE_CONFIG
        
        print(f"✅ Layer 1 config loaded - Active website: {ACTIVE_WEBSITE}")
        print(f"   Base URL: {BASE_URL[:50]}...")
        print(f"   CSS Selector: {CSS_SELECTOR}")
        
        print(f"✅ Layer 2 config loaded - Available sites: {list(PROFILE_SITE_CONFIG.keys())}")
        print(f"   Active profile config domain: {ACTIVE_PROFILE_CONFIG.get('base_domain', 'N/A')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Configuration loading test failed: {e}")
        return False

def test_browser_config():
    """Test browser configuration without starting browser"""
    print("\n🧪 Testing browser configuration...")
    
    try:
        from src.layer1_basic_scraper.main import get_browser_config
        
        config = get_browser_config()
        print(f"✅ Browser config created successfully")
        print(f"   Browser type: {config.browser_type}")
        print(f"   Headless: {config.headless}")
        print(f"   Verbose: {config.verbose}")
        
        return True
        
    except Exception as e:
        print(f"❌ Browser configuration test failed: {e}")
        return False

def test_doctor_model():
    """Test Doctor model validation"""
    print("\n🧪 Testing Doctor model...")
    
    try:
        from src.shared.models.doctor import Doctor
        
        # Test valid doctor
        doctor = Doctor(
            name="Dr. Valid Test",
            experience="5 years",
            location="Test Location",
            consultation_fee="$100",
            Specialization="Test Specialty"
        )
        print(f"✅ Valid doctor model created: {doctor.name}")
        
        # Test doctor with optional fields
        detailed_doctor = Doctor(
            name="Dr. Detailed Test",
            experience="10 years", 
            location="Detailed Location",
            consultation_fee="$200",
            Specialization="Detailed Specialty",
            about="Test biography",
            phone="+1-555-0123",
            email="test@example.com",
            education=["MD from Test University"],
            certifications=["Board Certified"],
            languages=["English", "Spanish"]
        )
        print(f"✅ Detailed doctor model created: {detailed_doctor.name}")
        print(f"   Fields populated: {sum(1 for field, value in detailed_doctor.model_dump().items() if value is not None)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Doctor model test failed: {e}")
        return False

def main():
    """Run all basic functionality tests"""
    print("🚀 Testing Basic Functionality (No API Required)")
    print("=" * 60)
    
    tests = [
        test_config_loading,
        test_doctor_model,
        test_csv_operations,
        test_browser_config
    ]
    
    results = []
    for test in tests:
        results.append(test())
    
    print("\n📊 Basic Functionality Test Results")
    print("=" * 60)
    
    if all(results):
        print("🎉 ALL BASIC FUNCTIONALITY TESTS PASSED!")
        print("✅ Project is ready for use")
        print("✅ CSV operations working")
        print("✅ Configuration loading working")
        print("✅ Data models working")
        print("✅ Browser configuration working")
        print("\n📝 To run the actual scraper:")
        print("1. Create .env file with: ANTHROPIC_API_KEY=your_key_here")
        print("2. Run: python run_scraper.py")
        print("3. Select option 1 for complete workflow")
    else:
        print("❌ Some basic functionality tests failed")
        print("🔧 Please fix the issues above")
        
        failed_count = sum(1 for r in results if not r)
        print(f"\n📈 Results: {len(results) - failed_count}/{len(results)} tests passed")

if __name__ == "__main__":
    main() 