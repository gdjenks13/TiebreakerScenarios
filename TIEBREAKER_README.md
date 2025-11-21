## Tiebreaker Scenarios UI

This app simulates remaining conference games and computes tiebreaker scenarios for each team being in the Top 2.

- How to run:

  - Install dependencies: `bun install`
  - Start dev server: `bunx vite`
  - Open in browser and click a conference to view standings and simulate scenarios.

- Features:

  - Parses CSVs from `src/data/*` with four-column rows: `Winner,WPts,Loser,LPts`.
  - Detects unplayed games (rows with blank scores) and enumerates combinations to simulate final standings.
  - Implements tie-breaker rules A-D (head-to-head, win% vs common opponents, win% against next-highest placed common opponent, and combined opponent win%).
  - Implements Rule E in a soft way: total wins in dataset; Rule F is a placeholder (SportSource) and Rule G falls back to alphabetical as a deterministic tie-break.

- Limitations:
  - The simulation currently limits to the first 20 unplayed games to keep scenario counts reasonable (2^20).
  - Additional data (SportSource rankings, FCS annotations) can be added to enhance tie-breaker rule E/F.
