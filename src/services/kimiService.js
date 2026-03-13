const API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL = "moonshotai/kimi-k2.5";
const KEY_STORAGE = "kimi-api-key";

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

// ── Core streaming call ───────────────────────────────────────────────────────

/**
 * Streams a chat completion from Kimi K2.5.
 * onChunk(text) → called per token
 * onDone()      → called when stream ends
 * onError(err)  → called on failure
 */
export async function kimiStream(messages, onChunk, onDone, onError) {
  const apiKey = getApiKey();
  if (!apiKey) {
    onError(new Error("API_KEY_MISSING"));
    return;
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
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

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 401) throw new Error("INVALID_API_KEY");
      if (response.status === 429) throw new Error("RATE_LIMITED");
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // keep incomplete last line

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          onDone();
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) onChunk(delta);
        } catch {
          // skip malformed chunks
        }
      }
    }
    onDone();
  } catch (err) {
    onError(err);
  }
}

// ── Non-streaming (structured JSON) ──────────────────────────────────────────

/**
 * Single-shot completion — used when we need reliable JSON parsing.
 * Returns the full response string.
 */
export async function kimiComplete(messages) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API_KEY_MISSING");

  const response = await fetch(API_URL, {
    method: "POST",
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

  if (!response.ok) {
    if (response.status === 401) throw new Error("INVALID_API_KEY");
    if (response.status === 429) throw new Error("RATE_LIMITED");
    throw new Error(`HTTP ${response.status}`);
  }

  const json = await response.json();
  return json.choices?.[0]?.message?.content ?? "";
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
    if (msg === "INVALID_API_KEY") return { success: false, error: "Invalid API key." };
    if (msg === "RATE_LIMITED") return { success: false, error: "Rate limited. Try again shortly." };
    return { success: false, error: "Connection failed. Check your network." };
  }
}
