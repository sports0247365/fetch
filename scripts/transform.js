const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ============ CONFIG ============
const SOURCE_URL =
  "https://raw.githubusercontent.com/srhady/bingstream/refs/heads/main/playlist.json";

const OUTPUT_PATH = path.join(__dirname, "..", "output.json");

const DEFAULT_LOGO =
  "https://static.vecteezy.com/system/resources/previews/016/314/808/original/transparent-live-transparent-live-icon-free-png.png";

// Category name -> sport_id mapping. Naya category aaye to yahan add kar dein.
const SPORT_ID_MAP = {
  football: 1,
  soccer: 1,
  basketball: 2,
  cricket: 3,
  "ice hockey": 4,
  tennis: 5,
  volleyball: 6,
  handball: 7,
  "table tennis": 8,
  badminton: 9,
  "american football": 10,
  rugby: 11,
  baseball: 12,
  darts: 13,
  mma: 14,
  boxing: 14,
  golf: 16,
  "auto racing": 17,
  motorsport: 17,
  cycling: 20,
  sailing: 21,
  "world cup": 1, // World Cup category = football
};
const DEFAULT_SPORT_ID = 99;

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
// =================================

async function fetchSourceJson(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (auto-fetch-bot)",
      "Cache-Control": "no-cache",
    },
  });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function slugify(text, fallbackId) {
  const base = (text || "match")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base}-${fallbackId}`;
}

// Title se stable numeric id banata hai (same title -> hamesha same id)
function generateMatchId(title) {
  const hash = crypto.createHash("md5").update(title || "").digest("hex");
  const num = parseInt(hash.slice(0, 9), 16);
  return 1000000000 + (num % 900000000);
}

function getSportId(category) {
  const key = (category || "").toLowerCase().trim();
  return SPORT_ID_MAP[key] ?? DEFAULT_SPORT_ID;
}

// "Start Time" ko parse karta hai. Format: "2:30 PM 03-07-2026" (h:mm AM/PM DD-MM-YYYY)
function parseStartTime(startTimeStr) {
  if (!startTimeStr) return null;

  const match = startTimeStr
    .trim()
    .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)\s+(\d{1,2})-(\d{1,2})-(\d{4})$/i);

  if (!match) return null;

  let [, hh, mm, ampm, dd, MM, yyyy] = match;
  hh = parseInt(hh, 10);
  mm = parseInt(mm, 10);
  dd = parseInt(dd, 10);
  MM = parseInt(MM, 10);
  yyyy = parseInt(yyyy, 10);

  if (ampm.toUpperCase() === "PM" && hh !== 12) hh += 12;
  if (ampm.toUpperCase() === "AM" && hh === 12) hh = 0;

  const dateObj = new Date(yyyy, MM - 1, dd, hh, mm, 0);
  if (isNaN(dateObj.getTime())) return null;

  return dateObj;
}

// Date object ko "03 Jul 2026, 02:30 PM" jaisi readable string mein badalta hai
function formatLocalTime(dateObj) {
  const dd = String(dateObj.getDate()).padStart(2, "0");
  const mon = MONTH_NAMES[dateObj.getMonth()];
  const yyyy = dateObj.getFullYear();

  let hh = dateObj.getHours();
  const mm = String(dateObj.getMinutes()).padStart(2, "0");
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12;
  if (hh === 0) hh = 12;
  const hhStr = String(hh).padStart(2, "0");

  return `${dd} ${mon} ${yyyy}, ${hhStr}:${mm} ${ampm}`;
}

function buildTiming(isLive, startTimeStr) {
  if (isLive) {
    return {
      start_time_timestamp: Math.floor(Date.now() / 1000),
      start_time_local: "Live Now",
      countdown_seconds: null,
    };
  }

  const parsedDate = parseStartTime(startTimeStr);

  if (!parsedDate) {
    // Parse fail ho jaye to bhi crash na ho, TBA fallback
    return {
      start_time_timestamp: null,
      start_time_local: "TBA",
      countdown_seconds: null,
    };
  }

  return {
    start_time_timestamp: Math.floor(parsedDate.getTime() / 1000),
    start_time_local: formatLocalTime(parsedDate),
    countdown_seconds: null,
  };
}

function transformStream(stream) {
  return {
    server: stream.server_name,
    url: stream.play_url,
  };
}

function transformChannel(ch) {
  const title =
    ch["Match Title"] || `${ch["Team 1 Name"]} VS ${ch["Team 2 Name"]}`;
  const matchId = generateMatchId(title);
  const isLive = (ch["Match Status"] || "").toLowerCase() === "live";

  return {
    match_id: matchId,
    sport_name: ch["Category"] || "Unknown",
    sport_id: getSportId(ch["Category"]),
    title: title,
    slug: slugify(title, matchId),
    status: isLive ? "LIVE" : "NS",
    league: {
      league_name: ch["League"] || ch["Category"] || "Unknown League",
      league_logo: "",
    },
    venue: "TBA",
    teams: {
      home_name: ch["Team 1 Name"] || "Unknown",
      away_name: ch["Team 2 Name"] || "Unknown",
      home_logo: ch["Team 1 Logo"] || DEFAULT_LOGO,
      away_logo: ch["Team 2 Logo"] || DEFAULT_LOGO,
      combined_logo: ch["Match Poster"] || DEFAULT_LOGO,
    },
    timing: buildTiming(isLive, ch["Start Time"]),
    // Extra: bina is field ke stream play nahi ho sakti, isliye rakha hai
    playback: {
      user_agent: ch["User-Agent"] || "",
      referer: ch["Referer"] || "",
      streams: Array.isArray(ch["Stream URL"])
        ? ch["Stream URL"].map(transformStream)
        : [],
    },
  };
}

function transformPlaylist(data) {
  const info = data.playlist_info || {};
  const channels = Array.isArray(data.channels) ? data.channels : [];

  const liveMatches = channels
    .filter((ch) => (ch["Match Status"] || "").toLowerCase() === "live")
    .map(transformChannel);

  const upcomingMatches = channels
    .filter((ch) => (ch["Match Status"] || "").toLowerCase() !== "live")
    .map(transformChannel);

  return {
    playlist_info: {
      name: info.name || null,
      telegram: info.telegram || null,
      owner: info.owner || null,
      last_update_time: info.last_update_time || null,
    },
    live_matches: liveMatches,
    total_upcoming_matches: upcomingMatches.length,
    upcoming_matches: upcomingMatches,
  };
}

async function main() {
  try {
    console.log("Fetching source JSON...");
    const sourceData = await fetchSourceJson(SOURCE_URL);

    console.log("Transforming to Asports-style format...");
    const transformed = transformPlaylist(sourceData);

    fs.writeFileSync(
      OUTPUT_PATH,
      JSON.stringify(transformed, null, 2),
      "utf-8"
    );

    console.log(`Saved to ${OUTPUT_PATH}`);
    console.log(`Live matches: ${transformed.live_matches.length}`);
    console.log(`Upcoming matches: ${transformed.upcoming_matches.length}`);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
