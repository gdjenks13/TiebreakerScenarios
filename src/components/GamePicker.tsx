import { useState, useMemo } from "react";
import type { Game, ConferenceData, TeamRecord } from "@types";
import { computeStandings } from "@standings";
import { applyTieBreakers } from "@tiebreakers";

interface Props {
  conference: ConferenceData;
  unplayedGames: Game[];
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

export function GamePicker({ conference, unplayedGames }: Props) {
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
      <div className="flex gap-8">
        {/* Current Standings for Context */}
        <div className="shrink-0">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">
            Current Standings
          </h3>
          <table className="table-auto border-collapse overflow-hidden rounded-md text-sm">
            <thead className="bg-gray-600 text-white">
              <tr>
                <th className="px-2 py-1 text-left font-semibold">Team</th>
                <th className="px-2 py-1 text-center font-semibold">W</th>
                <th className="px-2 py-1 text-center font-semibold">L</th>
              </tr>
            </thead>
            <tbody className="bg-gray-50">
              {currentStandings.map((row: TeamRecord) => (
                <tr
                  key={row.team}
                  className="even:bg-gray-100 hover:bg-blue-50 transition-colors"
                >
                  <td className="px-2 py-1 font-medium">{row.team}</td>
                  <td className="px-2 py-1 text-center">{row.confWins}</td>
                  <td className="px-2 py-1 text-center">{row.confLosses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Game Picker Section */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-700">
              Pick Winners ({picks.size}/{unplayedGames.length})
            </h3>
            <div className="flex gap-2">
              <button
                onClick={pickRandomly}
                className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
              >
                Pick Randomly
              </button>
              {picks.size > 0 && (
                <button
                  onClick={clearPicks}
                  className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-2 max-w-xl">
            {unplayedGames.map((game) => {
              const pick = picks.get(game.id);
              const homeTeam = game.loser; // In the CSV, loser column is home
              const awayTeam = game.winner; // winner column is away

              return (
                <div
                  key={game.id}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200"
                >
                  {/* Home Team Button */}
                  <button
                    onClick={() => handlePick(game.id, homeTeam)}
                    className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                      pick === homeTeam
                        ? "bg-green-500 text-white shadow-md"
                        : "bg-white hover:bg-green-100 border border-gray-300"
                    }`}
                  >
                    {homeTeam}
                  </button>

                  <span className="text-gray-400 font-medium text-sm">vs</span>

                  {/* Away Team Button */}
                  <button
                    onClick={() => handlePick(game.id, awayTeam)}
                    className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                      pick === awayTeam
                        ? "bg-green-500 text-white shadow-md"
                        : "bg-white hover:bg-green-100 border border-gray-300"
                    }`}
                  >
                    {awayTeam}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results Section */}
      {allPicked && result && (
        <div className="border-t pt-6">
          <h3 className="text-xl font-semibold mb-4 text-green-700">
            Final Standings
          </h3>

          <div className="flex gap-8">
            {/* Standings Table */}
            <div>
              <table className="table-auto border-collapse overflow-hidden rounded-md">
                <thead className="bg-green-600 text-white">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">#</th>
                    <th className="px-3 py-2 text-left font-semibold">Team</th>
                    <th className="px-3 py-2 text-center font-semibold">W</th>
                    <th className="px-3 py-2 text-center font-semibold">L</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-50">
                  {result.standings.map((row, idx) => (
                    <tr
                      key={row.team}
                      className={`
                        ${idx < 2 ? "bg-green-100 font-semibold" : ""}
                        ${idx === 1 ? "border-b-2 border-green-400" : ""}
                        hover:bg-green-50 transition-colors
                      `}
                    >
                      <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium">
                        {row.team}
                        {idx < 2 && (
                          <span className="ml-2 text-xs text-green-600">
                            ★ CCG
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">{row.confWins}</td>
                      <td className="px-3 py-2 text-center">
                        {row.confLosses}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tiebreaker Info */}
            {result.tiebreakerInfo.length > 0 && (
              <div className="flex-1">
                <h4 className="text-lg font-medium mb-3 text-gray-700">
                  Tiebreakers Applied
                </h4>
                <div className="space-y-3">
                  {result.tiebreakerInfo.map((info, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-amber-50 border border-amber-200 rounded-lg"
                    >
                      <div className="font-medium text-amber-800 mb-1">
                        {info.teams.join(", ")}
                      </div>
                      <div className="text-sm text-amber-700">
                        {info.rulesApplied.map((rule, rIdx) => (
                          <span key={rule}>
                            {rIdx > 0 && " → "}
                            <span className="font-medium">
                              {getRuleDescription(rule)}
                            </span>
                          </span>
                        ))}
                      </div>
                      {info.explanations.length > 0 && (
                        <ul className="mt-2 text-xs text-amber-600 list-disc list-inside space-y-0.5">
                          {info.explanations.map((exp, eIdx) => (
                            <li key={eIdx}>{exp}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.tiebreakerInfo.length === 0 && (
              <div className="flex-1">
                <div className="p-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-600">
                  No tiebreakers needed - all positions determined by record.
                </div>
              </div>
            )}
          </div>

          {/* Conference Championship Game */}
          <div className="mt-6 p-4 bg-linear-to-r from-green-500 to-green-600 rounded-lg text-white">
            <h4 className="text-lg font-bold mb-2">
              Conference Championship Game
            </h4>
            <div className="text-2xl font-bold">
              #{1} {result.standings[0].team}
              <span className="mx-3 text-green-200">vs</span>#{2}{" "}
              {result.standings[1].team}
            </div>
          </div>
        </div>
      )}

      {!allPicked && picks.size > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
          Pick {unplayedGames.length - picks.size} more game
          {unplayedGames.length - picks.size !== 1 ? "s" : ""} to see the final
          standings.
        </div>
      )}
    </div>
  );
}
