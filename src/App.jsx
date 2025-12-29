import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useLastFmData } from './hooks/useLastFmData'
import { useConnectionsGame } from './hooks/useConnectionsGame'
import Login from './components/Login'
import Info from './components/Info'
import Loader from './components/Loader'
import Graph from './components/Graph'
import ToolsPanel from './components/ToolsPanel'
import ArtistDetails from './components/ArtistDetails'
import Starfield from './components/Starfield'
import ModeSelector from './components/ModeSelector'
import ConnectionsMode from './components/connections/ConnectionsMode'
import { Analytics } from "@vercel/analytics/react"
import { DEFAULT_SETTINGS } from './config/graphSettings'
import './App.css'

// Mobile breakpoint
const MOBILE_BREAKPOINT = 768
const LASTFM_USER_KEY = 'lastfm:username'

function App() {
  // Last.fm username state
  const [lastfmUsername, setLastfmUsername] = useState(() => {
    if (typeof window === 'undefined') return null
    try {
      return localStorage.getItem(LASTFM_USER_KEY) || null
    } catch {
      return null
    }
  })

  // Last.fm data hook
  const lastfmData = useLastFmData(lastfmUsername)
  const { artists, graphData, isLoading: dataLoading, error, progress } = lastfmData
  
  const [selectedArtist, setSelectedArtist] = useState(null)
  const [showGenreLabels, setShowGenreLabels] = useState(false)
  const [showArtistLabels, setShowArtistLabels] = useState(false)
  const [graphSettings, setGraphSettings] = useState(DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 })
  const [appMode, setAppMode] = useState('explore')
  const connectionsGame = useConnectionsGame(graphData)

  // Mobile detection for responsive styling
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle Last.fm login
  const handleLastFmLogin = async (username) => {
    const cleaned = username.trim()
    setLastfmUsername(cleaned)
    try {
      localStorage.setItem(LASTFM_USER_KEY, cleaned)
    } catch {
      // Ignore storage failures
    }
  }

  // Handle logout
  const handleLogout = () => {
    try {
      localStorage.removeItem(LASTFM_USER_KEY)
    } catch {
      // Ignore storage failures
    }
    setShowSettings(false)
    setLastfmUsername(null)
  }

  const handleModeChange = (newMode) => {
    setAppMode(newMode)
    setSelectedArtist(null)
    setShowSettings(false)
    if (newMode !== 'connections') {
      connectionsGame.exitGame()
    }
  }

  const handleConnectionsExit = () => {
    setAppMode('explore')
  }

  // Export artist data as JSON file
  const exportData = () => {
    const dataStr = JSON.stringify(artists, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'lastfm_artists.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Determine if we should show login
  const showLogin = !lastfmUsername

  // Determine app state classes
  const appClasses = [
    'app',
    error && artists.length === 0 && 'app--error'
  ].filter(Boolean).join(' ')

  // Render content based on current state
  const renderContent = () => {
    // Login screen
    if (showLogin) {
      return (
        <Login
          onLastFmLogin={handleLastFmLogin}
        />
      )
    }

    // Error state
    if (error && artists.length === 0) {
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

            {artists.length > 0 && (
              <ModeSelector
                currentMode={appMode}
                onModeChange={handleModeChange}
              />
            )}
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
          {dataLoading && artists.length === 0 ? (
            <Loader progress={progress} />
          ) : (
            <Graph
              data={graphData}
              onNodeClick={appMode === 'explore' ? setSelectedArtist : null}
              showGenreLabels={showGenreLabels}
              showArtistLabels={showArtistLabels}
              settings={graphSettings}
              onCameraChange={setCameraOffset}
              isMobile={isMobile}
              mode={appMode}
              connectionsState={appMode === 'connections' ? connectionsGame : null}
              onConnectionsNodeClick={appMode === 'connections' ? (node) => {
                if (connectionsGame.isHintSelecting) {
                  connectionsGame.revealHintNode?.(node.id)
                }
              } : null}
            />
          )}

          {appMode === 'connections' && graphData.nodes.length > 0 && (
            <ConnectionsMode
              graphData={graphData}
              connections={connectionsGame}
              onExit={handleConnectionsExit}
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
      
      <Routes>
        <Route path="/info" element={<Info />} />
        <Route path="*" element={
          <>
            {renderContent()}

            {showSettings && (
              <ToolsPanel
                settings={graphSettings}
                onSettingsChange={setGraphSettings}
                showGenreLabels={showGenreLabels}
                onToggleGenreLabels={() => setShowGenreLabels(!showGenreLabels)}
                showArtistLabels={showArtistLabels}
                onToggleArtistLabels={() => setShowArtistLabels(!showArtistLabels)}
                onClose={() => setShowSettings(false)}
              />
            )}

            {appMode === 'explore' && selectedArtist && (
              <ArtistDetails
                artist={selectedArtist}
                graphData={graphData}
                onClose={() => setSelectedArtist(null)}
              />
            )}
          </>
        } />
      </Routes>
      
      <Analytics />
    </div>
  )
}

export default App
