const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ============ CONFIG ============
// Source 1: ppv.st (sab sports)
const SOURCE_URL = "https://api.ppv.st/api/streams";

// Source 2: Willow events (ye sab matches Cricket category mein jayenge)
const WILLOW_URL =
  "https://raw.githubusercontent.com/srhady/willow-event/refs/heads/main/live_sports.json";

// true = ppv.st ke cricket matches nahi dikhenge, cricket sirf Willow se aayega
// (baad mein ppv cricket wapas chahiye ho to isay false kar dein)
const HIDE_PPV_CRICKET = true;

// Willow ka "time" (jaise "Tomorrow 8 AM BDT") BDT yani UTC+6 mein hota hai
const WILLOW_TZ_OFFSET_HOURS = 6;

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
const MONTH_NAMES = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];
// =================================

async function fetchSourceJson(url, extraHeaders = {}) {
  // Normal browser jaise headers ("bot" wala User-Agent 403 deta tha)
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    ...extraHeaders,
  };

  // 3 baar try karta hai; fail ho to response ka shuru wala hissa log karta hai
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) return res.json();

      const body = (await res.text()).slice(0, 300).replace(/\s+/g, " ");
      lastError = new Error(
        `Fetch failed: ${res.status} ${res.statusText} | ${body}`,
      );
    } catch (err) {
      lastError = err;
    }
    console.log(`Attempt ${attempt} failed: ${lastError.message}`);
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw lastError;
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
  const hash = crypto
    .createHash("md5")
    .update(key || "")
    .digest("hex");
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

// API mein "status" field nahi hai, isliye:
// always_live = 1 ho (24/7 channel) ya abhi ka waqt starts_at aur ends_at
// ke beech ho to LIVE, warna upcoming (NS)
function isLiveMatch(m) {
  if (Number(m.always_live) === 1) return true;
  const now = Math.floor(Date.now() / 1000);
  const start = Number(m.starts_at) || 0;
  const end = Number(m.ends_at) || 0;
  if (!start) return false;
  return now >= start && (!end || now < end);
}

// Iframe link ka main URL (domain) referer ke liye
// "https://taifood-blog.asia/embed/nba/..." -> "https://taifood-blog.asia/"
function getReferer(iframeUrl) {
  try {
    return new URL(iframeUrl).origin + "/";
  } catch (e) {
    return null;
  }
}

// Har iframe ek alag server ban jata hai
function buildServer(name, iframeUrl, index) {
  return {
    server_name: (name || "").trim() || `Server ${index + 1}`,
    play_url: iframeUrl,
    is_new_format: true,
    required_referer: getReferer(iframeUrl),
    required_referer2: null,
  };
}

function transformMatch(m) {
  const title = (m.name || "").trim() || "Unknown Match";
  const matchId = generateMatchId(String(m.id || m.uri_name || title));

  const isLive = isLiveMatch(m);
  const { sportName, leagueName } = classifySport(
    m.category_name || m._category,
    m.tag,
  );

  // Teams alag se nahi aatin, title ko "vs" / "at" par split kar lete hain
  let home = "";
  let away = "";
  if (/\s(vs|at)\.?\s/i.test(title)) {
    const parts = title.split(/\s+(?:vs|at)\.?\s+/i);
    home = (parts[0] || "").trim();
    away = (parts[1] || "").trim();
  }

  // Pehle main iframe, phir substreams ke iframes (duplicate hata kar)
  const candidates = [{ name: m.source_tag, iframe: m.iframe }];
  if (Array.isArray(m.substreams)) {
    for (const sub of m.substreams) {
      if (sub) candidates.push({ name: sub.source_tag, iframe: sub.iframe });
    }
  }

  const seen = new Set();
  const streams = candidates
    .filter((c) => c.iframe && !seen.has(c.iframe) && seen.add(c.iframe))
    .map((c, i) => buildServer(c.name, c.iframe, i));

  const startAt = Number(m.starts_at) || null; // 24/7 channels mein 0 hota hai

  return {
    match_id: matchId,
    sport_name: sportName,
    sport_id: getSportId(sportName),
    slug: slugify(title, matchId),
    title: title, // <- name
    status: isLive ? "LIVE" : "NS", // <- always_live / starts_at-ends_at
    league: {
      league_name: leagueName || "", // <- tag
      league_logo: "",
    },
    venue: "TBA",
    teams: {
      home_name: home || "Unknown",
      away_name: away || "Unknown",
      combined_logo: m.poster || DEFAULT_LOGO, // <- poster
    },
    timing: buildTiming(isLive, startAt), // <- starts_at
    streams: streams, // <- iframe + substreams[].iframe (referer = iframe domain)
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
    } else if (group && group.iframe) {
      matches.push(group);
    }
  }
  return matches;
}

