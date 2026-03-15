import { useState, useCallback } from 'react';

function generateTarget() {
  return Math.floor(Math.random() * 100) + 1;
}

function NumberGuessing() {
  const [target, setTarget] = useState(() => generateTarget());
  const [guess, setGuess] = useState('');
  const [attempts, setAttempts] = useState([]);
  const [won, setWon] = useState(false);

  const handleGuess = useCallback(() => {
    const num = parseInt(guess, 10);
    if (isNaN(num) || num < 1 || num > 100) return;

    const hint =
      num === target ? 'correct' : num < target ? 'higher' : 'lower';

    setAttempts((prev) => [...prev, { num, hint }]);
    if (num === target) {
      setWon(true);
    }
    setGuess('');
  }, [guess, target]);

  const reset = () => {
    setTarget(generateTarget());
    setGuess('');
    setAttempts([]);
    setWon(false);
  };

  return (
    <div className="game number-guessing">
      <h3>Number Guessing</h3>
      <p className="game-status">
        {won
          ? `🎉 Correct! It was ${target} (${attempts.length} attempts)`
          : 'Guess a number between 1 and 100'}
      </p>

      {!won && (
        <div className="guess-input-row">
          <input
            type="number"
            min="1"
            max="100"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGuess()}
            placeholder="1–100"
          />
          <button className="btn btn-primary" onClick={handleGuess}>
            Guess
          </button>
        </div>
      )}

      {attempts.length > 0 && (
        <div className="guess-history">
          {attempts.map((a, i) => (
            <span
              key={i}
              className={`guess-chip ${a.hint}`}
              title={a.hint === 'higher' ? 'Go higher ↑' : a.hint === 'lower' ? 'Go lower ↓' : 'Correct!'}
            >
              {a.num} {a.hint === 'higher' ? '↑' : a.hint === 'lower' ? '↓' : '✓'}
            </span>
          ))}
        </div>
      )}

      {won && (
        <button className="btn btn-primary" onClick={reset}>
          Play Again
        </button>
      )}
    </div>
  );
}

export default NumberGuessing;
