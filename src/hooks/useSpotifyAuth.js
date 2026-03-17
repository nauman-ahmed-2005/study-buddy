import { useReducer, useEffect, useCallback } from 'react';
import {
  isAuthenticated,
  initiateLogin,
  handleAuthCallback,
  logout as authLogout,
} from '../spotify/auth';

/**
 * Manages Spotify PKCE auth state for the app.
 *
 * On mount: checks the URL for a Spotify callback (?code= or ?error=),
 * processes the token exchange if present, then cleans the URL.
 *
 * Returns:
 *   connected {boolean}  — whether a valid access token is stored
 *   loading   {boolean}  — true while the token exchange is in flight
 *   error     {string|null}
 *   login     {() => void}   — initiates the Spotify OAuth redirect
 *   logout    {() => void}   — clears tokens and marks disconnected
 */

const initialState = {
  connected: isAuthenticated(),
  loading: false,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'CALLBACK_START':
      return { ...state, loading: true, error: null };
    case 'CALLBACK_SUCCESS':
      return { ...state, connected: true, loading: false, error: null };
    case 'CALLBACK_ERROR':
      return { ...state, loading: false, error: action.error };
    case 'OAUTH_DENIED':
      return { ...state, error: action.error };
    case 'LOGIN_ERROR':
      return { ...state, error: action.error };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'LOGOUT':
      return { ...state, connected: false, error: null };
    default:
      return state;
  }
}

export default function useSpotifyAuth() {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Handle the OAuth redirect callback on initial mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const oauthError = params.get('error');

    // Always clean the URL regardless of outcome so the query string
    // doesn't linger if the user refreshes.
    if (code || oauthError) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (oauthError) {
      dispatch({ type: 'OAUTH_DENIED', error: 'Spotify authorization was denied.' });
      return;
    }

    if (!code) return;

    dispatch({ type: 'CALLBACK_START' });
    handleAuthCallback(code)
      .then(() => dispatch({ type: 'CALLBACK_SUCCESS' }))
      .catch((err) => dispatch({ type: 'CALLBACK_ERROR', error: err.message }));
  }, []); // runs once on mount — Spotify callback code only appears in URL at load time

  const login = useCallback(async () => {
    dispatch({ type: 'CLEAR_ERROR' });
    try {
      await initiateLogin();
    } catch (err) {
      dispatch({ type: 'LOGIN_ERROR', error: err.message });
    }
  }, []);

  const logout = useCallback(() => {
    authLogout();
    dispatch({ type: 'LOGOUT' });
  }, []);

  return {
    connected: state.connected,
    loading: state.loading,
    error: state.error,
    login,
    logout,
  };
}
