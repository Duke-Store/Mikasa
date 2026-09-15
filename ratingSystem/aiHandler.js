const SERVER_CONTEXT = require("./serverContext");

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];

const OPENROUTER_MODELS = [
  process.env.AI_MODEL || "google/gemini-2.5-flash:free",
  "meta-llama/llama-3-8b-instruct:free",
  "mistralai/mistral-7b-instruct:free"
];

const GROQ_MODELS = [
  process.env.AI_MODEL || "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768"
];

const chatSessions = new Map();

// --- Performance: TTL-based session cleanup (prevents memory leak) ---
const SESSION_TTL_MS = 30 * 60 * 1000;      // Sessions expire after 30 min of inactivity
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;  // Run cleanup sweep every 5 min

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getActiveProviders() {
  const preferred = process.env.AI_PROVIDER || "gemini";
  const candidates = [preferred, "gemini", "openrouter", "groq"];
  const uniqueCandidates = [...new Set(candidates)];
  return uniqueCandidates.filter(provider => {
    if (provider === "gemini") return !!process.env.GEMINI_API_KEY;
    if (provider === "openrouter") return !!process.env.OPENROUTER_API_KEY;
    if (provider === "groq") return !!process.env.GROQ_API_KEY;
    return false;
  });
}

function getOrCreateSession(userId) {
  if (!chatSessions.has(userId)) {
    chatSessions.set(userId, { history: [], lastActivity: Date.now() });
    console.log(`[AI] New chat session created for user: ${userId}`);
  }
  const session = chatSessions.get(userId);
  session.lastActivity = Date.now(); // Refresh on every access
  return session;
}

async function getAIResponse(userId, userMessage) {
  const session = getOrCreateSession(userId);
  const activeProviders = getActiveProviders();

  if (activeProviders.length === 0) {
    throw new Error("No active AI providers configured in .env (GEMINI_API_KEY, OPENROUTER_API_KEY, or GROQ_API_KEY must be provided)");
  }

  let lastError;

  for (const provider of activeProviders) {
    const models = 
      provider === "gemini" ? GEMINI_MODELS :
      provider === "openrouter" ? OPENROUTER_MODELS :
      provider === "groq" ? GROQ_MODELS : [];

    const apiKey = 
      provider === "gemini" ? process.env.GEMINI_API_KEY :
      provider === "openrouter" ? process.env.OPENROUTER_API_KEY :
      provider === "groq" ? process.env.GROQ_API_KEY : null;

    console.log(`[AI] Attempting provider "${provider}" for user ${userId}`);

    for (let attempt = 0; attempt < models.length; attempt++) {
      const modelName = models[attempt];
      try {
        let replyText;

        if (provider === "gemini") {
          const { GoogleGenerativeAI } = require("@google/generative-ai");
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: SERVER_CONTEXT,
          });

          const formattedHistory = session.history.map(msg => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }]
          }));

          const chat = model.startChat({ history: formattedHistory });
          const result = await chat.sendMessage(userMessage);
          replyText = result.response.text();
        } else {
          // OpenRouter or Groq via native fetch
          const url = provider === "openrouter" 
            ? "https://openrouter.ai/api/v1/chat/completions"
            : "https://api.groq.com/openai/v1/chat/completions";

          const headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          };

          if (provider === "openrouter") {
            headers["HTTP-Referer"] = "https://github.com/google/antigravity";
            headers["X-Title"] = "Amanda Discord Bot";
          }

          const systemMessage = { role: "system", content: SERVER_CONTEXT };
          const messages = [
            systemMessage,
            ...session.history,
            { role: "user", content: userMessage }
          ];

          console.log(`[AI] Calling ${provider} using model ${modelName}`);
          const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
              model: modelName,
              messages: messages
            })
          });

          if (!response.ok) {
            const errText = await response.text();
            const err = new Error(`API Error: ${response.status} - ${errText}`);
            err.status = response.status;
            throw err;
          }

          const data = await response.json();
          replyText = data.choices?.[0]?.message?.content;
          if (!replyText) {
            throw new Error("Invalid API response structure (choices[0].message.content is missing)");
          }
        }

        // Successfully generated a response
        session.history.push({ role: "user", content: userMessage });
        session.history.push({ role: "assistant", content: replyText });
        if (session.history.length > 20) {
          session.history = session.history.slice(-20);
        }
        console.log(`[AI] Response generated successfully using ${provider} (${modelName})`);
        return replyText;

      } catch (error) {
        console.warn(`⚠️ [AI] Provider ${provider} with model ${modelName} failed: ${error.message}`);
        lastError = error;

        // If it's a key/auth error (status 400, 401, or 403), skip remaining models for this provider
        const isAuthError = error.status && [400, 401, 403].includes(error.status);
        if (isAuthError) {
          console.warn(`[AI] Credentials error on ${provider}. Skipping remaining models for this provider.`);
          break;
        }

        // If retryable, wait and try next model
        const isRetryable = error.status ? [429, 500, 502, 503].includes(error.status) : true;
        if (isRetryable && attempt < models.length - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await sleep(delay);
        }
      }
    }
  }

  throw lastError || new Error("All AI providers failed to respond");
}

function clearUserSession(userId) {
  chatSessions.delete(userId);
  console.log(`[AI] Chat session cleared for user: ${userId}`);
}

function getActiveSessionCount() {
  return chatSessions.size;
}

// --- Performance: Periodic session cleanup sweep ---
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [userId, session] of chatSessions) {
    if (now - session.lastActivity > SESSION_TTL_MS) {
      chatSessions.delete(userId);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[AI] Session cleanup: removed ${cleaned} expired session(s). Active: ${chatSessions.size}`);
  }
}, CLEANUP_INTERVAL_MS);

module.exports = {
  getAIResponse,
  clearUserSession,
  getActiveSessionCount,
  getActiveProviders
};
