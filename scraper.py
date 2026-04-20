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
import os
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

try:
    # Optional dependency used only when ENABLE_AI_SCAN=1.
    import anthropic
except Exception:  # pragma: no cover - optional runtime dependency
    anthropic = None

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
def extract_json_ld_jobs(html: str, career_url: str) -> list[dict]:
    """
    Extract jobs from schema.org JSON-LD blocks.
    This is typically higher precision than DOM heuristics when available.
    """
    soup = BeautifulSoup(html, "html.parser")
    jobs: list[dict] = []
    seen = set()
 
    scripts = soup.find_all("script", type="application/ld+json")
    for script in scripts:
        raw = script.string or script.get_text(strip=True)
        if not raw:
            continue
        try:
            payload = json.loads(raw)
        except Exception:
            continue
 
        # JSON-LD can be a dict, list, or wrapped in @graph.
        stack = [payload]
        while stack:
            node = stack.pop()
            if isinstance(node, list):
                stack.extend(node)
                continue
            if not isinstance(node, dict):
                continue
 
            if "@graph" in node and isinstance(node["@graph"], list):
                stack.extend(node["@graph"])
 
            node_type = str(node.get("@type", "")).lower()
            if "jobposting" not in node_type:
                continue
 
            title = (node.get("title") or node.get("name") or "").strip()
            description = (node.get("description") or "").strip()
            apply_url = (
                node.get("url")
                or node.get("hiringOrganization", {}).get("sameAs")
                or career_url
            )
            if apply_url:
                apply_url = urljoin(career_url, str(apply_url))
 
            if not title:
                continue
            if _is_false_positive_title(title):
                continue
 
            combined = f"{title} {description}"
            if not _has_intern_keyword(combined):
                continue
 
            key = (title.lower(), str(apply_url).lower())
            if key in seen:
                continue
            seen.add(key)
 
            grad_dates = extract_graduation_dates(combined)
            jobs.append({
                "title": title[:200],
                "description": re.sub(r"\s+", " ", description)[:500],
                "graduationDate": grad_dates[0] if grad_dates else None,
                "applyUrl": apply_url or career_url,
            })
 
    return jobs 
 
def find_job_listings(html: str, career_url: str) -> list[dict]:
    """
    Extract structured intern job listings from career page HTML.
    Uses heuristics to find job containers and extract details.
    """
    soup = BeautifulSoup(html, "html.parser")
    jobs = []
    seen_titles = set()
 
 
    # Strategy 0: Prefer structured metadata when available.
    # This reduces false positives significantly on modern ATS pages.
    for job in extract_json_ld_jobs(html, career_url):
        title_key = (job.get("title") or "").strip().lower()
        if title_key and title_key not in seen_titles:
            seen_titles.add(title_key)
            jobs.append(job)
 
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
 
 
# ── ATS API Integration ─────────────────────────────────────────────────────
# Direct API calls to major Applicant Tracking Systems return clean JSON with
# job titles, descriptions, locations, and apply links — no HTML parsing needed,
# no false-positive filtering, and no breakage on career-site redesigns.
 
_WORKDAY_LANG_CODES = {
    "en", "fr", "de", "es", "it", "pt", "nl", "ja", "zh", "ko", "ru", "ar",
}
 
 
def _extract_greenhouse_slug(url: str) -> str | None:
    """Extract board slug from a Greenhouse career page URL."""
    parsed = urlparse(url)
    host = (parsed.netloc or "").lower()
    if "greenhouse.io" not in host:
        return None
    parts = [p for p in parsed.path.strip("/").split("/") if p]
    return parts[0] if parts else None
 
 
def _extract_lever_slug(url: str) -> str | None:
    """Extract company slug from a Lever career page URL."""
    parsed = urlparse(url)
    host = (parsed.netloc or "").lower()
    if "lever.co" not in host:
        return None
    parts = [p for p in parsed.path.strip("/").split("/") if p]
    return parts[0] if parts else None
 
 
