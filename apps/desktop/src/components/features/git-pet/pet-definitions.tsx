import type { PetType } from "./pet-types";

interface PetDefinition {
  viewBox: string;
  faceTransform?: string;
  usesCustomFace?: boolean;
  spriteSheets?: {
    idle: PetSpriteSheet;
    wave?: PetSpriteSheet;
    eating?: PetSpriteSheet;
    frameWidth: number;
    frameHeight: number;
    sheetHeight?: number;
    scale?: number;
  };
  body: React.ReactNode;
  face: React.ReactNode;
  mouth: React.ReactNode;
  accessories: React.ReactNode;
}

interface PetSpriteSheet {
  src: string;
  frames: number;
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
    case "goldenRetriever":
      return goldenRetrieverPet;
    case "mushroom":
      return mushroomPet;
    case "koala":
      return koalaPet;
    case "frog":
      return frogPet;
    case "axolotl":
      return axolotlPet;
    case "bear":
      return bearPet;
    case "piderman":
      return pidermanPet;
    default:
      return catPet;
  }
}

/* ─── Shared pixel face & mouth states ─── */
function PixelFace({ eyeColor = "#343B45" }: { eyeColor?: string }) {
  return (
    <>
      <g className="face-normal">
        <path d="M17 16 H21 V17 H22 V20 H21 V21 H17 V20 H16 V17 H17 Z" fill={eyeColor} />
        <path d="M27 16 H31 V17 H32 V20 H31 V21 H27 V20 H26 V17 H27 Z" fill={eyeColor} />
        <rect x="18" y="17" width="1.6" height="1.6" fill="#FFFFFF" />
        <rect x="20" y="20" width="1" height="1" fill="#586371" opacity="0.7" />
        <rect x="28" y="17" width="1.6" height="1.6" fill="#FFFFFF" />
        <rect x="30" y="20" width="1" height="1" fill="#586371" opacity="0.7" />
      </g>
      <g className="face-blink">
        <path d="M16 18 H18 V17 H21 V18 H23" stroke="#2F3035" strokeWidth="1.1" fill="none" strokeLinecap="square" strokeLinejoin="miter" />
        <path d="M26 18 H28 V17 H31 V18 H33" stroke="#2F3035" strokeWidth="1.1" fill="none" strokeLinecap="square" strokeLinejoin="miter" />
      </g>
      <g className="face-sleep">
        <path d="M16 18 H18 V17 H20 V18 H22" stroke="#2F3035" strokeWidth="1.2" fill="none" strokeLinecap="square" strokeLinejoin="miter" />
        <path d="M27 18 H29 V17 H31 V18 H33" stroke="#2F3035" strokeWidth="1.2" fill="none" strokeLinecap="square" strokeLinejoin="miter" />
      </g>
      <g className="face-happy">
        <path d="M17 19 H19 V17 H21 V19 H22" stroke="#2F3035" strokeWidth="1.1" fill="none" strokeLinecap="square" strokeLinejoin="miter" />
        <path d="M27 19 H29 V17 H31 V19 H32" stroke="#2F3035" strokeWidth="1.1" fill="none" strokeLinecap="square" strokeLinejoin="miter" />
      </g>
      <g className="face-star">
        <path d="M18 15 H21 V17 H23 V20 H21 V22 H18 V20 H16 V17 H18 Z" fill="#FFD75A" />
        <path d="M28 15 H31 V17 H33 V20 H31 V22 H28 V20 H26 V17 H28 Z" fill="#FFD75A" />
      </g>
      <g className="face-worry">
        <path d="M17 16 H21 V17 H22 V20 H21 V21 H17 V20 H16 V17 H17 Z" fill={eyeColor} />
        <path d="M27 16 H31 V17 H32 V20 H31 V21 H27 V20 H26 V17 H27 Z" fill={eyeColor} />
        <rect x="18" y="17" width="1.6" height="1.6" fill="#FFFFFF" />
        <rect x="28" y="17" width="1.6" height="1.6" fill="#FFFFFF" />
        <path d="M16 14 H21 V15 H23" stroke="#2F3035" strokeWidth="1" fill="none" strokeLinecap="square" strokeLinejoin="miter" />
        <path d="M26 15 H28 V14 H33" stroke="#2F3035" strokeWidth="1" fill="none" strokeLinecap="square" strokeLinejoin="miter" />
        <path d="M38 13 H40 V16 H39 V18 H37 V16 H36 V14 H38 Z" fill="#86D7F0" />
      </g>
      <g className="face-alarmed">
        <path d="M16 15 H21 V16 H22 V21 H21 V22 H16 V21 H15 V16 H16 Z" fill={eyeColor} />
        <path d="M28 15 H33 V16 H34 V21 H33 V22 H28 V21 H27 V16 H28 Z" fill={eyeColor} />
        <rect x="18" y="17" width="1.7" height="1.7" fill="#FFFFFF" />
        <rect x="30" y="17" width="1.7" height="1.7" fill="#FFFFFF" />
      </g>
    </>
  );
}

function PixelMouth({ color = "#5C351D" }: { color?: string }) {
  return (
    <>
      <g className="mouth-smile">
        <path d="M22 26 H23 V27 H25 V26 H26" stroke={color} strokeWidth="1.1" fill="none" strokeLinecap="square" strokeLinejoin="miter" />
      </g>
      <g className="mouth-sleep">
        <rect x="23" y="26" width="3" height="2" rx="1" fill={color} />
      </g>
      <g className="mouth-open">
        <rect x="23" y="25" width="3" height="3" rx="1" fill={color} />
        <rect x="23.5" y="27" width="2" height="1" fill="#E89CAD" />
      </g>
      <g className="mouth-big">
        <path d="M21 25 H22 V27 H23 V28 H25 V27 H26 V25 H27" stroke={color} strokeWidth="1.1" fill="none" strokeLinecap="square" strokeLinejoin="miter" />
      </g>
    </>
  );
}

/* ─── CAT ─── Orange tabby with whiskers ─── */
const catPet: PetDefinition = {
  viewBox: "0 0 48 56",
  faceTransform: "translate(8 6)",
  usesCustomFace: true,
  body: (
    <>
      {/* Ground shadow */}
      <rect x="10" y="52" width="28" height="3" rx="1.5" fill="#A85318" opacity="0.22" />

      {/* Blocky tail */}
      <g className="pet-tail">
        <rect x="5" y="32" width="4" height="13" fill="#C46A1F" />
        <rect x="7" y="28" width="4" height="5" fill="#D97724" />
        <rect x="10" y="25" width="4" height="5" fill="#E9852B" />
        <rect x="13" y="27" width="3" height="4" fill="#D97724" />
        <rect x="6" y="44" width="7" height="4" fill="#B85F1C" />
      </g>

      {/* Upright mascot torso */}
      <rect x="15" y="26" width="18" height="23" rx="3" fill="#F58A2A" stroke="#B85F1C" strokeWidth="1.4" />
      <rect x="20" y="28" width="8" height="4" fill="#F58A2A" stroke="#B85F1C" strokeWidth="1" />
      <rect x="19" y="34" width="10" height="11" rx="4" fill="#FFF0CF" />

      {/* Slimmer arms with separated paws */}
      <rect x="10" y="31" width="4" height="13" rx="1.8" fill="#E9852B" stroke="#B85F1C" strokeWidth="1" />
      <rect x="34" y="31" width="4" height="13" rx="1.8" fill="#E9852B" stroke="#B85F1C" strokeWidth="1" />
      <rect x="9" y="40" width="6" height="5" rx="2" fill="#F6A044" stroke="#B85F1C" strokeWidth="1" />
      <rect x="33" y="40" width="6" height="5" rx="2" fill="#F6A044" stroke="#B85F1C" strokeWidth="1" />

      {/* Long character legs and clear feet */}
      <rect x="16" y="42" width="6" height="10" rx="1.5" fill="#F58A2A" stroke="#B85F1C" strokeWidth="1" />
      <rect x="26" y="42" width="6" height="10" rx="1.5" fill="#F58A2A" stroke="#B85F1C" strokeWidth="1" />
      <rect x="13" y="50" width="10" height="4" rx="1.8" fill="#FFF0CF" stroke="#B85F1C" strokeWidth="1.1" />
      <rect x="25" y="50" width="10" height="4" rx="1.8" fill="#FFF0CF" stroke="#B85F1C" strokeWidth="1.1" />
      <rect x="23" y="43" width="2" height="8" fill="#B85F1C" opacity="0.5" />

      {/* Ears behind head */}
      <g className="pet-ear-left">
        <path d="M13 13 L16 6 L21 13 Z" fill="#F58A2A" stroke="#B85F1C" strokeWidth="1.4" strokeLinejoin="miter" />
        <path d="M16 11 L17.2 8.5 L18.6 11 Z" fill="#F5A1A0" opacity="0.8" />
      </g>
      <g className="pet-ear-right">
        <path d="M27 13 L32 6 L35 13 Z" fill="#F58A2A" stroke="#B85F1C" strokeWidth="1.4" strokeLinejoin="miter" />
        <path d="M29.4 11 L30.8 8.5 L32 11 Z" fill="#F5A1A0" opacity="0.8" />
      </g>

      {/* Head with stepped silhouette */}
      <path d="M15 11 H33 V14 H35 V25 H33 V28 H29 V30 H19 V28 H15 V25 H13 V14 H15 Z" fill="#F58A2A" stroke="#B85F1C" strokeWidth="1.4" strokeLinejoin="miter" />

      {/* Shoulder pixels connect head and arms */}
      <rect x="12" y="29" width="5" height="3" rx="1.4" fill="#F6A044" stroke="#B85F1C" strokeWidth="0.9" />
      <rect x="31" y="29" width="5" height="3" rx="1.4" fill="#F6A044" stroke="#B85F1C" strokeWidth="0.9" />

      {/* Cheek pixels */}
      <rect x="15" y="23" width="3" height="2" rx="1" fill="#FFB3B3" opacity="0.48" />
      <rect x="30" y="23" width="3" height="2" rx="1" fill="#FFB3B3" opacity="0.48" />

      {/* Soft pixel muzzle */}
      <path d="M21 22 H27 V24 H29 V27 H27 V28 H21 V27 H19 V24 H21 Z" fill="#FFDCA8" opacity="0.22" />

      {/* Pixel nose */}
      <path d="M22 21 H26 L24 24 Z" fill="#D98586" />

      {/* Whiskers and forehead markings sit under animated face pixels */}
      <rect x="6" y="22" width="7" height="1" fill="#B85F1C" opacity="0.5" />
      <rect x="7" y="25" width="7" height="1" fill="#B85F1C" opacity="0.35" />
      <rect x="35" y="22" width="7" height="1" fill="#B85F1C" opacity="0.5" />
      <rect x="34" y="25" width="7" height="1" fill="#B85F1C" opacity="0.35" />
      <rect x="21" y="10" width="2" height="4" rx="0.5" fill="#B85F1C" />
      <rect x="25" y="10" width="2" height="4" rx="0.5" fill="#B85F1C" />
      <path d="M24 10 H26 V12 H25 V14 H23 V12 H22 V10 Z" fill="#B85F1C" opacity="0.85" />

      {/* Pixel face states */}
      <PixelFace />
      <PixelMouth />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Bubble tea, tucked into paw */}
      <rect x="32.5" y="30" width="6" height="10" rx="1.6" fill="#94C8D5" stroke="#6EAABD" strokeWidth="0.9" />
      <rect x="31.5" y="28" width="8" height="2.5" rx="1.2" fill="#82BAC8" />
      <rect x="35.5" y="22" width="2" height="6" rx="1" fill="#CF6F7B" />
      <rect x="30.5" y="31" width="5" height="5" rx="1.8" fill="#F6A044" stroke="#B85F1C" strokeWidth="0.8" />
      <rect x="34" y="36" width="2" height="2" rx="0.8" fill="#5D3518" opacity="0.9" />
      <rect x="36.5" y="35" width="1.5" height="1.5" rx="0.7" fill="#5D3518" opacity="0.9" />
      <rect x="35.8" y="38" width="2" height="1.6" rx="0.7" fill="#5D3518" opacity="0.9" />
    </>
  ),
};

