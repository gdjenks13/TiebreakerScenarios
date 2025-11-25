import type { Game, TeamRecord, TieBreakerResult } from "@/types";

// Helper to format percentage
function formatPct(pct: number): string {
  return (pct * 100).toFixed(1) + "%";
}

/* Two Teams Head to Head 
   teams: array of size two with the team names
   games: array of Games of size X to be searched
   returns: TieBreakerResult with the winning team, or null if two teams did not play     
*/
function headToHead(teams: string[], games: Game[]): TieBreakerResult | null {
  if (teams.length !== 2) return null;

  const game = games.find(
    (g) => g.played && teams.includes(g.winner) && teams.includes(g.loser)
  );

  if (game) {
    return {
      team: game.winner,
      winner: true,
      explanation: `${game.winner} beat ${game.loser} head-to-head`,
    };
  }
  return null;
}

/* Round Robin - More than Two Teams - Only Two Scenarios
   This is used for the Big 10 and the Big 12
   teams: array of size greater than two with the team names
   games: array of Games of size X to be searched
   returns: string of a team, if that is the winner or loser of the round robin    
*/
function roundRobin_twoScenarios(
  teams: string[],
  games: Game[]
): TieBreakerResult | null {
  if (teams.length < 3) return null;

  const roundRobinGames = games.filter(
    (g) => g.played && teams.includes(g.winner) && teams.includes(g.loser)
  );

  const n = teams.length;
  const expectedGames = (n * (n - 1)) / 2;

  // Count wins for each team
  const winCounts = new Map<string, number>();
  teams.forEach((team) => winCounts.set(team, 0));

  roundRobinGames.forEach((game) => {
    winCounts.set(game.winner, (winCounts.get(game.winner) || 0) + 1);
  });

  // Build record strings for explanation
  const recordStrings = teams
    .map((t) => `${t} (${winCounts.get(t)}-${n - 1 - (winCounts.get(t) || 0)})`)
    .join(", ");

  // Case 1: Complete round robin
  if (roundRobinGames.length === expectedGames) {
    let maxWins = -1;
    let winningTeam: string | null = null;
    let isTied: boolean = true;

    winCounts.forEach((wins, team) => {
      if (wins > maxWins) {
        maxWins = wins;
        winningTeam = team;
        isTied = false;
      } else if (wins === maxWins) {
        isTied = true;
      }
    });

    if (!isTied && winningTeam) {
      return {
        team: winningTeam,
        winner: true,
        explanation: `Round robin among tied teams: ${recordStrings}`,
      };
    }
  }

  // Case 2: Incomplete round robin - team beat all others
  const teamBeatenAll = teams.find(
    (team) => winCounts.get(team) === teams.length - 1
  );

  if (teamBeatenAll) {
    return {
      team: teamBeatenAll,
      winner: true,
      explanation: `${teamBeatenAll} beat all other tied teams (${winCounts.get(
        teamBeatenAll
      )}-0)`,
    };
  }

  return null;
}

