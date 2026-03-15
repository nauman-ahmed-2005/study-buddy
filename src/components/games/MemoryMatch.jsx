import { useState, useRef } from 'react';

const EMOJIS = ['🍎', '🍊', '🍋', '🍇', '🍒', '🥝', '🍑', '🫐'];

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createCards() {
  const pairs = EMOJIS.flatMap((emoji, i) => [
    { id: i * 2, emoji, matched: false },
    { id: i * 2 + 1, emoji, matched: false },
  ]);
  return shuffle(pairs);
}

function MemoryMatch() {
  const [cards, setCards] = useState(() => createCards());
  const [flipped, setFlipped] = useState([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const timeoutRef = useRef(null);

  const matched = cards.filter((c) => c.matched).length;
  const isComplete = matched === cards.length;

  const handleFlip = (index) => {
    if (locked || cards[index].matched || flipped.includes(index) || flipped.length >= 2) return;

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [first, second] = newFlipped;
      if (cards[first].emoji === cards[second].emoji) {
        setCards((prev) =>
          prev.map((card, i) =>
            i === first || i === second ? { ...card, matched: true } : card
          )
        );
        setFlipped([]);
      } else {
        setLocked(true);
        timeoutRef.current = setTimeout(() => {
          setFlipped([]);
          setLocked(false);
        }, 800);
      }
    }
  };

  const reset = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setCards(createCards());
    setFlipped([]);
    setMoves(0);
    setLocked(false);
  };

  return (
    <div className="game memory">
      <h3>Memory Match</h3>
      <p className="game-status">
        {isComplete ? `🎉 Done in ${moves} moves!` : `Moves: ${moves} | Pairs: ${matched / 2}/${EMOJIS.length}`}
      </p>
      <div className="memory-grid">
        {cards.map((card, i) => {
          const isFlipped = flipped.includes(i) || card.matched;
          return (
            <button
              key={card.id}
              className={`memory-card ${isFlipped ? 'flipped' : ''} ${card.matched ? 'matched' : ''}`}
              onClick={() => handleFlip(i)}
              disabled={card.matched}
            >
              <span className="memory-card-inner">
                {isFlipped ? card.emoji : '?'}
              </span>
            </button>
          );
        })}
      </div>
      {isComplete && (
        <button className="btn btn-primary" onClick={reset}>
          Play Again
        </button>
      )}
    </div>
  );
}

export default MemoryMatch;
