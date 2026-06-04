import type { PetType } from "./pet-types";

interface PetDefinition {
  viewBox: string;
  faceTransform?: string;
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

/* ─── CAT ─── Orange tabby with whiskers ─── */
const catPet: PetDefinition = {
  viewBox: "0 0 48 48",
  faceTransform: "translate(8 6)",
  body: (
    <>
      {/* Ground shadow */}
      <rect x="12" y="42" width="24" height="3" rx="1.5" fill="#A85318" opacity="0.22" />

      {/* Blocky tail */}
      <g className="pet-tail">
        <rect x="5" y="27" width="5" height="13" fill="#C46A1F" />
        <rect x="7" y="23" width="5" height="5" fill="#D97724" />
        <rect x="10" y="20" width="5" height="5" fill="#E9852B" />
        <rect x="14" y="22" width="4" height="5" fill="#D97724" />
        <rect x="7" y="39" width="7" height="4" fill="#B85F1C" />
      </g>

      {/* Feet behind body */}
      <rect x="12" y="37" width="8" height="6" rx="2" fill="#FFF0CF" stroke="#B85F1C" strokeWidth="1" />
      <rect x="28" y="37" width="8" height="6" rx="2" fill="#FFF0CF" stroke="#B85F1C" strokeWidth="1" />

      {/* Sitting body */}
      <rect x="13" y="25" width="22" height="17" rx="8" fill="#F58A2A" stroke="#B85F1C" strokeWidth="1.4" />
      <rect x="17" y="29" width="14" height="12" rx="6" fill="#FFF0CF" />

      {/* Ears behind head */}
      <g className="pet-ear-left">
        <path d="M11 12 L14 2 L21 12 Z" fill="#F58A2A" stroke="#B85F1C" strokeWidth="1.4" strokeLinejoin="miter" />
        <path d="M14 10 L16 5 L19 10 Z" fill="#FFB3B3" />
      </g>
      <g className="pet-ear-right">
        <path d="M27 12 L34 2 L37 12 Z" fill="#F58A2A" stroke="#B85F1C" strokeWidth="1.4" strokeLinejoin="miter" />
        <path d="M30 10 L33 5 L35 10 Z" fill="#FFB3B3" />
      </g>

      {/* Head with stepped silhouette */}
      <path d="M14 9 H34 V12 H38 V26 H35 V30 H29 V32 H19 V30 H13 V26 H10 V12 H14 Z" fill="#F58A2A" stroke="#B85F1C" strokeWidth="1.4" strokeLinejoin="miter" />

      {/* Paws in front */}
      <rect x="10" y="26" width="7" height="5" rx="2" fill="#F6A044" stroke="#B85F1C" strokeWidth="1" />
      <rect x="31" y="26" width="7" height="5" rx="2" fill="#F6A044" stroke="#B85F1C" strokeWidth="1" />

      {/* Cheek pixels */}
      <rect x="13" y="21" width="4" height="2" rx="1" fill="#FFB3B3" opacity="0.55" />
      <rect x="31" y="21" width="4" height="2" rx="1" fill="#FFB3B3" opacity="0.55" />

      {/* Pixel nose */}
      <path d="M22 18 H26 L24 21 Z" fill="#D98586" />

      {/* Whiskers */}
      <rect x="6" y="18" width="8" height="1" fill="#B85F1C" />
      <rect x="7" y="22" width="8" height="1" fill="#B85F1C" />
      <rect x="34" y="18" width="8" height="1" fill="#B85F1C" />
      <rect x="33" y="22" width="8" height="1" fill="#B85F1C" />

      {/* Tabby stripes */}
      <rect x="21" y="9" width="2" height="5" rx="0.5" fill="#B85F1C" />
      <rect x="25" y="9" width="2" height="5" rx="0.5" fill="#B85F1C" />
      <path d="M24 9 H26 V11 H25 V14 H23 V11 H22 V9 Z" fill="#B85F1C" opacity="0.85" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Bubble tea, tucked into paw */}
      <rect x="30" y="26" width="9" height="13" rx="2" fill="#8FD0E8" stroke="#5CA7C2" strokeWidth="1.2" />
      <rect x="29" y="24" width="11" height="4" rx="2" fill="#72BBD6" />
      <rect x="35" y="18" width="3" height="8" rx="1.5" fill="#E86B75" />
      <rect x="32" y="34" width="3" height="3" rx="1" fill="#5D3518" />
      <rect x="36" y="33" width="2" height="2" rx="1" fill="#5D3518" />
      <rect x="35" y="36" width="3" height="3" rx="1" fill="#5D3518" />
      <rect x="32" y="29" width="3" height="3" rx="1" fill="#5D3518" />
    </>
  ),
};

