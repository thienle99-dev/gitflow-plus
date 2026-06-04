import type { PetType } from "./pet-types";

interface PetDefinition {
  viewBox: string;
  body: React.ReactNode;
  face: React.ReactNode;
  mouth: React.ReactNode;
  accessories: React.ReactNode;
}

export function getPetDefinition(petType: PetType): PetDefinition {
  switch (petType) {
    case "cat":
      return catPet;
    case "otter":
      return otterPet;
    case "dog":
      return dogPet;
    case "fox":
      return foxPet;
    case "penguin":
      return penguinPet;
    case "bunny":
      return bunnyPet;
    case "panda":
      return pandaPet;
    case "koala":
      return koalaPet;
    case "frog":
      return frogPet;
    case "axolotl":
      return axolotlPet;
    case "bear":
      return bearPet;
    default:
      return catPet;
  }
}

const catPet: PetDefinition = {
  viewBox: "0 0 32 36",
  body: (
    <>
      {/* Tail */}
      <path className="pet-tail" d="M8 27 C3 27 1 23 4 19" stroke="#D4876E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Body */}
      <rect x="7" y="17" width="18" height="10" fill="#E8944A" rx="5" />
      {/* Left arm/paw */}
      <rect x="4" y="19" width="5" height="6" fill="#F4A460" rx="2.5" />
      {/* Right arm/paw */}
      <rect x="23" y="19" width="5" height="6" fill="#F4A460" rx="2.5" />
      {/* Left ear */}
      <g className="pet-ear-left">
        <rect x="7" y="1" width="5" height="6" fill="#E8944A" rx="1.5" />
        <rect x="8.5" y="2.5" width="2" height="3" fill="#FFB6C1" rx="0.5" />
      </g>
      {/* Right ear */}
      <g className="pet-ear-right">
        <rect x="20" y="1" width="5" height="6" fill="#E8944A" rx="1.5" />
        <rect x="21.5" y="2.5" width="2" height="3" fill="#FFB6C1" rx="0.5" />
      </g>
      {/* Head */}
      <rect x="5" y="5" width="22" height="13" fill="#F4A460" rx="6" />
      {/* Cheeks */}
      <circle cx="8" cy="14" r="2" fill="#FFB6C1" opacity="0.45" />
      <circle cx="24" cy="14" r="2" fill="#FFB6C1" opacity="0.45" />
      {/* Nose */}
      <rect x="15" y="12.5" width="2" height="1.5" fill="#D4876E" rx="0.5" />
      {/* Feet */}
      <rect x="10" y="26" width="4" height="3" fill="#D4876E" rx="1.5" />
      <rect x="18" y="26" width="4" height="3" fill="#D4876E" rx="1.5" />
    </>
  ),
  face: null, // Face is rendered by GitPetSprite
  mouth: null,
  accessories: (
    <>
      {/* Bubble tea cup */}
      <rect x="22" y="20" width="8" height="10" fill="#87CEEB" rx="1.5" />
      <rect x="21" y="19" width="10" height="2.5" fill="#6BAFE0" rx="1" />
      <rect x="25" y="14" width="1.5" height="7" fill="#FF6347" rx="0.5" />
      <circle cx="24.5" cy="27" r="1.2" fill="#4A2C17" />
      <circle cx="27" cy="27.5" r="1" fill="#4A2C17" />
      <circle cx="25.5" cy="25.5" r="0.9" fill="#4A2C17" />
      <circle cx="28" cy="26" r="0.8" fill="#4A2C17" />
    </>
  ),
};