/* ─── OTTER ─── Warm brown with buck teeth ─── */
const otterPet: PetDefinition = {
  viewBox: "0 0 48 56",
  faceTransform: "translate(8 6)",
  usesCustomFace: true,
  body: (
    <>
      {/* Ground shadow */}
      <rect x="10" y="52" width="28" height="3" rx="1.5" fill="#6B5340" opacity="0.22" />

      {/* Blocky tail */}
      <g className="pet-tail">
        <rect x="5" y="32" width="5" height="12" fill="#8B7355" />
        <rect x="7" y="28" width="5" height="5" fill="#A0826D" />
        <rect x="10" y="25" width="5" height="5" fill="#A0826D" />
        <rect x="6" y="43" width="8" height="4" fill="#6B5340" />
      </g>

      {/* Upright mascot torso */}
      <rect x="15" y="26" width="18" height="23" rx="3" fill="#A0826D" stroke="#6B5340" strokeWidth="1.4" />
      <rect x="20" y="28" width="8" height="4" fill="#A0826D" stroke="#6B5340" strokeWidth="1" />
      <rect x="19" y="34" width="10" height="11" rx="4" fill="#DCC4A8" />

      {/* Slimmer arms with separated paws */}
      <rect x="10" y="31" width="4" height="13" rx="1.8" fill="#8B7355" stroke="#6B5340" strokeWidth="1" />
      <rect x="34" y="31" width="4" height="13" rx="1.8" fill="#8B7355" stroke="#6B5340" strokeWidth="1" />
      <rect x="9" y="40" width="6" height="5" rx="2" fill="#A0826D" stroke="#6B5340" strokeWidth="1" />
      <rect x="33" y="40" width="6" height="5" rx="2" fill="#A0826D" stroke="#6B5340" strokeWidth="1" />

      {/* Long character legs and clear feet */}
      <rect x="16" y="42" width="6" height="10" rx="1.5" fill="#A0826D" stroke="#6B5340" strokeWidth="1" />
      <rect x="26" y="42" width="6" height="10" rx="1.5" fill="#A0826D" stroke="#6B5340" strokeWidth="1" />
      <rect x="13" y="50" width="10" height="4" rx="1.8" fill="#DCC4A8" stroke="#6B5340" strokeWidth="1.1" />
      <rect x="25" y="50" width="10" height="4" rx="1.8" fill="#DCC4A8" stroke="#6B5340" strokeWidth="1.1" />
      <rect x="23" y="43" width="2" height="8" fill="#6B5340" opacity="0.5" />

      {/* Round ears */}
      <g className="pet-ear-left">
        <rect x="10" y="3" width="8" height="8" rx="4" fill="#A0826D" stroke="#6B5340" strokeWidth="1" />
        <rect x="12" y="5" width="4" height="4" rx="2" fill="#FFB6C1" />
      </g>
      <g className="pet-ear-right">
        <rect x="30" y="3" width="8" height="8" rx="4" fill="#A0826D" stroke="#6B5340" strokeWidth="1" />
        <rect x="32" y="5" width="4" height="4" rx="2" fill="#FFB6C1" />
      </g>

      {/* Head with stepped silhouette */}
      <path d="M15 11 H33 V14 H35 V25 H33 V28 H29 V30 H19 V28 H15 V25 H13 V14 H15 Z" fill="#A0826D" stroke="#6B5340" strokeWidth="1.4" strokeLinejoin="miter" />

      {/* Shoulder pixels connect head and arms */}
      <rect x="12" y="29" width="5" height="3" rx="1.4" fill="#8B7355" stroke="#6B5340" strokeWidth="0.9" />
      <rect x="31" y="29" width="5" height="3" rx="1.4" fill="#8B7355" stroke="#6B5340" strokeWidth="0.9" />

      {/* Face lighter area */}
      <path d="M21 19 H27 V21 H29 V25 H27 V27 H21 V27 H19 V25 H19 V21 H21 Z" fill="#DCC4A8" opacity="0.45" />

      {/* Cheek pixels */}
      <rect x="15" y="23" width="3" height="2" rx="1" fill="#FFB6C1" opacity="0.45" />
      <rect x="30" y="23" width="3" height="2" rx="1" fill="#FFB6C1" opacity="0.45" />

      {/* Nose */}
      <rect x="22" y="20" width="4" height="3" rx="1.5" fill="#4A3728" />

      {/* Buck teeth */}
      <rect x="22" y="24" width="1.5" height="2.5" rx="0.5" fill="#FFF" stroke="#DDD" strokeWidth="0.3" />
      <rect x="24.5" y="24" width="1.5" height="2.5" rx="0.5" fill="#FFF" stroke="#DDD" strokeWidth="0.3" />

      {/* Pixel face states */}
      <PixelFace />
      <PixelMouth color="#5C351D" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Pixel fish */}
      <rect x="33" y="30" width="7" height="4" rx="2" fill="#87CEEB" stroke="#5BA4C9" strokeWidth="0.8" />
      <path d="M39 30 L42 28 L42 34 Z" fill="#87CEEB" stroke="#5BA4C9" strokeWidth="0.8" strokeLinejoin="miter" />
      <rect x="34" y="31" width="1" height="1" rx="0.5" fill="#2C3E50" />
    </>
  ),
};

