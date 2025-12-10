import { useState } from 'react'
import './Login.css'

function Login({ onSpotifyLogin, onLastFmLogin }) {
  const [activeTab, setActiveTab] = useState('spotify')
  const [lastfmUsername, setLastfmUsername] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState('')

  const handleLastFmSubmit = async (e) => {
    e.preventDefault()
    if (!lastfmUsername.trim()) {
      setError('Please enter your Last.fm username')
      return
    }
    
    setIsValidating(true)
    setError('')
    
    try {
      await onLastFmLogin(lastfmUsername.trim())
    } catch (err) {
      setError(err.message || 'Failed to connect to Last.fm')
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <div className="login">
      <div className="login__bg">
        <div className="login__orb login__orb--1"></div>
        <div className="login__orb login__orb--2"></div>
        <div className="login__orb login__orb--3"></div>
        <div className="login__grid"></div>
      </div>
      
      <div className="login__content">
        <div className="login__logo">
          <svg viewBox="0 0 100 100" width="80" height="80">
            <defs>
              <linearGradient id="loginLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1DB954"/>
                <stop offset="100%" stopColor="#1ed760"/>
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <circle cx="50" cy="50" r="45" fill="url(#loginLogoGrad)" filter="url(#glow)"/>
            <circle cx="35" cy="40" r="8" fill="#0a0a0f"/>
            <circle cx="65" cy="40" r="6" fill="#0a0a0f"/>
            <circle cx="50" cy="65" r="5" fill="#0a0a0f"/>
            <line x1="35" y1="40" x2="65" y2="40" stroke="#0a0a0f" strokeWidth="2"/>
            <line x1="35" y1="40" x2="50" y2="65" stroke="#0a0a0f" strokeWidth="2"/>
            <line x1="65" y1="40" x2="50" y2="65" stroke="#0a0a0f" strokeWidth="2"/>
          </svg>
        </div>

        <h1 className="login__title">Music Graph</h1>
        <p className="login__subtitle">
          Visualize your music taste as an interactive network of artists connected by genre
        </p>

        {/* Source Tabs */}
        <div className="login__tabs">
          <button 
            className={`login__tab ${activeTab === 'spotify' ? 'login__tab--active' : ''}`}
            onClick={() => setActiveTab('spotify')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Spotify
          </button>
          <button 
            className={`login__tab ${activeTab === 'lastfm' ? 'login__tab--active login__tab--lastfm' : ''}`}
            onClick={() => setActiveTab('lastfm')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="currentColor" d="M10.584 17.21l-.88-2.392s-1.43 1.594-3.573 1.594c-1.897 0-3.244-1.649-3.244-4.288 0-3.382 1.704-4.591 3.381-4.591 2.42 0 3.189 1.567 3.849 3.574l.88 2.749c.88 2.666 2.529 4.81 7.285 4.81 3.409 0 5.718-1.044 5.718-3.793 0-2.227-1.265-3.381-3.63-3.931l-1.758-.385c-1.21-.275-1.567-.77-1.567-1.595 0-.934.742-1.484 1.952-1.484 1.32 0 2.034.495 2.144 1.677l2.749-.33c-.22-2.474-1.924-3.492-4.729-3.492-2.474 0-4.893.935-4.893 3.932 0 1.87.907 3.051 3.189 3.601l1.87.44c1.402.33 1.869.907 1.869 1.704 0 1.017-.99 1.43-2.86 1.43-2.776 0-3.93-1.457-4.59-3.464l-.907-2.75c-1.155-3.573-2.997-4.893-6.653-4.893C2.144 5.333 0 7.89 0 12.233c0 4.18 2.144 6.434 5.993 6.434 3.106 0 4.591-1.457 4.591-1.457z"/>
            </svg>
            Last.fm
          </button>
        </div>

        {/* Spotify Login */}
        {activeTab === 'spotify' && (
          <button className="login__button login__button--spotify" onClick={onSpotifyLogin}>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Connect with Spotify
          </button>
        )}

        {/* Last.fm Login */}
        {activeTab === 'lastfm' && (
          <form className="login__form" onSubmit={handleLastFmSubmit}>
            <div className="login__input-group">
              <input
                type="text"
                className="login__input"
                placeholder="Enter your Last.fm username"
                value={lastfmUsername}
                onChange={(e) => setLastfmUsername(e.target.value)}
                disabled={isValidating}
              />
            </div>
            {error && <p className="login__error">{error}</p>}
            <button 
              type="submit" 
              className="login__button login__button--lastfm"
              disabled={isValidating}
            >
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M10.584 17.21l-.88-2.392s-1.43 1.594-3.573 1.594c-1.897 0-3.244-1.649-3.244-4.288 0-3.382 1.704-4.591 3.381-4.591 2.42 0 3.189 1.567 3.849 3.574l.88 2.749c.88 2.666 2.529 4.81 7.285 4.81 3.409 0 5.718-1.044 5.718-3.793 0-2.227-1.265-3.381-3.63-3.931l-1.758-.385c-1.21-.275-1.567-.77-1.567-1.595 0-.934.742-1.484 1.952-1.484 1.32 0 2.034.495 2.144 1.677l2.749-.33c-.22-2.474-1.924-3.492-4.729-3.492-2.474 0-4.893.935-4.893 3.932 0 1.87.907 3.051 3.189 3.601l1.87.44c1.402.33 1.869.907 1.869 1.704 0 1.017-.99 1.43-2.86 1.43-2.776 0-3.93-1.457-4.59-3.464l-.907-2.75c-1.155-3.573-2.997-4.893-6.653-4.893C2.144 5.333 0 7.89 0 12.233c0 4.18 2.144 6.434 5.993 6.434 3.106 0 4.591-1.457 4.591-1.457z"/>
              </svg>
              {isValidating ? 'Connecting...' : 'Connect with Last.fm'}
            </button>
          </form>
        )}

        <div className="login__features">
          <div className="login__feature">
            <div className="login__feature-icon">📊</div>
            <span>Top 100 Artists</span>
          </div>
          <div className="login__feature">
            <div className="login__feature-icon">🔗</div>
            <span>Genre Connections</span>
          </div>
          <div className="login__feature">
            <div className="login__feature-icon">✨</div>
            <span>Interactive Graph</span>
          </div>
        </div>

        <p className="login__disclaimer">
          We only access your top artists. No data is stored.
        </p>
      </div>
    </div>
  )
}

export default Login
