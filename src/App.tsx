import { useState } from "react";
import { ConferencePage } from "./components/ConferencePage";
import { conferenceRawMap } from "./utils/dataLoader";
import { ScenarioProvider, useScenarios } from "./context/ScenarioContext";

function AppContent() {
  const [selected, setSelected] = useState<string>("AAC");
  const { isInitializing, initializationProgress } = useScenarios();

  return (
    <div className="min-h-screen bg-gray-800 flex justify-center">
      <div className="w-[80%] bg-white min-h-screen p-8">
        <h1 className="text-3xl font-bold text-center">Tiebreaker Scenarios</h1>

        {isInitializing && (
          <div className="mt-2 text-center text-sm text-gray-600">
            Loading scenarios... ({initializationProgress.loaded}/
            {initializationProgress.total})
          </div>
        )}

        <div className="mt-2 text-center">
          <h2 className="text-xl font-semibold">Conferences</h2>
          <div className="flex gap-2 mt-1">
            {Object.keys(conferenceRawMap).map((key) => (
              <button
                key={key}
                className={`px-4 py-1 rounded-md font-bold ${
                  selected === key ? "bg-blue-500 text-white" : "bg-gray-200"
                }`}
                onClick={() => setSelected(key)}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2">
          {selected && <ConferencePage key={selected} confKey={selected} />}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ScenarioProvider>
      <AppContent />
    </ScenarioProvider>
  );
}

export default App;
