export type Direction = 'up' | 'down' | 'left' | 'right';
export type BoardGrid = number[][];

export interface CellCoord {
  row: number;
  col: number;
}

export interface MoveResult {
  board: BoardGrid;
  moved: boolean;
  scoreDelta: number;
  mergedCoords: CellCoord[];
  spawnedCell: (CellCoord & { value: number }) | null;
}

export const GRID_SIZE = 4;
export const TARGET_TILE = 2048;

export function createEmptyBoard(size = GRID_SIZE): BoardGrid {
  return Array.from({ length: size }, () => Array<number>(size).fill(0));
}

export function cloneBoard(board: BoardGrid): BoardGrid {
  return board.map((row) => [...row]);
}

export function getEmptyCells(board: BoardGrid): CellCoord[] {
  const empty: CellCoord[] = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (board[r][c] === 0) {
        empty.push({ row: r, col: c });
      }
    }
  }
  return empty;
}

export function spawnRandomTile(
  board: BoardGrid,
  rng: () => number = Math.random,
): { board: BoardGrid; spawned: (CellCoord & { value: number }) | null } {
  const empty = getEmptyCells(board);
  if (empty.length === 0) {
    return { board: cloneBoard(board), spawned: null };
  }
  const next = cloneBoard(board);
  const chosen = empty[Math.floor(rng() * empty.length)];
  const value = rng() < 0.9 ? 2 : 4;
  next[chosen.row][chosen.col] = value;
  return {
    board: next,
    spawned: { row: chosen.row, col: chosen.col, value },
  };
}

export function createInitialBoard(rng: () => number = Math.random): {
  board: BoardGrid;
  spawned: CellCoord[];
} {
  const first = spawnRandomTile(createEmptyBoard(), rng);
  const second = spawnRandomTile(first.board, rng);
  const spawned: CellCoord[] = [];
  if (first.spawned) spawned.push({ row: first.spawned.row, col: first.spawned.col });
  if (second.spawned) spawned.push({ row: second.spawned.row, col: second.spawned.col });
  return { board: second.board, spawned };
}

function slideLineLeft(line: number[]): {
  result: number[];
  scoreDelta: number;
  mergedIndices: number[];
  changed: boolean;
} {
  const nonZero = line.filter((v) => v !== 0);
  const result: number[] = [];
  const mergedIndices: number[] = [];
  let scoreDelta = 0;

  let i = 0;
  while (i < nonZero.length) {
    if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
      const mergedVal = nonZero[i] * 2;
      const targetIdx = result.length;
      result.push(mergedVal);
      mergedIndices.push(targetIdx);
      scoreDelta += mergedVal;
      i += 2;
    } else {
      result.push(nonZero[i]);
      i += 1;
    }
  }

  while (result.length < line.length) {
    result.push(0);
  }

  let changed = false;
  for (let idx = 0; idx < line.length; idx++) {
    if (line[idx] !== result[idx]) {
      changed = true;
      break;
    }
  }

  return { result, scoreDelta, mergedIndices, changed };
}

export function moveBoard(
  board: BoardGrid,
  direction: Direction,
  rng: () => number = Math.random,
): MoveResult {
  const size = board.length;
  const next = createEmptyBoard(size);
  const mergedCoords: CellCoord[] = [];
  let totalScoreDelta = 0;
  let anyMoved = false;

  for (let i = 0; i < size; i++) {
    const line: number[] = [];
    for (let j = 0; j < size; j++) {
      if (direction === 'left') line.push(board[i][j]);
      else if (direction === 'right') line.push(board[i][size - 1 - j]);
      else if (direction === 'up') line.push(board[j][i]);
      else line.push(board[size - 1 - j][i]);
    }

    const { result, scoreDelta, mergedIndices, changed } = slideLineLeft(line);
    if (changed) anyMoved = true;
    totalScoreDelta += scoreDelta;

    for (let j = 0; j < size; j++) {
      if (direction === 'left') next[i][j] = result[j];
      else if (direction === 'right') next[i][size - 1 - j] = result[j];
      else if (direction === 'up') next[j][i] = result[j];
      else next[size - 1 - j][i] = result[j];
    }

    for (const mergedIdx of mergedIndices) {
      if (direction === 'left') mergedCoords.push({ row: i, col: mergedIdx });
      else if (direction === 'right') mergedCoords.push({ row: i, col: size - 1 - mergedIdx });
      else if (direction === 'up') mergedCoords.push({ row: mergedIdx, col: i });
      else mergedCoords.push({ row: size - 1 - mergedIdx, col: i });
    }
  }

  if (!anyMoved) {
    return {
      board: cloneBoard(board),
      moved: false,
      scoreDelta: 0,
      mergedCoords: [],
      spawnedCell: null,
    };
  }

  const spawned = spawnRandomTile(next, rng);
  return {
    board: spawned.board,
    moved: true,
    scoreDelta: totalScoreDelta,
    mergedCoords,
    spawnedCell: spawned.spawned,
  };
}

export function getMaxTile(board: BoardGrid): number {
  let max = 0;
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (board[r][c] > max) max = board[r][c];
    }
  }
  return max;
}

export function hasValidMoves(board: BoardGrid): boolean {
  const size = board.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const val = board[r][c];
      if (val === 0) return true;
      if (r + 1 < size && board[r + 1][c] === val) return true;
      if (c + 1 < size && board[r][c + 1] === val) return true;
    }
  }
  return false;
}
