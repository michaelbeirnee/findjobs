"""
scraper.py — Daily intern posting checker for FindJobs IBR board.
 
Reads FIRMS (name + careerUrl) from firms_data.json, fetches each career page,
and writes intern_status.json with per-firm results.
 
Run:
    pip install requests beautifulsoup4
    python scraper.py
"""
 
import json
import time
import sys
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse
 
import requests
from bs4 import BeautifulSoup
 
# ── Config ────────────────────────────────────────────────────────────────────
 
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}
 
TIMEOUT = 15          # seconds per request
DELAY   = 1.5         # seconds between requests (be polite)
INTERN_KEYWORDS = ["intern", "internship", "summer analyst", "co-op", "coop"]
 
# Common career page path suffixes to try when only website root is known
CAREER_PATHS = [
    "/careers",
    "/jobs",
    "/career",
    "/join-us",
    "/join",
    "/work-with-us",
    "/opportunities",
    "/open-positions",
    "/about/careers",
    "/about/jobs",
    "/company/careers",
    "/hiring",
]
 
 
# ── Helpers ───────────────────────────────────────────────────────────────────
 
def get(url: str) -> requests.Response | None:
    """GET url; return Response or None on any error."""
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
        return r
    except Exception:
        return None
 
 
def text_mentions_intern(html: str) -> bool:
    """Return True if visible page text (or meta content) contains an intern keyword."""
    soup = BeautifulSoup(html, "html.parser")
 
    # Remove script/style noise
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
 
    visible = soup.get_text(" ", strip=True).lower()
    return any(kw in visible for kw in INTERN_KEYWORDS)
 
 
def discover_career_url(website: str) -> str | None:
    """
    Given a root website URL, try common career page paths and return the first
    that returns HTTP 200, or None if none work.
    """
    base = website.rstrip("/")
    for path in CAREER_PATHS:
        url = base + path
        r = get(url)
        if r and r.status_code == 200:
            return url
        time.sleep(0.3)
    return None
 
 
def check_firm(firm: dict) -> dict:
    """
    Check a single firm's career page for intern mentions.
    Returns a result dict.
    """
    career_url = firm.get("careerUrl")
    website    = firm.get("website")
    name       = firm["name"]
 
    # If only website root is available, discover the career page
    resolved_career_url = career_url
    if not resolved_career_url and website:
        print(f"  → Discovering career page for {name}…", flush=True)
        resolved_career_url = discover_career_url(website)
 
    if not resolved_career_url:
        return {
            "hasInternPosting": False,
            "careerUrl": None,
            "status": "no_url",
            "lastChecked": datetime.now(timezone.utc).isoformat(),
        }
 
    print(f"  → Checking {resolved_career_url}", flush=True)
    r = get(resolved_career_url)
 
    if r is None:
        return {
            "hasInternPosting": False,
            "careerUrl": resolved_career_url,
            "status": "request_error",
            "lastChecked": datetime.now(timezone.utc).isoformat(),
        }
 
    if r.status_code != 200:
        return {
            "hasInternPosting": False,
            "careerUrl": resolved_career_url,
            "status": f"http_{r.status_code}",
            "lastChecked": datetime.now(timezone.utc).isoformat(),
        }
 
    has_intern = text_mentions_intern(r.text)
 
    return {
        "hasInternPosting": has_intern,
        "careerUrl": resolved_career_url,
        "status": "ok",
        "lastChecked": datetime.now(timezone.utc).isoformat(),
    }
 
 
# ── Main ──────────────────────────────────────────────────────────────────────
 
def main():
    # Load firm list
    try:
        with open("firms_data.json", encoding="utf-8") as f:
            firms = json.load(f)
    except FileNotFoundError:
        print("ERROR: firms_data.json not found.", file=sys.stderr)
        sys.exit(1)
 
    total   = len(firms)
    results = {}
    found   = 0
 
    print(f"Checking {total} firms for intern postings…\n", flush=True)
 
    for i, firm in enumerate(firms, 1):
        name = firm["name"]
        print(f"[{i}/{total}] {name}", flush=True)
 
        result = check_firm(firm)
        results[name] = result
 
        if result["hasInternPosting"]:
            found += 1
            print(f"       *** INTERN POSTING FOUND ***", flush=True)
 
        time.sleep(DELAY)
 
    # Write output
    output = {
        "lastUpdated": datetime.now(timezone.utc).isoformat(),
        "internCount": found,
        "firms": results,
    }
 
    with open("intern_status.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
 
    print(f"\nDone. {found}/{total} firms have intern postings.")
    print("Results written to intern_status.json")
 
 
if __name__ == "__main__":
    main()