/* ─── DOG ─── Golden retriever with floppy ears ─── */
const dogPet: PetDefinition = {
  viewBox: "0 0 48 56",
  faceTransform: "translate(8 6)",
  usesCustomFace: true,
  body: (
    <>
      {/* Ground shadow */}
      <rect x="10" y="52" width="28" height="3" rx="1.5" fill="#A07830" opacity="0.22" />

      {/* Blocky tail */}
      <g className="pet-tail">
        <rect x="5" y="30" width="5" height="12" fill="#C49A6C" />
        <rect x="7" y="26" width="5" height="5" fill="#DEB887" />
        <rect x="6" y="41" width="7" height="5" fill="#A07830" />
      </g>

      {/* Upright mascot torso */}
      <rect x="15" y="26" width="18" height="23" rx="3" fill="#DEB887" stroke="#A07830" strokeWidth="1.4" />
      <rect x="20" y="28" width="8" height="4" fill="#DEB887" stroke="#A07830" strokeWidth="1" />
      {/* Chest tuft */}
      <rect x="19" y="32" width="10" height="4" rx="4" fill="#F5DEB3" />
      <rect x="19" y="34" width="10" height="11" rx="4" fill="#F5DEB3" />

      {/* Slimmer arms with separated paws */}
      <rect x="10" y="31" width="4" height="13" rx="1.8" fill="#C49A6C" stroke="#A07830" strokeWidth="1" />
      <rect x="34" y="31" width="4" height="13" rx="1.8" fill="#C49A6C" stroke="#A07830" strokeWidth="1" />
      <rect x="9" y="40" width="6" height="5" rx="2" fill="#DEB887" stroke="#A07830" strokeWidth="1" />
      <rect x="33" y="40" width="6" height="5" rx="2" fill="#DEB887" stroke="#A07830" strokeWidth="1" />

      {/* Long character legs and clear feet */}
      <rect x="16" y="42" width="6" height="10" rx="1.5" fill="#DEB887" stroke="#A07830" strokeWidth="1" />
      <rect x="26" y="42" width="6" height="10" rx="1.5" fill="#DEB887" stroke="#A07830" strokeWidth="1" />
      <rect x="13" y="50" width="10" height="4" rx="1.8" fill="#F5DEB3" stroke="#A07830" strokeWidth="1.1" />
      <rect x="25" y="50" width="10" height="4" rx="1.8" fill="#F5DEB3" stroke="#A07830" strokeWidth="1.1" />
      <rect x="23" y="43" width="2" height="8" fill="#A07830" opacity="0.5" />

      {/* Floppy ears */}
      <g className="pet-ear-left">
        <rect x="8" y="4" width="6" height="12" rx="3" fill="#C49A6C" stroke="#A07830" strokeWidth="1" />
        <rect x="9.5" y="6" width="3" height="8" rx="1.5" fill="#DEB887" />
      </g>
      <g className="pet-ear-right">
        <rect x="34" y="4" width="6" height="12" rx="3" fill="#C49A6C" stroke="#A07830" strokeWidth="1" />
        <rect x="35.5" y="6" width="3" height="8" rx="1.5" fill="#DEB887" />
      </g>

      {/* Head with stepped silhouette */}
      <path d="M15 11 H33 V14 H35 V25 H33 V28 H29 V30 H19 V28 H15 V25 H13 V14 H15 Z" fill="#DEB887" stroke="#A07830" strokeWidth="1.4" strokeLinejoin="miter" />

      {/* Shoulder pixels connect head and arms */}
      <rect x="12" y="29" width="5" height="3" rx="1.4" fill="#C49A6C" stroke="#A07830" strokeWidth="0.9" />
      <rect x="31" y="29" width="5" height="3" rx="1.4" fill="#C49A6C" stroke="#A07830" strokeWidth="0.9" />

      {/* Snout */}
      <path d="M21 19 H27 V21 H29 V25 H27 V27 H21 V27 H19 V25 H19 V21 H21 Z" fill="#F5DEB3" opacity="0.5" />

      {/* Cheek pixels */}
      <rect x="15" y="23" width="3" height="2" rx="1" fill="#FFB6C1" opacity="0.35" />
      <rect x="30" y="23" width="3" height="2" rx="1" fill="#FFB6C1" opacity="0.35" />

      {/* Nose */}
      <rect x="22" y="20" width="4" height="3" rx="1.5" fill="#333" />
      <rect x="22.5" y="20.5" width="1.5" height="1" rx="0.5" fill="#555" />

      {/* Pixel face states */}
      <PixelFace />
      <PixelMouth color="#5C351D" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Pixel bone */}
      <rect x="33" y="31" width="8" height="3" rx="1.5" fill="#FFF8E7" stroke="#D4C4A0" strokeWidth="0.6" />
      <rect x="32" y="29.5" width="3" height="3" rx="1.5" fill="#FFF8E7" stroke="#D4C4A0" strokeWidth="0.6" />
      <rect x="32" y="32.5" width="3" height="3" rx="1.5" fill="#FFF8E7" stroke="#D4C4A0" strokeWidth="0.6" />
      <rect x="39" y="29.5" width="3" height="3" rx="1.5" fill="#FFF8E7" stroke="#D4C4A0" strokeWidth="0.6" />
      <rect x="39" y="32.5" width="3" height="3" rx="1.5" fill="#FFF8E7" stroke="#D4C4A0" strokeWidth="0.6" />
    </>
  ),
};

/* ─── FOX ─── Orange-red with bushy tail ─── */
const foxPet: PetDefinition = {
  viewBox: "0 0 48 56",
  faceTransform: "translate(8 6)",
  usesCustomFace: true,
  body: (
    <>
      {/* Ground shadow */}
      <rect x="10" y="52" width="28" height="3" rx="1.5" fill="#C04A10" opacity="0.22" />

      {/* Bushy tail with white tip */}
      <g className="pet-tail">
        <rect x="5" y="28" width="5" height="14" fill="#E8601C" />
        <rect x="7" y="24" width="5" height="5" fill="#FF7B2E" />
        <rect x="10" y="21" width="5" height="5" fill="#FF7B2E" />
        <rect x="3" y="41" width="9" height="4" rx="2" fill="#FFF3E0" />
        <rect x="5" y="39" width="5" height="3" fill="#E8601C" />
      </g>

      {/* Upright mascot torso */}
      <rect x="15" y="26" width="18" height="23" rx="3" fill="#FF7B2E" stroke="#C04A10" strokeWidth="1.4" />
      <rect x="20" y="28" width="8" height="4" fill="#FF7B2E" stroke="#C04A10" strokeWidth="1" />
      <rect x="19" y="34" width="10" height="11" rx="4" fill="#FFF3E0" />

      {/* Slimmer arms with separated paws */}
      <rect x="10" y="31" width="4" height="13" rx="1.8" fill="#E8601C" stroke="#C04A10" strokeWidth="1" />
      <rect x="34" y="31" width="4" height="13" rx="1.8" fill="#E8601C" stroke="#C04A10" strokeWidth="1" />
      <rect x="9" y="40" width="6" height="5" rx="2" fill="#FF7B2E" stroke="#C04A10" strokeWidth="1" />
      <rect x="33" y="40" width="6" height="5" rx="2" fill="#FF7B2E" stroke="#C04A10" strokeWidth="1" />

      {/* Long character legs and clear feet */}
      <rect x="16" y="42" width="6" height="10" rx="1.5" fill="#FF7B2E" stroke="#C04A10" strokeWidth="1" />
      <rect x="26" y="42" width="6" height="10" rx="1.5" fill="#FF7B2E" stroke="#C04A10" strokeWidth="1" />
      <rect x="13" y="50" width="10" height="4" rx="1.8" fill="#FFF3E0" stroke="#C04A10" strokeWidth="1.1" />
      <rect x="25" y="50" width="10" height="4" rx="1.8" fill="#FFF3E0" stroke="#C04A10" strokeWidth="1.1" />
      <rect x="23" y="43" width="2" height="8" fill="#C04A10" opacity="0.5" />

      {/* Pointed ears */}
      <g className="pet-ear-left">
        <path d="M12 13 L15 4 L21 13 Z" fill="#FF7B2E" stroke="#C04A10" strokeWidth="1.4" strokeLinejoin="miter" />
        <path d="M15 11 L16.5 7 L18 11 Z" fill="#2C3038" />
      </g>
      <g className="pet-ear-right">
        <path d="M27 13 L33 4 L36 13 Z" fill="#FF7B2E" stroke="#C04A10" strokeWidth="1.4" strokeLinejoin="miter" />
        <path d="M30 11 L31.5 7 L33 11 Z" fill="#2C3038" />
      </g>

      {/* Head with stepped silhouette */}
      <path d="M15 11 H33 V14 H35 V25 H33 V28 H29 V30 H19 V28 H15 V25 H13 V14 H15 Z" fill="#FF7B2E" stroke="#C04A10" strokeWidth="1.4" strokeLinejoin="miter" />

      {/* Shoulder pixels connect head and arms */}
      <rect x="12" y="29" width="5" height="3" rx="1.4" fill="#E8601C" stroke="#C04A10" strokeWidth="0.9" />
      <rect x="31" y="29" width="5" height="3" rx="1.4" fill="#E8601C" stroke="#C04A10" strokeWidth="0.9" />

      {/* White face mask */}
      <path d="M18 15 H30 V19 H32 V24 H30 V28 H18 V28 H16 V24 H18 V19 H18 Z" fill="#FFF3E0" opacity="0.55" />

      {/* Cheek pixels */}
      <rect x="15" y="23" width="3" height="2" rx="1" fill="#FFB6C1" opacity="0.4" />
      <rect x="30" y="23" width="3" height="2" rx="1" fill="#FFB6C1" opacity="0.4" />

      {/* Nose */}
      <rect x="22.5" y="20" width="3" height="2" rx="1" fill="#2C2C2C" />

      {/* Pixel face states */}
      <PixelFace />
      <PixelMouth color="#5C351D" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Pixel autumn leaf */}
      <path d="M34 18 H37 V20 H39 V24 H37 V26 H34 V24 H32 V20 H34 Z" fill="#E86830" stroke="#C04A10" strokeWidth="0.6" strokeLinejoin="miter" />
      <path d="M36 16 H38 V18 H39 V22 H38 V24 H36 V22 H35 V18 H36 Z" fill="#FF9800" stroke="#E86830" strokeWidth="0.5" strokeLinejoin="miter" />
      <rect x="36" y="20" width="1" height="4" fill="#C04A10" opacity="0.6" />
    </>
  ),
};