/* Round Robin - More than Two Teams - Three Scenarios
   This is used for the ACC and the SEC
   teams: array of size greater than two with the team names
   games: array of Games of size X to be searched
   returns: string of a team, if that is the winner or loser of the round robin    
*/
function roundRobin_threeScenarios(
  teams: string[],
  games: Game[]
): TieBreakerResult | null {
  if (teams.length < 3) return null;

  const roundRobinGames = games.filter(
    (g) => g.played && teams.includes(g.winner) && teams.includes(g.loser)
  );

  const n = teams.length;
  const expectedGames = (n * (n - 1)) / 2;

  // Count wins for each team
  const winCounts = new Map<string, number>();
  teams.forEach((team) => winCounts.set(team, 0));

  roundRobinGames.forEach((game) => {
    winCounts.set(game.winner, (winCounts.get(game.winner) || 0) + 1);
  });

  // Count losses for Case 3
  const lossCounts = new Map<string, number>();
  teams.forEach((team) => lossCounts.set(team, 0));
  roundRobinGames.forEach((game) => {
    lossCounts.set(game.loser, (lossCounts.get(game.loser) || 0) + 1);
  });

  // Build record strings for explanation
  const recordStrings = teams
    .map((t) => `${t} (${winCounts.get(t)}-${lossCounts.get(t)})`)
    .join(", ");

  // Case 1: Complete round robin
  if (roundRobinGames.length === expectedGames) {
    let maxWins = -1;
    let winningTeam: string | null = null;
    let isTied: boolean = true;

    winCounts.forEach((wins, team) => {
      if (wins > maxWins) {
        maxWins = wins;
        winningTeam = team;
        isTied = false;
      } else if (wins === maxWins) {
        isTied = true;
      }
    });

    if (!isTied && winningTeam) {
      return {
        team: winningTeam,
        winner: true,
        explanation: `Round robin among tied teams: ${recordStrings}`,
      };
    }
  }

  // Case 2: Incomplete round robin - team beat all others
  const teamBeatenAll = teams.find(
    (team) => winCounts.get(team) === teams.length - 1
  );

  if (teamBeatenAll) {
    return {
      team: teamBeatenAll,
      winner: true,
      explanation: `${teamBeatenAll} beat all other tied teams (${winCounts.get(
        teamBeatenAll
      )}-0)`,
    };
  }

  // Case 3: Incomplete round robin - team lost to all others
  const teamLostToAll = teams.find(
    (team) => lossCounts.get(team) === teams.length - 1
  );

  if (teamLostToAll) {
    return {
      team: teamLostToAll,
      winner: false,
      explanation: `${teamLostToAll} lost to all other tied teams (0-${lossCounts.get(
        teamLostToAll
      )})`,
    };
  }

  return null;
}

/* Win Percentage Against Common Opponents - Two or more Teams
  teams: array of size greater than or equal to two with the team names
  games: array of Games of size X to be searched
  returns: TieBreakerResult with winning team
*/
function winPctCommonOpponents(
  teams: string[],
  games: Game[]
): TieBreakerResult | null {
  // Find common opponents (teams that all tied teams have played)
  const opponentSets: Map<string, Set<string>> = new Map();

  teams.forEach((team) => {
    const opponents = new Set<string>();
    games.forEach((g) => {
      if (g.played) {
        if (g.winner === team && !teams.includes(g.loser)) {
          opponents.add(g.loser);
        } else if (g.loser === team && !teams.includes(g.winner)) {
          opponents.add(g.winner);
        }
      }
    });
    opponentSets.set(team, opponents);
  });

  // Find intersection of all opponent sets (common opponents)
  const commonOpponents = new Set<string>();
  if (opponentSets.size > 0) {
    const firstSet = opponentSets.values().next().value as Set<string>;
    if (firstSet) {
      firstSet.forEach((opp: string) => {
        let isCommon = true;
        opponentSets.forEach((oppSet) => {
          if (!oppSet.has(opp)) isCommon = false;
        });
        if (isCommon) commonOpponents.add(opp);
      });
    }
  }

  // If no common opponents, can't apply this rule
  if (commonOpponents.size === 0) return null;

  // Count wins/losses for each team against common opponents
  const records = new Map<string, { wins: number; losses: number }>();
  teams.forEach((team) => records.set(team, { wins: 0, losses: 0 }));

  games.forEach((g) => {
    if (g.played) {
      if (teams.includes(g.winner) && commonOpponents.has(g.loser)) {
        const rec = records.get(g.winner)!;
        rec.wins++;
      } else if (teams.includes(g.loser) && commonOpponents.has(g.winner)) {
        const rec = records.get(g.loser)!;
        rec.losses++;
      }
    }
  });

  // Calculate win percentages and build explanation
  const percentages = new Map<string, number>();
  let maxPct = -1;
  let winningTeam: string | null = null;
  let isTied = true;

  records.forEach((rec, team) => {
    const total = rec.wins + rec.losses;
    if (total === 0) return; // Skip teams with no games against common opponents
    const pct = rec.wins / total;
    percentages.set(team, pct);

    if (pct > maxPct) {
      maxPct = pct;
      winningTeam = team;
      isTied = false;
    } else if (pct === maxPct) {
      isTied = true;
    }
  });

  if (!isTied && winningTeam && maxPct >= 0) {
    // Build explanation with all teams' percentages
    const explanationParts = teams
      .filter((t) => percentages.has(t))
      .map((t) => `${t} ${formatPct(percentages.get(t)!)}`)
      .join(", ");
    // List common opponents in parentheses (alphabetical for consistency)
    const commonOppList = Array.from(commonOpponents).sort();
    return {
      team: winningTeam,
      winner: true,
      explanation: `Win % vs common opponents (${commonOppList.join(
        ", "
      )}): ${explanationParts}`,
    };
  }

  return null;
}

