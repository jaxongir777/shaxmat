
import { useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import './App.css'

const pieces = {
  w: {
    k: '♔',
    q: '♕',
    r: '♖',
    b: '♗',
    n: '♘',
    p: '♙',
  },
  b: {
    k: '♚',
    q: '♛',
    r: '♜',
    b: '♝',
    n: '♞',
    p: '♟',
  },
}

const pieceValues = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
}

// Taxtadagi pozitsiyani baholash
function evaluateBoard(chess) {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -100000 : 100000
  }

  if (chess.isDraw()) return 0

  let score = 0
  const board = chess.board()

  board.forEach((row, r) => {
    row.forEach((piece, c) => {
      if (!piece) return

      const value = pieceValues[piece.type]
      const sign = piece.color === 'w' ? 1 : -1

      // Donaning asosiy qiymati
      score += value * sign

      // Markazdagi kataklar uchun bonus
      const centerDistance =
        Math.abs(3.5 - r) + Math.abs(3.5 - c)

      const centerBonus = (7 - centerDistance) * 3
      score += centerBonus * sign

      // Piyodalarni oldinga surish
      if (piece.type === 'p') {
        const progress =
          piece.color === 'w' ? 6 - r : r - 1

        score += progress * 8 * sign
      }

      // Ot va fillarni rivojlantirish
      if (['n', 'b'].includes(piece.type)) {
        const developed =
          piece.color === 'w' ? r < 7 : r > 0

        if (developed) score += 10 * sign
      }
    })
  })

  return score
}

// Minimax + Alpha-Beta
function minimax(chess, depth, alpha, beta) {
  if (depth === 0 || chess.isGameOver()) {
    return evaluateBoard(chess)
  }

  const moves = chess.moves({ verbose: true })

  // Oq yuradi: maksimal natijani qidiradi
  if (chess.turn() === 'w') {
    let best = -Infinity

    for (const move of moves) {
      const next = new Chess(chess.fen())
      next.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q',
      })

      best = Math.max(
        best,
        minimax(next, depth - 1, alpha, beta)
      )

      alpha = Math.max(alpha, best)
      if (beta <= alpha) break
    }

    return best
  }

  // Qora yuradi: minimal natijani qidiradi
  let best = Infinity

  for (const move of moves) {
    const next = new Chess(chess.fen())
    next.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || 'q',
    })

    best = Math.min(
      best,
      minimax(next, depth - 1, alpha, beta)
    )

    beta = Math.min(beta, best)
    if (beta <= alpha) break
  }

  return best
}

// O'rtacha darajadagi bot
function getBotMove(chess) {
  const moves = chess.moves({ verbose: true })

  if (!moves.length) return null

  let bestScore = Infinity
  let bestMoves = []

  for (const move of moves) {
    const next = new Chess(chess.fen())

    next.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || 'q',
    })

    const score = minimax(next, 1, -Infinity, Infinity)

    if (score < bestScore) {
      bestScore = score
      bestMoves = [move]
    } else if (score === bestScore) {
      bestMoves.push(move)
    }
  }

  // Bir xil baholi yurishlardan bittasini tanlaydi
  return bestMoves[Math.floor(Math.random() * bestMoves.length)]
}

