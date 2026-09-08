import { parseFile } from "music-metadata";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const MUSIC_FOLDER = "/Users/johnplamoottil/Music/iTunes/iTunes Media/Music";
const ITUNES_LIBRARY_PATHS = [
  "/Users/johnplamoottil/Music/iTunes/iTunes Library.xml",
  "/Users/johnplamoottil/Music/iTunes/iTunes Library.itl",
  "/Users/johnplamoottil/Music/iTunes/iTunes Library Extras.itdb",
  "/Users/johnplamoottil/Music/iTunes/iTunes Library Genius.itdb",
];

const API_BASE = "https://kannasmusic.online";
const AUDIO_EXTENSIONS = new Set([".mp3"]);
const DRY_RUN = process.argv.includes("--dry-run");

console.log("🎵 JJ Music — iTunes Importer");
console.log("Music folder:", MUSIC_FOLDER);
console.log("JJ Music:", API_BASE);

const detectedLibraryFiles = ITUNES_LIBRARY_PATHS.filter((file) =>
  fs.existsSync(file),
);

if (detectedLibraryFiles.length === 0) {
  console.log("iTunes metadata: no XML or library files detected in ~/Music/iTunes");
} else {
  console.log(
    "iTunes metadata files detected:",
    detectedLibraryFiles.map((file) => path.basename(file)).join(", "),
  );

  if (!detectedLibraryFiles.some((file) => file.toLowerCase().endsWith(".xml"))) {
    console.log(
      "Note: the current iTunes library file appears to be a binary .itl database, not a playlist XML export.",
    );
    console.log(
      "Playlist migration still needs to inspect the actual iTunes database structure before implementation.",
    );
  }
}

function findAudioFiles(folder) {
  const files = [];

  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const fullPath = path.join(folder, entry.name);

    if (entry.isDirectory()) {
      files.push(...findAudioFiles(fullPath));
    } else if (AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

function getAlbumTag(tagValue) {
  if (!tagValue) return "Uploaded Library";
  if (Array.isArray(tagValue)) return tagValue[0] ?? "Uploaded Library";
  return String(tagValue);
}

function getGenreTag(tagValue) {
  if (!tagValue) return "Unknown Genre";
  if (Array.isArray(tagValue)) return tagValue[0]?.value ?? tagValue[0] ?? "Unknown Genre";
  return typeof tagValue === "string" ? tagValue : tagValue.value ?? "Unknown Genre";
}

function getLyrics(metadata) {
  const lyrics = metadata.common.lyrics;
  if (!lyrics || lyrics.length === 0) return null;
  return lyrics[0]?.text ?? lyrics[0] ?? null;
}

async function inspectAudioFile(file) {
  const metadata = await parseFile(file);
  const title = metadata.common.title || path.basename(file, path.extname(file));
  const artist = metadata.common.artist || "Unknown Artist";
  const album = getAlbumTag(metadata.common.album);
  const genre = getGenreTag(metadata.common.genre);
  const trackNumber = metadata.common.track?.no ?? null;
  const discNumber = metadata.common.disk?.no ?? null;
  const albumArtist = metadata.common.albumartist ?? null;
  const duration = Number(metadata.format.duration ?? 0);
  const picture = metadata.common.picture?.[0] ?? null;

  return {
    file,
    title,
    artist,
    album,
    genre,
    year: metadata.common.year ?? null,
    trackNumber,
    discNumber,
    albumArtist,
    duration,
    hasArtwork: Boolean(picture),
    lyrics: getLyrics(metadata),
    fileSize: fs.statSync(file).size,
    mimeType: metadata.format.mimeType ?? "audio/mpeg",
    originalFilename: path.basename(file),
  };
}

const audioFiles = findAudioFiles(MUSIC_FOLDER);

console.log(`\nFound ${audioFiles.length} audio files.`);

if (audioFiles.length === 0) {
  console.log("No MP3 files were found under the configured iTunes Music folder.");
  process.exit(0);
}

const previewFiles = await Promise.all(
  audioFiles.slice(0, 12).map(async (file) => inspectAudioFile(file)),
);

for (const [index, item] of previewFiles.entries()) {
  const safeIndex = index + 1;
  console.log(
    `${safeIndex}. ${item.title} — ${item.artist} | album=${item.album} | year=${item.year ?? "n/a"} | artwork=${item.hasArtwork ? "yes" : "no"} | lyrics=${item.lyrics ? "yes" : "no"}`,
  );
}

if (audioFiles.length > previewFiles.length) {
  console.log(`... and ${audioFiles.length - previewFiles.length} additional files remain to inspect.`);
}

if (DRY_RUN) {
  console.log("\nDry-run mode: no upload or login was attempted.");
  process.exit(0);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

console.log("\n🔐 JJ Music Login");
const email = await ask("Email: ");
const password = await new Promise((resolve) => {
  process.stdout.write("Password: ");
  process.stdin.setRawMode(true);

  let value = "";

  const onData = (char) => {
    const key = char.toString();

    if (key === "\r" || key === "\n") {
      process.stdin.setRawMode(false);
      process.stdin.removeListener("data", onData);
      process.stdout.write("\n");
      resolve(value);
    } else if (key === "\u0003") {
      process.stdin.setRawMode(false);
      process.exit();
    } else if (key === "\u007f") {
      value = value.slice(0, -1);
    } else {
      value += key;
    }
  };

  process.stdin.on("data", onData);
});

console.log(`\nLogin credentials received for: ${email}`);
rl.close();

console.log("\n🔄 Logging in...");

const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: email.trim(),
    password,
  }),
});