def _extract_ashby_slug(url: str) -> str | None:
    """Extract company slug from an Ashby career page URL."""
    parsed = urlparse(url)
    host = (parsed.netloc or "").lower()
    if "ashbyhq.com" not in host:
        return None
    parts = [p for p in parsed.path.strip("/").split("/") if p]
    return parts[0] if parts else None
 
 
def _extract_smartrecruiters_slug(url: str) -> str | None:
    """Extract company slug from a SmartRecruiters career page URL."""
    parsed = urlparse(url)
    host = (parsed.netloc or "").lower()
    if "smartrecruiters.com" not in host:
        return None
    parts = [p for p in parsed.path.strip("/").split("/") if p]
    return parts[0] if parts else None
 
 
def _extract_workday_info(url: str) -> dict | None:
    """Extract API parameters from a Workday career URL.
 
    Handles the common pattern: {tenant}.wd{n}.myworkdayjobs.com/{lang?}/{board}
    Returns {"host": ..., "tenant": ..., "board": ...} or None.
    """
    parsed = urlparse(url)
    host = (parsed.netloc or "").lower()
    if "myworkdayjobs" not in host:
        return None
    # Tenant is the first subdomain component
    tenant = host.split(".")[0] if "." in host else None
    if not tenant or tenant in ("www",):
        return None
    # Board is the first significant path segment (skip language codes)
    parts = [p for p in parsed.path.strip("/").split("/") if p]
    board = None
    for p in parts:
        if p.lower() in _WORKDAY_LANG_CODES or p.lower() in ("job", "jobs"):
            continue
        board = p
        break
    if not board:
        return None
    return {"host": parsed.netloc, "tenant": tenant, "board": board}
 
 
def _ats_job(title: str, description: str, apply_url: str) -> dict | None:
    """Build a normalised job dict if it passes intern-keyword and false-positive checks."""
    title = title.strip()
    if not title:
        return None
    if _is_false_positive_title(title):
        return None
    combined = f"{title} {description}"
    if not _has_intern_keyword(combined):
        return None
    if description and _is_false_positive_desc(description):
        return None
    grad_dates = extract_graduation_dates(combined)
    return {
        "title": title[:200],
        "description": re.sub(r"\s+", " ", description).strip()[:500],
        "graduationDate": grad_dates[0] if grad_dates else None,
        "applyUrl": apply_url,
    }
 
 
def fetch_greenhouse_jobs(slug: str) -> list[dict] | None:
    """Fetch intern jobs from the Greenhouse boards API."""
    api_url = f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true"
    try:
        r = requests.get(api_url, headers=HEADERS, timeout=TIMEOUT)
        if r.status_code != 200:
            return None
        data = r.json()
    except Exception:
        return None
 
    jobs = []
    for posting in data.get("jobs", []):
        title = posting.get("title", "")
        raw_desc = posting.get("content", "") or ""
        desc_text = BeautifulSoup(raw_desc, "html.parser").get_text(" ", strip=True)
        apply_url = posting.get("absolute_url", "")
 
        job = _ats_job(title, desc_text, apply_url)
        if job:
            jobs.append(job)
    return jobs
 
 
def fetch_lever_jobs(slug: str) -> list[dict] | None:
    """Fetch intern jobs from the Lever postings API."""
    api_url = f"https://api.lever.co/v0/postings/{slug}"
    try:
        r = requests.get(api_url, headers=HEADERS, timeout=TIMEOUT)
        if r.status_code != 200:
            return None
        data = r.json()
    except Exception:
        return None
 
    jobs = []
    postings = data if isinstance(data, list) else []
    for posting in postings:
        title = posting.get("text", "")
        desc_plain = posting.get("descriptionPlain", "") or ""
        desc_body = posting.get("description", "") or ""
        description = desc_plain or BeautifulSoup(desc_body, "html.parser").get_text(" ", strip=True)
        apply_url = posting.get("hostedUrl", "") or posting.get("applyUrl", "")
 
        job = _ats_job(title, description, apply_url)
        if job:
            jobs.append(job)
    return jobs
 
 
