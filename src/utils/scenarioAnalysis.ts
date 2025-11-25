import type { Scenario, Game } from "../types";

export type GameOutcome = {
  game: Game;
  winner: string;
  loser: string;
};

export type SufficientCondition = {
  outcomes: GameOutcome[]; // Combination of outcomes that guarantee top 2
  guaranteedScenarios: number; // How many scenarios this covers
  scenarioIndices?: Set<number>; // Which specific scenario indices this covers
};

export type BlockingCondition = {
  outcomes: GameOutcome[]; // Combination of outcomes that prevent top 2
  blockedScenarios: number; // How many scenarios this condition covers (where team is eliminated)
  scenarioIndices?: Set<number>; // Which specific scenario indices this covers
};

export type TeamRequirements = {
  team: string;
  totalScenarios: number;
  top2Count: number;
  sufficientConditions: SufficientCondition[]; // What guarantees top 2
  blockingConditions: BlockingCondition[]; // What prevents top 2
};

/**
 * Find minimal combinations of game outcomes that guarantee a team finishes top 2
 */
export function analyzeTeamRequirements(
  team: string,
  allScenarios: Scenario[],
  unplayedGames: Game[]
): TeamRequirements {
  const successScenarios = allScenarios.filter((sc) =>
    sc.topTwo.includes(team)
  );

  if (successScenarios.length === 0) {
    return {
      team,
      totalScenarios: allScenarios.length,
      top2Count: 0,
      sufficientConditions: [],
      blockingConditions: [],
    };
  }

  // Find sufficient conditions (outcomes that guarantee top 2)
  const sufficientConditions = findSufficientConditions(
    allScenarios,
    unplayedGames,
    team
  );

  // Find blocking conditions (outcomes that prevent top 2)
  const blockingConditions = findBlockingConditions(
    allScenarios,
    unplayedGames,
    team
  );

  return {
    team,
    totalScenarios: allScenarios.length,
    top2Count: successScenarios.length,
    sufficientConditions,
    blockingConditions,
  };
}

/**
 * Find minimal sets of game outcomes that guarantee top 2
 * Uses iterative deepening to find combinations of any size
 */
function findSufficientConditions(
  allScenarios: Scenario[],
  unplayedGames: Game[],
  targetTeam: string
): SufficientCondition[] {
  const maxCombinationSize = Math.min(unplayedGames.length, 6); // Try up to 6 games
  const conditions: SufficientCondition[] = [];

  // Try combinations of increasing size
  for (let size = 1; size <= maxCombinationSize; size++) {
    const sizeConditions = findConditionsOfSize(
      allScenarios,
      unplayedGames,
      targetTeam,
      size
    );
    conditions.push(...sizeConditions);
  }

  // Sort by fewest outcomes first (most minimal), then by most scenarios covered
  conditions.sort(
    (a, b) =>
      a.outcomes.length - b.outcomes.length ||
      b.guaranteedScenarios - a.guaranteedScenarios
  );

  // Remove duplicates
  const unique = conditions.filter(
    (c, idx) =>
      conditions.findIndex(
        (other) =>
          JSON.stringify(
            other.outcomes.map((o) => `${o.winner}-${o.loser}`)
          ) === JSON.stringify(c.outcomes.map((o) => `${o.winner}-${o.loser}`))
      ) === idx
  );

  // Remove conditions that are supersets of other conditions
  const minimal = unique.filter((condA) => {
    const hasSubset = unique.some((condB) => {
      if (condA === condB) return false;
      if (condB.outcomes.length >= condA.outcomes.length) return false;

      // Check if all of condB's outcomes are in condA
      const condASet = new Set(
        condA.outcomes.map((o) => `${o.winner}-${o.loser}`)
      );
      const condBOutcomes = condB.outcomes.map((o) => `${o.winner}-${o.loser}`);

      return condBOutcomes.every((outcome) => condASet.has(outcome));
    });

    return !hasSubset;
  });

  // Remove conditions whose scenarios are completely covered by other conditions
  const nonRedundant = minimal.filter((condA) => {
    // Check if condA's scenarios are a subset of any other single condition's scenarios
    const isRedundant = minimal.some((condB) => {
      if (condA === condB) return false;
      if (!condA.scenarioIndices || !condB.scenarioIndices) return false;

      // Check if all of condA's scenarios are in condB
      const allCovered = Array.from(condA.scenarioIndices).every((idx) =>
        condB.scenarioIndices!.has(idx)
      );

      return (
        allCovered && condB.scenarioIndices.size > condA.scenarioIndices.size
      );
    });

    return !isRedundant;
  });

  // Reorder outcomes so target team appears first in each condition
  nonRedundant.forEach((condition) => {
    condition.outcomes.sort((a, b) => {
      const aHasTarget = a.winner === targetTeam || a.loser === targetTeam;
      const bHasTarget = b.winner === targetTeam || b.loser === targetTeam;
      if (aHasTarget && !bHasTarget) return -1;
      if (!aHasTarget && bHasTarget) return 1;
      return 0;
    });
  });

  return nonRedundant;
}

