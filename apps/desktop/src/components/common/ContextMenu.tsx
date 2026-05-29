import { useEffect, useRef } from "react";

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

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // Delay to avoid the same right-click closing immediately
    setTimeout(() => {
      window.addEventListener("click", handleClick);
      window.addEventListener("contextmenu", handleClick);
      window.addEventListener("keydown", handleEsc);
    }, 0);
    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("contextmenu", handleClick);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[160px] py-1 bg-surface-1 border border-border rounded-mac shadow-lg"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => (
        item.separator ? (
          <div key={i} className="h-[1px] bg-border mx-2 my-1" />
        ) : (
          <button
            key={i}
            disabled={item.disabled}
            className="w-full flex items-center gap-2 px-3 py-1 text-xs text-text-primary hover:bg-accent hover:text-accent-fg disabled:opacity-30 disabled:hover:bg-transparent"
            onClick={() => {
              item.action();
              onClose();
            }}
          >
            {item.icon && <span className="w-4 h-4 flex items-center">{item.icon}</span>}
            <span className="flex-1 text-left">{item.label}</span>
            {item.shortcut && <span className="text-2xs text-text-muted">{item.shortcut}</span>}
          </button>
        )
      ))}
    </div>
  );
}
