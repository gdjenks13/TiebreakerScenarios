import type { ConferenceData, Game, TeamRecord } from "@types";
import { computeStandings } from "@standings";
import { applyTieBreakers } from "@tiebreakers";
import { MAX_SIMULATION } from "@constants";

export type MinimalCondition = {
  gameOutcomes: Array<{ game: Game; mustWin: string }>;
  probability: number;
};

export type MinimalScenariosResult = {
  team: string;
  canFinishTop2: boolean;
  minimalConditions: MinimalCondition[];
  allConditions: MinimalCondition[];
};

/**
 * Find minimal conditions for a team to finish in the top 2
 * Uses a greedy approach to find the smallest set of required game outcomes
 */
export function findMinimalTop2Scenarios(
  conf: ConferenceData,
  targetTeam: string
): MinimalScenariosResult {
  const unplayed = conf.games.filter((g) => !g.played);

  if (unplayed.length === 0) {
    // No unplayed games - check current standings
    const standings = computeStandings(conf);
    const resolvedStandings = resolveStandings(conf, standings);
    const rank = resolvedStandings.findIndex((r) => r.team === targetTeam);

    return {
      team: targetTeam,
      canFinishTop2: rank < 2,
      minimalConditions: [],
      allConditions: [],
    };
  }

  // Check if too many games
  if (unplayed.length > MAX_SIMULATION) {
    console.warn(
      `Too many unplayed games (${unplayed.length} > ${MAX_SIMULATION}). Analysis skipped.`
    );
    return {
      team: targetTeam,
      canFinishTop2: false,
      minimalConditions: [],
      allConditions: [],
    };
  }

  const n = unplayed.length;
  const allConditions: MinimalCondition[] = [];

  // Try all possible outcomes (2^n combinations)
  for (let mask = 0; mask < 1 << n; mask++) {
    const gamesClone: Game[] = conf.games.map((g) => ({ ...g }));
    const gameOutcomes: Array<{ game: Game; mustWin: string }> = [];

    // Apply this scenario
    for (let i = 0; i < n; i++) {
      const g = unplayed[i];
      const bit = ((mask >> i) & 1) === 1;
      const winnerTeam = bit ? g.winner : g.loser;
      const loserTeam = bit ? g.loser : g.winner;

      const idx = gamesClone.findIndex((gc) => gc.id === g.id);
      if (idx >= 0) {
        gamesClone[idx] = {
          ...g,
          played: true,
          winner: winnerTeam ?? null,
          loser: loserTeam ?? null,
        };

        gameOutcomes.push({
          game: g,
          mustWin: winnerTeam!,
        });
      }
    }

    const newConf = { ...conf, games: gamesClone };
    const standings = computeStandings(newConf);
    const resolvedStandings = resolveStandings(newConf, standings);

    // Check if target team is in top 2
    const rank = resolvedStandings.findIndex((r) => r.team === targetTeam);
    if (rank < 2) {
      // Calculate probability (assuming each game is 50/50)
      const probability = Math.pow(0.5, n);
      allConditions.push({ gameOutcomes, probability });
    }
  }

  if (allConditions.length === 0) {
    return {
      team: targetTeam,
      canFinishTop2: false,
      minimalConditions: [],
      allConditions: [],
    };
  }

  // Find minimal conditions (fewest constraints)
  const minimalConditions = findMinimalConditions(allConditions, targetTeam);

  return {
    team: targetTeam,
    canFinishTop2: true,
    minimalConditions,
    allConditions,
  };
}

/**
 * Resolve standings by applying tiebreakers
 */
function resolveStandings(
  conf: ConferenceData,
  standings: TeamRecord[]
): TeamRecord[] {
  const resolved: TeamRecord[] = [];
  let i = 0;

  while (i < standings.length) {
    const cur = standings[i];
    const tiedGroup = [cur.team];
    i++;

    while (i < standings.length && standings[i].confWins === cur.confWins) {
      tiedGroup.push(standings[i].team);
      i++;
    }

    if (tiedGroup.length > 1) {
      // Pass all conference games and standings for proper tiebreaker resolution
      const resolvedResult = applyTieBreakers(
        conf.name,
        tiedGroup,
        conf.games,
        standings
      );
      resolvedResult.order.forEach((t) => {
        const rec = standings.find((r) => r.team === t);
        if (rec) resolved.push(rec);
      });
    } else {
      resolved.push(cur);
    }
  }

  return resolved;
}

/**
 * Find minimal conditions from all winning scenarios
 * Returns scenarios that are not supersets of other scenarios
 */
function findMinimalConditions(
  allConditions: MinimalCondition[],
  targetTeam: string
): MinimalCondition[] {
  // Find common patterns - games where target team MUST win
  const gameWinRequirements = new Map<string, number>();

  allConditions.forEach((cond) => {
    cond.gameOutcomes.forEach((go) => {
      if (go.mustWin === targetTeam) {
        const key = go.game.id;
        gameWinRequirements.set(key, (gameWinRequirements.get(key) || 0) + 1);
      }
    });
  });

  // Identify must-win games (appear in all scenarios)
  const mustWinGames = new Set<string>();
  const totalScenarios = allConditions.length;

  gameWinRequirements.forEach((count, gameId) => {
    if (count === totalScenarios) {
      mustWinGames.add(gameId);
    }
  });

  // Find simplest scenarios - prioritize those with fewer outcomes or clearer patterns
  const sortedConditions = allConditions
    .map((cond) => {
      // Count how many outcomes involve the target team
      const targetGamesCount = cond.gameOutcomes.filter(
        (go) => go.game.winner === targetTeam || go.game.loser === targetTeam
      ).length;

      // Count must-win games in this scenario
      const mustWinCount = cond.gameOutcomes.filter(
        (go) => mustWinGames.has(go.game.id) && go.mustWin === targetTeam
      ).length;

      return {
        condition: cond,
        targetGamesCount,
        mustWinCount,
        totalGames: cond.gameOutcomes.length,
      };
    })
    .sort((a, b) => {
      // Prioritize scenarios with more must-win games
      if (b.mustWinCount !== a.mustWinCount) {
        return b.mustWinCount - a.mustWinCount;
      }
      // Then prioritize scenarios involving fewer total games
      if (a.totalGames !== b.totalGames) {
        return a.totalGames - b.totalGames;
      }
      // Then prioritize scenarios with more target team involvement
      return b.targetGamesCount - a.targetGamesCount;
    });

  // Return top 10 most representative scenarios
  return sortedConditions
    .slice(0, Math.min(10, sortedConditions.length))
    .map((s) => s.condition);
}
