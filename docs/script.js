import Grid from "./Grid.js"
import Tile from "./Tile.js"

const gameBoard = document.getElementById("root")
let touchstartX, touchstartY, touchendX, touchendY;

const grid = new Grid(gameBoard)
grid.randomEmptyCell().tile = new Tile(gameBoard)
grid.randomEmptyCell().tile = new Tile(gameBoard)
setupInput()

function setupInput() {
  window.addEventListener("keydown", handleInput, { once: true })
  gameBoard.addEventListener('touchstart', (event) => {
    touchstartX = event.touches[0].clientX;
    touchstartY = event.touches[0].clientY;
  },{ once: true });
  
  gameBoard.addEventListener('touchend', (event) => {
    touchendX = event.changedTouches[0].clientX;
    touchendY = event.changedTouches[0].clientY;
  
    handleSwipe();
  },{ once: true });
  
}

// Handle swipe based on touch start and end positions
async function handleSwipe() {
  const deltaX = touchendX - touchstartX;
  const deltaY = touchendY - touchstartY;

  // Determine the primary direction of the slide
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // Horizontal slide
    if (deltaX > 0) {
      // Slide right
      if (!canMoveRight()) {
        setupInput()
        return
      }
      await moveRight()
    } else {
      // Slide left
      if (!canMoveLeft()) {
        setupInput()
        return
      }
      await moveLeft()
    }
  } else {
    // Vertical slide
    if (deltaY > 0) {
      // Slide down
      if (!canMoveDown()) {
        setupInput()
        return
      }
      await moveDown()
    } else {
      // Slide up
      if (!canMoveUp()) {
        setupInput()
        return
      }
      await moveUp()
    }
  }
  grid.cells.forEach(cell => cell.mergeTiles())

  const newTile = new Tile(gameBoard)
  grid.randomEmptyCell().tile = newTile

  if (!canMoveUp() && !canMoveDown() && !canMoveLeft() && !canMoveRight()) {
    newTile.waitForTransition(true).then(() => {
      alert("You lose")
    })
    return
  }
  setupInput()
}


async function handleInput(e) {
  switch (e.key) {
    case "ArrowUp":
      if (!canMoveUp()) {
        setupInput()
        return
      }
      await moveUp()
      break
    case "ArrowDown":
      if (!canMoveDown()) {
        setupInput()
        return
      }
      await moveDown()
      break
    case "ArrowLeft":
      if (!canMoveLeft()) {
        setupInput()
        return
      }
      await moveLeft()
      break
    case "ArrowRight":
      if (!canMoveRight()) {
        setupInput()
        return
      }
      await moveRight()
      break
    default:
      setupInput()
      return
  }

  grid.cells.forEach(cell => cell.mergeTiles())

  const newTile = new Tile(gameBoard)
  grid.randomEmptyCell().tile = newTile

  if (!canMoveUp() && !canMoveDown() && !canMoveLeft() && !canMoveRight()) {
    newTile.waitForTransition(true).then(() => {
      alert("You lose")
    })
    return
  }

  setupInput()
}

function moveUp() {
  return slideTiles(grid.cellsByColumn)
}

function moveDown() {
  return slideTiles(grid.cellsByColumn.map(column => [...column].reverse()))
}

function moveLeft() {
  return slideTiles(grid.cellsByRow)
}

function moveRight() {
  return slideTiles(grid.cellsByRow.map(row => [...row].reverse()))
}

function slideTiles(cells) {
  return Promise.all(
    cells.flatMap(group => {
      const promises = []
      for (let i = 1; i < group.length; i++) {
        const cell = group[i]
        if (cell.tile == null) continue
        let lastValidCell
        for (let j = i - 1; j >= 0; j--) {
          const moveToCell = group[j]
          if (!moveToCell.canAccept(cell.tile)) break
          lastValidCell = moveToCell
        }

        if (lastValidCell != null) {
          promises.push(cell.tile.waitForTransition())
          if (lastValidCell.tile != null) {
            lastValidCell.mergeTile = cell.tile
          } else {
            lastValidCell.tile = cell.tile
          }
          cell.tile = null
        }
      }
      return promises
    })
  )
}

function canMoveUp() {
  return canMove(grid.cellsByColumn)
}

function canMoveDown() {
  return canMove(grid.cellsByColumn.map(column => [...column].reverse()))
}

function canMoveLeft() {
  return canMove(grid.cellsByRow)
}

function canMoveRight() {
  return canMove(grid.cellsByRow.map(row => [...row].reverse()))
}

function canMove(cells) {
  return cells.some(group => {
    return group.some((cell, index) => {
      if (index === 0) return false
      if (cell.tile == null) return false
      const moveToCell = group[index - 1]
      return moveToCell.canAccept(cell.tile)
    })
  })
}