/* Wins Against Common Opponents by Order of Finish - Two or more Teams
  teams: array of size greater than or equal to two with the team names
  games: array of Games of size X to be searched
  standings: sorted array of TeamRecords (best to worst by confWins)
  returns: TieBreakerResult or null
  
  The rule: Compare tied teams' records against common opponents,
  starting with the highest-placed team in standings and working down.
  Only compare against opponents that ALL tied teams have played.
  If a group of teams are tied in standings, treat them as one opponent.
*/
function winOrderOfFinish(
  teams: string[],
  games: Game[],
  standings: TeamRecord[]
): TieBreakerResult | null {
  // Get the win count of the tied teams (they all have the same confWins)
  const tiedTeamWins =
    standings.find((s) => teams.includes(s.team))?.confWins ?? 0;

  // Build a map of which opponents each tied team has played and their record against them
  const teamOpponentRecords = new Map<
    string,
    Map<string, { wins: number; games: number }>
  >();

  teams.forEach((team) => {
    const oppRecords = new Map<string, { wins: number; games: number }>();
    games.forEach((g) => {
      if (g.played) {
        if (g.winner === team && !teams.includes(g.loser)) {
          const rec = oppRecords.get(g.loser) || { wins: 0, games: 0 };
          rec.wins++;
          rec.games++;
          oppRecords.set(g.loser, rec);
        } else if (g.loser === team && !teams.includes(g.winner)) {
          const rec = oppRecords.get(g.winner) || { wins: 0, games: 0 };
          rec.games++;
          oppRecords.set(g.winner, rec);
        }
      }
    });
    teamOpponentRecords.set(team, oppRecords);
  });

  // Track the rank of opponent groups for explanation
  let groupRank = 0;

  // Iterate through standings from best to worst (excluding the tied teams themselves)
  // Group teams with the same confWins together
  let i = 0;
  while (i < standings.length) {
    const currentWins = standings[i].confWins;

    // Skip teams that have same or more wins than our tied teams
    if (currentWins >= tiedTeamWins) {
      i++;
      continue;
    }

    groupRank++;

    // Collect all teams at this win level (they're tied, treat as one group)
    const opponentGroup: string[] = [];
    while (i < standings.length && standings[i].confWins === currentWins) {
      const team = standings[i].team;
      // Don't include teams that are part of the tie we're breaking
      if (!teams.includes(team)) {
        opponentGroup.push(team);
      }
      i++;
    }

    if (opponentGroup.length === 0) continue;

    // Check if ALL tied teams have played at least one team in this opponent group
    const allTeamsPlayedGroup = teams.every((team) => {
      const oppRecords = teamOpponentRecords.get(team)!;
      return opponentGroup.some((opp) => oppRecords.has(opp));
    });

    if (!allTeamsPlayedGroup) {
      // Not all tied teams played this group, skip to next group
      continue;
    }

    // Calculate each tied team's record against this opponent group
    const teamRecordsAgainstGroup = new Map<
      string,
      { wins: number; games: number }
    >();

    teams.forEach((team) => {
      const oppRecords = teamOpponentRecords.get(team)!;
      let totalWins = 0;
      let totalGames = 0;

      opponentGroup.forEach((opp) => {
        const rec = oppRecords.get(opp);
        if (rec) {
          totalWins += rec.wins;
          totalGames += rec.games;
        }
      });

      teamRecordsAgainstGroup.set(team, { wins: totalWins, games: totalGames });
    });

    // Calculate win percentages
    const winPercentages = new Map<string, number>();
    teamRecordsAgainstGroup.forEach((rec, team) => {
      const pct = rec.games > 0 ? rec.wins / rec.games : 0;
      winPercentages.set(team, pct);
    });

    // Find the best percentage
    let maxPct = -1;
    let winningTeam: string | null = null;
    let countAtMax = 0;

    winPercentages.forEach((pct, team) => {
      if (pct > maxPct + 0.000001) {
        maxPct = pct;
        winningTeam = team;
        countAtMax = 1;
      } else if (Math.abs(pct - maxPct) <= 0.000001) {
        countAtMax++;
      }
    });

    // Only return a winner if exactly one team has the highest percentage
    if (countAtMax === 1 && winningTeam) {
      // Build explanation with records
      const opponentLabel =
        opponentGroup.length === 1
          ? opponentGroup[0]
          : `#${groupRank} group (${opponentGroup.join(", ")})`;

      const recordStrings = teams
        .map((t) => {
          const rec = teamRecordsAgainstGroup.get(t)!;
          return `${t} (${rec.wins}-${rec.games - rec.wins})`;
        })
        .join(", ");

      return {
        team: winningTeam,
        winner: true,
        explanation: `vs ${opponentLabel}: ${recordStrings}`,
      };
    }

    // If tied at this level, continue to next opponent group
  }

  return null;
}

