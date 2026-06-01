import { X } from "lucide-react";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  if (!open) return null;

  const shortcuts = [
    { category: "Navigation", items: [
      { label: "Toggle sidebar", keys: "Cmd+B" },
      { label: "Open search", keys: "Cmd+F" },
    ]},
    { category: "Staging & Commits", items: [
      { label: "Stage all changes", keys: "Cmd+S" },
      { label: "Unstage all changes", keys: "Cmd+U" },
      { label: "Quick stage all", keys: "Cmd+Shift+A" },
      { label: "Commit staged changes", keys: "Cmd+Enter" },
    ]},
    { category: "Dialogs & UI", items: [
      { label: "Open settings", keys: "Cmd+," },
      { label: "Close dialog", keys: "Esc" },
      { label: "Open keyboard reference", keys: "Cmd+?" },
    ]},
    { category: "File Selection", items: [
      { label: "Select file", keys: "Click" },
      { label: "Multi-select range", keys: "Shift+Click" },
      { label: "Clear selection", keys: "Esc" },
    ]},
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface-0 rounded-mac shadow-xl border border-border w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <h2 className="text-sm font-semibold text-text-primary">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="ghost text-xs p-1 hover:bg-surface-2 rounded transition-colors"
            title="Close (Esc)"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                {section.category}
              </h3>
              <div className="space-y-1.5">
                {section.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4 text-xs">
                    <span className="text-text-secondary">{item.label}</span>
                    <span className="font-mono text-2xs text-text-muted bg-surface-1 border border-border rounded px-2 py-1 whitespace-nowrap">
                      {item.keys}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border/40 bg-surface-1 text-2xs text-text-muted">
          Press <span className="font-mono bg-surface-0 border border-border rounded px-1">Esc</span> to close
        </div>
      </div>
    </div>
  );
}
