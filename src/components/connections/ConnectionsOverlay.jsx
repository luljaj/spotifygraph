import { useState, useEffect } from 'react'
import './ConnectionsMode.css'

function ConnectionsOverlay({
  currentArtist,
  targetArtist,
  hops,
  hintCount,
  mode,
  startTime,
  canUndo,
  onUndo,
  onExit
}) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (mode !== 'competitive' || !startTime) return

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [mode, startTime])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="connections-overlay">
      <div className="connections-overlay__bar">
        <button
          className="btn btn--ghost"
          onClick={onExit}
          title="Exit game"
        >
          Exit
        </button>

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

          <span className="connections-overlay__hops">
            Jumps: {hops}
          </span>

          <span className="connections-overlay__hints">
            Hints: {hintCount}
          </span>
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

      <div className="connections-overlay__current">
        <span>Now at: <strong>{currentArtist?.name}</strong></span>
      </div>
    </div>
  )
}

export default ConnectionsOverlay
