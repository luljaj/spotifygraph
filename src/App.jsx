import { useState, useEffect } from 'react'
import { useSpotifyAuth } from './hooks/useSpotifyAuth'
import { useSpotifyData } from './hooks/useSpotifyData'
import { useLastFmData } from './hooks/useLastFmData'
import Login from './components/Login'
import SpotifyGraph from './components/SpotifyGraph'
import ToolsPanel from './components/ToolsPanel'
import ArtistDetails from './components/ArtistDetails'
import Starfield from './components/Starfield'
import { Analytics } from "@vercel/analytics/react"
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

// Mobile breakpoint
const MOBILE_BREAKPOINT = 768

function App() {
  // Data source state
  const [dataSource, setDataSource] = useState(null) // 'spotify' | 'lastfm' | null
  const [lastfmUsername, setLastfmUsername] = useState(null)
  
  // Spotify auth
  const { token, login: spotifyLogin, logout: spotifyLogout, isLoading: authLoading } = useSpotifyAuth()
  
  // Data hooks - only one will be active based on source
  const spotifyData = useSpotifyData(dataSource === 'spotify' ? token : null)
  const lastfmData = useLastFmData(dataSource === 'lastfm' ? lastfmUsername : null)
  
  // Get active data based on source (null dataSource = empty state, not lastfm)
  const emptyData = { artists: [], graphData: { nodes: [], links: [], genreClusters: [] }, isLoading: false, error: null, progress: '' }
  const activeData = dataSource === 'spotify' ? spotifyData : 
                     dataSource === 'lastfm' ? lastfmData : 
                     emptyData
  const { artists, graphData, isLoading: dataLoading, error, progress } = activeData
  
  const [selectedArtist, setSelectedArtist] = useState(null)
  const [showGenreLabels, setShowGenreLabels] = useState(false)
  const [graphSettings, setGraphSettings] = useState(DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 })
  
  // Mobile detection for responsive styling
  const [isMobile, setIsMobile] = useState(false)

  // Set data source to spotify when returning from OAuth with token
  // Using useEffect instead of setting state during render
  useEffect(() => {
    if (token && !dataSource) {
      setDataSource('spotify')
    }
  }, [token, dataSource])

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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

  // Determine if we should show login
  const showLogin = !authLoading && !dataSource && !token

  // Determine app state classes
  const appClasses = [
    'app',
    authLoading && 'app--loading',
    error && 'app--error'
  ].filter(Boolean).join(' ')

  // Source color for loading spinner (default to Spotify green if dataSource not yet set)
  const sourceColor = dataSource === 'lastfm' ? '#d51007' : '#1DB954'

  // Render content based on current state
  const renderContent = () => {
    // Login screen
    if (showLogin) {
      return (
        <Login 
          onSpotifyLogin={handleSpotifyLogin} 
          onLastFmLogin={handleLastFmLogin}
        />
      )
    }

    // Auth loading state OR transitional state (have token, waiting for dataSource to be set)
    // This prevents the flash of Last.fm styled UI before useEffect sets dataSource
    const isTransitioning = token && !dataSource
    
    if (authLoading || isTransitioning) {
      return (
        <div className="loader">
          <div className="loader__ring"></div>
          <span>Connecting...</span>
        </div>
      )
    }

    // Error state
    if (error) {
      return (
        <div className="error-card">
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button className="btn btn--primary" onClick={handleLogout}>
            Try Again
          </button>
        </div>
      )
    }

    // Header classes for mobile styling
    const headerClasses = [
      'header',
      isMobile && 'header--mobile'
    ].filter(Boolean).join(' ')

    // Main app content
    return (
      <>
        <header className={headerClasses}>
          <div className="header__brand">
            <h1 className="header__title">CANERIS</h1>
          </div>
          <div className="header__actions">
            {artists.length > 0 && (
              <>
                <button 
                  className={`btn btn--icon ${showSettings ? 'btn--active' : ''}`}
                  onClick={() => setShowSettings(!showSettings)}
                  title="Settings"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>
                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
                  </svg>
                </button>
                <button className="btn btn--ghost btn--ghost-icon" onClick={exportData} title="Export">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  <span className="btn__label">Export</span>
                </button>
              </>
            )}
            <button className="btn btn--ghost btn--ghost-icon" onClick={handleLogout} title="Logout">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16,17 21,12 16,7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span className="btn__label">Logout</span>
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
              onCameraChange={setCameraOffset}
              isMobile={isMobile}
            />
          )}
        </main>
      </>
    )
  }

  // Single consistent render structure - Starfield never unmounts!
  return (
    <div className={appClasses}>
      <Starfield cameraOffset={cameraOffset} />
      {renderContent()}

      {showSettings && (
        <ToolsPanel
          settings={graphSettings}
          onSettingsChange={setGraphSettings}
          showGenreLabels={showGenreLabels}
          onToggleGenreLabels={() => setShowGenreLabels(!showGenreLabels)}
          onClose={() => setShowSettings(false)}
        />
      )}

      {selectedArtist && (
        <ArtistDetails
          artist={selectedArtist}
          onClose={() => setSelectedArtist(null)}
        />
      )}
      
      <Analytics />
    </div>
  )
}

export default App
