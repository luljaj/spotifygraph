import { useState } from 'react'
import { useSpotifyAuth } from './hooks/useSpotifyAuth'
import { useSpotifyData } from './hooks/useSpotifyData'
import { useLastFmData } from './hooks/useLastFmData'
import Login from './components/Login'
import SpotifyGraph from './components/SpotifyGraph'
import ToolsPanel from './components/ToolsPanel'
import ArtistDetails from './components/ArtistDetails'
import './App.css'

// Default graph settings
const DEFAULT_SETTINGS = {
  labelOpacity: 0.6,
  nodeScale: 1,
  linkOpacity: 0.5,
  chargeStrength: -120,
  linkDistance: 60,
  showAllLabels: true
}

function App() {
  // Data source state
  const [dataSource, setDataSource] = useState(null) // 'spotify' | 'lastfm' | null
  const [lastfmUsername, setLastfmUsername] = useState(null)
  
  // Spotify auth
  const { token, login: spotifyLogin, logout: spotifyLogout, isLoading: authLoading } = useSpotifyAuth()
  
  // Data hooks - only one will be active based on source
  const spotifyData = useSpotifyData(dataSource === 'spotify' ? token : null)
  const lastfmData = useLastFmData(dataSource === 'lastfm' ? lastfmUsername : null)
  
  // Get active data based on source
  const activeData = dataSource === 'spotify' ? spotifyData : lastfmData
  const { artists, graphData, isLoading: dataLoading, error, progress } = activeData
  
  const [selectedArtist, setSelectedArtist] = useState(null)
  const [showGenreLabels, setShowGenreLabels] = useState(true)
  const [graphSettings, setGraphSettings] = useState(DEFAULT_SETTINGS)

  // Handle Spotify login
  const handleSpotifyLogin = () => {
    setDataSource('spotify')
    spotifyLogin()
  }

  // Handle Last.fm login
  const handleLastFmLogin = async (username) => {
    setLastfmUsername(username)
    setDataSource('lastfm')
  }

  // Handle logout
  const handleLogout = () => {
    if (dataSource === 'spotify') {
      spotifyLogout()
    }
    setDataSource(null)
    setLastfmUsername(null)
  }

  // Export artist data as JSON file
  const exportData = () => {
    const dataStr = JSON.stringify(artists, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${dataSource}_artists.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Show loading during Spotify auth check
  if (authLoading) {
    return (
      <div className="app app--loading">
        <div className="loader">
          <div className="loader__ring"></div>
          <span>Connecting...</span>
        </div>
      </div>
    )
  }

  // If returning from Spotify OAuth with token, set source to spotify
  if (token && !dataSource) {
    setDataSource('spotify')
  }

  // Show login if no data source selected and no token
  if (!dataSource && !token) {
    return (
      <Login 
        onSpotifyLogin={handleSpotifyLogin} 
        onLastFmLogin={handleLastFmLogin}
      />
    )
  }

  // Show error
  if (error) {
    return (
      <div className="app app--error">
        <div className="error-card">
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button className="btn btn--primary" onClick={handleLogout}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const sourceLabel = dataSource === 'spotify' ? 'Spotify' : 'Last.fm'
  const sourceColor = dataSource === 'spotify' ? '#1DB954' : '#d51007'

  return (
    <div className="app">
      <header className="header">
        <div className="header__brand">
          <svg className="header__logo" viewBox="0 0 100 100" width="32" height="32">
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={sourceColor}/>
                <stop offset="100%" stopColor={sourceColor}/>
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill="url(#logoGrad)"/>
            <circle cx="35" cy="40" r="8" fill="#0a0a0f"/>
            <circle cx="65" cy="40" r="6" fill="#0a0a0f"/>
            <circle cx="50" cy="65" r="5" fill="#0a0a0f"/>
            <line x1="35" y1="40" x2="65" y2="40" stroke="#0a0a0f" strokeWidth="2"/>
            <line x1="35" y1="40" x2="50" y2="65" stroke="#0a0a0f" strokeWidth="2"/>
            <line x1="65" y1="40" x2="50" y2="65" stroke="#0a0a0f" strokeWidth="2"/>
          </svg>
          <h1 className="header__title">Music Graph</h1>
          <span className="header__source" style={{ '--source-color': sourceColor }}>
            {sourceLabel}
            {dataSource === 'lastfm' && lastfmUsername && (
              <span className="header__username">@{lastfmUsername}</span>
            )}
          </span>
        </div>
        <div className="header__actions">
          {artists.length > 0 && (
            <button className="btn btn--ghost" onClick={exportData}>
              Export Data
            </button>
          )}
          <button className="btn btn--ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="main">
        {dataLoading ? (
          <div className="loader">
            <div className="loader__ring" style={{ borderTopColor: sourceColor }}></div>
            <span>{progress || 'Loading your music taste...'}</span>
          </div>
        ) : (
          <SpotifyGraph
            data={graphData}
            onNodeClick={setSelectedArtist}
            showGenreLabels={showGenreLabels}
            settings={graphSettings}
          />
        )}
      </main>

      <ToolsPanel
        settings={graphSettings}
        onSettingsChange={setGraphSettings}
        showGenreLabels={showGenreLabels}
        onToggleGenreLabels={() => setShowGenreLabels(!showGenreLabels)}
      />

      {selectedArtist && (
        <ArtistDetails
          artist={selectedArtist}
          onClose={() => setSelectedArtist(null)}
        />
      )}
    </div>
  )
}

export default App