/* Combined Conference Opponent Win Percentage - Two or more Teams
  teams: array of size greater than or equal to two with the team names
  games: array of Games of size X to be searched
  returns: string of a winning team (the one with highest combined opponent win %)
*/
function combinedOpponentWinPct(
  teams: string[],
  games: Game[]
): TieBreakerResult | null {
  if (teams.length < 2) return null;

  // For each team, calculate their opponents' combined win percentage
  const teamPcts = new Map<string, number>();

  teams.forEach((team) => {
    // Get all opponents this team has played
    const opponents = new Set<string>();
    games.forEach((g) => {
      if (g.played) {
        if (g.winner === team) {
          opponents.add(g.loser);
        } else if (g.loser === team) {
          opponents.add(g.winner);
        }
      }
    });

    // Sum up all opponents' wins and total games
    let totalOpponentWins = 0;
    let totalOpponentGames = 0;

    opponents.forEach((opponent) => {
      games.forEach((g) => {
        if (g.played && (g.winner === opponent || g.loser === opponent)) {
          totalOpponentGames++;
          if (g.winner === opponent) {
            totalOpponentWins++;
          }
        }
      });
    });

    // Calculate percentage
    const pct =
      totalOpponentGames > 0 ? totalOpponentWins / totalOpponentGames : 0;
    teamPcts.set(team, pct);
  });

  // Find the team with the highest percentage
  let maxPct = -1;
  let winningTeam: string | null = null;
  let countAtMax = 0;

  teamPcts.forEach((pct, team) => {
    if (pct > maxPct + 0.000001) {
      maxPct = pct;
      winningTeam = team;
      countAtMax = 1;
    } else if (Math.abs(pct - maxPct) <= 0.000001) {
      countAtMax++;
    }
  });

  // If there's exactly one team with the highest percentage, return them as winner
  if (countAtMax === 1 && winningTeam) {
    // Build explanation with all teams' percentages
    const explanationParts = teams
      .map((t) => `${t} ${formatPct(teamPcts.get(t)!)}`)
      .join(", ");
    return {
      team: winningTeam,
      winner: true,
      explanation: `Combined opponent win %: ${explanationParts}`,
    };
  }

  // If all teams are tied, return null (can't break the tie with this rule)
  return null;
}

/* --- Helper Functions to Apply Tiebreakers in order
   based on conference rules
*/

