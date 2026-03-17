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

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build

```bash
npm run build
npm run preview
```

## Spotify Music Integration Setup

The 🎵 music player (bottom-left) integrates with Spotify via the official **Web Playback SDK** and **PKCE OAuth** flow — no backend or client secret required.

> **Requirement:** Users must have a **Spotify Premium** subscription for in-browser playback.

### 1. Create a Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click **Create app** and fill in the details
3. Under **Redirect URIs**, add:
   - `http://localhost:5173/` (local development)
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
