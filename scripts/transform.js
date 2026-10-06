const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ============ CONFIG ============
const SOURCE_URL =
  "https://raw.githubusercontent.com/srhady/data/main/live_sports_playlist.json";

// Source ka "Start Time" (jaise "06:15 AM | 06-Oct") UTC+6 mein hota hai
const SOURCE_TZ_OFFSET_HOURS = 6;

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
  "australian football": 23,
  fight: 18,
};
const DEFAULT_SPORT_ID = 99;

// Naye source ki Category names ko generic sport names par map karta hai
// (hyphen/underscore pehle hi space ban jate hain, phir yahan check hota hai)
const CATEGORY_ALIASES = {
  "american football": "american football",
  hockey: "ice hockey",
  "motor sports": "motorsport",
  "motor sport": "motorsport",
  motorsports: "motorsport",
  soccer: "football",
  fight: "fight",
  fighting: "fight",
  wrestling: "fight",
};

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
  ["bpl cricket", "cricket"],
  ["lpl", "cricket"],
  ["ilt20", "cricket"],
  ["sa20", "cricket"],
  ["mlc", "cricket"], // Major League Cricket (USA)
  ["t20", "cricket"],
  ["t10", "cricket"],
  ["odi", "cricket"],
  ["test match", "cricket"],
  ["1st test", "cricket"],
  ["2nd test", "cricket"],
  ["3rd test", "cricket"],
  ["4th test", "cricket"],
  ["5th test", "cricket"],
  ["icc", "cricket"],
  ["cwc", "cricket"], // Cricket World Cup
  ["wtc", "cricket"], // World Test Championship
  ["the hundred", "cricket"],
  ["ranji", "cricket"],
  ["duleep", "cricket"],
  ["county championship", "cricket"],
  ["sheffield shield", "cricket"],
  ["asia cup", "cricket"],
  ["cricket", "cricket"],
  ["ETPL", "cricket"],

  // Table Tennis (specific before "tennis")
  ["table tennis", "table tennis"],
  ["ttcup", "table tennis"],
  ["wtt", "table tennis"], // World Table Tennis
  ["ittf", "table tennis"],

  // Tennis
  ["atp", "tennis"],
  ["wta", "tennis"],
  ["itf", "tennis"],
  ["utr", "tennis"], // UTR Pro Tennis Tour
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
  ["fed cup", "tennis"],
  ["challenger", "tennis"],
  ["laver cup", "tennis"],

  // Padel
  ["padel", "padel"],
  ["premier padel", "padel"],
  ["fip", "padel"], // Federacion Internacional de Padel

  // Basketball
  ["nba", "basketball"],
  ["wnba", "basketball"],
  ["euroleague", "basketball"],
  ["eurocup basketball", "basketball"],
  ["ncaa basketball", "basketball"],
  ["ncaab", "basketball"],
  ["march madness", "basketball"],
  ["cba", "basketball"],
  ["nbl", "basketball"], // Australia National Basketball League
  ["fiba", "basketball"],

  // American Football
  ["nfl", "american football"],
  ["ncaaf", "american football"],
  ["college football", "american football"],
  ["cfl", "american football"], // Canadian Football League
  ["xfl", "american football"],
  ["ufl", "american football"],

  // Australian Rules Football
  ["afl", "australian football"],
  ["aussie rules", "australian football"],

  // Ice Hockey
  ["nhl", "ice hockey"],
  ["khl", "ice hockey"],
  ["ahl", "ice hockey"],
  ["iihf", "ice hockey"],
  ["shl", "ice hockey"], // Swedish Hockey League

  // Baseball
  ["mlb", "baseball"],
  ["npb", "baseball"],
  ["kbo", "baseball"],
  ["milb", "baseball"],
  ["wbc", "baseball"], // World Baseball Classic

  // Rugby
  ["rugby world cup", "rugby"],
  ["rwc", "rugby"],
  ["six nations", "rugby"],
  ["super rugby", "rugby"],
  ["premiership rugby", "rugby"],
  ["top 14", "rugby"],
  ["urc", "rugby"], // United Rugby Championship
  ["nrl", "rugby"],
  ["rugby league", "rugby"],
  ["rugby union", "rugby"],
  ["rugby", "rugby"],

  // MMA / Boxing
  ["ufc", "mma"],
  ["bellator", "mma"],
  ["one championship", "mma"],
  ["pfl", "mma"], // Professional Fighters League
  ["mma", "mma"],
  ["boxing", "boxing"],

  // Golf
  ["pga", "golf"],
  ["lpga", "golf"],
  ["dp world tour", "golf"],
  ["liv golf", "golf"],
  ["ryder cup", "golf"],
  ["masters", "golf"],
  ["european tour golf", "golf"],
  ["golf", "golf"],

  // Motorsport
  ["formula 1", "motorsport"],
  ["formula 2", "motorsport"],
  ["formula 3", "motorsport"],
  ["formula e", "motorsport"],
  [/\bf1\b/, "motorsport"],
  [/\bf2\b/, "motorsport"],
  [/\bf3\b/, "motorsport"],
  ["motogp", "motorsport"],
  ["wrc", "motorsport"], // World Rally Championship
  ["wec", "motorsport"], // World Endurance Championship
  ["nascar", "motorsport"],
  ["indycar", "motorsport"],
  ["motorsport", "motorsport"],
  ["auto racing", "motorsport"],
  ["FIA Formula 3 Championship Sprint", "motorsport"],

  // Cycling
  ["tour de france", "cycling"],
  ["giro d'italia", "cycling"],
  ["vuelta", "cycling"],
  ["uci", "cycling"],
  ["cycling", "cycling"],

  // Sailing
  ["sailgp", "sailing"],
  ["america's cup", "sailing"],
  ["sailing", "sailing"],

  // Volleyball
  ["fivb", "volleyball"],
  ["vnl", "volleyball"], // Volleyball Nations League
  ["volleyball nations league", "volleyball"],
  ["volleyball", "volleyball"],

  // Handball
  ["ehf", "handball"],
  ["ihf", "handball"],
  ["handball", "handball"],

  // Badminton
  ["bwf", "badminton"],
  ["badminton", "badminton"],

  // Darts
  ["pdc", "darts"],
  ["darts", "darts"],

  // USL (US soccer leagues)
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
  ["epl", "football"], // English Premier League ka short form
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
  ["Superettan", "football"],
  ["Liga", "football"],
  ["Major League Soccer", "football"],
  ["NWSL", "football"],
  ["Eerste Divisie", "football"],
  ["Ligue", "football"],
  ["Championship", "football"],
  ["FA WSL", "football"],
  ["FA Cup", "football"],
  ["Süper Lig", "football"],
  ["Primera División", "football"],
  ["Western Australia NPL", "football"],
  ["Thai League 1", "football"],
  ["Pro League", "football"],
  ["First League", "football"],
  ["Liga 1", "football"],
  ["Campionato Primavera", "football"],
  ["Süper Lig", "football"],
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

