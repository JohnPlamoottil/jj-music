import { parseFile } from "music-metadata";
import { parse as parsePlist } from "plist";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";

const XML_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "Library Sept2026.xml",
);

const SAFE_EXTENSIONS = new Set([".mp3", ".m4a", ".wav"]);
const API_BASE = "https://kannasmusic.online";
const UPLOAD_ONE = process.argv.includes("--upload-one");
const MIME_TYPES = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
};

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

console.log("🎵 JJ Music — Apple Music XML Migration");
console.log("XML:", XML_FILE);
console.log("Mode: DRY RUN ONLY — nothing will be uploaded\n");

if (!fs.existsSync(XML_FILE)) {
  throw new Error(`Apple Music XML not found: ${XML_FILE}`);
}

function locationToPath(location) {
  if (!location) return null;

  try {
    const url = new URL(location);

    if (url.protocol !== "file:") {
      return null;
    }

    return decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
}

function firstValue(value) {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function embeddedGenre(metadata) {
  const genre = firstValue(metadata.common.genre);

  if (!genre) return null;

  if (typeof genre === "object" && genre.value) {
    return String(genre.value);
  }

  return String(genre);
}

function embeddedLyrics(metadata) {
  const lyrics = firstValue(metadata.common.lyrics);

  if (!lyrics) return null;

  if (typeof lyrics === "object" && lyrics.text) {
    return String(lyrics.text);
  }

  return String(lyrics);
}

function xmlNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function xmlText(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value);
}

async function buildTrack(xmlTrack) {
  const file = locationToPath(xmlTrack.Location);

  if (!file) {
    return { status: "missing-location", xmlTrack };
  }

  if (!fs.existsSync(file)) {
    return { status: "missing-file", file, xmlTrack };
  }

  const extension = path.extname(file).toLowerCase();

  if (!SAFE_EXTENSIONS.has(extension)) {
    return { status: "deferred-format", file, extension, xmlTrack };
  }

  let embedded = null;
  let parseError = null;

  try {
    embedded = await parseFile(file);
  } catch (error) {
    parseError = error instanceof Error ? error.message : String(error);
  }

  const fallbackTitle = path.basename(file, extension);

  /*
   * Apple Music XML is authoritative.
   * Embedded file tags are used only when XML doesn't contain the field.
   */
  const title =
    xmlText(xmlTrack.Name) ?? xmlText(embedded?.common?.title) ?? fallbackTitle;

  const artist =
    xmlText(xmlTrack.Artist) ??
    xmlText(embedded?.common?.artist) ??
    "Unknown Artist";

  const album =
    xmlText(xmlTrack.Album) ??
    xmlText(firstValue(embedded?.common?.album)) ??
    "Unknown Album";

  const genre =
    xmlText(xmlTrack.Genre) ?? (embedded ? embeddedGenre(embedded) : null);

  const year = xmlNumber(xmlTrack.Year) ?? xmlNumber(embedded?.common?.year);

  const trackNumber =
    xmlNumber(xmlTrack["Track Number"]) ??
    xmlNumber(embedded?.common?.track?.no);

  const discNumber =
    xmlNumber(xmlTrack["Disc Number"]) ?? xmlNumber(embedded?.common?.disk?.no);

  const albumArtist =
    xmlText(xmlTrack["Album Artist"]) ?? xmlText(embedded?.common?.albumartist);

  const composer =
    xmlText(xmlTrack.Composer) ??
    (Array.isArray(embedded?.common?.composer)
      ? embedded.common.composer.join(", ")
      : xmlText(embedded?.common?.composer));

  const duration =
    xmlNumber(xmlTrack["Total Time"]) !== null
      ? xmlNumber(xmlTrack["Total Time"]) / 1000
      : Number(embedded?.format?.duration ?? 0);

  const lyrics =
    xmlText(xmlTrack.Lyrics) ?? (embedded ? embeddedLyrics(embedded) : null);

  const picture = embedded?.common?.picture?.[0] ?? null;

  return {
    status: "ready",
    trackId: String(xmlTrack["Track ID"]),
    persistentId: xmlText(xmlTrack["Persistent ID"]),
    file,
    extension,
    originalFilename: path.basename(file),

    title,
    artist,
    album,
    genre,
    year,
    trackNumber,
    discNumber,
    albumArtist,
    composer,
    duration,
    lyrics,

    playCount: xmlNumber(xmlTrack["Play Count"]) ?? 0,
    skipCount: xmlNumber(xmlTrack["Skip Count"]) ?? 0,
    rating: xmlNumber(xmlTrack.Rating),
    comments: xmlText(xmlTrack.Comments),
    dateAdded: xmlTrack["Date Added"] ?? null,
    lastPlayedAt: xmlTrack["Play Date UTC"] ?? null,

    fileSize: fs.statSync(file).size,
    mimeType: MIME_TYPES[extension],

    hasArtwork: Boolean(picture),
    artwork: picture,

    parseError,
  };
}

console.log("📖 Reading Apple Music XML...");

const xmlTextData = fs.readFileSync(XML_FILE, "utf8");
const library = parsePlist(xmlTextData);

const xmlTracks = Object.values(library.Tracks ?? {});
const playlists = library.Playlists ?? [];

console.log(`XML tracks: ${xmlTracks.length}`);
console.log(`XML playlists: ${playlists.length}\n`);

const results = [];

for (let i = 0; i < xmlTracks.length; i += 1) {
  const result = await buildTrack(xmlTracks[i]);
  results.push(result);

  if ((i + 1) % 100 === 0 || i + 1 === xmlTracks.length) {
    process.stdout.write(`\rInspecting tracks: ${i + 1}/${xmlTracks.length}`);
  }
}

console.log("\n");

const ready = results.filter((item) => item.status === "ready");
const missing = results.filter((item) => item.status === "missing-file");
const missingLocation = results.filter(
  (item) => item.status === "missing-location",
);
const deferred = results.filter((item) => item.status === "deferred-format");

const artworkCount = ready.filter((item) => item.hasArtwork).length;
const lyricsCount = ready.filter((item) => item.lyrics).length;
const parseErrors = ready.filter((item) => item.parseError);

const extensionCounts = {};

for (const item of ready) {
  extensionCounts[item.extension] = (extensionCounts[item.extension] ?? 0) + 1;
}

console.log("========================================");
console.log("JJ MUSIC MIGRATION DRY-RUN REPORT");
console.log("========================================");
console.log(`Ready to migrate:       ${ready.length}`);
console.log(`Missing local files:    ${missing.length}`);
console.log(`Missing locations:      ${missingLocation.length}`);
console.log(`Deferred formats:       ${deferred.length}`);
console.log(`Embedded artwork:       ${artworkCount}`);
console.log(`Lyrics available:       ${lyricsCount}`);
console.log(`Metadata parse errors:  ${parseErrors.length}`);

console.log("\nREADY FORMATS");

for (const [extension, count] of Object.entries(extensionCounts).sort()) {
  console.log(`${extension.padEnd(8)} ${count}`);
}

console.log("\nFIRST 15 READY TRACKS");
console.log("----------------------------------------");

for (const [index, track] of ready.slice(0, 15).entries()) {
  console.log(`${index + 1}. ${track.title} — ${track.artist}`);

  console.log(
    `   album=${track.album} | year=${track.year ?? "n/a"} | ` +
      `plays=${track.playCount} | artwork=${track.hasArtwork ? "yes" : "no"} | ` +
      `lyrics=${track.lyrics ? "yes" : "no"}`,
  );
}

if (deferred.length > 0) {
  const deferredCounts = {};

  for (const item of deferred) {
    deferredCounts[item.extension] = (deferredCounts[item.extension] ?? 0) + 1;
  }

  console.log("\nDEFERRED FORMATS");

  for (const [extension, count] of Object.entries(deferredCounts).sort()) {
    console.log(`${extension.padEnd(8)} ${count}`);
  }
}

if (parseErrors.length > 0) {
  console.log("\nFIRST METADATA PARSE ERRORS");

  for (const item of parseErrors.slice(0, 10)) {
    console.log(`- ${item.file}`);
    console.log(`  ${item.parseError}`);
  }
}

console.log("\nPLAYLIST PREVIEW");
console.log("----------------------------------------");

for (const playlist of playlists.slice(0, 20)) {
  console.log(
    `${playlist.Name ?? "Unnamed Playlist"} — ` +
      `${playlist["Playlist Items"]?.length ?? 0} tracks`,
  );
}

console.log("\n✅ Dry run complete.");
if (UPLOAD_ONE) {
  console.log("\n🧪 One-song upload mode selected.");
} else {
  console.log("\n🔒 Dry-run only. No upload mode was selected.");
}
console.log("No login occurred.");
console.log("No MongoDB records were created.");
console.log("No S3 files were uploaded.");
console.log("No playlists were changed.");
