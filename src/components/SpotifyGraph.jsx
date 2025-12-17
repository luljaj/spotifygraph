import { useRef, useCallback, useEffect, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { forceCenter, forceX, forceY } from 'd3-force'
import { calculateClusterCenters, calculateSpatialGenreLabels } from '../utils/graphUtils'
import './SpotifyGraph.css'

// Starfield configuration
const STAR_COUNT = 250
const TWINKLE_SPEED = 0.02
const PARALLAX_STRENGTH = 0.15 // How much stars move relative to camera

// Link glow animation configuration
const GLOW_FADE_IN_SPEED = 0.08
const GLOW_FADE_OUT_SPEED = 0.12

function SpotifyGraph({ data, onNodeClick, showGenreLabels, settings }) {
  const graphRef = useRef()
  const containerRef = useRef()
  const starfieldRef = useRef()
  const starsRef = useRef([])
  const animationRef = useRef()
  const imageCache = useRef({})
  const linkGlowStates = useRef({}) // Track glow intensity for each link
  const cameraOffset = useRef({ x: 0, y: 0, k: 1 }) // Track camera position
  
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [hoveredNode, setHoveredNode] = useState(null)
  const [hoveredLink, setHoveredLink] = useState(null)
  const [clusterCenters, setClusterCenters] = useState([])
  const [spatialLabels, setSpatialLabels] = useState([])
  const [graphBounds, setGraphBounds] = useState(null) // Track graph extent for dynamic zoom limits

  // Default settings
  const {
    nodeScale = 1,
    chargeStrength = -100,
    linkDistance = 50,
  } = settings || {}

  // Generate stars with depth layers for parallax
  const generateStars = useCallback((width, height) => {
    const stars = []
    for (let i = 0; i < STAR_COUNT; i++) {
      // Depth layer: 0 = far (slow parallax), 1 = near (fast parallax)
      const depth = Math.random()
      stars.push({
        baseX: Math.random() * width * 1.5 - width * 0.25, // Wider area for parallax
        baseY: Math.random() * height * 1.5 - height * 0.25,
        radius: 0.5 + depth * 1.2, // Nearer stars are bigger
        opacity: 0.3 + depth * 0.7, // Nearer stars are brighter
        depth: depth,
        twinkleOffset: Math.random() * Math.PI * 2,
        twinkleSpeed: (Math.random() * 0.5 + 0.5) * TWINKLE_SPEED
      })
    }
    // Sort by depth so far stars render first
    return stars.sort((a, b) => a.depth - b.depth)
  }, [])

  // Initialize starfield with parallax
  useEffect(() => {
    if (!starfieldRef.current) return
    
    const canvas = starfieldRef.current
    const ctx = canvas.getContext('2d')
    
    starsRef.current = generateStars(dimensions.width, dimensions.height)
    
    let time = 0
    const animate = () => {
      ctx.fillStyle = '#050510'
      ctx.fillRect(0, 0, dimensions.width, dimensions.height)
      
      const { x: camX, y: camY } = cameraOffset.current
      const centerX = dimensions.width / 2
      const centerY = dimensions.height / 2
      
      // Draw stars with twinkling and parallax
      starsRef.current.forEach(star => {
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.5 + 0.5
        const opacity = star.opacity * twinkle * 0.8 + 0.2
        
        // Apply parallax based on depth - stars move WITH camera (same direction)
        // Deeper stars (low depth) move less, nearer stars move more
        const parallaxFactor = star.depth * PARALLAX_STRENGTH
        const starX = star.baseX + (camX - centerX) * parallaxFactor
        const starY = star.baseY + (camY - centerY) * parallaxFactor
        
        // Wrap stars around screen edges for seamless effect
        const wrappedX = ((starX % dimensions.width) + dimensions.width) % dimensions.width
        const wrappedY = ((starY % dimensions.height) + dimensions.height) % dimensions.height
        
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
    
    animate()
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [dimensions, generateStars])

  // Handle window resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const newDimensions = {
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        }
        setDimensions(newDimensions)
        starsRef.current = generateStars(newDimensions.width, newDimensions.height)
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [generateStars])

  // Preload images for nodes with proper cleanup and cache eviction
  useEffect(() => {
    const loadingImages = []
    const currentNodeIds = new Set(data.nodes.map(n => n.id))
    
    // Evict cached images for nodes no longer in the graph
    Object.keys(imageCache.current).forEach(id => {
      if (!currentNodeIds.has(id)) {
        delete imageCache.current[id]
      }
    })
    
    data.nodes.forEach(node => {
      if (node.image && !imageCache.current[node.id]) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = node.image
        loadingImages.push(img)
        img.onload = () => {
          imageCache.current[node.id] = img
        }
      }
    })

    return () => {
      // Cancel pending image loads to prevent memory leaks
      loadingImages.forEach(img => {
        img.onload = null
        img.src = ''
      })
    }
  }, [data.nodes])

  // Clear linkGlowStates when links change to prevent memory buildup
  useEffect(() => {
    linkGlowStates.current = {}
  }, [data.links])

  // Update cluster centers, spatial labels, and graph bounds after simulation
  useEffect(() => {
    if (graphRef.current && data.genreClusters?.length > 0) {
      const timer = setTimeout(() => {
        const centers = calculateClusterCenters(data.nodes, data.genreClusters)
        setClusterCenters(centers)
        
        // Calculate spatial genre labels for floating overlay
        const labels = calculateSpatialGenreLabels(data.nodes)
        setSpatialLabels(labels)
        
        // Calculate graph bounds for dynamic zoom limits
        const xs = data.nodes.filter(n => Number.isFinite(n.x)).map(n => n.x)
        const ys = data.nodes.filter(n => Number.isFinite(n.y)).map(n => n.y)
        
        if (xs.length > 0 && ys.length > 0) {
          const padding = 100 // Extra padding around graph
          setGraphBounds({
            minX: Math.min(...xs) - padding,
            maxX: Math.max(...xs) + padding,
            minY: Math.min(...ys) - padding,
            maxY: Math.max(...ys) + padding,
            width: Math.max(...xs) - Math.min(...xs) + padding * 2,
            height: Math.max(...ys) - Math.min(...ys) + padding * 2
          })
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [data])

  // Update force simulation when settings change
  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.d3Force('charge')?.strength(chargeStrength)
      graphRef.current.d3Force('link')?.distance(linkDistance)
      
      // Add center force to keep disconnected subgraphs closer together
      graphRef.current.d3Force('center', forceCenter(0, 0))
      graphRef.current.d3Force('x', forceX(0).strength(0.05))
      graphRef.current.d3Force('y', forceY(0).strength(0.05))
      
      graphRef.current.d3ReheatSimulation()
    }
  }, [chargeStrength, linkDistance])

  // Custom node rendering - cosmic planet style with artist images
  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    // Guard: skip rendering if position is not yet calculated
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return
    
    const baseSize = (node.val || 5) * nodeScale
    const size = Math.max(6, baseSize)
    const isHovered = hoveredNode?.id === node.id
    
    // Get node color with cosmic tint
    const nodeColor = node.color || '#6366f1'
    
    // Draw outer glow (always present but subtle, stronger on hover)
    const glowRadius = size * (isHovered ? 3 : 1.8)
    const glowOpacity = isHovered ? 0.6 : 0.15
    
    const gradient = ctx.createRadialGradient(
      node.x, node.y, size * 0.5,
      node.x, node.y, glowRadius
    )
    gradient.addColorStop(0, `${nodeColor}${Math.round(glowOpacity * 255).toString(16).padStart(2, '0')}`)
    gradient.addColorStop(0.5, `${nodeColor}${Math.round(glowOpacity * 0.5 * 255).toString(16).padStart(2, '0')}`)
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    
    ctx.beginPath()
    ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()
    
    // Draw the planet body
    ctx.save()
    ctx.beginPath()
    ctx.arc(node.x, node.y, size, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
    
    // Try to draw the artist image
    const cachedImage = imageCache.current[node.id]
    if (cachedImage) {
      try {
        ctx.drawImage(
          cachedImage,
          node.x - size,
          node.y - size,
          size * 2,
          size * 2
        )
        // Add a subtle color overlay to blend with theme
        ctx.fillStyle = `${nodeColor}22`
        ctx.fill()
      } catch {
        // Fallback to solid color
        ctx.fillStyle = nodeColor
        ctx.fill()
      }
    } else {
      // No image available - draw gradient planet
      const planetGradient = ctx.createRadialGradient(
        node.x - size * 0.3, node.y - size * 0.3, 0,
        node.x, node.y, size
      )
      planetGradient.addColorStop(0, lightenColor(nodeColor, 40))
      planetGradient.addColorStop(0.7, nodeColor)
      planetGradient.addColorStop(1, darkenColor(nodeColor, 30))
      ctx.fillStyle = planetGradient
      ctx.fill()
    }
    
    ctx.restore()
    
    // Add subtle ring/border
    ctx.beginPath()
    ctx.arc(node.x, node.y, size, 0, Math.PI * 2)
    ctx.strokeStyle = isHovered ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.15)'
    ctx.lineWidth = isHovered ? 2 : 0.5
    ctx.stroke()
    
    // Draw hover halo rings
    if (isHovered) {
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, size + (i * 4), 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 - i * 0.1})`
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }
    
    // Draw name label on hover
    if (isHovered) {
      const label = node.name
      const fontSize = Math.max(11, Math.min(16, size * 0.8))
      ctx.font = `600 ${fontSize}px 'Inter', 'Instrument Sans', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      
      const labelY = node.y + size + 8
      const textWidth = ctx.measureText(label).width
      
      // Draw label background
      ctx.fillStyle = 'rgba(5, 5, 16, 0.85)'
      ctx.beginPath()
      ctx.roundRect(
        node.x - textWidth / 2 - 8,
        labelY - 2,
        textWidth + 16,
        fontSize + 8,
        4
      )
      ctx.fill()
      
      // Draw label border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.lineWidth = 1
      ctx.stroke()
      
      // Draw label text
      ctx.fillStyle = '#ffffff'
      ctx.fillText(label, node.x, labelY + 2)
    }
  }, [hoveredNode, nodeScale])

  // Custom link rendering - constellation lines with fading glow
  const linkCanvasObject = useCallback((link, ctx) => {
    const start = link.source
    const end = link.target
    
    if (!start.x || !end.x) return
    
    // Create unique link ID for tracking glow state
    const linkId = `${link.source.id || link.source}-${link.target.id || link.target}`
    
    // Check if this link should be glowing
    const isHovered = hoveredLink === link || 
      hoveredNode?.id === start.id || 
      hoveredNode?.id === end.id
    
    // Get current glow intensity (0 to 1)
    let glowIntensity = linkGlowStates.current[linkId] || 0
    
    // Animate glow intensity
    if (isHovered) {
      // Fade in
      glowIntensity = Math.min(1, glowIntensity + GLOW_FADE_IN_SPEED)
    } else {
      // Fade out
      glowIntensity = Math.max(0, glowIntensity - GLOW_FADE_OUT_SPEED)
    }
    linkGlowStates.current[linkId] = glowIntensity
    
    // Calculate visual properties based on glow intensity
    const baseOpacity = 0.06 + glowIntensity * 0.7
    const lineWidth = 0.5 + glowIntensity * 1.5
    
    // Color transition from dark gray to white
    const r = Math.round(80 + glowIntensity * 175)
    const g = Math.round(100 + glowIntensity * 155)
    const b = Math.round(130 + glowIntensity * 125)
    
    // Draw the main line
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${baseOpacity})`
    ctx.lineWidth = lineWidth
    ctx.stroke()
    
    // Draw outer glow when there's any glow intensity
    if (glowIntensity > 0.01) {
      // Outer soft glow
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.strokeStyle = `rgba(150, 180, 255, ${glowIntensity * 0.25})`
      ctx.lineWidth = 6 * glowIntensity
      ctx.stroke()
      
      // Inner bright glow
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.strokeStyle = `rgba(200, 220, 255, ${glowIntensity * 0.15})`
      ctx.lineWidth = 10 * glowIntensity
      ctx.stroke()
    }
  }, [hoveredNode, hoveredLink])

  // Handle node hover
  const handleNodeHover = useCallback((node) => {
    setHoveredNode(node)
    if (containerRef.current) {
      containerRef.current.style.cursor = node ? 'pointer' : 'grab'
    }
  }, [])

  // Handle link hover
  const handleLinkHover = useCallback((link) => {
    setHoveredLink(link)
  }, [])

  // Handle node click
  const handleNodeClick = useCallback((node) => {
    if (node && onNodeClick) {
      onNodeClick(node)
    }
  }, [onNodeClick])

  // Handle zoom/pan to update parallax
  const handleZoom = useCallback((transform) => {
    cameraOffset.current = {
      x: transform.x,
      y: transform.y,
      k: transform.k
    }
  }, [])

  // Render floating genre labels on canvas (drawn after each frame)
  const handleRenderFramePost = useCallback((ctx, globalScale) => {
    // Only show labels when zoomed out
    if (globalScale > 0.9 || spatialLabels.length === 0) return
    
    // Calculate opacity based on zoom (fade in as you zoom out)
    const opacity = Math.min(1, (0.9 - globalScale) * 3)
    
    spatialLabels.forEach(label => {
      // Get the anchor node's current position from data.nodes
      const anchorNode = data.nodes.find(n => n.id === label.anchorNodeId)
      if (!anchorNode || !Number.isFinite(anchorNode.x) || !Number.isFinite(anchorNode.y)) return
      
      // Position label above the anchor node
      const x = anchorNode.x
      const y = anchorNode.y - 30 / globalScale // Offset above the node
      
      // Draw label with glow effect
      const fontSize = Math.max(12, 16 / globalScale)
      ctx.font = `600 ${fontSize}px 'Inter', 'Instrument Sans', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      const text = label.name.toUpperCase()
      
      // Draw glow layers
      ctx.save()
      ctx.globalAlpha = opacity * 0.3
      ctx.fillStyle = label.color || '#6366f1'
      ctx.shadowColor = label.color || '#6366f1'
      ctx.shadowBlur = 20 / globalScale
      ctx.fillText(text, x, y)
      ctx.fillText(text, x, y) // Double for stronger glow
      ctx.restore()
      
      // Draw main text
      ctx.save()
      ctx.globalAlpha = opacity * 0.9
      ctx.fillStyle = '#ffffff'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
      ctx.shadowBlur = 4 / globalScale
      ctx.shadowOffsetY = 2 / globalScale
      ctx.fillText(text, x, y)
      ctx.restore()
    })
  }, [spatialLabels, data.nodes])

  // Zoom to fit on load
  useEffect(() => {
    if (graphRef.current && data.nodes.length > 0) {
      const timer = setTimeout(() => {
        graphRef.current?.zoomToFit(400, 50)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [data.nodes.length])

  // Smooth zoom handling with dynamic min zoom based on graph bounds
  useEffect(() => {
    if (!containerRef.current || !graphRef.current) return
    
    const container = containerRef.current
    let targetZoom = cameraOffset.current.k
    let currentZoom = cameraOffset.current.k
    let animationId = null
    
    const ZOOM_SPEED = 0.15 // How much to zoom per scroll step
    const SMOOTH_FACTOR = 0.12 // Smoothing factor (lower = smoother but slower)
    const MAX_ZOOM = 8
    const ABSOLUTE_MIN_ZOOM = 0.05 // Never go below this
    const ZOOM_OUT_PADDING = 0.7 // How much smaller than "fit" we allow (0.7 = 70% of fit)
    
    // Calculate dynamic min zoom based on graph bounds and viewport
    const getMinZoom = () => {
      if (!graphBounds || graphBounds.width === 0 || graphBounds.height === 0) {
        return 0.1 // Default fallback
      }
      
      // Calculate zoom level needed to fit entire graph in viewport
      const fitZoomX = dimensions.width / graphBounds.width
      const fitZoomY = dimensions.height / graphBounds.height
      const fitZoom = Math.min(fitZoomX, fitZoomY)
      
      // Allow zooming out a bit past "fit" for breathing room, but not infinitely
      const dynamicMin = fitZoom * ZOOM_OUT_PADDING
      
      // Clamp between absolute minimum and a reasonable threshold
      return Math.max(ABSOLUTE_MIN_ZOOM, Math.min(dynamicMin, 0.5))
    }
    
    const animateZoom = () => {
      const diff = targetZoom - currentZoom
      
      // If close enough, stop animating
      if (Math.abs(diff) < 0.001) {
        currentZoom = targetZoom
        animationId = null
        return
      }
      
      // Smoothly interpolate toward target
      currentZoom += diff * SMOOTH_FACTOR
      
      // Apply the zoom
      if (graphRef.current) {
        graphRef.current.zoom(currentZoom, 0) // 0 duration since we're animating manually
      }
      
      animationId = requestAnimationFrame(animateZoom)
    }
    
    const handleWheel = (e) => {
      // Prevent default browser zoom
      e.preventDefault()
      
      const minZoom = getMinZoom()
      
      // Calculate new target zoom based on scroll direction
      const zoomDelta = e.deltaY > 0 ? -ZOOM_SPEED : ZOOM_SPEED
      targetZoom = Math.max(minZoom, Math.min(MAX_ZOOM, targetZoom * (1 + zoomDelta)))
      
      // Start animation if not already running
      if (!animationId) {
        animationId = requestAnimationFrame(animateZoom)
      }
    }
    
    // Use passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false })
    
    return () => {
      container.removeEventListener('wheel', handleWheel)
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [data.nodes.length, graphBounds, dimensions]) // Re-attach when bounds or dimensions change

  return (
    <div className="graph-container cosmic-theme" ref={containerRef}>
      {/* Starfield background canvas */}
      <canvas
        ref={starfieldRef}
        className="starfield-canvas"
        width={dimensions.width}
        height={dimensions.height}
      />
      
      <ForceGraph2D
        ref={graphRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={data}
        nodeCanvasObject={nodeCanvasObject}
        linkCanvasObject={linkCanvasObject}
        onNodeHover={handleNodeHover}
        onLinkHover={handleLinkHover}
        onNodeClick={handleNodeClick}
        onZoom={handleZoom}
        onRenderFramePost={handleRenderFramePost}
        nodeLabel={() => null}
        linkDirectionalParticles={0}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        warmupTicks={100}
        cooldownTicks={200}
        backgroundColor="transparent"
        nodeRelSize={1}
        enableNodeDrag={true}
        enableZoomInteraction={false}
        enablePanInteraction={true}
        minZoom={0.1}
        maxZoom={8}
      />
      
      {/* Genre cluster labels (sidebar) */}
      {showGenreLabels && clusterCenters.length > 0 && (
        <div className="cluster-labels">
          {clusterCenters.map((cluster) => (
            <div
              key={cluster.id}
              className="cluster-label"
              style={{
                '--cluster-color': getClusterColor(cluster.colorIndex)
              }}
            >
              {cluster.name}
            </div>
          ))}
        </div>
      )}
      

      {/* Hover tooltip at bottom */}
      {hoveredNode && (
        <div className="node-tooltip cosmic-tooltip">
          <span className="node-tooltip__name">{hoveredNode.name}</span>
          {hoveredNode.genres?.length > 0 && (
            <span className="node-tooltip__genres">
              {hoveredNode.genres.slice(0, 3).join(' • ')}
            </span>
          )}
          {hoveredNode.playcount && (
            <span className="node-tooltip__playcount">
              {formatPlaycount(hoveredNode.playcount)} plays
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Helper: Lighten a hex color
function lightenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.min(255, (num >> 16) + amt)
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt)
  const B = Math.min(255, (num & 0x0000FF) + amt)
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
}

// Helper: Darken a hex color
function darkenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.max(0, (num >> 16) - amt)
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt)
  const B = Math.max(0, (num & 0x0000FF) - amt)
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
}

// Helper: Format playcount with K/M suffix
function formatPlaycount(count) {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M'
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K'
  }
  return count.toString()
}

function getClusterColor(index) {
  const colors = [
    // Cosmic palette - nebula and star colors
    '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4',
    '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b',
    '#f97316', '#ef4444', '#ec4899', '#d946ef', '#c084fc', '#818cf8',
    '#60a5fa', '#38bdf8', '#2dd4bf', '#4ade80', '#a3e635', '#fbbf24'
  ]
  return colors[index % colors.length]
}

export default SpotifyGraph