if (!loginResponse.ok) {
  const errorText = await loginResponse.text();
  throw new Error(`Login failed (${loginResponse.status}): ${errorText}`);
}

const sessionCookie = loginResponse.headers.get("set-cookie");

if (!sessionCookie) {
  throw new Error("Login succeeded but no session cookie was returned.");
}

console.log("✅ Logged into JJ Music successfully.");

console.log("\n🧪 Preparing first MP3 for test upload...");

const testFile = audioFiles[0];
const testMetadata = await parseFile(testFile);
const title =
  testMetadata.common.title || path.basename(testFile, path.extname(testFile));
const artist = testMetadata.common.artist || "Unknown Artist";
const album = getAlbumTag(testMetadata.common.album);

console.log("File:", path.basename(testFile));
console.log("Title:", title);
console.log("Artist:", artist);
console.log("Album:", album);
console.log("Duration:", Number(testMetadata.format.duration ?? 0));
console.log("Artwork:", testMetadata.common.picture?.length ? "YES" : "NO");

console.log("\n⬆️ Uploading test song to JJ Music...");

const form = new FormData();

form.append(
  "audio",
  new Blob([fs.readFileSync(testFile)], { type: "audio/mpeg" }),
  path.basename(testFile),
);

const picture = testMetadata.common.picture?.[0];

if (picture) {
  const artworkType =
    picture.format === "image/png"
      ? "image/png"
      : picture.format === "image/webp"
        ? "image/webp"
        : "image/jpeg";

  const artworkExtension =
    artworkType === "image/png"
      ? ".png"
      : artworkType === "image/webp"
        ? ".webp"
        : ".jpg";

  form.append(
    "artwork",
    new Blob([picture.data], { type: artworkType }),
    `cover${artworkExtension}`,
  );
}

form.append(
  "metadata",
  JSON.stringify({
    title,
    artist,
    album,
    genre: getGenreTag(testMetadata.common.genre),
    year: testMetadata.common.year ?? null,
    trackNumber: testMetadata.common.track?.no ?? null,
    discNumber: testMetadata.common.disk?.no ?? null,
    albumArtist: testMetadata.common.albumartist ?? null,
    composer: testMetadata.common.composer?.join?.(", ") ?? null,
    duration: Number(testMetadata.format.duration ?? 0),
    lyrics: getLyrics(testMetadata),
  }),
);

const uploadResponse = await fetch(`${API_BASE}/api/upload`, {
  method: "POST",
  headers: {
    Cookie: sessionCookie.split(";")[0],
  },
  body: form,
});

if (!uploadResponse.ok) {
  const errorText = await uploadResponse.text();
  throw new Error(`Upload failed (${uploadResponse.status}): ${errorText}`);
}

const uploadedSong = await uploadResponse.json();

console.log(
  `✅ Uploaded: ${uploadedSong.data.title} — ${uploadedSong.data.artist}`,
);

console.log(`🖼️ Artwork: ${uploadedSong.data.artworkUrl ? "YES" : "NO"}`);
