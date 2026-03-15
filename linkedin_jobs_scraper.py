#!/usr/bin/env python3
"""
LinkedIn Jobs Scraper — public guest API, stdlib only.

Usage:
    python linkedin_jobs_scraper.py                      # run default searches
    python linkedin_jobs_scraper.py "data engineer"      # single custom search
    python linkedin_jobs_scraper.py "data engineer" "ML engineer"  # multiple
"""

import csv
import re
import sys
import time
import random
import urllib.request
import urllib.parse
import urllib.error
from html.parser import HTMLParser
from datetime import datetime

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DEFAULT_SEARCHES = [
    "performance marketing",
    "media buyer",
    "creative strategist",
    "paid social manager",
    "growth marketer",
]

# Remote (f_WT=2) in United States (geoId=103644278)
BASE_PARAMS = {"f_WT": "2", "geoId": "103644278"}
JOBS_PER_PAGE = 25
MAX_PAGES = 10  # up to 250 jobs per keyword
DELAY_MIN = 2.0
DELAY_MAX = 3.5

GUEST_API = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
JOB_DETAIL_API = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{job_id}"

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
]

HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "identity",
    "Connection": "keep-alive",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _sleep():
    time.sleep(random.uniform(DELAY_MIN, DELAY_MAX))


def fetch(url, retries=3):
    """GET *url* with browser-like headers. Returns decoded body or None."""
    headers = {**HEADERS, "User-Agent": random.choice(USER_AGENTS)}
    req = urllib.request.Request(url, headers=headers)
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
                encoding = resp.headers.get_content_charset() or "utf-8"
                return data.decode(encoding, errors="replace")
        except urllib.error.HTTPError as exc:
            print(f"  HTTP {exc.code} on attempt {attempt}/{retries}: {url}")
            if exc.code == 429:
                wait = 5 * attempt
                print(f"  Rate-limited — waiting {wait}s …")
                time.sleep(wait)
            elif exc.code >= 500:
                time.sleep(2 * attempt)
            else:
                return None
        except (urllib.error.URLError, OSError) as exc:
            print(f"  Network error on attempt {attempt}/{retries}: {exc}")
            time.sleep(2 * attempt)
    return None


# ---------------------------------------------------------------------------
# URL conversion: human search URL → guest API URL
# ---------------------------------------------------------------------------


def search_url_to_api(search_url):
    """Convert a LinkedIn /jobs/search/ URL to the guest API equivalent.

    >>> search_url_to_api("https://www.linkedin.com/jobs/search/?f_WT=2&geoId=103644278&keywords=performance%20marketing")
    'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=performance+marketing&f_WT=2&geoId=103644278&start=0'
    """
    parsed = urllib.parse.urlparse(search_url)
    params = urllib.parse.parse_qs(parsed.query)
    flat = {k: v[0] for k, v in params.items()}
    flat.setdefault("start", "0")
    # Put keywords first for readability
    ordered = {}
    if "keywords" in flat:
        ordered["keywords"] = flat.pop("keywords")
    ordered.update(flat)
    return GUEST_API + "?" + urllib.parse.urlencode(ordered, quote_via=urllib.parse.quote_plus)


def build_api_url(keywords, start=0):
    """Build a guest API URL from a keyword string + base filters."""
    params = {"keywords": keywords, **BASE_PARAMS, "start": str(start)}
    return GUEST_API + "?" + urllib.parse.urlencode(params, quote_via=urllib.parse.quote_plus)


# ---------------------------------------------------------------------------
# HTML parsing — job listing cards
# ---------------------------------------------------------------------------


