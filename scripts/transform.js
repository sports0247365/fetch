const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ============ CONFIG ============
const SOURCE_URL =
  "https://raw.githubusercontent.com/srhady/bingstream/main/playlist.json";

// crichd.py ye file generate karta hai (OUTPUT_JSON). Path apne setup ke
// hisab se adjust kar lein agar crichd.py kisi aur folder mein hai.
const CRICHD_MATCHES_PATH = path.join(__dirname, "matches.json");

const OUTPUT_PATH = path.join(__dirname, "..", "output.json");

const DEFAULT_LOGO =
  "https://static.vecteezy.com/system/resources/previews/016/314/808/original/transparent-live-transparent-live-icon-free-png.png";

// crichd match live maana jayega agar start time ho chuka ho aur is window
// (ghanton mein) ke andar ho. Test/ODI lambe hote hain isliye 8 ghante default.
const CRICHD_LIVE_WINDOW_HOURS = 8;

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
};
const DEFAULT_SPORT_ID = 99;

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

const ACRONYM_SPORT_NAMES = { mma: "MMA" };

function capitalizeWords(text) {
  const lower = (text || "").toLowerCase().trim();
  if (ACRONYM_SPORT_NAMES[lower]) return ACRONYM_SPORT_NAMES[lower];
  return (text || "")
    .split(" ")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function normalize(text) {
  return (text || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function classifySport(category, league) {
  const catLower = (category || "").toLowerCase().trim();
  const leagueLower = (league || "").toLowerCase().trim();

  if (KNOWN_GENERIC_SPORTS.includes(catLower)) {
    return {
      sportName: capitalizeWords(category),
      leagueName: league && league.trim() ? league : category,
    };
  }

  const searchTextNormalized = normalize(`${category} ${league}`);
  const searchTextRaw = `${catLower} ${leagueLower}`;

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

function buildTiming(isLive, startAt) {
  if (isLive) {
    return {
      start_time_timestamp: startAt || Math.floor(Date.now() / 1000),
      start_time_local: "Live Now",
      countdown_seconds: null,
    };
  }

  if (!startAt) {
    return {
      start_time_timestamp: null,
      start_time_local: "TBA",
      countdown_seconds: null,
    };
  }

  return {
    start_time_timestamp: startAt,
    start_time_local: formatLocalTime(new Date(startAt * 1000)),
    countdown_seconds: null,
  };
}

function transformStream(stream, referer) {
  return {
    server_name: stream.display_name || stream.stream_name || "",
    play_url: stream.videoURL || "",
    is_new_format: !!stream.videoURL,
    required_referer: referer || null,
  };
}

// ============ GITHUB SOURCE (playlist.json) ============

function transformMatch(m) {
  const title = m.name || "Unknown Match";
  const matchId = generateMatchId(title);

  const isLive = m.is_playing === true;
  const referer = m.referer || null;

  const { sportName } = classifySport(null, m.league_name);

  let home = m.localteam_name || "";
  let away = m.visitorteam_name || "";
  if ((!home || !away) && /\svs\s/i.test(title)) {
    const parts = title.split(/\s+vs\s+/i);
    home = home || (parts[0] || "").trim() || "Unknown";
    away = away || (parts[1] || "").trim() || "Unknown";
  }

  return {
    match_id: matchId,
    sport_name: sportName,
    sport_id: getSportId(sportName),
    slug: slugify(title, matchId),
    title: title,
    status: m.status || "NS",
    league: {
      league_name: m.league_name || "",
      league_logo: m.league_logo || "",
    },
    venue: "TBA",
    teams: {
      home_name: home || "Unknown",
      away_name: away || "Unknown",
      combined_logo: m.league_logo || DEFAULT_LOGO,
    },
    timing: buildTiming(isLive, m.start_at),
    streams: Array.isArray(m.link_live)
      ? m.link_live
          .filter((s) => s.videoURL)
          .map((s) => transformStream(s, referer))
      : [],
  };
}

function transformPlaylist(data) {
  const matches = Array.isArray(data.matches) ? data.matches : [];

  const liveMatches = matches
    .filter((m) => m.is_playing === true)
    .map(transformMatch);

  const upcomingMatches = matches
    .filter((m) => m.is_playing !== true)
    .map(transformMatch);

  return { liveMatches, upcomingMatches, lastUpdateTime: (data.playlist_info || {}).last_update_time || null };
}

// ============ CRICHD SOURCE (matches.json) ============

// crichd date/time GMT+0 mein hote hain: "DD-MM-YYYY" + "HH:MM" (24hr)
function crichdStartTimestamp(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;

  const dateParts = dateStr.split("-").map((x) => parseInt(x, 10));
  const timeParts = timeStr.split(":").map((x) => parseInt(x, 10));
  if (dateParts.length !== 3 || timeParts.length < 2) return null;

  const [dd, mm, yyyy] = dateParts;
  const [hh, min] = timeParts;
  if ([dd, mm, yyyy, hh, min].some((n) => Number.isNaN(n))) return null;

  const utcMs = Date.UTC(yyyy, mm - 1, dd, hh, min, 0);
  return Math.floor(utcMs / 1000);
}

function crichdIsLive(startAt) {
  if (!startAt) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  const windowSec = CRICHD_LIVE_WINDOW_HOURS * 3600;
  return nowSec >= startAt && nowSec <= startAt + windowSec;
}

function transformCrichdMatch(m) {
  const title = m.title || "Unknown Match";
  const matchId = generateMatchId(title);

  const startAt = crichdStartTimestamp(m.date, m.time);
  const isLive = crichdIsLive(startAt);

  const homeName = (m.teams && m.teams.team1 && m.teams.team1.name) || "Unknown";
  const awayName = (m.teams && m.teams.team2 && m.teams.team2.name) || "TBA";

  // watch_url ki jitni entries hain, utni hi play_url wali stream entries banengi
  const streams = Array.isArray(m.streams)
    ? m.streams
        .filter((s) => s.watch_url)
        .map((s) => ({
          server_name: s.channel || "",
          play_url: s.watch_url,
          is_new_format: true,
          required_referer: null,
        }))
    : [];

  return {
    match_id: matchId,
    sport_name: "Cricket",
    sport_id: getSportId("cricket"),
    slug: slugify(title, matchId),
    title: title,
    status: isLive ? "LIVE" : "NS",
    league: {
      league_name: m.league || "",
      league_logo: m.icon || "",
    },
    venue: "TBA",
    teams: {
      home_name: homeName,
      away_name: awayName,
      combined_logo: m.icon || DEFAULT_LOGO,
    },
    timing: buildTiming(isLive, startAt),
    streams: streams,
  };
}

function loadCrichdMatches() {
  if (!fs.existsSync(CRICHD_MATCHES_PATH)) {
    console.log(`[crichd] ${CRICHD_MATCHES_PATH} nahi mili, crichd data skip kar raha hoon.`);
    return { liveMatches: [], upcomingMatches: [] };
  }

  const raw = fs.readFileSync(CRICHD_MATCHES_PATH, "utf-8");
  const data = JSON.parse(raw);
  const matches = Array.isArray(data) ? data : [];

  const transformed = matches.map(transformCrichdMatch);
  const liveMatches = transformed.filter((m) => m.status === "LIVE");
  const upcomingMatches = transformed.filter((m) => m.status !== "LIVE");

  return { liveMatches, upcomingMatches };
}

// ============ MERGE + MAIN ============

async function main() {
  try {
    console.log("Fetching GitHub source JSON...");
    const sourceData = await fetchSourceJson(SOURCE_URL);
    const github = transformPlaylist(sourceData);

    console.log("Loading crichd matches.json...");
    const crichd = loadCrichdMatches();

    const liveMatches = [...github.liveMatches, ...crichd.liveMatches];
    const upcomingMatches = [...github.upcomingMatches, ...crichd.upcomingMatches];

    const finalOutput = {
      playlist_info: {
        last_update_time: github.lastUpdateTime,
      },
      live_matches: liveMatches,
      total_upcoming_matches: upcomingMatches.length,
      upcoming_matches: upcomingMatches,
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalOutput, null, 2), "utf-8");

    console.log(`Saved to ${OUTPUT_PATH}`);
    console.log(`Live matches: ${finalOutput.live_matches.length} (crichd: ${crichd.liveMatches.length})`);
    console.log(`Upcoming matches: ${finalOutput.upcoming_matches.length} (crichd: ${crichd.upcomingMatches.length})`);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
