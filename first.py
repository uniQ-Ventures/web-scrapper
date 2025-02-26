from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
from webdriver_manager.chrome import ChromeDriverManager
import time

options = Options()
options.add_argument("--headless")  # Run in headless mode
service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service, options=options)

base_url = "https://locator.apa.org/results/{page}/New%20York,%20NY/25/"

max_pages = 50
def format_profile_url(name):
    profile_name = "-".join(name.lower().split()) 
    return f"https://locator.apa.org/profile/{profile_name}"

def scrape_profile(phone_url):
    driver.get(phone_url)
    time.sleep(2)  
    
    soup = BeautifulSoup(driver.page_source, "html.parser")
    
    phone_element = soup.find("div", class_="tel")
    phone_number = phone_element.text.strip() if phone_element else "Not Found"
    
    practice_area_section = soup.find("div", id="pract_area")
    practice_areas = []
    
    if practice_area_section:
        practice_area_items = practice_area_section.find_all("li")
        for item in practice_area_items:
            practice_areas.append(item.text.strip())
    
    practice_area = ", ".join(practice_areas) if practice_areas else "Not Found"
    
    return phone_number, practice_area

all_doctors = []

for page in range(1, max_pages + 1):
    url = base_url.format(page=page)
    print(f"Scraping Page {page}: {url}")

    driver.get(url)

    try:
        WebDriverWait(driver, 5).until(
            EC.presence_of_all_elements_located((By.CLASS_NAME, "media-heading"))
        )
    except:
        print(f"⚠️ No doctors found on page {page}. Stopping.")
        break 

    soup = BeautifulSoup(driver.page_source, "html.parser")

    doctor_elements = soup.find_all("h4", class_="media-heading")

    for doctor in doctor_elements:
        given_name = doctor.find("span", class_="given-name")
        family_name = doctor.find("span", class_="family-name")

        if given_name and family_name:
            full_name = f"{given_name.text.strip()} {family_name.text.strip()}"
            profile_url = format_profile_url(full_name)
            phone_number, practice_area = scrape_profile(profile_url)  

            all_doctors.append((full_name, phone_number, practice_area))
            print(f"{full_name}: {phone_number}, Practice Areas: {practice_area}")

driver.quit()

with open("doctors_with_details.txt", "w") as f:
    for name, phone, practice_area in all_doctors:
        f.write(f"{name}: {phone}, Practice Areas: {practice_area}\n")

print(f"\n✅ Scraped {len(all_doctors)} doctors with details.")