def fetch_ashby_jobs(slug: str) -> list[dict] | None:
    """Fetch intern jobs from the Ashby posting API."""
    api_url = f"https://api.ashbyhq.com/posting-api/job-board/{slug}"
    try:
        r = requests.get(api_url, headers=HEADERS, timeout=TIMEOUT)
        if r.status_code != 200:
            return None
        data = r.json()
    except Exception:
        return None
 
    jobs = []
    for posting in data.get("jobs", []):
        title = posting.get("title", "")
        desc_html = posting.get("descriptionHtml", "") or posting.get("description", "") or ""
        description = BeautifulSoup(desc_html, "html.parser").get_text(" ", strip=True) if "<" in desc_html else desc_html
 
        job_id = posting.get("id", "")
        apply_url = (
            posting.get("applicationUrl")
            or posting.get("jobUrl")
            or (f"https://jobs.ashbyhq.com/{slug}/{job_id}" if job_id else "")
        )
 
        job = _ats_job(title, description, apply_url)
        if job:
            jobs.append(job)
    return jobs
 
 
def fetch_smartrecruiters_jobs(slug: str) -> list[dict] | None:
    """Fetch intern jobs from the SmartRecruiters API."""
    api_url = f"https://api.smartrecruiters.com/v1/companies/{slug}/postings?limit=100"
    try:
        r = requests.get(api_url, headers=HEADERS, timeout=TIMEOUT)
        if r.status_code != 200:
            return None
        data = r.json()
    except Exception:
        return None
 
    jobs = []
    for posting in data.get("content", []):
        title = posting.get("name", "")
 
        desc_parts = []
        dept = posting.get("department")
        if isinstance(dept, dict) and dept.get("label"):
            desc_parts.append(dept["label"])
        loc = posting.get("location")
        if isinstance(loc, dict) and loc.get("city"):
            loc_str = ", ".join(filter(None, [loc.get("city"), loc.get("region"), loc.get("country")]))
            desc_parts.append(loc_str)
        description = " | ".join(desc_parts)
 
        posting_id = posting.get("id", "") or posting.get("ref", "")
        apply_url = f"https://jobs.smartrecruiters.com/{slug}/{posting_id}"
 
        job = _ats_job(title, description, apply_url)
        if job:
            jobs.append(job)
    return jobs
 
 
def fetch_workday_jobs(host: str, tenant: str, board: str) -> list[dict] | None:
    """Fetch intern jobs from the Workday API with targeted keyword searches."""
    base_api = f"https://{host}/wday/cxs/{tenant}/{board}/jobs"
    search_terms = ["intern", "summer analyst", "summer associate"]
 
    all_postings: list[dict] = []
    seen_paths: set[str] = set()
    any_success = False
 
    for term in search_terms:
        body = {"limit": 20, "offset": 0, "appliedFacets": {}, "searchText": term}
        try:
            r = requests.post(
                base_api,
                json=body,
                headers={**HEADERS, "Content-Type": "application/json"},
                timeout=TIMEOUT,
            )
            if r.status_code != 200:
                continue
            data = r.json()
            any_success = True
        except Exception:
            continue
 
        for posting in data.get("jobPostings", []):
            path = posting.get("externalPath", "")
            if path in seen_paths:
                continue
            seen_paths.add(path)
            all_postings.append(posting)
 
    if not any_success:
        return None
 
    jobs = []
    for posting in all_postings:
        title = posting.get("title", "")
        desc_parts = []
        if posting.get("locationsText"):
            desc_parts.append(posting["locationsText"])
        if posting.get("postedOn"):
            desc_parts.append(f"Posted: {posting['postedOn']}")
        for field in posting.get("bulletFields", []):
            desc_parts.append(str(field))
        description = " | ".join(desc_parts)
 
        path = posting.get("externalPath", "")
        apply_url = f"https://{host}{path}" if path else ""
 
        job = _ats_job(title, description, apply_url)
        if job:
            jobs.append(job)
    return jobs
 
 
