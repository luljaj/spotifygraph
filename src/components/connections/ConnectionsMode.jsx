import { useEffect, useRef, useState } from 'react'
import { CONNECTIONS_CONFIG } from '../../config/connectionsConfig'
import ConnectionsSetup from './ConnectionsSetup'
import ConnectionsOverlay from './ConnectionsOverlay'
import ConnectionsResult from './ConnectionsResult'
import './ConnectionsMode.css'

function ConnectionsMode({ graphData, connections, onExit }) {
  const {
    gameState,
    isIdle,
    isSetup,
    isPlaying,
    isComplete,
    canBacktrack,
    startGame,
    beginPlaying,
    submitGuess,
    goBackTo,
    exitGame,
    newChallenge,
    searchArtists,
    clearFeedback,
    beginHintSelection,
    cancelHintSelection,
  } = connections || {}

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef(null)
  const blurTimeout = useRef(null)
  const suppressSuggestionsRef = useRef(false)
  const isHintSelecting = Boolean(gameState?.hintSelectionActive)

  useEffect(() => {
    if (!startGame) return
    if (isIdle && graphData?.nodes?.length) {
      startGame('relaxed')
    }
  }, [isIdle, graphData?.nodes?.length, startGame])

  useEffect(() => {
    if (!isPlaying) {
      setQuery('')
      setSuggestions([])
      setActiveIndex(-1)
    }
  }, [isPlaying])

  useEffect(() => {
    if (!isPlaying || !isFocused || isHintSelecting) {
      setSuggestions([])
      setActiveIndex(-1)
      return
    }

    const trimmed = query.trim()
    if (trimmed.length < CONNECTIONS_CONFIG.input.minQueryLength) {
      setSuggestions([])
      setActiveIndex(-1)
      return
    }

    if (suppressSuggestionsRef.current) {
      suppressSuggestionsRef.current = false
      setSuggestions([])
      setActiveIndex(-1)
      return
    }

    const timer = setTimeout(() => {
      const results = searchArtists(trimmed)
      setSuggestions(results)
      setActiveIndex(-1)
    }, CONNECTIONS_CONFIG.input.debounceMs)

    return () => clearTimeout(timer)
  }, [query, isFocused, isPlaying, searchArtists])

  useEffect(() => {
    if (!gameState?.lastGuessResult) return
    const timer = setTimeout(() => {
      clearFeedback?.()
    }, 2500)
    return () => clearTimeout(timer)
  }, [gameState?.lastGuessResult, clearFeedback])

  useEffect(() => {
    return () => {
      if (blurTimeout.current) {
        clearTimeout(blurTimeout.current)
      }
    }
  }, [])

  const handleExit = () => {
    exitGame?.()
    onExit?.()
  }

  const handleSubmit = (value) => {
    if (!submitGuess) return
    const guess = typeof value === 'string' ? value.trim() : value
    if (!guess) return
    submitGuess(guess)
    setQuery('')
    setSuggestions([])
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  const handleHint = () => {
    if (isHintSelecting) {
      cancelHintSelection?.()
      setTimeout(() => inputRef.current?.focus(), 0)
      return
    }

    const started = beginHintSelection?.()
    if (started) {
      setQuery('')
      setSuggestions([])
      setActiveIndex(-1)
      setIsFocused(false)
      inputRef.current?.blur()
    }
  }

  const handleKeyDown = (event) => {
    if (!isPlaying || isHintSelecting) return

    if (event.key === 'ArrowDown') {
      if (!suggestions.length) return
      event.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
      return
    }

    if (event.key === 'ArrowUp') {
      if (!suggestions.length) return
      event.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, 0))
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        handleSubmit(suggestions[activeIndex].id)
      } else {
        handleSubmit(query)
      }
      return
    }

    if (event.key === 'Escape') {
      setSuggestions([])
      setActiveIndex(-1)
    }

    if (event.key === 'Tab' && !event.shiftKey) {
      if (!suggestions.length) return
      event.preventDefault()
      const index = activeIndex >= 0 ? activeIndex : 0
      const suggestion = suggestions[index]
      if (!suggestion) return
      suppressSuggestionsRef.current = true
      setQuery(suggestion.name)
      setSuggestions([])
      setActiveIndex(-1)
    }
  }

  const handleFocus = () => {
    if (isHintSelecting) return
    if (blurTimeout.current) {
      clearTimeout(blurTimeout.current)
    }
    setIsFocused(true)
  }

  const handleBlur = () => {
    blurTimeout.current = setTimeout(() => {
      setIsFocused(false)
    }, 100)
  }

  const feedbackType = gameState?.lastGuessResult
    ? (gameState.lastGuessResult.success
      ? 'success'
      : gameState.lastGuessResult.type === 'not_found'
        ? 'warning'
        : 'error')
    : null

  const inputPlaceholder = isHintSelecting
    ? 'Select a hidden node...'
    : 'Type an artist name...'

  if (!connections) return null

  return (
    <div className="connections-mode">
      {isSetup && (
        <ConnectionsSetup
          startArtist={gameState.startArtist}
          targetArtist={gameState.targetArtist}
          optimalHops={gameState.optimalHops}
          onStart={beginPlaying}
          onNewChallenge={newChallenge}
          onExit={handleExit}
        />
      )}

      {isPlaying && (
        <>
          <ConnectionsOverlay
            currentArtist={gameState.currentArtist}
            targetArtist={gameState.targetArtist}
            hops={gameState.hops}
            hintCount={gameState.hintCount}
            mode={gameState.mode}
            startTime={gameState.startTime}
            canUndo={false}
            onUndo={() => {}}
            onExit={handleExit}
          />

          <div className="connections-panel">
            <div className="connections-panel__card">
              <div className="connections-panel__path">
                <div className="connections-panel__path-header">
                  <span className="connections-panel__path-label">Your Path</span>
                  <span className="connections-panel__path-meta">
                    Guesses: {gameState.guessCount}
                  </span>
                </div>

                <div className="connections-panel__path-list">
                  {gameState.pathArtists.map((artist, index) => {
                    const isLast = index === gameState.pathArtists.length - 1
                    const isClickable = canBacktrack && !isLast

                    return (
                      <div key={artist.id} className="connections-panel__path-item">
                        <button
                          type="button"
                          className={`connections-panel__path-button ${isClickable ? 'is-clickable' : ''}`}
                          onClick={() => {
                            if (isClickable) {
                              goBackTo(artist.id)
                            }
                          }}
                          disabled={!isClickable}
                        >
                          {artist.name}
                        </button>
                        {!isLast && (
                          <span className="connections-panel__path-arrow">{'>'}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="connections-panel__input-wrap">
                <div className="connections-panel__input">
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder={inputPlaceholder}
                    className="connections-panel__input-field"
                    aria-label="Artist name"
                    autoComplete="off"
                    disabled={isHintSelecting}
                  />
                  <button
                    type="button"
                    className={`btn btn--ghost connections-panel__hint-button ${isHintSelecting ? 'is-active' : ''}`}
                    onClick={handleHint}
                    disabled={!isPlaying}
                  >
                    {isHintSelecting ? 'Cancel Hint' : 'Hint'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => handleSubmit(query)}
                    disabled={isHintSelecting || !query.trim()}
                  >
                    Guess
                  </button>

                  {isFocused && suggestions.length > 0 && (
                    <div className="connections-panel__suggestions" role="listbox">
                      {suggestions.map((artist, index) => (
                        <button
                          key={artist.id}
                          type="button"
                          className={`connections-panel__suggestion ${index === activeIndex ? 'is-active' : ''}`}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleSubmit(artist.id)}
                          role="option"
                          aria-selected={index === activeIndex}
                        >
                          {artist.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {isHintSelecting && (
                <div className="connections-panel__hint">
                  Hint active. Click a hidden node to reveal it.
                </div>
              )}

              {gameState.lastGuessResult && (
                <div className={`connections-panel__feedback connections-panel__feedback--${feedbackType}`}>
                  {gameState.lastGuessResult.message}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {isComplete && (
        <ConnectionsResult
          path={gameState.path}
          hops={gameState.hops}
          guessCount={gameState.guessCount}
          hintCount={gameState.hintCount}
          optimalHops={gameState.optimalHops}
          optimalPath={gameState.optimalPath}
          mode={gameState.mode}
          score={gameState.score}
          startTime={gameState.startTime}
          endTime={gameState.endTime}
          nodes={graphData.nodes}
          onPlayAgain={newChallenge}
          onExit={handleExit}
        />
      )}
    </div>
  )
}

export default ConnectionsMode
