import { useState, useEffect } from 'react'
import { fetchLastFmDataComplete } from '../utils/lastfm'
import { artistsToGraphData } from '../utils/graphUtils'

const CACHE_VERSION = 1
const CACHE_TTL_MS = 1000 * 60 * 60 * 6
const CACHE_PREFIX = 'lastfm:cache:'
const EMPTY_GRAPH = { nodes: [], links: [], genreClusters: [] }

const normalizeGraphData = (data) => ({
  nodes: Array.isArray(data?.nodes) ? data.nodes : [],
  links: Array.isArray(data?.links) ? data.links : [],
  genreClusters: Array.isArray(data?.genreClusters) ? data.genreClusters : []
})

const readCache = (username) => {
  if (!username || typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${username}:v${CACHE_VERSION}`)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed?.artists)) return null

    const savedAt = typeof parsed.savedAt === 'number' ? parsed.savedAt : 0
    const isFresh = savedAt > 0 && (Date.now() - savedAt < CACHE_TTL_MS)

    return {
      artists: parsed.artists,
      graphData: normalizeGraphData(parsed.graphData),
      isFresh
    }
  } catch {
    return null
  }
}

const writeCache = (username, artists, graphData) => {
  if (!username || typeof window === 'undefined') return

  try {
    localStorage.setItem(
      `${CACHE_PREFIX}${username}:v${CACHE_VERSION}`,
      JSON.stringify({ savedAt: Date.now(), artists, graphData })
    )
  } catch {
    // Ignore storage failures (quota, privacy mode, etc.)
  }
}

export function useLastFmData(username) {
  const [artists, setArtists] = useState([])
  const [graphData, setGraphData] = useState(EMPTY_GRAPH)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState('')

  useEffect(() => {
    if (!username) {
      setArtists([])
      setGraphData(EMPTY_GRAPH)
      setIsLoading(false)
      setError(null)
      setProgress('')
      return
    }

    let cancelled = false
    const cached = readCache(username)

    if (cached) {
      setArtists(cached.artists)
      setGraphData(cached.graphData)
      setIsLoading(false)
      setError(null)
      setProgress('')
    } else {
      setArtists([])
      setGraphData(EMPTY_GRAPH)
    }

    const loadData = async (showLoader) => {
      setIsLoading(showLoader)
      setError(null)
      setProgress(showLoader ? 'Fetching your top artists...' : '')

      try {
        // Fetch complete data with artists, similarity, and images
        const { artists: fetchedArtists, similarityMap } = await fetchLastFmDataComplete(
          username,
          500,
          'overall',
          ({ stage, percent, message }) => {
            if (!cancelled) {
              if (showLoader) {
                setProgress(message)
              }
            }
          }
        )

        // Prevent state updates if component unmounted
        if (cancelled) return

        setArtists(fetchedArtists)

        // Convert to graph data with similarity-based connections
        if (showLoader) {
          setProgress('Building constellation...')
        }
        const data = artistsToGraphData(fetchedArtists, similarityMap)
        setGraphData(data)
        writeCache(username, fetchedArtists, data)
      } catch (err) {
        if (cancelled) return
        console.error('Failed to load Last.fm data:', err)
        setError(err.message || 'Failed to load your music data from Last.fm')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
          if (showLoader) {
            setProgress('')
          }
        }
      }
    }

    if (!cached?.isFresh) {
      loadData(!cached)
    }

    return () => {
      cancelled = true
    }
  }, [username])

  return {
    artists,
    graphData,
    isLoading,
    error,
    progress
  }
}


