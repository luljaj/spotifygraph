import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import './ConnectionsMode.css'

function ConnectionsOverlay({
  currentArtist,
  targetArtist,
  connectedArtists,
  onConnectionSelect,
  onBack,
  onHint,
  canBack,
  isHintSelecting,
  hops,
  hintCount,
  mode,
  startTime,
  canUndo,
  onUndo,
  onExit
}) {
  const [elapsed, setElapsed] = useState(0)
  const [showConnections, setShowConnections] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [pillWidth, setPillWidth] = useState(null)
  const [nameState, setNameState] = useState(() => ({
    current: currentArtist?.name || '',
    previous: '',
    isAnimating: false
  }))
  const PILL_WIDTH_BUFFER = 50
  const closeTimerRef = useRef(null)
  const nameTimerRef = useRef(null)
  const pillContentRef = useRef(null)

  useEffect(() => {
    if (mode !== 'competitive' || !startTime) return

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [mode, startTime])

  useEffect(() => {
    if (nameTimerRef.current) {
      clearTimeout(nameTimerRef.current)
    }

    setNameState(prev => {
      if (prev.current === (currentArtist?.name || '')) {
        return prev
      }
      return {
        current: currentArtist?.name || '',
        previous: prev.current,
        isAnimating: true
      }
    })

    nameTimerRef.current = setTimeout(() => {
      setNameState(prev => ({
        ...prev,
        previous: '',
        isAnimating: false
      }))
    }, 320)

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
    }
    setShowConnections(false)
    setIsClosing(false)
  }, [currentArtist?.id])

  useLayoutEffect(() => {
    if (!pillContentRef.current) return
    const contentWidth = pillContentRef.current.getBoundingClientRect().width
    const nextWidth = Math.ceil(contentWidth + PILL_WIDTH_BUFFER)
    setPillWidth(nextWidth)
  }, [nameState.current, PILL_WIDTH_BUFFER])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
      }
      if (nameTimerRef.current) {
        clearTimeout(nameTimerRef.current)
      }
    }
  }, [])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const connectionsList = connectedArtists || []
  const isOpen = showConnections || isClosing

  const handleToggleConnections = () => {
    if (showConnections) {
      if (isClosing) return
      setIsClosing(true)
      closeTimerRef.current = setTimeout(() => {
        setShowConnections(false)
        setIsClosing(false)
      }, 280)
      return
    }

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
    }
    setIsClosing(false)
    setShowConnections(true)
  }

  return (
    <div className="connections-overlay">
      <div className="connections-overlay__bar">
        {canUndo && (
          <button
            className="btn btn--ghost"
            onClick={onUndo}
            title="Undo last move"
          >
            ← Undo
          </button>
        )}

        <div className="connections-overlay__stats">
          {mode === 'competitive' && (
            <span className="connections-overlay__timer">
              {formatTime(elapsed)}
            </span>
          )}
        </div>

        <div className="connections-overlay__target">
          <span className="connections-overlay__target-label">Destination:</span>
          {targetArtist.image ? (
            <img
              src={targetArtist.image}
              alt={targetArtist.name}
              className="connections-overlay__target-image"
            />
          ) : (
            <div className="connections-overlay__target-image connections-overlay__target-image--placeholder" />
          )}
          <span className="connections-overlay__target-name">
            {targetArtist.name}
          </span>
        </div>
      </div>

      <div className="connections-overlay__current-wrap">
        <button
          type="button"
          className="connections-overlay__pill-button"
          onClick={onBack}
          disabled={!canBack || isHintSelecting}
          aria-label="Go back"
          title="Back"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div
          className="connections-overlay__current"
          style={pillWidth ? { width: `${pillWidth}px` } : undefined}
        >
          {isOpen && (
            <div className={`connections-overlay__links-popover ${isClosing ? 'is-closing' : ''}`}>
              <div className="connections-overlay__links-title">
                Connections ({connectionsList.length})
              </div>
              {connectionsList.length > 0 ? (
                <ul className="connections-overlay__links-list">
                  {connectionsList.map((artist) => (
                    <li key={artist.id} className="connections-overlay__links-item">
                      <button
                        type="button"
                        className="connections-overlay__links-button-item"
                        onClick={() => {
                          onConnectionSelect?.(artist.id)
                          handleToggleConnections()
                        }}
                      >
                        {artist.name}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="connections-overlay__links-empty">No connections found</div>
              )}
            </div>
            )}
          <div className="connections-overlay__current-content" ref={pillContentRef}>
            <span className="connections-overlay__current-label">Now at:</span>
            <span className="connections-overlay__name-roll">
              {nameState.previous && (
                <span className="connections-overlay__name-text connections-overlay__name-text--out">
                  {nameState.previous}
                </span>
              )}
              <span
                className={`connections-overlay__name-text connections-overlay__name-text--current ${nameState.isAnimating ? 'is-animating' : ''}`}
              >
                {nameState.current}
              </span>
            </span>
            <button
              type="button"
              className={`connections-overlay__links-button ${showConnections && !isClosing ? 'is-active' : ''}`}
              onClick={handleToggleConnections}
              title="Show connections"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 007.07 0l1.41-1.41a5 5 0 00-7.07-7.07L9 5"/>
                <path d="M14 11a5 5 0 00-7.07 0L5.5 12.5a5 5 0 007.07 7.07L15 19"/>
              </svg>
            </button>
          </div>
        </div>

        <button
          type="button"
          className={`connections-overlay__pill-button connections-overlay__pill-button--hint ${isHintSelecting ? 'is-active' : ''}`}
          onClick={onHint}
          aria-label={isHintSelecting ? 'Cancel hint' : 'Hint'}
          title={isHintSelecting ? 'Cancel hint' : 'Hint'}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18h6" />
            <path d="M10 22h4" />
            <path d="M12 2a7 7 0 00-4 12c1.1.9 1.6 1.8 1.8 3h4.4c.2-1.2.7-2.1 1.8-3a7 7 0 00-4-12z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default ConnectionsOverlay
