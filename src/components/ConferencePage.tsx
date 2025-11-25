import { useMemo, useState } from "react";
import type { Game, TeamRecord } from "@types";
import { parseConferenceCsv, conferenceRawMap } from "@data";
import { computeStandings } from "@standings";
import { getScenarioData } from "@scenarios";
import { GamePicker } from "@components/GamePicker";

type ViewMode = "scenarios" | "picker";

interface Props {
  confKey: string;
}

export function ConferencePage({ confKey }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("scenarios");
  const scenarioData = getScenarioData(confKey);

  const conference = useMemo(() => {
    const raw = conferenceRawMap[confKey];
    if (!raw) return null;
    return parseConferenceCsv(confKey, raw);
  }, [confKey]);

  const standings = useMemo<TeamRecord[]>(() => {
    if (!conference) return [];
    return computeStandings(conference);
  }, [conference]);

  // Use pre-computed team requirements from cache
  const teamRequirements = scenarioData?.teamRequirements ?? {};

  if (!scenarioData) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded">
        No scenario data found for {confKey}. Run{" "}
        <code className="bg-red-200 px-1 rounded">bun run generate</code> first.
      </div>
    );
  }

  const { scenarios, unplayedGames, generatedAt } = scenarioData;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">{confKey}</h2>
          {generatedAt && (
            <p className="text-xs text-gray-500">
              Last generated: {new Date(generatedAt).toLocaleString()}
            </p>
          )}
        </div>

        {/* View Mode Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode("scenarios")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              viewMode === "scenarios"
                ? "bg-blue-500 text-white shadow"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Scenario Analysis
          </button>
          <button
            onClick={() => setViewMode("picker")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              viewMode === "picker"
                ? "bg-blue-500 text-white shadow"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Game Picker
          </button>
        </div>
      </div>

      {/* Game Picker View */}
      {viewMode === "picker" && conference && (
        <GamePicker
          key={confKey}
          conference={conference}
          unplayedGames={unplayedGames}
        />
      )}

      {/* Scenario Analysis View */}
      {viewMode === "scenarios" && (
        <>
          <div className="flex flex-wrap gap-8">
            <div className="flex-1 min-w-0 max-w-[45%]">
              <h3 className="text-xl font-semibold">Current Standings</h3>
              <table className="mt-4 w-full table-auto border-collapse overflow-hidden rounded-md">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="px-2 py-1 text-left font-semibold">Team</th>
                    <th className="px-2 py-1 text-center font-semibold">
                      Wins
                    </th>
                    <th className="px-2 py-1 text-center font-semibold">
                      Losses
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-gray-100">
                  {standings.map((row: TeamRecord) => (
                    <tr
                      key={row.team}
                      className="even:bg-gray-200 hover:bg-blue-100 transition-colors"
                    >
                      <td className="px-2 py-1 text-left font-bold">
                        {row.team}
                      </td>
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

            <div className="flex-1 min-w-0 max-w-[45%]">
              <h3 className="text-xl font-semibold">
                Remaining Games ({unplayedGames.length})
              </h3>
              <table className="mt-4 w-full table-auto border-collapse overflow-hidden rounded-md">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="px-2 py-1 text-left font-semibold">Home</th>
                    <th className="px-2 py-1 text-left font-semibold">Away</th>
                  </tr>
                </thead>

                <tbody className="bg-gray-100 text-gray-800">
                  {unplayedGames.map((g: Game) => (
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
                        const pct = ((count / scenarios.length) * 100).toFixed(
                          2
                        );
                        return { s, count, pct };
                      })
                      .sort(
                        (
                          a: { s: TeamRecord; count: number; pct: string },
                          b: { s: TeamRecord; count: number; pct: string }
                        ) => b.count - a.count
                      )
                      .map(
                        ({
                          s,
                          count,
                          pct,
                        }: {
                          s: TeamRecord;
                          count: number;
                          pct: string;
                        }) => {
                          const requirements = teamRequirements[s.team];

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
                                    {requirements.sufficientConditions.length >
                                    0 ? (
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
                                                      <strong>
                                                        {outcome.loser}
                                                      </strong>
                                                    </span>
                                                  )
                                                )}
                                                <span className="text-gray-500 ml-1">
                                                  (
                                                  {
                                                    condition.guaranteedScenarios
                                                  }
                                                  /{requirements.totalScenarios}{" "}
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

                                    {requirements.blockingConditions.length >
                                      0 && (
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
                                                    <strong>
                                                      {outcome.loser}
                                                    </strong>
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
                        }
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
