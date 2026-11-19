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

const directions = {
  diagonal: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  straight: [[1, 0], [-1, 0], [0, 1], [0, -1]],
  knight: [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]],
}

const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8

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

function createGame() {
  return {
    board: createBoard(),
    turn: 'w',
    castling: {
      wK: true,
      wQ: true,
      bK: true,
      bQ: true,
    },
    enPassant: null,
  }
}

// Katak hujum ostidami?
function isAttacked(board, square, byColor) {
  const r = Math.floor(square / 8)
  const c = square % 8

  // Piyoda hujumi
  const pawnDir = byColor === 'w' ? 1 : -1

  for (const dc of [-1, 1]) {
    const rr = r + pawnDir
    const cc = c + dc

    if (
      inside(rr, cc) &&
      board[rr * 8 + cc] === byColor + 'P'
    ) {
      return true
    }
  }

  // Ot hujumi
  for (const [dr, dc] of directions.knight) {
    const rr = r + dr
    const cc = c + dc

    if (
      inside(rr, cc) &&
      board[rr * 8 + cc] === byColor + 'N'
    ) {
      return true
    }
  }

  // Shoh hujumi
  for (const dr of [-1, 0, 1]) {
    for (const dc of [-1, 0, 1]) {
      if (dr === 0 && dc === 0) continue

      const rr = r + dr
      const cc = c + dc

      if (
        inside(rr, cc) &&
        board[rr * 8 + cc] === byColor + 'K'
      ) {
        return true
      }
    }
  }

  // Fil, rux, farzin hujumlari
  const rays = [
    ...directions.diagonal.map(([dr, dc]) => [dr, dc, 'BQ']),
    ...directions.straight.map(([dr, dc]) => [dr, dc, 'RQ']),
  ]

  for (const [dr, dc, types] of rays) {
    let rr = r + dr
    let cc = c + dc

    while (inside(rr, cc)) {
      const piece = board[rr * 8 + cc]

      if (piece) {
        if (piece[0] === byColor && types.includes(piece[1])) {
          return true
        }
        break
      }

      rr += dr
      cc += dc
    }
  }

  return false
}

function isInCheck(board, color) {
  const king = board.indexOf(color + 'K')
  if (king === -1) return false

  return isAttacked(board, king, color === 'w' ? 'b' : 'w')
}