// Kuch sport names acronym hain (jaise MMA), inhe pura uppercase rakhna hai
const ACRONYM_SPORT_NAMES = {
  mma: "MMA",
};

function capitalizeWords(text) {
  const lower = (text || "").toLowerCase().trim();
  if (ACRONYM_SPORT_NAMES[lower]) {
    return ACRONYM_SPORT_NAMES[lower];
  }
  return (text || "")
    .split(" ")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// Text ko normalize karta hai: lowercase + spaces/hyphens/underscores hata deta hai
// Taake "World Cup", "WorldCup", "World-Cup", "WORLD_CUP" sab ek jaisay match hon
function normalize(text) {
  return (text || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Category aur League dono se dekh kar sahi generic sport pehchanta hai
function classifySport(category, league) {
  // "American-football" -> "american football", "Motor-sports" -> "motor sports"
  let catLower = (category || "")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (CATEGORY_ALIASES[catLower]) catLower = CATEGORY_ALIASES[catLower];
  const leagueLower = (league || "").toLowerCase().trim();

  // Case 1: Category already ek generic sport ka naam hai
  if (KNOWN_GENERIC_SPORTS.includes(catLower)) {
    return {
      sportName: capitalizeWords(catLower),
      leagueName: league && league.trim() ? league : category,
    };
  }

  // Case 2: Category ya League mein koi known tournament keyword dhoondein
  // (normalized - spaces/hyphens/case ka farq nahi padega)
  const searchTextNormalized = normalize(`${category} ${league}`);
  const searchTextRaw = `${catLower} ${leagueLower}`; // regex patterns ke liye (word boundaries)

  for (const [keyword, sport] of LEAGUE_KEYWORDS) {
    let isMatch;
    if (keyword instanceof RegExp) {
      isMatch = keyword.test(searchTextRaw);
    } else {
      isMatch = searchTextNormalized.includes(normalize(keyword));
    }
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

// Unix timestamp (seconds) ko readable local time mein badalta hai
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

// "06:15 AM | 06-Oct" (UTC+6) ko unix timestamp (seconds) mein badalta hai.
// Source mein saal nahi hota, isliye current saal maan kar year-boundary adjust karte hain.
function parseStartTime(str) {
  if (!str) return null;
  const m = String(str).match(
    /(\d{1,2}):(\d{2})\s*(AM|PM)\s*\|\s*(\d{1,2})-([A-Za-z]{3})/i
  );
  if (!m) return null;

  let hour = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === "PM") hour += 12;
  const minute = parseInt(m[2], 10);
  const day = parseInt(m[4], 10);
  const month = MONTH_NAMES.findIndex(
    (x) => x.toLowerCase() === m[5].toLowerCase()
  );
  if (month < 0) return null;

  const nowMs = Date.now();
  const halfYear = 182 * 24 * 3600 * 1000;
  let year = new Date(nowMs).getUTCFullYear();

  const toMs = (y) =>
    Date.UTC(y, month, day, hour, minute) -
    SOURCE_TZ_OFFSET_HOURS * 3600 * 1000;

  let ms = toMs(year);
  if (ms - nowMs > halfYear) ms = toMs(year - 1); // e.g. Jan mein "31-Dec"
  else if (nowMs - ms > halfYear) ms = toMs(year + 1); // e.g. Dec mein "01-Jan"

  return Math.floor(ms / 1000);
}

// Time sirf unix timestamp (seconds) mein diya jata hai,
// app khud har user ke area ke hisab se local time dikhayegi
function buildTiming(isLive, startAt) {
  const ts = startAt || (isLive ? Math.floor(Date.now() / 1000) : null);
  return {
    start_time_timestamp: ts,
    start_time_local: ts,
    countdown_seconds: null,
  };
}

function isLiveStatus(status) {
  return /live/i.test(status || "");
}

// Har Embed_URL ek alag server ban jata hai
function transformStream(stream) {
  const parts = [];
  if (stream.Source) parts.push(capitalizeWords(stream.Source));
  if (stream.Stream_No != null) parts.push(String(stream.Stream_No));
  let name = parts.join(" ");
  if (stream.Quality) name += ` (${stream.Quality})`;
  if (stream.Language) name += ` - ${stream.Language}`;

  return {
    server_name: name.trim() || "Server",
    play_url: stream.Embed_URL || "",
    is_new_format: !!stream.Embed_URL,
    required_referer: null,
  };
}

function transformMatch(m) {
  const title = (m["Match Title"] || "").trim() || "Unknown Match";
  const matchId = generateMatchId(title);

  const isLive = isLiveStatus(m["Match Status"]);
  const { sportName, leagueName } = classifySport(m.Category, m.League);

  // teams: source deta hai; agar khali ho to title ko "vs" par split kar lo
  let home = (m["Team 1 Name"] || "").trim();
  let away = (m["Team 2 Name"] || "").trim();
  if ((!home || !away) && /\svs\.?\s/i.test(title)) {
    const parts = title.split(/\s+vs\.?\s+/i);
    home = home || (parts[0] || "").trim();
    away = away || (parts[1] || "").trim();
  }

  // Duplicate Embed_URLs hata do, baqi sab play_url ban jayenge
  const seen = new Set();
  const streams = (Array.isArray(m.Streams) ? m.Streams : [])
    .filter((s) => s && s.Embed_URL && !seen.has(s.Embed_URL) && seen.add(s.Embed_URL))
    .map(transformStream);

  return {
    match_id: matchId,
    sport_name: sportName,
    sport_id: getSportId(sportName),
    slug: slugify(title, matchId),
    title: title, // <- Match Title
    status: isLive ? "LIVE" : "NS", // <- Match Status
    league: {
      league_name: leagueName || "", // <- League
      league_logo: "", // naye source mein league logo nahi hai
    },
    venue: "TBA",
    teams: {
      home_name: home || "Unknown",
      away_name: away || "Unknown",
      // combined_logo <- Match Poster (warna DEFAULT_LOGO)
      combined_logo: m["Match Poster"] || DEFAULT_LOGO,
    },
    timing: buildTiming(isLive, parseStartTime(m["Start Time"])), // <- Start Time
    streams: streams, // <- Streams[].Embed_URL
  };
}

function transformPlaylist(data) {
  // Naya source seedha array deta hai
  const matches = Array.isArray(data)
    ? data
    : Array.isArray(data && data.matches)
    ? data.matches
    : [];

  const all = matches.map((m) => ({ raw: m, out: transformMatch(m) }));
  const liveMatches = all
    .filter((x) => isLiveStatus(x.raw["Match Status"]))
    .map((x) => x.out);
  const upcomingMatches = all
    .filter((x) => !isLiveStatus(x.raw["Match Status"]))
    .map((x) => x.out);

  return {
    playlist_info: {
      // Source mein update time nahi hai, isliye generate hone ka waqt
      last_update_time: new Date().toISOString(),
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
