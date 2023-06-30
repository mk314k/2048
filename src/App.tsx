import { useCallback, useEffect, useState } from 'react';
import './App.css';
import {
  BoardGrid,
  Direction,
  GRID_SIZE,
  TARGET_TILE,
  createInitialBoard,
  getMaxTile,
  hasValidMoves,
  moveBoard,
} from './gameEngine';

const BEST_SCORE_KEY = '2048_best_score_v1';

function readBestScore(): number {
  try {
    const raw = window.localStorage.getItem(BEST_SCORE_KEY);
    const parsed = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function App() {
  const [board, setBoard] = useState<BoardGrid>(() => createInitialBoard().board);
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(() => readBestScore());
  const [prevSnapshot, setPrevSnapshot] = useState<{ board: BoardGrid; score: number } | null>(null);
  const [keepPlaying, setKeepPlaying] = useState<boolean>(false);

  const maxTile = getMaxTile(board);
  const hasWon = maxTile >= TARGET_TILE && !keepPlaying;
  const isGameOver = !hasValidMoves(board);

  const handleMove = useCallback(
    (direction: Direction) => {
      if (isGameOver || hasWon) return;
      const result = moveBoard(board, direction);
      if (!result.moved) return;

      setPrevSnapshot({ board, score });
      setBoard(result.board);
      const nextScore = score + result.scoreDelta;
      setScore(nextScore);
      if (nextScore > bestScore) {
        setBestScore(nextScore);
        try {
          window.localStorage.setItem(BEST_SCORE_KEY, String(nextScore));
        } catch {
          // Ignore storage quota errors
        }
      }
    },
    [board, score, bestScore, isGameOver, hasWon],
  );

  const handleRestart = useCallback(() => {
    setBoard(createInitialBoard().board);
    setScore(0);
    setPrevSnapshot(null);
    setKeepPlaying(false);
  }, []);

  const handleUndo = useCallback(() => {
    if (!prevSnapshot) return;
    setBoard(prevSnapshot.board);
    setScore(prevSnapshot.score);
    setPrevSnapshot(null);
  }, [prevSnapshot]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const keyMap: Record<string, Direction | undefined> = {
        ArrowUp: 'up',
        w: 'up',
        W: 'up',
        ArrowDown: 'down',
        s: 'down',
        S: 'down',
        ArrowLeft: 'left',
        a: 'left',
        A: 'left',
        ArrowRight: 'right',
        d: 'right',
        D: 'right',
      };
      const dir = keyMap[event.key];
      if (!dir) return;
      event.preventDefault();
      handleMove(dir);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleMove]);

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="title-block">
          <h1 className="game-title">2048</h1>
          <p className="game-subtitle">Join the tiles, reach <strong>2048</strong>!</p>
        </div>

        <div className="right-panel">
          <div className="score-row">
            <div className="score-box">
              <span className="score-label">SCORE</span>
              <span className="score-value">{score}</span>
            </div>
            <div className="score-box">
              <span className="score-label">BEST</span>
              <span className="score-value">{bestScore}</span>
            </div>
          </div>

          <div className="controls-row">
            <button type="button" className="btn-secondary" onClick={handleUndo} disabled={!prevSnapshot}>
              Undo
            </button>
            <button type="button" className="btn-primary" onClick={handleRestart}>
              New Game
            </button>
          </div>
        </div>
      </header>

      <main className="board-frame">
        <div className="board-grid" style={{ '--grid-size': GRID_SIZE } as React.CSSProperties}>
          {board.map((row, rIdx) =>
            row.map((val, cIdx) => (
              <div
                key={`cell-${rIdx}-${cIdx}`}
                id={`cell-${rIdx}-${cIdx}`}
                className={`cell tile-${val > 2048 ? 'super' : val}`}
                data-value={val}
              >
                {val > 0 ? val : ''}
              </div>
            )),
          )}
        </div>

        {(hasWon || isGameOver) && (
          <div className="board-overlay">
            <h2>{hasWon ? 'You reached 2048!' : 'No Moves Left'}</h2>
            <p>Final Score: {score}</p>
            <div className="overlay-actions">
              {hasWon && (
                <button type="button" className="btn-secondary" onClick={() => setKeepPlaying(true)}>
                  Keep Going
                </button>
              )}
              <button type="button" className="btn-primary" onClick={handleRestart}>
                Play Again
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
