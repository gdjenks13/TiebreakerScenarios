import { useState, useMemo } from "react";
import type { Game, ConferenceData, TeamRecord } from "@types";
import { computeStandings } from "@standings";
import { applyTieBreakers } from "@tiebreakers";

interface Theme {
  isDark: boolean;
  bg: { primary: string; secondary: string; tertiary: string; hover: string };
  text: { primary: string; secondary: string; muted: string };
  border: string;
  accent: string;
}

interface Props {
  conference: ConferenceData;
  unplayedGames: Game[];
  theme: Theme;
}

type StandingsWithTiebreaker = {
  standings: TeamRecord[];
  tiebreakerInfo: TiebreakerInfo[];
};

type TiebreakerInfo = {
  teams: string[];
  rulesApplied: string[];
  explanations: string[];
};

// Map rule codes to human-readable descriptions
// These match the codes used in tiebreakers.ts for each conference
const RULE_DESCRIPTIONS: Record<string, string> = {
  A: "Head-to-head / Record among tied teams",
  B: "Win % vs common opponents",
  C: "Win vs highest-placed common opponent",
  D: "Combined win % of opponents",
  G: "Random/Coin flip",
};

function getRuleDescription(code: string): string {
  return RULE_DESCRIPTIONS[code] || `Rule ${code}`;
}

