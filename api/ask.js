// api/ask.js — Vercel Serverless Function
//
// SECURITY NOTE: This function runs on Vercel's servers, never in the
// browser. API keys are read from environment variables (set in the
// Vercel dashboard under Project Settings > Environment Variables),
// so they are never exposed to end users via browser dev tools or
// network inspection.
//
// Primary provider: Google Gemini. Falls back to Groq automatically
// if Gemini fails (rate limit, outage, etc.).

const { stadiumKB, retrieveRelevantLocations } = require("./stadiumData");

const SYSTEM_PROMPT = `You are StadiumGuide AI, a navigation assistant built for FIFA World Cup 2026 volunteers and on-ground staff.
A staff member will describe a fan's need. You will be given a list of real stadium facilities relevant to that need.

Rules:
1. ONLY reference facilities from the provided list. Never invent a gate, room, or location that isn't listed.
2. Give a short, clear, step-by-step answer the volunteer can read aloud to a fan in under 15 seconds.
3. If the request involves accessibility (wheelchair, mobility, disability), explicitly mention the accessible route/entrance.
4. If the request sounds urgent (medical, lost child, security), start your answer with "URGENT:" and name the correct escalation point first.
5. Keep your answer to 3 sentences or fewer unless multiple steps are truly needed.
6. Respond in the requested language.`;

function validateAndCleanInput(query, language) {
  if (typeof query !== "string" || query.trim().length === 0) {
    return { error: "Query must be a non-empty string." };
  }
  if (query.length > 500) {
    return { error: "Query is too long (max 500 characters)." };
  }
  const allowedLanguages = ["English", "Spanish", "French", "Portuguese", "Arabic"];
  const safeLanguage = allowedLanguages.includes(language) ? language : "English";
  const cleanQuery = query.replace(/[<>{}]/g, "").trim();

  return { cleanQuery, safeLanguage };
}

async function callGemini(userMessage) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

async function callGroq(userMessage) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }
  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned an empty response");
  return text;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query, language } = req.body || {};
  const validation = validateAndCleanInput(query, language);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }
  const { cleanQuery, safeLanguage } = validation;

  const relevant = retrieveRelevantLocations(cleanQuery, stadiumKB);
  const context = relevant.map((item) => `- ${item.name} (${item.type}): ${JSON.stringify(item)}`).join("\n");

  const userMessage = `Staff request: "${cleanQuery}"
Respond in: ${safeLanguage}

Relevant stadium facilities:
${context}

Give the volunteer a short, clear answer.`;

  let answer, source;
  try {
    answer = await callGemini(userMessage);
    source = "Gemini 2.5 Flash";
  } catch (geminiError) {
    console.error("Gemini failed, falling back to Groq:", geminiError.message);
    try {
      answer = await callGroq(userMessage);
      source = "Groq (fallback)";
    } catch (groqError) {
      console.error("Groq also failed:", groqError.message);
      return res.status(502).json({
        error: "Both AI providers are currently unavailable. Please consult a supervisor directly.",
      });
    }
  }

  const urgent = /^URGENT:/i.test(answer.trim());
  return res.status(200).json({ answer, source, urgent });
};