type TieBreakerApplyResult = {
  order: string[];
  applied: string[];
  explanations: string[];
};

// AAC Tiebreaker Rules
function tiebreakers_aac(
  teams: string[],
  games: Game[]
): TieBreakerApplyResult {
  const applied = new Set<string>();
  const explanations: string[] = [];
  const top: string[] = [];
  const bottom: string[] = [];
  let remaining = teams.slice();

  while (remaining.length > 1) {
    let progressMade = false;

    // Rule A: Head-to-head (two teams) or round robin (3+)
    if (remaining.length === 2) {
      const result = headToHead(remaining, games);
      if (result) {
        applied.add("A");
        if (result.explanation) explanations.push(result.explanation);
        top.push(result.team);
        remaining = remaining.filter((t) => t !== result.team);
        progressMade = true;
        continue;
      }
    } else {
      const rr = roundRobin_twoScenarios(remaining, games);
      if (rr) {
        applied.add("A");
        if (rr.explanation) explanations.push(rr.explanation);
        top.push(rr.team);
        remaining = remaining.filter((t) => t !== rr.team);
        progressMade = true;
        continue;
      }
    }

    // Rule B: Win % against common opponents
    const wc = winPctCommonOpponents(remaining, games);
    if (wc) {
      applied.add("B");
      if (wc.explanation) explanations.push(wc.explanation);
      if (wc.winner) top.push(wc.team);
      else bottom.push(wc.team);
      remaining = remaining.filter((t) => t !== wc.team);
      progressMade = true;
      continue;
    }

    // Rule C: Combined opponent win pct
    const co = combinedOpponentWinPct(remaining, games);
    if (co) {
      applied.add("C");
      if (co.explanation) explanations.push(co.explanation);
      if (co.winner) top.push(co.team);
      else bottom.push(co.team);
      remaining = remaining.filter((t) => t !== co.team);
      progressMade = true;
      continue;
    }

    // No rule applied - use random ordering and break
    if (!progressMade) {
      applied.add("G");
      explanations.push(`Random selection among: ${remaining.join(", ")}`);
      // Fisher-Yates shuffle for better randomness
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
      top.push(...remaining);
      remaining = [];
      break;
    }
  }

  if (remaining.length === 1) top.push(remaining[0]);
  return {
    order: [...top, ...bottom],
    applied: Array.from(applied),
    explanations,
  };
}

// ACC Tiebreaker Rules
function tiebreakers_acc(
  teams: string[],
  games: Game[],
  standings: TeamRecord[]
): TieBreakerApplyResult {
  const applied = new Set<string>();
  const explanations: string[] = [];
  const top: string[] = [];
  const bottom: string[] = [];
  let remaining = teams.slice();

  while (remaining.length > 1) {
    let progressMade = false;

    // Rule A: Head-to-head (two teams) or round robin (3+)
    if (remaining.length === 2) {
      const result = headToHead(remaining, games);
      if (result) {
        applied.add("A");
        if (result.explanation) explanations.push(result.explanation);
        top.push(result.team);
        remaining = remaining.filter((t) => t !== result.team);
        progressMade = true;
        continue;
      }
    } else {
      const rr = roundRobin_threeScenarios(remaining, games);
      if (rr) {
        applied.add("A");
        if (rr.explanation) explanations.push(rr.explanation);
        if (rr.winner) {
          top.push(rr.team);
        } else {
          bottom.push(rr.team);
        }
        remaining = remaining.filter((t) => t !== rr.team);
        progressMade = true;
        continue;
      }
    }

    // Rule B: Win % against common opponents
    const wc = winPctCommonOpponents(remaining, games);
    if (wc) {
      applied.add("B");
      if (wc.explanation) explanations.push(wc.explanation);
      if (wc.winner) top.push(wc.team);
      else bottom.push(wc.team);
      remaining = remaining.filter((t) => t !== wc.team);
      progressMade = true;
      continue;
    }

    // Rule C: Win order of finish
    const wo = winOrderOfFinish(remaining, games, standings);
    if (wo) {
      applied.add("C");
      if (wo.explanation) explanations.push(wo.explanation);
      if (wo.winner) top.push(wo.team);
      else bottom.push(wo.team);
      remaining = remaining.filter((t) => t !== wo.team);
      progressMade = true;
      continue;
    }

    // Rule D: Combined opponent win pct
    const co = combinedOpponentWinPct(remaining, games);
    if (co) {
      applied.add("D");
      if (co.explanation) explanations.push(co.explanation);
      if (co.winner) top.push(co.team);
      else bottom.push(co.team);
      remaining = remaining.filter((t) => t !== co.team);
      progressMade = true;
      continue;
    }

    // No rule applied - use random ordering and break
    if (!progressMade) {
      applied.add("G");
      explanations.push(`Random selection among: ${remaining.join(", ")}`);
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
      top.push(...remaining);
      remaining = [];
      break;
    }
  }

  if (remaining.length === 1) top.push(remaining[0]);
  return {
    order: [...top, ...bottom],
    applied: Array.from(applied),
    explanations,
  };
}

