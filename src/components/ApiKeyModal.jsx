import { useState, useEffect } from "react";
import {
  getApiKey,
  saveApiKey,
  clearApiKey,
  getMaskedKey,
  testConnection,
} from "../services/kimiService";

export default function ApiKeyModal({ onClose, onSaved }) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState(null); // null | "testing" | "ok" | "fail"
  const [errorMsg, setErrorMsg] = useState("");
  const [hasSaved, setHasSaved] = useState(isApiKeySet());

  function isApiKeySet() {
    return !!getApiKey();
  }

  useEffect(() => {
    setHasSaved(isApiKeySet());
  }, []);

  async function handleTest() {
    const key = input.trim();
    if (!key) return;
    saveApiKey(key); // temporarily save so testConnection can read it
    setStatus("testing");
    setErrorMsg("");
    const result = await testConnection();
    if (result.success) {
      setStatus("ok");
      setHasSaved(true);
      onSaved?.();
    } else {
      setStatus("fail");
      setErrorMsg(result.error);
      clearApiKey();
      setHasSaved(false);
    }
  }

  function handleSave() {
    const key = input.trim();
    if (!key) return;
    saveApiKey(key);
    setHasSaved(true);
    setStatus(null);
    onSaved?.();
    onClose();
  }

  function handleRemove() {
    clearApiKey();
    setInput("");
    setHasSaved(false);
    setStatus(null);
    setErrorMsg("");
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-800">NVIDIA API Key</h3>
            <p className="text-xs text-gray-400 mt-0.5">For Kimi K2.5 AI features</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Current status */}
          {hasSaved && (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <div>
                <p className="text-xs font-medium text-green-700">Connected to Kimi K2.5 ✓</p>
                <p className="text-xs text-green-600 font-mono mt-0.5">{getMaskedKey()}</p>
              </div>
              <button
                onClick={handleRemove}
                className="text-xs text-red-500 hover:underline"
              >
                Remove
              </button>
            </div>
          )}

          {/* Input */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {hasSaved ? "Replace key" : "Enter your NVIDIA API key"}
            </label>
            <input
              type="password"
              value={input}
              onChange={(e) => { setInput(e.target.value); setStatus(null); }}
              placeholder="nvapi-••••••••••••••••••••••••"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <p className="text-xs text-gray-400 mt-1">
              Get your key at{" "}
              <span className="text-indigo-500">integrate.api.nvidia.com</span>
            </p>
          </div>

          {/* Test result */}
          {status === "testing" && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
              Testing connection...
            </div>
          )}
          {status === "ok" && (
            <p className="text-sm text-green-600 font-medium">✓ Connection successful</p>
          )}
          {status === "fail" && (
            <p className="text-sm text-red-500">{errorMsg}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleTest}
              disabled={!input.trim() || status === "testing"}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              Test connection
            </button>
            <button
              onClick={handleSave}
              disabled={!input.trim()}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40"
            >
              Save key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