/* ─── OTTER ─── Warm brown with buck teeth ─── */
const otterPet: PetDefinition = {
  viewBox: "0 0 32 36",
  body: (
    <>
      {/* Tail */}
      <path className="pet-tail" d="M9 28 C4 29 1 26 2 22 C3 19 5 18 6 20" stroke="#6B5340" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Body */}
      <ellipse cx="16" cy="25" rx="8.5" ry="6.5" fill="#A0826D" stroke="#6B5340" strokeWidth="1" />
      {/* Belly */}
      <ellipse cx="16" cy="25.5" rx="5.5" ry="4.2" fill="#DCC4A8" />
      {/* Left arm */}
      <ellipse cx="8.5" cy="25" rx="2.2" ry="2.8" fill="#8B7355" stroke="#6B5340" strokeWidth="0.8" />
      {/* Right arm */}
      <ellipse cx="23.5" cy="25" rx="2.2" ry="2.8" fill="#8B7355" stroke="#6B5340" strokeWidth="0.8" />
      {/* Feet */}
      <ellipse cx="10.5" cy="30.5" rx="2.5" ry="1.6" fill="#8B7355" stroke="#6B5340" strokeWidth="0.8" />
      <ellipse cx="21.5" cy="30.5" rx="2.5" ry="1.6" fill="#8B7355" stroke="#6B5340" strokeWidth="0.8" />
      {/* Left ear */}
      <g className="pet-ear-left">
        <circle cx="8" cy="4" r="3.5" fill="#A0826D" stroke="#6B5340" strokeWidth="0.8" />
        <circle cx="8" cy="4" r="2" fill="#FFB6C1" />
      </g>
      {/* Right ear */}
      <g className="pet-ear-right">
        <circle cx="24" cy="4" r="3.5" fill="#A0826D" stroke="#6B5340" strokeWidth="0.8" />
        <circle cx="24" cy="4" r="2" fill="#FFB6C1" />
      </g>
      {/* Head */}
      <circle cx="16" cy="12" r="10" fill="#A0826D" stroke="#6B5340" strokeWidth="1" />
      {/* Face lighter area */}
      <ellipse cx="16" cy="14" rx="5.5" ry="3.5" fill="#DCC4A8" />
      {/* Cheeks */}
      <ellipse cx="8.5" cy="14" rx="2" ry="1" fill="#FFB6C1" opacity="0.45" />
      <ellipse cx="23.5" cy="14" rx="2" ry="1" fill="#FFB6C1" opacity="0.45" />
      {/* Nose */}
      <ellipse cx="16" cy="12.5" rx="1.8" ry="1.2" fill="#4A3728" />
      {/* Buck teeth */}
      <rect x="14.5" y="15" width="1.3" height="1.8" rx="0.4" fill="#FFF" stroke="#DDD" strokeWidth="0.3" />
      <rect x="16.2" y="15" width="1.3" height="1.8" rx="0.4" fill="#FFF" stroke="#DDD" strokeWidth="0.3" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Fish */}
      <ellipse cx="27" cy="25" rx="3.5" ry="2" fill="#87CEEB" stroke="#5BA4C9" strokeWidth="0.8" />
      <path d="M30.5 25 L33 22.5 L33 27.5 Z" fill="#87CEEB" stroke="#5BA4C9" strokeWidth="0.8" strokeLinejoin="round" />
      <circle cx="25.5" cy="24.2" r="0.7" fill="#2C3E50" />
      {/* Fish scale lines */}
      <path d="M27 23.5 Q28 25 27 26.5" stroke="#5BA4C9" strokeWidth="0.5" fill="none" />
    </>
  ),
};

/* ─── DOG ─── Golden retriever with floppy ears ─── */
const dogPet: PetDefinition = {
  viewBox: "0 0 32 36",
  body: (
    <>
      {/* Tail */}
      <path className="pet-tail" d="M9 27 C4 25 2 21 4 18" stroke="#A07830" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      {/* Body */}
      <ellipse cx="16" cy="25" rx="8.5" ry="6.5" fill="#DEB887" stroke="#A07830" strokeWidth="1" />
      {/* Chest tuft */}
      <ellipse cx="16" cy="21" rx="4" ry="3" fill="#F5DEB3" />
      {/* Left arm */}
      <ellipse cx="9" cy="25.5" rx="2.2" ry="2.8" fill="#C49A6C" stroke="#A07830" strokeWidth="0.8" />
      {/* Right arm */}
      <ellipse cx="23" cy="25.5" rx="2.2" ry="2.8" fill="#C49A6C" stroke="#A07830" strokeWidth="0.8" />
      {/* Feet */}
      <ellipse cx="10.5" cy="30.5" rx="2.5" ry="1.6" fill="#C49A6C" stroke="#A07830" strokeWidth="0.8" />
      <ellipse cx="21.5" cy="30.5" rx="2.5" ry="1.6" fill="#C49A6C" stroke="#A07830" strokeWidth="0.8" />
      {/* Left floppy ear */}
      <g className="pet-ear-left">
        <path d="M6 4 C3 4 2 9 3 13 C4 16 7 16 8 13 C9 9 8 4 6 4 Z" fill="#C49A6C" stroke="#A07830" strokeWidth="0.8" />
      </g>
      {/* Right floppy ear */}
      <g className="pet-ear-right">
        <path d="M26 4 C29 4 30 9 29 13 C28 16 25 16 24 13 C23 9 24 4 26 4 Z" fill="#C49A6C" stroke="#A07830" strokeWidth="0.8" />
      </g>
      {/* Head */}
      <circle cx="16" cy="12" r="10" fill="#DEB887" stroke="#A07830" strokeWidth="1" />
      {/* Snout */}
      <ellipse cx="16" cy="14.5" rx="4.5" ry="3" fill="#F5DEB3" />
      {/* Cheeks */}
      <ellipse cx="8.5" cy="14" rx="2" ry="1" fill="#FFB6C1" opacity="0.35" />
      <ellipse cx="23.5" cy="14" rx="2" ry="1" fill="#FFB6C1" opacity="0.35" />
      {/* Nose */}
      <ellipse cx="16" cy="13" rx="1.8" ry="1.3" fill="#333" />
      {/* Nose highlight */}
      <ellipse cx="15.5" cy="12.5" rx="0.6" ry="0.4" fill="#555" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Bone */}
      <rect x="24" y="22" width="6" height="2.8" rx="1.4" fill="#FFF8E7" stroke="#D4C4A0" strokeWidth="0.6" />
      <circle cx="24" cy="22" r="1.8" fill="#FFF8E7" stroke="#D4C4A0" strokeWidth="0.6" />
      <circle cx="24" cy="24.8" r="1.8" fill="#FFF8E7" stroke="#D4C4A0" strokeWidth="0.6" />
      <circle cx="30" cy="22" r="1.8" fill="#FFF8E7" stroke="#D4C4A0" strokeWidth="0.6" />
      <circle cx="30" cy="24.8" r="1.8" fill="#FFF8E7" stroke="#D4C4A0" strokeWidth="0.6" />
    </>
  ),
};