def fetch_ats_jobs(url: str) -> list[dict] | None:
    """Detect ATS platform from *url* and fetch jobs via its structured API.
 
    Returns:
        list[dict] — intern jobs found (may be empty if the board has none)
        None       — URL is not a recognised ATS or the API call failed
    """
    slug = _extract_greenhouse_slug(url)
    if slug:
        return fetch_greenhouse_jobs(slug)
 
    slug = _extract_lever_slug(url)
    if slug:
        return fetch_lever_jobs(slug)
 
    slug = _extract_ashby_slug(url)
    if slug:
        return fetch_ashby_jobs(slug)
 
    slug = _extract_smartrecruiters_slug(url)
    if slug:
        return fetch_smartrecruiters_jobs(slug)
 
    info = _extract_workday_info(url)
    if info:
        return fetch_workday_jobs(info["host"], info["tenant"], info["board"])
 
    return None
 
 
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

# ── AI page scanning ────────────────────────────────────────────────────────

 
AI_MODEL = "claude-haiku-4-5"
AI_SCAN_ENABLED = os.environ.get("ENABLE_AI_SCAN", "").lower() in ("1", "true", "yes")
AI_MAX_CHARS = 40_000
 
AI_SYSTEM_PROMPT = """You extract internship job listings from career-page text for companies across industries — finance firms (investment banking, private equity, venture capital, hedge funds) as well as software, tech, and other employers.
 
Return ONLY listings that are genuine open internship positions for students. Qualifying roles include: internships, summer analyst / summer associate programs, software engineering internships, co-op roles, externships, and named student programs that explicitly hire interns.

DO NOT return:
- Full-time or experienced-hire roles (Analyst, Associate, VP, Director, etc. without "intern" / "summer" context).
- Employee bios or team-member profiles ("John Smith, Summer Analyst 2019").
- News, deal tombstones, press releases, blog posts, or event listings.
- Navigation links, section headers, or generic marketing copy.
- Past/closed programs explicitly described as closed or historical.
 
For each genuine listing, extract:
- title: the role title as shown (e.g. "2027 Summer Analyst Program").
- description: a short 1-2 sentence summary from surrounding text (location, program details, eligibility). Keep under 500 chars.
- graduationDate: expected graduation year/term if stated (e.g. "2027", "May 2027", "Class of 2026"). Null if not mentioned.
- applyUrl: the apply URL if present in the page. If only a relative path is present, include it as-is — the caller resolves it. If no link exists, use an empty string.
 
If there are no qualifying listings, return {"jobs": []}. Never invent listings."""
 