/* ─── PENGUIN ─── Classic black/white with orange accents ─── */
const penguinPet: PetDefinition = {
  viewBox: "0 0 48 56",
  faceTransform: "translate(8 6)",
  usesCustomFace: true,
  body: (
    <>
      {/* Ground shadow */}
      <rect x="10" y="52" width="28" height="3" rx="1.5" fill="#1A252F" opacity="0.22" />

      {/* Upright mascot torso */}
      <rect x="15" y="26" width="18" height="23" rx="3" fill="#2C3E50" stroke="#1A252F" strokeWidth="1.4" />
      <rect x="20" y="28" width="8" height="4" fill="#2C3E50" stroke="#1A252F" strokeWidth="1" />
      {/* White belly */}
      <rect x="19" y="34" width="10" height="11" rx="4" fill="#F0F4F8" />

      {/* Flippers instead of arms */}
      <g className="pet-ear-left">
        <rect x="7" y="28" width="5" height="14" rx="2.5" fill="#2C3E50" stroke="#1A252F" strokeWidth="1" />
      </g>
      <g className="pet-ear-right">
        <rect x="36" y="28" width="5" height="14" rx="2.5" fill="#2C3E50" stroke="#1A252F" strokeWidth="1" />
      </g>

      {/* Long character legs and clear feet */}
      <rect x="16" y="42" width="6" height="10" rx="1.5" fill="#2C3E50" stroke="#1A252F" strokeWidth="1" />
      <rect x="26" y="42" width="6" height="10" rx="1.5" fill="#2C3E50" stroke="#1A252F" strokeWidth="1" />
      <rect x="13" y="50" width="10" height="4" rx="1.8" fill="#FFB347" stroke="#E89520" strokeWidth="1.1" />
      <rect x="25" y="50" width="10" height="4" rx="1.8" fill="#FFB347" stroke="#E89520" strokeWidth="1.1" />
      <rect x="23" y="43" width="2" height="8" fill="#1A252F" opacity="0.5" />

      {/* Head with stepped silhouette */}
      <path d="M15 11 H33 V14 H35 V25 H33 V28 H29 V30 H19 V28 H15 V25 H13 V14 H15 Z" fill="#2C3E50" stroke="#1A252F" strokeWidth="1.4" strokeLinejoin="miter" />

      {/* White face area */}
      <path d="M19 14 H29 V17 H31 V24 H29 V28 H19 V28 H17 V24 H17 V17 H19 Z" fill="#F0F4F8" />

      {/* Cheek pixels */}
      <rect x="17" y="23" width="3" height="2" rx="1" fill="#FFB6C1" opacity="0.45" />
      <rect x="28" y="23" width="3" height="2" rx="1" fill="#FFB6C1" opacity="0.45" />

      {/* Beak */}
      <path d="M22 20 H26 L24 23 Z" fill="#FFB347" stroke="#E89520" strokeWidth="0.8" strokeLinejoin="miter" />

      {/* Pixel face states */}
      <PixelFace />
      <PixelMouth color="#5C351D" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Pixel ice cream cone */}
      <path d="M33 30 L31.5 38 L36.5 38 Z" fill="#DEB887" stroke="#C49A6C" strokeWidth="0.8" strokeLinejoin="miter" />
      <rect x="31" y="24" width="6" height="6" rx="3" fill="#FFB6C1" stroke="#E89CAD" strokeWidth="0.8" />
      <rect x="30" y="21" width="5" height="5" rx="2.5" fill="#87CEEB" stroke="#6BAFE0" strokeWidth="0.8" />
      {/* Sprinkles */}
      <rect x="32" y="22" width="1.5" height="0.6" fill="#FF6B6B" transform="rotate(30 32 22)" />
      <rect x="33.5" y="23" width="1.5" height="0.6" fill="#4CAF50" transform="rotate(-20 33.5 23)" />
    </>
  ),
};

/* ─── BUNNY ─── Soft white with pink accents ─── */
const bunnyPet: PetDefinition = {
  viewBox: "0 0 48 56",
  faceTransform: "translate(8 6)",
  usesCustomFace: true,
  body: (
    <>
      {/* Ground shadow */}
      <rect x="10" y="52" width="28" height="3" rx="1.5" fill="#D0D0D0" opacity="0.22" />

      {/* Fluffy pom tail */}
      <g className="pet-tail">
        <rect x="5" y="33" width="7" height="7" rx="3.5" fill="#FAFAFA" stroke="#D0D0D0" strokeWidth="0.8" />
        <rect x="7" y="35" width="3" height="3" rx="1.5" fill="#FFF" />
      </g>

      {/* Upright mascot torso */}
      <rect x="15" y="26" width="18" height="23" rx="3" fill="#FAFAFA" stroke="#D0D0D0" strokeWidth="1.4" />
      <rect x="20" y="28" width="8" height="4" fill="#FAFAFA" stroke="#D0D0D0" strokeWidth="1" />
      <rect x="19" y="34" width="10" height="11" rx="4" fill="#FFF" />

      {/* Slimmer arms with separated paws */}
      <rect x="10" y="31" width="4" height="13" rx="1.8" fill="#F0F0F0" stroke="#D0D0D0" strokeWidth="1" />
      <rect x="34" y="31" width="4" height="13" rx="1.8" fill="#F0F0F0" stroke="#D0D0D0" strokeWidth="1" />
      <rect x="9" y="40" width="6" height="5" rx="2" fill="#FAFAFA" stroke="#D0D0D0" strokeWidth="1" />
      <rect x="33" y="40" width="6" height="5" rx="2" fill="#FAFAFA" stroke="#D0D0D0" strokeWidth="1" />

      {/* Long character legs and clear feet */}
      <rect x="16" y="42" width="6" height="10" rx="1.5" fill="#FAFAFA" stroke="#D0D0D0" strokeWidth="1" />
      <rect x="26" y="42" width="6" height="10" rx="1.5" fill="#FAFAFA" stroke="#D0D0D0" strokeWidth="1" />
      <rect x="13" y="50" width="10" height="4" rx="1.8" fill="#FFF" stroke="#D0D0D0" strokeWidth="1.1" />
      <rect x="25" y="50" width="10" height="4" rx="1.8" fill="#FFF" stroke="#D0D0D0" strokeWidth="1.1" />
      <rect x="23" y="43" width="2" height="8" fill="#D0D0D0" opacity="0.5" />

      {/* Long ears */}
      <g className="pet-ear-left">
        <rect x="13" y="-2" width="5" height="13" rx="2.5" fill="#FAFAFA" stroke="#D0D0D0" strokeWidth="1" />
        <rect x="14.5" y="-0.5" width="2" height="10" rx="1" fill="#FFB6C1" opacity="0.7" />
      </g>
      <g className="pet-ear-right">
        <rect x="30" y="-2" width="5" height="13" rx="2.5" fill="#FAFAFA" stroke="#D0D0D0" strokeWidth="1" />
        <rect x="31.5" y="-0.5" width="2" height="10" rx="1" fill="#FFB6C1" opacity="0.7" />
      </g>

      {/* Head with stepped silhouette */}
      <path d="M15 11 H33 V14 H35 V25 H33 V28 H29 V30 H19 V28 H15 V25 H13 V14 H15 Z" fill="#FAFAFA" stroke="#D0D0D0" strokeWidth="1.4" strokeLinejoin="miter" />

      {/* Shoulder pixels connect head and arms */}
      <rect x="12" y="29" width="5" height="3" rx="1.4" fill="#F0F0F0" stroke="#D0D0D0" strokeWidth="0.9" />
      <rect x="31" y="29" width="5" height="3" rx="1.4" fill="#F0F0F0" stroke="#D0D0D0" strokeWidth="0.9" />

      {/* Cheek pixels */}
      <rect x="15" y="22" width="4" height="3" rx="1.5" fill="#FFB6C1" opacity="0.5" />
      <rect x="29" y="22" width="4" height="3" rx="1.5" fill="#FFB6C1" opacity="0.5" />

      {/* Nose */}
      <rect x="23" y="20" width="2" height="2" rx="1" fill="#FFB6C1" />

      {/* Pixel face states */}
      <PixelFace />
      <PixelMouth color="#C4848A" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Pixel carrot */}
      <path d="M33 30 L31.5 40 L34.5 40 Z" fill="#FF8C42" stroke="#E06B20" strokeWidth="0.8" strokeLinejoin="miter" />
      {/* Carrot leaves */}
      <rect x="32" y="26" width="1.5" height="5" rx="0.5" fill="#4CAF50" />
      <rect x="33.5" y="25" width="1.5" height="6" rx="0.5" fill="#66BB6A" />
      <rect x="31" y="27" width="1.5" height="4" rx="0.5" fill="#81C784" />
    </>
  ),
};

