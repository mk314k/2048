import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { BoardBinder } from './boardBinder';
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

const STATIC_CELL_IDS: { id: string; row: number; col: number }[] = [];
for (let r = 0; r < GRID_SIZE; r++) {
  for (let c = 0; c < GRID_SIZE; c++) {
    STATIC_CELL_IDS.push({ id: `cell-${r}-${c}`, row: r, col: c });
  }
}

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
  const binder = useMemo(() => new BoardBinder(), []);
  const initialSetup = useMemo(() => createInitialBoard(), []);

  const boardRef = useRef<BoardGrid>(initialSetup.board);
  const scoreRef = useRef<number>(0);
  const bestScoreRef = useRef<number>(readBestScore());

  const [prevSnapshot, setPrevSnapshot] = useState<{ board: BoardGrid; score: number } | null>(null);
  const [maxTile, setMaxTile] = useState<number>(() => getMaxTile(initialSetup.board));
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [keepPlaying, setKeepPlaying] = useState<boolean>(false);
  const [lastDelta, setLastDelta] = useState<number>(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const hasWon = maxTile >= TARGET_TILE && !keepPlaying;

  useEffect(() => {
    binder.syncBoard(boardRef.current, initialSetup.spawned, []);
    binder.syncScores(scoreRef.current, bestScoreRef.current);
  }, [binder, initialSetup]);

  const handleMove = useCallback(
    (direction: Direction) => {
      if (isGameOver || hasWon) return;

      const currentBoard = boardRef.current;
      const result = moveBoard(currentBoard, direction);
      if (!result.moved) return;

      const prevScore = scoreRef.current;
      setPrevSnapshot({ board: currentBoard, score: prevScore });

      boardRef.current = result.board;
      const nextScore = prevScore + result.scoreDelta;
      scoreRef.current = nextScore;
      setLastDelta(result.scoreDelta);

      if (nextScore > bestScoreRef.current) {
        bestScoreRef.current = nextScore;
        try {
          window.localStorage.setItem(BEST_SCORE_KEY, String(nextScore));
        } catch {
          // Ignore storage quota errors
        }
      }

      const spawnedList = result.spawnedCell
        ? [{ row: result.spawnedCell.row, col: result.spawnedCell.col }]
        : [];
      binder.syncBoard(result.board, spawnedList, result.mergedCoords);
      binder.syncScores(scoreRef.current, bestScoreRef.current);

      setMaxTile(getMaxTile(result.board));
      setIsGameOver(!hasValidMoves(result.board));
    },
    [binder, isGameOver, hasWon],
  );

  const handleRestart = useCallback(() => {
    const fresh = createInitialBoard();
    boardRef.current = fresh.board;
    scoreRef.current = 0;
    setPrevSnapshot(null);
    setKeepPlaying(false);
    setLastDelta(0);
    setMaxTile(getMaxTile(fresh.board));
    setIsGameOver(false);

    binder.syncBoard(fresh.board, fresh.spawned, []);
    binder.syncScores(0, bestScoreRef.current);
  }, [binder]);

  const handleUndo = useCallback(() => {
    if (!prevSnapshot) return;
    boardRef.current = prevSnapshot.board;
    scoreRef.current = prevSnapshot.score;
    setPrevSnapshot(null);
    setLastDelta(0);
    setMaxTile(getMaxTile(prevSnapshot.board));
    setIsGameOver(!hasValidMoves(prevSnapshot.board));

    binder.syncBoard(prevSnapshot.board, [], []);
    binder.syncScores(prevSnapshot.score, bestScoreRef.current);
  }, [binder, prevSnapshot]);

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
          <div className="title-badge-row">
            <h1 className="game-title">2048</h1>
            <span className="max-pill">Peak {maxTile}</span>
          </div>
          <p className="game-subtitle">
            Slide &amp; merge matching tiles to reach <strong>2048</strong>
          </p>
        </div>

        <div className="right-panel">
          <div className="score-row">
            <div className="score-box">
              <span className="score-label">SCORE</span>
              <div className="score-val-wrap">
                <span id="score-val" className="score-value">0</span>
                {lastDelta > 0 && <span className="score-delta">+{lastDelta}</span>}
              </div>
            </div>
            <div className="score-box">
              <span className="score-label">BEST</span>
              <span id="best-score-val" className="score-value">0</span>
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

      <main
        className="board-frame"
        onTouchStart={(e) => {
          const touch = e.touches[0];
          if (touch) {
            touchStartRef.current = { x: touch.clientX, y: touch.clientY };
          }
        }}
        onTouchEnd={(e) => {
          const start = touchStartRef.current;
          touchStartRef.current = null;
          const end = e.changedTouches[0];
          if (!start || !end) return;
          const dx = end.clientX - start.x;
          const dy = end.clientY - start.y;
          const threshold = 24;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;
          if (Math.abs(dx) > Math.abs(dy)) {
            handleMove(dx > 0 ? 'right' : 'left');
          } else {
            handleMove(dy > 0 ? 'down' : 'up');
          }
        }}
      >
        <div className="board-grid">
          {STATIC_CELL_IDS.map((cell) => (
            <div
              key={cell.id}
              id={cell.id}
              className="cell tile-0"
              data-value="0"
            />
          ))}
        </div>

        {(hasWon || isGameOver) && (
          <div className="board-overlay">
            <h2>{hasWon ? '2048 Reached!' : 'Game Over'}</h2>
            <p>Score: {scoreRef.current} &middot; Best: {bestScoreRef.current}</p>
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

      <footer className="hint-bar">
        <span>Use <strong>Arrow Keys</strong> or <strong>WASD</strong> (or swipe) to slide tiles</span>
        <span className="binder-tag">StateVarList 4&times;4</span>
      </footer>
    </div>
  );
}

export default App;
