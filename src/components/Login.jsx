import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Login.css'

function Login({ onSpotifyLogin, onLastFmLogin }) {
  const [activeTab, setActiveTab] = useState('spotify')
  const [lastfmUsername, setLastfmUsername] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState('')
  const [showInfo, setShowInfo] = useState(false)

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
      <div className="login__content">
        <div className="login__title-wrapper">
          <Link 
            to="/info" 
            className={`login__info-link ${showInfo ? 'login__info-link--visible' : ''}`}
          >
            INFO
          </Link>
          <h1 
            className="login__title" 
            onClick={() => setShowInfo(!showInfo)}
          >
            CANERIS
          </h1>
        </div>

        {/* Source Tabs - subtle */}
        <div className="login__tabs">
          <button 
            className={`login__tab ${activeTab === 'spotify' ? 'login__tab--active' : ''}`}
            onClick={() => setActiveTab('spotify')}
          >
            Spotify
          </button>
          <button 
            className={`login__tab ${activeTab === 'lastfm' ? 'login__tab--active login__tab--lastfm' : ''}`}
            onClick={() => setActiveTab('lastfm')}
          >
            last.fm
          </button>
        </div>

        {/* Action area - animated transitions */}
        <div className={`login__action ${activeTab === 'lastfm' ? 'login__action--lastfm' : ''}`}>
          {/* Input field - fades in/out */}
          <div className={`login__input-wrapper ${activeTab === 'lastfm' ? 'login__input-wrapper--visible' : ''}`}>
            <input
              type="text"
              className="login__input"
              placeholder="Last.fm username"
              value={lastfmUsername}
              onChange={(e) => setLastfmUsername(e.target.value)}
              disabled={isValidating || activeTab !== 'lastfm'}
              tabIndex={activeTab === 'lastfm' ? 0 : -1}
            />
            {error && activeTab === 'lastfm' && <p className="login__error">{error}</p>}
          </div>

          {/* Button - slides and changes style */}
          <button 
            type={activeTab === 'lastfm' ? 'submit' : 'button'}
            className={`login__button ${activeTab === 'lastfm' ? 'login__button--lastfm' : ''}`}
            onClick={activeTab === 'spotify' ? onSpotifyLogin : handleLastFmSubmit}
            disabled={activeTab === 'lastfm' && isValidating}
          >
            {activeTab === 'spotify' ? (
              <>
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                Explore with Spotify
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M10.584 17.21l-.88-2.392s-1.43 1.594-3.573 1.594c-1.897 0-3.244-1.649-3.244-4.288 0-3.382 1.704-4.591 3.381-4.591 2.42 0 3.189 1.567 3.849 3.574l.88 2.749c.88 2.666 2.529 4.81 7.285 4.81 3.409 0 5.718-1.044 5.718-3.793 0-2.227-1.265-3.381-3.63-3.931l-1.758-.385c-1.21-.275-1.567-.77-1.567-1.595 0-.934.742-1.484 1.952-1.484 1.32 0 2.034.495 2.144 1.677l2.749-.33c-.22-2.474-1.924-3.492-4.729-3.492-2.474 0-4.893.935-4.893 3.932 0 1.87.907 3.051 3.189 3.601l1.87.44c1.402.33 1.869.907 1.869 1.704 0 1.017-.99 1.43-2.86 1.43-2.776 0-3.93-1.457-4.59-3.464l-.907-2.75c-1.155-3.573-2.997-4.893-6.653-4.893C2.144 5.333 0 7.89 0 12.233c0 4.18 2.144 6.434 5.993 6.434 3.106 0 4.591-1.457 4.591-1.457z"/>
                </svg>
                {isValidating ? 'Connecting...' : 'Explore with Last.fm'}
              </>
            )}
          </button>
        </div>

        {/* Etymology - the elegant touch */}
        <div className="login__etymology">
          <span className="login__etymology-word">caneris</span>
          <span className="login__etymology-divider">—</span>
          <span className="login__etymology-meaning">from Latin "canere": to sing</span>
        </div>
      </div>
    </div>
  )
}

export default Login
