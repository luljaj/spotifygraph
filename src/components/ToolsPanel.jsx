import './ToolsPanel.css'

function ToolsPanel({ settings, onSettingsChange, showGenreLabels, onToggleGenreLabels, showArtistLabels, onToggleArtistLabels, onClose }) {
  const handleChange = (key, value) => {
    onSettingsChange({ ...settings, [key]: value })
  }

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="tools-panel-wrapper" onClick={handleBackdropClick}>
      <div className="tools-panel">
        {/* Drag handle for mobile bottom sheet */}
        <div className="tools-panel__drag-handle">
          <div className="tools-panel__drag-bar"></div>
        </div>
        
        <div className="tools-panel__header">
          <div className="tools-panel__header-left">
            <svg className="tools-panel__icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            <span>Settings</span>
          </div>
          <button className="tools-panel__close" onClick={onClose} title="Close">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      
      <div className="tools-panel__content">

        {/* Label Opacity */}
        <div className="tools-panel__group">
          <label className="slider">
            <div className="slider__header">
              <span className="slider__label">Label Opacity</span>
              <span className="slider__value">{Math.round(settings.labelOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.labelOpacity}
              onChange={(e) => handleChange('labelOpacity', parseFloat(e.target.value))}
            />
          </label>
        </div>

        {/* Node Size */}
        <div className="tools-panel__group">
          <label className="slider">
            <div className="slider__header">
              <span className="slider__label">Star Size</span>
              <span className="slider__value">{settings.nodeScale.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="2"
              step="0.1"
              value={settings.nodeScale}
              onChange={(e) => handleChange('nodeScale', parseFloat(e.target.value))}
            />
          </label>
        </div>

        {/* Repulsion Strength (Charge) */}
        <div className="tools-panel__group">
          <label className="slider">
            <div className="slider__header">
              <span className="slider__label">Gravity Repulsion</span>
              <span className="slider__value">{Math.abs(settings.chargeStrength)}</span>
            </div>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={Math.abs(settings.chargeStrength)}
              onChange={(e) => handleChange('chargeStrength', -parseFloat(e.target.value))}
            />
          </label>
        </div>

        {/* Link Distance */}
        <div className="tools-panel__group">
          <label className="slider">
            <div className="slider__header">
              <span className="slider__label">Connection Distance</span>
              <span className="slider__value">{settings.linkDistance}px</span>
            </div>
            <input
              type="range"
              min="10"
              max="250"
              step="5"
              value={settings.linkDistance}
              onChange={(e) => handleChange('linkDistance', parseFloat(e.target.value))}
            />
          </label>
        </div>

        <div className="tools-panel__divider"></div>

        {/* Artist Labels Toggle */}
        <div className="tools-panel__group">
          <label className="toggle">
            <span className="toggle__label">Artist Labels</span>
            <span className="toggle__switch">
              <input
                type="checkbox"
                checked={showArtistLabels}
                onChange={onToggleArtistLabels}
              />
              <span className="toggle__slider"></span>
            </span>
          </label>
        </div>

      </div>
    </div>
    </div>
  )
}

export default ToolsPanel


