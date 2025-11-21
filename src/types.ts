export type Game = {
  id: string;
  winner: string;
  winnerPts: number | null;
  loser: string;
  loserPts: number | null;
  played: boolean;
};

export type TieBreakerResult = {
  team: string;
  winner: boolean;
};

export type TeamRecord = {
  team: string;
  confWins: number;
  confLosses: number;
};

export type ConferenceData = {
  name: string;
  teams: string[];
  games: Game[];
};

export type Scenario = {
  gameResults: boolean[]; // for each unplayed game true = home/winner 1, false = other
  finalStandings: TeamRecord[];
  topTwo: string[]; // team names for top two
  appliedTieRules?: string[]; // e.g., ['A','B'] rules used to break ties
};