class JobCardParser(HTMLParser):
    """Extract job cards from the guest search API HTML fragment."""

    def __init__(self):
        super().__init__()
        self.jobs = []
        self._current = {}
        self._capture = None  # which field we're capturing text for
        self._depth = 0

    # -- helpers --
    def _attr(self, attrs, name):
        for k, v in attrs:
            if k == name:
                return v.strip() if v else ""
        return ""

    def _classes(self, attrs):
        return self._attr(attrs, "class").split()

    def handle_starttag(self, tag, attrs):
        classes = self._classes(attrs)

        # Each card lives inside a <li> — we detect the job-id on the
        # surrounding <div data-entity-urn="urn:li:jobPosting:XXXX">
        if tag == "div" and "base-card" in " ".join(classes):
            urn = self._attr(attrs, "data-entity-urn")
            job_id = urn.rsplit(":", 1)[-1] if urn else ""
            self._current = {
                "job_id": job_id,
                "title": "",
                "company": "",
                "location": "",
                "url": "",
                "date_posted": "",
            }

        # Job URL + title
        if tag == "a" and "base-card__full-link" in " ".join(classes):
            href = self._attr(attrs, "href").split("?")[0]
            if self._current is not None:
                self._current["url"] = href
                # Extract job_id from URL if we didn't get it from urn
                if not self._current.get("job_id"):
                    m = re.search(r"/view/(\d+)", href)
                    if m:
                        self._current["job_id"] = m.group(1)

        # Title text
        if tag == "span" and "sr-only" in classes:
            # The sr-only span inside the full-link holds the title
            if self._current and not self._current.get("title"):
                self._capture = "title"

        # Company name
        if tag == "h4" and "base-search-card__subtitle" in " ".join(classes):
            self._capture = "company"

        # Also capture from <a> with data-tracking-control-name containing company
        if tag == "a" and "hidden-nested-link" in " ".join(classes):
            # company link inside h4
            if self._current and not self._current.get("company"):
                self._capture = "company"

        # Location
        if tag == "span" and "job-search-card__location" in " ".join(classes):
            self._capture = "location"

        # Date posted
        if tag == "time" and "job-search-card__listdate" in " ".join(classes):
            dt = self._attr(attrs, "datetime")
            if self._current:
                self._current["date_posted"] = dt

        # Also check for listdate--new variant
        if tag == "time" and "job-search-card__listdate--new" in " ".join(classes):
            dt = self._attr(attrs, "datetime")
            if self._current:
                self._current["date_posted"] = dt

    def handle_data(self, data):
        if self._capture and self._current:
            text = data.strip()
            if text:
                self._current[self._capture] = text
                self._capture = None

    def handle_endtag(self, tag):
        if tag == "div" and self._current and self._current.get("job_id"):
            # Don't append yet — the card ends with </li>
            pass
        if tag == "li" and self._current and self._current.get("job_id"):
            self.jobs.append(self._current)
            self._current = {}


def parse_job_cards(html):
    parser = JobCardParser()
    parser.feed(html)
    return parser.jobs


# ---------------------------------------------------------------------------
# HTML parsing — individual job description
# ---------------------------------------------------------------------------


class JobDescriptionParser(HTMLParser):
    """Extract the job description text from a job detail page."""

    def __init__(self):
        super().__init__()
        self.description_parts = []
        self._inside = False
        self._depth = 0

    def _classes(self, attrs):
        for k, v in attrs:
            if k == "class":
                return (v or "").split()
        return []

    def handle_starttag(self, tag, attrs):
        classes = self._classes(attrs)
        if "description__text" in " ".join(classes) or "show-more-less-html__markup" in " ".join(classes):
            self._inside = True
            self._depth = 0
        if self._inside:
            self._depth += 1
            if tag == "br":
                self.description_parts.append("\n")
            elif tag in ("p", "li"):
                self.description_parts.append("\n")

    def handle_endtag(self, tag):
        if self._inside:
            self._depth -= 1
            if self._depth <= 0:
                self._inside = False
            if tag in ("p", "div", "ul", "ol"):
                self.description_parts.append("\n")

    def handle_data(self, data):
        if self._inside:
            self.description_parts.append(data)


