import type { Game, TeamRecord } from "@/types";
import { ratings } from "./dataLoader";

// Basic head-to-head for two-team tie
export function headToHeadRecord(
  team: string,
  opponent: string,
  games: Game[]
) {
  let wins = 0;
  let losses = 0;
  games.forEach((g) => {
    if (!g.played) return;
    if (g.winner === team && g.loser === opponent) wins++;
    if (g.winner === opponent && g.loser === team) losses++;
  });
  return { wins, losses };
}

// Win percentage among a set of opponents
export function winPctAgainst(
  team: string,
  opponents: Set<string>,
  games: Game[]
) {
  let wins = 0;
  let losses = 0;
  opponents.forEach((opp) => {
    games.forEach((g) => {
      if (!g.played) return;
      if (g.winner === team && g.loser === opp) wins++;
      if (g.winner === opp && g.loser === team) losses++;
    });
  });
  const total = wins + losses;
  if (total === 0) return null; // no games
  return wins / total;
}

// Rule A: head-to-head among tied teams. Input list of team names
export function applyRuleA(
  tiedTeams: string[],
  games: Game[]
): { ranking: string[]; remainingTies: string[][] } {
  if (tiedTeams.length <= 1) return { ranking: tiedTeams, remainingTies: [] };
  // compute head-to-head percentage among the tied teams for each team.
  const percents: Map<string, number | null> = new Map();
  tiedTeams.forEach((t) => {
    let wins = 0;
    let losses = 0;
    games.forEach((g) => {
      if (!g.played) return;
      if (tiedTeams.includes(g.winner!) && tiedTeams.includes(g.loser!)) {
        if (g.winner === t) wins++;
        if (g.loser === t) losses++;
      }
    });
    const total = wins + losses;
    const pct = total === 0 ? null : wins / total;
    percents.set(t, pct);
  });
  // Now split based on percentages, higher first, ties with same percent remain
  const percentBuckets: Map<string | null, string[]> = new Map();
  percents.forEach((pct, team) => {
    const key = pct === null ? "null" : pct.toString();
    const bucket = percentBuckets.get(key) || [];
    bucket.push(team);
    percentBuckets.set(key, bucket);
  });
  // sort keys descending (null last)
  const keys = Array.from(percentBuckets.keys()).sort((a, b) => {
    if (a === "null") return 1;
    if (b === "null") return -1;
    return parseFloat(String(b)) - parseFloat(String(a));
  });
  const ranking: string[] = [];
  const remaining: string[][] = [];
  keys.forEach((k) => {
    const bucket = percentBuckets.get(k)!;
    if (bucket.length === 1) ranking.push(bucket[0]);
    else remaining.push(bucket.slice());
  });
  return { ranking, remainingTies: remaining };
}

// For now, rules B-D will be implemented in a simple manner; E-G are placeholders
export function applyTieBreakers(
  tiedTeams: string[],
  allTeamsOrdered: TeamRecord[],
  games: Game[]
): { order: string[]; applied: string[] } {
  if (tiedTeams.length <= 1) return { order: tiedTeams, applied: [] };
  const appliedSet = new Set<string>();
  if (tiedTeams.length > 1) appliedSet.add("A");
  // 1: Rule A
  const { ranking: ruleARanking, remainingTies } = applyRuleA(tiedTeams, games);
  if (remainingTies.length === 0)
    return { order: ruleARanking, applied: ["A"] };
  // For each remaining tie group, try Rule B
  const finalRanking: string[] = [];
  finalRanking.push(...ruleARanking);
  for (const group of remainingTies) {
    // Rule B: win percentage vs common conference opponents among the tied teams
    const commonOpponents = new Set<string>();
    // find intersection of opponents for the group. For simplicity, find opponents that appeared in schedule for all group
    // Build per-team opponent sets
    const perOppSets: Map<string, Set<string>> = new Map();
    group.forEach((t) => {
      const opps = new Set<string>();
      games.forEach((g) => {
        if (!g.played) return;
        if (g.winner === t) opps.add(g.loser!);
        if (g.loser === t) opps.add(g.winner!);
      });
      perOppSets.set(t, opps);
    });
    // intersection
    if (group.length > 0) {
      const it = perOppSets.get(group[0]) || new Set();
      it.forEach((o) => {
        let isCommon = true;
        perOppSets.forEach((s) => {
          if (!s.has(o)) isCommon = false;
        });
        if (isCommon) commonOpponents.add(o);
      });
    }
    // compute win pct vs common opponents
    const bucketScores: Map<number | string, string[]> = new Map();
    group.forEach((t) => {
      const pct = winPctAgainst(t, commonOpponents, games);
      const k = pct === null ? "null" : pct.toString();
      const arr = bucketScores.get(k) || [];
      arr.push(t);
      bucketScores.set(k, arr);
    });
    const keys = Array.from(bucketScores.keys()).sort((a, b) => {
      if (a === "null") return 1;
      if (b === "null") return -1;
      return parseFloat(String(b)) - parseFloat(String(a));
    });
    keys.forEach((k) => {
      const arr = bucketScores.get(k)!;
      if (arr.length === 1) {
        finalRanking.push(arr[0]);
        if (k !== "null") appliedSet.add("B");
      } else {
        // Rule C: iterate through standings (allTeamsOrdered) starting from top
        appliedSet.add("C");
        const broken = breakTiesByRuleC(arr, allTeamsOrdered, games);
        // If Rule C fell through to Rule D, breakTiesByRuleC will call breakTiesByRuleD; we can detect by comparing results
        const dBroken = breakTiesByRuleD(arr, games);
        if (JSON.stringify(broken) === JSON.stringify(dBroken))
          appliedSet.add("D");
        finalRanking.push(...broken);
      }
    });
  }
  // If still ties in finalRanking (some groups unresolved), apply Rule E (total wins) and fallback alphabetical
  // Final resolution will be sorted by total wins (Rule E) then alphabetically
  // helper -> total wins in all games
  function totalWins(team: string) {
    let wins = 0;
    games.forEach((g) => {
      if (!g.played) return;
      if (g.winner === team) wins++;
    });
    return wins;
  }

  // We'll simply sort the entire list by totalWins then alphabetically as final resolve
  const sorted = finalRanking.sort((a, b) => {
    const aw = totalWins(a);
    const bw = totalWins(b);
    if (aw !== bw) return bw - aw;
    // Rule F: compare SportSource rating if available
    const ar = ratings[a] ?? null;
    const br = ratings[b] ?? null;
    if (ar !== null && br !== null && ar !== br) {
      appliedSet.add("F");
      return br - ar;
    }
    // If all prior comparisons equal but alphabetical differs, record Rule G (coin toss fallback)
    const alpha = a.localeCompare(b);
    if (alpha !== 0) {
      appliedSet.add("G");
    }
    return alpha;
  });
  // Rule E (total wins) applied as final fallback
  appliedSet.add("E");
  const applied = Array.from(appliedSet);
  return { order: sorted, applied };
}

