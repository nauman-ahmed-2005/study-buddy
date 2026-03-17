/**
 * Spotify PKCE auth flow — runs entirely client-side.
 *
 * Token storage: localStorage.
 *   spotify_access_token  — short-lived access token
 *   spotify_refresh_token — long-lived refresh token
 *   spotify_expires_at    — Unix-ms timestamp when the access token expires
 *   spotify_code_verifier — ephemeral PKCE verifier (cleared after callback)
 *
 * No client_secret is used. PKCE is the official OAuth 2.0 method for
 * public/single-page apps. See Spotify docs:
 * https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
 */

import { generateCodeVerifier, generateCodeChallenge } from './pkce';

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;

const REDIRECT_URI =
  import.meta.env.VITE_SPOTIFY_REDIRECT_URI ||
  (typeof window !== 'undefined' ? window.location.origin + '/' : '');

const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
].join(' ');

const KEYS = {
  accessToken: 'spotify_access_token',
  refreshToken: 'spotify_refresh_token',
  expiresAt: 'spotify_expires_at',
  codeVerifier: 'spotify_code_verifier',
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Redirects the browser to Spotify's authorization page.
 * Stores the PKCE verifier in localStorage before redirecting.
 * @throws {Error} if VITE_SPOTIFY_CLIENT_ID is not configured
 */
export async function initiateLogin() {
  if (!CLIENT_ID) {
    throw new Error(
      'Spotify Client ID is not configured. Add VITE_SPOTIFY_CLIENT_ID to your .env file.',
    );
  }

  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  localStorage.setItem(KEYS.codeVerifier, verifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SCOPES,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

/**
 * Exchanges the authorization code returned by Spotify for tokens.
 * Clears the verifier from localStorage after a successful exchange.
 * @param {string} code — the `code` query parameter from the redirect
 * @throws {Error} on network or API failure
 */
export async function handleAuthCallback(code) {
  if (!CLIENT_ID) {
    throw new Error('Spotify Client ID is not configured.');
  }

  const verifier = localStorage.getItem(KEYS.codeVerifier);
  if (!verifier) {
    throw new Error('PKCE code verifier not found. Please try connecting again.');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error_description || `Token exchange failed (${response.status})`);
  }

  const data = await response.json();
  storeTokens(data);
  localStorage.removeItem(KEYS.codeVerifier);
}

/**
 * Refreshes the access token using the stored refresh token.
 * Automatically updates localStorage with the new tokens.
 * @returns {Promise<string>} the new access token
 * @throws {Error} if refresh fails (caller should treat user as logged out)
 */
export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(KEYS.refreshToken);
  if (!refreshToken) {
    throw new Error('No refresh token available.');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    clearTokens();
    throw new Error('Session expired. Please reconnect your Spotify account.');
  }

  const data = await response.json();
  storeTokens(data);
  return data.access_token;
}

/**
 * Returns a valid access token, automatically refreshing if it expires soon.
 * Returns null if the user is not authenticated.
 * @returns {Promise<string|null>}
 */
export async function getValidAccessToken() {
  const accessToken = localStorage.getItem(KEYS.accessToken);
  if (!accessToken) return null;

  const expiresAt = parseInt(localStorage.getItem(KEYS.expiresAt) || '0', 10);
  // Proactively refresh 60 s before expiry to avoid mid-request expiration.
  if (Date.now() >= expiresAt - 60_000) {
    try {
      return await refreshAccessToken();
    } catch {
      return null;
    }
  }

  return accessToken;
}

/**
 * Returns true if the user has an access token in storage.
 * Does not validate or refresh the token.
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!localStorage.getItem(KEYS.accessToken);
}

/**
 * Clears all Spotify tokens from localStorage (effectively logs the user out).
 */
export function logout() {
  clearTokens();
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function storeTokens({ access_token, refresh_token, expires_in }) {
  localStorage.setItem(KEYS.accessToken, access_token);
  if (refresh_token) {
    // Spotify may omit refresh_token on refresh responses; keep the old one.
    localStorage.setItem(KEYS.refreshToken, refresh_token);
  }
  localStorage.setItem(KEYS.expiresAt, String(Date.now() + expires_in * 1000));
}

function clearTokens() {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
}
