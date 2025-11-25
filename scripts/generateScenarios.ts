/**
 * Script to generate scenario cache files for all conferences.
 *
 * REQUIRED: Run this before starting the dev server.
 * Usage: bun run generate
 */

import * as fs from "fs";
import * as path from "path";

import { parseConferenceCsv } from "../src/utils/csvParser";
import { simulateConference, getUnplayedGames } from "../src/utils/simulation";
import { analyzeAllTeamRequirements } from "../src/utils/scenarioAnalysis";

const DATA_DIR = path.join(process.cwd(), "src/data");
const CACHE_DIR = path.join(DATA_DIR, "cache");

// Conference key -> CSV filename mapping
const CONFERENCES: Record<string, string> = {
  AAC: "aac.csv",
  ACC: "acc.csv",
  Big10: "big10.csv",
  Big12: "big12.csv",
  SEC: "sec.csv",
};

function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function generateConference(confKey: string, csvFile: string): void {
  const csvPath = path.join(DATA_DIR, csvFile);

  if (!fs.existsSync(csvPath)) {
    console.log(`⚠️  ${confKey}: CSV file not found (${csvFile})`);
    return;
  }

  console.log(`⚡ ${confKey}: Generating scenarios...`);

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const conference = parseConferenceCsv(confKey, csvContent);
  const scenarios = simulateConference(conference);
  const unplayedGames = getUnplayedGames(conference);

  console.log(`   ⚡ Analyzing team requirements...`);
  const teamRequirementsMap = analyzeAllTeamRequirements(
    scenarios,
    unplayedGames,
    conference.teams
  );

  // Convert Map to plain object for JSON serialization
  // Also convert Set to Array for scenarioIndices
  const teamRequirements: Record<string, unknown> = {};
  for (const [team, req] of teamRequirementsMap) {
    teamRequirements[team] = {
      ...req,
      sufficientConditions: req.sufficientConditions.map((c) => ({
        ...c,
        scenarioIndices: c.scenarioIndices
          ? Array.from(c.scenarioIndices)
          : undefined,
      })),
      blockingConditions: req.blockingConditions.map((c) => ({
        ...c,
        scenarioIndices: c.scenarioIndices
          ? Array.from(c.scenarioIndices)
          : undefined,
      })),
    };
  }

  const cacheData = {
    scenarios,
    generatedAt: new Date().toISOString(),
    unplayedGames,
    teamRequirements,
  };

  const cachePath = path.join(
    CACHE_DIR,
    `${confKey.toLowerCase()}_scenarios.json`
  );
  fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));

  console.log(
    `   ✓ ${scenarios.length} scenarios saved to ${path.basename(cachePath)}`
  );
}

function main(): void {
  console.log("🏈 Generating Tiebreaker Scenarios\n");

  ensureCacheDir();

  for (const [confKey, csvFile] of Object.entries(CONFERENCES)) {
    generateConference(confKey, csvFile);
  }

  console.log("\n✅ All scenarios generated!");
  console.log("   Run 'bun run dev' to start the app.\n");
}

main();