// Big 10 Tiebreaker Rules
function tiebreakers_big10(
  teams: string[],
  games: Game[],
  standings: TeamRecord[]
): TieBreakerApplyResult {
  const applied = new Set<string>();
  const explanations: string[] = [];
  const top: string[] = [];
  const bottom: string[] = [];
  let remaining = teams.slice();

  while (remaining.length > 1) {
    let progressMade = false;

    // Rule A: Head-to-head (two teams) or round robin (3+)
    if (remaining.length === 2) {
      const result = headToHead(remaining, games);
      if (result) {
        applied.add("A");
        if (result.explanation) explanations.push(result.explanation);
        top.push(result.team);
        remaining = remaining.filter((t) => t !== result.team);
        progressMade = true;
        continue;
      }
    } else {
      const rr = roundRobin_twoScenarios(remaining, games);
      if (rr) {
        applied.add("A");
        if (rr.explanation) explanations.push(rr.explanation);
        top.push(rr.team);
        remaining = remaining.filter((t) => t !== rr.team);
        progressMade = true;
        continue;
      }
    }

    // Rule B: Win % against common opponents
    const wc = winPctCommonOpponents(remaining, games);
    if (wc) {
      applied.add("B");
      if (wc.explanation) explanations.push(wc.explanation);
      if (wc.winner) top.push(wc.team);
      else bottom.push(wc.team);
      remaining = remaining.filter((t) => t !== wc.team);
      progressMade = true;
      continue;
    }

    // Rule C: Win order of finish
    const wo = winOrderOfFinish(remaining, games, standings);
    if (wo) {
      applied.add("C");
      if (wo.explanation) explanations.push(wo.explanation);
      if (wo.winner) top.push(wo.team);
      else bottom.push(wo.team);
      remaining = remaining.filter((t) => t !== wo.team);
      progressMade = true;
      continue;
    }

    // Rule D: Combined opponent win pct
    const co = combinedOpponentWinPct(remaining, games);
    if (co) {
      applied.add("D");
      if (co.explanation) explanations.push(co.explanation);
      if (co.winner) top.push(co.team);
      else bottom.push(co.team);
      remaining = remaining.filter((t) => t !== co.team);
      progressMade = true;
      continue;
    }

    // No rule applied - use random ordering and break
    if (!progressMade) {
      applied.add("G");
      explanations.push(`Random selection among: ${remaining.join(", ")}`);
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
      top.push(...remaining);
      remaining = [];
      break;
    }
  }

  if (remaining.length === 1) top.push(remaining[0]);
  return {
    order: [...top, ...bottom],
    applied: Array.from(applied),
    explanations,
  };
}

