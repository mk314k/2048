import { StateVar, StateVarList } from 'statebinderk';
import { BoardGrid, CellCoord, GRID_SIZE } from './gameEngine';

export interface CellRenderState {
  value: number;
  status: 'idle' | 'spawned' | 'merged';
}

const TILE_CLASSES = [
  'tile-0',
  'tile-2',
  'tile-4',
  'tile-8',
  'tile-16',
  'tile-32',
  'tile-64',
  'tile-128',
  'tile-256',
  'tile-512',
  'tile-1024',
  'tile-2048',
  'tile-super',
  'cell-spawned',
  'cell-merged',
];

function getTileClass(value: number): string {
  if (value <= 0) return 'tile-0';
  if (value > 2048) return 'tile-super';
  return `tile-${value}`;
}

export class BoardBinder {
  public readonly cells: StateVarList<CellRenderState>;
  public readonly scoreVar: StateVar<number>;
  public readonly bestScoreVar: StateVar<number>;

  constructor() {
    const initialCells: { id: string; state: CellRenderState }[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        initialCells.push({
          id: `cell-${r}-${c}`,
          state: { value: 0, status: 'idle' },
        });
      }
    }

    this.cells = new StateVarList<CellRenderState>(initialCells, (elem, state) => {
      elem.classList.remove(...TILE_CLASSES);
      elem.classList.add(getTileClass(state.value));
      if (state.status === 'spawned') {
        elem.classList.add('cell-spawned');
      } else if (state.status === 'merged') {
        elem.classList.add('cell-merged');
      }
      elem.setAttribute('data-value', String(state.value));
      elem.textContent = state.value > 0 ? String(state.value) : '';
    });

    this.scoreVar = new StateVar<number>(0, 'score-val', (elem, val) => {
      elem.textContent = String(val);
    });

    this.bestScoreVar = new StateVar<number>(0, 'best-score-val', (elem, val) => {
      elem.textContent = String(val);
    });
  }

  public syncBoard(
    board: BoardGrid,
    spawned: CellCoord[] = [],
    merged: CellCoord[] = [],
  ): void {
    const spawnedKeys = new Set(spawned.map((c) => `${c.row}:${c.col}`));
    const mergedKeys = new Set(merged.map((c) => `${c.row}:${c.col}`));

    const nextStates: CellRenderState[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const key = `${r}:${c}`;
        const status: CellRenderState['status'] = mergedKeys.has(key)
          ? 'merged'
          : spawnedKeys.has(key)
          ? 'spawned'
          : 'idle';
        nextStates.push({
          value: board[r]?.[c] ?? 0,
          status,
        });
      }
    }

    this.cells.listTransition(nextStates);
  }

  public syncScores(score: number, bestScore: number): void {
    this.scoreVar.transition(score);
    this.bestScoreVar.transition(bestScore);
  }
}