/* ─── FOX ─── Orange-red with bushy tail ─── */
const foxPet: PetDefinition = {
  viewBox: "0 0 32 36",
  body: (
    <>
      {/* Bushy tail */}
      <g className="pet-tail">
        <path d="M8 28 C3 28 0 24 2 19 C3 16 5 15 6 17" stroke="#C04A10" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M3 20 C1 18 1 15 3 13" stroke="#FFF3E0" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
      {/* Body */}
      <ellipse cx="16" cy="25" rx="8.5" ry="6.5" fill="#FF7B2E" stroke="#C04A10" strokeWidth="1" />
      {/* Belly */}
      <ellipse cx="16" cy="26" rx="5.5" ry="4.2" fill="#FFF3E0" />
      {/* Left arm */}
      <ellipse cx="8.5" cy="25" rx="2" ry="2.6" fill="#E8601C" stroke="#C04A10" strokeWidth="0.8" />
      {/* Right arm */}
      <ellipse cx="23.5" cy="25" rx="2" ry="2.6" fill="#E8601C" stroke="#C04A10" strokeWidth="0.8" />
      {/* Feet */}
      <ellipse cx="10.5" cy="30.5" rx="2.3" ry="1.6" fill="#E8601C" stroke="#C04A10" strokeWidth="0.8" />
      <ellipse cx="21.5" cy="30.5" rx="2.3" ry="1.6" fill="#E8601C" stroke="#C04A10" strokeWidth="0.8" />
      {/* Left pointed ear */}
      <g className="pet-ear-left">
        <path d="M6 5 L9 -1 L13 4 Z" fill="#FF7B2E" stroke="#C04A10" strokeWidth="1" strokeLinejoin="round" />
        <path d="M8 4 L9.5 0 L11.5 3.5 Z" fill="#333" />
      </g>
      {/* Right pointed ear */}
      <g className="pet-ear-right">
        <path d="M26 5 L23 -1 L19 4 Z" fill="#FF7B2E" stroke="#C04A10" strokeWidth="1" strokeLinejoin="round" />
        <path d="M24 4 L22.5 0 L20.5 3.5 Z" fill="#333" />
      </g>
      {/* Head */}
      <circle cx="16" cy="12" r="10" fill="#FF7B2E" stroke="#C04A10" strokeWidth="1" />
      {/* White face mask */}
      <path d="M10 12 Q16 8 22 12 Q20 18 16 19 Q12 18 10 12 Z" fill="#FFF3E0" />
      {/* Cheeks */}
      <ellipse cx="8.5" cy="14" rx="2" ry="1" fill="#FFB6C1" opacity="0.4" />
      <ellipse cx="23.5" cy="14" rx="2" ry="1" fill="#FFB6C1" opacity="0.4" />
      {/* Nose */}
      <ellipse cx="16" cy="13" rx="1.5" ry="1" fill="#2C2C2C" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Autumn leaf */}
      <path d="M26 18 Q29 14 32 18 Q29 22 26 18" fill="#E86830" stroke="#C04A10" strokeWidth="0.6" />
      <path d="M28 16 Q31 12 34 16 Q31 20 28 16" fill="#FF9800" stroke="#E86830" strokeWidth="0.5" />
      <line x1="27" y1="18" x2="30" y2="15" stroke="#C04A10" strokeWidth="0.5" />
    </>
  ),
};