/* ─── PANDA ─── Black and white with beanie hat ─── */
const pandaPet: PetDefinition = {
  viewBox: "0 0 48 56",
  faceTransform: "translate(8 6)",
  usesCustomFace: true,
  spriteSheets: {
    idle: { src: "/pets/panda/PandaWave.png", frames: 12 },
    wave: { src: "/pets/panda/PandaWave.png", frames: 12 },
    eating: { src: "/pets/panda/PandaEating.png", frames: 12 },
    frameWidth: 64,
    frameHeight: 64,
  },
  body: (
    <>
      {/* Ground shadow */}
      <rect x="10" y="52" width="28" height="3" rx="1.5" fill="#1A252F" opacity="0.22" />

      {/* Tiny tail */}
      <g className="pet-tail">
        <rect x="5" y="35" width="5" height="5" rx="2.5" fill="#2C3E50" stroke="#1A252F" strokeWidth="0.8" />
      </g>

      {/* Upright mascot torso */}
      <rect x="15" y="26" width="18" height="23" rx="3" fill="#2C3E50" stroke="#1A252F" strokeWidth="1.4" />
      <rect x="20" y="28" width="8" height="4" fill="#2C3E50" stroke="#1A252F" strokeWidth="1" />
      {/* White chest patch */}
      <rect x="19" y="32" width="10" height="13" rx="4" fill="#F5F5F5" />

      {/* Slimmer arms with separated paws */}
      <rect x="10" y="31" width="4" height="13" rx="1.8" fill="#2C3E50" stroke="#1A252F" strokeWidth="1" />
      <rect x="34" y="31" width="4" height="13" rx="1.8" fill="#2C3E50" stroke="#1A252F" strokeWidth="1" />
      <rect x="9" y="40" width="6" height="5" rx="2" fill="#2C3E50" stroke="#1A252F" strokeWidth="1" />
      <rect x="33" y="40" width="6" height="5" rx="2" fill="#2C3E50" stroke="#1A252F" strokeWidth="1" />
      {/* Toe beans on paws */}
      <rect x="10.5" y="41" width="1.2" height="1.2" rx="0.6" fill="#FFB6C1" />
      <rect x="12.5" y="41" width="1.2" height="1.2" rx="0.6" fill="#FFB6C1" />
      <rect x="34.5" y="41" width="1.2" height="1.2" rx="0.6" fill="#FFB6C1" />
      <rect x="36.5" y="41" width="1.2" height="1.2" rx="0.6" fill="#FFB6C1" />

      {/* Long character legs and clear feet */}
      <rect x="16" y="42" width="6" height="10" rx="1.5" fill="#2C3E50" stroke="#1A252F" strokeWidth="1" />
      <rect x="26" y="42" width="6" height="10" rx="1.5" fill="#2C3E50" stroke="#1A252F" strokeWidth="1" />
      <rect x="13" y="50" width="10" height="4" rx="1.8" fill="#2C3E50" stroke="#1A252F" strokeWidth="1.1" />
      <rect x="25" y="50" width="10" height="4" rx="1.8" fill="#2C3E50" stroke="#1A252F" strokeWidth="1.1" />
      <rect x="23" y="43" width="2" height="8" fill="#1A252F" opacity="0.5" />
      {/* Toe beans on feet */}
      <rect x="15" y="51" width="1.2" height="1.2" rx="0.6" fill="#FFB6C1" />
      <rect x="17" y="51" width="1.2" height="1.2" rx="0.6" fill="#FFB6C1" />
      <rect x="19" y="51" width="1.2" height="1.2" rx="0.6" fill="#FFB6C1" />
      <rect x="27" y="51" width="1.2" height="1.2" rx="0.6" fill="#FFB6C1" />
      <rect x="29" y="51" width="1.2" height="1.2" rx="0.6" fill="#FFB6C1" />
      <rect x="31" y="51" width="1.2" height="1.2" rx="0.6" fill="#FFB6C1" />

      {/* Black round ears */}
      <g className="pet-ear-left">
        <rect x="10" y="2" width="9" height="9" rx="4.5" fill="#2C3E50" stroke="#1A252F" strokeWidth="1" />
      </g>
      <g className="pet-ear-right">
        <rect x="29" y="2" width="9" height="9" rx="4.5" fill="#2C3E50" stroke="#1A252F" strokeWidth="1" />
      </g>

      {/* Head with stepped silhouette */}
      <path d="M15 11 H33 V14 H35 V25 H33 V28 H29 V30 H19 V28 H15 V25 H13 V14 H15 Z" fill="#F5F5F5" stroke="#D0D0D0" strokeWidth="1.4" strokeLinejoin="miter" />

      {/* Shoulder pixels connect head and arms */}
      <rect x="12" y="29" width="5" height="3" rx="1.4" fill="#2C3E50" stroke="#1A252F" strokeWidth="0.9" />
      <rect x="31" y="29" width="5" height="3" rx="1.4" fill="#2C3E50" stroke="#1A252F" strokeWidth="0.9" />

      {/* Beanie hat */}
      <path d="M15 11 H33 V9 H35 V6 H33 V4 H15 V6 H13 V9 H15 Z" fill="#5C6BC0" stroke="#3F51B5" strokeWidth="1" strokeLinejoin="miter" />
      <rect x="13" y="9" width="22" height="3" rx="1.5" fill="#7986CB" stroke="#5C6BC0" strokeWidth="0.6" />
      {/* Beanie pom */}
      <rect x="32" y="2" width="4" height="4" rx="2" fill="#E8EAF6" stroke="#C5CAE9" strokeWidth="0.5" />

      {/* Eye patches */}
      <rect x="15" y="15" width="8" height="6" rx="3" fill="#2C3E50" />
      <rect x="25" y="15" width="8" height="6" rx="3" fill="#2C3E50" />

      {/* Cheek pixels */}
      <rect x="15" y="23" width="3" height="2" rx="1" fill="#FFB6C1" opacity="0.45" />
      <rect x="30" y="23" width="3" height="2" rx="1" fill="#FFB6C1" opacity="0.45" />

      {/* Nose */}
      <rect x="22" y="20" width="4" height="3" rx="1.5" fill="#2C3E50" />

      {/* Pixel face states */}
      <PixelFace eyeColor="#2C3038" />
      <PixelMouth color="#1A252F" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Pixel bamboo stick */}
      <rect x="36" y="24" width="2.5" height="16" rx="1.2" fill="#4CAF50" stroke="#388E3C" strokeWidth="0.6" />
      {/* Bamboo segments */}
      <rect x="35.5" y="28" width="3.5" height="1" rx="0.5" fill="#388E3C" />
      <rect x="35.5" y="33" width="3.5" height="1" rx="0.5" fill="#388E3C" />
      {/* Bamboo leaves */}
      <path d="M38 24 H41 V26 H42 V28 H41 V29 H38 Z" fill="#66BB6A" stroke="#4CAF50" strokeWidth="0.5" strokeLinejoin="miter" />
      <path d="M38 30 H40 V32 H41 V34 H40 V35 H38 Z" fill="#81C784" stroke="#66BB6A" strokeWidth="0.5" strokeLinejoin="miter" />
    </>
  ),
};

/* ─── GOLDEN RETRIEVER ─── External pixel spritesheet ─── */
const goldenRetrieverPet: PetDefinition = {
  viewBox: "0 0 64 64",
  usesCustomFace: true,
  spriteSheets: {
    idle: { src: "/pets/golden-retriever/golden-retriever.png", frames: 32 },
    wave: { src: "/pets/golden-retriever/golden-retriever.png", frames: 32 },
    eating: { src: "/pets/golden-retriever/golden-retriever.png", frames: 32 },
    frameWidth: 32,
    frameHeight: 32,
    sheetHeight: 64,
    scale: 3.4,
  },
  body: null,
  face: null,
  mouth: null,
  accessories: null,
};

/* ─── MUSHROOM ─── External pixel spritesheet ─── */
const mushroomPet: PetDefinition = {
  viewBox: "0 0 48 48",
  usesCustomFace: true,
  spriteSheets: {
    idle: { src: "/pets/mushroom/mushroom-idle.png", frames: 9 },
    wave: { src: "/pets/mushroom/mushroom-walk.png", frames: 4 },
    eating: { src: "/pets/mushroom/mushroom-walk.png", frames: 4 },
    frameWidth: 48,
    frameHeight: 48,
    scale: 2.5,
  },
  body: null,
  face: null,
  mouth: null,
  accessories: null,
};

