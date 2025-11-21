import React, { useMemo, useState } from "react";
import type { Scenario as ScenarioType } from "../types";
import type { Game as GameType } from "../types";
import { parseConferenceCsv } from "../utils/csvParser";
import { conferenceRawMap } from "../utils/dataLoader";
import { computeStandings } from "../utils/standings";
import { getUnplayedGames } from "../utils/simulation";
import { simulateConference } from "../utils/simulation";
import { getTop2Insights } from "../utils/minimalScenarios";
import { MAX_SIMULATION } from "@/utils/constants";

type Props = { confKey: string };

export const ConferencePage: React.FC<Props> = ({ confKey }) => {
  const [scenarios, setScenarios] = useState<ScenarioType[] | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const conference = useMemo(() => {
    const raw = (conferenceRawMap as Record<string, string>)[confKey];
    if (!raw) return null;
    return parseConferenceCsv(confKey, raw);
  }, [confKey]);

  const standings = useMemo(() => {
    if (!conference) return [];
    return computeStandings(conference);
  }, [conference]);

  const unplayed = useMemo(() => {
    if (!conference) return [];
    return getUnplayedGames(conference);
  }, [conference]);

  const top2Insights = useMemo(() => {
    if (!conference || !selectedTeam) return null;
    return getTop2Insights(conference, selectedTeam);
  }, [conference, selectedTeam]);

  const simulate = async () => {
    if (!conference) return;
    const result = simulateConference(conference);
    setScenarios(result);
  };

  return (
    <>
      <h2 className="text-2xl font-bold">{confKey}</h2>
      <div className="flex gap-8">
        <div>
          <h3 className="text-xl font-semibold">Current Standings</h3>
          <table className="mt-4 w-sm table-auto border-collapse overflow-hidden rounded-md">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="px-2 py-1 text-left font-semibold">Team</th>
                <th className="px-2 py-1 text-center font-semibold">Wins</th>
                <th className="px-2 py-1 text-center font-semibold">Losses</th>
                <th className="px-2 py-1 text-center font-semibold">Top 2?</th>
              </tr>
            </thead>

            <tbody className="bg-gray-100">
              {standings.map((row) => (
                <tr
                  key={row.team}
                  className="even:bg-gray-200 hover:bg-blue-100 transition-colors"
                >
                  <td className="px-2 py-1 text-left font-bold">{row.team}</td>
                  <td className="px-2 py-1 text-center font-semibold">
                    {row.confWins}
                  </td>
                  <td className="px-2 py-1 text-center font-semibold">
                    {row.confLosses}
                  </td>
                  <td className="px-2 py-1 text-center">
                    <button
                      onClick={() => setSelectedTeam(row.team)}
                      className={`px-2 py-0.5 text-xs rounded ${
                        selectedTeam === row.team
                          ? "bg-green-600 text-white"
                          : "bg-gray-300 hover:bg-gray-400"
                      }`}
                    >
                      Analyze
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="text-xl font-semibold">
            Remaining Games ({unplayed.length})
          </h3>
          <table className="mt-4 w-sm table-auto border-collapse overflow-hidden rounded-md">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="px-2 py-1 text-left font-semibold">Home</th>
                <th className="px-2 py-1 text-left font-semibold">Away</th>
              </tr>
            </thead>

            <tbody className="bg-gray-100 text-gray-800">
              {unplayed.map((g: GameType) => (
                <tr
                  key={g.id}
                  className="even:bg-gray-200 hover:bg-blue-100 transition-colors"
                >
                  <td className="px-1 py-1 font-medium">{g.loser}</td>
                  <td className="px-1 py-1 font-medium">{g.winner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTeam && top2Insights && unplayed.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
          <h3 className="text-xl font-semibold text-blue-800">
            Top 2 Analysis: {selectedTeam}
          </h3>
          {top2Insights.canFinishTop2 ? (
            <div className="mt-3">
              <p className="text-green-700 font-medium">
                ✓ {selectedTeam} can finish in the top 2!
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Overall probability:{" "}
                {(top2Insights.probability * 100).toFixed(2)}%
              </p>

              {top2Insights.mustWinGames.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-red-700">
                    Must Win (Required):
                  </h4>
                  <ul className="mt-2 space-y-1">
                    {top2Insights.mustWinGames.map((game) => (
                      <li
                        key={game.id}
                        className="text-sm bg-red-100 px-3 py-1 rounded"
                      >
                        {selectedTeam} must beat{" "}
                        {game.winner === selectedTeam
                          ? game.loser
                          : game.winner}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {top2Insights.helpfulWins.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-yellow-700">
                    Helpful Wins (High Impact):
                  </h4>
                  <ul className="mt-2 space-y-1">
                    {top2Insights.helpfulWins
                      .slice(0, 5)
                      .map(({ game, impact }) => (
                        <li
                          key={game.id}
                          className="text-sm bg-yellow-100 px-3 py-1 rounded flex justify-between"
                        >
                          <span>
                            {selectedTeam} beating{" "}
                            {game.winner === selectedTeam
                              ? game.loser
                              : game.winner}
                          </span>
                          <span className="font-semibold">
                            {(impact * 100).toFixed(0)}%
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {top2Insights.mustWinGames.length === 0 &&
                top2Insights.helpfulWins.length === 0 && (
                  <p className="mt-3 text-sm text-gray-700">
                    No specific games are critical. {selectedTeam} has multiple
                    paths to the top 2.
                  </p>
                )}
            </div>
          ) : (
            <p className="mt-3 text-red-700 font-medium">
              ✗ {selectedTeam} cannot finish in the top 2 with remaining games.
            </p>
          )}
        </div>
      )}

      <div className="mt-4">
        <button
          onClick={simulate}
          disabled={unplayed.length > MAX_SIMULATION}
          className={`px-3 py-1 rounded-md ${
            unplayed.length > MAX_SIMULATION
              ? "bg-gray-400 text-gray-700 cursor-not-allowed"
              : "bg-blue-500 text-white hover:bg-blue-600"
          }`}
        >
          Simulate Scenarios
        </button>
        {unplayed.length > MAX_SIMULATION && (
          <div className="mt-2 text-sm text-red-600 font-medium">
            Warning: Too many unplayed games ({unplayed.length} &gt;{" "}
            {MAX_SIMULATION}). Simulation disabled to prevent browser freeze.
          </div>
        )}
      </div>

      {scenarios && (
        <div className="mt-4">
          <h3 className="text-xl font-semibold text-blue-600">
            Scenarios: {scenarios.length}
          </h3>

          <div className="mt-4">
            <h4 className="text-lg font-medium text-gray-700 mb-2">
              Top 2 counts
            </h4>
            <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left">Team</th>
                  <th className="px-3 py-2 text-left">Top 2 Count</th>
                  <th className="px-3 py-2 text-left">Top 2 %</th>
                  <th className="px-3 py-2 text-left">Scenarios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {standings.map((s) => {
                  const hits = scenarios.filter((sc) =>
                    sc.topTwo.includes(s.team)
                  );
                  const count = hits.length;
                  const pct = ((count / scenarios.length) * 100).toFixed(2);

                  return (
                    <tr key={s.team} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{s.team}</td>
                      <td className="px-3 py-2">{count}</td>
                      <td className="px-3 py-2">{pct}%</td>
                      <td className="px-3 py-2">
                        {hits.length > 0 && (
                          <details className="mb-1">
                            <summary className="cursor-pointer text-blue-600 hover:text-blue-700">
                              Show sample scenarios ({Math.min(5, hits.length)})
                            </summary>
                            <ul className="mt-1 pl-4 list-disc text-sm text-gray-700">
                              {hits.slice(0, 5).map((sc, idx) => {
                                const outStr = sc.gameResults
                                  .map(
                                    (r, i) =>
                                      `${unplayed[i]?.winner ?? ""} => ${
                                        r
                                          ? unplayed[i]?.winner ?? ""
                                          : unplayed[i]?.loser ?? ""
                                      }`
                                  )
                                  .join("; ");

                                return (
                                  <li key={idx} className="mb-1">
                                    {idx + 1}: {sc.topTwo.join(" vs ")} -
                                    Outcomes: {outStr}
                                    {sc.appliedTieRules &&
                                      sc.appliedTieRules.length > 0 && (
                                        <div className="text-xs text-gray-500">
                                          Applied tie rules:{" "}
                                          {sc.appliedTieRules.join(", ")}
                                        </div>
                                      )}
                                  </li>
                                );
                              })}
                            </ul>
                          </details>
                        )}

                        {hits.length > 0 && (
                          <details>
                            <summary className="cursor-pointer text-blue-600 hover:text-blue-700">
                              Show all ({hits.length})
                            </summary>
                            <div className="max-h-48 overflow-y-auto mt-1">
                              <ul className="pl-4 list-disc text-sm text-gray-700">
                                {hits.map((sc, idx) => {
                                  const outStr = sc.gameResults
                                    .map(
                                      (r, i) =>
                                        `${unplayed[i]?.winner ?? ""} => ${
                                          r
                                            ? unplayed[i]?.winner ?? ""
                                            : unplayed[i]?.loser ?? ""
                                        }`
                                    )
                                    .join("; ");

                                  return (
                                    <li key={idx} className="mb-1">
                                      {idx + 1}: {sc.topTwo.join(" vs ")} -
                                      Outcomes: {outStr}
                                      {sc.appliedTieRules &&
                                        sc.appliedTieRules.length > 0 && (
                                          <div className="text-xs text-gray-500">
                                            Applied tie rules:{" "}
                                            {sc.appliedTieRules.join(", ")}
                                          </div>
                                        )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          </details>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default ConferencePage;
