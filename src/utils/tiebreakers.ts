import type { Game, TieBreakerResult } from "@/types";

/* Two Teams Head to Head 
   teams: array of size two with the team names
   games: array of Games of size X to be searched
   returns: string of the winning team, or null if two teams did not play     
*/
function headToHead(teams: string[], games: Game[]): string | null {
  if (teams.length !== 2) return null;

  const game = games.find(
    (g) => g.played && teams.includes(g.winner) && teams.includes(g.loser)
  );

  return game ? game.winner : null;
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
      return { team: winningTeam, winner: true };
    }
  }

  // Case 2: Incomplete round robin - team beat all others
  const teamBeatenAll = teams.find(
    (team) => winCounts.get(team) === teams.length - 1
  );

  if (teamBeatenAll) {
    return { team: teamBeatenAll, winner: true };
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
      return { team: winningTeam, winner: true };
    }
  }

  // Case 2: Incomplete round robin - team beat all others
  const teamBeatenAll = teams.find(
    (team) => winCounts.get(team) === teams.length - 1
  );

  if (teamBeatenAll) {
    return { team: teamBeatenAll, winner: true };
  }

  // Case 3: Incomplete round robin - team lost to all others
  const lossCounts = new Map<string, number>();
  teams.forEach((team) => lossCounts.set(team, 0));

  roundRobinGames.forEach((game) => {
    lossCounts.set(game.loser, (lossCounts.get(game.loser) || 0) + 1);
  });

  const teamLostToAll = teams.find(
    (team) => lossCounts.get(team) === teams.length - 1
  );

  if (teamLostToAll) {
    return { team: teamLostToAll, winner: false };
  }

  return null;
}

/* Win Percentage Against Common Opponents - Two or more Teams
  teams: array of size greater than or equal to two with the team names
  games: array of Games of size X to be searched
  returns: string of a winning team
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

  // Calculate win percentages
  let maxPct = -1;
  let winningTeam: string | null = null;
  let isTied = true;

  records.forEach((rec, team) => {
    const total = rec.wins + rec.losses;
    if (total === 0) return; // Skip teams with no games against common opponents
    const pct = rec.wins / total;

    if (pct > maxPct) {
      maxPct = pct;
      winningTeam = team;
      isTied = false;
    } else if (pct === maxPct) {
      isTied = true;
    }
  });

  if (!isTied && winningTeam && maxPct >= 0) {
    return { team: winningTeam, winner: true };
  }

  return null;
}

/* Wins Against Common Opponents by Order of Finish - Two or more Teams
  teams: array of size greater than or equal to two with the team names
  games: array of Games of size X to be searched
  returns: string of a winning team
*/
function winOrderOfFinish(
  teams: string[],
  games: Game[]
): TieBreakerResult | null {
  const allTeams = new Set<string>();
  games.forEach((g) => {
    if (g.played) {
      allTeams.add(g.winner);
      allTeams.add(g.loser);
    }
  });

  const otherTeams = Array.from(allTeams).filter(
    (team) => !teams.includes(team)
  );

  const winCounts = new Map<string, number>();
  [...teams, ...otherTeams].forEach((team) => winCounts.set(team, 0));

  games.forEach((g) => {
    if (g.played) {
      winCounts.set(g.winner, (winCounts.get(g.winner) || 0) + 1);
    }
  });

  const sortedOtherTeams = otherTeams.sort((a, b) => {
    const winsA = winCounts.get(a) || 0;
    const winsB = winCounts.get(b) || 0;
    return winsB - winsA;
  });

  // Get the win count of the tied teams
  const tiedTeamsMaxWins = Math.max(...teams.map((t) => winCounts.get(t) || 0));

  // Filter 'sortedOtherTeams' to only teams with fewer wins than the tied teams
  const nextHighestTeams = sortedOtherTeams.filter(
    (team) => (winCounts.get(team) || 0) < tiedTeamsMaxWins
  );

  let i = 0;
  while (i < nextHighestTeams.length) {
    // Find the group of teams tied at this position
    const currentWins = winCounts.get(nextHighestTeams[i]) || 0;
    const tiedGroup: string[] = [];

    while (
      i < nextHighestTeams.length &&
      (winCounts.get(nextHighestTeams[i]) || 0) === currentWins
    ) {
      tiedGroup.push(nextHighestTeams[i]);
      i++;
    }

    // Calculate win percentage for each tied team against this group
    const winPercentages = new Map<string, number>();

    teams.forEach((team) => {
      let wins = 0;
      let totalGames = 0;

      games.forEach((g) => {
        if (g.played && tiedGroup.includes(g.winner) && g.loser === team) {
          totalGames++;
        } else if (
          g.played &&
          tiedGroup.includes(g.loser) &&
          g.winner === team
        ) {
          wins++;
          totalGames++;
        }
      });

      const winPct = totalGames > 0 ? wins / totalGames : 0;
      winPercentages.set(team, winPct);
    });

    // Check if there's a clear winner
    let maxPct = -1;
    let winningTeam: string | null = null;
    let countAtMax = 0;

    winPercentages.forEach((pct, team) => {
      if (pct > maxPct) {
        maxPct = pct;
        winningTeam = team;
        countAtMax = 1;
      } else if (pct === maxPct) {
        countAtMax++;
      }
    });

    if (countAtMax === 1 && winningTeam && maxPct > 0) {
      return { team: winningTeam, winner: true };
    }
  }
  return null;
}

