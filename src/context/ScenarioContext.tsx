import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Scenario, Game } from "../types";
import {
  loadOrGenerateScenarios,
  getAllConferenceKeys,
} from "../utils/scenarioCache";
import {
  analyzeAllTeamRequirements,
  type TeamRequirements,
} from "../utils/scenarioAnalysis";
import { parseConferenceCsv } from "../utils/csvParser";
import { conferenceRawMap } from "../utils/dataLoader";
import { getUnplayedGames } from "../utils/simulation";

export type ConferenceScenarioState = {
  scenarios: Scenario[] | null;
  unplayedGames: Game[];
  teamRequirements: Map<string, TeamRequirements>;
  loading: boolean;
  error: string | null;
  generatedAt: string | null;
};

type ScenarioContextType = {
  conferenceStates: Map<string, ConferenceScenarioState>;
  isInitializing: boolean;
  initializationProgress: { loaded: number; total: number };
};

const ScenarioContext = createContext<ScenarioContextType | null>(null);

export function useScenarios() {
  const context = useContext(ScenarioContext);
  if (!context) {
    throw new Error("useScenarios must be used within a ScenarioProvider");
  }
  return context;
}

export function useConferenceScenarios(
  confKey: string
): ConferenceScenarioState {
  const { conferenceStates } = useScenarios();
  return (
    conferenceStates.get(confKey) || {
      scenarios: null,
      unplayedGames: [],
      teamRequirements: new Map(),
      loading: true,
      error: null,
      generatedAt: null,
    }
  );
}

type ScenarioProviderProps = {
  children: ReactNode;
};

export function ScenarioProvider({ children }: ScenarioProviderProps) {
  const [conferenceStates, setConferenceStates] = useState<
    Map<string, ConferenceScenarioState>
  >(new Map());
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationProgress, setInitializationProgress] = useState({
    loaded: 0,
    total: 0,
  });

  const loadConference = useCallback(
    async (confKey: string): Promise<ConferenceScenarioState> => {
      try {
        const cachedData = await loadOrGenerateScenarios(confKey);

        if (!cachedData || cachedData.scenarios.length === 0) {
          return {
            scenarios: [],
            unplayedGames: [],
            teamRequirements: new Map(),
            loading: false,
            error: null,
            generatedAt: null,
          };
        }

        // Get conference data for team analysis
        const raw = conferenceRawMap[confKey];
        const conference = parseConferenceCsv(confKey, raw);
        const unplayedGames = getUnplayedGames(conference);

        // Analyze team requirements
        const teamRequirements = analyzeAllTeamRequirements(
          cachedData.scenarios,
          unplayedGames,
          conference.teams
        );

        return {
          scenarios: cachedData.scenarios,
          unplayedGames,
          teamRequirements,
          loading: false,
          error: null,
          generatedAt: cachedData.generatedAt,
        };
      } catch (error) {
        console.error(`Error loading ${confKey}:`, error);
        return {
          scenarios: null,
          unplayedGames: [],
          teamRequirements: new Map(),
          loading: false,
          error: error instanceof Error ? error.message : "Unknown error",
          generatedAt: null,
        };
      }
    },
    []
  );

  // Initialize all conferences on mount
  useEffect(() => {
    const initializeAllConferences = async () => {
      const allKeys = getAllConferenceKeys();
      setInitializationProgress({ loaded: 0, total: allKeys.length });

      // Set initial loading states
      const initialStates = new Map<string, ConferenceScenarioState>();
      allKeys.forEach((key) => {
        initialStates.set(key, {
          scenarios: null,
          unplayedGames: [],
          teamRequirements: new Map(),
          loading: true,
          error: null,
          generatedAt: null,
        });
      });
      setConferenceStates(initialStates);

      // Load conferences one at a time to avoid blocking
      for (let i = 0; i < allKeys.length; i++) {
        const confKey = allKeys[i];
        const state = await loadConference(confKey);

        setConferenceStates((prev) => {
          const newMap = new Map(prev);
          newMap.set(confKey, state);
          return newMap;
        });

        setInitializationProgress({ loaded: i + 1, total: allKeys.length });
      }

      setIsInitializing(false);
    };

    initializeAllConferences();
  }, [loadConference]);

  return (
    <ScenarioContext.Provider
      value={{ conferenceStates, isInitializing, initializationProgress }}
    >
      {children}
    </ScenarioContext.Provider>
  );
}
