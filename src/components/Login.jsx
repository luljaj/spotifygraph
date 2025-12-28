import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import './Login.css'

// Orbit configuration
const ORBIT_CONFIG = {
  radiusX: 210,    // Horizontal radius
  radiusY: 70,     // Vertical radius
  tilt: 18 * (Math.PI / 180),  // 18 degrees in radians
  baseSpeed: 0.0006,
  slowedSpeed: 0.0002,
}

function Login({ onLastFmLogin }) {
  const [lastfmUsername, setLastfmUsername] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState('')
  const [showInfo, setShowInfo] = useState(false)
  const [formRevealed, setFormRevealed] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  // Refs for orbit animation
  const titleWrapperRef = useRef(null)
  const particleRef = useRef(null)
  const orbitStateRef = useRef({
    angle: 0,
    currentSpeed: ORBIT_CONFIG.baseSpeed,
    targetSpeed: ORBIT_CONFIG.baseSpeed,
  })

  // Orbit animation loop
  useEffect(() => {
    const particle = particleRef.current
    const titleWrapper = titleWrapperRef.current
    if (!particle || !titleWrapper) return

    let lastTime = performance.now()
    let animationId

    const animate = (currentTime) => {
      const deltaTime = currentTime - lastTime
      lastTime = currentTime

      const state = orbitStateRef.current

      // Smoothly interpolate speed
      const speedEasing = 0.03
      state.currentSpeed += (state.targetSpeed - state.currentSpeed) * speedEasing

      // Update angle
      state.angle += state.currentSpeed * deltaTime
      if (state.angle > Math.PI * 2) {
        state.angle -= Math.PI * 2
      }

      // Calculate position on ellipse
      const x = ORBIT_CONFIG.radiusX * Math.cos(state.angle)
      const y = ORBIT_CONFIG.radiusY * Math.sin(state.angle)

      // Apply tilt rotation
      const cosT = Math.cos(ORBIT_CONFIG.tilt)
      const sinT = Math.sin(ORBIT_CONFIG.tilt)
      const rotatedX = x * cosT - y * sinT
      const rotatedY = x * sinT + y * cosT

      // Get center of title wrapper
      const rect = titleWrapper.getBoundingClientRect()
      const centerX = rect.width / 2
      const centerY = rect.height / 2

      // Position particle
      particle.style.left = (centerX + rotatedX) + 'px'
      particle.style.top = (centerY + rotatedY) + 'px'

      // 3D depth effect
      const isBehind = rotatedY < 0
      particle.style.zIndex = isBehind ? '1' : '10'

      // Scale and opacity for depth
      const depthFactor = (rotatedY + ORBIT_CONFIG.radiusY) / (ORBIT_CONFIG.radiusY * 2)
      const scale = 0.6 + (depthFactor * 0.4)
      const opacity = 0.4 + (depthFactor * 0.6)

      particle.style.transform = `translate(-50%, -50%) scale(${scale})`
      particle.style.opacity = opacity

      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [])

  // Update orbit speed on hover
  useEffect(() => {
    orbitStateRef.current.targetSpeed = isHovering
      ? ORBIT_CONFIG.slowedSpeed
      : ORBIT_CONFIG.baseSpeed
  }, [isHovering])

  const handleLastFmSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (!lastfmUsername.trim()) {
      setError('Please enter your Last.fm username')
      return
    }

    setIsValidating(true)
    setError('')

    try {
      await onLastFmLogin(lastfmUsername.trim())
    } catch (err) {
      setError(err.message || 'Failed to connect to Last.fm')
    } finally {
      setIsValidating(false)
    }
  }

  const handleRevealForm = useCallback((e) => {
    // Don't reveal if clicking on form elements or if already revealed
    if (formRevealed) return

    setFormRevealed(true)
  }, [formRevealed])

  const inputRef = useRef(null)

  // Focus input when form is revealed
  useEffect(() => {
    if (formRevealed && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current.focus()
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [formRevealed])

  return (
    <div className="login" onClick={handleRevealForm}>
      <div className="login__content">
        {/* Title wrapper with orbit */}
        <div
          className={`login__title-wrapper ${formRevealed ? 'login__title-wrapper--shifted' : ''}`}
          ref={titleWrapperRef}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <Link
            to="/info"
            className={`login__info-link ${showInfo ? 'login__info-link--visible' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            INFO
          </Link>
          <h1
            className="login__title"
            onClick={(e) => {
              e.stopPropagation()
              // Only toggle info after form is revealed
              if (formRevealed) {
                setShowInfo(!showInfo)
              }
            }}
          >
            CANERIS
          </h1>

          {/* Orbiting particle */}
          <div className="login__orbit-particle" ref={particleRef} />
        </div>

        {/* Etymology */}
        <div className={`login__etymology ${formRevealed ? 'login__etymology--shifted' : ''}`}>
          <span className="login__etymology-word">caneris</span>
          <span className="login__etymology-divider">—</span>
          <span className="login__etymology-meaning">from Latin "canere": to sing</span>
        </div>

        {/* Login form - hidden until clicked */}
        <form
          className={`login__form ${formRevealed ? 'login__form--visible' : ''}`}
          onSubmit={handleLastFmSubmit}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="login__input-group">
            <input
              ref={inputRef}
              type="text"
              className="login__input"
              placeholder="Last.fm username"
              value={lastfmUsername}
              onChange={(e) => setLastfmUsername(e.target.value)}
              disabled={isValidating}
            />
            <button
              type="submit"
              className="login__input-group__button"
              disabled={isValidating}
              aria-label="Explore"
            >
              {isValidating ? '...' : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 8H15M15 8L8 1M15 8L8 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
          {error && <p className="login__error">{error}</p>}
        </form>

        {/* Click hint */}
        <div className={`login__hint ${formRevealed ? 'login__hint--hidden' : ''}`}>
          Click anywhere to enter
        </div>
      </div>
    </div>
  )
}

export default Login