// ================= WILLOW (Source 2) =================

// Willow ki "LastUpdate" ("12:02 PM 03-11-2026") se BDT wali aaj ki date nikalta hai,
// taake "Tomorrow" usi din ke hisab se ho jis din file bani thi
function willowReferenceDate(headerInfo) {
  const raw = (headerInfo && headerInfo.LastUpdate) || "";
  const m = String(raw).match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (m) {
    return { y: +m[3], mo: +m[2] - 1, d: +m[1] };
  }
  // Fallback: abhi ka waqt, BDT mein
  const bdt = new Date(Date.now() + WILLOW_TZ_OFFSET_HOURS * 3600 * 1000);
  return {
    y: bdt.getUTCFullYear(),
    mo: bdt.getUTCMonth(),
    d: bdt.getUTCDate(),
  };
}

// "Tomorrow 8 AM BDT" / "Today 10:30 PM BDT" / "Thu, Nov 5 2:30 AM BDT"
// ko unix timestamp (seconds) mein badalta hai. Samajh na aaye to null.
function parseWillowTime(str, ref) {
  if (!str) return null;
  const text = String(str).toLowerCase();

  const t = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (!t) return null;
  let hour = parseInt(t[1], 10) % 12;
  if (t[3] === "pm") hour += 12;
  const minute = t[2] ? parseInt(t[2], 10) : 0;

  let y = ref.y;
  let mo = ref.mo;
  let d = ref.d;

  const md = text.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b/,
  );
  if (md) {
    mo = MONTH_NAMES.indexOf(md[1]);
    d = parseInt(md[2], 10);
    // Saal nahi diya hota: reference se 6 mahine se zyada peeche ho to agla saal
    const refMs = Date.UTC(ref.y, ref.mo, ref.d);
    if (refMs - Date.UTC(y, mo, d) > 182 * 24 * 3600 * 1000) y += 1;
  } else if (/\btomorrow\b/.test(text)) {
    d += 1; // Date.UTC khud month/year aage kar deta hai
  }
  // Na din likha ho na date (jaise "7:30 AM BDT" ya "Today ...") = aaj

  const ms =
    Date.UTC(y, mo, d, hour, minute) - WILLOW_TZ_OFFSET_HOURS * 3600 * 1000;
  return Math.floor(ms / 1000);
}

