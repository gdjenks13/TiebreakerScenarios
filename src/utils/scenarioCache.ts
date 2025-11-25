import type { Scenario, ConferenceData, Game } from "../types";
import { simulateConference, getUnplayedGames } from "./simulation";
import { parseConferenceCsv } from "./csvParser";
import { conferenceRawMap } from "./dataLoader";

export type CachedScenarioData = {
  scenarios: Scenario[];
  csvHash: string;
  generatedAt: string;
  unplayedGames: Game[];
};

export type ScenarioCacheState = {
  data: CachedScenarioData | null;
  loading: boolean;
  error: string | null;
};

// Simple hash function for browser (djb2 algorithm)
function hashContent(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = (hash * 33) ^ content.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

// Storage key for localStorage
function getStorageKey(confKey: string): string {
  return `scenario_cache_${confKey}`;
}

// Check if cache is valid for a conference
export function isCacheValid(confKey: string): boolean {
  const raw = conferenceRawMap[confKey];
  if (!raw) return false;

  const storageKey = getStorageKey(confKey);
  const cached = localStorage.getItem(storageKey);

  if (!cached) return false;

  try {
    const data: CachedScenarioData = JSON.parse(cached);
    const currentHash = hashContent(raw);
    return data.csvHash === currentHash;
  } catch {
    return false;
  }
}

// Load scenarios from cache
export function loadFromCache(confKey: string): CachedScenarioData | null {
  const storageKey = getStorageKey(confKey);
  const cached = localStorage.getItem(storageKey);

  if (!cached) return null;

  try {
    return JSON.parse(cached) as CachedScenarioData;
  } catch {
    return null;
  }
}

// Save scenarios to cache
export function saveToCache(
  confKey: string,
  scenarios: Scenario[],
  unplayedGames: Game[]
): void {
  const raw = conferenceRawMap[confKey];
  if (!raw) return;

  const data: CachedScenarioData = {
    scenarios,
    csvHash: hashContent(raw),
    generatedAt: new Date().toISOString(),
    unplayedGames,
  };

  const storageKey = getStorageKey(confKey);
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed to save cache for ${confKey}:`, e);
  }
}

// Generate scenarios for a conference
export function generateScenarios(confKey: string): {
  scenarios: Scenario[];
  conference: ConferenceData;
  unplayedGames: Game[];
} | null {
  const raw = conferenceRawMap[confKey];
  if (!raw) return null;

  const conference = parseConferenceCsv(confKey, raw);
  const scenarios = simulateConference(conference);
  const unplayedGames = getUnplayedGames(conference);

  return { scenarios, conference, unplayedGames };
}

// Load or generate scenarios for a conference
export async function loadOrGenerateScenarios(
  confKey: string
): Promise<CachedScenarioData | null> {
  // Check if we have valid cache
  if (isCacheValid(confKey)) {
    const cached = loadFromCache(confKey);
    if (cached) {
      console.log(`✓ Loaded ${confKey} scenarios from cache`);
      return cached;
    }
  }

  // Generate new scenarios
  console.log(`⚡ Generating scenarios for ${confKey}...`);

  const result = generateScenarios(confKey);
  if (!result) return null;

  const { scenarios, unplayedGames } = result;

  // Save to cache
  saveToCache(confKey, scenarios, unplayedGames);
  console.log(
    `✓ Saved ${confKey} scenarios to cache (${scenarios.length} scenarios)`
  );

  const raw = conferenceRawMap[confKey];
  return {
    scenarios,
    csvHash: hashContent(raw),
    generatedAt: new Date().toISOString(),
    unplayedGames,
  };
}

// Get all conference keys
export function getAllConferenceKeys(): string[] {
  return Object.keys(conferenceRawMap);
}

// Clear cache for a specific conference
export function clearCache(confKey: string): void {
  const storageKey = getStorageKey(confKey);
  localStorage.removeItem(storageKey);
}

// Clear all caches
export function clearAllCaches(): void {
  getAllConferenceKeys().forEach(clearCache);
}