/**
 * Find all sufficient conditions of a specific size
 */
function findConditionsOfSize(
  allScenarios: Scenario[],
  unplayedGames: Game[],
  targetTeam: string,
  size: number
): SufficientCondition[] {
  const conditions: SufficientCondition[] = [];

  // Generate all combinations of game indices
  const indexCombinations = generateCombinations(unplayedGames.length, size);

  for (const indices of indexCombinations) {
    // For each combination of games, try all possible outcomes
    const numOutcomes = Math.pow(2, size);

    for (
      let outcomePattern = 0;
      outcomePattern < numOutcomes;
      outcomePattern++
    ) {
      // Convert outcomePattern to array of booleans
      const outcomes: boolean[] = [];
      for (let i = 0; i < size; i++) {
        outcomes.push((outcomePattern & (1 << i)) !== 0);
      }

      // 1. Find all scenarios that match this game outcome pattern
      const patternMatches: number[] = [];
      allScenarios.forEach((sc, idx) => {
        const matchesPattern = indices.every(
          (gameIdx, i) => sc.gameResults[gameIdx] === outcomes[i]
        );
        if (matchesPattern) {
          patternMatches.push(idx);
        }
      });

      // 2. Verify that in ALL matching scenarios, the team is in top 2
      const isGuarantee =
        patternMatches.length > 0 &&
        patternMatches.every((idx) =>
          allScenarios[idx].topTwo.includes(targetTeam)
        );

      if (isGuarantee) {
        const outcomesList: GameOutcome[] = indices.map((gameIdx, i) => {
          const game = unplayedGames[gameIdx];
          return {
            game,
            winner: outcomes[i] ? game.winner : game.loser,
            loser: outcomes[i] ? game.loser : game.winner,
          };
        });

        conditions.push({
          outcomes: outcomesList,
          guaranteedScenarios: patternMatches.length,
          scenarioIndices: new Set(patternMatches),
        });
      }
    }
  }

  return conditions;
}

/**
 * Generate all combinations of k items from n items
 */