// Big 12 Tiebreaker Rules
function tiebreakers_big12(
  teams: string[],
  games: Game[],
  standings: TeamRecord[]
): TieBreakerApplyResult {
  const applied = new Set<string>();
  const explanations: string[] = [];
  const top: string[] = [];
  const bottom: string[] = [];
  let remaining = teams.slice();

  while (remaining.length > 1) {
    let progressMade = false;

    // Rule A: Head-to-head (two teams) or round robin (3+)
    if (remaining.length === 2) {
      const result = headToHead(remaining, games);
      if (result) {
        applied.add("A");
        if (result.explanation) explanations.push(result.explanation);
        top.push(result.team);
        remaining = remaining.filter((t) => t !== result.team);
        progressMade = true;
        continue;
      }
    } else {
      const rr = roundRobin_twoScenarios(remaining, games);
      if (rr) {
        applied.add("A");
        if (rr.explanation) explanations.push(rr.explanation);
        top.push(rr.team);
        remaining = remaining.filter((t) => t !== rr.team);
        progressMade = true;
        continue;
      }
    }

    // Rule B: Win % against common opponents
    const wc = winPctCommonOpponents(remaining, games);
    if (wc) {
      applied.add("B");
      if (wc.explanation) explanations.push(wc.explanation);
      if (wc.winner) top.push(wc.team);
      else bottom.push(wc.team);
      remaining = remaining.filter((t) => t !== wc.team);
      progressMade = true;
      continue;
    }

    // Rule C: Win order of finish
    const wo = winOrderOfFinish(remaining, games, standings);
    if (wo) {
      applied.add("C");
      if (wo.explanation) explanations.push(wo.explanation);
      if (wo.winner) top.push(wo.team);
      else bottom.push(wo.team);
      remaining = remaining.filter((t) => t !== wo.team);
      progressMade = true;
      continue;
    }

    // Rule D: Combined opponent win pct
    const co = combinedOpponentWinPct(remaining, games);
    if (co) {
      applied.add("D");
      if (co.explanation) explanations.push(co.explanation);
      if (co.winner) top.push(co.team);
      else bottom.push(co.team);
      remaining = remaining.filter((t) => t !== co.team);
      progressMade = true;
      continue;
    }

    // No rule applied - use random ordering and break
    if (!progressMade) {
      applied.add("G");
      explanations.push(`Random selection among: ${remaining.join(", ")}`);
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
      top.push(...remaining);
      remaining = [];
      break;
    }
  }

  if (remaining.length === 1) top.push(remaining[0]);
  return {
    order: [...top, ...bottom],
    applied: Array.from(applied),
    explanations,
  };
}

// SEC Tiebreaker Rules
function tiebreakers_sec(
  teams: string[],
  games: Game[],
  standings: TeamRecord[]
): TieBreakerApplyResult {
  const applied = new Set<string>();
  const explanations: string[] = [];
  const top: string[] = [];
  const bottom: string[] = [];
  let remaining = teams.slice();

  while (remaining.length > 1) {
    let progressMade = false;

    // Rule A: Head-to-head (two teams) or round robin (3+)
    if (remaining.length === 2) {
      const result = headToHead(remaining, games);
      if (result) {
        applied.add("A");
        if (result.explanation) explanations.push(result.explanation);
        top.push(result.team);
        remaining = remaining.filter((t) => t !== result.team);
        progressMade = true;
        continue;
      }
    } else {
      const rr = roundRobin_threeScenarios(remaining, games);
      if (rr) {
        applied.add("A");
        if (rr.explanation) explanations.push(rr.explanation);
        if (rr.winner) {
          top.push(rr.team);
        } else {
          bottom.push(rr.team);
        }
        remaining = remaining.filter((t) => t !== rr.team);
        progressMade = true;
        continue;
      }
    }

    // Rule B: Win % against common opponents
    const wc = winPctCommonOpponents(remaining, games);
    if (wc) {
      applied.add("B");
      if (wc.explanation) explanations.push(wc.explanation);
      if (wc.winner) top.push(wc.team);
      else bottom.push(wc.team);
      remaining = remaining.filter((t) => t !== wc.team);
      progressMade = true;
      continue;
    }

    // Rule C: Win % vs next highest placed common opponent(s)
    const wo = winOrderOfFinish(remaining, games, standings);
    if (wo) {
      applied.add("C");
      if (wo.explanation) explanations.push(wo.explanation);
      if (wo.winner) top.push(wo.team);
      else bottom.push(wo.team);
      remaining = remaining.filter((t) => t !== wo.team);
      progressMade = true;
      continue;
    }

    // Rule D: Combined opponent win pct
    const co = combinedOpponentWinPct(remaining, games);
    if (co) {
      applied.add("D");
      if (co.explanation) explanations.push(co.explanation);
      if (co.winner) top.push(co.team);
      else bottom.push(co.team);
      remaining = remaining.filter((t) => t !== co.team);
      progressMade = true;
      continue;
    }

    // No rule applied - use random ordering and break
    if (!progressMade) {
      applied.add("G");
      explanations.push(`Random selection among: ${remaining.join(", ")}`);
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
      top.push(...remaining);
      remaining = [];
      break;
    }
  }

  if (remaining.length === 1) top.push(remaining[0]);
  return {
    order: [...top, ...bottom],
    applied: Array.from(applied),
    explanations,
  };
}

