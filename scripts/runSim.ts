import { conferenceRawMap } from "../src/utils/dataLoader";
import { parseConferenceCsv } from "../src/utils/csvParser";
import { simulateConference } from "../src/utils/simulation";

const confKey = process.argv[2] || "AAC";
const raw = (conferenceRawMap as Record<string, string>)[confKey];
if (!raw) {
  console.error("No conference found:", confKey);
  process.exit(1);
}
const conf = parseConferenceCsv(confKey, raw);
const scenarios = simulateConference(conf);
console.log("Scenarios for", confKey, scenarios.length);
const counts: Record<string, number> = {};
scenarios.forEach((sc) => {
  sc.topTwo.forEach((t) => (counts[t] = (counts[t] || 0) + 1));
});
console.log("Top2 counts:");
Object.entries(counts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([t, c]) => console.log(t, c));