/* ─── KOALA ─── Soft grey with big fluffy ears ─── */
const koalaPet: PetDefinition = {
  viewBox: "0 0 48 56",
  faceTransform: "translate(8 6)",
  usesCustomFace: true,
  body: (
    <>
      {/* Ground shadow */}
      <rect x="10" y="52" width="28" height="3" rx="1.5" fill="#607D8B" opacity="0.22" />

      {/* Upright mascot torso */}
      <rect x="15" y="26" width="18" height="23" rx="3" fill="#90A4AE" stroke="#607D8B" strokeWidth="1.4" />
      <rect x="20" y="28" width="8" height="4" fill="#90A4AE" stroke="#607D8B" strokeWidth="1" />
      <rect x="19" y="34" width="10" height="11" rx="4" fill="#ECEFF1" />

      {/* Slimmer arms with separated paws */}
      <rect x="10" y="31" width="4" height="13" rx="1.8" fill="#78909C" stroke="#607D8B" strokeWidth="1" />
      <rect x="34" y="31" width="4" height="13" rx="1.8" fill="#78909C" stroke="#607D8B" strokeWidth="1" />
      <rect x="9" y="40" width="6" height="5" rx="2" fill="#90A4AE" stroke="#607D8B" strokeWidth="1" />
      <rect x="33" y="40" width="6" height="5" rx="2" fill="#90A4AE" stroke="#607D8B" strokeWidth="1" />

      {/* Long character legs and clear feet */}
      <rect x="16" y="42" width="6" height="10" rx="1.5" fill="#90A4AE" stroke="#607D8B" strokeWidth="1" />
      <rect x="26" y="42" width="6" height="10" rx="1.5" fill="#90A4AE" stroke="#607D8B" strokeWidth="1" />
      <rect x="13" y="50" width="10" height="4" rx="1.8" fill="#ECEFF1" stroke="#607D8B" strokeWidth="1.1" />
      <rect x="25" y="50" width="10" height="4" rx="1.8" fill="#ECEFF1" stroke="#607D8B" strokeWidth="1.1" />
      <rect x="23" y="43" width="2" height="8" fill="#607D8B" opacity="0.5" />

      {/* Big fluffy ears */}
      <g className="pet-ear-left">
        <rect x="6" y="0" width="13" height="13" rx="6.5" fill="#78909C" stroke="#607D8B" strokeWidth="1" />
        <rect x="8" y="2" width="9" height="9" rx="4.5" fill="#ECEFF1" />
        <rect x="6.5" y="1" width="2.5" height="2.5" rx="1.25" fill="#90A4AE" />
        <rect x="13.5" y="1" width="2.5" height="2.5" rx="1.25" fill="#90A4AE" />
      </g>
      <g className="pet-ear-right">
        <rect x="29" y="0" width="13" height="13" rx="6.5" fill="#78909C" stroke="#607D8B" strokeWidth="1" />
        <rect x="31" y="2" width="9" height="9" rx="4.5" fill="#ECEFF1" />
        <rect x="29.5" y="1" width="2.5" height="2.5" rx="1.25" fill="#90A4AE" />
        <rect x="36.5" y="1" width="2.5" height="2.5" rx="1.25" fill="#90A4AE" />
      </g>

      {/* Head with stepped silhouette */}
      <path d="M15 11 H33 V14 H35 V25 H33 V28 H29 V30 H19 V28 H15 V25 H13 V14 H15 Z" fill="#90A4AE" stroke="#607D8B" strokeWidth="1.4" strokeLinejoin="miter" />

      {/* Shoulder pixels connect head and arms */}
      <rect x="12" y="29" width="5" height="3" rx="1.4" fill="#78909C" stroke="#607D8B" strokeWidth="0.9" />
      <rect x="31" y="29" width="5" height="3" rx="1.4" fill="#78909C" stroke="#607D8B" strokeWidth="0.9" />

      {/* Cheek pixels */}
      <rect x="15" y="22" width="3" height="2" rx="1" fill="#FFB6C1" opacity="0.35" />
      <rect x="30" y="22" width="3" height="2" rx="1" fill="#FFB6C1" opacity="0.35" />

      {/* Large nose */}
      <rect x="20" y="18" width="8" height="7" rx="3.5" fill="#37474F" stroke="#263238" strokeWidth="0.8" />
      <rect x="22" y="19" width="3" height="2" rx="1" fill="#546E7A" />

      {/* Pixel face states */}
      <PixelFace />
      <PixelMouth color="#5C351D" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Pixel eucalyptus branch */}
      <rect x="36" y="28" width="2" height="14" rx="1" fill="#6D4C41" stroke="#5D4037" strokeWidth="0.5" />
      {/* Leaves */}
      <path d="M37 24 H40 V26 H41 V29 H40 V30 H37 Z" fill="#66BB6A" stroke="#4CAF50" strokeWidth="0.5" strokeLinejoin="miter" />
      <path d="M37 31 H39 V33 H40 V35 H39 V36 H37 Z" fill="#81C784" stroke="#66BB6A" strokeWidth="0.5" strokeLinejoin="miter" />
      <path d="M36 27 H38 V29 H39 V31 H38 V32 H36 Z" fill="#A5D6A7" stroke="#81C784" strokeWidth="0.5" strokeLinejoin="miter" />
    </>
  ),
};

/* ─── FROG ─── Bright green with big bulging eyes ─── */
const frogPet: PetDefinition = {
  viewBox: "0 0 48 56",
  faceTransform: "translate(8 6)",
  usesCustomFace: true,
  body: (
    <>
      {/* Ground shadow */}
      <rect x="10" y="52" width="28" height="3" rx="1.5" fill="#388E3C" opacity="0.22" />

      {/* Upright mascot torso — wider for frog */}
      <rect x="14" y="26" width="20" height="23" rx="3" fill="#66BB6A" stroke="#388E3C" strokeWidth="1.4" />
      <rect x="19" y="28" width="10" height="4" fill="#66BB6A" stroke="#388E3C" strokeWidth="1" />
      <rect x="18" y="34" width="12" height="11" rx="4" fill="#C8E6C9" />

      {/* Slimmer arms with separated paws */}
      <rect x="9" y="31" width="4" height="13" rx="1.8" fill="#4CAF50" stroke="#388E3C" strokeWidth="1" />
      <rect x="35" y="31" width="4" height="13" rx="1.8" fill="#4CAF50" stroke="#388E3C" strokeWidth="1" />
      <rect x="8" y="40" width="6" height="5" rx="2" fill="#66BB6A" stroke="#388E3C" strokeWidth="1" />
      <rect x="34" y="40" width="6" height="5" rx="2" fill="#66BB6A" stroke="#388E3C" strokeWidth="1" />

      {/* Long character legs and webbed feet */}
      <rect x="16" y="42" width="6" height="10" rx="1.5" fill="#66BB6A" stroke="#388E3C" strokeWidth="1" />
      <rect x="26" y="42" width="6" height="10" rx="1.5" fill="#66BB6A" stroke="#388E3C" strokeWidth="1" />
      {/* Webbed feet */}
      <path d="M13 50 L15 53 L17 50 L19 53 L21 50 L23 53 L25 50 L23 50 L13 50 Z" fill="#C8E6C9" stroke="#388E3C" strokeWidth="0.8" strokeLinejoin="miter" />
      <path d="M23 50 L25 53 L27 50 L29 53 L31 50 L33 53 L35 50 L33 50 L23 50 Z" fill="#C8E6C9" stroke="#388E3C" strokeWidth="0.8" strokeLinejoin="miter" />
      <rect x="23" y="43" width="2" height="8" fill="#388E3C" opacity="0.5" />

      {/* Bulging eyes on top */}
      <g className="pet-ear-left">
        <rect x="10" y="1" width="10" height="10" rx="5" fill="#66BB6A" stroke="#388E3C" strokeWidth="1" />
      </g>
      <g className="pet-ear-right">
        <rect x="28" y="1" width="10" height="10" rx="5" fill="#66BB6A" stroke="#388E3C" strokeWidth="1" />
      </g>

      {/* Head with stepped silhouette — wider for frog */}
      <path d="M13 11 H35 V14 H37 V25 H35 V28 H31 V30 H17 V28 H13 V25 H11 V14 H13 Z" fill="#66BB6A" stroke="#388E3C" strokeWidth="1.4" strokeLinejoin="miter" />

      {/* Shoulder pixels connect head and arms */}
      <rect x="10" y="29" width="6" height="3" rx="1.4" fill="#4CAF50" stroke="#388E3C" strokeWidth="0.9" />
      <rect x="32" y="29" width="6" height="3" rx="1.4" fill="#4CAF50" stroke="#388E3C" strokeWidth="0.9" />

      {/* Cheek pixels */}
      <rect x="14" y="23" width="4" height="3" rx="1.5" fill="#FF8A8A" opacity="0.45" />
      <rect x="30" y="23" width="4" height="3" rx="1.5" fill="#FF8A8A" opacity="0.45" />

      {/* Belly spots on head */}
      <rect x="18" y="16" width="1.5" height="1.5" rx="0.75" fill="#81C784" opacity="0.5" />
      <rect x="28" y="15.5" width="1.5" height="1.5" rx="0.75" fill="#81C784" opacity="0.5" />

      {/* Nostrils */}
      <rect x="21" y="21" width="2" height="1.5" rx="0.75" fill="#388E3C" />
      <rect x="25" y="21" width="2" height="1.5" rx="0.75" fill="#388E3C" />

      {/* Pixel face states */}
      <PixelFace />
      <PixelMouth color="#388E3C" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Pixel mushroom */}
      <path d="M33 28 H38 V30 H40 V32 H38 V33 H33 Z" fill="#E53935" stroke="#C62828" strokeWidth="0.6" strokeLinejoin="miter" />
      <rect x="34.5" y="28.5" width="1.5" height="1.5" rx="0.75" fill="#FFF" opacity="0.8" />
      <rect x="37" y="29" width="1" height="1" rx="0.5" fill="#FFF" opacity="0.8" />
      <rect x="35" y="33" width="4" height="6" rx="1.5" fill="#ECEFF1" stroke="#CFD8DC" strokeWidth="0.5" />
    </>
  ),
};

