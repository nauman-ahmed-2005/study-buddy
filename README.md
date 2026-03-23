# 📚 Study Buddy

A study timer app that helps you stay focused with configurable study and break sessions, plus fun minigames to play during breaks!

## Features

- **Configurable Timer** — Set custom study duration (1–120 min) and break duration (1–60 min)
- **Study/Break Cycle** — Automatically transitions from study to break and back
- **Session Counter** — Tracks how many study sessions you've completed
- **Break Minigames** — Three games to play during breaks:
  - ❌ **Tic Tac Toe** — Play against a simple AI
  - 🃏 **Memory Match** — Find matching emoji pairs
  - 🔢 **Number Guessing** — Guess a number between 1 and 100
- **Visual Progress Ring** — Animated SVG ring shows time remaining
- **Ambient Sounds** — White, brown, and pink noise generated locally in the browser
- **Spotify Music Player** — Connect your Spotify account and listen to music while studying (mini-player, search, play/pause/skip)
- **Dark Mode** — Automatically matches your system preference
- **AI Study Coach (Agentic UI)** — Chat-driven onboarding, plan preview/edit, explicit confirm-before-apply, regenerate and rollback support

## Getting Started

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173) in your browser.

## Build

```bash
npm run build
npm run preview
```

## AI Study Coach

The app now includes an **AI Study Coach** panel (🤖 button in the header) with:

- Guided chat to gather goals, deadlines, availability, and preferences
- Structured plan preview with rationale/confidence
- Constraint controls (max focus, game breaks, no late-night preference)
- **Apply Plan** with a settings diff confirmation modal
- **Regenerate** and **Rollback** plan actions
- Strict runtime plan schema validation and deterministic fallback plan generation

### Current architecture note

This repository is currently frontend-only (React + Vite), so AI endpoints are modeled locally in `src/services/ai/*` to preserve backward compatibility and avoid introducing an unfinished backend in this change.

The service layer mirrors target endpoint behavior:

- `chatWithCoach` ~ `POST /api/ai/chat`
- `generatePlan` ~ `POST /api/ai/plan/generate`
- apply/rollback are executed in-app with local persisted plan versions

### Strict plan JSON contract

The coach validates plan payloads against the required shape at runtime (`validateStudyPlan`), including:

- top-level required keys
- per-day/per-session structure
- session profile + game break enum
- adaptation rules
- confidence range `0..1`
- `needsUserConfirmation` boolean

### API contract examples (target backend shape)

`POST /api/ai/chat`

```json
{
  "message": "My exam is in 3 weeks and math is weak.",
  "conversationId": "conv_123"
}
```

```json
{
  "conversationId": "conv_123",
  "reply": "Great input — I can turn this into a structured, realistic plan.",
  "followUpQuestions": [
    "Which days and times are you realistically available to study?"
  ]
}
```

`POST /api/ai/plan/generate`

```json
{
  "userId": "user_42",
  "horizonDays": 7,
  "constraints": {
    "maxFocusMinutes": 45,
    "minBreakMinutes": 5,
    "gamesEnabled": true
  }
}
```

Response shape:

```json
{
  "plan": {
    "planTitle": "Fallback Focus Plan",
    "horizonDays": 7,
    "dailyPlans": [
      {
        "date": "2026-03-23",
        "sessions": [
          {
            "subject": "Math",
            "topic": "Core practice set 1.1",
            "focusMinutes": 25,
            "breakMinutes": 5,
            "longBreakAfter": 4,
            "gameBreak": true,
            "priority": 1
          }
        ],
        "notes": "Balanced sessions with recovery breaks."
      }
    ],
    "sessionProfile": {
      "defaultFocusMinutes": 25,
      "defaultBreakMinutes": 5,
      "longBreakMinutes": 15,
      "sessionsBeforeLongBreak": 4,
      "gameBreakFrequency": "low"
    },
    "adaptationRules": [
      {
        "condition": "Completion rate below 60% for the last 5 sessions",
        "adjustment": "Reduce daily sessions by 1 and shorten focus blocks by 5 minutes."
      }
    ],
    "rationale": "Completion rate is mixed, so workload stays conservative for consistency. Constraints and current timer settings were respected.",
    "confidence": 0.62,
    "needsUserConfirmation": true
  },
  "generatedBy": "ai_rules",
  "usedFallback": false
}
```

### Fallback behavior

If generation fails or output becomes invalid, the service:

1. Builds a deterministic rule-based plan from settings/constraints
2. Marks generation source as `fallback_rules`
3. Returns a safe, user-visible fallback reason

### Analytics events emitted

- `plan_generated`
- `plan_applied`
- `plan_regenerated`
- `plan_rolled_back`

## Spotify Music Integration Setup

The 🎵 music player (bottom-left) integrates with Spotify via the official **Web Playback SDK** and **PKCE OAuth** flow — no backend or client secret required.

> **Requirement:** Users must have a **Spotify Premium** subscription for in-browser playback.

### 1. Create a Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click **Create app** and fill in the details
3. Under **Redirect URIs**, add:
   - `http://127.0.0.1:5173/` (local development)
   - Your production URL, e.g. `https://yoursite.com/`
4. Save and copy your **Client ID**

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your Client ID:

```bash
cp .env.example .env
```

```env
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
```

The `VITE_` prefix makes this variable available to the browser bundle. This is a public client identifier — **no client secret is used or needed**.

### 3. How It Works

1. User clicks the 🎵 button (bottom-left) and then **Connect Spotify**
2. Browser redirects to Spotify's authorization page (PKCE flow)
3. After approval, Spotify redirects back to the app
4. The app exchanges the code for tokens using PKCE (no server needed)
5. Tokens are stored in `localStorage` and auto-refreshed before expiry
6. The Spotify Web Playback SDK creates a browser player device
7. Users can search for tracks and control playback from the mini-player

### Security Notes

- The Client ID is a public identifier; the PKCE flow requires no client secret
- Access and refresh tokens are stored in `localStorage` and never sent to any server other than `accounts.spotify.com` and `api.spotify.com`
- Refresh tokens are automatically rotated by Spotify on each refresh

## Tech Stack

- [React](https://react.dev/) 19
- [Vite](https://vite.dev/) 8
- Vanilla CSS with CSS custom properties
- [Spotify Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk) (loaded at runtime)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api) (PKCE OAuth, no backend)
