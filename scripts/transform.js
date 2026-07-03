
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ============ CONFIG ============
const SOURCE_URL =
  "https://raw.githubusercontent.com/srhady/bingstream/refs/heads/main/playlist.json";

const OUTPUT_PATH = path.join(__dirname, "..", "output.json");

const DEFAULT_LOGO =
  "https://static.vecteezy.com/system/resources/previews/016/314/808/original/transparent-live-transparent-live-icon-free-png.png";

// ---------- Generic sport IDs ----------
const SPORT_ID_MAP = {
  football: 1,
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
  boxing: 15,
  golf: 16,
  motorsport: 17,
  cycling: 20,
  sailing: 21,
  padel: 22,
};
const DEFAULT_SPORT_ID = 99;

// Agar Category field mein already ek generic sport ka naam ho, to
// usay seedha use kar liya jayega (case-insensitive match)
const KNOWN_GENERIC_SPORTS = Object.keys(SPORT_ID_MAP);

// Tournament/League/Category ke naam mein ye keyword mile to us sport
// se related maan liya jayega. ZYADA SPECIFIC keywords upar rakhein,
// taake "table tennis" jaise cases "tennis" se pehle match ho jayen.
const LEAGUE_KEYWORDS = [
  // Cricket
  ["ipl", "cricket"],
  ["psl", "cricket"],
  ["bbl", "cricket"],
  ["big bash", "cricket"],
  ["cpl", "cricket"],
  ["t20", "cricket"],
  ["odi", "cricket"],
  ["test match", "cricket"],
  ["icc", "cricket"],
  ["the hundred", "cricket"],
  ["ranji", "cricket"],
  ["bpl cricket", "cricket"],
  ["lpl", "cricket"],
  ["ilt20", "cricket"],
  ["county championship", "cricket"],
  ["sheffield shield", "cricket"],

  // Table Tennis (specific before "tennis")
  ["table tennis", "table tennis"],
  ["ttcup", "table tennis"],

  // Tennis
  ["atp", "tennis"],
  ["wta", "tennis"],
  ["itf", "tennis"],
  [/\bw1[0-9]\b/, "tennis"],
  [/\bw[2-6][0-9]\b/, "tennis"],
  [/\bm1[0-9]\b/, "tennis"],
  [/\bm[2-6][0-9]\b/, "tennis"],
  ["grand slam", "tennis"],
  ["wimbledon", "tennis"],
  ["us open", "tennis"],
  ["french open", "tennis"],
  ["roland garros", "tennis"],
  ["australian open", "tennis"],
  ["davis cup", "tennis"],
  ["billie jean king cup", "tennis"],
  ["challenger", "tennis"],

  // Basketball
  ["nba", "basketball"],
  ["euroleague", "basketball"],
  ["wnba", "basketball"],
  ["ncaa basketball", "basketball"],
  ["cba", "basketball"],

  // American Football
  ["nfl", "american football"],
  ["ncaaf", "american football"],
  ["college football", "american football"],

  // Ice Hockey
  ["nhl", "ice hockey"],
  ["khl", "ice hockey"],

  // Baseball
  ["mlb", "baseball"],
  ["npb", "baseball"],
  ["kbo", "baseball"],

  // Rugby
  ["six nations", "rugby"],
  ["super rugby", "rugby"],
  ["premiership rugby", "rugby"],
  ["nrl", "rugby"],
  ["rugby", "rugby"],

  // MMA / Boxing
  ["ufc", "mma"],
  ["bellator", "mma"],
  ["one championship", "mma"],
  ["boxing", "boxing"],

  // Golf
  ["pga", "golf"],
  ["ryder cup", "golf"],
  ["masters", "golf"],
  ["european tour", "golf"],

  // Motorsport
  ["formula 1", "motorsport"],
  [/\bf1\b/, "motorsport"],
  ["motogp", "motorsport"],
  ["nascar", "motorsport"],
  ["indycar", "motorsport"],

  // Volleyball
  ["fivb", "volleyball"],
  ["volleyball nations league", "volleyball"],

  // Handball
  ["ehf", "handball"],

  // Padel
  ["padel", "padel"],

  // USL (US soccer leagues) - "tennis" se pehle nahi hone ki wajah se
  // yahan football section se pehle rakha hai
  ["usl", "football"],
  ["utr", "tennis"], // UTR Pro Tennis Tour

  // Football / Soccer (generic + tournament names) - ZYADA generic hone
  // ki wajah se list ke END mein rakha hai, taake pehle specific
  // matches (jaise "rugby world cup") upar check ho jayen
  ["fifa", "football"],
  ["uefa", "football"],
  ["champions league", "football"],
  ["europa league", "football"],
  ["conference league", "football"],
  ["premier league", "football"],
  ["la liga", "football"],
  ["serie a", "football"],
  ["serie b", "football"],
  ["bundesliga", "football"],
  ["ligue 1", "football"],
  ["eredivisie", "football"],
  ["primeira liga", "football"],
  ["super lig", "football"],
  ["saudi pro league", "football"],
  ["j1 league", "football"],
  ["k league", "football"],
  ["a-league", "football"],
  ["brasileirao", "football"],
  ["liga mx", "football"],
  ["mls", "football"],
  ["copa america", "football"],
  ["afcon", "football"],
  ["concacaf", "football"],
  ["afc champions league", "football"],
  ["caf champions league", "football"],
  ["friendlies", "football"],
  ["euro", "football"],
  ["world cup", "football"], // note: "rugby world cup" upar rugby se pehle match ho chuka hoga
];

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

