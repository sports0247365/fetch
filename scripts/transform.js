const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ============ CONFIG ============
const SOURCE_URL = "https://90minutes.pro/api/streams";

// Har embed link se pehle ye base URL lagega
const EMBED_BASE_URL = "https://90minutes.pro";

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

// Agar category already ek generic sport ka naam ho, to
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
  ["mlc", "cricket"],
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
  ["cwc", "cricket"],
  ["wtc", "cricket"],
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
  ["wtt", "table tennis"],
  ["ittf", "table tennis"],

  // Tennis
  ["atp", "tennis"],
  ["wta", "tennis"],
  ["itf", "tennis"],
  ["utr", "tennis"],
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
  ["fip", "padel"],

  // Basketball
  ["nba", "basketball"],
  ["wnba", "basketball"],
  ["euroleague", "basketball"],
  ["eurocup basketball", "basketball"],
  ["ncaa basketball", "basketball"],
  ["ncaab", "basketball"],
  ["march madness", "basketball"],
  ["cba", "basketball"],
  ["nbl", "basketball"],
  ["fiba", "basketball"],

  // American Football
  ["nfl", "american football"],
  ["ncaaf", "american football"],
  ["college football", "american football"],
  ["cfl", "american football"],
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
  ["shl", "ice hockey"],

  // Baseball
  ["mlb", "baseball"],
  ["npb", "baseball"],
  ["kbo", "baseball"],
  ["milb", "baseball"],
  ["wbc", "baseball"],

  // Rugby
  ["rugby world cup", "rugby"],
  ["rwc", "rugby"],
  ["six nations", "rugby"],
  ["super rugby", "rugby"],
  ["premiership rugby", "rugby"],
  ["top 14", "rugby"],
  ["urc", "rugby"],
  ["nrl", "rugby"],
  ["rugby league", "rugby"],
  ["rugby union", "rugby"],
  ["rugby", "rugby"],

  // MMA / Boxing
  ["ufc", "mma"],
  ["bellator", "mma"],
  ["one championship", "mma"],
  ["pfl", "mma"],
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
  ["wrc", "motorsport"],
  ["wec", "motorsport"],
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
  ["vnl", "volleyball"],
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

  // Football / Soccer - generic hone ki wajah se END mein
  ["fifa", "football"],
  ["uefa", "football"],
  ["champions league", "football"],
  ["europa league", "football"],
  ["conference league", "football"],
  ["premier league", "football"],
  ["epl", "football"],
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
  ["world cup", "football"],
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

