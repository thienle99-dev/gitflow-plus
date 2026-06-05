import { PetSelectorCard } from "@/components/features/git-pet/PetSelectorCard";
import type { PetType } from "@/components/features/git-pet/pet-types";
import { Switch } from "@/components/ui/form";

interface PetTabProps {
  petEnabled: boolean;
  setPetEnabled: (v: boolean) => void;
  petType: PetType;
  setPetType: (v: PetType) => void;
}

export function PetTab({ petEnabled, setPetEnabled, petType, setPetType }: PetTabProps) {
  return (
    <div className="space-y-4">
      <div className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5">
        <Switch
          checked={petEnabled}
          onChange={setPetEnabled}
          label="Show Git Pet"
          description="Display the animated companion in the footer."
        />
      </div>
      <div className={!petEnabled ? "opacity-45 pointer-events-none" : undefined}>
        <PetSelectorCard selected={petType} onSelect={setPetType} />
      </div>
    </div>
  );
}
