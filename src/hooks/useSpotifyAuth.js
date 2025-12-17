import { useState, useEffect, useCallback } from 'react'
import { startAuthFlow, exchangeCodeForToken, validateToken } from '../utils/spotify'

const TOKEN_KEY = 'spotify_token'
const PROCESSING_KEY = 'spotify_auth_processing'

export function useSpotifyAuth() {
  const [token, setToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const handleAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const error = urlParams.get('error')
      
      // Handle OAuth error
      if (error) {
        console.error('OAuth error:', error)
        window.history.replaceState({}, document.title, window.location.pathname)
        if (!cancelled) setIsLoading(false)
        return
      }
      
      // Handle OAuth callback
      if (code) {
        // Prevent duplicate processing (React StrictMode runs effects twice)
        if (sessionStorage.getItem(PROCESSING_KEY)) {
          // Wait for the other render to finish (max 10s)
          const start = Date.now()
          while (sessionStorage.getItem(PROCESSING_KEY) && Date.now() - start < 10000) {
            await new Promise(r => setTimeout(r, 50))
          }
          if (cancelled) return
          
          const existingToken = localStorage.getItem(TOKEN_KEY)
          if (existingToken) setToken(existingToken)
          setIsLoading(false)
          return
        }
        
        sessionStorage.setItem(PROCESSING_KEY, 'true')
        
        try {
          const { accessToken } = await exchangeCodeForToken(code)
          localStorage.setItem(TOKEN_KEY, accessToken)
          window.history.replaceState({}, document.title, window.location.pathname)
          if (!cancelled) setToken(accessToken)
        } catch (err) {
          console.error('Token exchange failed:', err)
          window.history.replaceState({}, document.title, window.location.pathname)
        } finally {
          sessionStorage.removeItem(PROCESSING_KEY)
        }
        
        if (!cancelled) setIsLoading(false)
        return
      }
      
      // No code - check for existing token
      const storedToken = localStorage.getItem(TOKEN_KEY)
      if (storedToken) {
        const isValid = await validateToken(storedToken)
        if (cancelled) return
        
        if (isValid) {
          setToken(storedToken)
        } else {
          localStorage.removeItem(TOKEN_KEY)
        }
      }
      
      if (!cancelled) setIsLoading(false)
    }

    handleAuth()
    return () => { cancelled = true }
  }, [])

  const login = useCallback(() => startAuthFlow(), [])
  
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
  }, [])

  return { token, isLoading, login, logout, isAuthenticated: !!token }
}
