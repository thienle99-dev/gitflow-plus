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
      <path className="pet-tail" d="M9 27 C4 27 2 23 4 19" stroke="#D4876E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Body */}
      <ellipse cx="16" cy="24" rx="9" ry="7" fill="#E8944A" />
      {/* Left arm/paw */}
      <ellipse cx="8" cy="24" rx="2.5" ry="3" fill="#F4A460" />
      {/* Right arm/paw */}
      <ellipse cx="24" cy="24" rx="2.5" ry="3" fill="#F4A460" />
      {/* Left ear */}
      <g className="pet-ear-left">
        <path d="M7 6 L9 0 L13 5 Z" fill="#E8944A" />
        <path d="M8.5 5 L10 1 L12 4 Z" fill="#FFB6C1" />
      </g>
      {/* Right ear */}
      <g className="pet-ear-right">
        <path d="M25 6 L23 0 L19 5 Z" fill="#E8944A" />
        <path d="M23.5 5 L22 1 L20 4 Z" fill="#FFB6C1" />
      </g>
      {/* Head */}
      <circle cx="16" cy="13" r="10" fill="#F4A460" />
      {/* Cheeks */}
      <ellipse cx="9" cy="14.5" rx="2" ry="1" fill="#FFB6C1" opacity="0.5" />
      <ellipse cx="23" cy="14.5" rx="2" ry="1" fill="#FFB6C1" opacity="0.5" />
      {/* Nose */}
      <polygon points="15 13, 17 13, 16 14.2" fill="#D4876E" />
      {/* Feet */}
      <ellipse cx="11" cy="30.5" rx="2.5" ry="1.5" fill="#D4876E" />
      <ellipse cx="21" cy="30.5" rx="2.5" ry="1.5" fill="#D4876E" />
    </>
  ),
  face: null,
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
      <path className="pet-tail" d="M10 27 C5 28 2 25 3 20" stroke="#8B7355" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Body */}
      <ellipse cx="16" cy="24" rx="9" ry="7" fill="#A0826D" />
      {/* Belly */}
      <ellipse cx="16" cy="24.5" rx="6" ry="4.5" fill="#D4B896" />
      {/* Left arm/paw */}
      <ellipse cx="8" cy="24" rx="2" ry="2.5" fill="#8B7355" />
      {/* Right arm/paw */}
      <ellipse cx="24" cy="24" rx="2" ry="2.5" fill="#8B7355" />
      {/* Left ear */}
      <g className="pet-ear-left">
        <circle cx="8" cy="4.5" r="3.5" fill="#A0826D" />
        <circle cx="8" cy="4.5" r="2" fill="#FFB6C1" />
      </g>
      {/* Right ear */}
      <g className="pet-ear-right">
        <circle cx="24" cy="4.5" r="3.5" fill="#A0826D" />
        <circle cx="24" cy="4.5" r="2" fill="#FFB6C1" />
      </g>
      {/* Head */}
      <circle cx="16" cy="13" r="10" fill="#A0826D" />
      {/* Snout/Belly color on face */}
      <ellipse cx="16" cy="14.5" rx="5" ry="3" fill="#D4B896" />
      {/* Cheeks */}
      <ellipse cx="9" cy="14" rx="1.8" ry="0.9" fill="#FFB6C1" opacity="0.4" />
      <ellipse cx="23" cy="14" rx="1.8" ry="0.9" fill="#FFB6C1" opacity="0.4" />
      {/* Nose */}
      <ellipse cx="16" cy="13" rx="1.5" ry="1" fill="#5C4033" />
      {/* Feet */}
      <ellipse cx="11" cy="30.5" rx="2.2" ry="1.5" fill="#8B7355" />
      <ellipse cx="21" cy="30.5" rx="2.2" ry="1.5" fill="#8B7355" />
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
      <path className="pet-tail" d="M10 26 C6 24 4 20 6 17" stroke="#C49A6C" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Body */}
      <ellipse cx="16" cy="24" rx="9" ry="7" fill="#DEB887" />
      {/* Left arm/paw */}
      <ellipse cx="8" cy="24" rx="2.5" ry="3" fill="#C49A6C" />
      {/* Right arm/paw */}
      <ellipse cx="24" cy="24" rx="2.5" ry="3" fill="#C49A6C" />
      {/* Left floppy ear */}
      <g className="pet-ear-left">
        <path d="M7 5 C5 5 4 10 5 13 C6 15 8 15 8 13 C8 10 9 5 7 5 Z" fill="#C49A6C" />
      </g>
      {/* Right floppy ear */}
      <g className="pet-ear-right">
        <path d="M25 5 C27 5 28 10 27 13 C26 15 24 15 24 13 C24 10 23 5 25 5 Z" fill="#C49A6C" />
      </g>
      {/* Head */}
      <circle cx="16" cy="13" r="10" fill="#DEB887" />
      {/* Snout */}
      <ellipse cx="16" cy="15" rx="4" ry="2.5" fill="#F5DEB3" />
      {/* Cheeks */}
      <ellipse cx="9" cy="15" rx="1.8" ry="0.9" fill="#FFB6C1" opacity="0.35" />
      <ellipse cx="23" cy="15" rx="1.8" ry="0.9" fill="#FFB6C1" opacity="0.35" />
      {/* Nose */}
      <ellipse cx="16" cy="13.8" rx="1.5" ry="1" fill="#333" />
      {/* Feet */}
      <ellipse cx="11" cy="30.5" rx="2.5" ry="1.5" fill="#C49A6C" />
      <ellipse cx="21" cy="30.5" rx="2.5" ry="1.5" fill="#C49A6C" />
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
        <path d="M10 27 C5 27 2 24 4 19" stroke="#E8601C" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M5 21 C3 19 3 17 5 15" stroke="#F5F5DC" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
      {/* Body */}
      <ellipse cx="16" cy="24" rx="9" ry="7" fill="#FF8C42" />
      {/* Belly */}
      <ellipse cx="16" cy="24.5" rx="6" ry="4.5" fill="#F5F5DC" />
      {/* Left arm/paw */}
      <ellipse cx="8" cy="24" rx="2" ry="2.5" fill="#E8601C" />
      {/* Right arm/paw */}
      <ellipse cx="24" cy="24" rx="2" ry="2.5" fill="#E8601C" />
      {/* Left pointed ear */}
      <g className="pet-ear-left">
        <path d="M6 6 L8 0 L12 5 Z" fill="#FF8C42" />
        <path d="M7.5 5 L9 1 L11 4 Z" fill="#F5F5DC" />
      </g>
      {/* Right pointed ear */}
      <g className="pet-ear-right">
        <path d="M26 6 L24 0 L20 5 Z" fill="#FF8C42" />
        <path d="M24.5 5 L23 1 L21 4 Z" fill="#F5F5DC" />
      </g>
      {/* Head */}
      <circle cx="16" cy="13" r="10" fill="#FF8C42" />
      {/* White face mask */}
      <ellipse cx="16" cy="15.5" rx="6" ry="3.5" fill="#F5F5DC" />
      {/* Cheeks */}
      <ellipse cx="9" cy="15" rx="1.8" ry="0.9" fill="#FFB6C1" opacity="0.35" />
      <ellipse cx="23" cy="15" rx="1.8" ry="0.9" fill="#FFB6C1" opacity="0.35" />
      {/* Nose */}
      <ellipse cx="16" cy="13.5" rx="1.2" ry="0.8" fill="#333" />
      {/* Feet */}
      <ellipse cx="11" cy="30.5" rx="2.2" ry="1.5" fill="#E8601C" />
      <ellipse cx="21" cy="30.5" rx="2.2" ry="1.5" fill="#E8601C" />
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
      <ellipse cx="16" cy="24" rx="9" ry="7" fill="#2C3E50" />
      {/* Belly */}
      <ellipse cx="16" cy="24" rx="6" ry="5.5" fill="#ECF0F1" />
      {/* Left flipper */}
      <ellipse cx="6" cy="23" rx="2" ry="4" fill="#2C3E50" transform="rotate(15 6 23)" />
      {/* Right flipper */}
      <ellipse cx="26" cy="23" rx="2" ry="4" fill="#2C3E50" transform="rotate(-15 26 23)" />
      {/* Left ear tuft */}
      <g className="pet-ear-left">
        <ellipse cx="9" cy="4" rx="2.5" ry="2" fill="#2C3E50" />
      </g>
      {/* Right ear tuft */}
      <g className="pet-ear-right">
        <ellipse cx="23" cy="4" rx="2.5" ry="2" fill="#2C3E50" />
      </g>
      {/* Head */}
      <circle cx="16" cy="13" r="10" fill="#2C3E50" />
      {/* White face */}
      <ellipse cx="16" cy="14" rx="6.5" ry="5" fill="#ECF0F1" />
      {/* Cheeks */}
      <ellipse cx="11" cy="14.5" rx="1.5" ry="0.8" fill="#FFB6C1" opacity="0.4" />
      <ellipse cx="21" cy="14.5" rx="1.5" ry="0.8" fill="#FFB6C1" opacity="0.4" />
      {/* Beak */}
      <ellipse cx="16" cy="14.5" rx="2" ry="1.2" fill="#FFB347" />
      {/* Feet */}
      <ellipse cx="11" cy="30.5" rx="2.2" ry="1.5" fill="#FFB347" />
      <ellipse cx="21" cy="30.5" rx="2.2" ry="1.5" fill="#FFB347" />
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
      <circle className="pet-tail" cx="7" cy="26" r="3.5" fill="#F5F5F5" />
      {/* Body */}
      <ellipse cx="16" cy="24" rx="9" ry="7" fill="#F5F5F5" />
      {/* Left arm/paw */}
      <ellipse cx="8" cy="24" rx="2.2" ry="2.8" fill="#E8E8E8" />
      {/* Right arm/paw */}
      <ellipse cx="24" cy="24" rx="2.2" ry="2.8" fill="#E8E8E8" />
      {/* Left long ear */}
      <g className="pet-ear-left">
        <rect x="8" y="0" width="3.5" height="10" fill="#F5F5F5" rx="1.75" />
        <rect x="9" y="1" width="1.5" height="8" fill="#FFB6C1" rx="0.75" />
      </g>
      {/* Right long ear */}
      <g className="pet-ear-right">
        <rect x="20.5" y="0" width="3.5" height="10" fill="#F5F5F5" rx="1.75" />
        <rect x="21.5" y="1" width="1.5" height="8" fill="#FFB6C1" rx="0.75" />
      </g>
      {/* Head */}
      <circle cx="16" cy="14" r="9.5" fill="#F5F5F5" />
      {/* Cheeks */}
      <ellipse cx="9" cy="15.5" rx="2" ry="1" fill="#FFB6C1" opacity="0.45" />
      <ellipse cx="23" cy="15.5" rx="2" ry="1" fill="#FFB6C1" opacity="0.45" />
      {/* Nose */}
      <ellipse cx="16" cy="15" rx="1" ry="0.8" fill="#FFB6C1" />
      {/* Feet */}
      <ellipse cx="11" cy="30.5" rx="2.5" ry="1.5" fill="#E8E8E8" />
      <ellipse cx="21" cy="30.5" rx="2.5" ry="1.5" fill="#E8E8E8" />
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
      <circle className="pet-tail" cx="7" cy="26" r="2.5" fill="#2C3E50" />
      {/* Body */}
      <ellipse cx="16" cy="24" rx="9" ry="7" fill="#2C3E50" />
      {/* Belly (Fluffy white chest patch) */}
      <path d="M 11 19 C 10 21 11 22 10.5 24 C 10 26 11 27 12 28.5 C 14 30 18 30 20 28.5 C 21 27 22 26 21.5 24 C 21 22 22 21 21 19 Z" fill="#F5F5F5" />
      {/* Left arm */}
      <path d="M 7 19 C 6 22 6 25 9 26.5 C 10.5 25 10 21 8.5 19 Z" fill="#2C3E50" />
      {/* Right arm */}
      <path d="M 25 19 C 26 22 26 25 23 26.5 C 21.5 25 22 21 23.5 19 Z" fill="#2C3E50" />
      {/* Left round ear */}
      <g className="pet-ear-left">
        <circle cx="6.5" cy="8.5" r="4.2" fill="#2C3E50" />
      </g>
      {/* Right round ear */}
      <g className="pet-ear-right">
        <circle cx="25.5" cy="8.5" r="4.2" fill="#2C3E50" />
      </g>
      {/* Head */}
      <ellipse cx="16" cy="14" rx="10.5" ry="8" fill="#F5F5F5" />
      {/* Beanie Hat (slouchy to the right) */}
      <path d="M 7 8.5 C 7 2.5, 23 2, 25 8.5 C 27 5.5, 25 1.5, 20 0.8 C 15 0.2, 9 2.5, 7 8.5 Z" fill="#34495E" />
      {/* Beanie brim */}
      <ellipse cx="16" cy="8.5" rx="9" ry="2.2" fill="#ECF0F1" />
      {/* Left eye patch */}
      <ellipse cx="11.5" cy="12.2" rx="3" ry="2.3" fill="#2C3E50" transform="rotate(-15 11.5 12.2)" />
      {/* Right eye patch */}
      <ellipse cx="20.5" cy="12.2" rx="3" ry="2.3" fill="#2C3E50" transform="rotate(15 20.5 12.2)" />
      {/* Cheeks */}
      <ellipse cx="8.5" cy="14.5" rx="1.8" ry="0.9" fill="#FFB6C1" opacity="0.45" />
      <ellipse cx="23.5" cy="14.5" rx="1.8" ry="0.9" fill="#FFB6C1" opacity="0.45" />
      {/* Nose */}
      <ellipse cx="16" cy="14.2" rx="1.2" ry="0.8" fill="#2C3E50" />
      {/* Feet with Pink Toe Beans */}
      <g>
        {/* Left foot */}
        <circle cx="11.5" cy="29" r="3.8" fill="#2C3E50" />
        <circle cx="9.5" cy="26.5" r="0.9" fill="#FFB6C1" />
        <circle cx="11.5" cy="25.5" r="0.9" fill="#FFB6C1" />
        <circle cx="13.5" cy="26.5" r="0.9" fill="#FFB6C1" />
        
        {/* Right foot */}
        <circle cx="20.5" cy="29" r="3.8" fill="#2C3E50" />
        <circle cx="18.5" cy="26.5" r="0.9" fill="#FFB6C1" />
        <circle cx="20.5" cy="25.5" r="0.9" fill="#FFB6C1" />
        <circle cx="22.5" cy="26.5" r="0.9" fill="#FFB6C1" />
      </g>
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
      <ellipse cx="16" cy="24" rx="9" ry="7" fill="#90A4AE" />
      {/* Chest patch */}
      <ellipse cx="16" cy="24.5" rx="6" ry="4.5" fill="#ECEFF1" />
      {/* Left arm */}
      <ellipse cx="8" cy="24" rx="2" ry="2.5" fill="#78909C" />
      {/* Right arm */}
      <ellipse cx="24" cy="24" rx="2" ry="2.5" fill="#78909C" />
      {/* Left large furry ear */}
      <g className="pet-ear-left">
        <circle cx="8" cy="5.5" r="5.5" fill="#78909C" />
        <circle cx="8" cy="5.5" r="3.5" fill="#ECEFF1" />
      </g>
      {/* Right large furry ear */}
      <g className="pet-ear-right">
        <circle cx="24" cy="5.5" r="5.5" fill="#78909C" />
        <circle cx="24" cy="5.5" r="3.5" fill="#ECEFF1" />
      </g>
      {/* Head */}
      <circle cx="16" cy="13" r="10" fill="#90A4AE" />
      {/* Cheeks */}
      <ellipse cx="9" cy="15" rx="1.8" ry="0.9" fill="#FFB6C1" opacity="0.35" />
      <ellipse cx="23" cy="15" rx="1.8" ry="0.9" fill="#FFB6C1" opacity="0.35" />
      {/* Large nose */}
      <ellipse cx="16" cy="13" rx="2.5" ry="3.5" fill="#37474F" />
      {/* Feet */}
      <ellipse cx="11" cy="30.5" rx="2.2" ry="1.5" fill="#78909C" />
      <ellipse cx="21" cy="30.5" rx="2.2" ry="1.5" fill="#78909C" />
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
      <ellipse cx="16" cy="24" rx="9" ry="7" fill="#66BB6A" />
      {/* Belly */}
      <ellipse cx="16" cy="24.5" rx="6" ry="4.5" fill="#C8E6C9" />
      {/* Left arm */}
      <ellipse cx="8" cy="24" rx="2" ry="2.5" fill="#4CAF50" />
      {/* Right arm */}
      <ellipse cx="24" cy="24" rx="2" ry="2.5" fill="#4CAF50" />
      {/* Left eye bulge */}
      <g className="pet-ear-left">
        <circle cx="9.5" cy="5" r="4.5" fill="#66BB6A" />
      </g>
      {/* Right eye bulge */}
      <g className="pet-ear-right">
        <circle cx="22.5" cy="5" r="4.5" fill="#66BB6A" />
      </g>
      {/* Head */}
      <circle cx="16" cy="13" r="9.5" fill="#66BB6A" />
      {/* Cheeks */}
      <ellipse cx="9" cy="14" rx="2" ry="1" fill="#FF8A8A" opacity="0.45" />
      <ellipse cx="23" cy="14" rx="2" ry="1" fill="#FF8A8A" opacity="0.45" />
      {/* Feet */}
      <ellipse cx="11" cy="30.5" rx="2.2" ry="1.5" fill="#4CAF50" />
      <ellipse cx="21" cy="30.5" rx="2.2" ry="1.5" fill="#4CAF50" />
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
      <path className="pet-tail" d="M10 27 C5 27 2 24 4 21" stroke="#FF8A8A" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Body */}
      <ellipse cx="16" cy="24" rx="9" ry="7" fill="#FFB6C1" />
      {/* Belly */}
      <ellipse cx="16" cy="24.5" rx="6" ry="4.5" fill="#FFE0E9" />
      {/* Left arm */}
      <ellipse cx="8" cy="24" rx="2" ry="2.5" fill="#FF8A8A" />
      {/* Right arm */}
      <ellipse cx="24" cy="24" rx="2" ry="2.5" fill="#FF8A8A" />
      {/* Left gills */}
      <g className="pet-gills-left">
        <path d="M6 7.5 C3 6.5 2 8 4 9.5" stroke="#FF69B4" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M5 10.5 C2 9.5 1 11 3 12.5" stroke="#FF69B4" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M6 13.5 C3 12.5 2 14 4 15.5" stroke="#FF69B4" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </g>
      {/* Right gills */}
      <g className="pet-gills-right">
        <path d="M26 7.5 C29 6.5 30 8 28 9.5" stroke="#FF69B4" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M27 10.5 C30 9.5 31 11 29 12.5" stroke="#FF69B4" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M26 13.5 C29 12.5 30 14 28 15.5" stroke="#FF69B4" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </g>
      {/* Head */}
      <ellipse cx="16" cy="13" rx="10" ry="8" fill="#FFB6C1" />
      {/* Cheeks */}
      <ellipse cx="9.5" cy="14" rx="2" ry="1" fill="#FF69B4" opacity="0.45" />
      <ellipse cx="22.5" cy="14" rx="2" ry="1" fill="#FF69B4" opacity="0.45" />
      {/* Feet */}
      <ellipse cx="11" cy="30.5" rx="2.2" ry="1.5" fill="#FF8A8A" />
      <ellipse cx="21" cy="30.5" rx="2.2" ry="1.5" fill="#FF8A8A" />
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
      <circle className="pet-tail" cx="8" cy="27" r="2.5" fill="#6D4C41" />
      {/* Body */}
      <ellipse cx="16" cy="24" rx="9" ry="7" fill="#8D6E63" />
      {/* Belly */}
      <ellipse cx="16" cy="24.5" rx="5.5" ry="4.5" fill="#D7CCC8" />
      {/* Left arm */}
      <ellipse cx="8" cy="24" rx="2" ry="2.5" fill="#6D4C41" />
      {/* Right arm */}
      <ellipse cx="24" cy="24" rx="2" ry="2.5" fill="#6D4C41" />
      {/* Left round ear */}
      <g className="pet-ear-left">
        <circle cx="8.5" cy="4.5" r="3.5" fill="#6D4C41" />
      </g>
      {/* Right round ear */}
      <g className="pet-ear-right">
        <circle cx="23.5" cy="4.5" r="3.5" fill="#6D4C41" />
      </g>
      {/* Head */}
      <circle cx="16" cy="13" r="10" fill="#8D6E63" />
      {/* Snout */}
      <ellipse cx="16" cy="14.5" rx="3.5" ry="2.2" fill="#D7CCC8" />
      {/* Cheeks */}
      <ellipse cx="9" cy="15" rx="1.8" ry="0.9" fill="#FFB6C1" opacity="0.3" />
      <ellipse cx="23" cy="15" rx="1.8" ry="0.9" fill="#FFB6C1" opacity="0.3" />
      {/* Nose */}
      <ellipse cx="16" cy="13.5" rx="1.2" ry="0.8" fill="#333" />
      {/* Feet */}
      <ellipse cx="11" cy="30.5" rx="2.2" ry="1.5" fill="#6D4C41" />
      <ellipse cx="21" cy="30.5" rx="2.2" ry="1.5" fill="#6D4C41" />
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
