# GitPet Animation System — Implementation Plan

> Created: 2026-06-04
> Status: Draft — Pending mascot & sprite sheet decision

Xây dựng một **Pet Animation Component** tách biệt hoàn toàn cho GitFlow Desktop, sử dụng CSS Sprite Sheet + CSS Animations thuần, phản ứng với các trạng thái Git thực tế (pull, push, error, idle...).

---

## Tổng quan Kiến trúc

```
src/components/features/git-pet/
├── GitPet.tsx              # Root component + state machine
├── GitPetSprite.tsx        # Sprite renderer (CSS sheet controller)
├── GitPetBubble.tsx        # Speech bubble component
├── usePetState.ts          # Hook: đọc Git state → map sang pet state
├── pet-sprites.css         # Tất cả @keyframes + sprite classes
└── index.ts                # Re-export

apps/desktop/public/assets/
└── git-pet-sheet.png       # Sprite sheet 512×512px (8×8 grid, 64px/frame)
```

**Vị trí tích hợp:** `BottomBar.tsx` — góc phải trước version number (floating pet icon)

---

## Pet State Machine

```
                    ┌─────────────────┐
              ───── │      IDLE        │ ─────
             │      └────────┬────────┘      │
             │        (random timer)         │
             │               ↓               │
             │      ┌────────────────┐       │
             │      │    BLINKING    │       │
             │      └────────┬───────┘       │
             │               ↓               │
             │      ┌────────────────┐       │
             │      │    SLEEPING    │       │
             │      └────────┬───────┘       │
             │               │               │
          FETCH           any event      MERGE_CONFLICT
             │               │               │
             ↓               ↓               ↓
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │   LOADING    │  │   EXCITED    │  │   ALARMED    │
    └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
           │                 │                 │
           ↓                 ↓                 ↓
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │   SUCCESS    │  │    ERROR     │  │   WAVING     │
    └──────────────┘  └──────────────┘  └──────────────┘
```

### 7 Animation States

| State | Trigger | CSS Class | Duration |
|-------|---------|-----------|----------|
| `idle` | Default | `.pet-idle` | Loop ∞ |
| `blink` | Random 3–8s | `.pet-blink` | 200ms |
| `sleeping` | No activity 60s | `.pet-sleep` | Loop ∞ |
| `loading` | fetch/pull/push start | `.pet-loading` | Loop ∞ |
| `success` | operation done | `.pet-success` | 800ms → idle |
| `error` | operation failed | `.pet-error` | 1000ms → idle |
| `alarmed` | merge conflict / danger | `.pet-alarmed` | Loop 3× → idle |
| `excited` | commits pushed | `.pet-excited` | 600ms |
| `waving` | user hover | `.pet-wave` | 400ms |

---

## Sprite Sheet Layout

```
Kích thước: 512×512px (8 cột × 8 hàng, mỗi frame 64×64px)
image-rendering: pixelated (pixel art crisp)

Row 0 (y=0):   [idle-1][idle-2][idle-3][idle-4][  ][  ][  ][  ]
Row 1 (y=64):  [blink-open][blink-closed][  ][  ][  ][  ][  ][  ]
Row 2 (y=128): [sleep-1][sleep-2][sleep-3][sleep-4][  ][  ][  ][  ]
Row 3 (y=192): [run-1][run-2][run-3][run-4][run-5][run-6][run-7][run-8]
Row 4 (y=256): [jump-1][jump-2][jump-3][jump-4][  ][  ][  ][  ]
Row 5 (y=320): [shake-1][shake-2][shake-3][  ][  ][  ][  ][  ]
Row 6 (y=384): [alarm-1][alarm-2][alarm-3][  ][  ][  ][  ][  ]
Row 7 (y=448): [wave-1][wave-2][wave-3][  ][  ][  ][  ][  ]
```

---

## CSS Architecture — `pet-sprites.css`

