import { useState, useCallback, useEffect } from "react";
import { usePetState, usePetHover } from "./usePetState";
import GitPetSprite from "./GitPetSprite";
import GitPetBubble from "./GitPetBubble";
import type { PetType } from "./pet-types";
import { DEFAULT_PET, LS_KEY_PET_TYPE } from "./pet-types";

export function GitPet() {
  const baseState = usePetState();
  const { state, onHoverStart, onHoverEnd } = usePetHover(baseState);
  const [showBubble, setShowBubble] = useState(false);
  const [petType, setPetType] = useState<PetType>(() => {
    const stored = localStorage.getItem(LS_KEY_PET_TYPE);
    return (stored as PetType) || DEFAULT_PET;
  });

  // Listen for pet type changes from settings
  useEffect(() => {
    const handler = () => {
      const stored = localStorage.getItem(LS_KEY_PET_TYPE);
      setPetType((stored as PetType) || DEFAULT_PET);
    };
    window.addEventListener("gitflow-settings-updated", handler);
    return () => window.removeEventListener("gitflow-settings-updated", handler);
  }, []);

  const handleMouseEnter = useCallback(() => {
    onHoverStart();
    setShowBubble(true);
  }, [onHoverStart]);

  const handleMouseLeave = useCallback(() => {
    onHoverEnd();
    setShowBubble(false);
  }, [onHoverEnd]);

  return (
    <div
      className="git-pet-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title="Git Pet"
    >
      {showBubble && <GitPetBubble state={state} />}
      <GitPetSprite state={state} petType={petType} />
      {state === "sleeping" && (
        <div className="pet-zzz-container">
          <span className="zzz-1">z</span>
          <span className="zzz-2">z</span>
          <span className="zzz-3">z</span>
        </div>
      )}
      {state === "success" && (
        <div className="pet-particles-container">
          <div className="star star-1">★</div>
          <div className="star star-2">✦</div>
          <div className="star star-3">★</div>
          <div className="star star-4">✦</div>
        </div>
      )}
    </div>
  );
}
