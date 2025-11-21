import React, { useMemo, useState } from "react";
import type { Scenario as ScenarioType } from "../types";
import type { Game as GameType } from "../types";
import { parseConferenceCsv } from "../utils/csvParser";
import { conferenceRawMap } from "../utils/dataLoader";
import { computeStandings } from "../utils/standings";
import { getUnplayedGames } from "../utils/simulation";
import { simulateConference } from "../utils/simulation";
import { MAX_SIMULATION } from "@/utils/constants";

type Props = { confKey: string };

export const ConferencePage: React.FC<Props> = ({ confKey }) => {
  const [scenarios, setScenarios] = useState<ScenarioType[] | null>(null);

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

      <div className="mt-4">
        <button
          onClick={simulate}
          className="px-3 py-1 bg-blue-500 text-white rounded-md"
        >
          Simulate Scenarios
        </button>
        {unplayed.length > MAX_SIMULATION && (
          <div className="mt-2 text-sm text-yellow-600">
            Warning: more than ${MAX_SIMULATION} unplayed games detected; Will
            not calculate until then.
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
