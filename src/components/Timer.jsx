import { useState, useEffect, useRef, useCallback } from 'react';

function Timer({ duration, label, onComplete }) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);
  const completedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearTimer();
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return clearTimer;
  }, [isRunning, clearTimer]);

  useEffect(() => {
    if (timeLeft === 0 && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [timeLeft, onComplete]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = duration > 0 ? ((duration - timeLeft) / duration) * 100 : 0;

  const handleStart = () => setIsRunning(true);
  const handlePause = () => {
    setIsRunning(false);
    clearTimer();
  };
  const handleReset = () => {
    setIsRunning(false);
    clearTimer();
    setTimeLeft(duration);
    completedRef.current = false;
  };

  return (
    <div className="timer">
      <h2 className="timer-label">{label}</h2>
      <div className="timer-ring">
        <svg viewBox="0 0 200 200" className="timer-svg">
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="var(--border)"
            strokeWidth="8"
          />
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 90}
            strokeDashoffset={2 * Math.PI * 90 * (1 - progress / 100)}
            transform="rotate(-90 100 100)"
            className="timer-progress"
          />
        </svg>
        <div className="timer-display">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
      </div>
      <div className="timer-controls">
        {!isRunning ? (
          <button className="btn btn-primary" onClick={handleStart} disabled={timeLeft === 0}>
            {timeLeft === duration ? 'Start' : 'Resume'}
          </button>
        ) : (
          <button className="btn btn-secondary" onClick={handlePause}>
            Pause
          </button>
        )}
        <button className="btn btn-outline" onClick={handleReset}>
          Reset
        </button>
      </div>
    </div>
  );
}

export default Timer;