/* Combined Conference Opponent Win Percentage - Two or more Teams
  teams: array of size greater than or equal to two with the team names
  games: array of Games of size X to be searched
  returns: string of a winning team
*/
function combinedOpponentWinPct(
  teams: string[],
  games: Game[]
): TieBreakerResult | null {
  if (teams.length < 2) return null;

  const teamStats = new Map<string, { wins: number; total: number }>();

  teams.forEach((team) => {
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

    teamStats.set(team, { wins: totalOpponentWins, total: totalOpponentGames });
  });

  // Find max percentage
  let maxPct = -1;

  teamStats.forEach((stats) => {
    const pct = stats.total > 0 ? stats.wins / stats.total : 0;
    if (pct > maxPct) {
      maxPct = pct;
    }
  });

  const topTeams: string[] = [];
  const bottomTeams: string[] = [];

  teamStats.forEach((stats, team) => {
    const pct = stats.total > 0 ? stats.wins / stats.total : 0;
    if (Math.abs(pct - maxPct) < 0.000001) {
      topTeams.push(team);
    } else {
      bottomTeams.push(team);
    }
  });

  if (topTeams.length === 1) {
    return { team: topTeams[0], winner: true };
  } else if (topTeams.length > 1 && bottomTeams.length > 0) {
    // Eliminate a bottom team
    return { team: bottomTeams[0], winner: false };
  }

  return null;
}

/* --- Helper Functions to Apply Tiebreakers in order
   based on conference rules
*/

