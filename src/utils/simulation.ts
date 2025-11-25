import type { ConferenceData, Game, Scenario, TeamRecord } from "@types";
import { MAX_SIMULATION } from "@constants";
import { computeStandings } from "@standings";
import { applyTieBreakers } from "@tiebreakers";

export function getUnplayedGames(conf: ConferenceData): Game[] {
  return conf.games.filter((g) => !g.played);
}

export function simulateConference(conf: ConferenceData): Scenario[] {
  const unplayed = getUnplayedGames(conf);
  const n = unplayed.length;
  if (n === 0) {
    const finalStandings = computeStandings(conf);
    const topTwo = finalStandings.slice(0, 2).map((r) => r.team);
    return [{ gameResults: [], finalStandings, topTwo }];
  }

  // Enforce MAX_SIMULATION limit
  if (n > MAX_SIMULATION) {
    console.warn(
      `Too many unplayed games (${n} > ${MAX_SIMULATION}). Simulation skipped.`
    );
    return [];
  }

  const limit = n; // Use all games since we've checked the limit
  const scenarios: Scenario[] = [];
  const total = 1 << limit;

  for (let mask = 0; mask < total; mask++) {
    const gameResults: boolean[] = [];
    // clone games
    const gamesClone: Game[] = conf.games.map((g) => ({ ...g }));
    for (let i = 0; i < limit; i++) {
      const g = unplayed[i];
      const bit = ((mask >> i) & 1) === 1;
      // if bit true, we give result to winner position in CSV (first team); else to loser position
      // For unplayed, winner/loser is in CSV but not played. So bit true means the first column team wins.
      const winnerTeam = bit ? g.winner : g.loser;
      const loserTeam = bit ? g.loser : g.winner;
      // Update clone games
      const idx = gamesClone.findIndex((gc) => gc.id === g.id);
      if (idx >= 0) {
        gamesClone[idx] = {
          ...g,
          played: true,
          winner: winnerTeam ?? null,
          loser: loserTeam ?? null,
        };
      }
      gameResults.push(bit);
    }
    const newConf = { ...conf, games: gamesClone };
    let finalStandings = computeStandings(newConf);
    // detect ties by conference win pct
    const resolved: TeamRecord[] = [];
    const appliedRules: string[] = [];
    let i = 0;
    while (i < finalStandings.length) {
      const cur = finalStandings[i];
      const tiedGroup = [cur.team];
      i++;
      while (
        i < finalStandings.length &&
        finalStandings[i].confWins === cur.confWins
      ) {
        tiedGroup.push(finalStandings[i].team);
        i++;
      }
      if (tiedGroup.length > 1) {
        // Pass ALL conference games, not just games involving the tied group
        // This is needed for tiebreakers like "combined opponent win %"
        const resolvedResult = applyTieBreakers(
          newConf.name,
          tiedGroup,
          newConf.games,
          finalStandings
        );
        appliedRules.push(...resolvedResult.applied);
        resolvedResult.order.forEach((t) => {
          const rec = finalStandings.find((r) => r.team === t);
          if (rec) resolved.push(rec);
        });
      } else {
        resolved.push(cur);
      }
    }
    finalStandings = resolved as TeamRecord[];
    const topTwo = finalStandings.slice(0, 2).map((r) => r.team);
    // If there are ties, attempt applying tie breakers
    // Find top groups
    scenarios.push({
      gameResults,
      finalStandings,
      topTwo,
      appliedTieRules: [...new Set(appliedRules)],
    });
  }
  return scenarios;
}
