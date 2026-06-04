import type { CSSProperties } from "react";
import type { PetState } from "./usePetState";
import type { PetType } from "./pet-types";
import { DEFAULT_PET } from "./pet-types";
import { getPetDefinition } from "./pet-definitions";

interface GitPetSpriteProps {
  state: PetState;
  petType?: PetType;
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

function getSpriteSheetSource(
  state: PetState,
  spriteSheets: NonNullable<ReturnType<typeof getPetDefinition>["spriteSheets"]>
) {
  if (state === "idle" || state === "blink" || state === "sleeping") {
    return spriteSheets.idle;
  }

  if (state === "waving" || state === "success" || state === "excited") {
    return spriteSheets.wave ?? spriteSheets.idle;
  }

  return spriteSheets.eating ?? spriteSheets.wave ?? spriteSheets.idle;
}

export default function GitPetSprite({ state, petType = DEFAULT_PET, onAnimationEnd }: GitPetSpriteProps) {
  const pet = getPetDefinition(petType);
  const spriteSheet = pet.spriteSheets;
  const activeSpriteSheet = spriteSheet ? getSpriteSheetSource(state, spriteSheet) : null;

  return (
    <div
      className={`git-pet-sprite ${STATE_TO_CLASS[state]}`}
      onAnimationEnd={onAnimationEnd}
      role="img"
      aria-label={`Git pet (${petType}): ${state}`}
    >
      {spriteSheet ? (
        <div
          className="git-pet-sprite-sheet"
          style={{
            "--pet-sheet-url": `url(${activeSpriteSheet?.src})`,
            "--pet-frame-width": `${spriteSheet.frameWidth}px`,
            "--pet-frame-height": `${spriteSheet.frameHeight}px`,
            "--pet-sheet-height": `${spriteSheet.sheetHeight ?? spriteSheet.frameHeight}px`,
            "--pet-frame-count": activeSpriteSheet?.frames,
            "--pet-sheet-end": `-${spriteSheet.frameWidth * (activeSpriteSheet?.frames ?? 1)}px`,
            "--pet-frame-scale": spriteSheet.scale ?? 2,
          } as CSSProperties}
        />
      ) : (
      <svg viewBox={pet.viewBox} xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges">
        {/* Pet-specific body, head, ears, limbs */}
        {pet.body}

        {!pet.usesCustomFace && (
        <g transform={pet.faceTransform}>
          {/* === FACE: Normal open eyes === */}
          <g className="face-normal">
            <circle cx="11.5" cy="11" r="2" fill="#333" />
            <circle cx="20.5" cy="11" r="2" fill="#333" />
            <circle cx="12.2" cy="10.3" r="0.8" fill="#fff" />
            <circle cx="21.2" cy="10.3" r="0.8" fill="#fff" />
          </g>

          {/* === FACE: Blink eyes (curved lines) === */}
          <g className="face-blink">
            <path d="M9.5 11.5 Q11.5 10 13.5 11.5" stroke="#333" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <path d="M18.5 11.5 Q20.5 10 22.5 11.5" stroke="#333" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </g>

          {/* === FACE: Sleep eyes (curved closed) === */}
          <g className="face-sleep">
            <path d="M10 12 Q11.5 10.5 13 12" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M19 12 Q20.5 10.5 22 12" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </g>

          {/* === FACE: Happy eyes (^_^) === */}
          <g className="face-happy">
            <path d="M10 12.5 Q11.5 9 13 12.5" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M19 12.5 Q20.5 9 22 12.5" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </g>

          {/* === FACE: Star/sparkle eyes === */}
          <g className="face-star">
            {/* Left star */}
            <circle cx="11.5" cy="11" r="2" fill="#FFD700" />
            <circle cx="11.5" cy="11" r="1" fill="#FFF8DC" />
            {/* Right star */}
            <circle cx="20.5" cy="11" r="2" fill="#FFD700" />
            <circle cx="20.5" cy="11" r="1" fill="#FFF8DC" />
            {/* Sparkle dots */}
            <circle cx="9" cy="9" r="0.5" fill="#FFD700" opacity="0.7" />
            <circle cx="14" cy="9" r="0.4" fill="#FFD700" opacity="0.6" />
            <circle cx="18" cy="9" r="0.4" fill="#FFD700" opacity="0.6" />
            <circle cx="23" cy="9" r="0.5" fill="#FFD700" opacity="0.7" />
          </g>

          {/* === FACE: Worry eyes (loading/error) === */}
          <g className="face-worry">
            <circle cx="11.5" cy="11" r="2" fill="#333" />
            <circle cx="20.5" cy="11" r="2" fill="#333" />
            <circle cx="12.2" cy="10.3" r="0.8" fill="#fff" />
            <circle cx="21.2" cy="10.3" r="0.8" fill="#fff" />
            {/* Worry eyebrows */}
            <path d="M9 8.5 Q11.5 7.5 14 9" stroke="#333" strokeWidth="0.8" fill="none" strokeLinecap="round" />
            <path d="M18 9 Q20.5 7.5 23 8.5" stroke="#333" strokeWidth="0.8" fill="none" strokeLinecap="round" />
            {/* Sweat drop */}
            <path d="M25 6 L26.5 9.5 L23.5 9.5 Z" fill="#87CEEB" opacity="0.8" />
          </g>

          {/* === FACE: Alarmed eyes (!) === */}
          <g className="face-alarmed">
            <circle cx="11.5" cy="11" r="2.2" fill="#333" />
            <circle cx="11.5" cy="11" r="1" fill="#fff" />
            <circle cx="20.5" cy="11" r="2.2" fill="#333" />
            <circle cx="20.5" cy="11" r="1" fill="#fff" />
            {/* Tiny pupils */}
            <circle cx="11.5" cy="11" r="0.6" fill="#333" />
            <circle cx="20.5" cy="11" r="0.6" fill="#333" />
          </g>

          {/* === MOUTH: Smile === */}
          <g className="mouth-smile">
            <path d="M13 15 Q16 17.5 19 15" stroke="#5C4033" strokeWidth="1" fill="none" strokeLinecap="round" />
          </g>

          {/* === MOUTH: Sleep (tiny dot) === */}
          <g className="mouth-sleep">
            <ellipse cx="16" cy="15" rx="1" ry="0.7" fill="#5C4033" />
          </g>

          {/* === MOUTH: Open (alarmed/error) === */}
          <g className="mouth-open">
            <ellipse cx="16" cy="15.5" rx="2.5" ry="1.8" fill="#5C4033" />
            <ellipse cx="16" cy="15" rx="2" ry="1.2" fill="#E89CAD" />
          </g>

          {/* === MOUTH: Big smile (success/excited) === */}
          <g className="mouth-big">
            <path d="M12 14.5 Q16 19.5 20 14.5" stroke="#5C4033" strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M13 15 Q16 18.5 19 15" fill="#FF8A8A" opacity="0.2" />
          </g>
        </g>
        )}

        {/* Pet-specific accessories (bubble tea, fish, bone, etc.) */}
        {pet.accessories && <g className="pet-accessory">{pet.accessories}</g>}
      </svg>
      )}
    </div>
  );
}
