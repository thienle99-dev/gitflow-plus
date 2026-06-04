# macOS 26 Liquid Glass Theme — Design Spec

## Goal

Add a new "macOS 26" theme to the settings UI that brings Apple's WWDC 2025 Liquid Glass design language into the app. The theme introduces translucent surfaces, vibrant system colors, enhanced blur/glass effects, and a modern frosted-glass aesthetic — available in both light and dark variants.

## What Already Exists

The app already has partial glass/translucency infrastructure:

| Pattern | Location | Effect |
|---------|----------|--------|
| `.vibrancy` class | [`index.css:448-452`](apps/desktop/src/index.css:448) | `backdrop-filter: blur(20px)` + translucent `color-mix` background |
| Sidebar vibrancy | [`MainLayout.tsx:473`](apps/desktop/src/layouts/MainLayout.tsx:473) | Sidebar uses `.vibrancy` class |
| Toolbar blur | [`Toolbar.tsx:195`](apps/desktop/src/components/layout/Toolbar.tsx:195) | `backdrop-blur-md` + `bg-surface-1-40` |
| Sonner toast glass | [`index.css:526-540`](apps/desktop/src/index.css:526) | `backdrop-filter: blur(18px) saturate(1.35)` + translucent bg |

The macOS 26 theme will **enhance** these existing patterns rather than replace them.

## Theme Design: macOS 26 Dark

Inspired by Apple's Liquid Glass language — translucent dark surfaces with vibrant accent colors and subtle depth.

```css
.macos-26 {
  /* Surfaces: translucent dark with glass feel */
  --surface-0: rgba(22, 22, 26, 0.88);
  --surface-1: rgba(38, 38, 44, 0.82);
  --surface-2: rgba(52, 52, 60, 0.78);
  --surface-3: rgba(68, 68, 78, 0.72);

  /* Accent: vibrant Apple blue with more saturation */
  --accent: #1472e6;
  --accent-fg: #ffffff;

  /* Borders: subtle glass edge */
  --border: rgba(255, 255, 255, 0.10);

  /* Text: crisp white hierarchy */
  --text-primary: #f0f0f5;
  --text-secondary: #a8a8b8;
  --text-muted: #6b6b7e;

  /* Semantic colors: Apple vibrant palette */
  --success: #32d74b;
  --danger: #ff453a;
  --warning: #ff9f0a;
  --info: #64d2ff;

  /* Heatmap */
  --heatmap-empty: rgba(38, 38, 44, 0.6);
  --heatmap-low: #0a3d1a;
  --heatmap-medium: #0f7a38;
  --heatmap-high: #27c453;
  --heatmap-max: #32d74b;
}
```

## Theme Design: macOS 26 Light

Translucent light surfaces with Apple's vibrant color palette — the signature Liquid Glass look.

```css
.macos-26-light {
  /* Surfaces: translucent light with frosted glass */
  --surface-0: rgba(255, 255, 255, 0.85);
  --surface-1: rgba(242, 242, 247, 0.80);
  --surface-2: rgba(228, 228, 235, 0.75);
  --surface-3: rgba(210, 210, 220, 0.70);

  /* Accent: Apple blue (light variant) */
  --accent: #007aff;
  --accent-fg: #ffffff;

  /* Borders: soft glass edge */
  --border: rgba(0, 0, 0, 0.08);

  /* Text: dark hierarchy */
  --text-primary: #1d1d1f;
  --text-secondary: #515154;
  --text-muted: #86868b;

  /* Semantic colors */
  --success: #28a745;
  --danger: #dc3545;
  --warning: #ff9500;
  --info: #007aff;

  /* Heatmap */
  --heatmap-empty: rgba(228, 228, 235, 0.6);
  --heatmap-low: #9be9a8;
  --heatmap-medium: #40c463;
  --heatmap-high: #30a14e;
  --heatmap-max: #216e39;
}
```

## Enhanced Glass Effects

When macOS 26 theme is active, additional CSS classes enhance the glass material feel:

