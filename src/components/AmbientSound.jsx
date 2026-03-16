import { useState, useRef, useCallback, useEffect } from 'react';

const NOISE_TYPES = [
  { id: 'white', name: 'White', emoji: '⚪', description: 'Even frequency' },
  { id: 'brown', name: 'Brown', emoji: '🟤', description: 'Deep rumble' },
  { id: 'pink', name: 'Pink', emoji: '🩷', description: 'Balanced' },
];

function createNoiseProcessor(audioCtx, type) {
  const bufferSize = 2 * audioCtx.sampleRate;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);

  if (type === 'white') {
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  } else if (type === 'brown') {
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (last + 0.02 * white) / 1.02;
      last = data[i];
      data[i] *= 3.5;
    }
  } else if (type === 'pink') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      data[i] *= 0.11;
      b6 = white * 0.115926;
    }
  }

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

function AmbientSound() {
  const [isOpen, setIsOpen] = useState(false);
  const [playing, setPlaying] = useState(null);
  const [volume, setVolume] = useState(0.3);
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const gainRef = useRef(null);

  const stopSound = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
  }, []);

  const playNoise = useCallback((type) => {
    if (playing === type) {
      stopSound();
      setPlaying(null);
      return;
    }

    stopSound();

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      gainRef.current = audioCtxRef.current.createGain();
      gainRef.current.connect(audioCtxRef.current.destination);
    }

    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    gainRef.current.gain.value = volume;
    const source = createNoiseProcessor(ctx, type);
    source.connect(gainRef.current);
    source.start();
    sourceRef.current = source;
    setPlaying(type);
  }, [playing, volume, stopSound]);

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (gainRef.current) {
      gainRef.current.gain.value = val;
    }
  };

  useEffect(() => {
    return () => {
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current.disconnect();
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  return (
    <div className="ambient-sound">
      <button
        className={`ambient-toggle ${playing ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Background sounds"
      >
        {playing ? '🔊' : '🎵'}
      </button>

      {isOpen && (
        <div className="ambient-panel">
          <h4>🎧 Ambient Sounds</h4>
          <p className="ambient-hint">Non-copyright background noise</p>

          <div className="ambient-buttons">
            {NOISE_TYPES.map((noise) => (
              <button
                key={noise.id}
                className={`btn btn-ambient ${playing === noise.id ? 'active' : ''}`}
                onClick={() => playNoise(noise.id)}
              >
                <span className="ambient-emoji">{noise.emoji}</span>
                <span className="ambient-name">{noise.name}</span>
                <span className="ambient-desc">{noise.description}</span>
              </button>
            ))}
          </div>

          <div className="ambient-volume">
            <span>🔈</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="volume-slider"
            />
            <span>🔊</span>
          </div>

          {playing && (
            <button
              className="btn btn-outline btn-small ambient-stop"
              onClick={() => { stopSound(); setPlaying(null); }}
            >
              ⏹ Stop
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default AmbientSound;
