"""
scraper.py — Daily intern posting checker for FindJobs IBR board.
 
Reads FIRMS (name + careerUrl) from firms_data.json, fetches each career page,
and writes intern_status.json with per-firm results including structured job
listing details (title, description, graduation date, apply URL).
 
Run:
    pip install requests beautifulsoup4
    python scraper.py
"""
 
import json
import re
import time
import sys
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse
 
import requests
from bs4 import BeautifulSoup, Tag
 
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
 
# Patterns for graduation dates
GRAD_DATE_PATTERNS = [
    # "Class of 2027", "class of 2026"
    re.compile(r"class\s+of\s+(20\d{2})", re.IGNORECASE),
    # "graduating in May 2027", "graduation: December 2026"
    re.compile(
        r"graduat(?:ing|ion)[:\s]+(?:in\s+)?"
        r"((?:January|February|March|April|May|June|July|August|September|October|November|December)"
        r"\s+20\d{2})",
        re.IGNORECASE,
    ),
    # "expected graduation 2027"
    re.compile(r"expected\s+graduation[:\s]+(20\d{2})", re.IGNORECASE),
    # "graduating Spring/Fall/Summer 2027"
    re.compile(
        r"graduat(?:ing|ion)[:\s]+(?:in\s+)?"
        r"((?:Spring|Summer|Fall|Winter)\s+20\d{2})",
        re.IGNORECASE,
    ),
    # "May 2027 graduate"
    re.compile(
        r"((?:January|February|March|April|May|June|July|August|September|October|November|December)"
        r"\s+20\d{2})\s+graduate",
        re.IGNORECASE,
    ),
    # Standalone "2026" or "2027" near graduation context
    re.compile(r"graduation.*?(20\d{2})", re.IGNORECASE),
]
 
 
# ── Helpers ───────────────────────────────────────────────────────────────────
 
def get(url: str) -> requests.Response | None:
    """GET url; return Response or None on any error."""
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
        return r
    except Exception:
        return None
 
 
def visible_text(soup: BeautifulSoup) -> str:
    """Extract visible text from a BeautifulSoup tree, stripping scripts/styles."""
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    return soup.get_text(" ", strip=True)
 
 
def text_mentions_intern(html: str) -> bool:
    """Return True if visible page text contains an intern keyword."""
    soup = BeautifulSoup(html, "html.parser")
    text = visible_text(soup).lower()
    return any(kw in text for kw in INTERN_KEYWORDS)
 
 
def extract_graduation_dates(text: str) -> list[str]:
    """Extract graduation date mentions from text."""
    dates = []
    for pattern in GRAD_DATE_PATTERNS:
        for match in pattern.finditer(text):
            date_str = match.group(1).strip()
            if date_str not in dates:
                dates.append(date_str)
    return dates
 
 
