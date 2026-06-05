import { memo, useCallback } from "react";
import type { PetType } from "./pet-types";
import { PET_TYPES, PET_LABELS } from "./pet-types";
import GitPetSprite from "./GitPetSprite";

interface PetSelectorCardProps {
  selected: PetType;
  onSelect: (pet: PetType) => void;
}

const PetButton = memo(function PetButton({
  pet,
  isSelected,
  onSelect,
}: {
  pet: PetType;
  isSelected: boolean;
  onSelect: (pet: PetType) => void;
}) {
  const handleClick = useCallback(() => onSelect(pet), [onSelect, pet]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`relative flex flex-col items-center gap-2.5 p-2.5 rounded-mac border transition-all ${
        isSelected
          ? "border-accent bg-accent/10 ring-1 ring-accent/30"
          : "border-border-40 hover:border-border hover:bg-surface-2"
      }`}
    >
      <div className="w-24 h-24 flex items-center justify-center">
        <GitPetSprite state="idle" petType={pet} />
      </div>
      <span className="text-2xs font-medium leading-none text-text-secondary">{PET_LABELS[pet]}</span>
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-accent rounded-full flex items-center justify-center">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </button>
  );
});

export const PetSelectorCard = memo(function PetSelectorCard({ selected, onSelect }: PetSelectorCardProps) {
  return (
    <div className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3">
      <div className="text-xs font-semibold text-text-primary mb-1">
        🐾 Git Pet
      </div>
      <p className="text-2xs text-text-muted leading-normal">
        Choose your companion that lives in the footer.
      </p>
      <div className="grid grid-cols-3 gap-3 pt-1">
        {PET_TYPES.map((pet) => (
          <PetButton key={pet} pet={pet} isSelected={selected === pet} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
});