// Donaning mumkin bo'lgan yurishlari
function getPseudoMoves(game, from) {
  const { board, castling, enPassant, turn } = game
  const piece = board[from]

  if (!piece || piece[0] !== turn) return []

  const color = piece[0]
  const type = piece[1]
  const row = Math.floor(from / 8)
  const col = from % 8
  const moves = []
  const enemy = color === 'w' ? 'b' : 'w'

  const add = (to, extra = {}) => {
    moves.push({ from, to, ...extra })
  }

  // Piyoda
  if (type === 'P') {
    const dir = color === 'w' ? -1 : 1
    const startRow = color === 'w' ? 6 : 1
    const promotionRow = color === 'w' ? 0 : 7

    const oneRow = row + dir
    const one = oneRow * 8 + col

    // Oldinga yurish
    if (inside(oneRow, col) && !board[one]) {
      add(one, oneRow === promotionRow ? { promotion: true } : {})

      // 2 katak yurish
      const twoRow = row + dir * 2
      const two = twoRow * 8 + col

      if (row === startRow && !board[two]) {
        add(two, { doublePawn: true })
      }
    }

    // Diagonal urish
    for (const dc of [-1, 1]) {
      const cc = col + dc
      const rr = row + dir

      if (!inside(rr, cc)) continue

      const to = rr * 8 + cc

      if (board[to] && board[to][0] === enemy) {
        add(to, rr === promotionRow ? { promotion: true } : {})
      }

      // En passant
      if (to === enPassant) {
        add(to, { enPassant: true })
      }
    }

    return moves
  }

  // Ot va shoh
  if (type === 'N' || type === 'K') {
    const steps = type === 'N'
      ? directions.knight
      : [...directions.diagonal, ...directions.straight]

    for (const [dr, dc] of steps) {
      const rr = row + dr
      const cc = col + dc

      if (!inside(rr, cc)) continue

      const to = rr * 8 + cc

      if (!board[to] || board[to][0] === enemy) {
        add(to)
      }
    }

    // Rokировка
    if (type === 'K') {
      const home = color === 'w' ? 60 : 4
      const enemyColor = color === 'w' ? 'b' : 'w'

      if (from === home && !isAttacked(board, home, enemyColor)) {
        // King-side
        if (
          castling[color + 'K'] &&
          !board[home + 1] &&
          !board[home + 2] &&
          board[home + 3] === color + 'R' &&
          !isAttacked(board, home + 1, enemyColor) &&
          !isAttacked(board, home + 2, enemyColor)
        ) {
          add(home + 2, { castle: 'K' })
        }

        // Queen-side
        if (
          castling[color + 'Q'] &&
          !board[home - 1] &&
          !board[home - 2] &&
          !board[home - 3] &&
          board[home - 4] === color + 'R' &&
          !isAttacked(board, home - 1, enemyColor) &&
          !isAttacked(board, home - 2, enemyColor)
        ) {
          add(home - 2, { castle: 'Q' })
        }
      }
    }

    return moves
  }

  // Fil, rux, farzin
  let steps = []

  if (type === 'B') steps = directions.diagonal
  if (type === 'R') steps = directions.straight
  if (type === 'Q') steps = [...directions.diagonal, ...directions.straight]

  for (const [dr, dc] of steps) {
    let rr = row + dr
    let cc = col + dc

    while (inside(rr, cc)) {
      const to = rr * 8 + cc

      if (!board[to]) {
        add(to)
      } else {
        if (board[to][0] === enemy) add(to)
        break
      }

      rr += dr
      cc += dc
    }
  }

  return moves
}

// Yurishni bajarish
function makeMove(game, move, promotion = 'Q') {
  const board = [...game.board]
  const piece = board[move.from]
  const color = piece[0]

  const castling = { ...game.castling }
  let enPassant = null

  // En passant urilgan piyodani olib tashlash
  if (move.enPassant) {
    board[move.to + (color === 'w' ? 8 : -8)] = null
  }

  // Donani ko'chirish
  board[move.to] = piece
  board[move.from] = null

  // Piyodani boshqa donaga aylantirish
  if (move.promotion) {
    board[move.to] = color + promotion
  }

  // Piyoda 2 katak yurganda en passant imkoniyati
  if (move.doublePawn) {
    enPassant = (move.from + move.to) / 2
  }

  // Rokировка
  if (move.castle === 'K') {
    board[move.to - 1] = board[move.to + 1]
    board[move.to + 1] = null
  }

  if (move.castle === 'Q') {
    board[move.to + 1] = board[move.to - 2]
    board[move.to - 2] = null
  }

  // Shoh yurishi — rokировка huquqlarini bekor qiladi
  if (piece[1] === 'K') {
    castling[color + 'K'] = false
    castling[color + 'Q'] = false
  }

  // Rux yurganda huquqni bekor qilish
  if (piece[1] === 'R') {
    if (move.from === 0) castling.bQ = false
    if (move.from === 7) castling.bK = false
    if (move.from === 56) castling.wQ = false
    if (move.from === 63) castling.wK = false
  }

  // Rux o'z joyida urib olinsa
  if (move.to === 0) castling.bQ = false
  if (move.to === 7) castling.bK = false
  if (move.to === 56) castling.wQ = false
  if (move.to === 63) castling.wK = false

  return {
    board,
    turn: color === 'w' ? 'b' : 'w',
    castling,
    enPassant,
  }
}

// Faqat shohni shaxda qoldirmaydigan yurishlar
function getLegalMoves(game, from) {
  const color = game.board[from]?.[0]
  if (!color) return []

  return getPseudoMoves(game, from).filter(move => {
    const next = makeMove(game, move)
    return !isInCheck(next.board, color)
  })
}

