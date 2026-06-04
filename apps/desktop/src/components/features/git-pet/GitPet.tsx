import { useState, useCallback } from "react";
import { usePetState, usePetHover } from "./usePetState";
import GitPetSprite from "./GitPetSprite";
import GitPetBubble from "./GitPetBubble";

export function GitPet() {
  const baseState = usePetState();
  const { state, onHoverStart, onHoverEnd } = usePetHover(baseState);
  const [showBubble, setShowBubble] = useState(false);

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
      <GitPetSprite state={state} />
      {state === "sleeping" && <span className="pet-zzz">💤</span>}
    </div>
  );
}
