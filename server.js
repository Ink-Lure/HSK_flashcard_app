const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");

// ── Serve static frontend ───────────────────────────
app.use(express.static(path.join(__dirname, "public")));

// ── CSV parser (handles quoted fields) ──────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    rows.push(parseCSVLine(line));
  }
  return rows;
}

function parseCSVLine(line) {
  const fields = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { fields.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

// ── Read & parse a level CSV ─────────────────────────
function readLevel(n) {
  const filePath = path.join(DATA_DIR, `hsk${n}.csv`);
  if (!fs.existsSync(filePath)) return null;
  const text = fs.readFileSync(filePath, "utf-8");
  const rows = parseCSV(text);
  return rows.map(([h, p, e]) => ({ h, p, e }));
}

// ── API: list available levels ───────────────────────
app.get("/api/levels", (req, res) => {
  const levels = [];
  for (let i = 1; i <= 9; i++) {
    if (fs.existsSync(path.join(DATA_DIR, `hsk${i}.csv`))) {
      levels.push(i);
    }
  }
  res.json(levels);
});

// ── API: get words for a level or all ────────────────
app.get("/api/words", (req, res) => {
  const { level } = req.query; // "1" | "2" | … | "all"

  if (level === "all") {
    const words = [];
    for (let i = 1; i <= 9; i++) {
      const w = readLevel(i);
      if (w) words.push(...w);
    }
    res.json(words);
    return;
  }

  const n = parseInt(level, 10);
  if (isNaN(n) || n < 1 || n > 9) {
    res.status(400).json({ error: "Invalid level" });
    return;
  }

  const words = readLevel(n);
  if (!words) {
    res.status(404).json({ error: `hsk${n}.csv not found` });
    return;
  }

  res.json(words);
});

// ── Start ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`HSK Flashcards running at http://localhost:${PORT}`);
});