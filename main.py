import requests
import random
import string
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

API_URL = "https://mixerno.space/api/youtube-channel-counter/search/"
OUTPUT_FILE = "youtube_channel.txt"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/114.0.0.0 Safari/537.36"
}

lock = threading.Lock()

def load_existing_ids():
    if not os.path.exists(OUTPUT_FILE):
        return set()
    with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
        return set(line.strip() for line in f if line.strip())

def generate_random_query():
    length = random.randint(1, 15)
    chars = string.ascii_letters
    return ''.join(random.choices(chars, k=length))

def fetch_channel_ids(query):
    try:
        response = requests.get(API_URL + query, headers=HEADERS, timeout=5)
        if response.status_code == 200:
            data = response.json()
            return [item[2] for item in data.get("list", [])]
    except Exception:
        return []
    return []

def append_new_ids(new_ids, existing_ids):
    added = 0
    with lock:
        with open(OUTPUT_FILE, "a", encoding="utf-8") as f:
            for cid in new_ids:
                if cid not in existing_ids:
                    f.write(cid + "\n")
                    existing_ids.add(cid)
                    added += 1
                    print(f"✅ Ajouté : {cid} | {len(existing_ids)}")
    return added

def worker(existing_ids):
    query = generate_random_query()
    ids = fetch_channel_ids(query)
    if ids:
        return append_new_ids(ids, existing_ids)
    return 0

def main():
    existing_ids = load_existing_ids()
    print(f"📂 {len(existing_ids)} ID(s) déjà dans le fichier.")

    total_added = 0
    with ThreadPoolExecutor(max_workers=15) as executor:
        futures = []
        while True:
            # On lance 15 requêtes en parallèle
            for _ in range(15):
                futures.append(executor.submit(worker, existing_ids))
            for future in as_completed(futures):
                total_added += future.result()
            futures.clear()

if __name__ == "__main__":
    main()
