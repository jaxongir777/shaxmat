import { useState } from 'react'
import './App.css'

const pieces = {
  K: '♚',
  Q: '♛',
  R: '♜',
  B: '♝',
  N: '♞',
  P: '♟',
}

function createBoard() {
  const board = Array(64).fill(null)
  const back = 'RNBQKBNR'

  for (let c = 0; c < 8; c++) {
    board[c] = 'b' + back[c]
    board[8 + c] = 'bP'
    board[48 + c] = 'wP'
    board[56 + c] = 'w' + back[c]
  }

  return board
}

function App() {
  const [board, setBoard] = useState(createBoard())
  const [selected, setSelected] = useState(null)
  const [turn, setTurn] = useState('w')

  const handleClick = (index) => {
    if (selected === null) {
      if (board[index] && board[index][0] === turn) {
        setSelected(index)
      }
      return
    }

    const newBoard = [...board]

    if (selected === index) {
      setSelected(null)
      return
    }

    if (board[index] && board[index][0] === turn) {
      setSelected(index)
      return
    }

    newBoard[index] = newBoard[selected]
    newBoard[selected] = null

    setBoard(newBoard)
    setTurn(turn === 'w' ? 'b' : 'w')
    setSelected(null)
  }

  const resetGame = () => {
    setBoard(createBoard())
    setSelected(null)
    setTurn('w')
  }

  return (
    <div className="app">
      <h1>♟ Chess Game</h1>

      <div className="status">
        {turn === 'w' ? 'Oq donalar yuradi' : 'Qora donalar yuradi'}
      </div>

      <div className="chess-board">
        {board.map((piece, index) => {
          const row = Math.floor(index / 8)
          const col = index % 8
          const isLight = (row + col) % 2 === 0

          return (
            <button
              key={index}
              className={`square ${isLight ? 'light' : 'dark'} ${
                selected === index ? 'selected' : ''
              }`}
              onClick={() => handleClick(index)}
            >
              {piece && (
                <span className={piece[0] === 'w' ? 'white-piece' : 'black-piece'}>
                  {pieces[piece[1]]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <button className="reset-btn" onClick={resetGame}>
        Yangi o'yin
      </button>
    </div>
  )
}

export default App