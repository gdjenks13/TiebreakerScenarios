import type { ConferenceData, TeamRecord } from "../types";

export function computeStandings(conf: ConferenceData): TeamRecord[] {
  const teamsMap: Map<string, TeamRecord> = new Map();

  conf.teams.forEach((t) => {
    teamsMap.set(t, {
      team: t,
      confWins: 0,
      confLosses: 0,
      gamesPlayed: 0,
      conferenceGamesPlayed: 0,
    });
  });

  conf.games.forEach((g) => {
    if (!g.played) return;
    const w = teamsMap.get(g.winner);
    const l = teamsMap.get(g.loser);
    if (!w) {
      teamsMap.set(g.winner!, {
        team: g.winner!,
        confWins: 1,
        confLosses: 0,
        gamesPlayed: 1,
        conferenceGamesPlayed: 1,
      });
    } else {
      w.confWins += 1;
      w.gamesPlayed += 1;
      w.conferenceGamesPlayed += 1;
    }
    if (!l) {
      teamsMap.set(g.loser!, {
        team: g.loser!,
        confWins: 0,
        confLosses: 1,
        gamesPlayed: 1,
        conferenceGamesPlayed: 1,
      });
    } else {
      l.confLosses += 1;
      l.gamesPlayed += 1;
      l.conferenceGamesPlayed += 1;
    }
  });

  const rows = Array.from(teamsMap.values());
  rows.sort((a, b) => {
    const aPct = a.confWins / Math.max(1, a.conferenceGamesPlayed);
    const bPct = b.confWins / Math.max(1, b.conferenceGamesPlayed);
    if (aPct !== bPct) return bPct - aPct;
    return a.team.localeCompare(b.team);
  });

  return rows;
}