export function GamePicker({ conference, unplayedGames, theme }: Props) {
  const [picks, setPicks] = useState<Map<string, string>>(new Map());

  const handlePick = (gameId: string, winner: string) => {
    setPicks((prev) => {
      const next = new Map(prev);
      if (next.get(gameId) === winner) {
        // Toggle off if clicking the same winner
        next.delete(gameId);
      } else {
        next.set(gameId, winner);
      }
      return next;
    });
  };

  const clearPicks = () => {
    setPicks(new Map());
  };

  const pickRandomly = () => {
    const newPicks = new Map<string, string>();
    unplayedGames.forEach((game) => {
      const homeTeam = game.loser;
      const awayTeam = game.winner;
      const winner = Math.random() < 0.5 ? homeTeam : awayTeam;
      newPicks.set(game.id, winner);
    });
    setPicks(newPicks);
  };

  const allPicked = picks.size === unplayedGames.length;

  // Compute final standings when all games are picked
  const result = useMemo((): StandingsWithTiebreaker | null => {
    if (!allPicked) return null;

    // Clone games and apply picks
    const gamesWithPicks: Game[] = conference.games.map((g) => {
      const pick = picks.get(g.id);
      if (pick) {
        return {
          ...g,
          played: true,
          winner: pick,
          loser: pick === g.winner ? g.loser : g.winner,
        };
      }
      return g;
    });

    const newConf = { ...conference, games: gamesWithPicks };
    const finalStandings: TeamRecord[] = computeStandings(newConf);

    // Resolve ties and track tiebreaker info
    const resolved: TeamRecord[] = [];
    const tiebreakerInfo: TiebreakerInfo[] = [];

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
        // Pass ALL conference games and standings for tiebreakers
        const resolvedResult = applyTieBreakers(
          newConf.name,
          tiedGroup,
          newConf.games,
          finalStandings
        );

        if (resolvedResult.applied.length > 0) {
          tiebreakerInfo.push({
            teams: resolvedResult.order,
            rulesApplied: resolvedResult.applied,
            explanations: resolvedResult.explanations,
          });
        }

        resolvedResult.order.forEach((t: string) => {
          const rec = finalStandings.find((r: TeamRecord) => r.team === t);
          if (rec) resolved.push(rec);
        });
      } else {
        resolved.push(cur);
      }
    }

    return {
      standings: resolved,
      tiebreakerInfo,
    };
  }, [allPicked, picks, conference]);

  // Current standings for context
  const currentStandings = useMemo(() => {
    return computeStandings(conference);
  }, [conference]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Standings for Context */}
        <div>
          <h3
            className="text-lg font-bold mb-3 uppercase tracking-wide"
            style={{ color: theme.text.primary }}
          >
            Current Standings
          </h3>
          <div
            className="rounded overflow-hidden"
            style={{
              backgroundColor: theme.bg.secondary,
              border: `1px solid ${theme.border}`,
            }}
          >
            <table className="w-full">
              <thead style={{ backgroundColor: theme.bg.tertiary }}>
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider"
                    style={{ color: theme.text.muted }}
                  >
                    Team
                  </th>
                  <th
                    className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider"
                    style={{ color: theme.text.muted }}
                  >
                    W
                  </th>
                  <th
                    className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider"
                    style={{ color: theme.text.muted }}
                  >
                    L
                  </th>
                </tr>
              </thead>
              <tbody style={{ borderTop: `1px solid ${theme.border}` }}>
                {currentStandings.map((row: TeamRecord, idx: number) => (
                  <tr
                    key={row.team}
                    className="transition-colors"
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = theme.bg.hover)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                    style={{
                      borderTop: idx > 0 ? `1px solid ${theme.border}` : "none",
                    }}
                  >
                    <td
                      className="px-4 py-3 font-semibold"
                      style={{ color: theme.text.primary }}
                    >
                      <span
                        className="mr-2 text-sm"
                        style={{ color: theme.text.muted }}
                      >
                        {idx + 1}
                      </span>
                      {row.team}
                    </td>
                    <td
                      className="px-4 py-3 text-center font-bold"
                      style={{ color: theme.text.primary }}
                    >
                      {row.confWins}
                    </td>
                    <td
                      className="px-4 py-3 text-center font-bold"
                      style={{ color: theme.text.primary }}
                    >
                      {row.confLosses}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Game Picker Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3
              className="text-lg font-bold uppercase tracking-wide"
              style={{ color: theme.text.primary }}
            >
              Pick Winners ({picks.size}/{unplayedGames.length})
            </h3>
            <div className="flex gap-2">
              <button
                onClick={pickRandomly}
                className="px-4 py-2 text-xs font-bold rounded transition-colors uppercase tracking-wide"
                style={{ backgroundColor: theme.accent, color: "#ffffff" }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Pick Randomly
              </button>
              {picks.size > 0 && (
                <button
                  onClick={clearPicks}
                  className="px-4 py-2 text-xs font-bold rounded transition-colors uppercase tracking-wide"
                  style={{
                    backgroundColor: theme.bg.secondary,
                    color: theme.text.primary,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = theme.bg.hover)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = theme.bg.secondary)
                  }
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {unplayedGames.map((game) => {
              const pick = picks.get(game.id);
              const homeTeam = game.loser; // In the CSV, loser column is home
              const awayTeam = game.winner; // winner column is away

              return (
                <div
                  key={game.id}
                  className="rounded overflow-hidden"
                  style={{
                    backgroundColor: theme.bg.secondary,
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  <div className="flex items-stretch">
                    {/* Home Team Button */}
                    <button
                      onClick={() => handlePick(game.id, homeTeam)}
                      className="flex-1 py-3 px-4 font-bold text-left transition-all"
                      style={{
                        backgroundColor:
                          pick === homeTeam ? theme.accent : theme.bg.secondary,
                        color:
                          pick === homeTeam ? "#ffffff" : theme.text.primary,
                      }}
                      onMouseEnter={(e) => {
                        if (pick !== homeTeam)
                          e.currentTarget.style.backgroundColor =
                            theme.bg.hover;
                      }}
                      onMouseLeave={(e) => {
                        if (pick !== homeTeam)
                          e.currentTarget.style.backgroundColor =
                            theme.bg.secondary;
                      }}
                    >
                      {homeTeam}
                    </button>

                    <div
                      className="flex items-center px-3 text-xs font-bold"
                      style={{
                        backgroundColor: theme.bg.tertiary,
                        color: theme.text.muted,
                      }}
                    >
                      VS
                    </div>

                    {/* Away Team Button */}
                    <button
                      onClick={() => handlePick(game.id, awayTeam)}
                      className="flex-1 py-3 px-4 font-bold text-right transition-all"
                      style={{
                        backgroundColor:
                          pick === awayTeam ? theme.accent : theme.bg.secondary,
                        color:
                          pick === awayTeam ? "#ffffff" : theme.text.primary,
                      }}
                      onMouseEnter={(e) => {
                        if (pick !== awayTeam)
                          e.currentTarget.style.backgroundColor =
                            theme.bg.hover;
                      }}
                      onMouseLeave={(e) => {
                        if (pick !== awayTeam)
                          e.currentTarget.style.backgroundColor =
                            theme.bg.secondary;
                      }}
                    >
                      {awayTeam}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results Section */}
      {allPicked && result && (
        <div className="mt-8 space-y-6">
          <h3
            className="text-2xl font-bold mb-4 uppercase tracking-wide"
            style={{ color: theme.text.primary }}
          >
            Projected Final Standings
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Standings Table */}
            <div
              className="rounded overflow-hidden"
              style={{
                backgroundColor: theme.bg.secondary,
                border: `1px solid ${theme.border}`,
              }}
            >
              <table className="w-full">
                <thead style={{ backgroundColor: theme.bg.tertiary }}>
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider"
                      style={{ color: theme.text.muted }}
                    >
                      Rank
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider"
                      style={{ color: theme.text.muted }}
                    >
                      Team
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider"
                      style={{ color: theme.text.muted }}
                    >
                      W
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider"
                      style={{ color: theme.text.muted }}
                    >
                      L
                    </th>
                  </tr>
                </thead>
                <tbody style={{ borderTop: `1px solid ${theme.border}` }}>
                  {result.standings.map((row, idx) => (
                    <tr
                      key={row.team}
                      className="transition-colors"
                      style={{
                        backgroundColor:
                          idx < 2 ? `${theme.accent}1A` : "transparent",
                        borderTop:
                          idx > 0 ? `1px solid ${theme.border}` : "none",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = theme.bg.hover)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          idx < 2 ? `${theme.accent}1A` : "transparent")
                      }
                    >
                      <td
                        className="px-4 py-3 font-bold"
                        style={{ color: theme.text.muted }}
                      >
                        {idx + 1}
                      </td>
                      <td
                        className="px-4 py-3 font-bold"
                        style={{ color: theme.text.primary }}
                      >
                        {row.team}
                        {idx < 2 && (
                          <span
                            className="ml-2 text-xs font-bold"
                            style={{ color: theme.accent }}
                          >
                            ★ CCG
                          </span>
                        )}
                      </td>
                      <td
                        className="px-4 py-3 text-center font-bold"
                        style={{ color: theme.text.primary }}
                      >
                        {row.confWins}
                      </td>
                      <td
                        className="px-4 py-3 text-center font-bold"
                        style={{ color: theme.text.primary }}
                      >
                        {row.confLosses}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tiebreaker Info */}
            <div>
              <h4
                className="text-lg font-bold mb-3 uppercase tracking-wide"
                style={{ color: theme.text.primary }}
              >
                Tiebreakers Applied
              </h4>
              {result.tiebreakerInfo.length > 0 ? (
                <div className="space-y-3">
                  {result.tiebreakerInfo.map((info, idx) => (
                    <div
                      key={idx}
                      className="rounded p-4"
                      style={{
                        backgroundColor: theme.bg.secondary,
                        border: `1px solid ${theme.border}`,
                      }}
                    >
                      <div
                        className="font-bold mb-2"
                        style={{ color: theme.text.primary }}
                      >
                        {info.teams.join(", ")}
                      </div>
                      <div
                        className="text-sm mb-2"
                        style={{ color: theme.text.muted }}
                      >
                        {info.rulesApplied.map((rule, rIdx) => (
                          <span key={rule}>
                            {rIdx > 0 && (
                              <span
                                className="mx-1"
                                style={{ color: theme.accent }}
                              >
                                →
                              </span>
                            )}
                            <span className="font-semibold">
                              {getRuleDescription(rule)}
                            </span>
                          </span>
                        ))}
                      </div>
                      {info.explanations.length > 0 && (
                        <ul
                          className="mt-2 text-xs space-y-1"
                          style={{ color: theme.text.muted }}
                        >
                          {info.explanations.map((exp, eIdx) => (
                            <li key={eIdx} className="flex items-start">
                              <span
                                className="mr-2"
                                style={{ color: theme.accent }}
                              >
                                •
                              </span>
                              <span>{exp}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="rounded p-4"
                  style={{
                    backgroundColor: theme.bg.secondary,
                    border: `1px solid ${theme.border}`,
                    color: theme.text.muted,
                  }}
                >
                  No tiebreakers needed - all positions determined by record.
                </div>
              )}
            </div>
          </div>

          {/* Conference Championship Game */}
          <div
            className="rounded-lg p-6"
            style={{
              background: `linear-gradient(to right, ${theme.accent}, #8c0d1f)`,
              border: `1px solid ${theme.accent}`,
            }}
          >
            <h4
              className="text-sm font-bold mb-2 uppercase tracking-wider"
              style={{ color: "rgba(255,255,255,0.8)" }}
            >
              Conference Championship Game
            </h4>
            <div className="text-2xl font-bold" style={{ color: "#ffffff" }}>
              <span style={{ color: "rgba(255,255,255,0.6)" }}>#1</span>{" "}
              {result.standings[0].team}
              <span className="mx-4" style={{ color: "rgba(255,255,255,0.6)" }}>
                vs
              </span>
              <span style={{ color: "rgba(255,255,255,0.6)" }}>#2</span>{" "}
              {result.standings[1].team}
            </div>
          </div>
        </div>
      )}

      {!allPicked && picks.size > 0 && (
        <div
          className="p-4 rounded"
          style={{
            backgroundColor: `${theme.accent}1A`,
            border: `1px solid ${theme.accent}33`,
            color: theme.text.primary,
          }}
        >
          Pick {unplayedGames.length - picks.size} more game
          {unplayedGames.length - picks.size !== 1 ? "s" : ""} to see the final
          standings.
        </div>
      )}
    </div>
  );
}