const otterPet: PetDefinition = {
  viewBox: "0 0 32 36",
  body: (
    <>
      {/* Tail */}
      <path className="pet-tail" d="M7 27 C2 27 0 23 3 20" stroke="#8B7355" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Body */}
      <rect x="7" y="17" width="18" height="10" fill="#A0826D" rx="5" />
      {/* Belly */}
      <rect x="10" y="19" width="12" height="6" fill="#D4B896" rx="3" />
      {/* Left arm/paw */}
      <rect x="4" y="19" width="5" height="6" fill="#8B7355" rx="2.5" />
      {/* Right arm/paw */}
      <rect x="23" y="19" width="5" height="6" fill="#8B7355" rx="2.5" />
      {/* Left ear */}
      <rect className="pet-ear-left" x="8" y="2" width="4" height="4" fill="#A0826D" rx="2" />
      {/* Right ear */}
      <rect className="pet-ear-right" x="20" y="2" width="4" height="4" fill="#A0826D" rx="2" />
      {/* Head */}
      <rect x="5" y="5" width="22" height="13" fill="#A0826D" rx="6" />
      {/* Belly on head */}
      <rect x="9" y="9" width="14" height="6" fill="#D4B896" rx="3" />
      {/* Cheeks */}
      <circle cx="8" cy="14" r="2" fill="#FFB6C1" opacity="0.35" />
      <circle cx="24" cy="14" r="2" fill="#FFB6C1" opacity="0.35" />
      {/* Nose */}
      <rect x="15" y="12.5" width="2" height="1.5" fill="#5C4033" rx="0.5" />
      {/* Feet */}
      <rect x="10" y="26" width="4" height="3" fill="#8B7355" rx="1.5" />
      <rect x="18" y="26" width="4" height="3" fill="#8B7355" rx="1.5" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Fish */}
      <ellipse cx="27" cy="24" rx="3" ry="1.8" fill="#87CEEB" />
      <path d="M30 24 L32 22 L32 26 Z" fill="#87CEEB" />
      <circle cx="25.5" cy="23.5" r="0.5" fill="#333" />
    </>
  ),
};

const dogPet: PetDefinition = {
  viewBox: "0 0 32 36",
  body: (
    <>
      {/* Tail */}
      <path className="pet-tail" d="M8 26 C4 24 2 20 5 17" stroke="#C49A6C" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Body */}
      <rect x="7" y="17" width="18" height="10" fill="#DEB887" rx="5" />
      {/* Left arm/paw */}
      <rect x="4" y="19" width="5" height="6" fill="#C49A6C" rx="2.5" />
      {/* Right arm/paw */}
      <rect x="23" y="19" width="5" height="6" fill="#C49A6C" rx="2.5" />
      {/* Left floppy ear */}
      <rect className="pet-ear-left" x="5" y="5" width="4" height="10" fill="#C49A6C" rx="2" />
      {/* Right floppy ear */}
      <rect className="pet-ear-right" x="23" y="5" width="4" height="10" fill="#C49A6C" rx="2" />
      {/* Head */}
      <rect x="5" y="5" width="22" height="13" fill="#DEB887" rx="6" />
      {/* Snout */}
      <rect x="11" y="11" width="10" height="5" fill="#F5DEB3" rx="2.5" />
      {/* Cheeks */}
      <circle cx="8" cy="14" r="2" fill="#FFB6C1" opacity="0.3" />
      <circle cx="24" cy="14" r="2" fill="#FFB6C1" opacity="0.3" />
      {/* Nose */}
      <rect x="15" y="12" width="2" height="2" fill="#333" rx="1" />
      {/* Feet */}
      <rect x="10" y="26" width="4" height="3" fill="#C49A6C" rx="1.5" />
      <rect x="18" y="26" width="4" height="3" fill="#C49A6C" rx="1.5" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Bone */}
      <rect x="23" y="21" width="7" height="3" fill="#F5F5DC" rx="1.5" />
      <circle cx="23" cy="21" r="2" fill="#F5F5DC" />
      <circle cx="23" cy="24" r="2" fill="#F5F5DC" />
      <circle cx="30" cy="21" r="2" fill="#F5F5DC" />
      <circle cx="30" cy="24" r="2" fill="#F5F5DC" />
    </>
  ),
};

