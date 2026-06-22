# Vibrant Color Mode - Design Specification

## Context

Users want a more visually engaging dashboard that makes it easy to understand data at a glance. The current design is clean but monochromatic, making it harder to quickly identify status states. A "Vibrant" color mode will add saturated status colors and card accents while keeping Standard mode available.

## Design Decisions

### Color Palette
- **Standard Status Colors** — Green (#22c55e) for good, Yellow (#eab308) for warning, Red (#ef4444) for error, Blue (#3b82f6) for info
- Consistent with common conventions; familiar and predictable

### Vibrant Scope
- **Status + Cards** — Status indicators AND metric/data cards get vivid accents
- Sidebar and navigation stay neutral
- Good balance of information density without overwhelming

### First-Time User Experience
- **Popup on First Visit** — Show a modal asking "Choose Your Color Experience" with Vibrant/Standard options
- Choice saved to localStorage; popup never shown again

## User Flow

1. User visits dashboard for first time
2. ColorModeModal appears with two options: "Vibrant" and "Standard"
3. User selects preference → saved to localStorage
4. User opens UserMenu dropdown → sees current mode with toggle to switch

## localStorage Schema

```json
{
  "colorMode": "vibrant" | "standard",
  "colorModePopupShown": boolean
}
```

## Component Changes

### New Components

**ColorModeModal.tsx**
- Modal popup for first-time users
- Two large buttons: "Vibrant Experience" and "Standard Experience"
- Vibrant: preview of vivid status colors
- Standard: preview of neutral current look
- On selection → saves to localStorage, closes modal

**ColorModeContext.tsx**
- React context for color mode state
- Provides `isVibrant: boolean` and `toggleColorMode: () => void`
- Reads/writes to localStorage
- Wraps App in AppShell

### Modified Components

**UserMenu.tsx**
- Add separator above "Sign out"
- Add row: "Color Mode" label + current mode indicator (vibrant pill / standard pill)
- Add toggle switch to flip between modes
- Calls `toggleColorMode()` from context

**index.css**
- Add `.vibrant` CSS class
- Under `.vibrant`, override status badge backgrounds with vivid saturated colors
- Under `.vibrant`, add box-shadow glows to status badges
- Under `.vibrant`, add colored left borders + subtle colored shadows to metric cards based on status

## Visual Changes

### Vibrant Status Pills
```css
.vibrant .status-success { background: #dcfce7; box-shadow: 0 2px 8px rgba(34, 197, 94, 0.25); }
.vibrant .status-warning { background: #fef9c3; box-shadow: 0 2px 8px rgba(234, 179, 8, 0.25); }
.vibrant .status-danger { background: #fee2e2; box-shadow: 0 2px 8px rgba(220, 38, 38, 0.25); }
.vibrant .status-info { background: #e0f2fe; box-shadow: 0 2px 8px rgba(14, 165, 233, 0.25); }
```

### Vibrant Metric Cards
```css
.vibrant .metric-card[data-status="warning"] {
  border-left: 3px solid #eab308;
  box-shadow: 0 4px 16px rgba(234, 179, 8, 0.15);
}
.vibrant .metric-card[data-status="danger"] {
  border-left: 3px solid #ef4444;
  box-shadow: 0 4px 16px rgba(220, 38, 38, 0.15);
}
```

## Files to Modify

| File | Action |
|------|--------|
| `src/components/layout/UserMenu.tsx` | Add color mode toggle row |
| `src/index.css` | Add `.vibrant` theme variables |
| `src/contexts/ColorModeContext.tsx` | New - color mode state |
| `src/components/layout/ColorModeModal.tsx` | New - first-visit popup |
| `src/App.tsx` | Wrap with ColorModeProvider |

## Verification

1. First load → ColorModeModal appears
2. Select "Vibrant" → modal closes, status pills show vivid colors
3. Refresh page → modal does not appear, Vibrant mode persists
4. Open UserMenu → toggle visible and functional
5. Switch to Standard → vivid colors removed
6. Switch back to Vibrant → vivid colors restored
