import { parseFile } from "music-metadata";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const MUSIC_FOLDER = "/Users/johnplamoottil/Music/iTunes/iTunes Media/Music";

const API_BASE = "https://kannasmusic.online";

const AUDIO_EXTENSIONS = new Set([".mp3", ".m4a", ".aac", ".wav"]);

console.log("🎵 JJ Music — iTunes Importer");
console.log("Music folder:", MUSIC_FOLDER);
console.log("JJ Music:", API_BASE);
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

const audioFiles = findAudioFiles(MUSIC_FOLDER);

console.log(`\nFound ${audioFiles.length} audio files.`);
for (const [index, file] of audioFiles.entries()) {
  try {
    const metadata = await parseFile(file);

    const title =
      metadata.common.title || path.basename(file, path.extname(file));

    const artist = metadata.common.artist || "Unknown Artist";

    console.log(`${index + 1}. ${title} — ${artist}`);
  } catch (error) {
    console.log(`${index + 1}. ERROR reading ${path.basename(file)}`);
  }
}
