# Plan to Address Codebase Issues

## Issues
- Settings UI mismatch: `labelOpacity`, `linkOpacity`, `showAllLabels` are defined but unused; `showGenreLabels` cannot be toggled; ToolsPanel receives props it does not use. (`src/App.jsx`, `src/components/ToolsPanel.jsx`, `src/components/Graph.jsx`)
- Graph link rendering guard skips valid coordinates (0), which can hide links. (`src/components/Graph.jsx`)
- Last.fm fetch ignores the `limit` argument and always requests 500, inflating downstream calls and risking rate limits. (`src/utils/lastfm.js`)
- Invalid JSX/HTML and attribute usage on the Info page (`<text>`, `class`). (`src/components/Info.jsx`)
- Garbled glyphs in UI strings and meta description (for example, broken separator or arrow symbols). (`src/components/Graph.jsx`, `src/components/ArtistDetails.jsx`, `src/components/Login.jsx`, `src/components/Info.jsx`, `index.html`)
- `calculateSpatialGenreLabels` uses `minX` for the Y axis, producing incorrect binning if used. (`src/utils/graphUtils.js`)
- Missing font load for `Metal` used in the Info page. (`src/components/Info.css`, `index.html`)
- Dead/unused assets or state (for example, `selectedNode`, `SettingsPanel.css`). (`src/components/Graph.jsx`, `src/components/SettingsPanel.css`)

## Plan
1. Confirm intended characters/labels for separators and the Info back button; replace garbled glyphs consistently across UI and meta text.
2. Fix Info page markup: replace `<text>` with semantic elements, convert `class` to `className`, and confirm the CSS still applies.
3. Align settings UX with functionality: decide which settings are supported, add/remove toggles and sliders (genre labels, label opacity, link opacity, show-all labels), and wire Graph rendering to those settings.
4. Correct graph rendering bugs: update link render guard to check for finite `x`/`y` values; fix `calculateSpatialGenreLabels` Y binning.
5. Adjust Last.fm data fetches: honor the `limit` argument, clamp to API limits, and gate debug logs behind a flag.
6. Normalize typography: either load the `Metal` font or switch Info text to an already loaded font.
7. Optional cleanup: remove unused state/CSS/hooks or document why they remain.
8. Verification: run the app, confirm settings change visuals, links render at the origin, and Last.fm fetch volume matches the selected limit.