AI_SCHEMA = {
    "type": "object",
    "properties": {
        "jobs": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "graduationDate": {"type": ["string", "null"]},
                    "applyUrl": {"type": "string"},
                },
                "required": ["title", "description", "graduationDate", "applyUrl"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["jobs"],
    "additionalProperties": False,
}
 
_ai_client = None
 
 
def _get_ai_client():
    """Lazily construct the Anthropic client; return None if unavailable."""
    global _ai_client
    if _ai_client is not None:
        return _ai_client
    if anthropic is None:
        return None
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return None
    try:
        _ai_client = anthropic.Anthropic()
    except Exception:
        return None
    return _ai_client
 
 
def scan_page_with_ai(html: str, career_url: str) -> list[dict]:
    """Ask Claude to extract intern listings from a career page.
 
    Returns [] when AI scanning is disabled, the SDK is missing, or any call fails.
    Intended as a last-resort fallback after ATS APIs and HTML heuristics.
    """
    if not AI_SCAN_ENABLED:
        return []
    client = _get_ai_client()
    if client is None:
        return []
 
    soup = BeautifulSoup(html, "html.parser")
    text = visible_text(soup)
    if len(text) < 50:
        return []
    if len(text) > AI_MAX_CHARS:
        text = text[:AI_MAX_CHARS]
 
    user_content = f"Career page URL: {career_url}\n\nVisible page text:\n{text}"
 
    try:
        response = client.messages.create(
            model=AI_MODEL,
            max_tokens=4000,
            system=[{
                "type": "text",
                "text": AI_SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }],
            output_config={"format": {"type": "json_schema", "schema": AI_SCHEMA}},
            messages=[{"role": "user", "content": user_content}],
        )
    except Exception as exc:
        print(f"  → AI scan failed: {exc}", flush=True)
        return []
 
    try:
        text_block = next(b.text for b in response.content if b.type == "text")
        data = json.loads(text_block)
    except Exception:
        return []
 
    jobs: list[dict] = []
    for raw in data.get("jobs", []):
        title = (raw.get("title") or "").strip()
        if not title:
            continue
        if _is_false_positive_title(title):
            continue
        description = re.sub(r"\s+", " ", (raw.get("description") or "").strip())
        combined = f"{title} {description}"
        if not _has_intern_keyword(combined):
            continue
        if description and _is_false_positive_desc(description):
            continue
        apply_url_raw = (raw.get("applyUrl") or "").strip()
        apply_url = urljoin(career_url, apply_url_raw) if apply_url_raw else career_url
        grad = raw.get("graduationDate")
        if not grad:
            found = extract_graduation_dates(combined)
            grad = found[0] if found else None
        jobs.append({
            "title": title[:200],
            "description": description[:500],
            "graduationDate": grad,
            "applyUrl": apply_url,
            "source": "ai",
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
 
    # ── Try ATS API directly on the career URL before scraping HTML ─────
    ats_jobs = fetch_ats_jobs(resolved_career_url)
    if ats_jobs is not None:
        print(f"  → ATS API hit for {resolved_career_url} ({len(ats_jobs)} intern listing(s))", flush=True)
        
        jobs = ats_jobs
        if AI_SCAN_ENABLED:
            ats_page = get(resolved_career_url)
            if ats_page is not None and ats_page.status_code == 200:
                ai_jobs = scan_page_with_ai(ats_page.text, resolved_career_url)
                if ai_jobs:
                    print(f"  → AI scan found {len(ai_jobs)} intern listing(s)", flush=True)
                    jobs = merge_jobs([jobs, ai_jobs])
        return {
            "hasInternPosting": len(jobs) > 0,
            "careerUrl": resolved_career_url,
            "status": "ok",
            "lastChecked": datetime.now(timezone.utc).isoformat(),
            "jobs": jobs,
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
        # Try ATS API on candidate page URLs (e.g. company site linking to Greenhouse)
        page_ats_jobs = fetch_ats_jobs(page_url)
        if page_ats_jobs is not None:
            extracted_lists.append(page_ats_jobs)
            continue
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
    # Always run Claude alongside deterministic extraction when enabled
    if AI_SCAN_ENABLED:
        ai_jobs = scan_page_with_ai(r.text, resolved_career_url)
        if ai_jobs:
            print(f"  → AI scan found {len(ai_jobs)} intern listing(s)", flush=True)
            jobs = merge_jobs([jobs, ai_jobs])
 
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
 
 
def _load_previous_status(output_file: str = "intern_status.json") -> dict:
    """Load the existing status JSON to preserve firstSeen dates."""
    try:
        with open(output_file, encoding="utf-8") as f:
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
    """Add firstSeen while preserving original dates and normalizing source."""
    for job in jobs:
        key = _build_job_key(job)
        job["firstSeen"] = first_seen_index.get(key, today)
        if not job.get("source"):
            job["source"] = "scraper"
 
 
# ── Main ──────────────────────────────────────────────────────────────────────
 
def main():
    # Accept optional command-line arguments for input/output files.
    # Usage:  python scraper.py [firms_file] [output_file]
    #   Default: firms_data.json -> intern_status.json
    #   PE:      python scraper.py pe_firms_data.json pe_intern_status.json
    firms_file  = sys.argv[1] if len(sys.argv) > 1 else "firms_data.json"
    output_file = sys.argv[2] if len(sys.argv) > 2 else "intern_status.json"
 
    # Load firm list
    try:
        with open(firms_file, encoding="utf-8") as f:
            firms = json.load(f)
    except FileNotFoundError:
        print(f"ERROR: {firms_file} not found.", file=sys.stderr)
        sys.exit(1)
 
    # Load previous results to preserve firstSeen dates across runs
    previous = _load_previous_status(output_file)
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
 
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
 
    print(f"\nDone. {found}/{total} firms have intern postings.")
    print(f"Results written to {output_file}")
 
 
if __name__ == "__main__":
    main()