```css
/* Enhanced vibrancy for macOS 26 themes */
.macos-26 .vibrancy,
.macos-26-light .vibrancy {
  backdrop-filter: blur(40px) saturate(1.8);
  -webkit-backdrop-filter: blur(40px) saturate(1.8);
  background-color: color-mix(in srgb, var(--surface-1) 72%, transparent);
}

/* Glass surface cards for dialogs */
.macos-26 .glass-surface,
.macos-26-light .glass-surface {
  background: color-mix(in srgb, var(--surface-1) 68%, transparent);
  backdrop-filter: blur(24px) saturate(1.5);
  -webkit-backdrop-filter: blur(24px) saturate(1.5);
  border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
}
```

## Files to Modify

| # | File | Change |
|---|------|--------|
| 1 | [`apps/desktop/src/index.css`](apps/desktop/src/index.css) | Add `.macos-26` and `.macos-26-light` CSS variable blocks + enhanced glass effects |
| 2 | [`apps/desktop/src/stores/repo.ts`](apps/desktop/src/stores/repo.ts) | Add `"macos-26"` and `"macos-26-light"` to `Theme` type union, `THEME_CLASSES` array, and `isDarkTheme()` |
| 3 | [`apps/desktop/src/components/features/dialogs/settings/GeneralTab.tsx`](apps/desktop/src/components/features/dialogs/settings/GeneralTab.tsx) | Add macOS 26 cards to `THEME_CARDS` and a new group to `THEME_GROUPS` |
| 4 | [`apps/desktop/src/components/ui/theme/ThemePicker.tsx`](apps/desktop/src/components/ui/theme/ThemePicker.tsx) | Add macOS 26 options to `THEME_OPTIONS` and update group type |

## Detailed Changes

### 1. `index.css` — CSS Variables

Add after the `:root` block (line 27), before the `.dark` block:

```css
/* macOS 26 Liquid Glass Dark */
.macos-26 {
  --surface-0: rgba(22, 22, 26, 0.88);
  --surface-1: rgba(38, 38, 44, 0.82);
  --surface-2: rgba(52, 52, 60, 0.78);
  --surface-3: rgba(68, 68, 78, 0.72);
  --accent: #1472e6;
  --accent-fg: #ffffff;
  --border: rgba(255, 255, 255, 0.10);
  --text-primary: #f0f0f5;
  --text-secondary: #a8a8b8;
  --text-muted: #6b6b7e;
  --success: #32d74b;
  --danger: #ff453a;
  --warning: #ff9f0a;
  --info: #64d2ff;
  --heatmap-empty: rgba(38, 38, 44, 0.6);
  --heatmap-low: #0a3d1a;
  --heatmap-medium: #0f7a38;
  --heatmap-high: #27c453;
  --heatmap-max: #32d74b;
}

/* macOS 26 Liquid Glass Light */
.macos-26-light {
  --surface-0: rgba(255, 255, 255, 0.85);
  --surface-1: rgba(242, 242, 247, 0.80);
  --surface-2: rgba(228, 228, 235, 0.75);
  --surface-3: rgba(210, 210, 220, 0.70);
  --accent: #007aff;
  --accent-fg: #ffffff;
  --border: rgba(0, 0, 0, 0.08);
  --text-primary: #1d1d1f;
  --text-secondary: #515154;
  --text-muted: #86868b;
  --success: #28a745;
  --danger: #dc3545;
  --warning: #ff9500;
  --info: #007aff;
  --heatmap-empty: rgba(228, 228, 235, 0.6);
  --heatmap-low: #9be9a8;
  --heatmap-medium: #40c463;
  --heatmap-high: #30a14e;
  --heatmap-max: #216e39;
}
```

Add enhanced glass effects after the existing `.vibrancy` block:

```css
/* Enhanced vibrancy for macOS 26 Liquid Glass */
.macos-26 .vibrancy,
.macos-26-light .vibrancy {
  backdrop-filter: blur(40px) saturate(1.8);
  -webkit-backdrop-filter: blur(40px) saturate(1.8);
  background-color: color-mix(in srgb, var(--surface-1) 72%, transparent);
}
```

### 2. `repo.ts` — Theme Type & Logic

