import requests
import re
import json
import os
import sys
from datetime import datetime, timezone, timedelta

# Make console output UTF-8 safe (Windows terminals default to cp1252 and choke
# on the emoji / non-latin characters below).
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

print("="*75)
print(" 🏏 CRICHD: MATCH TITLE + CHANNELS + STREAM URL -> JSON EXPORTER 🏏")
print("="*75)

BASE_URL = "https://crichd.mobile"
OUTPUT_JSON = os.path.join(os.path.dirname(os.path.abspath(__file__)), "matches.json")

# Only keep matches that look live/upcoming. crichd's homepage already lists
# just the current fixtures, so this stays off by default (keep everything).
ONLY_UPCOMING = False

s = requests.Session()
s.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
})


def clean_text(html):
    return re.sub(r'<[^>]+>', '', html).replace('&nbsp;', ' ').strip()


def to_absolute(url):
    if not url:
        return url
    if url.startswith('http'):
        return url
    if url.startswith('//'):
        return 'https:' + url
    return BASE_URL + ('' if url.startswith('/') else '/') + url


def extract_streams(match_html):
    """
    Parse the channel table on a crichd match page. Each row is one broadcaster
    ("Willow Cricket", "Sony Sports Ten 5", ...) with its language and a "Watch"
    link/button pointing at the player page.

    Just like footy.py did with the footystream watch pages, the link in the
    row IS the embed/player URL (crichdsee.st/player.php?id=... — the same role
    playeraio.top/embed2.php?id=... had on footystream), so we take it directly
    with no extra request.
    """
    streams = []

    # Each broadcaster is one <tr height="35px"> in the channel table.
    rows = re.findall(r'<tr[^>]*height=["\']?35px["\']?[^>]*>([\s\S]*?)</tr>', match_html, re.IGNORECASE)

    for row in rows:
        cells = [clean_text(td) for td in re.findall(r'<td[^>]*>([\s\S]*?)</td>', row, re.IGNORECASE)]
        channel  = cells[0] if len(cells) > 0 else None
        language = cells[1] if len(cells) > 1 else None

        # The watch link is either a normal anchor or a window.open() button.
        href = re.search(r'<a[^>]*href=["\']([^"\']+)["\']', row, re.IGNORECASE)
        winopen = re.search(r"window\.open\(['\"]([^'\"]+)['\"]", row, re.IGNORECASE)
        embed_url = None
        if href:
            embed_url = to_absolute(href.group(1))
        elif winopen:
            embed_url = to_absolute(winopen.group(1))
        if not embed_url:
            continue

        streams.append({
            "channel": channel,
            "language": language,
            "watch_url": embed_url,
            "embed_url": embed_url,
        })

    return streams


def get_matches():
    print("\n[+] Fetching homepage...")
    home_html = s.get(BASE_URL + "/", timeout=20).text

    now_utc = datetime.now(timezone.utc)
    results = []

    # Each fixture is a <tr> whose title cell holds <a href=..><h2 class="gametitle">.
    rows = re.findall(r'<tr[^>]*>([\s\S]*?)</tr>', home_html, re.IGNORECASE)

    for row in rows:
        title_match = re.search(
            r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>\s*<h2[^>]*class=["\'][^"\']*gametitle[^"\']*["\'][^>]*>([^<]+)</h2>',
            row, re.IGNORECASE
        )
        if not title_match:
            continue

        match_url = to_absolute(title_match.group(1))
        match_title = clean_text(title_match.group(2))

        # Date + time (site defaults to GMT+00:00).
        d = re.search(r'class=["\']post-day["\'][^>]*>\s*([0-9\-]+)', row)
        tm = re.search(r'class=["\']dt["\'][^>]*>([^<]+)</span>', row)
        date_str = d.group(1) if d else None
        time_str = clean_text(tm.group(1)) if tm else None

        # Short league label + the small schedule icon (no per-team logos here).
        league = re.search(r'href=["\'][^"\']*schedule/[^"\']*["\'][^>]*rel=["\']tag["\'][^>]*>([^<]+)</a>', row, re.IGNORECASE)
        league_name = clean_text(league.group(1)) if league else None
        icon = re.search(r'<img[^>]*src=["\']([^"\']+)["\']', row, re.IGNORECASE)
        icon_url = to_absolute(icon.group(1)) if icon else None

        # Optional: only keep live/upcoming matches (see ONLY_UPCOMING above).
        if ONLY_UPCOMING and date_str and time_str:
            try:
                start = datetime.strptime(f"{date_str} {time_str}", "%d-%m-%Y %H:%M").replace(tzinfo=timezone.utc)
                if not (start - timedelta(hours=24) <= now_utc <= start + timedelta(hours=8)):
                    continue
            except Exception:
                pass  # if the date can't be parsed, keep the event anyway

        # Teams are derived from the title (crichd has no separate team logos).
        parts = re.split(r'\s+vs\.?\s+', match_title, flags=re.IGNORECASE)
        team1 = parts[0].strip() if len(parts) > 0 else match_title
        team2 = parts[1].strip() if len(parts) > 1 else None

        print(f"\n🎯 Found: {match_title}")
        print(f"    Match page: {match_url}")

        streams = []
        try:
            match_html = s.get(match_url, timeout=15).text
            streams = extract_streams(match_html)
        except Exception as e:
            print(f"    [!] Could not fetch match page: {e}")

        if streams:
            print(f"    [+] Found {len(streams)} channel/stream link(s):")
            for st in streams:
                print(f"        - {st['channel']}: {st['embed_url'] or st['watch_url']}")
        else:
            print("    [!] No stream links found for this match")

        # Keep stream_url for backward compatibility: first embed URL, else the
        # first player URL (player pages are the watchable links on crichd).
        first_stream = None
        if streams:
            first_stream = streams[0]["embed_url"] or streams[0]["watch_url"]

        results.append({
            "title": match_title,
            "teams": {
                "team1": {"name": team1, "logo": None},
                "team2": {"name": team2, "logo": None},
            },
            "league": league_name,
            "icon": icon_url,
            "date": date_str,
            "time": time_str,
            "event_url": match_url,
            "stream_url": first_stream,
            "streams": streams,
        })

    return results


def main():
    try:
        matches = get_matches()

        with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
            json.dump(matches, f, indent=2, ensure_ascii=False)

        print(f"\n[✓] Saved {len(matches)} match(es) to {OUTPUT_JSON}")
        print(json.dumps(matches, indent=2, ensure_ascii=False))

    except Exception as e:
        print(f"\n[!] Critical Error: {e}")


if __name__ == "__main__":
    main()