function generateCombinations(n: number, k: number): number[][] {
  const results: number[][] = [];

  function backtrack(start: number, current: number[]) {
    if (current.length === k) {
      results.push([...current]);
      return;
    }

    for (let i = start; i < n; i++) {
      current.push(i);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return results;
}

/**
 * Find minimal sets of game outcomes that block top 2
 * Uses iterative deepening to find combinations of any size
 */
function findBlockingConditions(
  allScenarios: Scenario[],
  unplayedGames: Game[],
  targetTeam: string
): BlockingCondition[] {
  const maxCombinationSize = Math.min(unplayedGames.length, 6); // Try up to 6 games
  const conditions: BlockingCondition[] = [];

  // Try combinations of increasing size
  for (let size = 1; size <= maxCombinationSize; size++) {
    const sizeConditions = findBlockingConditionsOfSize(
      allScenarios,
      unplayedGames,
      targetTeam,
      size
    );
    conditions.push(...sizeConditions);
  }

  // Sort by fewest outcomes first (most minimal), then by most scenarios covered
  conditions.sort(
    (a, b) =>
      a.outcomes.length - b.outcomes.length ||
      b.blockedScenarios - a.blockedScenarios
  );

  // Remove duplicates
  const unique = conditions.filter(
    (c, idx) =>
      conditions.findIndex(
        (other) =>
          JSON.stringify(
            other.outcomes.map((o) => `${o.winner}-${o.loser}`)
          ) === JSON.stringify(c.outcomes.map((o) => `${o.winner}-${o.loser}`))
      ) === idx
  );

  // Remove conditions that are supersets of other conditions
  const minimal = unique.filter((condA) => {
    const hasSubset = unique.some((condB) => {
      if (condA === condB) return false;
      if (condB.outcomes.length >= condA.outcomes.length) return false;

      // Check if all of condB's outcomes are in condA
      const condASet = new Set(
        condA.outcomes.map((o) => `${o.winner}-${o.loser}`)
      );
      const condBOutcomes = condB.outcomes.map((o) => `${o.winner}-${o.loser}`);

      return condBOutcomes.every((outcome) => condASet.has(outcome));
    });

    return !hasSubset;
  });

  // Remove conditions whose scenarios are completely covered by other conditions
  const nonRedundant = minimal.filter((condA) => {
    // Check if condA's scenarios are a subset of any other single condition's scenarios
    const isRedundant = minimal.some((condB) => {
      if (condA === condB) return false;
      if (!condA.scenarioIndices || !condB.scenarioIndices) return false;

      // Check if all of condA's scenarios are in condB
      const allCovered = Array.from(condA.scenarioIndices).every((idx) =>
        condB.scenarioIndices!.has(idx)
      );

      return (
        allCovered && condB.scenarioIndices.size > condA.scenarioIndices.size
      );
    });

    return !isRedundant;
  });

  // Reorder outcomes so target team appears first in each condition
  nonRedundant.forEach((condition) => {
    condition.outcomes.sort((a, b) => {
      const aHasTarget = a.winner === targetTeam || a.loser === targetTeam;
      const bHasTarget = b.winner === targetTeam || b.loser === targetTeam;
      if (aHasTarget && !bHasTarget) return -1;
      if (!aHasTarget && bHasTarget) return 1;
      return 0;
    });
  });

  return nonRedundant;
}

/**
 * Find all blocking conditions of a specific size
 */
function findBlockingConditionsOfSize(
  allScenarios: Scenario[],
  unplayedGames: Game[],
  targetTeam: string,
  size: number
): BlockingCondition[] {
  const conditions: BlockingCondition[] = [];

  // Generate all combinations of game indices
  const indexCombinations = generateCombinations(unplayedGames.length, size);

  for (const indices of indexCombinations) {
    // For each combination of games, try all possible outcomes
    const numOutcomes = Math.pow(2, size);

    for (
      let outcomePattern = 0;
      outcomePattern < numOutcomes;
      outcomePattern++
    ) {
      // Convert outcomePattern to array of booleans
      const outcomes: boolean[] = [];
      for (let i = 0; i < size; i++) {
        outcomes.push((outcomePattern & (1 << i)) !== 0);
      }

      // 1. Find all scenarios that match this game outcome pattern
      const patternMatches: number[] = [];
      allScenarios.forEach((sc, idx) => {
        const matchesPattern = indices.every(
          (gameIdx, i) => sc.gameResults[gameIdx] === outcomes[i]
        );
        if (matchesPattern) {
          patternMatches.push(idx);
        }
      });

      // 2. Verify that in ALL matching scenarios, the team is NOT in top 2
      // (i.e. it is a blocking condition)
      const isBlocking =
        patternMatches.length > 0 &&
        patternMatches.every(
          (idx) => !allScenarios[idx].topTwo.includes(targetTeam)
        );

      if (isBlocking) {
        const outcomesList: GameOutcome[] = indices.map((gameIdx, i) => {
          const game = unplayedGames[gameIdx];
          return {
            game,
            winner: outcomes[i] ? game.winner : game.loser,
            loser: outcomes[i] ? game.loser : game.winner,
          };
        });

        conditions.push({
          outcomes: outcomesList,
          blockedScenarios: patternMatches.length,
          scenarioIndices: new Set(patternMatches),
        });
      }
    }
  }

  return conditions;
}

/**
 * Analyze all teams and return requirements for each
 */
export function analyzeAllTeamRequirements(
  allScenarios: Scenario[],
  unplayedGames: Game[],
  teams: string[]
): Map<string, TeamRequirements> {
  const results = new Map<string, TeamRequirements>();

  for (const team of teams) {
    results.set(
      team,
      analyzeTeamRequirements(team, allScenarios, unplayedGames)
    );
  }

  return results;
}
