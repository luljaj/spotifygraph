import { useRef, useCallback, useEffect, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { forceCenter, forceX, forceY } from 'd3-force'
import { calculateClusterCenters } from '../utils/graphUtils'
import './Graph.css'

function Graph({ 
  data, 
  onNodeClick, 
  showGenreLabels, 
  settings, 
  onCameraChange,
  isMobile 
}) {
  const graphRef = useRef()
  const containerRef = useRef()
  const imageCache = useRef({})
  const cameraOffset = useRef({ x: 0, y: 0, k: 1 }) // Track camera position
  const clickTimeout = useRef(null)
  const lastClickedNode = useRef(null)
  const lastTapTime = useRef(0)
  const lastTappedNodeId = useRef(null)
  const DOUBLE_TAP_THRESHOLD = 300

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [hoveredNode, setHoveredNode] = useState(null)
  const [clickedNode, setClickedNode] = useState(null) // Desktop: clicked node to show connections
  const [selectedNode, setSelectedNode] = useState(null) // Mobile: tap-to-select node
  const [clusterCenters, setClusterCenters] = useState([])
  const [graphBounds, setGraphBounds] = useState(null) // Track graph extent for dynamic zoom limits

  // Default settings
  const {
    nodeScale = 1,
    chargeStrength = -100,
    linkDistance = 50,
  } = settings || {}

  // Handle window resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Set initial cursor state and handle dragging cursor
  useEffect(() => {
    const canvas = containerRef.current?.querySelector('canvas')
    if (!canvas) return

    canvas.style.cursor = 'grab'

    // Handle grabbing cursor during drag
    const handleMouseDown = (e) => {
      // Only show grabbing cursor if not hovering a node
      if (!hoveredNode && e.button === 0) {
        canvas.style.cursor = 'grabbing'
      }
    }

    const handleMouseUp = () => {
      // Restore appropriate cursor based on hover state
      canvas.style.cursor = hoveredNode ? 'pointer' : 'grab'
    }

    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('mouseleave', handleMouseUp)

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('mouseleave', handleMouseUp)
    }
  }, [dimensions, hoveredNode])

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

  // Update cluster centers and graph bounds after simulation
  useEffect(() => {
    if (graphRef.current && data.genreClusters?.length > 0) {
      const timer = setTimeout(() => {
        const centers = calculateClusterCenters(data.nodes, data.genreClusters)
        setClusterCenters(centers)
        
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

      // Dynamic link distance based on similarity strength
      // Stronger connections (higher value) = shorter distance
      graphRef.current.d3Force('link')?.distance((link) => {
        const strength = Math.min(1, Math.max(0.1, (link.value || 1) / 10))
        // Inverse relationship: high strength = short distance
        // Range: ~20px (strong) to ~100px (weak)
        return linkDistance * (1.5 - strength)
      })

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
    // Show glow for hovered or clicked node (desktop only, mobile has no hover/click feedback)
    const isHovered = hoveredNode?.id === node.id || clickedNode?.id === node.id
    
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
    
    // Add subtle ring/border (scales with node size)
    ctx.beginPath()
    ctx.arc(node.x, node.y, size, 0, Math.PI * 2)
    ctx.strokeStyle = isHovered ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.15)'
    ctx.lineWidth = isHovered ? Math.max(1.5, size * 0.1) : 0.5
    ctx.stroke()
    
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
  }, [hoveredNode, clickedNode, nodeScale])

  // Custom link rendering - simple constellation lines, brighter for clicked node connections
  const linkCanvasObject = useCallback((link, ctx) => {
    const start = link.source
    const end = link.target

    if (!start.x || !end.x) return

    // Check if this link is connected to clicked node
    const isConnectedToClicked = clickedNode?.id === start.id || clickedNode?.id === end.id

    // Skip rendering invisible links unless connected to clicked node
    if (link.visible === false && !isConnectedToClicked) {
      return // Don't render - but link still affects physics
    }

    // Calculate strength from link value (0-10 scale, where 10 = perfect match)
    const strength = Math.min(1, Math.max(0.1, (link.value || 1) / 10))

    // Calculate opacity and width based on whether connected to clicked node
    const opacity = isConnectedToClicked
      ? 0.08 + strength * 0.20  // Brighter when showing connections
      : 0.03 + strength * 0.12  // Default subtle

    const lineWidth = isConnectedToClicked
      ? 0.5 + strength * 1.0    // Slightly thicker when active
      : 0.3 + strength * 0.7    // Default thin

    // Draw the link
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.strokeStyle = `rgba(100, 120, 160, ${opacity})`
    ctx.lineWidth = lineWidth
    ctx.stroke()
  }, [clickedNode])

  // Handle node hover
  const handleNodeHover = useCallback((node) => {
    setHoveredNode(node)
    // Set cursor on canvas element directly to avoid conflicts
    const canvas = containerRef.current?.querySelector('canvas')
    if (canvas) {
      canvas.style.cursor = node ? 'pointer' : 'grab'
    }
  }, [])

  // Handle node click - different behavior for mobile vs desktop
  const handleNodeClick = useCallback((node) => {
    if (!node) return

    if (isMobile) {
      // Mobile: Double-tap to open modal
      const now = Date.now()
      const timeSinceLastTap = now - lastTapTime.current

      if (timeSinceLastTap < DOUBLE_TAP_THRESHOLD && lastTappedNodeId.current === node.id) {
        // Double-tap detected - open modal
        onNodeClick?.(node)
        lastTapTime.current = 0
        lastTappedNodeId.current = null
      } else {
        // First tap - just record it (no visual feedback on mobile)
        lastTapTime.current = now
        lastTappedNodeId.current = node.id
      }
    } else {
      // Desktop: Single-click shows connections, double-click opens modal
      if (lastClickedNode.current?.id === node.id && clickTimeout.current) {
        // Double-click detected
        clearTimeout(clickTimeout.current)
        clickTimeout.current = null
        lastClickedNode.current = null
        onNodeClick?.(node)
        setClickedNode(null)
      } else {
        // First click or different node
        if (clickTimeout.current) clearTimeout(clickTimeout.current)
        lastClickedNode.current = node
        clickTimeout.current = setTimeout(() => {
          setClickedNode(node)
          clickTimeout.current = null
          lastClickedNode.current = null
        }, 300)
      }
    }
  }, [onNodeClick, isMobile])

  // Cleanup click timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeout.current) clearTimeout(clickTimeout.current)
    }
  }, [])

  // Handle zoom/pan to update parallax starfield
  const handleZoom = useCallback((transform) => {
    cameraOffset.current = {
      x: transform.x,
      y: transform.y,
      k: transform.k
    }
    // Report camera position to parent for starfield parallax
    if (onCameraChange) {
      onCameraChange({ x: transform.x, y: transform.y })
    }
  }, [onCameraChange])

  // Handle background click to clear connections and deselect on mobile
  const handleBackgroundClick = useCallback(() => {
    setClickedNode(null)
    if (isMobile && selectedNode) {
      setSelectedNode(null)
    }
  }, [isMobile, selectedNode])

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

  // Container classes
  const containerClasses = [
    'graph-container',
    'cosmic-theme',
    isMobile && 'graph-container--mobile'
  ].filter(Boolean).join(' ')

  return (
    <div className={containerClasses} ref={containerRef}>
      <ForceGraph2D
        ref={graphRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={data}
        nodeCanvasObject={nodeCanvasObject}
        linkCanvasObject={linkCanvasObject}
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
        onZoom={handleZoom}
        nodeLabel={() => null}
        linkDirectionalParticles={0}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        warmupTicks={100}
        cooldownTicks={200}
        backgroundColor="transparent"
        nodeRelSize={1}
        enableNodeDrag={true}
        enableZoomInteraction={isMobile} // Enable native zoom on mobile for pinch-to-zoom
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
      

      {/* Hover tooltip at bottom - desktop only (no mobile tooltip) */}
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

export default Graph
