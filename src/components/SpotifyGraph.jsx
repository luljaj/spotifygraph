import { useRef, useCallback, useEffect, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { calculateClusterCenters } from '../utils/graphUtils'
import './SpotifyGraph.css'

function SpotifyGraph({ data, onNodeClick, showGenreLabels, settings }) {
  const graphRef = useRef()
  const containerRef = useRef()
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [hoveredNode, setHoveredNode] = useState(null)
  const [clusterCenters, setClusterCenters] = useState([])

  // Default settings
  const {
    labelOpacity = 0.8,
    nodeScale = 1,
    linkOpacity = 0.3,
    chargeStrength = -100,
    linkDistance = 50,
    showAllLabels = true
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

  // Update cluster centers after graph simulation
  useEffect(() => {
    if (graphRef.current && data.genreClusters?.length > 0) {
      const timer = setTimeout(() => {
        const centers = calculateClusterCenters(data.nodes, data.genreClusters)
        setClusterCenters(centers)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [data])

  // Update force simulation when settings change
  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.d3Force('charge')?.strength(chargeStrength)
      graphRef.current.d3Force('link')?.distance(linkDistance)
      graphRef.current.d3ReheatSimulation()
    }
  }, [chargeStrength, linkDistance])

  // Custom node rendering - colored dots with names below
  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const baseSize = node.val || 5
    const size = baseSize * nodeScale
    const isHovered = hoveredNode?.id === node.id
    
    // Draw node circle
    ctx.beginPath()
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI)
    ctx.fillStyle = node.color || '#1DB954'
    ctx.fill()
    
    // Add glow/border effect on hover
    if (isHovered) {
      ctx.shadowColor = node.color || '#1DB954'
      ctx.shadowBlur = 20
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    // Draw name below the node (always visible or on hover based on settings)
    if (showAllLabels || isHovered) {
      const label = node.name
      // Font size proportional to node size
      const fontSize = Math.max(8, Math.min(14, size * 0.6))
      ctx.font = `500 ${fontSize}px 'Instrument Sans', sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      
      const labelY = node.y + size + 4
      
      // Set opacity for labels
      const opacity = isHovered ? 1 : labelOpacity
      ctx.fillStyle = `rgba(240, 240, 245, ${opacity})`
      ctx.fillText(label, node.x, labelY)
    }
  }, [hoveredNode, nodeScale, labelOpacity, showAllLabels])

  // Custom link rendering
  const linkCanvasObject = useCallback((link, ctx) => {
    const start = link.source
    const end = link.target
    
    if (!start.x || !end.x) return
    
    // Calculate opacity based on edge weight
    const maxWeight = 5
    const baseOpacity = 0.05 + (Math.min(link.value, maxWeight) / maxWeight) * 0.3
    const opacity = baseOpacity * linkOpacity
    
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.strokeStyle = `rgba(29, 185, 84, ${opacity})`
    ctx.lineWidth = Math.max(0.5, link.value * 0.3)
    ctx.stroke()
  }, [linkOpacity])

  // Handle node hover
  const handleNodeHover = useCallback((node) => {
    setHoveredNode(node)
    if (containerRef.current) {
      containerRef.current.style.cursor = node ? 'pointer' : 'grab'
    }
  }, [])

  // Handle node click
  const handleNodeClick = useCallback((node) => {
    if (node && onNodeClick) {
      onNodeClick(node)
    }
  }, [onNodeClick])

  // Zoom to fit on load
  useEffect(() => {
    if (graphRef.current && data.nodes.length > 0) {
      setTimeout(() => {
        graphRef.current.zoomToFit(400, 50)
      }, 500)
    }
  }, [data.nodes.length])

  return (
    <div className="graph-container" ref={containerRef}>
      <ForceGraph2D
        ref={graphRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={data}
        nodeCanvasObject={nodeCanvasObject}
        linkCanvasObject={linkCanvasObject}
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
        nodeLabel={() => null}
        linkDirectionalParticles={0}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        warmupTicks={100}
        cooldownTicks={200}
        backgroundColor="transparent"
        linkColor={() => 'rgba(29, 185, 84, 0.2)'}
        nodeRelSize={1}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
      />
      
      {/* Genre cluster labels */}
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

      {/* Hover tooltip */}
      {hoveredNode && (
        <div className="node-tooltip">
          <span className="node-tooltip__name">{hoveredNode.name}</span>
          {hoveredNode.genres?.length > 0 && (
            <span className="node-tooltip__genres">
              {hoveredNode.genres.slice(0, 3).join(' • ')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function getClusterColor(index) {
  const colors = [
    '#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3',
    '#f38181', '#aa96da', '#fcbad3', '#a8d8ea'
  ]
  return colors[index % colors.length]
}

export default SpotifyGraph
