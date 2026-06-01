import { Keyboard, X } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000]/45 animate-in fade-in duration-200">
      <div className="bg-surface-0 rounded-mac shadow-2xl border border-border w-[500px] max-h-[80vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-surface-1-40">
          <Keyboard size={15} className="text-accent shrink-0" />
          <span className="text-xs font-semibold text-text-primary flex-1">
            Keyboard Shortcuts
          </span>
          <button
            onClick={onClose}
            className="ghost p-1 text-text-muted hover:text-text-primary"
            title="Close (Esc)"
          >
            <X size={13} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pr-3.5">
          {shortcuts.map((section) => (
            <div key={section.category} className="space-y-2">
              <h3 className="text-3xs font-semibold text-text-muted uppercase tracking-wider pl-1">
                {section.category}
              </h3>
              <div className="bg-surface-1-30 border border-border-40 rounded-mac p-3.5 space-y-3">
                {section.items.map((item, idx) => (
                  <div
                    key={item.label}
                    className={`flex items-center justify-between gap-4 text-xs ${
                      idx > 0 ? "border-t border-border-40 pt-2.5" : ""
                    }`}
                  >
                    <span className="text-text-secondary font-medium">{item.label}</span>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {item.keys.split("+").map((key, keyIdx) => (
                        <kbd
                          key={keyIdx}
                          className="font-mono text-3xs font-semibold text-text-muted bg-surface-2 border border-border rounded px-1.5 py-0.5 shadow-sm min-w-[20px] text-center"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border-60 bg-surface-1 text-2xs text-text-muted flex justify-between items-center">
          <span>
            Press <kbd className="font-mono bg-surface-2 border border-border rounded px-1 py-0.5 text-3xs shadow-sm">Esc</kbd> to close
          </span>
          <button
            onClick={onClose}
            className="h-7 px-3 text-2xs text-text-secondary hover:text-text-primary border border-border hover:bg-surface-2 rounded-mac transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