// AAC Tiebreaker Rules
function tiebreakers_aac(teams: string[], games: Game[]) {
  const applied = new Set<string>();
  const top: string[] = [];
  const bottom: string[] = [];
  let remaining = teams.slice();

  while (remaining.length > 1) {
    let progressMade = false;

    // Rule A: Head-to-head (two teams) or round robin (3+)
    if (remaining.length === 2) {
      const winner = headToHead(remaining, games);
      if (winner) {
        applied.add("A");
        top.push(winner);
        remaining = remaining.filter((t) => t !== winner);
        progressMade = true;
        continue;
      }
    } else {
      const rr = roundRobin_twoScenarios(remaining, games);
      if (rr) {
        applied.add("A");
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
      if (co.winner) top.push(co.team);
      else bottom.push(co.team);
      remaining = remaining.filter((t) => t !== co.team);
      progressMade = true;
      continue;
    }

    // No rule applied - use random ordering and break
    if (!progressMade) {
      applied.add("G");
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
  return { order: [...top, ...bottom], applied: Array.from(applied) };
}

// ACC Tiebreaker Rules
function tiebreakers_acc(teams: string[], games: Game[]) {
  const applied = new Set<string>();
  const top: string[] = [];
  const bottom: string[] = [];
  let remaining = teams.slice();

  while (remaining.length > 1) {
    let progressMade = false;

    // Rule A: Head-to-head (two teams) or round robin (3+)
    if (remaining.length === 2) {
      const winner = headToHead(remaining, games);
      if (winner) {
        applied.add("A");
        top.push(winner);
        remaining = remaining.filter((t) => t !== winner);
        progressMade = true;
        continue;
      }
    } else {
      const rr = roundRobin_threeScenarios(remaining, games);
      if (rr) {
        applied.add("A");
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
      if (wc.winner) top.push(wc.team);
      else bottom.push(wc.team);
      remaining = remaining.filter((t) => t !== wc.team);
      progressMade = true;
      continue;
    }

    // Rule C: Win order of finish
    const wo = winOrderOfFinish(remaining, games);
    if (wo) {
      applied.add("C");
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
      if (co.winner) top.push(co.team);
      else bottom.push(co.team);
      remaining = remaining.filter((t) => t !== co.team);
      progressMade = true;
      continue;
    }

    // No rule applied - use random ordering and break
    if (!progressMade) {
      applied.add("G");
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
  return { order: [...top, ...bottom], applied: Array.from(applied) };
}

// Big 10 Tiebreaker Rules
function tiebreakers_big10(teams: string[], games: Game[]) {
  const applied = new Set<string>();
  const top: string[] = [];
  const bottom: string[] = [];
  let remaining = teams.slice();

  while (remaining.length > 1) {
    let progressMade = false;

    // Rule A: Head-to-head (two teams) or round robin (3+)
    if (remaining.length === 2) {
      const winner = headToHead(remaining, games);
      if (winner) {
        applied.add("A");
        top.push(winner);
        remaining = remaining.filter((t) => t !== winner);
        progressMade = true;
        continue;
      }
    } else {
      const rr = roundRobin_twoScenarios(remaining, games);
      if (rr) {
        applied.add("A");
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
      if (wc.winner) top.push(wc.team);
      else bottom.push(wc.team);
      remaining = remaining.filter((t) => t !== wc.team);
      progressMade = true;
      continue;
    }

    // Rule C: Win order of finish
    const wo = winOrderOfFinish(remaining, games);
    if (wo) {
      applied.add("C");
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
      if (co.winner) top.push(co.team);
      else bottom.push(co.team);
      remaining = remaining.filter((t) => t !== co.team);
      progressMade = true;
      continue;
    }

    // No rule applied - use random ordering and break
    if (!progressMade) {
      applied.add("G");
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
  return { order: [...top, ...bottom], applied: Array.from(applied) };
}

// Big 12 Tiebreaker Rules
function tiebreakers_big12(teams: string[], games: Game[]) {
  const applied = new Set<string>();
  const top: string[] = [];
  const bottom: string[] = [];
  let remaining = teams.slice();

  while (remaining.length > 1) {
    let progressMade = false;

    // Rule A: Head-to-head (two teams) or round robin (3+)
    if (remaining.length === 2) {
      const winner = headToHead(remaining, games);
      if (winner) {
        applied.add("A");
        top.push(winner);
        remaining = remaining.filter((t) => t !== winner);
        progressMade = true;
        continue;
      }
    } else {
      const rr = roundRobin_twoScenarios(remaining, games);
      if (rr) {
        applied.add("A");
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
      if (wc.winner) top.push(wc.team);
      else bottom.push(wc.team);
      remaining = remaining.filter((t) => t !== wc.team);
      progressMade = true;
      continue;
    }

    // Rule C: Win order of finish
    const wo = winOrderOfFinish(remaining, games);
    if (wo) {
      applied.add("C");
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
      if (co.winner) top.push(co.team);
      else bottom.push(co.team);
      remaining = remaining.filter((t) => t !== co.team);
      progressMade = true;
      continue;
    }

    // No rule applied - use random ordering and break
    if (!progressMade) {
      applied.add("G");
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
  return { order: [...top, ...bottom], applied: Array.from(applied) };
}

// SEC Tiebreaker Rules
function tiebreakers_sec(teams: string[], games: Game[]) {
  const applied = new Set<string>();
  const top: string[] = [];
  const bottom: string[] = [];
  let remaining = teams.slice();

  while (remaining.length > 1) {
    let progressMade = false;

    // Rule A: Head-to-head (two teams) or round robin (3+)
    if (remaining.length === 2) {
      const winner = headToHead(remaining, games);
      if (winner) {
        applied.add("A");
        top.push(winner);
        remaining = remaining.filter((t) => t !== winner);
        progressMade = true;
        continue;
      }
    } else {
      const rr = roundRobin_threeScenarios(remaining, games);
      if (rr) {
        applied.add("A");
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
      if (wc.winner) top.push(wc.team);
      else bottom.push(wc.team);
      remaining = remaining.filter((t) => t !== wc.team);
      progressMade = true;
      continue;
    }

    // Rule C: Win % vs next highest placed common opponent(s)
    const wo = winOrderOfFinish(remaining, games);
    if (wo) {
      applied.add("C");
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
      if (co.winner) top.push(co.team);
      else bottom.push(co.team);
      remaining = remaining.filter((t) => t !== co.team);
      progressMade = true;
      continue;
    }

    // No rule applied - use random ordering and break
    if (!progressMade) {
      applied.add("G");
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
  return { order: [...top, ...bottom], applied: Array.from(applied) };
}

function tiebreakers_generic(teams: string[], games: Game[]) {
  const applied = new Set<string>();
  const top: string[] = [];
  const bottom: string[] = [];
  let remaining = teams.slice();

  while (remaining.length > 1) {
    let progressMade = false;

    // Attempt head-to-head if 2 teams
    if (remaining.length === 2) {
      const winner = headToHead(remaining, games);
      if (winner) {
        applied.add("A");
        top.push(winner);
        remaining = remaining.filter((t) => t !== winner);
        progressMade = true;
        continue;
      }
    }

    // Attempt common opponents
    const common = winPctCommonOpponents(remaining, games);
    if (common) {
      applied.add("B");
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
    const order = winOrderOfFinish(remaining, games);
    if (order) {
      applied.add("C");
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
      if (co.winner) top.push(co.team);
      else bottom.push(co.team);
      remaining = remaining.filter((t) => t !== co.team);
      progressMade = true;
      continue;
    }

    // No rule applied - use random ordering and break
    if (!progressMade) {
      applied.add("G");
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
  return { order: [...top, ...bottom], applied: Array.from(applied) };
}

export function applyTieBreakers(
  confName: string,
  teams: string[],
  games: Game[]
) {
  switch (confName.toLowerCase()) {
    case "aac":
      return tiebreakers_aac(teams, games);
    case "acc":
      return tiebreakers_acc(teams, games);
    case "big10":
      return tiebreakers_big10(teams, games);
    case "big12":
      return tiebreakers_big12(teams, games);
    case "sec":
      return tiebreakers_sec(teams, games);
    default:
      return tiebreakers_generic(teams, games);
  }
}
