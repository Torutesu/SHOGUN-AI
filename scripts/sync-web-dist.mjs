import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dest = path.join(root, "web-dist");

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dst, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

rmrf(dest);
fs.mkdirSync(dest, { recursive: true });
fs.copyFileSync(path.join(root, "SHOGUN Hi-Fi UI.html"), path.join(dest, "index.html"));
copyDir(path.join(root, "hifi"), path.join(dest, "hifi"));
console.log("web-dist synced:", dest);
