import { useRef, useEffect, useState } from 'react'
import './Starfield.css'

// Starfield configuration
const STAR_COUNT = 250
const TWINKLE_SPEED = 0.02
const PARALLAX_STRENGTH = 0.15 // How much stars move relative to camera

function Starfield({ cameraOffset = { x: 0, y: 0 } }) {
  const canvasRef = useRef()
  const starsRef = useRef([])
  const animationRef = useRef()
  const cameraRef = useRef(cameraOffset) // Use ref to avoid re-creating animation loop
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight })

  // Update camera ref when prop changes (without triggering effect re-run)
  useEffect(() => {
    cameraRef.current = cameraOffset
  }, [cameraOffset])

  // Generate stars with depth layers for parallax
  const generateStars = (width, height) => {
    const stars = []
    for (let i = 0; i < STAR_COUNT; i++) {
      const depth = Math.random()
      stars.push({
        // Wider area for parallax movement
        baseX: Math.random() * width * 1.5 - width * 0.25,
        baseY: Math.random() * height * 1.5 - height * 0.25,
        radius: 0.5 + depth * 1.2, // Nearer stars are bigger
        opacity: 0.3 + depth * 0.7, // Nearer stars are brighter
        depth: depth, // 0 = far (slow), 1 = near (fast)
        twinkleOffset: Math.random() * Math.PI * 2,
        twinkleSpeed: (Math.random() * 0.5 + 0.5) * TWINKLE_SPEED
      })
    }
    // Sort by depth so far stars render first (painters algorithm)
    return stars.sort((a, b) => a.depth - b.depth)
  }

  // Handle window resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Regenerate stars when dimensions change
  useEffect(() => {
    starsRef.current = generateStars(dimensions.width, dimensions.height)
  }, [dimensions])

  // Canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let time = 0

    const animate = () => {
      const { width, height } = dimensions
      const { x: camX, y: camY } = cameraRef.current
      const centerX = width / 2
      const centerY = height / 2

      // Clear with dark background
      ctx.fillStyle = '#050510'
      ctx.fillRect(0, 0, width, height)

      // Draw nebula gradients (also with subtle parallax)
      const nebulaParallax = 0.03
      const nebulaOffsetX = (camX - centerX) * nebulaParallax
      const nebulaOffsetY = (camY - centerY) * nebulaParallax

      const nebulaGradient1 = ctx.createRadialGradient(
        width * 0.2 + nebulaOffsetX, height * 0.2 + nebulaOffsetY, 0,
        width * 0.2 + nebulaOffsetX, height * 0.2 + nebulaOffsetY, width * 0.5
      )
      nebulaGradient1.addColorStop(0, 'rgba(99, 102, 241, 0.08)')
      nebulaGradient1.addColorStop(1, 'transparent')
      ctx.fillStyle = nebulaGradient1
      ctx.fillRect(0, 0, width, height)

      const nebulaGradient2 = ctx.createRadialGradient(
        width * 0.8 + nebulaOffsetX * 0.5, height * 0.8 + nebulaOffsetY * 0.5, 0,
        width * 0.8 + nebulaOffsetX * 0.5, height * 0.8 + nebulaOffsetY * 0.5, width * 0.5
      )
      nebulaGradient2.addColorStop(0, 'rgba(168, 85, 247, 0.06)')
      nebulaGradient2.addColorStop(1, 'transparent')
      ctx.fillStyle = nebulaGradient2
      ctx.fillRect(0, 0, width, height)

      const nebulaGradient3 = ctx.createRadialGradient(
        width * 0.5 + nebulaOffsetX * 0.2, height * 0.5 + nebulaOffsetY * 0.2, 0,
        width * 0.5 + nebulaOffsetX * 0.2, height * 0.5 + nebulaOffsetY * 0.2, width * 0.6
      )
      nebulaGradient3.addColorStop(0, 'rgba(14, 165, 233, 0.04)')
      nebulaGradient3.addColorStop(1, 'transparent')
      ctx.fillStyle = nebulaGradient3
      ctx.fillRect(0, 0, width, height)

      // Draw stars with twinkling and parallax
      starsRef.current.forEach(star => {
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.5 + 0.5
        const opacity = star.opacity * twinkle * 0.8 + 0.2

        // Apply parallax based on depth
        // Deeper stars (low depth) move less, nearer stars (high depth) move more
        const parallaxFactor = star.depth * PARALLAX_STRENGTH
        const starX = star.baseX + (camX - centerX) * parallaxFactor
        const starY = star.baseY + (camY - centerY) * parallaxFactor

        // Wrap stars around screen edges for seamless infinite effect
        const wrappedX = ((starX % width) + width) % width
        const wrappedY = ((starY % height) + height) % height

        ctx.beginPath()
        ctx.arc(wrappedX, wrappedY, star.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
        ctx.fill()

        // Add subtle glow to brighter/nearer stars
        if (star.radius > 1.2) {
          ctx.beginPath()
          ctx.arc(wrappedX, wrappedY, star.radius * 2, 0, Math.PI * 2)
          const gradient = ctx.createRadialGradient(
            wrappedX, wrappedY, 0,
            wrappedX, wrappedY, star.radius * 2
          )
          gradient.addColorStop(0, `rgba(200, 220, 255, ${opacity * 0.3})`)
          gradient.addColorStop(1, 'rgba(200, 220, 255, 0)')
          ctx.fillStyle = gradient
          ctx.fill()
        }
      })

      time++
      animationRef.current = requestAnimationFrame(animate)
    }

    // Start animation
    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [dimensions])

  return (
    <canvas
      ref={canvasRef}
      className="starfield-canvas"
      width={dimensions.width}
      height={dimensions.height}
    />
  )
}

export default Starfield