/* ─── PENGUIN ─── Classic black/white with orange accents ─── */
const penguinPet: PetDefinition = {
  viewBox: "0 0 32 36",
  body: (
    <>
      {/* Body */}
      <ellipse cx="16" cy="25" rx="8.5" ry="6.5" fill="#2C3E50" stroke="#1A252F" strokeWidth="1" />
      {/* White belly */}
      <ellipse cx="16" cy="25" rx="5.8" ry="5.5" fill="#F0F4F8" />
      {/* Left flipper */}
      <path d="M7 21 C4 23 4 27 7 28 C8.5 27 8 23 7 21 Z" fill="#2C3E50" stroke="#1A252F" strokeWidth="0.8" />
      {/* Right flipper */}
      <path d="M25 21 C28 23 28 27 25 28 C23.5 27 24 23 25 21 Z" fill="#2C3E50" stroke="#1A252F" strokeWidth="0.8" />
      {/* Left ear tuft */}
      <g className="pet-ear-left">
        <ellipse cx="9" cy="3.5" rx="2.5" ry="2.2" fill="#2C3E50" stroke="#1A252F" strokeWidth="0.6" />
      </g>
      {/* Right ear tuft */}
      <g className="pet-ear-right">
        <ellipse cx="23" cy="3.5" rx="2.5" ry="2.2" fill="#2C3E50" stroke="#1A252F" strokeWidth="0.6" />
      </g>
      {/* Head */}
      <circle cx="16" cy="12" r="10" fill="#2C3E50" stroke="#1A252F" strokeWidth="1" />
      {/* White face */}
      <ellipse cx="16" cy="13" rx="6.5" ry="5.5" fill="#F0F4F8" />
      {/* Cheeks */}
      <ellipse cx="11" cy="14" rx="1.8" ry="1" fill="#FFB6C1" opacity="0.45" />
      <ellipse cx="21" cy="14" rx="1.8" ry="1" fill="#FFB6C1" opacity="0.45" />
      {/* Beak */}
      <path d="M13.5 13 L16 15.5 L18.5 13 Z" fill="#FFB347" stroke="#E89520" strokeWidth="0.6" strokeLinejoin="round" />
      {/* Feet */}
      <ellipse cx="10.5" cy="30.8" rx="2.8" ry="1.3" fill="#FFB347" stroke="#E89520" strokeWidth="0.6" />
      <ellipse cx="21.5" cy="30.8" rx="2.8" ry="1.3" fill="#FFB347" stroke="#E89520" strokeWidth="0.6" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Ice cream cone */}
      <path d="M25 22 L23.5 30 L28.5 30 Z" fill="#DEB887" stroke="#C49A6C" strokeWidth="0.6" />
      <circle cx="26" cy="20.5" r="3" fill="#FFB6C1" stroke="#E89CAD" strokeWidth="0.6" />
      <circle cx="24" cy="19.5" r="2.2" fill="#87CEEB" stroke="#6BAFE0" strokeWidth="0.6" />
      {/* Sprinkle */}
      <rect x="25" y="18.5" width="1" height="0.4" fill="#FF6B6B" transform="rotate(30 25 18.5)" />
      <rect x="27" y="19" width="1" height="0.4" fill="#4CAF50" transform="rotate(-20 27 19)" />
    </>
  ),
};

/* ─── BUNNY ─── Soft white with pink accents ─── */
const bunnyPet: PetDefinition = {
  viewBox: "0 0 32 38",
  body: (
    <>
      {/* Tail (fluffy pom) */}
      <circle className="pet-tail" cx="7" cy="27" r="3.5" fill="#FAFAFA" stroke="#D0D0D0" strokeWidth="0.8" />
      <circle cx="7" cy="26.5" r="2" fill="#FFF" />
      {/* Body */}
      <ellipse cx="16" cy="25" rx="8.5" ry="6.5" fill="#FAFAFA" stroke="#D0D0D0" strokeWidth="1" />
      {/* Belly */}
      <ellipse cx="16" cy="26" rx="5" ry="4" fill="#FFF" />
      {/* Left arm */}
      <ellipse cx="8.5" cy="25" rx="2.2" ry="2.6" fill="#F0F0F0" stroke="#D0D0D0" strokeWidth="0.8" />
      {/* Right arm */}
      <ellipse cx="23.5" cy="25" rx="2.2" ry="2.6" fill="#F0F0F0" stroke="#D0D0D0" strokeWidth="0.8" />
      {/* Feet */}
      <ellipse cx="10.5" cy="31" rx="2.8" ry="1.6" fill="#F0F0F0" stroke="#D0D0D0" strokeWidth="0.8" />
      <ellipse cx="21.5" cy="31" rx="2.8" ry="1.6" fill="#F0F0F0" stroke="#D0D0D0" strokeWidth="0.8" />
      {/* Left long ear */}
      <g className="pet-ear-left">
        <rect x="8" y="-1" width="3.8" height="11" rx="1.9" fill="#FAFAFA" stroke="#D0D0D0" strokeWidth="0.8" />
        <rect x="9.2" y="0.5" width="1.4" height="8" rx="0.7" fill="#FFB6C1" />
      </g>
      {/* Right long ear */}
      <g className="pet-ear-right">
        <rect x="20.2" y="-1" width="3.8" height="11" rx="1.9" fill="#FAFAFA" stroke="#D0D0D0" strokeWidth="0.8" />
        <rect x="21.4" y="0.5" width="1.4" height="8" rx="0.7" fill="#FFB6C1" />
      </g>
      {/* Head */}
      <circle cx="16" cy="13" r="9.8" fill="#FAFAFA" stroke="#D0D0D0" strokeWidth="1" />
      {/* Cheeks */}
      <ellipse cx="8.5" cy="15" rx="2.2" ry="1.2" fill="#FFB6C1" opacity="0.5" />
      <ellipse cx="23.5" cy="15" rx="2.2" ry="1.2" fill="#FFB6C1" opacity="0.5" />
      {/* Nose */}
      <ellipse cx="16" cy="14.5" rx="1.2" ry="0.9" fill="#FFB6C1" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Carrot */}
      <path d="M26 22 L24.5 30 L27.5 30 Z" fill="#FF8C42" stroke="#E06B20" strokeWidth="0.6" />
      {/* Carrot leaves */}
      <path d="M25 22 Q26 18 27 22" fill="#4CAF50" />
      <path d="M24 21 Q26 16 28 21" fill="#66BB6A" />
      <path d="M26 22 Q27 17 28.5 21" fill="#81C784" />
    </>
  ),
};

