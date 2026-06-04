import type { PetState } from "./usePetState";

interface GitPetSpriteProps {
  state: PetState;
  onAnimationEnd?: () => void;
}

const STATE_TO_CLASS: Record<PetState, string> = {
  idle: "pet-idle",
  blink: "pet-blink",
  sleeping: "pet-sleep",
  loading: "pet-loading",
  success: "pet-success",
  error: "pet-error",
  alarmed: "pet-alarmed",
  excited: "pet-excited",
  waving: "pet-wave",
};

export default function GitPetSprite({ state, onAnimationEnd }: GitPetSpriteProps) {
  return (
    <div
      className={`git-pet-sprite ${STATE_TO_CLASS[state]}`}
      onAnimationEnd={onAnimationEnd}
      role="img"
      aria-label={`Git pet: ${state}`}
    >
      <svg viewBox="0 0 32 36" xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges">
        {/* Tail */}
        <path d="M8 27 C3 27 1 23 4 19" stroke="#D4876E" strokeWidth="2.5" fill="none" strokeLinecap="round" />

        {/* Body */}
        <rect x="7" y="17" width="18" height="10" fill="#E8944A" rx="5" />

        {/* Left arm/paw */}
        <rect x="4" y="19" width="5" height="6" fill="#F4A460" rx="2.5" />

        {/* Right arm/paw */}
        <rect x="23" y="19" width="5" height="6" fill="#F4A460" rx="2.5" />

        {/* Left ear */}
        <rect x="7" y="1" width="5" height="6" fill="#E8944A" rx="1.5" />
        <rect x="8.5" y="2.5" width="2" height="3" fill="#FFB6C1" rx="0.5" />

        {/* Right ear */}
        <rect x="20" y="1" width="5" height="6" fill="#E8944A" rx="1.5" />
        <rect x="21.5" y="2.5" width="2" height="3" fill="#FFB6C1" rx="0.5" />

        {/* Head */}
        <rect x="5" y="5" width="22" height="13" fill="#F4A460" rx="6" />

        {/* === FACE: Normal open eyes === */}
        <g className="face-normal">
          <rect x="10" y="10" width="3" height="4" fill="#333" rx="1.5" />
          <rect x="19" y="10" width="3" height="4" fill="#333" rx="1.5" />
          <rect x="11" y="10" width="1.5" height="1.5" fill="#fff" rx="0.5" />
          <rect x="20" y="10" width="1.5" height="1.5" fill="#fff" rx="0.5" />
        </g>

        {/* === FACE: Blink eyes (horizontal lines) === */}
        <g className="face-blink">
          <rect x="10" y="12" width="3" height="1.5" fill="#333" rx="0.75" />
          <rect x="19" y="12" width="3" height="1.5" fill="#333" rx="0.75" />
        </g>

        {/* === FACE: Sleep eyes (curved closed) === */}
        <g className="face-sleep">
          <path d="M10 12.5 Q11.5 11 13 12.5" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M19 12.5 Q20.5 11 22 12.5" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </g>

        {/* === FACE: Happy eyes (^_^) === */}
        <g className="face-happy">
          <path d="M10 13 Q11.5 9.5 13 13" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M19 13 Q20.5 9.5 22 13" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </g>

        {/* === FACE: Star/sparkle eyes === */}
        <g className="face-star">
          <rect x="11" y="9.5" width="1" height="5" fill="#FFD700" />
          <rect x="9.5" y="11.5" width="4" height="1" fill="#FFD700" />
          <rect x="20" y="9.5" width="1" height="5" fill="#FFD700" />
          <rect x="18.5" y="11.5" width="4" height="1" fill="#FFD700" />
        </g>

        {/* === FACE: Worry eyes (loading/error) === */}
        <g className="face-worry">
          <rect x="10" y="10" width="3" height="4" fill="#333" rx="1.5" />
          <rect x="19" y="10" width="3" height="4" fill="#333" rx="1.5" />
          <rect x="11" y="10" width="1.5" height="1.5" fill="#fff" rx="0.5" />
          <rect x="20" y="10" width="1.5" height="1.5" fill="#fff" rx="0.5" />
          {/* Sweat drop */}
          <path d="M25 7 L26.5 10 L23.5 10 Z" fill="#87CEEB" />
        </g>

        {/* === FACE: Alarmed eyes (!) === */}
        <g className="face-alarmed">
          <rect x="11" y="10" width="1.5" height="3" fill="#333" />
          <rect x="11" y="14" width="1.5" height="1" fill="#333" />
          <rect x="20" y="10" width="1.5" height="3" fill="#333" />
          <rect x="20" y="14" width="1.5" height="1" fill="#333" />
        </g>

        {/* Cheeks */}
        <circle cx="8" cy="14" r="2" fill="#FFB6C1" opacity="0.45" />
        <circle cx="24" cy="14" r="2" fill="#FFB6C1" opacity="0.45" />

        {/* Nose */}
        <rect x="15" y="12.5" width="2" height="1.5" fill="#D4876E" rx="0.5" />

        {/* === MOUTH: Smile === */}
        <g className="mouth-smile">
          <path d="M13 15.5 Q16 18 19 15.5" stroke="#5C4033" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>

        {/* === MOUTH: Sleep (tiny dot) === */}
        <g className="mouth-sleep">
          <ellipse cx="16" cy="15.5" rx="1" ry="0.7" fill="#5C4033" />
        </g>

        {/* === MOUTH: Open (alarmed/error) === */}
        <g className="mouth-open">
          <ellipse cx="16" cy="16" rx="2.5" ry="1.5" fill="#5C4033" />
          <ellipse cx="16" cy="15.5" rx="2" ry="1" fill="#D4876E" />
        </g>

        {/* === MOUTH: Big smile (success/excited) === */}
        <g className="mouth-big">
          <path d="M12 15 Q16 20 20 15" stroke="#5C4033" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M13 15.5 Q16 19 19 15.5" fill="#FF8A8A" opacity="0.2" />
        </g>

        {/* === BUBBLE TEA CUP === */}
        <rect x="22" y="20" width="8" height="10" fill="#87CEEB" rx="1.5" />
        {/* Cup lid */}
        <rect x="21" y="19" width="10" height="2.5" fill="#6BAFE0" rx="1" />
        {/* Straw */}
        <rect x="25" y="14" width="1.5" height="7" fill="#FF6347" rx="0.5" />
        {/* Boba pearls */}
        <circle cx="24.5" cy="27" r="1.2" fill="#4A2C17" />
        <circle cx="27" cy="27.5" r="1" fill="#4A2C17" />
        <circle cx="25.5" cy="25.5" r="0.9" fill="#4A2C17" />
        <circle cx="28" cy="26" r="0.8" fill="#4A2C17" />

        {/* Feet */}
        <rect x="10" y="26" width="4" height="3" fill="#D4876E" rx="1.5" />
        <rect x="18" y="26" width="4" height="3" fill="#D4876E" rx="1.5" />
      </svg>
    </div>
  );
}
