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
 
try:
    # Optional dependency used only for JavaScript-rendered career pages (e.g. Workday)
    from playwright.sync_api import sync_playwright
except Exception:  # pragma: no cover - optional runtime dependency
    sync_playwright = None
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
INTERN_KEYWORDS = [
    "intern",
    "internship",
    "summer analyst",
    "summer associate",
    "co-op",
    "coop",
    "externship",
]
 
# Broader keywords that alone are NOT enough to qualify a listing — they only
# count when paired with a primary keyword above (used for description context).
WEAK_KEYWORDS = [
    "analyst program",
    "associate program",
    "summer program",
    "analyst position",
    "early careers",
    "campus recruiting",
]
 
# ── False-positive filters ───────────────────────────────────────────────────
# Titles matching any of these patterns are almost certainly NOT job listings.
# Compiled once at import time for speed.
NON_JOB_TITLE_PATTERNS = [
    # Person bios: "John Smith Analyst", "Jane Doe Managing Director"
    re.compile(
        r"^[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+"
        r"(?:Analyst|Associate|Director|Partner|Principal|Founder|VP|Officer|"
        r"Managing|Senior|Junior|Chairman|President)",
    ),
    # Transaction / deal tombstones: "Advises X on ...", "Closes X Transaction"
    re.compile(r"(?:advises?|closes?|announces?)\s+.+\s+(?:on|transaction|sale|acquisition)", re.IGNORECASE),
    # News datelines: "January 15, 2025 ...", "March 16, 2026 ..."
    re.compile(
        r"^(?:January|February|March|April|May|June|July|August|September|"
        r"October|November|December)\s+\d{1,2},?\s+\d{4}",
        re.IGNORECASE,
    ),
    # Dated entries like "April 24, 2024 Spring Internship..." (blog, not a job)
    re.compile(
        r"^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2}"
        r".*(?:20\d{2})\s",
        re.IGNORECASE,
    ),
    # Conference / event listings: "May 18 - May 20, 2026 | Las Vegas"
    re.compile(r"\d{4}\s*\|\s*[A-Z]", re.IGNORECASE),
    # Navigation / boilerplate / section headers
    re.compile(
        r"^(?:Careers|Contact|Get in touch|Overview|Home|Menu|"
        r"Our Team|Our People|Team|About Us|About|What We Do|"
        r"Recent Posts|Transactions|Insights|Open Positions|"
        r"Join Us|Connect with us)\b",
        re.IGNORECASE,
    ),
    # Company names used as titles (ALL CAPS, e.g., "SUPERMEDIA INC.", "LOGICA")
    re.compile(r"^[A-Z][A-Z\s&.,]+$"),
    # Generic marketing taglines
    re.compile(
        r"^(?:BUSINESS ARCHITECTS|Advisory services|Serving Clients|"
        r"Our most valuable|We are humbled|Dedicated to|WE ARE)\b",
        re.IGNORECASE,
    ),
]
 
# Descriptions containing these phrases are almost certainly not job listings.
NON_JOB_DESC_INDICATORS = [
    "tombstone",
    "was acquired by",
    "acquisition financing",
    "was advised on its",
    "deal of the year",
    "featured tombstone",
    "learn more »",
]
JOB_BOARD_HOST_HINTS = [
    "greenhouse",
    "workday",
    "lever",
    "ashby",
    "smartrecruiters",
    "icims",
    "myworkdayjobs",
    "jobvite",
]
JOB_LINK_HINTS = [
    "career",
    "job",
    "opening",
    "opportunit",
    "join-us",
    "join us",
    "position",
    "apply",
]
MAX_JOB_PAGES_PER_FIRM = 4
 
