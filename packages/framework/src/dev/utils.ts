import path from "path";
import fs from "fs";
import { Manifest } from "vite";

let manifest: Manifest | undefined;

export function getViteManifest() {
  if (manifest) {
    return manifest;
  }

  const manifestPath = path.join(process.cwd(), "build/client/.vite/manifest.json");
  const contents = fs.readFileSync(manifestPath, "utf8");
  manifest = JSON.parse(contents) as Manifest;
  return manifest;
}