**Theme type union** — add two new members:
```typescript
export type Theme =
  | "dark" | "light" | "system" | "nord" | "tokyo-night"
  | "github-dark" | "dracula" | "cyberpunk-green" | "monokai-pro"
  | "gruvbox-dark" | "gruvbox-dark-soft" | "gruvbox-dark-hard"
  | "gruvbox-light" | "gruvbox-light-soft" | "one-dark"
  | "catppuccin-mocha" | "rose-pine" | "solarized-dark"
  | "macos-26" | "macos-26-light";
```

**THEME_CLASSES** — add both:
```typescript
export const THEME_CLASSES: Theme[] = [
  // ... existing entries ...
  "macos-26",
  "macos-26-light",
];
```

**isDarkTheme()** — add special case for light variant:
```typescript
const isDarkTheme = (theme: Theme): boolean => {
  if (theme === "light" || theme.startsWith("gruvbox-light") || theme === "macos-26-light") return false;
  // ... rest unchanged
};
```

### 3. `GeneralTab.tsx` — Theme Cards

Add new group and cards:

```typescript
export const THEME_CARDS = [
  // ... existing entries ...
  { id: "macos-26",       label: "macOS 26 Dark",  group: "macOS 26 Liquid Glass", colors: { bg: "#16161a", surface: "#26262c", sidebar: "#121216", accent: "#1472e6", text: "#f0f0f5" } },
  { id: "macos-26-light", label: "macOS 26 Light", group: "macOS 26 Liquid Glass", colors: { bg: "#ffffff", surface: "#f2f2f7", sidebar: "#e4e4eb", accent: "#007aff", text: "#1d1d1f" } },
] as const;

export const THEME_GROUPS = [
  "OS Sync", "macOS 26 Liquid Glass", "Developer Classics",
  "Highly Personalized", "Gruvbox Dark", "Gruvbox Light",
] as const;
```

### 4. `ThemePicker.tsx` — Dropdown Options

Add to the group union and options:

```typescript
interface ThemeOption {
  id: Theme;
  label: string;
  group: "macOS" | "macOS 26" | "Gruvbox Dark" | "Gruvbox Light";
  colors: { bg: string; accent: string; text: string };
}

const THEME_OPTIONS: ThemeOption[] = [
  // macOS
  { id: "dark", label: "macOS Dark", group: "macOS", colors: { bg: "#1c1c1e", accent: "#0a84ff", text: "#f5f5f7" } },
  { id: "light", label: "macOS Light", group: "macOS", colors: { bg: "#ffffff", accent: "#007aff", text: "#1d1d1f" } },
  // macOS 26
  { id: "macos-26", label: "macOS 26 Dark", group: "macOS 26", colors: { bg: "#16161a", accent: "#1472e6", text: "#f0f0f5" } },
  { id: "macos-26-light", label: "macOS 26 Light", group: "macOS 26", colors: { bg: "#ffffff", accent: "#007aff", text: "#1d1d1f" } },
  // ... rest unchanged
];

const GROUPS = ["macOS", "macOS 26", "Gruvbox Dark", "Gruvbox Light"] as const;
```

## Edge Cases

1. **Translucent surfaces on opaque backgrounds** — The `rgba` surface colors will appear dark/muted when no wallpaper is behind the window. This is acceptable for a Tauri webview; the glass effect is most visible on the sidebar and toolbar where the `.vibrancy` class is applied.

2. **Theme persistence** — The `readStoredTheme()` function already handles unknown themes by falling back to `"dark"`. Existing users won't be affected.

3. **System theme interaction** — The `macos-26` variant is dark (always dark mode), while `macos-26-light` is light (always light mode). Neither responds to OS preference — this matches how other named themes work (nord, tokyo-night, etc.).

4. **Performance** — `backdrop-filter` is GPU-accelerated on modern hardware. The enhanced `blur(40px) saturate(1.8)` may have minor performance impact on older GPUs, but the existing `blur(20px)` already sets this precedent.

## Verification

1. Run `npx tsc --noEmit` — zero errors
2. Open Settings → Appearance → verify "macOS 26 Liquid Glass" group appears with two cards
3. Select "macOS 26 Dark" — verify translucent surfaces, vibrant accent, enhanced sidebar blur
4. Select "macOS 26 Light" — verify frosted glass light surfaces
5. Verify ThemePicker dropdown shows "macOS 26" group
6. Verify theme persists after app restart
