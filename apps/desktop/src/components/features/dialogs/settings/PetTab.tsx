import { PetSelectorCard } from "@/components/features/git-pet/PetSelectorCard";
import type { PetType } from "@/components/features/git-pet/pet-types";

interface PetTabProps {
  petType: PetType;
  setPetType: (v: PetType) => void;
}

export function PetTab({ petType, setPetType }: PetTabProps) {
  return (
    <div className="space-y-4">
      <PetSelectorCard selected={petType} onSelect={setPetType} />
    </div>
  );
}
