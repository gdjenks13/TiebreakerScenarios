import { useMemo, useState } from "react";
import type { Game, TeamRecord } from "@types";
import { parseConferenceCsv, conferenceRawMap } from "@data";
import { computeStandings } from "@standings";
import { getScenarioData } from "@scenarios";
import { GamePicker } from "@components/GamePicker";

type ViewMode = "scenarios" | "picker";

interface Theme {
  isDark: boolean;
  bg: {
    primary: string;
    secondary: string;
    tertiary: string;
    hover: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  border: string;
  accent: string;
}

interface Props {
  confKey: string;
  theme: Theme;
}

export function ConferencePage({ confKey, theme }: Props) {
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
      <div
        className="p-4 rounded border"
        style={{
          backgroundColor: `${theme.accent}10`,
          color: theme.accent,
          borderColor: `${theme.accent}30`,
        }}
      >
        No scenario data found for {confKey}. Run{" "}
        <code
          className="px-2 py-1 rounded font-mono text-sm"
          style={{
            backgroundColor: `${theme.accent}20`,
          }}
        >
          bun run generate
        </code>{" "}
        first.
      </div>
    );
  }

  const { scenarios, unplayedGames, generatedAt } = scenarioData;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2
            className="text-3xl font-bold mb-1"
            style={{ color: theme.text.primary }}
          >
            {confKey.toUpperCase()}
          </h2>
          {generatedAt && (
            <p className="text-xs" style={{ color: theme.text.secondary }}>
              Last updated: {new Date(generatedAt).toLocaleString()}
            </p>
          )}
        </div>

        {/* View Mode Tabs */}
        <div
          className="flex rounded"
          style={{
            backgroundColor: theme.bg.secondary,
            border: `1px solid ${theme.border}`,
          }}
        >
          <button
            onClick={() => setViewMode("scenarios")}
            className="px-6 py-2.5 text-sm font-bold transition-colors"
            style={{
              backgroundColor:
                viewMode === "scenarios" ? theme.accent : "transparent",
              color:
                viewMode === "scenarios" ? "#ffffff" : theme.text.secondary,
            }}
          >
            SCENARIO ANALYSIS
          </button>
          <button
            onClick={() => setViewMode("picker")}
            className="px-6 py-2.5 text-sm font-bold transition-colors"
            style={{
              backgroundColor:
                viewMode === "picker" ? theme.accent : "transparent",
              color: viewMode === "picker" ? "#ffffff" : theme.text.secondary,
            }}
          >
            GAME PICKER
          </button>
        </div>
      </div>

      {/* Game Picker View */}
      {viewMode === "picker" && conference && (
        <GamePicker
          key={confKey}
          conference={conference}
          unplayedGames={unplayedGames}
          theme={theme}
        />
      )}

      {/* Scenario Analysis View */}
      {viewMode === "scenarios" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Standings */}
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
                        style={{ color: theme.text.secondary }}
                      >
                        Team
                      </th>
                      <th
                        className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider"
                        style={{ color: theme.text.secondary }}
                      >
                        W
                      </th>
                      <th
                        className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider"
                        style={{ color: theme.text.secondary }}
                      >
                        L
                      </th>
                    </tr>
                  </thead>
                  <tbody style={{ borderTop: `1px solid ${theme.border}` }}>
                    {standings.map((row: TeamRecord, idx: number) => (
                      <tr
                        key={row.team}
                        className="transition-colors"
                        style={{
                          borderTop:
                            idx > 0 ? `1px solid ${theme.border}` : "none",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            theme.bg.hover)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            "transparent")
                        }
                      >
                        <td
                          className="px-4 py-3 font-semibold"
                          style={{ color: theme.text.primary }}
                        >
                          <span
                            className="mr-2 text-sm"
                            style={{ color: theme.text.secondary }}
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

            {/* Remaining Games */}
            <div>
              <h3
                className="text-lg font-bold mb-3 uppercase tracking-wide"
                style={{ color: theme.text.primary }}
              >
                Remaining Games ({unplayedGames.length})
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
                        style={{ color: theme.text.secondary }}
                      >
                        Home
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider"
                        style={{ color: theme.text.secondary }}
                      >
                        Away
                      </th>
                    </tr>
                  </thead>
                  <tbody style={{ borderTop: `1px solid ${theme.border}` }}>
                    {unplayedGames.map((g: Game, idx: number) => (
                      <tr
                        key={g.id}
                        className="transition-colors"
                        style={{
                          borderTop:
                            idx > 0 ? `1px solid ${theme.border}` : "none",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            theme.bg.hover)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            "transparent")
                        }
                      >
                        <td
                          className="px-4 py-3 font-semibold"
                          style={{ color: theme.text.primary }}
                        >
                          {g.loser}
                        </td>
                        <td
                          className="px-4 py-3 font-semibold"
                          style={{ color: theme.text.primary }}
                        >
                          {g.winner}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {scenarios && scenarios.length > 0 && (
            <div className="mt-8">
              <h3
                className="text-2xl font-bold mb-4"
                style={{ color: theme.text.primary }}
              >
                <span style={{ color: theme.accent }}>{scenarios.length}</span>{" "}
                POSSIBLE SCENARIOS
              </h3>

              <div
                className="rounded overflow-hidden"
                style={{
                  backgroundColor: theme.bg.secondary,
                  border: `1px solid ${theme.border}`,
                }}
              >
                <div
                  className="px-4 py-3"
                  style={{
                    backgroundColor: theme.bg.tertiary,
                    borderBottom: `1px solid ${theme.border}`,
                  }}
                >
                  <h4
                    className="text-sm font-bold uppercase tracking-wider"
                    style={{ color: theme.text.secondary }}
                  >
                    Championship Game Probabilities
                  </h4>
                </div>
                <table className="w-full">
                  <thead
                    style={{
                      backgroundColor: theme.bg.tertiary,
                      borderBottom: `1px solid ${theme.border}`,
                    }}
                  >
                    <tr>
                      <th
                        className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider"
                        style={{ color: theme.text.secondary }}
                      >
                        Team
                      </th>
                      <th
                        className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider"
                        style={{ color: theme.text.secondary }}
                      >
                        Scenarios
                      </th>
                      <th
                        className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider"
                        style={{ color: theme.text.secondary }}
                      >
                        Probability
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider"
                        style={{ color: theme.text.secondary }}
                      >
                        Paths to Championship
                      </th>
                    </tr>
                  </thead>
                  <tbody style={{ borderTop: `1px solid ${theme.border}` }}>
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
                            <tr
                              key={s.team}
                              className="transition-colors"
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  theme.bg.hover)
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "transparent")
                              }
                            >
                              <td
                                className="px-4 py-4 font-bold text-base"
                                style={{ color: theme.text.primary }}
                              >
                                {s.team}
                              </td>
                              <td
                                className="px-4 py-4 text-center font-semibold"
                                style={{ color: theme.text.primary }}
                              >
                                {count}
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span
                                  className="text-lg font-bold"
                                  style={{
                                    color:
                                      parseFloat(pct) > 75
                                        ? "#00c853"
                                        : parseFloat(pct) > 50
                                        ? "#fdd835"
                                        : parseFloat(pct) > 25
                                        ? "#ff9800"
                                        : theme.text.muted,
                                  }}
                                >
                                  {pct}%
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                {requirements && requirements.top2Count > 0 && (
                                  <div className="space-y-2">
                                    {requirements.sufficientConditions.length >
                                    0 ? (
                                      <div className="space-y-1">
                                        <p
                                          className="text-xs font-bold uppercase tracking-wide mb-2"
                                          style={{ color: theme.text.muted }}
                                        >
                                          Guaranteed if:
                                        </p>
                                        <div className="max-h-48 overflow-y-auto space-y-1">
                                          {requirements.sufficientConditions.map(
                                            (condition, idx) => (
                                              <div
                                                key={idx}
                                                className="text-xs px-3 py-2 rounded"
                                                style={{
                                                  backgroundColor: theme.isDark
                                                    ? "#0b2e1a" /* dark green */
                                                    : "#e6f4ea" /* light green */,
                                                  border: `1px solid ${
                                                    theme.isDark
                                                      ? "#14532d"
                                                      : "#b7e4c7"
                                                  }`,
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    color: theme.text.primary,
                                                  }}
                                                >
                                                  {condition.outcomes.map(
                                                    (outcome, oIdx) => (
                                                      <span key={oIdx}>
                                                        {oIdx > 0 && (
                                                          <span
                                                            style={{
                                                              color:
                                                                theme.text
                                                                  .muted,
                                                            }}
                                                          >
                                                            {" "}
                                                            AND{" "}
                                                          </span>
                                                        )}
                                                        <span className="font-semibold">
                                                          {outcome.winner}
                                                        </span>{" "}
                                                        <span
                                                          style={{
                                                            color:
                                                              theme.text.muted,
                                                          }}
                                                        >
                                                          beats
                                                        </span>{" "}
                                                        <span className="font-semibold">
                                                          {outcome.loser}
                                                        </span>
                                                      </span>
                                                    )
                                                  )}
                                                </div>
                                                <div
                                                  className="mt-1 text-[10px]"
                                                  style={{
                                                    color: theme.text.muted,
                                                  }}
                                                >
                                                  {
                                                    condition.guaranteedScenarios
                                                  }
                                                  /{requirements.totalScenarios}{" "}
                                                  scenarios
                                                </div>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <p
                                        className="text-xs"
                                        style={{ color: theme.text.muted }}
                                      >
                                        No guaranteed paths available
                                      </p>
                                    )}

                                    {requirements.blockingConditions.length >
                                      0 && (
                                      <div className="space-y-1 mt-3">
                                        <p
                                          className="text-xs font-bold uppercase tracking-wide mb-2"
                                          style={{ color: theme.accent }}
                                        >
                                          Eliminated if:
                                        </p>
                                        <div className="space-y-1">
                                          {requirements.blockingConditions.map(
                                            (condition, idx) => (
                                              <div
                                                key={idx}
                                                className="text-xs px-3 py-2 rounded"
                                                style={{
                                                  backgroundColor: theme.isDark
                                                    ? "#3a0e12" /* dark red */
                                                    : "#fee2e2" /* light red */,
                                                  border: `1px solid ${
                                                    theme.isDark
                                                      ? "#7f1d1d"
                                                      : "#fecaca"
                                                  }`,
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    color: theme.text.primary,
                                                  }}
                                                >
                                                  {condition.outcomes.map(
                                                    (outcome, oIdx) => (
                                                      <span key={oIdx}>
                                                        {oIdx > 0 && (
                                                          <span
                                                            style={{
                                                              color:
                                                                theme.text
                                                                  .muted,
                                                            }}
                                                          >
                                                            {" "}
                                                            AND{" "}
                                                          </span>
                                                        )}
                                                        <span className="font-semibold">
                                                          {outcome.winner}
                                                        </span>{" "}
                                                        <span
                                                          style={{
                                                            color:
                                                              theme.text.muted,
                                                          }}
                                                        >
                                                          beats
                                                        </span>{" "}
                                                        <span className="font-semibold">
                                                          {outcome.loser}
                                                        </span>
                                                      </span>
                                                    )
                                                  )}
                                                </div>
                                              </div>
                                            )
                                          )}
                                        </div>
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