const foxPet: PetDefinition = {
  viewBox: "0 0 32 36",
  body: (
    <>
      {/* Tail */}
      <g className="pet-tail">
        <path d="M8 27 C3 27 1 23 4 19" stroke="#E8601C" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M5 20 C3 18 3 16 5 15" stroke="#F5F5DC" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
      {/* Body */}
      <rect x="7" y="17" width="18" height="10" fill="#FF8C42" rx="5" />
      {/* Belly */}
      <rect x="10" y="19" width="12" height="6" fill="#F5F5DC" rx="3" />
      {/* Left arm/paw */}
      <rect x="4" y="19" width="5" height="6" fill="#E8601C" rx="2.5" />
      {/* Right arm/paw */}
      <rect x="23" y="19" width="5" height="6" fill="#E8601C" rx="2.5" />
      {/* Left pointed ear */}
      <g className="pet-ear-left">
        <rect x="6" y="0" width="5" height="7" fill="#FF8C42" rx="1.5" />
        <rect x="7.5" y="1.5" width="2" height="4" fill="#F5F5DC" rx="0.5" />
      </g>
      {/* Right pointed ear */}
      <g className="pet-ear-right">
        <rect x="21" y="0" width="5" height="7" fill="#FF8C42" rx="1.5" />
        <rect x="22.5" y="1.5" width="2" height="4" fill="#F5F5DC" rx="0.5" />
      </g>
      {/* Head */}
      <rect x="5" y="5" width="22" height="13" fill="#FF8C42" rx="6" />
      {/* White face mask */}
      <rect x="9" y="10" width="14" height="6" fill="#F5F5DC" rx="3" />
      {/* Cheeks */}
      <circle cx="8" cy="14" r="2" fill="#FFB6C1" opacity="0.3" />
      <circle cx="24" cy="14" r="2" fill="#FFB6C1" opacity="0.3" />
      {/* Nose */}
      <rect x="15" y="12" width="2" height="1.5" fill="#333" rx="0.5" />
      {/* Feet */}
      <rect x="10" y="26" width="4" height="3" fill="#E8601C" rx="1.5" />
      <rect x="18" y="26" width="4" height="3" fill="#E8601C" rx="1.5" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Leaves */}
      <path d="M25 18 Q28 15 31 18 Q28 21 25 18" fill="#4CAF50" />
      <path d="M27 16 Q30 13 33 16 Q30 19 27 16" fill="#66BB6A" />
    </>
  ),
};

const penguinPet: PetDefinition = {
  viewBox: "0 0 32 36",
  body: (
    <>
      {/* Body */}
      <rect x="7" y="17" width="18" height="10" fill="#2C3E50" rx="5" />
      {/* Belly */}
      <rect x="10" y="19" width="12" height="6" fill="#ECF0F1" rx="3" />
      {/* Left flipper */}
      <rect x="3" y="19" width="5" height="7" fill="#2C3E50" rx="2.5" />
      {/* Right flipper */}
      <rect x="24" y="19" width="5" height="7" fill="#2C3E50" rx="2.5" />
      {/* Left ear tuft */}
      <rect className="pet-ear-left" x="8" y="2" width="4" height="4" fill="#2C3E50" rx="2" />
      {/* Right ear tuft */}
      <rect className="pet-ear-right" x="20" y="2" width="4" height="4" fill="#2C3E50" rx="2" />
      {/* Head */}
      <rect x="5" y="5" width="22" height="13" fill="#2C3E50" rx="6" />
      {/* White face */}
      <rect x="9" y="9" width="14" height="7" fill="#ECF0F1" rx="3.5" />
      {/* Cheeks */}
      <circle cx="10" cy="14" r="1.5" fill="#FFB6C1" opacity="0.4" />
      <circle cx="22" cy="14" r="1.5" fill="#FFB6C1" opacity="0.4" />
      {/* Beak */}
      <rect x="14" y="12" width="4" height="2" fill="#FFB347" rx="1" />
      {/* Feet */}
      <rect x="10" y="26" width="4" height="3" fill="#FFB347" rx="1.5" />
      <rect x="18" y="26" width="4" height="3" fill="#FFB347" rx="1.5" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Ice cream cone */}
      <rect x="24" y="20" width="2" height="8" fill="#DEB887" rx="1" />
      <circle cx="25" cy="19" r="3" fill="#FFB6C1" />
      <circle cx="23" cy="18" r="2" fill="#87CEEB" />
    </>
  ),
};

