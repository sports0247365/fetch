/**
 * transform.js
 * -------------------------------------------------
 * 1. Source URL se JSON fetch karta hai
 * 2. Field names ko apni marzi ke custom names dega
 * 3. Naya JSON "output.json" file mein save karega
 *
 * Field name mapping neeche "mapping" section mein hai.
 * Jo naam badalna hai, sirf wahan edit karein — baaki
 * code chhedne ki zarurat nahi.
 * -------------------------------------------------
 */

const fs = require("fs");
const path = require("path");

// ============ CONFIG ============
const SOURCE_URL =
  "https://raw.githubusercontent.com/srhady/bingstream/refs/heads/main/playlist.json";

const OUTPUT_PATH = path.join(__dirname, "..", "output.json");
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

/**
 * Yahan aap apne custom field names define karte hain.
 * Left side = original JSON ka key
 * Right side = aapka pasand ka naya key
 */
function transformStream(stream) {
  return {
    server: stream.server_name,
    url: stream.play_url,
  };
}

function transformChannel(ch) {
  return {
    category: ch["Category"],
    league: ch["League"],
    home_team: ch["Team 1 Name"],
    away_team: ch["Team 2 Name"],
    home_logo: ch["Team 1 Logo"],
    away_logo: ch["Team 2 Logo"],
    title: ch["Match Title"],
    poster: ch["Match Poster"],
    status: ch["Match Status"],
    start_time: ch["Start Time"],
    user_agent: ch["User-Agent"],
    referer: ch["Referer"],
    streams: Array.isArray(ch["Stream URL"])
      ? ch["Stream URL"].map(transformStream)
      : [],
  };
}

function transformPlaylist(data) {
  const info = data.playlist_info || {};

  return {
    meta: {
      playlist_name: info.name || null,
      telegram_channel: info.telegram || null,
      created_by: info.owner || null,
      source_updated_at: info.last_update_time || null,
      generated_at: new Date().toISOString(),
    },
    note: data.special_note || null,
    matches: Array.isArray(data.channels)
      ? data.channels.map(transformChannel)
      : [],
  };
}

async function main() {
  try {
    console.log("Fetching source JSON...");
    const sourceData = await fetchSourceJson(SOURCE_URL);

    console.log("Transforming...");
    const transformed = transformPlaylist(sourceData);

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(transformed, null, 2), "utf-8");
    console.log(`Saved to ${OUTPUT_PATH}`);
    console.log(`Total matches: ${transformed.matches.length}`);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
