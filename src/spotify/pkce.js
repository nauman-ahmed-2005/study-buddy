/**
 * PKCE (Proof Key for Code Exchange) utilities for Spotify OAuth.
 * These run entirely in the browser — no server needed.
 */

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

/**
 * Generates a cryptographically random code verifier (43–128 chars, RFC 7636).
 * @returns {string}
 */
export function generateCodeVerifier() {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((x) => CHARSET[x % CHARSET.length])
    .join('');
}

/**
 * Derives the code challenge from the verifier using SHA-256 + base64url.
 * @param {string} verifier
 * @returns {Promise<string>}
 */
export async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