const bunnyPet: PetDefinition = {
  viewBox: "0 0 32 38",
  body: (
    <>
      {/* Tail (pom) */}
      <circle className="pet-tail" cx="8" cy="28" r="2.5" fill="#F5F5F5" />
      {/* Body */}
      <rect x="7" y="19" width="18" height="10" fill="#F5F5F5" rx="5" />
      {/* Left arm/paw */}
      <rect x="4" y="21" width="5" height="6" fill="#E8E8E8" rx="2.5" />
      {/* Right arm/paw */}
      <rect x="23" y="21" width="5" height="6" fill="#E8E8E8" rx="2.5" />
      {/* Left long ear */}
      <g className="pet-ear-left">
        <rect x="8" y="0" width="4" height="10" fill="#F5F5F5" rx="2" />
        <rect x="9" y="1" width="2" height="8" fill="#FFB6C1" rx="1" />
      </g>
      {/* Right long ear */}
      <g className="pet-ear-right">
        <rect x="20" y="0" width="4" height="10" fill="#F5F5F5" rx="2" />
        <rect x="21" y="1" width="2" height="8" fill="#FFB6C1" rx="1" />
      </g>
      {/* Head */}
      <rect x="5" y="8" width="22" height="12" fill="#F5F5F5" rx="6" />
      {/* Cheeks */}
      <circle cx="8" cy="16" r="2" fill="#FFB6C1" opacity="0.4" />
      <circle cx="24" cy="16" r="2" fill="#FFB6C1" opacity="0.4" />
      {/* Nose */}
      <rect x="15" y="14.5" width="2" height="1.5" fill="#FFB6C1" rx="0.5" />
      {/* Feet */}
      <rect x="10" y="28" width="4" height="3" fill="#E8E8E8" rx="1.5" />
      <rect x="18" y="28" width="4" height="3" fill="#E8E8E8" rx="1.5" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Carrot */}
      <rect x="25" y="22" width="2" height="7" fill="#FF8C42" rx="1" />
      <path d="M25 22 Q26 19 27 22" fill="#4CAF50" />
      <path d="M24 21 Q26 18 28 21" fill="#66BB6A" />
    </>
  ),
};

const pandaPet: PetDefinition = {
  viewBox: "0 0 32 36",
  body: (
    <>
      {/* Tail (tiny pom) */}
      <circle className="pet-tail" cx="8" cy="28" r="2" fill="#F5F5F5" />
      {/* Body */}
      <rect x="7" y="17" width="18" height="10" fill="#F5F5F5" rx="5" />
      {/* Belly band */}
      <rect x="10" y="20" width="12" height="4" fill="#2C2C2C" rx="2" />
      {/* Left arm */}
      <rect x="4" y="19" width="5" height="6" fill="#2C2C2C" rx="2.5" />
      {/* Right arm */}
      <rect x="23" y="19" width="5" height="6" fill="#2C2C2C" rx="2.5" />
      {/* Left round ear */}
      <circle className="pet-ear-left" cx="9" cy="4" r="3.5" fill="#2C2C2C" />
      {/* Right round ear */}
      <circle className="pet-ear-right" cx="23" cy="4" r="3.5" fill="#2C2C2C" />
      {/* Head */}
      <rect x="5" y="5" width="22" height="13" fill="#F5F5F5" rx="6" />
      {/* Left eye patch */}
      <ellipse cx="11" cy="11" rx="3.5" ry="3" fill="#2C2C2C" />
      {/* Right eye patch */}
      <ellipse cx="21" cy="11" rx="3.5" ry="3" fill="#2C2C2C" />
      {/* Cheeks */}
      <circle cx="8" cy="15" r="2" fill="#FFB6C1" opacity="0.35" />
      <circle cx="24" cy="15" r="2" fill="#FFB6C1" opacity="0.35" />
      {/* Nose */}
      <rect x="15" y="12.5" width="2" height="1.5" fill="#2C2C2C" rx="0.5" />
      {/* Feet */}
      <rect x="10" y="26" width="4" height="3" fill="#2C2C2C" rx="1.5" />
      <rect x="18" y="26" width="4" height="3" fill="#2C2C2C" rx="1.5" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Bamboo stick */}
      <rect x="25" y="18" width="1.5" height="12" fill="#4CAF50" rx="0.75" />
      <path d="M25 18 Q27 16 25.5 14" stroke="#4CAF50" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M25 22 Q27 20 25.5 18" stroke="#4CAF50" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Bamboo leaves */}
      <ellipse cx="27" cy="14" rx="2" ry="1" fill="#66BB6A" transform="rotate(-30 27 14)" />
      <ellipse cx="27" cy="18" rx="2" ry="1" fill="#66BB6A" transform="rotate(-30 27 18)" />
    </>
  ),
};