function getAllLegalMoves(game) {
  let all = []

  for (let i = 0; i < 64; i++) {
    if (game.board[i]?.[0] === game.turn) {
      all = all.concat(getLegalMoves(game, i))
    }
  }

  return all
}

function App() {
  const [game, setGame] = useState(createGame())
  const [selected, setSelected] = useState(null)
  const [legalMoves, setLegalMoves] = useState([])
  const [lastMove, setLastMove] = useState(null)
  const [history, setHistory] = useState([])
  const [promotionMove, setPromotionMove] = useState(null)

  const check = isInCheck(game.board, game.turn)
  const allMoves = getAllLegalMoves(game)
  const finished = allMoves.length === 0

  let status = ''

  if (finished && check) {
    status = `MAT! ${game.turn === 'w' ? 'Qora' : 'Oq'} g'alaba qildi!`
  } else if (finished) {
    status = 'PAT — durang!'
  } else {
    status = `${game.turn === 'w' ? 'Oq' : 'Qora'} yuradi${check ? ' — SHOH!' : ''}`
  }

  const handleClick = (index) => {
    if (finished || promotionMove) return

    const move = legalMoves.find(m => m.to === index)

    // Tanlangan donani yurish
    if (move) {
      if (move.promotion) {
        setPromotionMove(move)
        return
      }

      playMove(move)
      return
    }

    // Boshqa o'z donasini tanlash
    if (game.board[index]?.[0] === game.turn) {
      setSelected(index)
      setLegalMoves(getLegalMoves(game, index))
    } else {
      setSelected(null)
      setLegalMoves([])
    }
  }

  const playMove = (move, promotion = 'Q') => {
    setHistory(prev => [...prev, game])
    const next = makeMove(game, move, promotion)

    setGame(next)
    setLastMove([move.from, move.to])
    setSelected(null)
    setLegalMoves([])
    setPromotionMove(null)
  }

  const resetGame = () => {
    setGame(createGame())
    setSelected(null)
    setLegalMoves([])
    setLastMove(null)
    setHistory([])
    setPromotionMove(null)
  }

  const undoMove = () => {
    if (!history.length) return

    setGame(history[history.length - 1])
    setHistory(prev => prev.slice(0, -1))
    setSelected(null)
    setLegalMoves([])
    setLastMove(null)
    setPromotionMove(null)
  }

  return (
    <div className="app">
      <h1>♟ Chess Game</h1>

      <div className="status">
        {status}
      </div>

      <div className="chess-board">
        {game.board.map((piece, index) => {
          const row = Math.floor(index / 8)
          const col = index % 8
          const isLight = (row + col) % 2 === 0
          const isSelected = selected === index
          const move = legalMoves.find(m => m.to === index)
          const isLast = lastMove?.includes(index)

          return (
            <button
              key={index}
              className={`square ${isLight ? 'light' : 'dark'} ${
                isSelected ? 'selected' : ''
              } ${isLast ? 'last-move' : ''} ${
                move ? (piece ? 'capture' : 'possible-move') : ''
              }`}
              onClick={() => handleClick(index)}
              aria-label={`${String.fromCharCode(97 + col)}${8 - row}`}
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

      {promotionMove && (
        <div className="promotion">
          <p>Piyodani qaysi donaga almashtirasiz?</p>
          {['Q', 'R', 'B', 'N'].map(type => (
            <button
              key={type}
              onClick={() => playMove(promotionMove, type)}
            >
              {pieces[type]}
            </button>
          ))}
        </div>
      )}

      <div className="buttons">
        <button
          className="reset-btn"
          onClick={undoMove}
          disabled={!history.length}
        >
          ↩ Qaytarish
        </button>

        <button className="reset-btn" onClick={resetGame}>
          Yangi o'yin
        </button>
      </div>
    </div>
  )
}

export default App