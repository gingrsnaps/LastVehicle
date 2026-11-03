/** Offline integrity/syntax check, not a substitute for a WebGL playtest. */
import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const f of fs.readdirSync(path.join(root, "dist/js")))
  if (f.endsWith(".js"))
    execFileSync(process.execPath, ["--check", path.join(root, "dist/js", f)]);
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "dist/assets/assets-manifest.json"), "utf8"),
);
// Source changes are expected, but redistributed public assets must match the
// recorded provenance unless their processing/manifest is deliberately updated.
for (const asset of manifest.assets) {
  const file = path.resolve(root, "dist/assets", asset.file);
  if (!file.startsWith(path.join(root, "dist/assets") + path.sep))
    throw Error("Invalid asset path");
  const hash = createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  if (hash !== asset.sha256)
    throw Error("Asset differs from manifest: " + asset.file);
}
for (const f of [
  "index.html",
  "style.css",
  "vendor/babylon.js",
  "vendor/babylonjs.loaders.min.js",
  "assets/models/Textures/colormap.png",
  "assets/audio/music.ogg",
  "assets/CREDITS.md",
])
  if (!fs.existsSync(path.join(root, "dist", f))) throw Error("Missing " + f);
for (const name of [
  "ambience",
  "music",
  "metal",
  "rattle",
  "footstep",
  "alarm",
  "scare",
  "service",
  "tension",
  "hatch-impact",
  "door-close",
  "unease", "aftermath", "creature-breath", "creature-attack", "creature-recover", "surge",
])
  if (
    fs.statSync(path.join(root, "dist/assets/audio", name + ".ogg")).size < 100
  )
    throw Error("Empty audio: " + name);
console.log(
  "JavaScript syntax, runtime entry points, texture dependency, and audio files: PASS.",
);