const koalaPet: PetDefinition = {
  viewBox: "0 0 32 36",
  body: (
    <>
      {/* Body */}
      <rect x="7" y="17" width="18" height="10" fill="#90A4AE" rx="5" />
      {/* Chest patch */}
      <rect x="11" y="19" width="10" height="6" fill="#ECEFF1" rx="2" />
      {/* Left arm */}
      <rect x="4" y="19" width="5" height="6" fill="#78909C" rx="2.5" />
      {/* Right arm */}
      <rect x="23" y="19" width="5" height="6" fill="#78909C" rx="2.5" />
      {/* Left large furry ear */}
      <g className="pet-ear-left">
        <circle cx="8" cy="4" r="5.5" fill="#78909C" />
        <circle cx="8" cy="4" r="3.5" fill="#ECEFF1" />
      </g>
      {/* Right large furry ear */}
      <g className="pet-ear-right">
        <circle cx="24" cy="4" r="5.5" fill="#78909C" />
        <circle cx="24" cy="4" r="3.5" fill="#ECEFF1" />
      </g>
      {/* Head */}
      <rect x="5" y="5" width="22" height="13" fill="#90A4AE" rx="6" />
      {/* Large nose */}
      <ellipse cx="16" cy="12.5" rx="2.5" ry="3.5" fill="#37474F" />
      {/* Cheeks */}
      <circle cx="8" cy="14" r="2" fill="#FFB6C1" opacity="0.35" />
      <circle cx="24" cy="14" r="2" fill="#FFB6C1" opacity="0.35" />
      {/* Feet */}
      <rect x="10" y="26" width="4" height="3" fill="#78909C" rx="1.5" />
      <rect x="18" y="26" width="4" height="3" fill="#78909C" rx="1.5" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Eucalyptus branch */}
      <line x1="24" y1="24" x2="29" y2="18" stroke="#8D6E63" strokeWidth="1" strokeLinecap="round" />
      <ellipse cx="29" cy="17" rx="2.5" ry="1.2" fill="#4CAF50" transform="rotate(-15 29 17)" />
      <ellipse cx="27" cy="20" rx="2" ry="1" fill="#81C784" transform="rotate(30 27 20)" />
    </>
  ),
};

const frogPet: PetDefinition = {
  viewBox: "0 0 32 36",
  body: (
    <>
      {/* Body */}
      <rect x="7" y="17" width="18" height="10" fill="#66BB6A" rx="5" />
      {/* Belly */}
      <ellipse cx="16" cy="22" rx="6" ry="4" fill="#C8E6C9" />
      {/* Left arm */}
      <rect x="4" y="19" width="5" height="6" fill="#4CAF50" rx="2.5" />
      {/* Right arm */}
      <rect x="23" y="19" width="5" height="6" fill="#4CAF50" rx="2.5" />
      {/* Left eye bulge */}
      <circle className="pet-ear-left" cx="9" cy="5" r="4.5" fill="#66BB6A" />
      {/* Right eye bulge */}
      <circle className="pet-ear-right" cx="23" cy="5" r="4.5" fill="#66BB6A" />
      {/* Head */}
      <rect x="5" y="6" width="22" height="12" fill="#66BB6A" rx="6" />
      {/* Cheeks */}
      <circle cx="8" cy="14" r="2" fill="#FF8A8A" opacity="0.45" />
      <circle cx="24" cy="14" r="2" fill="#FF8A8A" opacity="0.45" />
      {/* Feet */}
      <rect x="10" y="26" width="4" height="3" fill="#4CAF50" rx="1.5" />
      <rect x="18" y="26" width="4" height="3" fill="#4CAF50" rx="1.5" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Mushroom */}
      <path d="M24 23 A4 4 0 0 1 32 23 Z" fill="#E53935" />
      <circle cx="26" cy="21.5" r="0.6" fill="#FFF" />
      <circle cx="29.5" cy="22.5" r="0.5" fill="#FFF" />
      <rect x="27.5" y="23" width="2.5" height="5" fill="#ECEFF1" rx="1" />
    </>
  ),
};