/* ─── PANDA ─── Black and white with beanie hat ─── */
const pandaPet: PetDefinition = {
  viewBox: "0 0 32 36",
  body: (
    <>
      {/* Tiny tail */}
      <circle className="pet-tail" cx="7" cy="27" r="2.5" fill="#2C3E50" stroke="#1A252F" strokeWidth="0.8" />
      {/* Body */}
      <ellipse cx="16" cy="25" rx="8.5" ry="6.5" fill="#2C3E50" stroke="#1A252F" strokeWidth="1" />
      {/* White chest patch */}
      <path d="M 11 20 C 10 22 11 23 10.5 25 C 10 27 11 28 12 29 C 14 30.5 18 30.5 20 29 C 21 28 22 27 21.5 25 C 21 23 22 22 21 20 Z" fill="#F5F5F5" />
      {/* Left arm */}
      <path d="M 7 20 C 5.5 23 6 26 9 27 C 10 26 9.5 22 8 20 Z" fill="#2C3E50" stroke="#1A252F" strokeWidth="0.8" />
      {/* Right arm */}
      <path d="M 25 20 C 26.5 23 26 26 23 27 C 22 26 22.5 22 24 20 Z" fill="#2C3E50" stroke="#1A252F" strokeWidth="0.8" />
      {/* Left round ear */}
      <g className="pet-ear-left">
        <circle cx="6.5" cy="7.5" r="4.5" fill="#2C3E50" stroke="#1A252F" strokeWidth="0.8" />
      </g>
      {/* Right round ear */}
      <g className="pet-ear-right">
        <circle cx="25.5" cy="7.5" r="4.5" fill="#2C3E50" stroke="#1A252F" strokeWidth="0.8" />
      </g>
      {/* Head */}
      <ellipse cx="16" cy="13" rx="10.5" ry="8.5" fill="#F5F5F5" stroke="#D0D0D0" strokeWidth="1" />
      {/* Beanie Hat */}
      <path d="M 7 8 C 7 2 25 1.5 25 8 C 27 5 25 1 20 0.3 C 15 -0.2 9 2 7 8 Z" fill="#5C6BC0" stroke="#3F51B5" strokeWidth="0.8" />
      {/* Beanie brim */}
      <ellipse cx="16" cy="8" rx="9.2" ry="2.5" fill="#7986CB" stroke="#5C6BC0" strokeWidth="0.6" />
      {/* Beanie pom */}
      <circle cx="22" cy="0.5" r="2.5" fill="#E8EAF6" stroke="#C5CAE9" strokeWidth="0.5" />
      {/* Left eye patch */}
      <ellipse cx="11.5" cy="11.5" rx="3.2" ry="2.5" fill="#2C3E50" transform="rotate(-10 11.5 11.5)" />
      {/* Right eye patch */}
      <ellipse cx="20.5" cy="11.5" rx="3.2" ry="2.5" fill="#2C3E50" transform="rotate(10 20.5 11.5)" />
      {/* Cheeks */}
      <ellipse cx="8" cy="14.5" rx="2" ry="1" fill="#FFB6C1" opacity="0.45" />
      <ellipse cx="24" cy="14.5" rx="2" ry="1" fill="#FFB6C1" opacity="0.45" />
      {/* Nose */}
      <ellipse cx="16" cy="13.8" rx="1.5" ry="1" fill="#2C3E50" />
      {/* Feet with toe beans */}
      <g>
        <circle cx="11" cy="29.5" r="3.5" fill="#2C3E50" stroke="#1A252F" strokeWidth="0.6" />
        <circle cx="9.2" cy="27.5" r="0.8" fill="#FFB6C1" />
        <circle cx="11" cy="26.5" r="0.8" fill="#FFB6C1" />
        <circle cx="12.8" cy="27.5" r="0.8" fill="#FFB6C1" />
        <circle cx="21" cy="29.5" r="3.5" fill="#2C3E50" stroke="#1A252F" strokeWidth="0.6" />
        <circle cx="19.2" cy="27.5" r="0.8" fill="#FFB6C1" />
        <circle cx="21" cy="26.5" r="0.8" fill="#FFB6C1" />
        <circle cx="22.8" cy="27.5" r="0.8" fill="#FFB6C1" />
      </g>
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Bamboo stick */}
      <rect x="26" y="18" width="1.8" height="13" rx="0.9" fill="#4CAF50" stroke="#388E3C" strokeWidth="0.6" />
      {/* Bamboo segments */}
      <line x1="26" y1="22" x2="27.8" y2="22" stroke="#388E3C" strokeWidth="0.8" />
      <line x1="26" y1="26" x2="27.8" y2="26" stroke="#388E3C" strokeWidth="0.8" />
      {/* Bamboo leaves */}
      <path d="M27.8 18 Q31 15 33 18 Q31 21 27.8 18" fill="#66BB6A" stroke="#4CAF50" strokeWidth="0.5" />
      <path d="M27.8 22 Q30.5 19 32 22 Q30.5 24 27.8 22" fill="#81C784" stroke="#66BB6A" strokeWidth="0.5" />
    </>
  ),
};

/* ─── KOALA ─── Soft grey with big fluffy ears ─── */
const koalaPet: PetDefinition = {
  viewBox: "0 0 32 36",
  body: (
    <>
      {/* Body */}
      <ellipse cx="16" cy="25" rx="8.5" ry="6.5" fill="#90A4AE" stroke="#607D8B" strokeWidth="1" />
      {/* Chest patch */}
      <ellipse cx="16" cy="25.5" rx="5.5" ry="4.2" fill="#ECEFF1" />
      {/* Left arm */}
      <ellipse cx="8.5" cy="25" rx="2" ry="2.5" fill="#78909C" stroke="#607D8B" strokeWidth="0.8" />
      {/* Right arm */}
      <ellipse cx="23.5" cy="25" rx="2" ry="2.5" fill="#78909C" stroke="#607D8B" strokeWidth="0.8" />
      {/* Feet */}
      <ellipse cx="10.5" cy="30.5" rx="2.3" ry="1.5" fill="#78909C" stroke="#607D8B" strokeWidth="0.8" />
      <ellipse cx="21.5" cy="30.5" rx="2.3" ry="1.5" fill="#78909C" stroke="#607D8B" strokeWidth="0.8" />
      {/* Left large furry ear */}
      <g className="pet-ear-left">
        <circle cx="7.5" cy="5" r="5.8" fill="#78909C" stroke="#607D8B" strokeWidth="0.8" />
        <circle cx="7.5" cy="5" r="3.8" fill="#ECEFF1" />
        {/* Fur tufts */}
        <circle cx="5" cy="3" r="1" fill="#90A4AE" />
        <circle cx="10" cy="3" r="0.8" fill="#90A4AE" />
      </g>
      {/* Right large furry ear */}
      <g className="pet-ear-right">
        <circle cx="24.5" cy="5" r="5.8" fill="#78909C" stroke="#607D8B" strokeWidth="0.8" />
        <circle cx="24.5" cy="5" r="3.8" fill="#ECEFF1" />
        <circle cx="22" cy="3" r="1" fill="#90A4AE" />
        <circle cx="27" cy="3" r="0.8" fill="#90A4AE" />
      </g>
      {/* Head */}
      <circle cx="16" cy="12" r="10" fill="#90A4AE" stroke="#607D8B" strokeWidth="1" />
      {/* Cheeks */}
      <ellipse cx="8.5" cy="14.5" rx="2" ry="1" fill="#FFB6C1" opacity="0.35" />
      <ellipse cx="23.5" cy="14.5" rx="2" ry="1" fill="#FFB6C1" opacity="0.35" />
      {/* Large nose */}
      <ellipse cx="16" cy="12.5" rx="2.8" ry="3.5" fill="#37474F" stroke="#263238" strokeWidth="0.6" />
      {/* Nose highlight */}
      <ellipse cx="15.2" cy="11" rx="1" ry="0.6" fill="#546E7A" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Eucalyptus branch */}
      <line x1="25" y1="25" x2="30" y2="18" stroke="#6D4C41" strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="30" cy="16.5" rx="2.8" ry="1.5" fill="#66BB6A" stroke="#4CAF50" strokeWidth="0.5" transform="rotate(-20 30 16.5)" />
      <ellipse cx="28" cy="20" rx="2.2" ry="1.2" fill="#81C784" stroke="#66BB6A" strokeWidth="0.5" transform="rotate(25 28 20)" />
      <ellipse cx="29.5" cy="19" rx="1.8" ry="1" fill="#A5D6A7" transform="rotate(-40 29.5 19)" />
    </>
  ),
};

