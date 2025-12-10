/**
 * Convert Spotify artists data to graph format for react-force-graph
 */
export function artistsToGraphData(artists) {
  if (!artists || artists.length === 0) {
    return { nodes: [], links: [] }
  }

  // Create nodes from artists
  const nodes = artists.map((artist, index) => ({
    id: artist.id,
    name: artist.name,
    genres: artist.genres || [],
    popularity: artist.popularity,
    followers: artist.followers?.total || 0,
    image: artist.images?.[0]?.url || null,
    spotifyUrl: artist.external_urls?.spotify,
    lastfmUrl: artist.lastfmUrl || artist.external_urls?.lastfm,
    playcount: artist.playcount,
    source: artist.source || 'spotify',
    // Size based on popularity (index used as proxy for listening frequency)
    // Lower index = more listened to (both services return sorted by listen count)
    val: calculateNodeSize(index, artists.length),
    // Color will be assigned based on primary genre
    color: null
  }))

  // Create edges based on shared genres
  const links = []
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const sharedGenres = getSharedGenres(nodes[i].genres, nodes[j].genres)
      
      if (sharedGenres.length > 0) {
        links.push({
          source: nodes[i].id,
          target: nodes[j].id,
          sharedGenres,
          value: sharedGenres.length // Edge weight = number of shared genres
        })
      }
    }
  }

  // Calculate genre clusters and assign colors
  const genreClusters = calculateGenreClusters(nodes)
  assignNodeColors(nodes, genreClusters)

  return { nodes, links, genreClusters }
}

/**
 * Calculate node size based on listening rank
 * Higher rank (more listened) = larger node
 */
function calculateNodeSize(index, total) {
  // Exponential decay: top artists are much larger
  const normalizedRank = 1 - (index / total)
  const minSize = 3
  const maxSize = 25
  return minSize + (maxSize - minSize) * Math.pow(normalizedRank, 1.5)
}

/**
 * Find shared genres between two artists
 */
function getSharedGenres(genres1 = [], genres2 = []) {
  return genres1.filter(g => genres2.includes(g))
}

/**
 * Calculate genre clusters for labeling
 */
function calculateGenreClusters(nodes) {
  // Count genre frequencies
  const genreCounts = {}
  
  nodes.forEach(node => {
    node.genres.forEach(genre => {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1
    })
  })

  // Get top genres (appear in at least 3 artists)
  const significantGenres = Object.entries(genreCounts)
    .filter(([_, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8) // Limit to 8 clusters
    .map(([genre]) => genre)

  // Create cluster objects
  const clusters = significantGenres.map((genre, index) => {
    const clusterNodes = nodes.filter(n => n.genres.includes(genre))
    return {
      id: genre,
      name: formatGenreName(genre),
      nodeCount: clusterNodes.length,
      colorIndex: index
    }
  })

  return clusters
}

/**
 * Assign colors to nodes based on their primary genre cluster
 */
function assignNodeColors(nodes, clusters) {
  const clusterColors = [
    '#ff6b6b', // coral red
    '#4ecdc4', // teal
    '#ffe66d', // yellow
    '#95e1d3', // mint
    '#f38181', // salmon
    '#aa96da', // lavender
    '#fcbad3', // pink
    '#a8d8ea'  // sky blue
  ]

  const genreToColor = {}
  clusters.forEach((cluster, index) => {
    genreToColor[cluster.id] = clusterColors[index % clusterColors.length]
  })

  nodes.forEach(node => {
    // Find the first genre that matches a cluster
    const matchedGenre = node.genres.find(g => genreToColor[g])
    node.color = matchedGenre ? genreToColor[matchedGenre] : '#1DB954' // Default to Spotify green
    node.primaryGenre = matchedGenre || node.genres[0] || 'unknown'
  })
}

/**
 * Format genre name for display
 */
function formatGenreName(genre) {
  return genre
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Calculate cluster positions for labels
 * Returns approximate center of each genre cluster
 */
export function calculateClusterCenters(nodes, clusters) {
  return clusters.map(cluster => {
    const clusterNodes = nodes.filter(n => n.genres.includes(cluster.id))
    
    if (clusterNodes.length === 0) {
      return { ...cluster, x: 0, y: 0 }
    }

    // Calculate centroid (will be updated after graph simulation)
    const avgX = clusterNodes.reduce((sum, n) => sum + (n.x || 0), 0) / clusterNodes.length
    const avgY = clusterNodes.reduce((sum, n) => sum + (n.y || 0), 0) / clusterNodes.length

    return {
      ...cluster,
      x: avgX,
      y: avgY
    }
  })
}

