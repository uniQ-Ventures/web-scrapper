# Project Structure Overview

## 📁 Organized Folder Structure

```
web-scrapper/
├── 📄 README.md                          # Comprehensive project documentation
├── 📄 STRUCTURE.md                       # This file - structure overview
├── 📄 requirements.txt                   # Python dependencies
├── 📄 .gitignore                        # Git ignore rules
├── 📄 env.example                       # Environment variables template
├── 🚀 run_scraper.py                    # Main entry point (interactive menu)
│
├── 📁 config/                           # Configuration files
│   ├── 📄 layer1_config.py             # Layer 1: Basic scraping configuration
│   └── 📄 layer2_config.py             # Layer 2: Profile scraping configuration
│
├── 📁 src/                              # Source code (organized by layer)
│   ├── 📁 layer1_basic_scraper/         # Layer 1: Basic listing scraper
│   │   ├── 📄 __init__.py
│   │   └── 📄 main.py                   # Main Layer 1 scraper
│   │
│   ├── 📁 layer2_profile_scraper/       # Layer 2: Detailed profile scraper
│   │   ├── 📄 __init__.py
│   │   ├── 📄 profile_scraper_main.py   # Main Layer 2 scraper
│   │   ├── 📄 llm_profile_scraper.py    # LLM-powered profile extraction
│   │   └── 📄 profile_scraper.py        # Traditional profile scraper
│   │
│   └── 📁 shared/                       # Shared utilities and models
│       ├── 📄 __init__.py
│       ├── 📁 models/                   # Data models
│       │   ├── 📄 __init__.py
│       │   └── 📄 doctor.py             # Doctor/Therapist data model (20+ fields)
│       └── 📁 utils/                    # Shared utilities
│           ├── 📄 __init__.py
│           ├── 📄 data_utils.py         # CSV handling utilities
│           ├── 📄 scraper_utils.py      # Web scraping utilities
│           └── 📄 pagination.py         # Pagination handling
│
├── 📁 scripts/                          # Workflow automation scripts
│   └── 📄 run_complete_workflow.py      # Complete two-layer workflow runner
│
├── 📁 tests/                            # Test files
│   ├── 📄 test_enhanced_workflow.py     # Enhanced workflow tests
│   └── 📄 test_profile_scraping.py      # Profile scraping tests
│
├── 📁 data/                             # Output data files
│   ├── 📊 therapists.csv               # Layer 1 output: Basic data + profile URLs
│   └── 📊 detailed_therapists.csv      # Layer 2 output: Enhanced profile data
│
└── 📁 outputs/                          # Additional output directory (if needed)
```

## 🎯 Entry Points

### 1. **Interactive Menu** (Recommended for beginners)
```bash
python run_scraper.py
```

### 2. **Complete Workflow** (Automated)
```bash
python scripts/run_complete_workflow.py
```

### 3. **Layer-by-Layer** (Advanced users)
```bash
# Layer 1
cd src/layer1_basic_scraper && python main.py

# Layer 2  
cd src/layer2_profile_scraper && python profile_scraper_main.py --mode enhance
```

## 🔄 Data Flow

```
Layer 1 (src/layer1_basic_scraper/)
    ↓ Scrapes listing pages
    ↓ Extracts basic info + profile URLs
    ↓ Saves to data/therapists.csv
    
Layer 2 (src/layer2_profile_scraper/)
    ↓ Reads data/therapists.csv
    ↓ Uses LLM to extract detailed profile data
    ↓ Saves to data/detailed_therapists.csv
```

## 🎛️ Configuration

- **Layer 1**: `config/layer1_config.py` - CSS selectors, pagination, site-specific settings
- **Layer 2**: `config/layer2_config.py` - LLM prompts, URL patterns, extraction rules
- **Environment**: `.env` - API keys and optional overrides

## 🧪 Testing

- **Profile Detection**: Test LLM-based profile URL detection
- **Complete Workflow**: End-to-end testing of both layers
- **Individual Components**: Unit tests for specific functionality

## 📊 Output Files

- **data/therapists.csv**: Basic information (5 fields) + profile URLs
- **data/detailed_therapists.csv**: Enhanced information (20+ fields)

## 🔧 Benefits of This Structure

1. **Clear Separation**: Each layer has its own directory and concerns
2. **Shared Resources**: Common utilities and models in `src/shared/`
3. **Easy Configuration**: Centralized config files for each layer
4. **Multiple Entry Points**: Interactive, automated, and manual options
5. **Organized Output**: All data files in dedicated `data/` directory
6. **Comprehensive Testing**: Dedicated test directory with multiple test types
7. **Documentation**: Clear README and structure documentation

## 🚀 Quick Start

1. **Setup**: `pip install -r requirements.txt`
2. **Configure**: Copy `env.example` to `.env` and add API keys
3. **Run**: `python run_scraper.py` and select option 1
4. **Results**: Check `data/` directory for CSV files

This structure makes the project maintainable, scalable, and easy to understand for both beginners and advanced users. 