```css
/* === BASE SPRITE === */
.git-pet-sprite {
  width: 48px;
  height: 48px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  background-image: url('/assets/git-pet-sheet.png');
  background-size: 512px 512px;
}

/* === IDLE (4 frames, loop) === */
@keyframes pet-idle-walk {
  0%   { background-position: 0px 0px; }
  25%  { background-position: -64px 0px; }
  50%  { background-position: -128px 0px; }
  75%  { background-position: -192px 0px; }
  100% { background-position: 0px 0px; }
}
.pet-idle { animation: pet-idle-walk 800ms steps(1) infinite; }

/* === BLINK (2 frames, 2x) === */
@keyframes pet-blink-frames {
  0%, 100% { background-position: 0px -64px; }
  50%      { background-position: -64px -64px; }
}
.pet-blink { animation: pet-blink-frames 200ms steps(1) 2; }

/* === SLEEPING (4 frames, loop) === */
@keyframes pet-sleep-frames {
  0%   { background-position: 0px -128px; }
  33%  { background-position: -64px -128px; }
  66%  { background-position: -128px -128px; }
  100% { background-position: -192px -128px; }
}
.pet-sleep { animation: pet-sleep-frames 1200ms steps(1) infinite; }

/* === LOADING / RUN (8 frames, loop) === */
@keyframes pet-loading-frames {
  0%    { background-position: 0px -192px; }
  12.5% { background-position: -64px -192px; }
  25%   { background-position: -128px -192px; }
  37.5% { background-position: -192px -192px; }
  50%   { background-position: -256px -192px; }
  62.5% { background-position: -320px -192px; }
  75%   { background-position: -384px -192px; }
  87.5% { background-position: -448px -192px; }
  100%  { background-position: 0px -192px; }
}
.pet-loading { animation: pet-loading-frames 400ms steps(1) infinite; }

/* === SUCCESS / JUMP (4 frames + translateY) === */
@keyframes pet-success-frames {
  0%   { background-position: 0px -256px; transform: translateY(0); }
  25%  { background-position: -64px -256px; transform: translateY(-8px); }
  50%  { background-position: -128px -256px; transform: translateY(-4px); }
  75%  { background-position: -192px -256px; transform: translateY(0); }
  100% { background-position: 0px -256px; }
}
.pet-success { animation: pet-success-frames 600ms steps(1) 2; }

/* === ERROR / SHAKE (sprite + translateX shake) === */
@keyframes pet-error-shake {
  0%, 100% { transform: translateX(0); }
  20%      { transform: translateX(-4px); }
  40%      { transform: translateX(4px); }
  60%      { transform: translateX(-4px); }
  80%      { transform: translateX(4px); }
}
@keyframes pet-error-frames {
  0%   { background-position: 0px -320px; }
  33%  { background-position: -64px -320px; }
  66%  { background-position: -128px -320px; }
  100% { background-position: 0px -320px; }
}
.pet-error {
  animation: pet-error-frames 200ms steps(1) 3,
             pet-error-shake 600ms ease-in-out;
}

/* === ALARMED (sprite + brightness pulse) === */
@keyframes pet-alarmed-frames {
  0%   { background-position: 0px -384px; }
  33%  { background-position: -64px -384px; }
  66%  { background-position: -128px -384px; }
  100% { background-position: 0px -384px; }
}
@keyframes pet-alarmed-pulse {
  0%, 100% { filter: brightness(1); }
  50%      { filter: brightness(1.4) sepia(0.5) hue-rotate(-30deg); }
}
.pet-alarmed {
  animation: pet-alarmed-frames 300ms steps(1) 6,
             pet-alarmed-pulse 600ms ease-in-out 3;
}

/* === WAVE (sprite + scale bounce) === */
@keyframes pet-wave-frames {
  0%   { background-position: 0px -448px; }
  33%  { background-position: -64px -448px; }
  66%  { background-position: -128px -448px; }
  100% { background-position: 0px -448px; }
}
@keyframes pet-wave-bounce {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.1); }
}
.pet-wave {
  animation: pet-wave-frames 200ms steps(1) 4,
             pet-wave-bounce 400ms ease-in-out 2;
}

/* === CONTAINER === */
.git-pet-container {
  cursor: pointer;
  transition: transform 150ms ease;
  position: relative;
}
.git-pet-container:hover  { transform: scale(1.1); }
.git-pet-container:active { transform: scale(0.95); }

/* === SPEECH BUBBLE === */
.pet-bubble {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 6px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px 8px 2px 8px;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
  color: var(--text-primary);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  animation: bubble-in 150ms ease-out;
  z-index: 200;
}
@keyframes bubble-in {
  from { opacity: 0; transform: translateY(4px) scale(0.9); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* === ACCESSIBILITY === */
@media (prefers-reduced-motion: reduce) {
  .git-pet-sprite,
  .git-pet-container,
  .pet-bubble {
    animation: none !important;
    transition: none !important;
  }
}
```

---

