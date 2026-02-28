"""
Alison.com Course Data Scraper
Fetches all courses from api.alison.com and saves to data/data.csv
"""

import csv
import json
import math
import re
import time
import os
import sys
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

# ── Config ─────────────────────────────────────────────────────────────────────
BASE_URL    = "https://api.alison.com/v0.1/search"
PAGE_SIZE   = 24
LOCALE      = "en"
ORDER       = "default"
DELAY_SEC   = 0.4          # polite delay between requests
MAX_RETRIES = 3
OUTPUT_CSV  = os.path.join(os.path.dirname(__file__), "..", "data", "data.csv")

HEADERS = {
    "authorization":  "Cookie oS7xZkHADzPvRAsOOKctRPWNTvxtsL0hpQAdDP8N",
    "x-csrf-token":   "USsoWo3QWTbKT2vjHOwbopqeQFRgobMYlanbz4fp",
    "x-header-host":  "TqEOyOy5I8z5rJ8Jpxvrcag/PqE=",
    "content-type":   "application/json",
    "origin":         "https://alison.com",
    "referer":        "https://alison.com/",
    "user-agent":     (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/145.0.0.0 Safari/537.36"
    ),
    "accept":         "*/*",
    "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
    "dnt":            "1",
}

# Fields to write to CSV (list/dict fields are serialised to JSON strings)
FIELDS = [
    "id", "name", "slug", "headline",
    "publisher_name", "publisher_display_name", "publisher_slug",
    "course_type_id",
    "category_name", "category_slug", "root_category_name", "root_category_slug",
    "level", "environment", "environment_name",
    "avg_duration", "points", "language", "locale",
    "rating", "enrolled", "certified", "liked", "loved", "disliked",
    "active", "enrollable", "trending", "visibility", "responsive",
    "contains_audio", "contains_video", "supported_in_mobile_app",
    "softonic_ads_on", "dfp_on",
    "list_ranking", "custom_list_ranking",
    "published",
    "cefr_score_description",
    "courseImgUrl",
    "outcomes",
    "tags",              # joined as pipe-separated string
    "categories_slugs",  # JSON string
    "translations",      # JSON string
]


# ── Helpers ────────────────────────────────────────────────────────────────────
# Fields that may contain HTML markup and should be stripped
HTML_FIELDS = {"outcomes", "headline", "name"}

_TAG_RE = re.compile(r"<[^>]+>")

def strip_html(text: str) -> str:
    """Remove HTML tags and normalise whitespace."""
    if not text:
        return text
    text = _TAG_RE.sub(" ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def fetch_page(page: int) -> dict:
    url = (
        f"{BASE_URL}?page={page}&locale={LOCALE}"
        f"&size={PAGE_SIZE}&order={ORDER}&include_summary=1"
    )
    req = Request(url, headers=HEADERS)

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            with urlopen(req, timeout=30) as resp:
                raw = resp.read()
            return json.loads(raw)
        except HTTPError as e:
            print(f"  [HTTP {e.code}] page {page}, attempt {attempt}/{MAX_RETRIES}")
            if e.code in (401, 403):
                sys.exit("Auth error – update your tokens in the script and retry.")
            if attempt < MAX_RETRIES:
                time.sleep(2 ** attempt)
        except URLError as e:
            print(f"  [URLError] page {page}, attempt {attempt}/{MAX_RETRIES}: {e.reason}")
            if attempt < MAX_RETRIES:
                time.sleep(2 ** attempt)

    raise RuntimeError(f"Failed to fetch page {page} after {MAX_RETRIES} attempts")


def flatten(course: dict) -> dict:
    row = {}
    for field in FIELDS:
        val = course.get(field)
        if isinstance(val, list):
            if field == "tags":
                row[field] = "|".join(val)
            else:
                row[field] = json.dumps(val)
        elif isinstance(val, dict):
            row[field] = json.dumps(val)
        else:
            if field in HTML_FIELDS and isinstance(val, str):
                val = strip_html(val)
            row[field] = val
    return row


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    os.makedirs(os.path.dirname(os.path.abspath(OUTPUT_CSV)), exist_ok=True)

    # Probe first page to get total count
    print("Probing page 1 …")
    first = fetch_page(1)
    total   = first.get("total", 0)
    pages   = math.ceil(total / PAGE_SIZE)
    print(f"Total courses: {total}  |  Pages: {pages}  |  Size: {PAGE_SIZE}")

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=FIELDS, extrasaction="ignore")
        writer.writeheader()

        # Write page 1 results
        for course in first.get("result", []):
            writer.writerow(flatten(course))

        # Fetch remaining pages
        for page in range(2, pages + 1):
            print(f"  Page {page}/{pages} …", end="\r", flush=True)
            time.sleep(DELAY_SEC)

            try:
                data = fetch_page(page)
            except RuntimeError as e:
                print(f"\n  [SKIP] {e}")
                continue

            results = data.get("result", [])
            if not results:
                print(f"\n  Empty result on page {page} – stopping.")
                break

            for course in results:
                writer.writerow(flatten(course))

    print(f"\nDone!  Saved to: {os.path.abspath(OUTPUT_CSV)}")


if __name__ == "__main__":
    main()
