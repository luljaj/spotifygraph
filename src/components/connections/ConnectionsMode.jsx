import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [lastAddedIndex, setLastAddedIndex] = useState(null)
  const inputRef = useRef(null)
  const pathListRef = useRef(null)
  const addTimerRef = useRef(null)
  const previousPathLength = useRef(0)
  const blurTimeout = useRef(null)
  const suppressSuggestionsRef = useRef(false)
  const isHintSelecting = Boolean(gameState?.hintSelectionActive)
  const nodeMap = useMemo(() => {
    if (!graphData?.nodes) return new Map()
    return new Map(graphData.nodes.map(node => [node.id, node]))
  }, [graphData?.nodes])

  const connectedArtists = useMemo(() => {
    if (!connections?.adjacency || !gameState?.currentArtist) return []
    const neighbors = connections.adjacency.get(gameState.currentArtist.id)
    if (!neighbors) return []

    return Array.from(neighbors)
      .map(id => nodeMap.get(id))
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [connections?.adjacency, gameState?.currentArtist, nodeMap])

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
      setLastAddedIndex(null)
      previousPathLength.current = 0
    }
  }, [isPlaying])

  useEffect(() => {
    if (!isPlaying) return
    const list = pathListRef.current
    if (!list) return

    requestAnimationFrame(() => {
      list.scrollLeft = Math.max(0, list.scrollWidth - list.clientWidth)
    })
  }, [isPlaying, gameState?.pathArtists?.length])

  useEffect(() => {
    if (!isPlaying) return
    const length = gameState?.pathArtists?.length ?? 0
    if (length <= 0) return
    const previousLength = previousPathLength.current

    if (length > previousLength) {
      if (addTimerRef.current) {
        clearTimeout(addTimerRef.current)
      }
      setLastAddedIndex(length - 1)
      addTimerRef.current = setTimeout(() => {
        setLastAddedIndex(null)
      }, 420)
    } else if (length < previousLength) {
      setLastAddedIndex(null)
    }

    previousPathLength.current = length
  }, [isPlaying, gameState?.pathArtists?.length])

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
      if (addTimerRef.current) {
        clearTimeout(addTimerRef.current)
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

  const handleConnectionSelect = (artistId) => {
    if (isHintSelecting) return
    handleSubmit(artistId)
  }

  const handleBack = () => {
    if (!canBacktrack || !gameState?.path?.length) return
    const previousId = gameState.path[gameState.path.length - 2]
    if (previousId) {
      goBackTo(previousId)
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

  const toastData = useMemo(() => {
    const result = gameState?.lastGuessResult
    if (!result || result.type === 'complete') return null

    if (result.success) {
      return { message: result.message, tone: 'success' }
    }

    const warningTypes = new Set(['not_connected', 'not_found', 'no_hidden', 'hint_invalid'])
    const tone = warningTypes.has(result.type) ? 'warning' : 'error'
    return { message: result.message, tone }
  }, [gameState?.lastGuessResult])

  const inputPlaceholder = isHintSelecting
    ? 'Select a hidden artist...'
    : 'Plot the path to next artist...'

  const jumpClass = useMemo(() => {
    const hops = gameState?.hops ?? 0
    const optimal = gameState?.optimalHops ?? 0
    if (!Number.isFinite(optimal) || optimal <= 0) {
      return 'connections-panel__stat-number--jumps-neutral'
    }
    if (hops <= optimal) {
      return 'connections-panel__stat-number--jumps-good'
    }
    if (hops < optimal * 2) {
      return 'connections-panel__stat-number--jumps-warn'
    }
    return 'connections-panel__stat-number--jumps-bad'
  }, [gameState?.hops, gameState?.optimalHops])

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
            connectedArtists={connectedArtists}
            onConnectionSelect={handleConnectionSelect}
            onBack={handleBack}
            onHint={handleHint}
            canBack={canBacktrack}
            isHintSelecting={isHintSelecting}
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
                <div className="connections-panel__path-list" ref={pathListRef}>
                  {gameState.pathArtists.map((artist, index) => {
                    const isLast = index === gameState.pathArtists.length - 1
                    const isClickable = canBacktrack && !isLast
                    const isAdded = index === lastAddedIndex
                    const isLinkAdded = lastAddedIndex != null && index === lastAddedIndex - 1

                    return (
                      <div
                        key={artist.id}
                        className={`connections-panel__path-item ${isAdded ? 'is-added' : ''}`}
                      >
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
                          <span
                            className={`connections-panel__path-arrow ${isLinkAdded ? 'is-added' : ''}`}
                            aria-hidden="true"
                          >
                            <svg
                              className="connections-panel__path-arrow-icon"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            >
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="connections-panel__stats">
                <span className="connections-panel__stat-number connections-panel__stat-number--guesses">
                  {gameState.guessCount}
                </span>{' '}
                guesses,{' '}
                <span className={`connections-panel__stat-number ${jumpClass}`}>
                  {gameState.hops}
                </span>{' '}
                /{' '}
                <span className="connections-panel__stat-number connections-panel__stat-number--optimal">
                  {gameState.optimalHops}
                </span>{' '}
                jumps,{' '}
                <span className="connections-panel__stat-number connections-panel__stat-number--hints">
                  {gameState.hintCount}
                </span>{' '}
                hints used
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

            </div>
          </div>
        </>
      )}

      {toastData && (
        <div className={`connections-toast ${toastData.tone ? `connections-toast--${toastData.tone}` : ''}`}>
          {toastData.message}
        </div>
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
