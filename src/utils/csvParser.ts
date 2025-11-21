import type { ConferenceData, Game } from "../types";

export function parseConferenceCsv(name: string, raw: string): ConferenceData {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { name, teams: [], games: [] };
  }

  // Expect header: Winner,WPts,Loser,LPts
  const dataLines = lines.slice(1);
  const games: Game[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const row = dataLines[i];
    // parse CSV row with 4 columns
    const parts = row.split(",");
    if (parts.length < 4) {
      console.warn(`Skipping malformed CSV row ${i + 2} in ${name}: ${row}`);
      continue;
    }
    const [winnerRaw, wPtsRaw, loserRaw, lPtsRaw] = parts;
    const winner = winnerRaw.trim();
    const loser = loserRaw.trim();

    if (!winner || !loser) {
      console.warn(`Skipping row ${i + 2} in ${name} with empty team name`);
      continue;
    }

    const wPts = wPtsRaw.trim() === "" ? null : Number(wPtsRaw.trim());
    const lPts = lPtsRaw.trim() === "" ? null : Number(lPtsRaw.trim());
    const played = wPts !== null && lPts !== null;
    const id = `${name}-${i}-${winner}-${loser}`;

    const game: Game = {
      id,
      winner: winner,
      winnerPts: wPts,
      loser: loser,
      loserPts: lPts,
      played,
    };
    games.push(game);
  }

  const teamsSet = new Set<string>();
  games.forEach((g) => {
    if (g.winner) teamsSet.add(g.winner);
    if (g.loser) teamsSet.add(g.loser);
  });

  return {
    name,
    teams: Array.from(teamsSet).sort(),
    games,
  };
}