function capitalizeWords(text) {
  return (text || "")
    .split(" ")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// Category aur League dono se dekh kar sahi generic sport pehchanta hai
function classifySport(category, league) {
  const catLower = (category || "").toLowerCase().trim();
  const leagueLower = (league || "").toLowerCase().trim();

  // Case 1: Category already ek generic sport ka naam hai
  if (KNOWN_GENERIC_SPORTS.includes(catLower)) {
    return {
      sportName: capitalizeWords(category),
      leagueName: league && league.trim() ? league : category,
    };
  }

  // Case 2: Category ya League mein koi known tournament keyword dhoondein
  const searchText = `${catLower} ${leagueLower}`;
  for (const [keyword, sport] of LEAGUE_KEYWORDS) {
    const isMatch =
      keyword instanceof RegExp
        ? keyword.test(searchText)
        : searchText.includes(keyword);
    if (isMatch) {
      return {
        sportName: capitalizeWords(sport),
        leagueName: league && league.trim() ? league : category,
      };
    }
  }

  // Case 3: Kuch match nahi mila - Category ko hi sport_name maan lein
  // (fallback, taake data drop na ho)
  return {
    sportName: category ? capitalizeWords(category) : "Other",
    leagueName: league && league.trim() ? league : category || "Unknown League",
  };
}

function slugify(text, fallbackId) {
  const base = (text || "match")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base}-${fallbackId}`;
}

function generateMatchId(title) {
  const hash = crypto.createHash("md5").update(title || "").digest("hex");
  const num = parseInt(hash.slice(0, 9), 16);
  return 1000000000 + (num % 900000000);
}

function getSportId(sportName) {
  const key = (sportName || "").toLowerCase().trim();
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

function transformStream(stream, referer) {
  return {
    server_name: stream.server_name,
    play_url: stream.play_url,
    is_new_format: false, // NOTE: source mein ye info nahi hai, default false rakha hai
    required_referer: referer || null,
  };
}

function transformChannel(ch) {
  const title =
    ch["Match Title"] || `${ch["Team 1 Name"]} VS ${ch["Team 2 Name"]}`;
  const matchId = generateMatchId(title);
  const isLive = (ch["Match Status"] || "").toLowerCase() === "live";
  const referer = ch["Referer"] || null;

  const { sportName, leagueName } = classifySport(
    ch["Category"],
    ch["League"]
  );

  return {
    match_id: matchId,
    sport_name: sportName,
    sport_id: getSportId(sportName),
    slug: slugify(title, matchId),
    title: title,
    status: isLive ? "LIVE" : "NS",
    league: {
      league_name: leagueName,
      league_logo: "",
    },
    venue: "TBA",
    teams: {
      home_name: ch["Team 1 Name"] || "Unknown",
      away_name: ch["Team 2 Name"] || "Unknown",
      combined_logo: ch["Match Poster"] || DEFAULT_LOGO,
    },
    timing: buildTiming(isLive, ch["Start Time"]),
    streams: Array.isArray(ch["Stream URL"])
      ? ch["Stream URL"].map((s) => transformStream(s, referer))
      : [],
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

    console.log("Transforming to app model format...");
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