const axolotlPet: PetDefinition = {
  viewBox: "0 0 32 36",
  body: (
    <>
      {/* Tail */}
      <path className="pet-tail" d="M8 27 C2 27 0 23 3 20" stroke="#FF8A8A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Body */}
      <rect x="7" y="17" width="18" height="10" fill="#FFB6C1" rx="5" />
      {/* Belly */}
      <ellipse cx="16" cy="22" rx="6" ry="4" fill="#FFE0E9" />
      {/* Left arm */}
      <rect x="4" y="19" width="5" height="6" fill="#FF8A8A" rx="2.5" />
      {/* Right arm */}
      <rect x="23" y="19" width="5" height="6" fill="#FF8A8A" rx="2.5" />
      {/* Left gills */}
      <g className="pet-gills-left">
        <path d="M5 8 C2 8 1 9 3 10" stroke="#FF69B4" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M4 11 C1 11 0 12 2 13" stroke="#FF69B4" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M5 14 C2 14 1 15 3 16" stroke="#FF69B4" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
      {/* Right gills */}
      <g className="pet-gills-right">
        <path d="M27 8 C30 8 31 9 29 10" stroke="#FF69B4" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M28 11 C31 11 32 12 30 13" stroke="#FF69B4" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M27 14 C30 14 31 15 29 16" stroke="#FF69B4" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
      {/* Head */}
      <rect x="5" y="7" width="22" height="11" fill="#FFB6C1" rx="5.5" />
      {/* Cheeks */}
      <circle cx="8" cy="13" r="2.5" fill="#FF69B4" opacity="0.4" />
      <circle cx="24" cy="13" r="2.5" fill="#FF69B4" opacity="0.4" />
      {/* Feet */}
      <rect x="10" y="26" width="4" height="3" fill="#FF8A8A" rx="1.5" />
      <rect x="18" y="26" width="4" height="3" fill="#FF8A8A" rx="1.5" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Glowing Bubble */}
      <circle cx="27" cy="22" r="3.5" fill="#E0F7FA" opacity="0.8" stroke="#80DEEA" strokeWidth="0.8" />
      <circle cx="25.8" cy="20.8" r="0.8" fill="#FFF" />
    </>
  ),
};

const bearPet: PetDefinition = {
  viewBox: "0 0 32 36",
  body: (
    <>
      {/* Tail */}
      <circle className="pet-tail" cx="8" cy="26" r="2" fill="#6D4C41" />
      {/* Body */}
      <rect x="7" y="17" width="18" height="10" fill="#8D6E63" rx="5" />
      {/* Belly */}
      <ellipse cx="16" cy="22" rx="5" ry="4.5" fill="#D7CCC8" />
      {/* Left arm */}
      <rect x="4" y="19" width="5" height="6" fill="#6D4C41" rx="2.5" />
      {/* Right arm */}
      <rect x="23" y="19" width="5" height="6" fill="#6D4C41" rx="2.5" />
      {/* Left round ear */}
      <circle className="pet-ear-left" cx="9" cy="4" r="3" fill="#6D4C41" />
      {/* Right round ear */}
      <circle className="pet-ear-right" cx="23" cy="4" r="3" fill="#6D4C41" />
      {/* Head */}
      <rect x="5" y="5" width="22" height="13" fill="#8D6E63" rx="6" />
      {/* Snout */}
      <rect x="12" y="11.5" width="8" height="4.5" fill="#D7CCC8" rx="2" />
      {/* Cheeks */}
      <circle cx="8" cy="14" r="2" fill="#FFB6C1" opacity="0.3" />
      <circle cx="24" cy="14" r="2" fill="#FFB6C1" opacity="0.3" />
      {/* Feet */}
      <rect x="10" y="26" width="4" height="3" fill="#6D4C41" rx="1.5" />
      <rect x="18" y="26" width="4" height="3" fill="#6D4C41" rx="1.5" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Honey Pot */}
      <rect x="24" y="21" width="7" height="8" fill="#FFB300" rx="1.5" stroke="#FFA000" strokeWidth="0.5" />
      <rect x="23" y="20" width="9" height="2" fill="#FFA000" rx="0.5" />
      <rect x="25" y="24" width="5" height="2.5" fill="#FFF" rx="0.5" />
    </>
  ),
};
