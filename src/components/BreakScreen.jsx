import { useState } from 'react';
import Timer from './Timer';
import TicTacToe from './games/TicTacToe';
import MemoryMatch from './games/MemoryMatch';
import NumberGuessing from './games/NumberGuessing';

const GAMES = [
  { id: 'tictactoe', name: '❌ Tic Tac Toe', component: TicTacToe },
  { id: 'memory', name: '🃏 Memory Match', component: MemoryMatch },
  { id: 'number', name: '🔢 Number Guessing', component: NumberGuessing },
];

function BreakScreen({ breakDuration, onBreakEnd }) {
  const [selectedGame, setSelectedGame] = useState(null);

  const GameComponent = selectedGame
    ? GAMES.find((g) => g.id === selectedGame)?.component
    : null;

  return (
    <div className="break-screen">
      <div className="break-header">
        <h1>☕ Break Time!</h1>
        <p>Relax and play a minigame, or just chill until the timer ends.</p>
      </div>

      <Timer
        duration={breakDuration}
        label="Break Timer"
        onComplete={onBreakEnd}
      />

      <div className="game-selector">
        <h3>🎮 Play a Minigame</h3>
        <div className="game-buttons">
          {GAMES.map((game) => (
            <button
              key={game.id}
              className={`btn btn-game ${selectedGame === game.id ? 'active' : ''}`}
              onClick={() => setSelectedGame(selectedGame === game.id ? null : game.id)}
            >
              {game.name}
            </button>
          ))}
        </div>
      </div>

      {GameComponent && (
        <div className="game-container">
          <GameComponent />
        </div>
      )}

      <button className="btn btn-outline skip-btn" onClick={onBreakEnd}>
        Skip Break →
      </button>
    </div>
  );
}

export default BreakScreen;
