import { useEffect, useRef, useMemo } from 'react'
import './Loader.css'

// Multiple orbital configurations for the orrery effect
// Each particle has its own orbital path, speed, and visual properties
const ORBITS = [
  { radiusX: 160, radiusY: 45, tilt: 18, speed: 0.0007, size: 8, hue: 220 },
  { radiusX: 110, radiusY: 30, tilt: -12, speed: 0.0012, size: 5, hue: 200 },
  { radiusX: 200, radiusY: 55, tilt: 28, speed: 0.00045, size: 6, hue: 240 },
]

function Loader({ progress }) {
  const containerRef = useRef(null)
  const particlesRef = useRef([])
  const orbitStateRef = useRef(
    ORBITS.map((_, i) => ({
      angle: (Math.PI * 2 / ORBITS.length) * i // Evenly distribute starting positions
    }))
  )

  // Generate orbital path SVG data for visual hints
  const orbitalPaths = useMemo(() => {
    return ORBITS.map((orbit) => {
      const tiltRad = orbit.tilt * (Math.PI / 180)
      return {
        rx: orbit.radiusX,
        ry: orbit.radiusY,
        rotation: orbit.tilt,
        // Calculate transform for the tilted ellipse
        transform: `rotate(${orbit.tilt})`,
      }
    })
  }, [])

  useEffect(() => {
    const container = containerRef.current
    const particles = particlesRef.current
    if (!container || particles.some(p => !p)) return

    let lastTime = performance.now()
    let animationId

    const animate = (currentTime) => {
      const deltaTime = currentTime - lastTime
      lastTime = currentTime

      ORBITS.forEach((orbit, i) => {
        const state = orbitStateRef.current[i]
        const particle = particles[i]
        if (!particle) return

        // Update angle
        state.angle += orbit.speed * deltaTime
        if (state.angle > Math.PI * 2) {
          state.angle -= Math.PI * 2
        }

        // Calculate elliptical position
        const x = orbit.radiusX * Math.cos(state.angle)
        const y = orbit.radiusY * Math.sin(state.angle)

        // Apply tilt rotation
        const tiltRad = orbit.tilt * (Math.PI / 180)
        const cosT = Math.cos(tiltRad)
        const sinT = Math.sin(tiltRad)
        const rotatedX = x * cosT - y * sinT
        const rotatedY = x * sinT + y * cosT

        // Center of container (48% from top to align with orbital paths)
        const rect = container.getBoundingClientRect()
        const centerX = rect.width / 2
        const centerY = rect.height * 0.48

        // Position particle
        particle.style.left = (centerX + rotatedX) + 'px'
        particle.style.top = (centerY + rotatedY) + 'px'

        // Depth effects - particle appears to go behind/in front
        const isBehind = rotatedY < 0
        particle.style.zIndex = isBehind ? '1' : '10'

        // Scale and opacity based on "depth" in the orbit
        const depthFactor = (rotatedY + orbit.radiusY) / (orbit.radiusY * 2)
        const scale = 0.5 + (depthFactor * 0.5)
        const opacity = 0.3 + (depthFactor * 0.7)

        particle.style.transform = `translate(-50%, -50%) scale(${scale})`
        particle.style.opacity = opacity
      })

      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [])

  return (
    <div className="loader" ref={containerRef}>
      {/* Ambient central glow */}
      <div className="loader__glow" />

      {/* Persistent orbital path rings */}
      <svg className="loader__orbits" viewBox="-250 -150 500 300">
        {orbitalPaths.map((path, i) => (
          <ellipse
            key={i}
            cx="0"
            cy="0"
            rx={path.rx}
            ry={path.ry}
            transform={path.transform}
            className="loader__orbit-path"
          />
        ))}
      </svg>

      {/* Central content wrapper - keeps title and progress aligned */}
      <div className="loader__content">
        <h1 className="loader__title">CANERIS</h1>
        <p className="loader__progress">
          <span className="loader__progress-text">
            {progress || 'Mapping your musical universe...'}
          </span>
        </p>
      </div>

      {/* Orbiting particles */}
      {ORBITS.map((orbit, i) => (
        <div
          key={i}
          className="loader__particle"
          ref={el => particlesRef.current[i] = el}
          style={{
            width: orbit.size,
            height: orbit.size,
            '--particle-hue': orbit.hue,
          }}
        />
      ))}
    </div>
  )
}

export default Loader