## React Components

### `usePetState.ts`

```typescript
type PetState =
  | 'idle' | 'blink' | 'sleeping'
  | 'loading' | 'success' | 'error'
  | 'alarmed' | 'excited' | 'waving';

// Nguồn dữ liệu:
// - useIsFetching() / useIsMutating()     → loading state
// - useMergeStatus()                      → conflict detection
// - useOperationsStore()                  → success/error tracking
// - local timer (useRef + setTimeout)     → idle → blink → sleep

// Priority order (cao nhất thắng):
// alarmed > error > success > loading > excited > waving > idle > blink > sleeping
```

### `GitPetSprite.tsx`

```tsx
interface Props {
  state: PetState;
  onAnimationEnd?: () => void;
}

// - Render div.git-pet-sprite với className dựa trên state
// - Listen onAnimationEnd để transition success/error → idle
// - Prop `style` override cho customization
```

### `GitPetBubble.tsx`

```tsx
// Speech bubble messages theo state:
const BUBBLE_MESSAGES: Record<PetState, string | null> = {
  loading:  "Syncing...",
  success:  "Done! ✓",
  error:    "Uh oh...",
  alarmed:  "Conflicts!",
  sleeping: "Zzz...",
  waving:   "Hello! 👋",
  idle:     null,    // ẩn bubble
  blink:    null,
  excited:  "Let's go!",
};
```

### `GitPet.tsx` (Root)

```tsx
export function GitPet() {
  const petState = usePetState();
  const [showBubble, setShowBubble] = useState(false);

  return (
    <div
      className="git-pet-container"
      onMouseEnter={() => setShowBubble(true)}
      onMouseLeave={() => setShowBubble(false)}
    >
      {showBubble && <GitPetBubble state={petState} />}
      <GitPetSprite
        state={petState}
        onAnimationEnd={/* transition back to idle */}
      />
    </div>
  );
}
```

---

## Data Flow

```
useIsFetching()  ──┐
useIsMutating()  ──┤
useGitStatus()   ──┼──► usePetState() ──► GitPet.tsx ──► GitPetSprite.tsx
useMergeStatus() ──┤                          │
useOpsStore()    ──┘                          └──► GitPetBubble.tsx
```

---

## Integration — `BottomBar.tsx`

Thêm vào right side section, trước version tag:

```tsx
import { GitPet } from "@/components/features/git-pet";

// Trong JSX, trước <span v1.0.2>:
<GitPet />
```

---

## File Checklist

| File | Action | ~Lines |
|------|--------|--------|
| `src/components/features/git-pet/GitPet.tsx` | NEW | 80 |
| `src/components/features/git-pet/GitPetSprite.tsx` | NEW | 40 |
| `src/components/features/git-pet/GitPetBubble.tsx` | NEW | 30 |
| `src/components/features/git-pet/usePetState.ts` | NEW | 60 |
| `src/components/features/git-pet/pet-sprites.css` | NEW | 150 |
| `src/components/features/git-pet/index.ts` | NEW | 5 |
| `apps/desktop/public/assets/git-pet-sheet.png` | NEW | — |
| `src/components/layout/BottomBar.tsx` | MODIFY | +5 |
| `src/index.css` | MODIFY | +1 import |

**Tổng: 7 files mới, 2 files sửa, ~370 lines code**

---

## Verification Plan

```bash
# 1. Type check
cd apps/desktop && npx tsc --noEmit

# 2. Build
npm run build
```

### Manual Visual Tests

1. ✅ Mở app → pet hiển thị `idle` ở BottomBar góc phải
2. ✅ Click Fetch → `loading` (pet chạy nhanh)
3. ✅ Fetch xong → `success` (nhảy) → back to `idle` sau 1.2s
4. ✅ Tạo merge conflict → `alarmed` (flash đỏ)
5. ✅ Hover pet → `waving` + speech bubble "Hello! 👋"
6. ✅ Không tương tác 60s → `sleeping` (Zzz animation)
7. ✅ `prefers-reduced-motion` → tất cả animation tắt

---

## Open Questions (cần xác nhận trước khi implement)

1. **Mascot** — Con gì? (Otter 🦦 / Cat 🐱 / Octopus 🐙 / Robot 🤖)
2. **Sprite sheet** — AI generate, bạn cung cấp sẵn, hay dùng emoji thuần?
3. **Click action** — Pet click → làm gì? (mini panel / easter egg / toggle / none)