function normalize(text) {
  return (text || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function classifySport(category, league) {
  // "american-football" -> "american football"
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
      leagueName: league && league.trim() ? league : capitalizeWords(catLower),
    };
  }

  // Case 2: Category ya League mein koi known keyword dhoondein
  const searchTextNormalized = normalize(`${category} ${league}`);
  const searchTextRaw = `${catLower} ${leagueLower}`;

  for (const [keyword, sport] of LEAGUE_KEYWORDS) {
    const isMatch =
      keyword instanceof RegExp
        ? keyword.test(searchTextRaw)
        : searchTextNormalized.includes(normalize(keyword));
    if (isMatch) {
      return {
        sportName: capitalizeWords(sport),
        leagueName: league && league.trim() ? league : category,
      };
    }
  }

  // Case 3: Fallback - category ko hi sport_name maan lein
  return {
    sportName: catLower ? capitalizeWords(catLower) : "Other",
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

// Source ka unique "id" use karte hain (title same ho sakta hai, id nahi)
function generateMatchId(key) {
  const hash = crypto.createHash("md5").update(key || "").digest("hex");
  const num = parseInt(hash.slice(0, 9), 16);
  return 1000000000 + (num % 900000000);
}

function getSportId(sportName) {
  const key = (sportName || "").toLowerCase().trim();
  return SPORT_ID_MAP[key] ?? DEFAULT_SPORT_ID;
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

// status "live" ho ya always_live = 1 ho to LIVE
function isLiveMatch(m) {
  return /live/i.test(m.status || "") || Number(m.always_live) === 1;
}

// "/embed/?id=..." -> "https://90minutes.pro/embed/?id=..."
// Agar embed pehle se full URL ho to waisa hi rehne do
function buildPlayUrl(embed) {
  if (!embed) return "";
  if (/^https?:\/\//i.test(embed)) return embed;
  const base = EMBED_BASE_URL.replace(/\/+$/, "");
  const pathPart = embed.startsWith("/") ? embed : `/${embed}`;
  return base + pathPart;
}

// Har source ek alag server ban jata hai
function transformSource(src, index) {
  const playUrl = buildPlayUrl(src.embed);
  return {
    server_name: (src.name || "").trim() || `Server ${index + 1}`,
    play_url: playUrl,
    is_new_format: !!playUrl,
    required_referer: null,
  };
}

function transformMatch(m) {
  const title = (m.name || "").trim() || "Unknown Match";
  const matchId = generateMatchId(m.id || m.uri_name || title);

  const isLive = isLiveMatch(m);
  const { sportName, leagueName } = classifySport(
    m.category_name || m._category,
    m.league || m.tag
  );

  // teams: source deta hai; agar khali ho to title ko "vs" par split kar lo
  let home = ((m.teams && m.teams.home && m.teams.home.name) || "").trim();
  let away = ((m.teams && m.teams.away && m.teams.away.name) || "").trim();
  if ((!home || !away) && /\s(vs|at)\.?\s/i.test(title)) {
    const parts = title.split(/\s+(?:vs|at)\.?\s+/i);
    home = home || (parts[0] || "").trim();
    away = away || (parts[1] || "").trim();
  }

  // Duplicate embed links hata do, baqi sab play_url ban jayenge
  const seen = new Set();
  const streams = (Array.isArray(m.sources) ? m.sources : [])
    .filter((s) => s && s.embed && !seen.has(s.embed) && seen.add(s.embed))
    .map(transformSource);

  return {
    match_id: matchId,
    sport_name: sportName,
    sport_id: getSportId(sportName),
    slug: slugify(title, matchId),
    title: title, // <- name
    status: isLive ? "LIVE" : "NS", // <- status
    league: {
      league_name: leagueName || "", // <- league
      league_logo: "",
    },
    venue: "TBA",
    teams: {
      home_name: home || "Unknown",
      away_name: away || "Unknown",
      combined_logo: m.poster || DEFAULT_LOGO, // <- poster
    },
    timing: buildTiming(isLive, Number(m.starts_at) || null), // <- starts_at
    streams: streams, // <- sources[].embed (base URL ke sath)
  };
}

// API: { streams: [ { category, streams: [ match, ... ] }, ... ] }
// Sab categories ke matches ek flat list mein nikal leta hai
function extractMatches(data) {
  const groups = Array.isArray(data)
    ? data
    : Array.isArray(data && data.streams)
    ? data.streams
    : [];

  const matches = [];
  for (const group of groups) {
    if (group && Array.isArray(group.streams)) {
      for (const m of group.streams) {
        matches.push({ ...m, _category: group.category });
      }
    } else if (group && group.sources) {
      // Agar kabhi API seedha matches ki list de
      matches.push(group);
    }
  }
  return matches;
}

function transformPlaylist(data) {
  const matches = extractMatches(data);

  const byStart = (a, b) =>
    (a.timing.start_time_timestamp || 0) - (b.timing.start_time_timestamp || 0);

  const all = matches.map((m) => ({ live: isLiveMatch(m), out: transformMatch(m) }));
  const liveMatches = all.filter((x) => x.live).map((x) => x.out).sort(byStart);
  const upcomingMatches = all.filter((x) => !x.live).map((x) => x.out).sort(byStart);

  return {
    playlist_info: {
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

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(transformed, null, 2), "utf-8");

    console.log(`Saved to ${OUTPUT_PATH}`);
    console.log(`Live matches: ${transformed.live_matches.length}`);
    console.log(`Upcoming matches: ${transformed.upcoming_matches.length}`);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
