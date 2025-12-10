// Last.fm API configuration
const API_KEY = import.meta.env.VITE_LASTFM_API_KEY
const LASTFM_API_BASE = 'https://ws.audioscrobbler.com/2.0'

// Debug: Log API key status on load
console.log('[Last.fm] API Key configured:', API_KEY ? `Yes (${API_KEY.substring(0, 4)}...)` : 'NO - Missing VITE_LASTFM_API_KEY')

/**
 * Fetch user's top artists from Last.fm
 * @param {string} username - Last.fm username
 * @param {number} limit - Number of artists to fetch (max 1000)
 * @param {string} period - Time period: overall, 7day, 1month, 3month, 6month, 12month
 */
export async function fetchTopArtists(username, limit = 130, period = 'overall') {
  const params = new URLSearchParams({
    method: 'user.gettopartists',
    user: username,
    api_key: API_KEY,
    format: 'json',
    limit: 500,
    period
  })

  const url = `${LASTFM_API_BASE}?${params}`
  console.log('[Last.fm] Fetching top artists for:', username)
  console.log('[Last.fm] Request URL:', url)

  try {
    const response = await fetch(url)
    
    console.log('[Last.fm] Response status:', response.status, response.statusText)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Last.fm] Error response body:', errorText)
      throw new Error(`Failed to fetch Last.fm top artists: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('[Last.fm] Response data:', data)
    
    if (data.error) {
      console.error('[Last.fm] API error:', data.error, data.message)
      throw new Error(data.message || `Last.fm API error: ${data.error}`)
    }
    
    const artists = data.topartists?.artist || []
    console.log('[Last.fm] Found', artists.length, 'artists')
    
    return artists
  } catch (err) {
    console.error('[Last.fm] Fetch error:', err)
    throw err
  }
}

/**
 * Fetch artist info including tags (genres)
 * @param {string} artistName - Artist name
 */
export async function fetchArtistInfo(artistName) {
  const params = new URLSearchParams({
    method: 'artist.getinfo',
    artist: artistName,
    api_key: API_KEY,
    format: 'json'
  })

  const response = await fetch(`${LASTFM_API_BASE}?${params}`)
  
  if (!response.ok) {
    console.warn('[Last.fm] Failed to fetch artist info for:', artistName)
    return null
  }
  
  const data = await response.json()
  return data.artist || null
}

/**
 * Fetch similar artists for a given artist
 * @param {string} artistName - Artist name
 * @param {number} limit - Number of similar artists
 */
export async function fetchSimilarArtists(artistName, limit = 20) {
  const params = new URLSearchParams({
    method: 'artist.getsimilar',
    artist: artistName,
    api_key: API_KEY,
    format: 'json',
    limit: limit.toString()
  })

  const response = await fetch(`${LASTFM_API_BASE}?${params}`)

  console.log(response)
  
  if (!response.ok) {
    return []
  }
  
  const data = await response.json()
  return data.similarartists?.artist || []
}

/**
 * Fetch top artists with their tags (genres) - batched
 * @param {string} username - Last.fm username
 * @param {number} limit - Number of artists
 * @param {string} period - Time period
 */
export async function fetchTopArtistsWithTags(username, limit = 130, period = 'overall') {
  console.log('[Last.fm] fetchTopArtistsWithTags called:', { username, limit, period })
  
  // First get top artists
  const topArtists = await fetchTopArtists(username, limit, period)
  
  console.log('[Last.fm] Got top artists, now fetching tags...')
  
  // Then fetch tags for each artist (in parallel, batched)
  const batchSize = 10
  const artistsWithTags = []
  
  for (let i = 0; i < topArtists.length; i += batchSize) {
    const batch = topArtists.slice(i, i + batchSize)
    console.log(`[Last.fm] Processing batch ${i / batchSize + 1}/${Math.ceil(topArtists.length / batchSize)}`)
    
    const batchResults = await Promise.all(
      batch.map(async (artist) => {
        try {
          const info = await fetchArtistInfo(artist.name)
          const tags = info?.tags?.tag?.map(t => t.name.toLowerCase()) || []
          return {
            ...artist,
            tags
          }
        } catch {
          return { ...artist, tags: [] }
        }
      })
    )
    artistsWithTags.push(...batchResults)
  }
  
  console.log('[Last.fm] Finished fetching all tags')
  return artistsWithTags
}

/**
 * Normalize Last.fm artist data to match Spotify format
 * @param {Array} lastfmArtists - Array of Last.fm artist objects
 */
export function normalizeLastFmArtists(lastfmArtists) {
  return lastfmArtists.map((artist, index) => {
    // Get the largest image
    const images = artist.image || []
    const largeImage = images.find(img => img.size === 'extralarge') || 
                       images.find(img => img.size === 'large') ||
                       images[0]
    const imageUrl = largeImage?.['#text'] || null
    
    return {
      id: artist.mbid || `lastfm-${artist.name.replace(/\s+/g, '-').toLowerCase()}`,
      name: artist.name,
      genres: artist.tags || [],
      popularity: Math.max(0, 100 - index), // Approximate popularity from rank
      followers: { total: parseInt(artist.playcount) || 0 },
      images: images.map(img => ({
        url: img['#text'],
        height: img.size === 'extralarge' ? 300 : img.size === 'large' ? 174 : 64,
        width: img.size === 'extralarge' ? 300 : img.size === 'large' ? 174 : 64
      })).filter(img => img.url),
      // Store URL in same format as Spotify for graph node
      external_urls: {
        lastfm: artist.url
      },
      lastfmUrl: artist.url,
      playcount: parseInt(artist.playcount) || 0,
      source: 'lastfm'
    }
  })
}

/**
 * Validate Last.fm username exists
 * @param {string} username - Last.fm username
 */
export async function validateUsername(username) {
  try {
    const params = new URLSearchParams({
      method: 'user.getinfo',
      user: username,
      api_key: API_KEY,
      format: 'json'
    })

    const response = await fetch(`${LASTFM_API_BASE}?${params}`)
    const data = await response.json()
    
    return !data.error
  } catch {
    return false
  }
}
