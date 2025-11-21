```typescript
// ...existing code...

export interface ConferenceConfig {
  name: string;
  teams: string[];
  divisions?: {
    [divisionName: string]: string[];
  };
}

export interface Top2Scenario {
  team: string;
  requiredOutcomes: GameOutcome[];
  guaranteesTop2: boolean;
}
```;
