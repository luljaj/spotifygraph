import { useState, useCallback, useMemo } from 'react'
import {
  buildAdjacencyList,
  generateChallenge,
  isValidMove,
  fuzzySearchArtists,
  normalizeArtistName
} from '../utils/pathfinding'
import { CONNECTIONS_CONFIG } from '../config/connectionsConfig'

/**
 * Custom hook for Connections game with text-input gameplay
 */
export function useConnectionsGame(graphData) {
  // Build adjacency list when graph data changes
  const adjacency = useMemo(() => {
    if (!graphData?.links) return new Map()
    return buildAdjacencyList(graphData.links)
  }, [graphData?.links])

  // Game state
  const [gameState, setGameState] = useState({
    phase: 'idle', // 'idle' | 'setup' | 'playing' | 'complete'
    mode: 'relaxed', // 'relaxed' | 'competitive'

    // Challenge
    startArtist: null,
    targetArtist: null,
    optimalPath: null,
    optimalHops: 0,

    // Progress
    currentArtist: null,
    path: [],           // Array of artist IDs in the successful path
    pathArtists: [],    // Array of artist objects in the path
    hops: 0,

    // Guessing
    revealedArtists: new Set(), // All revealed artist IDs (path + failed)
    failedGuesses: [],          // Array of { artist, fromArtist } for wrong guesses
    guessCount: 0,
    hintCount: 0,               // Number of hints used
    hintSelectionActive: false,

    // Timing
    startTime: null,
    endTime: null,

    // Feedback
    lastGuessResult: null, // { success: bool, artist, message }
  })

  // Node map for quick lookups
  const nodeMap = useMemo(() => {
    if (!graphData?.nodes) return new Map()
    return new Map(graphData.nodes.map(n => [n.id, n]))
  }, [graphData?.nodes])

  // Search artists for autocomplete
  const searchArtists = useCallback((query) => {
    if (!graphData?.nodes) return []
    return fuzzySearchArtists(
      query,
      graphData.nodes,
      CONNECTIONS_CONFIG.input.autocompleteLimit
    )
  }, [graphData?.nodes])

  // Get node highlight state for rendering
  const getNodeState = useCallback((nodeId) => {
    if (gameState.phase !== 'playing' && gameState.phase !== 'complete') {
      return 'normal'
    }

    // Target artist
    if (nodeId === gameState.targetArtist?.id) {
      return 'target'
    }

    // Current position
    if (nodeId === gameState.currentArtist?.id) {
      return 'current'
    }

    // Start artist
    if (nodeId === gameState.startArtist?.id) {
      return 'start'
    }

    // In the successful path
    if (gameState.path.includes(nodeId)) {
      return 'path'
    }

    // Failed guess (revealed but not connected)
    if (gameState.failedGuesses.some(fg => fg.artist.id === nodeId)) {
      return 'failed'
    }

    if (gameState.revealedArtists.has(nodeId)) {
      return 'revealed'
    }

    // Hidden
    return 'hidden'
  }, [gameState])

  // Start a new game
  const startGame = useCallback((mode = 'relaxed') => {
    if (!graphData?.nodes || graphData.nodes.length < 2) {
      console.error('[Connections] Not enough nodes to start game')
      return false
    }

    const challenge = generateChallenge(
      graphData.nodes,
      adjacency,
      CONNECTIONS_CONFIG.challenge
    )

    if (!challenge) {
      console.error('[Connections] Could not generate challenge')
      return false
    }

    console.log('[Connections] Challenge generated:', {
      start: challenge.startArtist.name,
      target: challenge.targetArtist.name,
      optimalHops: challenge.optimalHops
    })

    setGameState({
      phase: 'setup',
      mode,
      startArtist: challenge.startArtist,
      targetArtist: challenge.targetArtist,
      optimalPath: challenge.optimalPath,
      optimalHops: challenge.optimalHops,
      currentArtist: null,
      path: [],
      pathArtists: [],
      hops: 0,
      revealedArtists: new Set(),
      failedGuesses: [],
      guessCount: 0,
      hintCount: 0,
      hintSelectionActive: false,
      startTime: null,
      endTime: null,
      lastGuessResult: null,
    })

    return true
  }, [graphData?.nodes, adjacency])

  // Begin playing (after setup screen)
  const beginPlaying = useCallback(() => {
    setGameState(prev => {
      const revealed = new Set([prev.startArtist.id, prev.targetArtist.id])
      return {
        ...prev,
        phase: 'playing',
        currentArtist: prev.startArtist,
        path: [prev.startArtist.id],
        pathArtists: [prev.startArtist],
        hops: 0,
        revealedArtists: revealed,
        startTime: Date.now(),
      }
    })
  }, [])

  // Submit a guess (from text input)
  const submitGuess = useCallback((artistNameOrId) => {
    if (gameState.phase !== 'playing') return null

    if (artistNameOrId == null) return null

    const rawGuess = typeof artistNameOrId === 'string'
      ? artistNameOrId.trim()
      : artistNameOrId

    if (!rawGuess) return null

    // Find the artist
    let artist = nodeMap.get(rawGuess)
    if (!artist) {
      // Try to find by name (case insensitive)
      const normalizedGuess = normalizeArtistName(rawGuess)
      artist = graphData?.nodes?.find(
        n => normalizeArtistName(n.name) === normalizedGuess
      )
    }

    // Artist not found in graph
    if (!artist) {
      const result = {
        success: false,
        type: 'not_found',
        message: 'Artist not in your listening history'
      }
      setGameState(prev => ({
        ...prev,
        lastGuessResult: result,
        guessCount: prev.guessCount + 1,
      }))
      return result
    }

    // Already in path (can't go to same artist)
    if (gameState.path.includes(artist.id)) {
      const result = {
        success: false,
        type: 'already_in_path',
        artist,
        message: `${artist.name} is already in your path`
      }
      setGameState(prev => ({
        ...prev,
        lastGuessResult: result,
      }))
      return result
    }

    // Check if connected to current artist
    const isConnected = isValidMove(adjacency, gameState.currentArtist.id, artist.id)

    if (isConnected) {
      // SUCCESS! Valid move
      const newPath = [...gameState.path, artist.id]
      const newPathArtists = [...gameState.pathArtists, artist]
      const newHops = gameState.hops + 1
      const isComplete = artist.id === gameState.targetArtist.id

      const result = {
        success: true,
        type: isComplete ? 'complete' : 'connected',
        artist,
        message: isComplete ? 'Connection found!' : `Connected to ${artist.name}!`
      }

      if (isComplete) {
        const endTime = Date.now()
        setGameState(prev => ({
          ...prev,
          phase: 'complete',
          currentArtist: artist,
          path: newPath,
          pathArtists: newPathArtists,
          hops: newHops,
          revealedArtists: new Set([...prev.revealedArtists, artist.id]),
          guessCount: prev.guessCount + 1,
          endTime,
          lastGuessResult: result,
        }))
      } else {
        setGameState(prev => ({
          ...prev,
          currentArtist: artist,
          path: newPath,
          pathArtists: newPathArtists,
          hops: newHops,
          revealedArtists: new Set([...prev.revealedArtists, artist.id]),
          guessCount: prev.guessCount + 1,
          lastGuessResult: result,
        }))
      }

      return result
    } else {
      // FAILED - not connected
      const result = {
        success: false,
        type: 'not_connected',
        artist,
        message: `${artist.name} isn't connected to ${gameState.currentArtist.name}`
      }

      setGameState(prev => ({
        ...prev,
        revealedArtists: new Set([...prev.revealedArtists, artist.id]),
        failedGuesses: [...prev.failedGuesses, {
          artist,
          fromArtist: prev.currentArtist
        }],
        guessCount: prev.guessCount + 1,
        lastGuessResult: result,
      }))

      return result
    }
  }, [gameState, adjacency, nodeMap, graphData?.nodes])

  // Go back to a specific point in the path (click on path item)
  const goBackTo = useCallback((artistId) => {
    if (gameState.phase !== 'playing') return false
    if (!CONNECTIONS_CONFIG.gameplay.allowBacktrack) return false

    const index = gameState.path.indexOf(artistId)
    if (index === -1 || index === gameState.path.length - 1) return false

    // Can't go back past the start
    if (index < 0) return false

    const newPath = gameState.path.slice(0, index + 1)
    const newPathArtists = gameState.pathArtists.slice(0, index + 1)
    const newCurrentArtist = nodeMap.get(artistId)

    setGameState(prev => ({
      ...prev,
      currentArtist: newCurrentArtist,
      path: newPath,
      pathArtists: newPathArtists,
      hops: newPath.length - 1,
      lastGuessResult: null,
    }))

    return true
  }, [gameState, nodeMap])

  // Exit game
  const exitGame = useCallback(() => {
    setGameState({
      phase: 'idle',
      mode: 'relaxed',
      startArtist: null,
      targetArtist: null,
      optimalPath: null,
      optimalHops: 0,
      currentArtist: null,
      path: [],
      pathArtists: [],
      hops: 0,
      revealedArtists: new Set(),
      failedGuesses: [],
      guessCount: 0,
      hintCount: 0,
      hintSelectionActive: false,
      startTime: null,
      endTime: null,
      lastGuessResult: null,
    })
  }, [])

  // Start new challenge (keep mode)
  const newChallenge = useCallback(() => {
    startGame(gameState.mode)
  }, [startGame, gameState.mode])

  // Clear last guess feedback
  const clearFeedback = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      lastGuessResult: null,
    }))
  }, [])

  const beginHintSelection = useCallback(() => {
    if (gameState.phase !== 'playing') return false
    if (!graphData?.nodes?.length) return false

    const hasHidden = graphData.nodes.some(node => getNodeState(node.id) === 'hidden')
    if (!hasHidden) {
      const result = {
        success: false,
        type: 'no_hidden',
        message: 'All nodes are already visible'
      }
      setGameState(prev => ({
        ...prev,
        lastGuessResult: result,
      }))
      return false
    }

    setGameState(prev => ({
      ...prev,
      hintSelectionActive: true,
    }))

    return true
  }, [gameState.phase, graphData?.nodes, getNodeState])

  const cancelHintSelection = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      hintSelectionActive: false,
    }))
  }, [])

  const revealHintNode = useCallback((nodeId) => {
    if (gameState.phase !== 'playing' || !gameState.hintSelectionActive) return null

    const revealedArtist = nodeMap.get(nodeId)
    if (!revealedArtist) return null

    const state = getNodeState(nodeId)
    if (state !== 'hidden') {
      const result = {
        success: false,
        type: 'hint_invalid',
        message: 'Select a hidden node to reveal'
      }
      setGameState(prev => ({
        ...prev,
        lastGuessResult: result,
      }))
      return result
    }

    setGameState(prev => {
      const newRevealed = new Set(prev.revealedArtists)
      newRevealed.add(nodeId)
      return {
        ...prev,
        revealedArtists: newRevealed,
        hintCount: prev.hintCount + 1,
        hintSelectionActive: false,
        lastGuessResult: {
          success: true,
          type: 'hint',
          artist: revealedArtist,
          message: `Revealed: ${revealedArtist.name}`
        }
      }
    })

    return {
      success: true,
      type: 'hint',
      artist: revealedArtist,
      message: `Revealed: ${revealedArtist.name}`
    }
  }, [gameState.phase, gameState.hintSelectionActive, nodeMap, getNodeState])

  return {
    // State
    gameState,
    adjacency,

    // Phase checks
    isIdle: gameState.phase === 'idle',
    isSetup: gameState.phase === 'setup',
    isPlaying: gameState.phase === 'playing',
    isComplete: gameState.phase === 'complete',

    // Computed
    canBacktrack: gameState.phase === 'playing'
      && CONNECTIONS_CONFIG.gameplay.allowBacktrack
      && gameState.path.length > 1,
    isHintSelecting: gameState.hintSelectionActive,

    // Actions
    startGame,
    beginPlaying,
    submitGuess,
    goBackTo,
    exitGame,
    newChallenge,
    clearFeedback,
    beginHintSelection,
    cancelHintSelection,
    revealHintNode,

    // Utilities
    searchArtists,
    getNodeState,
  }
}
