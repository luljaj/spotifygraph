import { useState } from 'react'
import './ConnectionsMode.css'

function ConnectionsResult({
  path,
  hops,
  guessCount,
  hintCount,
  optimalHops,
  optimalPath,
  mode,
  score,
  startTime,
  endTime,
  nodes,
  onPlayAgain,
  onExit
}) {
  const timeElapsed = startTime && endTime
    ? ((endTime - startTime) / 1000).toFixed(1)
    : 0

  const [showOptimalPath, setShowOptimalPath] = useState(false)

  const wasOptimal = hops === optimalHops

  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const pathNodes = path.map(id => nodeMap.get(id)).filter(Boolean)
  const optimalPathNodes = optimalPath ? optimalPath.map(id => nodeMap.get(id)).filter(Boolean) : []

  return (
    <div className="connections-result">
      <div className="connections-result__card">
        <h2 className="connections-result__title">
          Course Navigated
        </h2>

        {!showOptimalPath ? (
          <div className="connections-result__path">
            <h3>Your Trajectory:</h3>
            <div className="connections-result__path-list">
              {pathNodes.map((node, index) => (
                <div key={node.id} className="connections-result__path-item">
                  {node.image ? (
                    <img
                      src={node.image}
                      alt={node.name}
                      className="connections-result__path-image"
                    />
                  ) : (
                    <div className="connections-result__path-image connections-result__path-image--placeholder" />
                  )}
                  <span className="connections-result__path-name">
                    {node.name}
                  </span>
                  {index < pathNodes.length - 1 && (
                    <span className="connections-result__path-arrow">↓</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="connections-result__paths-container">
            <div className="connections-result__path-column">
              <h3>Your Trajectory:</h3>
              <div className="connections-result__path-list">
                {pathNodes.map((node, index) => (
                  <div key={node.id} className="connections-result__path-item">
                    {node.image ? (
                      <img
                        src={node.image}
                        alt={node.name}
                        className="connections-result__path-image"
                      />
                    ) : (
                      <div className="connections-result__path-image connections-result__path-image--placeholder" />
                    )}
                    <span className="connections-result__path-name">
                      {node.name}
                    </span>
                    {index < pathNodes.length - 1 && (
                      <span className="connections-result__path-arrow">↓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="connections-result__path-column">
              <h3>Optimal Course:</h3>
              <div className="connections-result__path-list">
                {optimalPathNodes.map((node, index) => (
                  <div key={node.id} className="connections-result__path-item">
                    {node.image ? (
                      <img
                        src={node.image}
                        alt={node.name}
                        className="connections-result__path-image"
                      />
                    ) : (
                      <div className="connections-result__path-image connections-result__path-image--placeholder" />
                    )}
                    <span className="connections-result__path-name">
                      {node.name}
                    </span>
                    {index < optimalPathNodes.length - 1 && (
                      <span className="connections-result__path-arrow">↓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="connections-result__stats">
          <div className="connections-result__stat">
            <span className="connections-result__stat-value">{hops}</span>
            <span className="connections-result__stat-label">Jumps</span>
          </div>

          <div className="connections-result__stat">
            <span className="connections-result__stat-value">{guessCount}</span>
            <span className="connections-result__stat-label">Guesses</span>
          </div>

          <div className="connections-result__stat">
            <span className="connections-result__stat-value">{hintCount}</span>
            <span className="connections-result__stat-label">Hints</span>
          </div>

          {mode === 'competitive' && (
            <>
              <div className="connections-result__stat">
                <span className="connections-result__stat-value">{timeElapsed}s</span>
                <span className="connections-result__stat-label">Time</span>
              </div>

              <div className="connections-result__stat">
                <span className="connections-result__stat-value">{score}</span>
                <span className="connections-result__stat-label">Score</span>
              </div>
            </>
          )}
        </div>

        <button
          className="btn btn--ghost"
          onClick={() => setShowOptimalPath(!showOptimalPath)}
          style={{ marginTop: '16px', marginBottom: '16px' }}
        >
          {showOptimalPath ? 'Hide' : 'Show'} Optimal Path
        </button>

        {wasOptimal ? (
          <p className="connections-result__optimal">
            Perfect trajectory! You found the optimal course.
          </p>
        ) : (
          <p className="connections-result__suboptimal">
            Optimal was {optimalHops} jumps
          </p>
        )}

        <div className="connections-result__actions">
          <button
            className="btn btn--ghost"
            onClick={onExit}
          >
            Exit
          </button>
          <button
            className="btn btn--primary"
            onClick={onPlayAgain}
          >
            New Course
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConnectionsResult
