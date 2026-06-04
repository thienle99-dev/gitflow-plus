export type PetType = "cat" | "otter" | "dog" | "fox" | "penguin" | "bunny" | "panda" | "koala" | "frog" | "axolotl" | "bear";

export const PET_TYPES: PetType[] = ["cat", "otter", "dog", "fox", "penguin", "bunny", "panda", "koala", "frog", "axolotl", "bear"];

export const PET_LABELS: Record<PetType, string> = {
  cat: "Cat",
  otter: "Otter",
  dog: "Dog",
  fox: "Fox",
  penguin: "Penguin",
  bunny: "Bunny",
  panda: "Panda",
  koala: "Koala",
  frog: "Frog",
  axolotl: "Axolotl",
  bear: "Bear",
};

export const DEFAULT_PET: PetType = "cat";

export const LS_KEY_PET_TYPE = "gitflowPetType";
