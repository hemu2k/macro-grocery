// Proxied through Vite dev server to avoid CORS — see vite.config.js
const API_URL = "/api/nvidia/v1/chat/completions";
const MODEL = "moonshotai/kimi-k2.5";
const KEY_STORAGE = "kimi-api-key";
const TIMEOUT_MS = 90_000; // 90s — thinking mode can be slow

// ── Key management ────────────────────────────────────────────────────────────

export function getApiKey() {
  return localStorage.getItem(KEY_STORAGE) ?? "";
}

export function saveApiKey(key) {
  localStorage.setItem(KEY_STORAGE, key.trim());
}

export function clearApiKey() {
  localStorage.removeItem(KEY_STORAGE);
}

export function isApiKeySet() {
  return !!getApiKey();
}

export function getMaskedKey() {
  const key = getApiKey();
  if (!key) return "";
  return "••••••••••••" + key.slice(-4);
}

// ── Timeout helper ────────────────────────────────────────────────────────────

function withTimeout(ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(id) };
}

// ── Core streaming call ───────────────────────────────────────────────────────

export async function kimiStream(messages, onChunk, onDone, onError) {
  const apiKey = getApiKey();
  if (!apiKey) { onError(new Error("API_KEY_MISSING")); return; }

  const { signal, clear } = withTimeout(TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: 16384,
        temperature: 1.0,
        top_p: 1.0,
        stream: true,
        chat_template_kwargs: { thinking: true },
      }),
    });

    clear();

    if (!response.ok) {
      if (response.status === 401) throw new Error("INVALID_API_KEY");
      if (response.status === 429) throw new Error("RATE_LIMITED");
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") { onDone(); return; }
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) onChunk(delta);
        } catch { /* skip malformed chunks */ }
      }
    }
    onDone();
  } catch (err) {
    clear();
    if (err.name === "AbortError") onError(new Error("TIMEOUT"));
    else onError(err);
  }
}

// ── Non-streaming (structured JSON) ──────────────────────────────────────────

export async function kimiComplete(messages) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API_KEY_MISSING");

  const { signal, clear } = withTimeout(TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: 16384,
        temperature: 1.0,
        top_p: 1.0,
        stream: false,
        chat_template_kwargs: { thinking: true },
      }),
    });

    clear();

    if (!response.ok) {
      if (response.status === 401) throw new Error("INVALID_API_KEY");
      if (response.status === 429) throw new Error("RATE_LIMITED");
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();
    return json.choices?.[0]?.message?.content ?? "";
  } catch (err) {
    clear();
    if (err.name === "AbortError") throw new Error("TIMEOUT");
    throw err;
  }
}

// ── Connection test ───────────────────────────────────────────────────────────

export async function testConnection() {
  try {
    const result = await kimiComplete([
      { role: "user", content: "Reply with exactly the word: OK" },
    ]);
    return { success: result.trim().toLowerCase().includes("ok"), error: null };
  } catch (err) {
    const msg = err.message;
    if (msg === "API_KEY_MISSING") return { success: false, error: "No API key set." };
    if (msg === "INVALID_API_KEY") return { success: false, error: "Invalid API key. Re-enter it in settings." };
    if (msg === "RATE_LIMITED") return { success: false, error: "Rate limited. Try again shortly." };
    if (msg === "TIMEOUT") return { success: false, error: "Request timed out (90s). Try again." };
    return { success: false, error: "Connection failed. Check your network." };
  }
}
