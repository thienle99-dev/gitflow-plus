import { toast as sonnerToast } from "sonner";

/**
 * Unified toast notification helper backed by Sonner.
 * Use this everywhere instead of local `[toast, setToast]` state.
 */
export function showToast(msg: string, type: "success" | "error" | "info" = "success") {
  switch (type) {
    case "error":
      sonnerToast.error(msg);
      break;
    case "info":
      sonnerToast.info(msg);
      break;
    default:
      sonnerToast.success(msg);
  }
}
