import { useState } from "react";
import { ConferencePage } from "@components/ConferencePage";
import { getAllConferenceKeys } from "@scenarios";

const conferenceKeys = getAllConferenceKeys();

export default function App() {
  const [selected, setSelected] = useState(conferenceKeys[0]);

  return (
    <div className="min-h-screen bg-gray-800 flex justify-center">
      <div className="w-[80%] bg-white min-h-screen p-8">
        <h1 className="text-3xl font-bold text-center">Tiebreaker Scenarios</h1>

        <div className="mt-2 text-center">
          <h2 className="text-xl font-semibold">Conferences</h2>
          <div className="flex gap-2 mt-1 justify-center">
            {conferenceKeys.map((key) => (
              <button
                key={key}
                className={`px-4 py-1 rounded-md font-bold transition-colors ${
                  selected === key
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
                onClick={() => setSelected(key)}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <ConferencePage confKey={selected} />
        </div>
      </div>
    </div>
  );
}
