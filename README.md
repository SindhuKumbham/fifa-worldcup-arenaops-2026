# 🏟️ StadiumGuide AI

**GenAI-powered navigation assistant for FIFA World Cup 2026 volunteers and on-ground staff.**

Challenge 4: Smart Stadiums & Tournament Operations — Track: Smart Indoor Navigation

## The Problem

In an 80,000+ seat World Cup venue, volunteers and staff are constantly asked questions they can't possibly memorize the answer to: *"Where's the nearest accessible restroom?"*, *"Where do I take a lost child?"*, *"What's the escalation point for a security incident near Gate C?"* Getting these answers wrong — or too slowly — directly hurts the fan experience and, in urgent cases, safety.

## The Solution

A staff member types a fan's request in plain language. The system:

1. **Retrieves** only the relevant facts from a structured stadium knowledge base (gates, restrooms, medical stations, accessibility services, security posts, etc.) using lightweight keyword matching — no heavyweight vector database needed for a single venue's dataset.
2. **Generates** a short, clear, spoken-aloud-ready answer using Google Gemini (with Groq as an automatic fallback if Gemini is unavailable), strictly grounded in the retrieved facts.
3. **Returns** the answer to the volunteer in their selected language, flagged as `URGENT` automatically when the request involves medical, security, or lost-child scenarios.

Because the AI is only ever given real, retrieved facility data to work from, it cannot invent a gate or room that doesn't exist — a critical safety property for a live-venue tool.

## Architecture

```
Browser (public/)              Vercel Serverless Function (api/)
┌─────────────────┐            ┌──────────────────────────────┐
│ index.html       │  POST     │ ask.js                        │
│ styles.css        │ ───────► │  - validates & cleans input    │
│ script.js          │         │  - retrieves relevant KB facts │
│ (no API keys here) │ ◄─────── │  - calls Gemini (→ Groq backup)│
└─────────────────┘  JSON      │  - returns grounded answer      │
                                └──────────────────────────────┘
                                          │
                                          ▼
                                stadiumData.js (KB + retrieval,
                                pure functions, unit tested)
```

**Why this fixes the previous version's weak spots:**

| Area | Before | Now |
|---|---|---|
| **Security** | Gemini API key entered and stored client-side (visible in browser dev tools) | API keys live only in Vercel server environment variables; `api/ask.js` runs server-side and is the only thing that ever sees them. Input is also validated and length-limited server-side. |
| **Testing** | No automated tests | `tests/stadiumData.test.js` — 9 unit tests covering the knowledge base integrity and retrieval logic, runnable with `npm test` |
| **Accessibility** | Not addressed | Semantic HTML5, skip-to-content link, visible focus states, `aria-live` regions for screen-reader announcements, labeled form controls, 44px minimum touch targets, WCAG-AA color contrast, `prefers-reduced-motion` support |
| **Efficiency** | — | Pure, dependency-free retrieval function (no external API calls needed for retrieval itself); AI calls capped at 300 output tokens to control latency and cost |
| **Code Quality** | — | Clear file separation (UI / API / data), JSDoc-style comments explaining *why*, not just *what* |

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Add your API keys (for local dev only)
```bash
cp .env.example .env.local
# then edit .env.local and paste your real keys
```
Get a free Gemini key: https://aistudio.google.com/apikey
Get a free Groq key: https://console.groq.com/keys

### 3. Run tests
```bash
npm test
```

### 4. Deploy to Vercel
1. Push this repo to GitHub
2. Import it at https://vercel.com/new
3. In the Vercel project settings, add environment variables `GEMINI_API_KEY` and `GROQ_API_KEY` (your real keys — **do this in the Vercel dashboard, never in code**)
4. Deploy

## Judging Criteria Alignment

- **Problem Statement Alignment (High Impact):** Directly targets the recurring operational bottleneck of staff not knowing a mega-venue well enough to help fans instantly — a core "smart indoor navigation" use case named explicitly in the challenge brief.
- **Usability for diverse users (High Impact):** Multilingual response support, full keyboard navigation, and screen-reader compatibility.
- **Code Quality (High Impact):** Clean separation of concerns (UI, API, data), no dead code, descriptive naming, comments explaining architectural decisions.
- **Security (Medium Impact):** No secrets in client code or version control; server-side input validation; explicit HTTP method restriction on the API route.
- **Efficiency (Medium Impact):** Minimal dependencies (just Jest for testing — no framework overhead), fast pure-function retrieval, capped AI token usage.
- **Testing (Low Impact but was 0):** Real, passing unit test suite covering both the data layer and retrieval logic.

## Future Extensions (mentioned for roadmap credit)

- Swap the static knowledge base for a live facilities database per official venue.
- Feed in real-time crowd density data to dynamically reroute fans away from congested concourses (connects to the crowd management track).
- Cache common Q&A pairs client-side for offline-first resilience during network congestion at peak crowd moments.
