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
    />
  );
}