# Common career page path suffixes to try when only website root is known
CAREER_PATHS = [
    "/careers",
    "/careers/students",
    "/careers/internships",
    "/careers/students-graduates",
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
 
 
def get_rendered_html(url: str) -> str | None:
    """
    Render a page with Playwright and return HTML.
    Used as a fallback for JavaScript-heavy pages (especially Workday).
    Returns None when Playwright is unavailable or rendering fails.
    """
    if sync_playwright is None:
        return None
 
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context()
            page = context.new_page()
            page.goto(url, wait_until="networkidle", timeout=30000)
            html = page.content()
            browser.close()
            return html
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
 
 
def _is_false_positive_title(title: str) -> bool:
    """Return True if the title matches a known non-job pattern."""
    return any(pat.search(title) for pat in NON_JOB_TITLE_PATTERNS)
 
 
def _is_false_positive_desc(description: str) -> bool:
    """Return True if the description contains non-job indicators."""
    desc_lower = description.lower()
    return any(ind in desc_lower for ind in NON_JOB_DESC_INDICATORS)
 
 
def _has_intern_keyword(text: str) -> bool:
    """Return True if *text* contains a primary intern keyword."""
    text_lower = text.lower()
    return any(kw in text_lower for kw in INTERN_KEYWORDS)
 
 
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
        if _has_intern_keyword(link_text):
            intern_elements.append(("link", a))
 
    # Find headings with intern keywords
    for heading in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
        heading_text = heading.get_text(" ", strip=True).lower()
        if _has_intern_keyword(heading_text):
            intern_elements.append(("heading", heading))
 
    # Find list items and divs that look like job cards with intern keywords
    for el in soup.find_all(["li", "div", "article", "section"]):
        el_text = el.get_text(" ", strip=True)
        if len(el_text) < 20 or len(el_text) > 2000:
            continue
        if _has_intern_keyword(el_text):
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
 
        # ── False-positive rejection ──
        # Reject titles that look like person bios, tombstones, news, etc.
        if _is_false_positive_title(title):
            continue
 
        # Reject if description contains non-job indicators
        if description and _is_false_positive_desc(description):
            continue
 
        # Verify title or description contains a primary intern keyword.
        # Broad words like "analyst" or "program" alone no longer qualify.
        if not _has_intern_keyword(title):
            if not _has_intern_keyword(description):
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
 
    return jobs
 
 
def collect_candidate_job_pages(html: str, base_url: str) -> list[str]:
    """Collect candidate job-board pages linked from a career page."""
    soup = BeautifulSoup(html, "html.parser")
    candidates = [base_url]
    seen = {base_url}
 
    base_host = (urlparse(base_url).netloc or "").lower()
 
    for anchor in soup.find_all("a", href=True):
        href = (anchor.get("href") or "").strip()
        if not href or href.startswith("#") or href.startswith("javascript:"):
            continue
 
        url = urljoin(base_url, href)
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            continue
 
        netloc = (parsed.netloc or "").lower()
        path_and_query = f"{parsed.path} {parsed.query}".lower()
        link_text = anchor.get_text(" ", strip=True).lower()
        signal_text = f"{link_text} {path_and_query}"
 
        # Skip links that point to clearly non-career sections
        path_lower = (parsed.path or "").lower()
        _non_career = (
            "/news", "/blog", "/press", "/tombstone", "/transaction",
            "/team", "/people", "/about-us", "/contact", "/client",
            "/insight", "/event", "/media", "/investor",
        )
        if any(hint in path_lower for hint in _non_career):
            continue
 
        looks_like_job_page = (
            any(h in netloc for h in JOB_BOARD_HOST_HINTS)
            or any(h in signal_text for h in JOB_LINK_HINTS)
        )
 
        # Only follow links that look career/job-related — don't follow
        # random same-domain links which pull in marketing, news, etc.
        if not looks_like_job_page:
            continue
 
        normalized = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
        if normalized in seen:
            continue
        seen.add(normalized)
        candidates.append(url)
 
        if len(candidates) >= MAX_JOB_PAGES_PER_FIRM:
            break
 
    return candidates
 
 
def merge_jobs(job_lists: list[list[dict]]) -> list[dict]:
    """Merge multiple extracted job lists while de-duplicating entries."""
    merged: list[dict] = []
    seen = set()
 
    for jobs in job_lists:
        for job in jobs:
            title = (job.get("title") or "").strip().lower()
            apply_url = (job.get("applyUrl") or "").strip().lower()
            key = (title, apply_url)
            if not title or key in seen:
                continue
            seen.add(key)
            merged.append(job)
 
    return merged
 
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
 
    pages_to_scan = collect_candidate_job_pages(r.text, resolved_career_url)
    extracted_lists = []
    is_workday = any(
        hint in (urlparse(resolved_career_url).netloc or "").lower()
        for hint in ("workday", "myworkdayjobs", "myworkdaysite")
    )
    for idx, page_url in enumerate(pages_to_scan):
        page_response = r if idx == 0 else get(page_url)
        if page_response is None or page_response.status_code != 200:
            continue
        extracted_lists.append(find_job_listings(page_response.text, page_url))
        if idx > 0:
            time.sleep(0.2)
 
    jobs = merge_jobs(extracted_lists)
 
    # Workday pages are often JS-rendered; fallback to Playwright rendering if needed.
    if is_workday and not jobs:
        rendered_html = get_rendered_html(resolved_career_url)
        if rendered_html:
            jobs = merge_jobs([jobs, find_job_listings(rendered_html, resolved_career_url)])
 
    has_intern = len(jobs) > 0
    return {
        "hasInternPosting": has_intern,
        "careerUrl": resolved_career_url,
        "status": "ok",
        "lastChecked": datetime.now(timezone.utc).isoformat(),
        "jobs": jobs,
    }
 
 
# ── firstSeen tracking ────────────────────────────────────────────────────────
 
def _build_job_key(job: dict) -> str:
    """Create a stable key for a job from its title and apply URL."""
    title = (job.get("title") or "").strip().lower()
    url = (job.get("applyUrl") or "").strip().lower()
    return f"{title}||{url}"
 
 
def _load_previous_status() -> dict:
    """Load the existing intern_status.json to preserve firstSeen dates."""
    try:
        with open("intern_status.json", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}
 
 
def _build_first_seen_index(previous: dict) -> dict[str, str]:
    """
    Build a lookup of job_key -> firstSeen date from previous scraper output.
    Returns a dict mapping job keys to ISO date strings (YYYY-MM-DD).
    """
    index: dict[str, str] = {}
    firms = previous.get("firms", {})
    for firm_data in firms.values():
        for job in firm_data.get("jobs", []):
            key = _build_job_key(job)
            first_seen = job.get("firstSeen")
            if first_seen and key not in index:
                index[key] = first_seen
    return index
 
 
def _stamp_first_seen(jobs: list[dict], first_seen_index: dict[str, str], today: str) -> None:
    """Add firstSeen to each job, preserving the original date if already known."""
    for job in jobs:
        key = _build_job_key(job)
        job["firstSeen"] = first_seen_index.get(key, today)
 
 
# ── Main ──────────────────────────────────────────────────────────────────────
 
def main():
    # Load firm list
    try:
        with open("firms_data.json", encoding="utf-8") as f:
            firms = json.load(f)
    except FileNotFoundError:
        print("ERROR: firms_data.json not found.", file=sys.stderr)
        sys.exit(1)
 
    # Load previous results to preserve firstSeen dates across runs
    previous = _load_previous_status()
    first_seen_index = _build_first_seen_index(previous)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
 
    total   = len(firms)
    results = {}
    found   = 0
 
    print(f"Checking {total} firms for intern postings…\n", flush=True)
 
    for i, firm in enumerate(firms, 1):
        name = firm["name"]
        print(f"[{i}/{total}] {name}", flush=True)
 
        result = check_firm(firm)
 
        # Stamp firstSeen on every job (preserves date for returning jobs)
        _stamp_first_seen(result.get("jobs", []), first_seen_index, today)
 
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