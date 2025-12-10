import { useState, useEffect } from 'react'
import { artistsToGraphData } from './utils/graphUtils'
import SpotifyGraph from './components/SpotifyGraph'
import SettingsPanel from './components/SettingsPanel'
import ArtistDetails from './components/ArtistDetails'
import './App.css'

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [], genreClusters: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedArtist, setSelectedArtist] = useState(null)
  const [showGenreLabels, setShowGenreLabels] = useState(true)

  // Load test data on mount
  useEffect(() => {
    const loadTestData = async () => {
      try {
        const response = await fetch('/test_data.json')
        if (!response.ok) throw new Error('Failed to load test data')
        const artists = await response.json()
        const data = artistsToGraphData(artists)
        setGraphData(data)
      } catch (err) {
        console.error('Failed to load test data:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    loadTestData()
  }, [])

  if (error) {
    return (
      <div className="app app--error">
        <div className="error-card">
          <h2>Something went wrong</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header__brand">
          <svg className="header__logo" viewBox="0 0 100 100" width="32" height="32">
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1DB954"/>
                <stop offset="100%" stopColor="#1ed760"/>
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
          <h1 className="header__title">Spotify Graph</h1>
        </div>
        <span className="header__badge">Test Mode</span>
      </header>

      <main className="main">
        {isLoading ? (
          <div className="loader">
            <div className="loader__ring"></div>
            <span>Loading graph data...</span>
          </div>
        ) : (
          <SpotifyGraph
            data={graphData}
            onNodeClick={setSelectedArtist}
            showGenreLabels={showGenreLabels}
          />
        )}
      </main>

      <SettingsPanel
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
