import { useEffect, useRef, useReducer, useCallback } from 'react';
import { getValidAccessToken } from '../spotify/auth';

const SDK_SCRIPT_URL = 'https://sdk.scdn.co/spotify-player.js';
const PLAYER_NAME = 'Study Buddy';

// ---------------------------------------------------------------------------
// Module-level SDK load state — safe because the SDK is a global singleton.
// ---------------------------------------------------------------------------

let sdkScriptLoaded = false;
let sdkReady = false;
const pendingCallbacks = [];

function ensureSDKLoaded() {
  if (sdkScriptLoaded) return;
  sdkScriptLoaded = true;

  // Spotify calls this global when the SDK is ready.
  window.onSpotifyWebPlaybackSDKReady = () => {
    sdkReady = true;
    pendingCallbacks.forEach((cb) => cb());
    pendingCallbacks.length = 0;
  };

  const script = document.createElement('script');
  script.src = SDK_SCRIPT_URL;
  script.async = true;
  document.head.appendChild(script);
}

function whenSDKReady(cb) {
  if (sdkReady) {
    cb();
  } else {
    pendingCallbacks.push(cb);
  }
}

// ---------------------------------------------------------------------------
// State reducer
// ---------------------------------------------------------------------------

const INITIAL_PLAYER_STATE = {
  deviceId: null,
  playerReady: false,
  playbackState: null,
  playerError: null,
};

function playerReducer(state, action) {
  switch (action.type) {
    case 'RESET':
      return INITIAL_PLAYER_STATE;
    case 'READY':
      return { ...state, deviceId: action.deviceId, playerReady: true, playerError: null };
    case 'NOT_READY':
      return { ...state, playerReady: false };
    case 'PLAYBACK_STATE':
      return { ...state, playbackState: action.state };
    case 'ERROR':
      return { ...state, playerError: action.message };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Loads the Spotify Web Playback SDK and manages a player instance.
 *
 * @param {boolean} connected — output of useSpotifyAuth().connected
 * @returns {{
 *   deviceId: string|null,
 *   playerReady: boolean,
 *   playbackState: Spotify.PlaybackState|null,
 *   playerError: string|null,
 *   pause: () => Promise<void>,
 *   resume: () => Promise<void>,
 * }}
 */
export default function useSpotifyPlayer(connected) {
  const playerRef = useRef(null);
  const [state, dispatch] = useReducer(playerReducer, INITIAL_PLAYER_STATE);

  const initPlayer = useCallback(() => {
    // Guard: only create one player instance.
    if (playerRef.current) return;

    const player = new window.Spotify.Player({
      name: PLAYER_NAME,
      // getOAuthToken is called by the SDK whenever it needs a fresh token.
      getOAuthToken: async (cb) => {
        const token = await getValidAccessToken();
        if (token) cb(token);
      },
      volume: 0.5,
    });

    player.addListener('ready', ({ device_id }) => {
      dispatch({ type: 'READY', deviceId: device_id });
    });

    player.addListener('not_ready', () => {
      dispatch({ type: 'NOT_READY' });
    });

    player.addListener('player_state_changed', (ps) => {
      dispatch({ type: 'PLAYBACK_STATE', state: ps });
    });

    player.addListener('initialization_error', ({ message }) => {
      dispatch({ type: 'ERROR', message: `Player initialization failed: ${message}` });
    });

    player.addListener('authentication_error', ({ message }) => {
      dispatch({ type: 'ERROR', message: `Spotify authentication error: ${message}` });
    });

    player.addListener('account_error', () => {
      dispatch({
        type: 'ERROR',
        message:
          'Spotify Premium is required for in-browser playback. ' +
          'Please upgrade your account or use the Spotify app.',
      });
    });

    player.addListener('playback_error', ({ message }) => {
      dispatch({ type: 'ERROR', message: `Playback error: ${message}` });
    });

    player.connect();
    playerRef.current = player;
  }, []); // stable — only uses refs and module-level state

  useEffect(() => {
    if (!connected) {
      // User logged out: tear down the player cleanly.
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
      dispatch({ type: 'RESET' });
      return;
    }

    // User is connected: load the SDK (no-op if already loaded) then init.
    ensureSDKLoaded();
    whenSDKReady(initPlayer);
  }, [connected, initPlayer]);

  const pause = useCallback(async () => {
    if (!playerRef.current) {
      throw new Error('Spotify player is unavailable. Ensure it is initialized and connected.');
    }
    await playerRef.current.pause();
  }, []);

  const resume = useCallback(async () => {
    if (!playerRef.current) {
      throw new Error('Spotify player is unavailable. Ensure it is initialized and connected.');
    }
    await playerRef.current.resume();
  }, []);

  return {
    deviceId: state.deviceId,
    playerReady: state.playerReady,
    playbackState: state.playbackState,
    playerError: state.playerError,
    pause,
    resume,
  };
}
