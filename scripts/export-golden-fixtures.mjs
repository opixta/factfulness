#!/usr/bin/env node
/**
 * Exports fixtures/golden_evidence.json from mobile seed evidence (c1,c2,c3).
 * Run from repo root: node scripts/export-golden-fixtures.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// Minimal static export matching mobile seed (URL evidence only for golden scoring)
const golden = {
  c1: [
    { id: "e1", url: "https://www.iea.org/", stance: "false", trust: 14 },
    { id: "e2", url: "https://www.kpx.or.kr/", stance: "false", trust: 11 },
    { id: "e3", url: "https://example.com/blog", stance: "true", trust: 2 },
  ],
  c2: [
    { id: "e4", url: "https://www.irena.org/", stance: "true", trust: 9 },
    { id: "e5", url: "https://www.motie.go.kr/", stance: "true", trust: 7 },
    { id: "e6", url: "https://example.com/op-ed", stance: "false", trust: 4 },
  ],
  c3: [
    { id: "e7", url: "https://example.com/defs", stance: "false", trust: 5 },
  ],
};

const out = path.join(repoRoot, "fixtures", "golden_evidence.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(golden, null, 2) + "\n", "utf8");
console.log("Wrote", out);
