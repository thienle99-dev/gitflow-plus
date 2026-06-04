# Git Pet Pixel Art Sprite

## Goal
Replace the current emoji-based Git Pet with a small hand-drawn pixel-art pet that feels closer to the “Boba” reference: a cozy otter/cat-like companion holding bubble tea, rendered in SVG/CSS and docked in the sidebar bottom-left.

## Tasks
- [ ] Replace emoji pseudo-elements in `pet-sprites.css` with a real sprite component in `GitPetSprite.tsx` -> Verify: no `🐱`, `😺`, `🙀`, etc. remain in the pet sprite CSS.
- [ ] Build a compact pixel-art SVG in `GitPetSprite.tsx` using blocky rect/circle shapes for head, ears, body, paws, cup, straw, and face -> Verify: sprite is recognizable at 32px in the sidebar and scales cleanly.
- [ ] Map pet states to visual variants with CSS classes: idle, blink, sleeping, loading, success, error, alarmed, excited, waving -> Verify: each state changes expression, motion, or accessory accent without swapping to emoji.
- [ ] Keep animations CSS-only in `pet-sprites.css`: bob, blink, sip/bubble pulse, run bounce, success hop, error shake, alarmed pulse, excited wiggle -> Verify: `prefers-reduced-motion` disables all motion.
- [ ] Add sidebar-specific sizing in `.sidebar-git-pet` so the pet appears as a real docked companion, not a toolbar icon -> Verify: sidebar pet is around 44-56px visual area and stays bottom-left without covering Activity content.
- [ ] Adjust `GitPetBubble` positioning for sidebar use so speech bubble opens upward/right and never clips into the sidebar edge -> Verify: hover bubble is readable in narrow sidebar.
- [ ] Remove pet from `BottomBar` if still present and keep sidebar as the primary home -> Verify: only one pet instance appears in the main app UI.
- [ ] Run visual QA in dark/light themes -> Verify: pet outline, face, cup, and bubble contrast against both sidebar themes.
- [ ] Run verification -> Verify: `pnpm --dir apps/desktop build` passes with no pet CSS import warning.

## Done When
- [ ] The pet no longer looks like an emoji placeholder.
- [ ] The sidebar bottom-left pet visually resembles a pixel-art companion with a bubble tea “Boba” vibe.
- [ ] Pet state changes remain visible and useful during loading, conflict, success, and error states.

## Notes
- Use inline SVG/CSS for v1; do not add external image assets or sprite-sheet dependencies yet.
- Keep the design original and “inspired by Boba vibe,” not a direct copy of the reference app’s assets.
- Keep the implementation small: one sprite component plus CSS state styling.