function breakTiesByRuleC(
  group: string[],
  allTeamsOrdered: TeamRecord[],
  games: Game[]
) {
  // Rule C: For each next highest placed common opponent in standings, compare win% vs them
  const order = allTeamsOrdered.map((r) => r.team);
  // to detect groups in ordering, we'll build a map from team -> confWins
  const confWinsMap: Map<string, number> = new Map();
  allTeamsOrdered.forEach((r) => confWinsMap.set(r.team, r.confWins));
  // exclude tied group from ordering
  const filteredOrder = order.filter((t) => !group.includes(t));
  for (const opp of filteredOrder) {
    // For the opp position: compute win pct vs opp (or vs group if opp is part of a tied group)
    // Detect group membership by scanning filteredOrder around the opp for same confWins
    const oppConf = confWinsMap.get(opp);
    const tiedGroupOpps = [opp];
    if (oppConf !== undefined) {
      // include consecutive teams with same confWins
      const idx = filteredOrder.indexOf(opp);
      // look forward
      for (let j = idx + 1; j < filteredOrder.length; j++) {
        const t = filteredOrder[j];
        if (confWinsMap.get(t) === oppConf) tiedGroupOpps.push(t);
        else break;
      }
      // look backward
      for (let j = idx - 1; j >= 0; j--) {
        const t = filteredOrder[j];
        if (confWinsMap.get(t) === oppConf) tiedGroupOpps.push(t);
        else break;
      }
    }
    const pctMap: Map<string, number | null> = new Map();
    group.forEach((t) => {
      const pct = winPctAgainst(t, new Set(tiedGroupOpps), games);
      pctMap.set(t, pct);
    });
    // see if pct values differ among group
    const scores = Array.from(pctMap.values()).map((v) =>
      v === null ? -1 : v
    );
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    if (max !== min) {
      // sort group by descending pct
      return group.sort((a, b) => {
        const aVal = pctMap.get(a) === null ? -1 : (pctMap.get(a) as number);
        const bVal = pctMap.get(b) === null ? -1 : (pctMap.get(b) as number);
        if (aVal !== bVal) return bVal - aVal;
        return a.localeCompare(b);
      });
    }
  }
  // if still tied through all opponents, proceed to Rule D
  return breakTiesByRuleD(group, games);
}

function breakTiesByRuleD(group: string[], games: Game[]) {
  // Rule D: Combined win percentage in conference games of conference opponents
  // For each team, gather its conference opponents, compute their conference record win percentage
  const sosMap: Map<string, number> = new Map();
  group.forEach((t) => {
    const opps = new Set<string>();
    games.forEach((g) => {
      if (!g.played) return;
      if (g.winner === t) opps.add(g.loser!);
      if (g.loser === t) opps.add(g.winner!);
    });
    let oppWins = 0;
    let oppGames = 0;
    opps.forEach((opp) => {
      games.forEach((g) => {
        if (!g.played) return;
        // count only conference-game wins/losses (we're already in conf)
        if (g.winner === opp) oppWins++;
        if (g.loser === opp) oppGames++;
        if (g.winner === opp || g.loser === opp) oppGames++;
      });
    });
    const pct = oppGames === 0 ? 0 : oppWins / oppGames;
    sosMap.set(t, pct);
  });
  // sort descending
  const sorted = group.sort((a, b) => {
    const aVal = sosMap.get(a) ?? 0;
    const bVal = sosMap.get(b) ?? 0;
    if (aVal !== bVal) return bVal - aVal;
    return a.localeCompare(b);
  });
  return sorted;
}
