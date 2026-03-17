import { useState, useCallback, useRef, useEffect } from 'react';
import useSpotifyAuth from '../hooks/useSpotifyAuth';
import useSpotifyPlayer from '../hooks/useSpotifyPlayer';
import {
  searchTracks,
  startPlayback,
  skipToNext,
  skipToPrevious,
  setVolume,
} from '../spotify/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMs(ms) {
  if (!ms) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Persistent Spotify mini-player, fixed at the bottom-left of the screen.
 * Mirrors the AmbientSound widget pattern (toggle button → panel).
 *
 * States:
 *  - Not configured (no VITE_SPOTIFY_CLIENT_ID): show a message
 *  - Not connected: show connect button
 *  - Connecting (OAuth callback in flight): show loading
 *  - Connected, player initializing: show loading
 *  - Connected, player ready: show full controls + search
 *  - Premium error: show explanation
 */
function MusicPlayer() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [volume, setVolumeState] = useState(50);
  const searchTimerRef = useRef(null);

  const { connected, loading: authLoading, error: authError, login, logout } = useSpotifyAuth();
  const { deviceId, playerReady, playbackState, playerError, pause, resume } =
    useSpotifyPlayer(connected);

  const currentTrack = playbackState?.track_window?.current_track ?? null;
  const isPlaying = playbackState ? !playbackState.paused : false;
  const progressMs = playbackState?.position ?? 0;
  const durationMs = playbackState?.duration ?? 0;

  // Clear action errors when the playback state updates successfully.
  useEffect(() => {
    if (playbackState) setActionError(null);
  }, [playbackState]);

  // Cleanup the debounce timer on unmount.
  useEffect(() => {
    return () => clearTimeout(searchTimerRef.current);
  }, []);

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  const handleSearchInput = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    clearTimeout(searchTimerRef.current);
    if (!val.trim()) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const results = await searchTracks(val);
        setSearchResults(results);
      } catch (err) {
        setSearchError(err.message);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handlePlayTrack = useCallback(
    async (uri) => {
      if (!deviceId) return;
      setActionError(null);
      try {
        await startPlayback(deviceId, [uri]);
        setSearchResults([]);
        setSearchQuery('');
      } catch (err) {
        setActionError(err.message);
      }
    },
    [deviceId],
  );

  const handleTogglePlay = useCallback(async () => {
    if (!playerReady) return;
    setActionError(null);
    try {
      if (isPlaying) {
        await pause();
      } else {
        await resume();
      }
    } catch (err) {
      setActionError(err.message);
    }
  }, [isPlaying, playerReady, pause, resume]);

  const handleNext = useCallback(async () => {
    setActionError(null);
    try {
      await skipToNext();
    } catch (err) {
      setActionError(err.message);
    }
  }, []);

  const handlePrev = useCallback(async () => {
    setActionError(null);
    try {
      await skipToPrevious();
    } catch (err) {
      setActionError(err.message);
    }
  }, []);

  const handleVolumeChange = useCallback(async (e) => {
    const val = parseInt(e.target.value, 10);
    setVolumeState(val);
    try {
      await setVolume(val);
    } catch {
      // Volume changes failing silently is acceptable; it's not critical.
    }
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    setSearchQuery('');
    setSearchResults([]);
    setActionError(null);
    setSearchError(null);
  }, [logout]);

  // ------------------------------------------------------------------
  // Derived state
  // ------------------------------------------------------------------

  const clientIdMissing = !import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const progressPercent = durationMs > 0 ? (progressMs / durationMs) * 100 : 0;
  const displayError = actionError || (connected ? playerError : null);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="music-player">
      <button
        className={`music-toggle ${isPlaying ? 'active' : ''}`}
        onClick={() => setIsOpen((o) => !o)}
        title="Spotify music player"
        aria-label={isOpen ? 'Close music player' : 'Open music player'}
        aria-expanded={isOpen}
      >
        {isPlaying ? '🎶' : '🎵'}
      </button>

      {isOpen && (
        <div className="music-panel" role="region" aria-label="Music player">
          <div className="music-panel-header">
            <h4>🎵 Music</h4>
            {connected && (
              <button
                className="btn btn-outline btn-small"
                onClick={handleLogout}
                title="Disconnect Spotify"
              >
                Disconnect
              </button>
            )}
          </div>

          {/* ── Not configured ─────────────────────────────────────── */}
          {clientIdMissing && (
            <p className="music-error">
              Add <code>VITE_SPOTIFY_CLIENT_ID</code> to your <code>.env</code> file to enable
              music.
            </p>
          )}

          {/* ── Not connected ──────────────────────────────────────── */}
          {!clientIdMissing && !connected && (
            <div className="music-connect">
              <p className="music-hint">
                Connect your Spotify account to listen while you study.
              </p>
              <p className="music-hint music-req">⚠️ Requires Spotify Premium</p>
              <button
                className="btn btn-primary music-connect-btn"
                onClick={login}
                disabled={authLoading}
              >
                {authLoading ? 'Connecting…' : '🎵 Connect Spotify'}
              </button>
              {authError && <p className="music-error">{authError}</p>}
            </div>
          )}

          {/* ── Connected ──────────────────────────────────────────── */}
          {!clientIdMissing && connected && (
            <>
              {/* Player initializing */}
              {!playerReady && !playerError && (
                <p className="music-hint music-loading">Initializing player…</p>
              )}

              {/* Premium / init error */}
              {playerError && (
                <div className="music-error-box">
                  <p className="music-error">{playerError}</p>
                </div>
              )}

              {playerReady && (
                <>
                  {/* Now Playing */}
                  <div className="music-now-playing">
                    {currentTrack ? (
                      <>
                        {currentTrack.album?.images?.[2]?.url && (
                          <img
                            className="music-album-art"
                            src={currentTrack.album.images[2].url}
                            alt={currentTrack.album.name}
                            width="48"
                            height="48"
                          />
                        )}
                        <div className="music-track-info">
                          <span className="music-track-name" title={currentTrack.name}>
                            {currentTrack.name}
                          </span>
                          <span className="music-track-artist">
                            {currentTrack.artists.map((a) => a.name).join(', ')}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="music-hint">Search below to start playing.</p>
                    )}
                  </div>

                  {/* Progress bar */}
                  {currentTrack && (
                    <div className="music-progress">
                      <div
                        className="music-progress-bar-track"
                        role="progressbar"
                        aria-valuenow={progressMs}
                        aria-valuemin={0}
                        aria-valuemax={durationMs}
                        aria-label="Track progress"
                      >
                        <div
                          className="music-progress-bar"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="music-progress-times">
                        <span>{formatMs(progressMs)}</span>
                        <span>{formatMs(durationMs)}</span>
                      </div>
                    </div>
                  )}

                  {/* Playback controls */}
                  <div className="music-controls">
                    <button
                      className="music-ctrl-btn"
                      onClick={handlePrev}
                      title="Previous"
                      aria-label="Previous track"
                    >
                      ⏮
                    </button>
                    <button
                      className={`music-ctrl-btn music-play-btn ${isPlaying ? 'playing' : ''}`}
                      onClick={handleTogglePlay}
                      title={isPlaying ? 'Pause' : 'Play'}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? '⏸' : '▶'}
                    </button>
                    <button
                      className="music-ctrl-btn"
                      onClick={handleNext}
                      title="Next"
                      aria-label="Next track"
                    >
                      ⏭
                    </button>
                  </div>

                  {/* Volume */}
                  <div className="music-volume">
                    <span aria-hidden="true">🔈</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="volume-slider"
                      aria-label="Volume"
                    />
                    <span aria-hidden="true">🔊</span>
                  </div>

                  {/* Action error */}
                  {displayError && <p className="music-error">{displayError}</p>}

                  {/* Search */}
                  <div className="music-search">
                    <input
                      type="search"
                      className="music-search-input"
                      placeholder="Search tracks…"
                      value={searchQuery}
                      onChange={handleSearchInput}
                      aria-label="Search Spotify tracks"
                    />
                    {searching && <p className="music-hint">Searching…</p>}
                    {searchError && <p className="music-error">{searchError}</p>}
                    {searchResults.length > 0 && (
                      <ul className="music-results" aria-label="Search results">
                        {searchResults.map((track) => (
                          <li key={track.id}>
                            <button
                              className="music-result-btn"
                              onClick={() => handlePlayTrack(track.uri)}
                              title={`Play ${track.name}`}
                            >
                              <span className="music-result-name">{track.name}</span>
                              <span className="music-result-artist">
                                {track.artists.map((a) => a.name).join(', ')}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default MusicPlayer;
