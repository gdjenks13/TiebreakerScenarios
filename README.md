# Tie Breaker Scenarios

A React + TypeScript application for analyzing college football conference championship scenarios and tiebreaker rules.

## Project Structure

This project follows modern React conventions with a clean separation of concerns:

```
src/
├── components/          # React components
│   ├── App.tsx
│   ├── ConferencePage.tsx
│   └── GamePicker.tsx
├── lib/                 # Domain logic organized by feature
│   ├── constants/       # Application constants
│   ├── data/            # CSV parsing and data loading
│   ├── scenarios/       # Scenario analysis and data management
│   ├── simulation/      # Conference simulation engine
│   ├── standings/       # Standings computation
│   └── tiebreakers/     # Tiebreaker rule implementations
├── data/                # Static data files (CSV, JSON)
├── types.ts             # TypeScript type definitions
└── utils/               # Legacy utility files (re-exported via lib/)
```

### Path Aliases

The project uses TypeScript path aliases for clean imports:

- `@types` - Type definitions
- `@components/*` - React components
- `@lib/*` - All library modules
- `@tiebreakers` - Tiebreaker logic
- `@standings` - Standings computation
- `@scenarios` - Scenario analysis
- `@simulation` - Simulation engine
- `@data` - Data loading utilities
- `@constants` - Application constants

Example:

```typescript
import { computeStandings } from "@standings";
import { applyTieBreakers } from "@tiebreakers";
import type { ConferenceData } from "@types";
```

## Conference Tiebreaker Rules

AAC: https://theamerican.org/documents/2024/10/21/2024_FB_Tiebreakers.pdf

ACC: https://theacc.com/documents/2023/5/17/ACC_FOOTBALL_TIEBREAKER_POLICY.pdf

Big 10: https://bigten.org/fb/article/blt6104802d94ebe1ab/

Big 12: https://big12sports.com/documents/2024/9/5/Big_12_Football_2024_Tiebreaker_Policy.pdf

MW: https://storage.googleapis.com/themw-com/2025/10/c71edc0a-2025-mw-football-championship-tiebreakers-final.pdf

SBC: https://sunbeltsports.org/sports/2018/8/30/FB_Tie-Breakers.aspx

SEC: https://www.secsports.com/fbtiebreaker

## Written Out, I am excluding rules that involve rankings, metrics, and non-conference stats

### AAC

If two team tie

- Head to Head (H2H) Result
- Win percentage against all common conference opponents
- Coin Toss

If more than two teams tie.

- Mini Round-Robin (records against all other tied teams), if any of the teams did not play each other, the teams remail tied UNLESS one team defeated all other tied teams.
  - Example: OSU, Michigan, Indiana are tied. Michigan and Indiana did not play each other, but OSU beat both Michigan and Indiana. Ohio State is on top, Michigan and Indiana proceed to use two team tiebreaker
- Win Percentage against all common conference opponents
  - This includes if two of the teams played each other, which only happens if more than two teams are at this point of the tiebreaker
- Coin Toss

### ACC -- SEC

If two team tie

- Head to Head (H2H) Result
- Win percentage against all common conference opponents
- win percentage against common opponents based upon their order of finish (overall conference win percentage, with ties broken) and proceeding through other common opponents based upon their order of finish.
- Combined win percentage of conference opponents
- Coin Toss

If more than two teams tie

- Mini Round-Robin (records against all other tied teams), if any of the teams did not play each other, the teams remail tied UNLESS one team defeated all other tied teams, then that team is at the top OR UNLESS one team lost to all other tied teams, then that team is at the bottom.
- Win percentage against all common conference opponents
- win percentage against common opponents based upon their order of finish (overall conference win percentage, with ties broken) and proceeding through other common opponents based upon their order of finish.
- Combined win percentage of conference opponents
- Coin Toss

### Big 10 -- Big 12

If two team tie

- Head to Head (H2H) Result
- Win percentage against all common conference opponents
- win percentage against common opponents based upon their order of finish (overall conference win percentage, with ties broken) and proceeding through other common opponents based upon their order of finish.
- Combined win percentage of conference opponents
- Coin Toss

If more than two teams tie

- Mini Round-Robin (records against all other tied teams), if any of the teams did not play each other, the teams remail tied UNLESS one team defeated all other tied teams, then that team is at the top.
- Win percentage against all common conference opponents
- win percentage against common opponents based upon their order of finish (overall conference win percentage, with ties broken) and proceeding through other common opponents based upon their order of finish.
- Combined win percentage of conference opponents
- Coin Toss
