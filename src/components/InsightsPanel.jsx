const TYPE_CONFIG = {
  always: { icon: "✅", label: "Always in your list" },
  never: { icon: "❌", label: "Never suggest" },
  avoid: { icon: "⚠️", label: "Usually skip" },
  qty: { icon: "⚖️", label: "Preferred quantities" },
  cuisine: { icon: "🍛", label: "Cuisine lean" },
  custom: { icon: "➕", label: "Custom staples" },
};

function ConfidenceBar({ confidence }) {
  const color =
    confidence < 20
      ? "bg-gray-300"
      : confidence < 50
      ? "bg-yellow-400"
      : confidence < 80
      ? "bg-blue-500"
      : "bg-green-500";

  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div
        className={`${color} h-2 rounded-full transition-all duration-700`}
        style={{ width: `${confidence}%` }}
      />
    </div>
  );
}

export default function InsightsPanel({ insights, confidence, totalInteractions }) {
  const isLearning = confidence < 20;

  // Group insights by type for cleaner display
  const grouped = {};
  for (const item of insights) {
    if (!grouped[item.type]) grouped[item.type] = [];
    grouped[item.type].push(item.text);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">
          🧠 What I've learned about you
        </h3>
        <span className="text-xs text-gray-400">{totalInteractions} interactions</span>
      </div>

      {/* Confidence bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Confidence</span>
          <span className="font-medium">{confidence}%</span>
        </div>
        <ConfidenceBar confidence={confidence} />
      </div>

      {/* Still learning placeholder */}
      {isLearning ? (
        <p className="text-xs text-gray-400 italic text-center py-2">
          Still learning... edit your list a few times to build your profile.
        </p>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([type, texts]) => {
            const config = TYPE_CONFIG[type] ?? { icon: "•", label: type };

            // qty items are listed individually
            if (type === "qty") {
              return (
                <div key={type}>
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    {config.icon} {config.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {texts.map((t, i) => (
                      <span
                        key={i}
                        className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              );
            }

            // Extract item names from text for badge display
            const content = texts.map((t) =>
              t.replace(/^[^:]+:\s*/, "").replace(/^Cuisine lean:\s*/, "")
            );

            return (
              <div key={type}>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  {config.icon} {config.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {content.flatMap((c) =>
                    c.split(", ").map((name, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          type === "never"
                            ? "bg-red-50 text-red-600"
                            : type === "avoid"
                            ? "bg-orange-50 text-orange-600"
                            : type === "always"
                            ? "bg-green-50 text-green-700"
                            : type === "cuisine"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {name.trim()}
                      </span>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