def find_job_listings(html: str, career_url: str) -> list[dict]:
    """
    Extract structured intern job listings from career page HTML.
    Uses heuristics to find job containers and extract details.
    """
    soup = BeautifulSoup(html, "html.parser")
    jobs = []
    seen_titles = set()
 
    # Strategy 1: Look for links/headings containing intern keywords
    # These are the most reliable indicators of job listings
    intern_elements = []
 
    # Find all links with intern keywords
    for a in soup.find_all("a", href=True):
        link_text = a.get_text(" ", strip=True).lower()
        if any(kw in link_text for kw in INTERN_KEYWORDS):
            intern_elements.append(("link", a))
 
    # Find headings with intern keywords
    for heading in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
        heading_text = heading.get_text(" ", strip=True).lower()
        if any(kw in heading_text for kw in INTERN_KEYWORDS):
            intern_elements.append(("heading", heading))
 
    # Find list items and divs that look like job cards with intern keywords
    for el in soup.find_all(["li", "div", "article", "section"]):
        el_text = el.get_text(" ", strip=True)
        if len(el_text) < 20 or len(el_text) > 2000:
            continue
        if any(kw in el_text.lower() for kw in INTERN_KEYWORDS):
            # Check this element is reasonably sized (a job card, not the whole page)
            children_with_text = [
                c for c in el.children
                if isinstance(c, Tag) and c.get_text(strip=True)
            ]
            if 1 <= len(children_with_text) <= 15:
                intern_elements.append(("card", el))
 
    for elem_type, elem in intern_elements:
        title = ""
        description = ""
        apply_url = ""
        grad_dates = []
 
        if elem_type == "link":
            title = elem.get_text(" ", strip=True)
            href = elem.get("href", "")
            if href and not href.startswith("#") and not href.startswith("javascript:"):
                apply_url = urljoin(career_url, href)
 
            # Get description from surrounding context (parent or sibling)
            parent = elem.parent
            if parent:
                siblings_text = []
                for sib in parent.children:
                    if sib != elem and isinstance(sib, Tag):
                        sib_text = sib.get_text(" ", strip=True)
                        if sib_text and len(sib_text) < 500:
                            siblings_text.append(sib_text)
                    elif sib != elem and isinstance(sib, str) and sib.strip():
                        siblings_text.append(sib.strip())
                description = " ".join(siblings_text)[:500]
 
                # Also check grandparent for more context
                if not description and parent.parent:
                    gp = parent.parent
                    gp_text = gp.get_text(" ", strip=True)
                    if len(gp_text) < 1000:
                        description = gp_text[:500]
 
        elif elem_type == "heading":
            title = elem.get_text(" ", strip=True)
            # Look at next siblings for description
            desc_parts = []
            for sib in elem.find_next_siblings():
                if sib.name in ["h1", "h2", "h3", "h4", "h5", "h6"]:
                    break
                sib_text = sib.get_text(" ", strip=True)
                if sib_text:
                    desc_parts.append(sib_text)
                if len(" ".join(desc_parts)) > 500:
                    break
            description = " ".join(desc_parts)[:500]
 
            # Look for apply links nearby
            for sib in elem.find_next_siblings():
                link = sib.find("a", href=True) if isinstance(sib, Tag) else None
                if link:
                    href = link.get("href", "")
                    link_text = link.get_text(" ", strip=True).lower()
                    if any(
                        word in link_text
                        for word in ["apply", "learn more", "view", "details"]
                    ):
                        apply_url = urljoin(career_url, href)
                        break
                if sib.name in ["h1", "h2", "h3", "h4", "h5", "h6"]:
                    break
 
        elif elem_type == "card":
            # For card-type elements, extract title from heading or strong text
            heading = elem.find(["h1", "h2", "h3", "h4", "h5", "h6", "strong", "b"])
            if heading:
                title = heading.get_text(" ", strip=True)
            else:
                # Use first line of text as title
                first_text = elem.get_text(" ", strip=True)
                title = first_text[:120]
 
            # Get description from full card text
            card_text = elem.get_text(" ", strip=True)
            if title and card_text.startswith(title):
                description = card_text[len(title):].strip()[:500]
            else:
                description = card_text[:500]
 
            # Find apply link within card
            link = elem.find("a", href=True)
            if link:
                href = link.get("href", "")
                if href and not href.startswith("#") and not href.startswith("javascript:"):
                    apply_url = urljoin(career_url, href)
 
        # Clean up title
        title = title.strip()
        if not title or len(title) < 3:
            continue
 
        # Skip if we've already seen this title
        title_key = title.lower().strip()
        if title_key in seen_titles:
            continue
 
        # Verify this title actually contains intern keywords
        if not any(kw in title.lower() for kw in INTERN_KEYWORDS):
            # Check if description has intern keywords instead
            if not any(kw in description.lower() for kw in INTERN_KEYWORDS):
                continue
 
        seen_titles.add(title_key)
 
        # Extract graduation dates from description and title
        combined_text = f"{title} {description}"
        grad_dates = extract_graduation_dates(combined_text)
 
        # Default apply URL to the career page if none found
        if not apply_url:
            apply_url = career_url
 
        # Clean description: remove excess whitespace
        description = re.sub(r"\s+", " ", description).strip()
 
        jobs.append({
            "title": title[:200],
            "description": description[:500] if description else "",
            "graduationDate": grad_dates[0] if grad_dates else None,
            "applyUrl": apply_url,
        })
 
    # If we found intern keywords but no structured listings, create a generic one
    if not jobs and text_mentions_intern(html):
        page_text = visible_text(BeautifulSoup(html, "html.parser"))
        grad_dates = extract_graduation_dates(page_text)
 
        # Try to find the most relevant snippet around intern keywords
        snippet = ""
        lower_text = page_text.lower()
        for kw in INTERN_KEYWORDS:
            idx = lower_text.find(kw)
            if idx != -1:
                start = max(0, idx - 100)
                end = min(len(page_text), idx + 300)
                snippet = page_text[start:end].strip()
                snippet = re.sub(r"\s+", " ", snippet)
                break
 
        jobs.append({
            "title": "Intern / Summer Analyst Position",
            "description": snippet[:500] if snippet else "Intern position available. Visit the career page for details.",
            "graduationDate": grad_dates[0] if grad_dates else None,
            "applyUrl": career_url,
        })
 
    return jobs
 
 
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
    Returns a result dict with structured job listings.
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
            "jobs": [],
        }
 
    print(f"  → Checking {resolved_career_url}", flush=True)
    r = get(resolved_career_url)
 
    if r is None:
        return {
            "hasInternPosting": False,
            "careerUrl": resolved_career_url,
            "status": "request_error",
            "lastChecked": datetime.now(timezone.utc).isoformat(),
            "jobs": [],
        }
 
    if r.status_code != 200:
        return {
            "hasInternPosting": False,
            "careerUrl": resolved_career_url,
            "status": f"http_{r.status_code}",
            "lastChecked": datetime.now(timezone.utc).isoformat(),
            "jobs": [],
        }
 
    has_intern = text_mentions_intern(r.text)
    jobs = find_job_listings(r.text, resolved_career_url) if has_intern else []
 
    return {
        "hasInternPosting": has_intern,
        "careerUrl": resolved_career_url,
        "status": "ok",
        "lastChecked": datetime.now(timezone.utc).isoformat(),
        "jobs": jobs,
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
            job_count = len(result.get("jobs", []))
            print(f"       *** INTERN POSTING FOUND ({job_count} listing(s)) ***", flush=True)
 
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