/* ─── AXOLOTL ─── Pink with external gills ─── */
const axolotlPet: PetDefinition = {
  viewBox: "0 0 48 56",
  faceTransform: "translate(8 6)",
  usesCustomFace: true,
  body: (
    <>
      {/* Ground shadow */}
      <rect x="10" y="52" width="28" height="3" rx="1.5" fill="#E86B8A" opacity="0.22" />

      {/* Blocky tail with fin */}
      <g className="pet-tail">
        <rect x="5" y="30" width="5" height="14" fill="#FF8A8A" />
        <rect x="3" y="32" width="3" height="10" rx="1.5" fill="#FFB6C1" opacity="0.7" />
        <rect x="7" y="26" width="5" height="5" fill="#FFB6C1" />
        <rect x="6" y="43" width="8" height="4" fill="#E86B8A" />
      </g>

      {/* Upright mascot torso */}
      <rect x="15" y="26" width="18" height="23" rx="3" fill="#FFB6C1" stroke="#E86B8A" strokeWidth="1.4" />
      <rect x="20" y="28" width="8" height="4" fill="#FFB6C1" stroke="#E86B8A" strokeWidth="1" />
      <rect x="19" y="34" width="10" height="11" rx="4" fill="#FFE0E9" />

      {/* Belly spots on torso */}
      <rect x="21" y="36" width="1" height="1" rx="0.5" fill="#FF8AAB" opacity="0.5" />
      <rect x="25" y="38" width="1" height="1" rx="0.5" fill="#FF8AAB" opacity="0.5" />
      <rect x="23" y="40" width="1" height="1" rx="0.5" fill="#FF8AAB" opacity="0.5" />

      {/* Slimmer arms with separated paws */}
      <rect x="10" y="31" width="4" height="13" rx="1.8" fill="#FF8A8A" stroke="#E86B8A" strokeWidth="1" />
      <rect x="34" y="31" width="4" height="13" rx="1.8" fill="#FF8A8A" stroke="#E86B8A" strokeWidth="1" />
      <rect x="9" y="40" width="6" height="5" rx="2" fill="#FFB6C1" stroke="#E86B8A" strokeWidth="1" />
      <rect x="33" y="40" width="6" height="5" rx="2" fill="#FFB6C1" stroke="#E86B8A" strokeWidth="1" />

      {/* Long character legs and clear feet */}
      <rect x="16" y="42" width="6" height="10" rx="1.5" fill="#FFB6C1" stroke="#E86B8A" strokeWidth="1" />
      <rect x="26" y="42" width="6" height="10" rx="1.5" fill="#FFB6C1" stroke="#E86B8A" strokeWidth="1" />
      <rect x="13" y="50" width="10" height="4" rx="1.8" fill="#FFE0E9" stroke="#E86B8A" strokeWidth="1.1" />
      <rect x="25" y="50" width="10" height="4" rx="1.8" fill="#FFE0E9" stroke="#E86B8A" strokeWidth="1.1" />
      <rect x="23" y="43" width="2" height="8" fill="#E86B8A" opacity="0.5" />

      {/* External gills */}
      <g className="pet-gills-left">
        <rect x="4" y="7" width="3" height="8" rx="1.5" fill="#FF69B4" stroke="#FF1493" strokeWidth="0.6" />
        <rect x="3" y="12" width="3" height="7" rx="1.5" fill="#FF69B4" stroke="#FF1493" strokeWidth="0.6" />
        <rect x="5" y="17" width="3" height="6" rx="1.5" fill="#FF69B4" stroke="#FF1493" strokeWidth="0.6" />
        {/* Gill tips */}
        <rect x="4.5" y="7" width="2" height="2" rx="1" fill="#FF1493" opacity="0.6" />
        <rect x="3.5" y="12" width="2" height="2" rx="1" fill="#FF1493" opacity="0.6" />
        <rect x="5.5" y="17" width="2" height="2" rx="1" fill="#FF1493" opacity="0.6" />
      </g>
      <g className="pet-gills-right">
        <rect x="41" y="7" width="3" height="8" rx="1.5" fill="#FF69B4" stroke="#FF1493" strokeWidth="0.6" />
        <rect x="42" y="12" width="3" height="7" rx="1.5" fill="#FF69B4" stroke="#FF1493" strokeWidth="0.6" />
        <rect x="40" y="17" width="3" height="6" rx="1.5" fill="#FF69B4" stroke="#FF1493" strokeWidth="0.6" />
        <rect x="41.5" y="7" width="2" height="2" rx="1" fill="#FF1493" opacity="0.6" />
        <rect x="42.5" y="12" width="2" height="2" rx="1" fill="#FF1493" opacity="0.6" />
        <rect x="40.5" y="17" width="2" height="2" rx="1" fill="#FF1493" opacity="0.6" />
      </g>

      {/* Head with stepped silhouette */}
      <path d="M15 11 H33 V14 H35 V25 H33 V28 H29 V30 H19 V28 H15 V25 H13 V14 H15 Z" fill="#FFB6C1" stroke="#E86B8A" strokeWidth="1.4" strokeLinejoin="miter" />

      {/* Shoulder pixels connect head and arms */}
      <rect x="12" y="29" width="5" height="3" rx="1.4" fill="#FF8A8A" stroke="#E86B8A" strokeWidth="0.9" />
      <rect x="31" y="29" width="5" height="3" rx="1.4" fill="#FF8A8A" stroke="#E86B8A" strokeWidth="0.9" />

      {/* Cheek pixels */}
      <rect x="15" y="22" width="4" height="3" rx="1.5" fill="#FF69B4" opacity="0.45" />
      <rect x="29" y="22" width="4" height="3" rx="1.5" fill="#FF69B4" opacity="0.45" />

      {/* Head spots */}
      <rect x="17" y="12" width="1.5" height="1.5" rx="0.75" fill="#FF8AAB" opacity="0.4" />
      <rect x="28" y="11.5" width="1.5" height="1.5" rx="0.75" fill="#FF8AAB" opacity="0.4" />
      <rect x="22" y="11" width="1" height="1" rx="0.5" fill="#FF8AAB" opacity="0.4" />

      {/* Nose */}
      <rect x="23" y="20" width="2" height="2" rx="1" fill="#E86B8A" />

      {/* Pixel face states */}
      <PixelFace />
      <PixelMouth color="#C4848A" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Glowing bubble */}
      <rect x="33" y="24" width="7" height="7" rx="3.5" fill="#E0F7FA" opacity="0.7" stroke="#80DEEA" strokeWidth="0.8" />
      <rect x="35" y="26" width="3" height="3" rx="1.5" fill="#B2EBF2" opacity="0.4" />
      <rect x="34" y="25" width="1.5" height="1.5" rx="0.75" fill="#FFF" opacity="0.7" />
      <rect x="38" y="24.5" width="1" height="1" rx="0.5" fill="#FFF" opacity="0.5" />
    </>
  ),
};

/* ─── BEAR ─── Rich brown with honey pot ─── */
const bearPet: PetDefinition = {
  viewBox: "0 0 48 56",
  faceTransform: "translate(8 6)",
  usesCustomFace: true,
  body: (
    <>
      {/* Ground shadow */}
      <rect x="10" y="52" width="28" height="3" rx="1.5" fill="#5D4037" opacity="0.22" />

      {/* Tiny tail */}
      <g className="pet-tail">
        <rect x="5" y="35" width="5" height="5" rx="2.5" fill="#6D4C41" stroke="#5D4037" strokeWidth="0.8" />
      </g>

      {/* Upright mascot torso */}
      <rect x="15" y="26" width="18" height="23" rx="3" fill="#8D6E63" stroke="#5D4037" strokeWidth="1.4" />
      <rect x="20" y="28" width="8" height="4" fill="#8D6E63" stroke="#5D4037" strokeWidth="1" />
      <rect x="19" y="34" width="10" height="11" rx="4" fill="#D7CCC8" />

      {/* Slimmer arms with separated paws */}
      <rect x="10" y="31" width="4" height="13" rx="1.8" fill="#6D4C41" stroke="#5D4037" strokeWidth="1" />
      <rect x="34" y="31" width="4" height="13" rx="1.8" fill="#6D4C41" stroke="#5D4037" strokeWidth="1" />
      <rect x="9" y="40" width="6" height="5" rx="2" fill="#8D6E63" stroke="#5D4037" strokeWidth="1" />
      <rect x="33" y="40" width="6" height="5" rx="2" fill="#8D6E63" stroke="#5D4037" strokeWidth="1" />

      {/* Long character legs and clear feet */}
      <rect x="16" y="42" width="6" height="10" rx="1.5" fill="#8D6E63" stroke="#5D4037" strokeWidth="1" />
      <rect x="26" y="42" width="6" height="10" rx="1.5" fill="#8D6E63" stroke="#5D4037" strokeWidth="1" />
      <rect x="13" y="50" width="10" height="4" rx="1.8" fill="#D7CCC8" stroke="#5D4037" strokeWidth="1.1" />
      <rect x="25" y="50" width="10" height="4" rx="1.8" fill="#D7CCC8" stroke="#5D4037" strokeWidth="1.1" />
      <rect x="23" y="43" width="2" height="8" fill="#5D4037" opacity="0.5" />

      {/* Round ears */}
      <g className="pet-ear-left">
        <rect x="10" y="2" width="8" height="8" rx="4" fill="#6D4C41" stroke="#5D4037" strokeWidth="1" />
        <rect x="12" y="4" width="4" height="4" rx="2" fill="#D7CCC8" />
      </g>
      <g className="pet-ear-right">
        <rect x="30" y="2" width="8" height="8" rx="4" fill="#6D4C41" stroke="#5D4037" strokeWidth="1" />
        <rect x="32" y="4" width="4" height="4" rx="2" fill="#D7CCC8" />
      </g>

      {/* Head with stepped silhouette */}
      <path d="M15 11 H33 V14 H35 V25 H33 V28 H29 V30 H19 V28 H15 V25 H13 V14 H15 Z" fill="#8D6E63" stroke="#5D4037" strokeWidth="1.4" strokeLinejoin="miter" />

      {/* Shoulder pixels connect head and arms */}
      <rect x="12" y="29" width="5" height="3" rx="1.4" fill="#6D4C41" stroke="#5D4037" strokeWidth="0.9" />
      <rect x="31" y="29" width="5" height="3" rx="1.4" fill="#6D4C41" stroke="#5D4037" strokeWidth="0.9" />

      {/* Snout area */}
      <path d="M21 19 H27 V21 H29 V25 H27 V27 H21 V27 H19 V25 H19 V21 H21 Z" fill="#D7CCC8" opacity="0.5" />

      {/* Cheek pixels */}
      <rect x="15" y="23" width="3" height="2" rx="1" fill="#FFB6C1" opacity="0.3" />
      <rect x="30" y="23" width="3" height="2" rx="1" fill="#FFB6C1" opacity="0.3" />

      {/* Nose */}
      <rect x="22" y="20" width="4" height="3" rx="1.5" fill="#3E2723" />
      <rect x="22.5" y="20.5" width="1.5" height="1" rx="0.5" fill="#5D4037" />

      {/* Pixel face states */}
      <PixelFace />
      <PixelMouth color="#5C351D" />
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Pixel honey pot */}
      <rect x="33" y="29" width="8" height="10" rx="2" fill="#FFB300" stroke="#FF8F00" strokeWidth="0.8" />
      {/* Pot lid */}
      <rect x="32" y="27" width="10" height="3" rx="1.5" fill="#FF8F00" stroke="#E65100" strokeWidth="0.6" />
      {/* Lid knob */}
      <rect x="35.5" y="25.5" width="3" height="2" rx="1" fill="#FF8F00" stroke="#E65100" strokeWidth="0.5" />
      {/* Honey drip */}
      <rect x="37" y="30" width="1.5" height="3" rx="0.75" fill="#FFC107" />
      {/* Label */}
      <rect x="34.5" y="33" width="5" height="3" rx="0.8" fill="#FFF8E1" />
      <rect x="35.5" y="34" width="3" height="1" rx="0.5" fill="#FF8F00" opacity="0.6" />
    </>
  ),
};

