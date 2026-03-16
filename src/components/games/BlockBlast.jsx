import { useState, useCallback } from 'react';

const GRID_SIZE = 8;

const SHAPES = [
  { name: 'I-3', cells: [[0,0],[0,1],[0,2]] },
  { name: 'I-3v', cells: [[0,0],[1,0],[2,0]] },
  { name: 'I-4', cells: [[0,0],[0,1],[0,2],[0,3]] },
  { name: 'I-4v', cells: [[0,0],[1,0],[2,0],[3,0]] },
  { name: 'L', cells: [[0,0],[1,0],[2,0],[2,1]] },
  { name: 'L2', cells: [[0,0],[0,1],[0,2],[1,0]] },
  { name: 'J', cells: [[0,0],[0,1],[1,1],[2,1]] },
  { name: 'T', cells: [[0,0],[0,1],[0,2],[1,1]] },
  { name: 'O', cells: [[0,0],[0,1],[1,0],[1,1]] },
  { name: 'S', cells: [[0,1],[0,2],[1,0],[1,1]] },
  { name: 'Z', cells: [[0,0],[0,1],[1,1],[1,2]] },
  { name: 'dot', cells: [[0,0]] },
  { name: '2x2+', cells: [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]] },
  { name: 'I-2', cells: [[0,0],[0,1]] },
  { name: 'I-2v', cells: [[0,0],[1,0]] },
  { name: 'corner', cells: [[0,0],[0,1],[1,0]] },
];

const COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function randomShapes() {
  return Array.from({ length: 3 }, () => ({
    ...SHAPES[Math.floor(Math.random() * SHAPES.length)],
    color: randomColor(),
  }));
}

function emptyGrid() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
}

function canPlace(grid, shape, startRow, startCol) {
  for (const [r, c] of shape.cells) {
    const nr = startRow + r;
    const nc = startCol + c;
    if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE || grid[nr][nc]) {
      return false;
    }
  }
  return true;
}

function canPlaceAnywhere(grid, shape) {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (canPlace(grid, shape, r, c)) return true;
    }
  }
  return false;
}

function placeShape(grid, shape, startRow, startCol) {
  const newGrid = grid.map((row) => [...row]);
  for (const [r, c] of shape.cells) {
    newGrid[startRow + r][startCol + c] = shape.color;
  }
  return newGrid;
}

function clearLines(grid) {
  let cleared = 0;
  const toClear = new Set();

  // Check rows
  for (let r = 0; r < GRID_SIZE; r++) {
    if (grid[r].every((cell) => cell)) {
      for (let c = 0; c < GRID_SIZE; c++) toClear.add(`${r},${c}`);
      cleared++;
    }
  }
  // Check columns
  for (let c = 0; c < GRID_SIZE; c++) {
    if (grid.every((row) => row[c])) {
      for (let r = 0; r < GRID_SIZE; r++) toClear.add(`${r},${c}`);
      cleared++;
    }
  }

  if (toClear.size === 0) return { grid, cleared: 0 };

  const newGrid = grid.map((row) => [...row]);
  for (const key of toClear) {
    const [r, c] = key.split(',').map(Number);
    newGrid[r][c] = null;
  }
  return { grid: newGrid, cleared };
}

