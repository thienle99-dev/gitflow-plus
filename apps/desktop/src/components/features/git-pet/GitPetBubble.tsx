import type { PetState } from "./usePetState";

const BUBBLE_MESSAGES: Record<PetState, string | null> = {
  loading: "Syncing...",
  success: "Done! ✓",
  error: "Uh oh...",
  alarmed: "Conflicts!",
  sleeping: "Zzz...",
  waving: "Hello! 👋",
  idle: null,
  blink: null,
  excited: "Let's go!",
};

interface GitPetBubbleProps {
  state: PetState;
}

export default function GitPetBubble({ state }: GitPetBubbleProps) {
  const message = BUBBLE_MESSAGES[state];
  if (!message) return null;

  return <div className="pet-bubble">{message}</div>;
}