/* ─── PIDERMAN ─── Red & Blue web-slinger mascot ─── */
const pidermanPet: PetDefinition = {
  viewBox: "0 0 48 56",
  faceTransform: "translate(8 6)",
  usesCustomFace: true,
  body: (
    <>
      {/* Ground shadow */}
      <rect x="10" y="52" width="28" height="3" rx="1.5" fill="#0D1B60" opacity="0.22" />

      {/* Upright mascot torso: Red with Blue sides and crotch */}
      <rect x="15" y="24" width="18" height="25" rx="3" fill="#E53935" stroke="#9E1F1F" strokeWidth="1.4" />
      {/* Blue sides */}
      <rect x="15" y="30" width="3.5" height="15" fill="#1A237E" />
      <rect x="29.5" y="30" width="3.5" height="15" fill="#1A237E" />
      {/* Blue crotch */}
      <rect x="18" y="42" width="12" height="4" fill="#1A237E" />

      {/* Tiny black chest spider logo */}
      <rect x="23" y="30" width="2" height="3.5" rx="0.5" fill="#1A1A1A" />
      <path d="M 21 29.5 H 27 M 21 31.5 H 27 M 22 33.5 H 26" stroke="#1A1A1A" strokeWidth="0.8" />

      {/* Long red arms */}
      <rect x="9" y="27" width="5" height="19" rx="2" fill="#E53935" stroke="#9E1F1F" strokeWidth="1" />
      <rect x="34" y="27" width="5" height="19" rx="2" fill="#E53935" stroke="#9E1F1F" strokeWidth="1" />
      <rect x="8" y="43" width="7" height="6" rx="2" fill="#E53935" stroke="#9E1F1F" strokeWidth="1.1" />
      <rect x="33" y="43" width="7" height="6" rx="2" fill="#E53935" stroke="#9E1F1F" strokeWidth="1.1" />

      {/* Long blue character legs and red feet/boots */}
      <rect x="16" y="42" width="7" height="10" rx="1.8" fill="#1A237E" stroke="#0D1B60" strokeWidth="1.1" />
      <rect x="25" y="42" width="7" height="10" rx="1.8" fill="#1A237E" stroke="#0D1B60" strokeWidth="1.1" />
      <rect x="12" y="50" width="12" height="5" rx="2" fill="#E53935" stroke="#9E1F1F" strokeWidth="1.2" />
      <rect x="24" y="50" width="12" height="5" rx="2" fill="#E53935" stroke="#9E1F1F" strokeWidth="1.2" />
      <rect x="19" y="43" width="1" height="8" fill="#0D1B60" opacity="0.5" />
      <rect x="28" y="43" width="1" height="8" fill="#0D1B60" opacity="0.5" />

      {/* Head: Red with stepped silhouette */}
      <path d="M14 9 H34 V12 H38 V25 H35 V28 H30 V30 H18 V28 H13 V25 H10 V12 H14 Z" fill="#E53935" stroke="#9E1F1F" strokeWidth="1.4" strokeLinejoin="miter" />

      {/* Shoulder connection pixels */}
      <rect x="11" y="26" width="5" height="4" rx="1.5" fill="#E53935" stroke="#9E1F1F" strokeWidth="0.9" />
      <rect x="32" y="26" width="5" height="4" rx="1.5" fill="#E53935" stroke="#9E1F1F" strokeWidth="0.9" />

      {/* Web pattern lines on head (subtle overlay) */}
      <line x1="24" y1="9" x2="24" y2="30" stroke="#1A1A1A" strokeWidth="0.8" opacity="0.25" />
      <line x1="10" y1="19.5" x2="38" y2="19.5" stroke="#1A1A1A" strokeWidth="0.8" opacity="0.25" />
      <path d="M 14 9 L 34 29 M 34 9 L 14 29" stroke="#1A1A1A" strokeWidth="0.8" opacity="0.2" />
      <circle cx="24" cy="19.5" r="5" stroke="#1A1A1A" strokeWidth="0.8" fill="none" opacity="0.2" />
      <circle cx="24" cy="19.5" r="9" stroke="#1A1A1A" strokeWidth="0.8" fill="none" opacity="0.2" />

      {/* Custom Spiderman Mask eye expressions */}
      <g className="face-normal">
        <path d="M 15 14 C 17 14, 22 17, 22 19 C 22 22, 17 22, 15 17 Z" fill="#FAFAFA" stroke="#1A1A1A" strokeWidth="1.8" />
        <path d="M 33 14 C 31 14, 26 17, 26 19 C 26 22, 31 22, 33 17 Z" fill="#FAFAFA" stroke="#1A1A1A" strokeWidth="1.8" />
      </g>
      <g className="face-blink">
        <line x1="15" y1="18" x2="22" y2="20" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="square" />
        <line x1="33" y1="18" x2="26" y2="20" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="square" />
      </g>
      <g className="face-sleep">
        <path d="M 15 19 Q 18.5 17 22 20" stroke="#1A1A1A" strokeWidth="2" fill="none" strokeLinecap="square" />
        <path d="M 33 19 Q 29.5 17 26 20" stroke="#1A1A1A" strokeWidth="2" fill="none" strokeLinecap="square" />
      </g>
      <g className="face-happy">
        <path d="M 15 20 Q 18.5 15 22 18" stroke="#1A1A1A" strokeWidth="2" fill="none" strokeLinecap="square" />
        <path d="M 33 20 Q 29.5 15 26 18" stroke="#1A1A1A" strokeWidth="2" fill="none" strokeLinecap="square" />
      </g>
      <g className="face-star">
        <polygon points="18.5,14.5 20.5,18.5 24.5,18.5 21.5,21.5 22.5,25.5 18.5,23.5 14.5,25.5 15.5,21.5 12.5,18.5 16.5,18.5" fill="#FFD75A" stroke="#1A1A1A" strokeWidth="1.2" />
        <polygon points="29.5,14.5 31.5,18.5 35.5,18.5 32.5,21.5 33.5,25.5 29.5,23.5 25.5,25.5 26.5,21.5 23.5,18.5 27.5,18.5" fill="#FFD75A" stroke="#1A1A1A" strokeWidth="1.2" />
      </g>
      <g className="face-worry">
        <path d="M 15 15 C 17 15, 22 18, 22 20 C 22 23, 17 23, 15 18 Z" fill="#FAFAFA" stroke="#1A1A1A" strokeWidth="1.8" />
        <path d="M 33 15 C 31 15, 26 18, 26 20 C 26 23, 31 23, 33 18 Z" fill="#FAFAFA" stroke="#1A1A1A" strokeWidth="1.8" />
        <path d="M38 13 H40 V16 H39 V18 H37 V16 H36 V14 H38 Z" fill="#86D7F0" />
      </g>
      <g className="face-alarmed">
        <circle cx="18.5" cy="18.5" r="3.8" fill="#FAFAFA" stroke="#1A1A1A" strokeWidth="1.8" />
        <circle cx="29.5" cy="18.5" r="3.8" fill="#FAFAFA" stroke="#1A1A1A" strokeWidth="1.8" />
      </g>
    </>
  ),
  face: null,
  mouth: null,
  accessories: (
    <>
      {/* Web shot hanging from paw */}
      <path d="M35 44 Q42 41 46 43 M46 43 L42 40 M46 43 L42 46" stroke="#FAFAFA" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M35 44 Q42 41 46 43 M46 43 L42 40 M46 43 L42 46" stroke="#CCCCCC" strokeWidth="0.8" fill="none" strokeLinecap="round" />
    </>
  ),
};
