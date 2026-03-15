import { useState } from 'react';

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board) {
  for (const [a, b, c] of WINNING_COMBOS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return board.every((cell) => cell) ? 'draw' : null;
}

function getAIMove(board) {
  // Try to win
  for (const [a, b, c] of WINNING_COMBOS) {
    const cells = [board[a], board[b], board[c]];
    if (cells.filter((c) => c === 'O').length === 2 && cells.includes(null)) {
      return [a, b, c][cells.indexOf(null)];
    }
  }
  // Block player
  for (const [a, b, c] of WINNING_COMBOS) {
    const cells = [board[a], board[b], board[c]];
    if (cells.filter((c) => c === 'X').length === 2 && cells.includes(null)) {
      return [a, b, c][cells.indexOf(null)];
    }
  }
  // Take center
  if (!board[4]) return 4;
  // Take random empty
  const empty = board.map((v, i) => (v === null ? i : null)).filter((v) => v !== null);
  return empty[Math.floor(Math.random() * empty.length)];
}

function TicTacToe() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const winner = checkWinner(board);

  const handleClick = (index) => {
    if (board[index] || winner || !isPlayerTurn) return;

    const newBoard = [...board];
    newBoard[index] = 'X';

    const afterPlayerWinner = checkWinner(newBoard);
    if (afterPlayerWinner) {
      setBoard(newBoard);
      return;
    }

    // AI move
    const aiMove = getAIMove(newBoard);
    if (aiMove !== undefined) {
      newBoard[aiMove] = 'O';
    }
    setBoard(newBoard);
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setIsPlayerTurn(true);
  };

  let status;
  if (winner === 'X') status = '🎉 You win!';
  else if (winner === 'O') status = '🤖 Computer wins!';
  else if (winner === 'draw') status = "🤝 It's a draw!";
  else status = 'Your turn (X)';

  return (
    <div className="game tictactoe">
      <h3>Tic Tac Toe</h3>
      <p className="game-status">{status}</p>
      <div className="ttt-board">
        {board.map((cell, i) => (
          <button
            key={i}
            className={`ttt-cell ${cell ? 'filled' : ''} ${cell === 'X' ? 'x' : ''} ${cell === 'O' ? 'o' : ''}`}
            onClick={() => handleClick(i)}
            disabled={!!cell || !!winner}
          >
            {cell}
          </button>
        ))}
      </div>
      {winner && (
        <button className="btn btn-primary" onClick={reset}>
          Play Again
        </button>
      )}
    </div>
  );
}

export default TicTacToe;
