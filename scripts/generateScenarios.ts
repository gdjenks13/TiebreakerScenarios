/**
 * Script to check scenario cache status for all conferences.
 * The actual scenario generation happens at runtime in the browser
 * because the tiebreaker logic is complex and imports browser-only modules.
 *
 * Run with: bun run scripts/generateScenarios.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// Import the CSV files
const dataDir = path.join(process.cwd(), "src/data");
const cacheDir = path.join(dataDir, "cache");

// Ensure cache directory exists
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

// Conference CSV files
const conferences = ["aac", "acc", "big10", "big12", "sec"];

// Hash CSV content to detect changes
function hashContent(content: string): string {
  return crypto.createHash("md5").update(content).digest("hex");
}

async function main() {
  console.log("🏈 Tiebreaker Scenarios - Cache Status Check\n");
  console.log("Checking CSV files for changes...\n");

  for (const conf of conferences) {
    const csvPath = path.join(dataDir, `${conf}.csv`);

    if (!fs.existsSync(csvPath)) {
      console.log(`⚠️  ${conf.toUpperCase()}: CSV file not found`);
      continue;
    }

    const csvContent = fs.readFileSync(csvPath, "utf-8");
    const hash = hashContent(csvContent);

    // Count lines to show game count
    const lines = csvContent.trim().split("\n");
    const gameCount = lines.length - 1; // Subtract header

    console.log(
      `✓  ${conf.toUpperCase()}: ${gameCount} games (hash: ${hash.substring(
        0,
        8
      )}...)`
    );
  }

  console.log("\n📝 Note: Scenarios are cached in browser localStorage.");
  console.log("   They will be regenerated automatically if CSV data changes.");
  console.log("\n✅ Ready to start dev server!\n");
}

main().catch(console.error);