def parse_job_description(html):
    parser = JobDescriptionParser()
    parser.feed(html)
    raw = "".join(parser.description_parts)
    # Collapse whitespace within lines, keep paragraph breaks
    lines = [" ".join(line.split()) for line in raw.splitlines()]
    return "\n".join(line for line in lines if line).strip()


# ---------------------------------------------------------------------------
# Main scraping logic
# ---------------------------------------------------------------------------


def scrape_search(keywords, seen_ids):
    """Scrape all pages for one keyword search. Returns list of job dicts."""
    print(f'\n{"="*60}')
    print(f'Searching: "{keywords}"')
    print(f'{"="*60}')

    jobs = []
    for page in range(MAX_PAGES):
        start = page * JOBS_PER_PAGE
        url = build_api_url(keywords, start)
        print(f"  Page {page + 1} (start={start}) …")
        html = fetch(url)
        if not html or not html.strip():
            print("  Empty response — no more results.")
            break

        cards = parse_job_cards(html)
        if not cards:
            print("  No cards found — end of results.")
            break

        new = 0
        for card in cards:
            jid = card["job_id"]
            if jid and jid not in seen_ids:
                seen_ids.add(jid)
                card["search_keyword"] = keywords
                jobs.append(card)
                new += 1
        print(f"  Found {len(cards)} cards, {new} new.")

        if len(cards) < JOBS_PER_PAGE:
            print("  Fewer than 25 results — last page.")
            break
        _sleep()

    return jobs


def fetch_descriptions(jobs):
    """Fetch full descriptions for each job (in-place)."""
    total = len(jobs)
    print(f"\nFetching descriptions for {total} jobs …")
    for i, job in enumerate(jobs, 1):
        jid = job["job_id"]
        if not jid:
            job["description"] = ""
            continue
        url = JOB_DETAIL_API.format(job_id=jid)
        print(f"  [{i}/{total}] Job {jid} …", end=" ")
        html = fetch(url)
        if html:
            desc = parse_job_description(html)
            job["description"] = desc
            print(f"{len(desc)} chars")
        else:
            job["description"] = ""
            print("failed")
        _sleep()


def save_csv(jobs, filename):
    fieldnames = [
        "job_id",
        "title",
        "company",
        "location",
        "date_posted",
        "url",
        "search_keyword",
        "description",
    ]
    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(jobs)
    print(f"\nSaved {len(jobs)} jobs → {filename}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main():
    keywords_list = sys.argv[1:] if len(sys.argv) > 1 else DEFAULT_SEARCHES

    print("LinkedIn Jobs Scraper (public guest API)")
    print(f"Searches: {keywords_list}")
    print(f"Filters:  Remote (f_WT=2), United States (geoId=103644278)")

    # Show what a human URL converts to
    example = "https://www.linkedin.com/jobs/search/?f_WT=2&geoId=103644278&keywords=performance%20marketing"
    print(f"\nExample conversion:")
    print(f"  Human URL: {example}")
    print(f"  API URL:   {search_url_to_api(example)}")

    all_jobs = []
    seen_ids = set()

    for kw in keywords_list:
        jobs = scrape_search(kw, seen_ids)
        all_jobs.extend(jobs)
        if kw != keywords_list[-1]:
            _sleep()

    if not all_jobs:
        print("\nNo jobs found.")
        return

    print(f"\nTotal unique jobs: {len(all_jobs)}")

    fetch_descriptions(all_jobs)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"linkedin_jobs_{timestamp}.csv"
    save_csv(all_jobs, filename)

    # Summary
    print("\n--- Summary ---")
    by_kw = {}
    for j in all_jobs:
        kw = j.get("search_keyword", "unknown")
        by_kw[kw] = by_kw.get(kw, 0) + 1
    for kw, count in by_kw.items():
        print(f'  "{kw}": {count} jobs')
    print(f"  Total: {len(all_jobs)} unique jobs")


if __name__ == "__main__":
    main()
