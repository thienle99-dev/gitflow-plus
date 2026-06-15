import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

export interface ContextMenuItem {
  label: string;
  shortcut?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  separator?: boolean;
  action: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Focus the first non-disabled, non-separator item on open
  useEffect(() => {
    if (!ref.current) return;
    const firstItem = ref.current.querySelector<HTMLElement>(
      '[role="menuitem"]:not([disabled])',
    );
    firstItem?.focus();
  }, []);

  const getMenuItemElements = useCallback(() => {
    if (!ref.current) return [];
    return Array.from(ref.current.querySelectorAll<HTMLElement>('[role="menuitem"]'));
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const menuItems = getMenuItemElements();
      const currentIndex = menuItems.indexOf(document.activeElement as HTMLElement);

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const next = currentIndex < menuItems.length - 1 ? currentIndex + 1 : 0;
          menuItems[next]?.focus();
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const prev = currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1;
          menuItems[prev]?.focus();
          break;
        }
        case "Home": {
          e.preventDefault();
          menuItems[0]?.focus();
          break;
        }
        case "End": {
          e.preventDefault();
          menuItems[menuItems.length - 1]?.focus();
          break;
        }
        case "Enter":
        case " ": {
          e.preventDefault();
          (document.activeElement as HTMLElement)?.click();
          break;
        }
        case "Escape": {
          e.preventDefault();
          onClose();
          break;
        }
      }
    },
    [getMenuItemElements, onClose],
  );

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid the same right-click closing immediately
    setTimeout(() => {
      window.addEventListener("click", handleClick);
      window.addEventListener("contextmenu", handleClick);
      document.addEventListener("keydown", handleKeyDown);
    }, 0);
    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("contextmenu", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, handleKeyDown]);

  let itemIndex = 0;

  // Render via a portal to document.body so the menu escapes any ancestor
  // that creates a new containing block for fixed-positioned descendants
  // (e.g. the sidebar's `.vibrancy` uses `backdrop-filter`, which would
  // otherwise make `position: fixed` relative to the sidebar instead of
  // the viewport — causing the menu to appear offset from the click point).
  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label="Context menu"
      className="fixed z-50 min-w-[160px] py-1 bg-surface-1 border border-border rounded-mac shadow-lg"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => (
        item.separator ? (
          <div key={i} role="separator" className="h-[1px] bg-border mx-2 my-1" />
        ) : (
          <button
            key={i}
            role="menuitem"
            tabIndex={-1}
            disabled={item.disabled}
            aria-disabled={item.disabled}
            className="w-full flex items-center gap-2 px-3 py-1 text-xs text-text-primary hover:bg-accent hover:text-accent-fg disabled:opacity-30 disabled:hover:bg-transparent focus:outline-none focus:bg-accent focus:text-accent-fg"
            onClick={() => {
              item.action();
              onClose();
            }}
          >
            {item.icon && <span className="w-4 h-4 flex items-center" aria-hidden="true">{item.icon}</span>}
            <span className="flex-1 text-left">{item.label}</span>
            {item.shortcut && <span className="text-2xs text-text-muted" aria-label={`Shortcut: ${item.shortcut}`}>{item.shortcut}</span>}
          </button>
        )
      ))}
    </div>,
    document.body
  );
}
