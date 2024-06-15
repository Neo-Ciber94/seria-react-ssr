import path from "path";
import fs from "fs";
import { Manifest } from "vite";

export function getManifest() {
  const manifestPath = path.join(process.cwd(), "build/client/.vite/manifest.json");
  const text = fs.readFileSync(manifestPath, "utf8");
  return JSON.parse(text) as Manifest;
}