/* ─── FROG ─── Bright green with big bulging eyes ─── */
const frogPet: PetDefinition = {
  viewBox: "0 0 32 36",
  body: (
    <>
      {/* Body */}
      <ellipse cx="16" cy="25" rx="8.5" ry="6.5" fill="#66BB6A" stroke="#388E3C" strokeWidth="1" />
      {/* Belly */}
      <ellipse cx="16" cy="26" rx="5.5" ry="4.5" fill="#C8E6C9" />
      {/* Left arm */}
      <path d="M8 23 C5 25 5.5 28 8 28.5 C9 27.5 8.5 24 8 23 Z" fill="#4CAF50" stroke="#388E3C" strokeWidth="0.8" />
      {/* Right arm */}
      <path d="M24 23 C27 25 26.5 28 24 28.5 C23 27.5 23.5 24 24 23 Z" fill="#4CAF50" stroke="#388E3C" strokeWidth="0.8" />
      {/* Feet (webbed) */}
      <path d="M8 30 L10 31.5 L12 30 L14 31.5 L13 29.5 L10 29.5 Z" fill="#4CAF50" stroke="#388E3C" strokeWidth="0.6" />
      <path d="M18 30 L20 31.5 L22 30 L24 31.5 L23 29.5 L20 29.5 Z" fill="#4CAF50" stroke="#388E3C" strokeWidth="0.6" />
      {/* Left eye bulge */}
      <g className="pet-ear-left">
        <circle cx="9" cy="4.5" r="5" fill="#66BB6A" stroke="#388E3C" strokeWidth="0.8" />
      </g>
      {/* Right eye bulge */}
      <g className="pet-ear-right">
        <circle cx="23" cy="4.5" r="5" fill="#66BB6A" stroke="#388E3C" strokeWidth="0.8" />
      </g>
      {/* Head */}
      <circle cx="16" cy="13" r="9.5" fill="#66BB6A" stroke="#388E3C" strokeWidth="1" />
      {/* Cheeks */}
      <ellipse cx="8.5" cy="14" rx="2.2" ry="1.2" fill="#FF8A8A" opacity="0.45" />
      <ellipse cx="23.5" cy="14" rx="2.2" ry="1.2" fill="#FF8A8A" opacity="0.45" />
      {/* Belly spots on head */}
      <circle cx="12" cy="16" r="0.8" fill="#81C784" opacity="0.5" />
      <circle cx="20" cy="15.5" r="0.6" fill="#81C784" opacity="0.5" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Mushroom */}
      <path d="M24 24 A5 5 0 0 1 32 24 Z" fill="#E53935" stroke="#C62828" strokeWidth="0.6" />
      <circle cx="26" cy="22" r="0.8" fill="#FFF" opacity="0.8" />
      <circle cx="29.5" cy="23" r="0.6" fill="#FFF" opacity="0.8" />
      <circle cx="27.5" cy="21" r="0.5" fill="#FFF" opacity="0.6" />
      <rect x="27" y="24" width="3" height="5.5" rx="1.2" fill="#ECEFF1" stroke="#CFD8DC" strokeWidth="0.5" />
    </>
  ),
};

/* ─── AXOLOTL ─── Pink with external gills ─── */
const axolotlPet: PetDefinition = {
  viewBox: "0 0 32 36",
  body: (
    <>
      {/* Tail */}
      <path className="pet-tail" d="M9 28 C4 29 1 26 2 22 C3 19 5 17 7 19" stroke="#E86B8A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Tail fin */}
      <path d="M3 22 C1 20 1 17 3 16" stroke="#FF8AAB" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Body */}
      <ellipse cx="16" cy="25" rx="8.5" ry="6.5" fill="#FFB6C1" stroke="#E86B8A" strokeWidth="1" />
      {/* Belly */}
      <ellipse cx="16" cy="26" rx="5.5" ry="4.2" fill="#FFE0E9" />
      {/* Belly spots (axolotl speckles) */}
      <circle cx="14" cy="24" r="0.5" fill="#FF8AAB" opacity="0.5" />
      <circle cx="18" cy="25" r="0.4" fill="#FF8AAB" opacity="0.5" />
      <circle cx="15.5" cy="27" r="0.3" fill="#FF8AAB" opacity="0.5" />
      {/* Left arm */}
      <path d="M8 23 C5 25 5.5 28 8 28.5 C9 27 8.5 24 8 23 Z" fill="#FF8A8A" stroke="#E86B8A" strokeWidth="0.8" />
      {/* Right arm */}
      <path d="M24 23 C27 25 26.5 28 24 28.5 C23 27 23.5 24 24 23 Z" fill="#FF8A8A" stroke="#E86B8A" strokeWidth="0.8" />
      {/* Feet */}
      <ellipse cx="10.5" cy="30.5" rx="2.3" ry="1.5" fill="#FF8A8A" stroke="#E86B8A" strokeWidth="0.8" />
      <ellipse cx="21.5" cy="30.5" rx="2.3" ry="1.5" fill="#FF8A8A" stroke="#E86B8A" strokeWidth="0.8" />
      {/* Left gills */}
      <g className="pet-gills-left">
        <path d="M6 6 C2 5 1 7.5 3 9" stroke="#FF69B4" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M5 9.5 C1 8.5 0 11 2 12.5" stroke="#FF69B4" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M6 13 C2 12 1 14.5 3 16" stroke="#FF69B4" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Gill tips */}
        <circle cx="3" cy="9" r="1" fill="#FF1493" opacity="0.6" />
        <circle cx="2" cy="12.5" r="1" fill="#FF1493" opacity="0.6" />
        <circle cx="3" cy="16" r="1" fill="#FF1493" opacity="0.6" />
      </g>
      {/* Right gills */}
      <g className="pet-gills-right">
        <path d="M26 6 C30 5 31 7.5 29 9" stroke="#FF69B4" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M27 9.5 C31 8.5 32 11 30 12.5" stroke="#FF69B4" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M26 13 C30 12 31 14.5 29 16" stroke="#FF69B4" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="29" cy="9" r="1" fill="#FF1493" opacity="0.6" />
        <circle cx="30" cy="12.5" r="1" fill="#FF1493" opacity="0.6" />
        <circle cx="29" cy="16" r="1" fill="#FF1493" opacity="0.6" />
      </g>
      {/* Head */}
      <ellipse cx="16" cy="12" rx="10" ry="8.5" fill="#FFB6C1" stroke="#E86B8A" strokeWidth="1" />
      {/* Cheeks */}
      <ellipse cx="9" cy="14" rx="2.2" ry="1.2" fill="#FF69B4" opacity="0.45" />
      <ellipse cx="23" cy="14" rx="2.2" ry="1.2" fill="#FF69B4" opacity="0.45" />
      {/* Head spots */}
      <circle cx="12" cy="8" r="0.6" fill="#FF8AAB" opacity="0.4" />
      <circle cx="20" cy="7.5" r="0.5" fill="#FF8AAB" opacity="0.4" />
      <circle cx="16" cy="6.5" r="0.4" fill="#FF8AAB" opacity="0.4" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Glowing bubble */}
      <circle cx="28" cy="22" r="3.8" fill="#E0F7FA" opacity="0.7" stroke="#80DEEA" strokeWidth="0.8" />
      <circle cx="28" cy="22" r="2.5" fill="#B2EBF2" opacity="0.4" />
      <circle cx="26.5" cy="20.5" r="1" fill="#FFF" opacity="0.7" />
      <circle cx="29" cy="20" r="0.5" fill="#FFF" opacity="0.5" />
    </>
  ),
};