function App() {
  const gameRef = useRef(new Chess())

  const [version, setVersion] = useState(0)
  const [mode, setMode] = useState('bot')
  const [selected, setSelected] = useState(null)
  const [lastMove, setLastMove] = useState(null)
  const [history, setHistory] = useState([])
  const [promotionMoves, setPromotionMoves] = useState([])
  const [thinking, setThinking] = useState(false)

  const game = gameRef.current
  const board = game.board()

  const legalMoves = selected
    ? game.moves({ square: selected, verbose: true })
    : []

  const possibleMoves = legalMoves.map(move => move.to)

  const gameOver = game.isGameOver()

  const botTurn = mode === 'bot' && game.turn() === 'b'

  let status = ''

  if (game.isCheckmate()) {
    status = game.turn() === 'w'
      ? 'MAT! Qora g‘alaba qildi!'
      : 'MAT! Oq g‘alaba qildi!'
  } else if (game.isStalemate()) {
    status = 'PAT — durang!'
  } else if (game.isDraw()) {
    status = 'Durang!'
  } else if (thinking) {
    status = 'Bot o‘ylayapti...'
  } else {
    status =
      (game.turn() === 'w' ? 'Oq' : 'Qora') +
      ' yuradi' +
      (game.isCheck() ? ' — SHOH!' : '')
  }

  // Yurishni bajarish
  const playMove = (move) => {
    if (gameOver || thinking) return

    const previousFen = game.fen()

    try {
      const result = game.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q',
      })

      if (!result) return

      setHistory(prev => [...prev, previousFen])
      setLastMove([result.from, result.to])
      setSelected(null)
      setPromotionMoves([])
      setVersion(v => v + 1)
    } catch (error) {
      console.error('Yurish xatosi:', error)
    }
  }

  // Katak bosilganda
  const handleClick = (square) => {
    if (gameOver || thinking || botTurn || promotionMoves.length) return

    const piece = game.get(square)

    if (selected) {
      const moves = game.moves({
        square: selected,
        verbose: true,
      }).filter(move => move.to === square)

      if (moves.length) {
        const promotions = moves.filter(move => move.promotion)

        if (promotions.length) {
          setPromotionMoves(promotions)
          return
        }

        playMove(moves[0])
        return
      }
    }

    if (piece && piece.color === game.turn()) {
      setSelected(square)
    } else {
      setSelected(null)
    }
  }

  // Bot yurishi
  useEffect(() => {
    if (mode !== 'bot' || game.turn() !== 'b' || game.isGameOver()) {
      return
    }

    setThinking(true)

    const timer = setTimeout(() => {
      const move = getBotMove(gameRef.current)

      if (move) {
        const previousFen = gameRef.current.fen()

        const result = gameRef.current.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion || 'q',
        })

        if (result) {
          setHistory(prev => [...prev, previousFen])
          setLastMove([result.from, result.to])
        }
      }

      setThinking(false)
      setVersion(v => v + 1)
    }, 650)

    return () => clearTimeout(timer)
  }, [version, mode])

  // Yangi o'yin
  const resetGame = (newMode = mode) => {
    gameRef.current = new Chess()
    setMode(newMode)
    setSelected(null)
    setLastMove(null)
    setHistory([])
    setPromotionMoves([])
    setThinking(false)
    setVersion(v => v + 1)
  }

  // Yurishni qaytarish
  const undoMove = () => {
    if (!history.length || thinking) return

    const undoCount = mode === 'bot' ? 2 : 1
    const count = Math.min(undoCount, history.length)

    const remainingHistory = history.slice(0, -count)
    const previousFen = history[history.length - count]

    gameRef.current = new Chess(previousFen)

    setHistory(remainingHistory)
    setSelected(null)
    setPromotionMoves([])
    setLastMove(null)
    setVersion(v => v + 1)
  }

  return (
    <div className="app">
      <h1>♟ Chess Game</h1>

      {/* O'yin rejimi */}
      <div className="mode-selector">
        <button
          className={mode === 'bot' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => resetGame('bot')}
        >
          🤖 Bot bilan
        </button>

        <button
          className={mode === 'two' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => resetGame('two')}
        >
          👥 2 kishi
        </button>
      </div>

      {/* O'yinchilar */}
      <div className="players">
        <div className="player-card">
          <span className="player-icon">♔</span>
          <div>
            <strong>Siz</strong>
            <small>Oq donalar</small>
          </div>
        </div>

        <div className="player-card">
          <span className="player-icon">♚</span>
          <div>
            <strong>{mode === 'bot' ? 'Bot' : '2-o‘yinchi'}</strong>
            <small>Qora donalar</small>
          </div>
        </div>
      </div>

      {/* Holat */}
      <div className="status">
        {status}
      </div>

      {/* Shaxmat taxtasi */}
      <div className="chess-board">
        {board.map((row, r) =>
          row.map((piece, c) => {
            const square = `${'abcdefgh'[c]}${8 - r}`
            const isLight = (r + c) % 2 === 0
            const isSelected = selected === square
            const isPossible = possibleMoves.includes(square)
            const isLast = lastMove?.includes(square)
            const isCapture = isPossible && !!piece

            return (
              <button
                key={square}
                className={`square
                  ${isLight ? 'light' : 'dark'}
                  ${isSelected ? 'selected' : ''}
                  ${isPossible ? 'possible-move' : ''}
                  ${isCapture ? 'capture' : ''}
                  ${isLast ? 'last-move' : ''}
                `}
                onClick={() => handleClick(square)}
                disabled={thinking || botTurn || gameOver}
                aria-label={square}
              >
                {piece && (
                  <span className={
                    piece.color === 'w'
                      ? 'white-piece'
                      : 'black-piece'
                  }>
                    {pieces[piece.color][piece.type]}
                  </span>
                )}

                {c === 0 && (
                  <small className="rank-label">{8 - r}</small>
                )}

                {r === 7 && (
                  <small className="file-label">
                    {'abcdefgh'[c]}
                  </small>
                )}
              </button>
            )
          })
        )}
      </div>

      {/* Piyodani almashtirish */}
      {promotionMoves.length > 0 && (
        <div className="promotion">
          <p>Piyodani qaysi donaga almashtirasiz?</p>

          <div className="promotion-options">
            {promotionMoves.map(move => (
              <button
                key={move.promotion}
                onClick={() => playMove(move)}
              >
                {pieces[game.turn()][move.promotion]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tugmalar */}
      <div className="buttons">
        <button
          className="reset-btn"
          onClick={undoMove}
          disabled={!history.length || thinking}
        >
          ↩ Qaytarish
        </button>

        <button
          className="reset-btn"
          onClick={() => resetGame()}
        >
          Yangi o'yin
        </button>
      </div>

      <div className="game-info">
        {mode === 'bot'
          ? 'Siz oq donalarda o‘ynaysiz. Bot qora donalarda.'
          : 'Oq va qora donalar bilan navbatma-navbat o‘ynang.'}
      </div>
    </div>
  )
}

export default App
