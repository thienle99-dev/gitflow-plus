export type PetType =
  | "cat"
  | "otter"
  | "dog"
  | "fox"
  | "penguin"
  | "bunny"
  | "panda"
  | "koala"
  | "frog"
  | "axolotl"
  | "bear"
  | "piderman"
  | "goldenRetriever"
  | "mushroom";

export const PET_TYPES: PetType[] = [
  "panda",
  "goldenRetriever",
  "mushroom",
];

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
  piderman: "Piderman",
  goldenRetriever: "Golden Retriever",
  mushroom: "Mushroom",
};

export const DEFAULT_PET: PetType = "panda";

export const LS_KEY_PET_TYPE = "gitflowPetType";
export const LS_KEY_PET_ENABLED = "gitflowPetEnabled";