// stream_url_alpha ek object hai: { "Fistly Server": "https://...mpd", ... }
// Har key = server ka naam, har value = play_url.
// (String ya array aaye to bhi chal jayega)
function getWillowLinks(value) {
  let entries = [];
  if (value && typeof value === "object" && !Array.isArray(value)) {
    entries = Object.entries(value).map(([name, url]) => ({ name, url }));
  } else if (Array.isArray(value)) {
    entries = value.map((url) => ({ name: "", url }));
  } else {
    entries = String(value || "")
      .split(/[\s,]+/)
      .map((url) => ({ name: "", url }));
  }
  return entries
    .map((e) => ({
      name: String(e.name || "").trim(),
      url: String(e.url || "").trim(),
    }))
    .filter((e) => /^https?:\/\//i.test(e.url));
}

// drm_key "1gu67868162816:8673g172381236" ->
// colon se pehle = required_referer, colon ke baad = required_referer2
function splitDrmKey(drmKey) {
  const raw = String(drmKey || "").trim();
  if (!raw) return { first: null, second: null };
  const i = raw.indexOf(":");
  if (i === -1) return { first: raw, second: null };
  return {
    first: raw.slice(0, i).trim() || null,
    second: raw.slice(i + 1).trim() || null,
  };
}

function isWillowLive(m) {
  return /live/i.test(m.status || "");
}

function transformWillowMatch(m, ref) {
  const title = (m.title || m.synopsis || "").trim() || "Unknown Match";
  const matchId = generateMatchId(`willow-${m.match_id || title}`);
  const isLive = isWillowLive(m);

  // "India tour of New Zealand 2026 - 1st ODI - New Zealand vs India"
  // -> league: "India tour of New Zealand 2026 - 1st ODI", teams: aakhri hissa
  const segments = title.split(/\s+-\s+/);
  const lastPart = segments[segments.length - 1] || "";
  let home = "";
  let away = "";
  if (/\s(vs|v)\.?\s/i.test(lastPart)) {
    const parts = lastPart.split(/\s+(?:vs|v)\.?\s+/i);
    home = (parts[0] || "").trim();
    away = (parts[1] || "").trim();
  }
  const leagueName =
    segments.length > 1 && (home || away)
      ? segments.slice(0, -1).join(" - ")
      : title;

  const { first, second } = splitDrmKey(m.drm_key);
  const links = getWillowLinks(m.stream_url_alpha);
  // Amazon wala server sab se pehle, baqi usi order mein jo source mein hai
  const isAmazon = (l) => /amazon/i.test(l.name);
  const ordered = [
    ...links.filter(isAmazon),
    ...links.filter((l) => !isAmazon(l)),
  ];

  const seenUrls = new Set();
  const streams = ordered
    .filter((l) => !seenUrls.has(l.url) && seenUrls.add(l.url))
    .map((l, i, arr) => ({
      server_name: l.name || (arr.length > 1 ? `Willow ${i + 1}` : "Willow"),
      play_url: l.url, // <- stream_url_alpha ki value
      is_new_format: true,
      required_referer: first, // <- drm_key colon se pehle
      required_referer2: second, // <- drm_key colon ke baad
    }));

  return {
    match_id: matchId,
    sport_name: "Cricket", // Willow ke sab matches cricket mein
    sport_id: getSportId("cricket"),
    slug: slugify(title, matchId),
    title: title, // <- title
    status: isLive ? "LIVE" : "NS", // <- status
    league: {
      league_name: leagueName,
      league_logo: "",
    },
    venue: "TBA",
    teams: {
      home_name: home || "Unknown",
      away_name: away || "Unknown",
      combined_logo: m.cover_image || DEFAULT_LOGO, // <- cover_image
    },
    timing: buildTiming(isLive, parseWillowTime(m.time, ref)), // <- time
    streams: streams,
  };
}

function transformWillow(data) {
  const matches = Array.isArray(data && data.Matches)
    ? data.Matches
    : Array.isArray(data)
      ? data
      : [];
  const ref = willowReferenceDate(data && data.HeaderInfo);
  return matches
    .filter(Boolean)
    .map((m) => ({ live: isWillowLive(m), out: transformWillowMatch(m, ref) }));
}

// =====================================================

function transformPlaylist(ppvData, willowData) {
  const byStart = (a, b) =>
    (a.timing.start_time_timestamp || 0) - (b.timing.start_time_timestamp || 0);

  // Source 1 (ppv.st)
  const ppvAll = ppvData
    ? extractMatches(ppvData).map((m) => ({
        live: isLiveMatch(m),
        out: transformMatch(m),
      }))
    : [];

  // ppv.st ke cricket matches hata do, cricket sirf Willow se
  const ppvFiltered = HIDE_PPV_CRICKET
    ? ppvAll.filter((x) => x.out.sport_id !== getSportId("cricket"))
    : ppvAll;

  // Source 2 (Willow) - cricket
  const willowAll = willowData ? transformWillow(willowData) : [];

  const all = [...ppvFiltered, ...willowAll];
  const liveMatches = all
    .filter((x) => x.live)
    .map((x) => x.out)
    .sort(byStart);
  const upcomingMatches = all
    .filter((x) => !x.live)
    .map((x) => x.out)
    .sort(byStart);

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
    // Dono sources ek saath fetch; ek fail ho to doosre ka data phir bhi aaye
    console.log("Fetching source JSON (ppv.st + Willow)...");
    const [ppvResult, willowResult] = await Promise.allSettled([
      fetchSourceJson(SOURCE_URL, {
        Referer: "https://ppv.st/",
        Origin: "https://ppv.st",
      }),
      fetchSourceJson(WILLOW_URL),
    ]);

    const ppvData = ppvResult.status === "fulfilled" ? ppvResult.value : null;
    const willowData =
      willowResult.status === "fulfilled" ? willowResult.value : null;

    if (!ppvData) console.error("ppv.st failed:", ppvResult.reason.message);
    if (!willowData)
      console.error("Willow failed:", willowResult.reason.message);
    if (!ppvData && !willowData) {
      throw new Error("Dono sources fail ho gaye, output update nahi hua");
    }

    console.log("Transforming to app model format...");
    const transformed = transformPlaylist(ppvData, willowData);

    fs.writeFileSync(
      OUTPUT_PATH,
      JSON.stringify(transformed, null, 2),
      "utf-8",
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
