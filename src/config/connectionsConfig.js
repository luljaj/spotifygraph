export const CONNECTIONS_CONFIG = {
  challenge: {
    minHops: 3,
    maxHops: 6,
    preferPopular: true,
  },

  gameplay: {
    allowBacktrack: true,      // Can click path to go back
    showOptimalPath: true,     // Show optimal path on completion
    revealFailedGuesses: true, // Show artists that weren't connected
  },

  input: {
    autocompleteLimit: 8,      // Max autocomplete suggestions
    minQueryLength: 1,         // Min chars before autocomplete
    debounceMs: 150,           // Debounce time for autocomplete
  },

  competitive: {
    enabled: false,
    timeLimit: 180,
    hintCost: 50,
    scoring: {
      baseScore: 1000,
      hopPenalty: 100,
      timeBonus: 2,
      guessPenalty: 10,        // Points lost per wrong guess
    }
  },

  visuals: {
    hiddenOpacity: 0.08,       // Opacity for hidden nodes
    revealedOpacity: 0.4,      // Opacity for revealed (failed) nodes
    pathColor: '#1DB954',      // Spotify green for path
    currentNodeColor: '#1DB954', // Spotify green for current position
    targetNodeColor: '#EC4899',  // Pink/magenta for target
    failedGuessColor: '#EF4444', // Red for wrong guesses
  },

  animations: {
    nodeReveal: 300,
    pathDraw: 500,
    hopTransition: 400,
    shakeOnError: 300,
  }
}