/* ─── BEAR ─── Rich brown with honey pot ─── */
const bearPet: PetDefinition = {
  viewBox: "0 0 32 36",
  body: (
    <>
      {/* Tiny tail */}
      <circle className="pet-tail" cx="8" cy="27.5" r="2.5" fill="#5D4037" stroke="#3E2723" strokeWidth="0.8" />
      {/* Body */}
      <ellipse cx="16" cy="25" rx="8.5" ry="6.5" fill="#8D6E63" stroke="#5D4037" strokeWidth="1" />
      {/* Belly */}
      <ellipse cx="16" cy="25.5" rx="5.5" ry="4.2" fill="#D7CCC8" />
      {/* Left arm */}
      <ellipse cx="8.5" cy="25" rx="2.2" ry="2.6" fill="#6D4C41" stroke="#5D4037" strokeWidth="0.8" />
      {/* Right arm */}
      <ellipse cx="23.5" cy="25" rx="2.2" ry="2.6" fill="#6D4C41" stroke="#5D4037" strokeWidth="0.8" />
      {/* Feet */}
      <ellipse cx="10.5" cy="30.5" rx="2.5" ry="1.6" fill="#6D4C41" stroke="#5D4037" strokeWidth="0.8" />
      <ellipse cx="21.5" cy="30.5" rx="2.5" ry="1.6" fill="#6D4C41" stroke="#5D4037" strokeWidth="0.8" />
      {/* Left round ear */}
      <g className="pet-ear-left">
        <circle cx="8" cy="4" r="3.8" fill="#6D4C41" stroke="#5D4037" strokeWidth="0.8" />
        <circle cx="8" cy="4" r="2.2" fill="#D7CCC8" />
      </g>
      {/* Right round ear */}
      <g className="pet-ear-right">
        <circle cx="24" cy="4" r="3.8" fill="#6D4C41" stroke="#5D4037" strokeWidth="0.8" />
        <circle cx="24" cy="4" r="2.2" fill="#D7CCC8" />
      </g>
      {/* Head */}
      <circle cx="16" cy="12" r="10" fill="#8D6E63" stroke="#5D4037" strokeWidth="1" />
      {/* Snout */}
      <ellipse cx="16" cy="14" rx="4" ry="2.8" fill="#D7CCC8" />
      {/* Cheeks */}
      <ellipse cx="8.5" cy="14.5" rx="2" ry="1" fill="#FFB6C1" opacity="0.3" />
      <ellipse cx="23.5" cy="14.5" rx="2" ry="1" fill="#FFB6C1" opacity="0.3" />
      {/* Nose */}
      <ellipse cx="16" cy="13" rx="1.8" ry="1.3" fill="#3E2723" />
      {/* Nose highlight */}
      <ellipse cx="15.3" cy="12.5" rx="0.6" ry="0.4" fill="#5D4037" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Honey pot */}
      <rect x="24" y="21" width="7" height="8.5" rx="2" fill="#FFB300" stroke="#FF8F00" strokeWidth="0.8" />
      {/* Pot lid */}
      <rect x="23" y="19.5" width="9" height="2.5" rx="1.2" fill="#FF8F00" stroke="#E65100" strokeWidth="0.6" />
      {/* Lid knob */}
      <circle cx="27.5" cy="19" r="1.2" fill="#FF8F00" stroke="#E65100" strokeWidth="0.5" />
      {/* Honey drip */}
      <path d="M28 21 C28.5 22 29 22.5 28.5 23" stroke="#FFC107" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* Label */}
      <rect x="25.5" y="24.5" width="4" height="2.5" rx="0.5" fill="#FFF8E1" />
      <text x="27.5" y="26.2" textAnchor="middle" fontSize="2" fill="#FF8F00" fontWeight="bold">🍯</text>
    </>
  ),
};
