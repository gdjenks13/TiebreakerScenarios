import { useState, useEffect } from "react";
import { ConferencePage } from "@components/ConferencePage";
import { getAllConferenceKeys } from "@scenarios";

const conferenceKeys = getAllConferenceKeys();

export default function App() {
  const [selected, setSelected] = useState(conferenceKeys[0]);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : true;
  });

  useEffect(() => {
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  const theme = {
    isDark,
    bg: {
      primary: isDark ? "#1a1a1a" : "#f5f5f5",
      secondary: isDark ? "#0d0d0d" : "#ffffff",
      tertiary: isDark ? "#000000" : "#f9f9f9",
      hover: isDark ? "#1a1a1a" : "#f0f0f0",
    },
    text: {
      primary: isDark ? "#ffffff" : "#000000",
      secondary: isDark ? "#8c8c8c" : "#666666",
      muted: isDark ? "#666666" : "#999999",
    },
    border: isDark ? "#2a2a2a" : "#e0e0e0",
    accent: "#c8102e",
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bg.primary }}>
      {/* ESPN-style header */}
      <div
        style={{
          backgroundColor: theme.bg.tertiary,
          borderBottom: `1px solid ${theme.border}`,
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: theme.text.primary }}
          >
            College Football Tiebreaker Scenarios
          </h1>

          {/* Theme Toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-lg transition-colors"
            style={{
              backgroundColor: theme.bg.secondary,
              border: `1px solid ${theme.border}`,
            }}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <svg
                className="w-5 h-5"
                style={{ color: theme.text.primary }}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                style={{ color: theme.text.primary }}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Conference navigation */}
      <div
        style={{
          backgroundColor: theme.bg.secondary,
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide py-2">
            {conferenceKeys.map((key) => (
              <button
                key={key}
                className="px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors"
                style={{
                  color:
                    selected === key
                      ? theme.text.primary
                      : theme.text.secondary,
                  borderBottom:
                    selected === key ? `2px solid ${theme.accent}` : "none",
                }}
                onMouseEnter={(e) => {
                  if (selected !== key) {
                    e.currentTarget.style.color = theme.text.primary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (selected !== key) {
                    e.currentTarget.style.color = theme.text.secondary;
                  }
                }}
                onClick={() => setSelected(key)}
              >
                {key.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <ConferencePage confKey={selected} theme={theme} />
      </div>
    </div>
  );
}
