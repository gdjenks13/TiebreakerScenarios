import React, { useMemo } from "react";
import type { Game as GameType } from "../types";
import { parseConferenceCsv } from "../utils/csvParser";
import { conferenceRawMap } from "../utils/dataLoader";
import { computeStandings } from "../utils/standings";
import { useConferenceScenarios } from "../context/ScenarioContext";

type Props = { confKey: string };

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-3 text-gray-600">Loading scenarios...</span>
  </div>
);

export const ConferencePage: React.FC<Props> = ({ confKey }) => {
  const {
    scenarios,
    unplayedGames,
    teamRequirements,
    loading,
    error,
    generatedAt,
  } = useConferenceScenarios(confKey);

  const conference = useMemo(() => {
    const raw = (conferenceRawMap as Record<string, string>)[confKey];
    if (!raw) return null;
    return parseConferenceCsv(confKey, raw);
  }, [confKey]);

  const standings = useMemo(() => {
    if (!conference) return [];
    return computeStandings(conference);
  }, [conference]);

  // Show loading state
  if (loading) {
    return (
      <>
        <h2 className="text-2xl font-bold">{confKey}</h2>
        <LoadingSpinner />
      </>
    );
  }

  // Show error state
  if (error) {
    return (
      <>
        <h2 className="text-2xl font-bold">{confKey}</h2>
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          Error loading scenarios: {error}
        </div>
      </>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold">{confKey}</h2>
      {generatedAt && (
        <p className="text-xs text-gray-500">
          Last generated: {new Date(generatedAt).toLocaleString()}
        </p>
      )}
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
            Remaining Games ({unplayedGames.length})
          </h3>
          <table className="mt-4 w-sm table-auto border-collapse overflow-hidden rounded-md">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="px-2 py-1 text-left font-semibold">Home</th>
                <th className="px-2 py-1 text-left font-semibold">Away</th>
              </tr>
            </thead>

            <tbody className="bg-gray-100 text-gray-800">
              {unplayedGames.map((g: GameType) => (
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

      {scenarios && scenarios.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xl font-semibold text-blue-600">
            Scenarios: {scenarios.length}
          </h3>

          <div className="mt-4">
            <h4 className="text-lg font-medium text-gray-700 mb-2">
              Top 2 Counts
            </h4>
            <table className="min-w-3/4 border border-gray-300 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="p-2 text-left">Team</th>
                  <th className="p-2 text-left">Top 2 Count</th>
                  <th className="p-2 text-left">Top 2 %</th>
                  <th className="p-2 text-left">Scenarios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {standings
                  .map((s) => {
                    const hits = scenarios.filter((sc) =>
                      sc.topTwo.includes(s.team)
                    );
                    const count = hits.length;
                    const pct = ((count / scenarios.length) * 100).toFixed(2);
                    return { s, count, pct };
                  })
                  .sort((a, b) => b.count - a.count)
                  .map(({ s, count, pct }) => {
                    const requirements = teamRequirements.get(s.team);

                    return (
                      <tr key={s.team} className="hover:bg-gray-50">
                        <td className="p-2 font-medium">{s.team}</td>
                        <td className="p-2">{count}</td>
                        <td className="p-2">{pct}%</td>
                        <td className="p-2">
                          {requirements && requirements.top2Count > 0 && (
                            <div className="mb-1 p-2 bg-blue-50 rounded border border-blue-200">
                              <h5 className="font-semibold text-sm text-blue-800 mb-1">
                                Paths for <strong>{s.team}</strong>:
                              </h5>
                              {requirements.sufficientConditions.length > 0 ? (
                                <div className="space-y-2">
                                  <p className="text-xs text-gray-600">
                                    <strong>Guaranteed Top 2 if:</strong>
                                  </p>
                                  <div className="max-h-64 overflow-y-auto">
                                    {requirements.sufficientConditions.map(
                                      (condition, idx) => (
                                        <div
                                          key={idx}
                                          className="text-xs bg-green-100 px-2 py-1 rounded mb-1"
                                        >
                                          {condition.outcomes.map(
                                            (outcome, oIdx) => (
                                              <span key={oIdx}>
                                                {oIdx > 0 && " AND "}
                                                <strong>
                                                  {outcome.winner}
                                                </strong>{" "}
                                                beats{" "}
                                                <strong>{outcome.loser}</strong>
                                              </span>
                                            )
                                          )}
                                          <span className="text-gray-500 ml-1">
                                            ({condition.guaranteedScenarios}/
                                            {requirements.totalScenarios}{" "}
                                            scenarios)
                                          </span>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-600">
                                  No paths found - team cannot make top 2
                                </p>
                              )}

                              {requirements.blockingConditions.length > 0 && (
                                <div className="space-y-2 mt-3">
                                  <p className="text-xs text-gray-600">
                                    <strong>Eliminated if:</strong>
                                  </p>
                                  {requirements.blockingConditions.map(
                                    (condition, idx) => (
                                      <div
                                        key={idx}
                                        className="text-xs bg-red-100 px-2 py-1 rounded"
                                      >
                                        {condition.outcomes.map(
                                          (outcome, oIdx) => (
                                            <span key={oIdx}>
                                              {oIdx > 0 && " AND "}
                                              <strong>
                                                {outcome.winner}
                                              </strong>{" "}
                                              beats{" "}
                                              <strong>{outcome.loser}</strong>
                                            </span>
                                          )
                                        )}
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
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
