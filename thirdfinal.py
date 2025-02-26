from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, ElementNotInteractableException
from bs4 import BeautifulSoup
from webdriver_manager.chrome import ChromeDriverManager
import time

options = Options()
options.add_argument("--headless")  
options.add_argument("--window-size=1920,1080")  
service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service, options=options)

base_url = "https://www.psychotherapy.org.uk/find-a-therapist?Distance=10&page={}"
max_pages = 677

therapist_data = []

for page in range(1, max_pages + 1):
    url = base_url.format(page)
    print(f"📄 Scraping Page {page}: {url}")

    driver.get(url)
    try:
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CLASS_NAME, "profile-listing")))
        time.sleep(2) 
    except TimeoutException:
        print(f"⚠️ Page {page} failed to load properly. Skipping...")
        continue  

    soup = BeautifulSoup(driver.page_source, "html.parser")
    therapists = soup.find_all("div", class_="profile-listing")

    for therapist in therapists:
        name_tag = therapist.find("h2") 
        profile_link_tag = therapist.find("a", class_="light-anchor")
        if name_tag and profile_link_tag:
            name = name_tag.text.strip()
            profile_link = "https://www.psychotherapy.org.uk/" + profile_link_tag["href"].lstrip("/")
            therapist_data.append({"name": name, "profile": profile_link})
            print(f"✅ Found: {name} - {profile_link}")

driver.quit()  

driver = webdriver.Chrome(service=service, options=options)

for therapist in therapist_data:
    print(f"🔍 Visiting: {therapist['profile']}")
    driver.get(therapist["profile"])
    time.sleep(3) 

    therapist["phone"] = "No Phone"
    therapist["email"] = "No Email"
    therapist["website"] = "No Website"

    try:
        show_contact_button = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.CLASS_NAME, "therapist-contacts-details-show"))
        )

        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", show_contact_button)
        time.sleep(1)
        driver.execute_script("arguments[0].click();", show_contact_button)
        print("📌 Successfully clicked 'Show Contact Details' button")
        time.sleep(2)  
    except (TimeoutException, NoSuchElementException, ElementNotInteractableException):
        print(f"⚠️ No 'Show Contact Details' button for {therapist['name']}")

    soup = BeautifulSoup(driver.page_source, "html.parser")

    phone_tag = soup.select_one(".therapist-contacts-details-tel a[href^='tel:']")
    therapist["phone"] = phone_tag.text.strip() if phone_tag else "No Phone"

    email_tag = soup.select_one(".therapist-contacts-details-email a[href^='mailto:']")
    therapist["email"] = email_tag.text.strip() if email_tag else "No Email"

    website_tag = soup.select_one(".therapist-contacts-details-web a[href^='http']")
    therapist["website"] = website_tag["href"] if website_tag else "No Website"

    print(f"📞 {therapist['name']} - {therapist['phone']} - {therapist['email']} - {therapist['website']}")

driver.quit()

with open("therapists_with_contacts.txt", "w", encoding="utf-8") as f:
    for therapist in therapist_data:
        f.write(f"{therapist['name']} - {therapist['phone']} - {therapist['email']} - {therapist['website']}\n")

print(f"\n✅ Scraped {len(therapist_data)} therapists with contact details.")