function BlockBlast() {
  const [grid, setGrid] = useState(emptyGrid);
  const [shapes, setShapes] = useState(randomShapes);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const checkGameOver = useCallback((currentGrid, currentShapes) => {
    return currentShapes
      .filter(Boolean)
      .every((shape) => !canPlaceAnywhere(currentGrid, shape));
  }, []);

  const handleCellClick = (row, col) => {
    if (gameOver || selected === null) return;
    const shape = shapes[selected];
    if (!shape || !canPlace(grid, shape, row, col)) return;

    let newGrid = placeShape(grid, shape, row, col);
    const { grid: clearedGrid, cleared } = clearLines(newGrid);
    newGrid = clearedGrid;

    const bonus = cleared > 1 ? cleared * cleared * 10 : cleared * 10;
    const newScore = score + shape.cells.length + bonus;

    const newShapes = [...shapes];
    newShapes[selected] = null;
    const remaining = newShapes.filter(Boolean);

    let nextShapes = newShapes;
    if (remaining.length === 0) {
      nextShapes = randomShapes();
    }

    setGrid(newGrid);
    setShapes(nextShapes);
    setScore(newScore);
    setSelected(null);

    if (checkGameOver(newGrid, nextShapes.filter(Boolean).length > 0 ? nextShapes : randomShapes())) {
      if (remaining.length === 0) {
        // New shapes were dealt, check if any can be placed
        if (checkGameOver(newGrid, nextShapes)) {
          setGameOver(true);
        }
      } else {
        setGameOver(true);
      }
    }
  };

  const reset = () => {
    setGrid(emptyGrid());
    setShapes(randomShapes());
    setSelected(null);
    setScore(0);
    setGameOver(false);
  };

  // Calculate preview cells
  const [hoverRow, setHoverRow] = useState(null);
  const [hoverCol, setHoverCol] = useState(null);
  const previewCells = new Set();
  let canPreview = false;
  if (selected !== null && shapes[selected] && hoverRow !== null && hoverCol !== null) {
    canPreview = canPlace(grid, shapes[selected], hoverRow, hoverCol);
    if (canPreview) {
      for (const [r, c] of shapes[selected].cells) {
        previewCells.add(`${hoverRow + r},${hoverCol + c}`);
      }
    }
  }

  // Compute bounding box for shape preview rendering
  const getShapeBounds = (shape) => {
    let maxR = 0, maxC = 0;
    for (const [r, c] of shape.cells) {
      if (r > maxR) maxR = r;
      if (c > maxC) maxC = c;
    }
    return { rows: maxR + 1, cols: maxC + 1 };
  };

  return (
    <div className="game blockblast">
      <h3>Block Blast</h3>
      <p className="game-status">
        {gameOver ? `💥 Game Over! Score: ${score}` : `Score: ${score}`}
      </p>

      <div
        className="bb-grid"
        onMouseLeave={() => { setHoverRow(null); setHoverCol(null); }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const isPreview = previewCells.has(`${r},${c}`);
            return (
              <div
                key={`${r}-${c}`}
                className={`bb-cell ${cell ? 'filled' : ''} ${isPreview ? 'preview' : ''} ${!canPreview && selected !== null && !cell ? 'no-place' : ''}`}
                style={cell ? { background: cell } : isPreview && shapes[selected] ? { background: shapes[selected].color, opacity: 0.4 } : undefined}
                onClick={() => handleCellClick(r, c)}
                onMouseEnter={() => { setHoverRow(r); setHoverCol(c); }}
              />
            );
          })
        )}
      </div>

      <div className="bb-shapes">
        {shapes.map((shape, i) => {
          if (!shape) return <div key={i} className="bb-shape-slot empty" />;
          const { rows, cols } = getShapeBounds(shape);
          return (
            <button
              key={i}
              className={`bb-shape-slot ${selected === i ? 'selected' : ''} ${gameOver ? 'disabled' : ''}`}
              onClick={() => !gameOver && setSelected(selected === i ? null : i)}
              disabled={gameOver}
            >
              <div
                className="bb-shape-preview"
                style={{ gridTemplateColumns: `repeat(${cols}, 16px)`, gridTemplateRows: `repeat(${rows}, 16px)` }}
              >
                {Array.from({ length: rows * cols }, (_, idx) => {
                  const pr = Math.floor(idx / cols);
                  const pc = idx % cols;
                  const isActive = shape.cells.some(([r, c]) => r === pr && c === pc);
                  return (
                    <div
                      key={idx}
                      className={`bb-shape-cell ${isActive ? 'active' : ''}`}
                      style={isActive ? { background: shape.color } : undefined}
                    />
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>

      {gameOver && (
        <button className="btn btn-primary" onClick={reset}>
          Play Again
        </button>
      )}
    </div>
  );
}

export default BlockBlast;