function tiebreakers_generic(
  teams: string[],
  games: Game[],
  standings: TeamRecord[]
): TieBreakerApplyResult {
  const applied = new Set<string>();
  const explanations: string[] = [];
  const top: string[] = [];
  const bottom: string[] = [];
  let remaining = teams.slice();

  while (remaining.length > 1) {
    let progressMade = false;

    // Attempt head-to-head if 2 teams
    if (remaining.length === 2) {
      const result = headToHead(remaining, games);
      if (result) {
        applied.add("A");
        if (result.explanation) explanations.push(result.explanation);
        top.push(result.team);
        remaining = remaining.filter((t) => t !== result.team);
        progressMade = true;
        continue;
      }
    }

    // Attempt common opponents
    const common = winPctCommonOpponents(remaining, games);
    if (common) {
      applied.add("B");
      if (common.explanation) explanations.push(common.explanation);
      if (common.winner) {
        top.push(common.team);
      } else {
        bottom.push(common.team);
      }
      remaining = remaining.filter((t) => t !== common.team);
      progressMade = true;
      continue;
    }

    // Attempt order of finish
    const order = winOrderOfFinish(remaining, games, standings);
    if (order) {
      applied.add("C");
      if (order.explanation) explanations.push(order.explanation);
      if (order.winner) top.push(order.team);
      else bottom.push(order.team);
      remaining = remaining.filter((t) => t !== order.team);
      progressMade = true;
      continue;
    }

    // Attempt combined opponent pct
    const co = combinedOpponentWinPct(remaining, games);
    if (co) {
      applied.add("D");
      if (co.explanation) explanations.push(co.explanation);
      if (co.winner) top.push(co.team);
      else bottom.push(co.team);
      remaining = remaining.filter((t) => t !== co.team);
      progressMade = true;
      continue;
    }

    // No rule applied - use random ordering and break
    if (!progressMade) {
      applied.add("G");
      explanations.push(`Random selection among: ${remaining.join(", ")}`);
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
      top.push(...remaining);
      remaining = [];
      break;
    }
  }

  if (remaining.length === 1) top.push(remaining[0]);
  return {
    order: [...top, ...bottom],
    applied: Array.from(applied),
    explanations,
  };
}

export function applyTieBreakers(
  confName: string,
  teams: string[],
  games: Game[],
  standings: TeamRecord[]
): TieBreakerApplyResult {
  switch (confName.toLowerCase()) {
    case "aac":
      return tiebreakers_aac(teams, games);
    case "acc":
      return tiebreakers_acc(teams, games, standings);
    case "big10":
      return tiebreakers_big10(teams, games, standings);
    case "big12":
      return tiebreakers_big12(teams, games, standings);
    case "sec":
      return tiebreakers_sec(teams, games, standings);
    default:
      return tiebreakers_generic(teams, games, standings);
  }
}
