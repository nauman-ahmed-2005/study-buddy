/**
 * Thin wrappers around the Spotify Web API.
 * Every call uses getValidAccessToken() which auto-refreshes when needed.
 * https://developer.spotify.com/documentation/web-api
 */

import { getValidAccessToken } from './auth';

// ---------------------------------------------------------------------------
// Core fetch helper
// ---------------------------------------------------------------------------

async function apiFetch(path, options = {}) {
  const token = await getValidAccessToken();
  if (!token) throw new Error('Not connected to Spotify.');

  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // 204 No Content is a success with no body
  if (res.status === 204) return null;

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.error?.message || `Spotify API error (${res.status})`;
    throw new Error(message);
  }

  return body;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * Full-text track search.
 * @param {string} query
 * @param {number} limit  1–50
 * @returns {Promise<SpotifyApi.TrackObjectFull[]>}
 */
export async function searchTracks(query, limit = 10) {
  const params = new URLSearchParams({ q: query, type: 'track', limit: String(limit) });
  const data = await apiFetch(`/search?${params}`);
  return data?.tracks?.items ?? [];
}

// ---------------------------------------------------------------------------
// Playback — all device-specific commands require the SDK device_id
// ---------------------------------------------------------------------------

/**
 * Starts playback of specific track URIs on the given device.
 * @param {string} deviceId
 * @param {string[]} uris  e.g. ['spotify:track:...']
 */
export async function startPlayback(deviceId, uris) {
  await apiFetch(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
    method: 'PUT',
    body: JSON.stringify({ uris }),
  });
}

/** Pauses playback on the active device. */
export async function pausePlayback() {
  await apiFetch('/me/player/pause', { method: 'PUT' });
}

/**
 * Resumes playback on the given device.
 * @param {string} deviceId
 */
export async function resumePlayback(deviceId) {
  await apiFetch(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
    method: 'PUT',
  });
}

/** Skips to the next track. */
export async function skipToNext() {
  await apiFetch('/me/player/next', { method: 'POST' });
}

/** Skips to the previous track. */
export async function skipToPrevious() {
  await apiFetch('/me/player/previous', { method: 'POST' });
}

/**
 * Sets the player volume.
 * @param {number} volumePercent  0–100
 */
export async function setVolume(volumePercent) {
  const pct = Math.max(0, Math.min(100, Math.round(volumePercent)));
  await apiFetch(`/me/player/volume?volume_percent=${pct}`, { method: 'PUT' });
}
