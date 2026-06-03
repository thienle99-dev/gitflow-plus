import { useState, useRef, useEffect, useCallback } from "react";
import { useRepoStore } from "@/stores/repo";
import {
  useCommitTemplates,
  resolveTemplate,
  type CommitTemplate,
} from "@/queries/useCommitTemplates";
import { showToast } from "@/lib/toast";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
} from "lucide-react";

interface CommitTemplatePickerProps {
  onSelect: (message: string) => void;
}

export default function CommitTemplatePicker({ onSelect }: CommitTemplatePickerProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const { templates, addTemplate, updateTemplate, deleteTemplate } =
    useCommitTemplates(repoPath);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CommitTemplate | null>(null);
  const [adding, setAdding] = useState(false);
  const [formLabel, setFormLabel] = useState("");
  const [formBody, setFormBody] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setEditing(null);
        setAdding(false);
      }
    };
    setTimeout(() => window.addEventListener("mousedown", handle), 0);
    return () => window.removeEventListener("mousedown", handle);
  }, [open]);

  const handleSelect = useCallback(
    (tpl: CommitTemplate) => {
      const resolved = resolveTemplate(tpl.body);
      onSelect(resolved);
      setOpen(false);
      setEditing(null);
      setAdding(false);
    },
    [onSelect],
  );

  const startEdit = (tpl: CommitTemplate) => {
    setEditing(tpl);
    setFormLabel(tpl.label);
    setFormBody(tpl.body);
    setAdding(false);
  };

  const startAdd = () => {
    setAdding(true);
    setEditing(null);
    setFormLabel("");
    setFormBody("feat({{scope}}): {{description}}\n\n{{body}}");
  };

  const cancelForm = () => {
    setEditing(null);
    setAdding(false);
    setFormLabel("");
    setFormBody("");
  };

  const saveForm = () => {
    if (!formLabel.trim() || !formBody.trim()) {
      showToast("Label and template body are required", "error");
      return;
    }
    if (editing) {
      updateTemplate.mutate(
        { ...editing, label: formLabel.trim(), body: formBody.trim() },
        { onSuccess: () => { cancelForm(); showToast("Template updated"); } },
      );
    } else {
      addTemplate.mutate(
        { label: formLabel.trim(), body: formBody.trim() },
        { onSuccess: () => { cancelForm(); showToast("Template added"); } },
      );
    }
  };

  const handleDelete = (id: string) => {
    deleteTemplate.mutate(id, {
      onSuccess: () => showToast("Template deleted"),
    });
    if (editing?.id === id) cancelForm();
  };

  const isFormOpen = adding || editing !== null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setEditing(null); setAdding(false); }}
        className="h-7 px-2 rounded-[5px] border text-3xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs bg-surface-2-40 border-border-40 text-text-muted hover:text-text-primary hover:bg-surface-3"
        title="Commit message templates"
      >
        <FileText size={11} />
        <span>Templates</span>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1.5 w-80 max-h-96 bg-surface-2 border border-border-40 rounded-mac shadow-lg overflow-hidden z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-30 shrink-0">
            {isFormOpen ? (
              <div className="flex items-center gap-1.5 w-full">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="text-text-muted hover:text-text-primary cursor-pointer"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="text-xs font-semibold text-text-primary truncate">
                  {editing ? "Edit Template" : "New Template"}
                </span>
              </div>
            ) : (
              <>
                <span className="text-xs font-semibold text-text-primary">Templates</span>
                <button
                  type="button"
                  onClick={startAdd}
                  className="h-6 w-6 flex items-center justify-center rounded hover:bg-surface-3 text-text-muted hover:text-accent cursor-pointer transition-colors"
                  title="Add template"
                >
                  <Plus size={13} />
                </button>
              </>
            )}
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 min-h-0">
            {isFormOpen ? (
              <div className="p-3 space-y-2.5">
                <div>
                  <label className="text-2xs text-text-muted block mb-1">Label</label>
                  <input
                    type="text"
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                    placeholder="e.g. feat: New feature"
                    className="w-full h-7 px-2 text-xs bg-surface-1 border border-border-40 rounded text-text-primary placeholder:text-text-muted-60 outline-none focus:border-accent-60"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-2xs text-text-muted block mb-1">
                    Template{" "}
                    <span className="text-text-muted-60">
                      (use {"{{scope}}"}, {"{{description}}"}, {"{{body}}"})
                    </span>
                  </label>
                  <textarea
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    placeholder="feat({{scope}}): {{description}}"
                    rows={4}
                    className="w-full px-2 py-1.5 text-xs bg-surface-1 border border-border-40 rounded text-text-primary placeholder:text-text-muted-60 outline-none focus:border-accent-60 resize-y font-mono leading-relaxed"
                  />
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={saveForm}
                    className="flex-1 h-7 text-3xs font-semibold rounded bg-accent text-accent-fg hover:opacity-90 cursor-pointer transition-opacity"
                  >
                    {editing ? "Save" : "Add"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="flex-1 h-7 text-3xs font-semibold rounded bg-surface-3 border border-border-40 text-text-muted hover:text-text-primary cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : templates.length === 0 ? (
              <div className="p-4 text-center text-2xs text-text-muted">
                No templates yet. Click + to create one.
              </div>
            ) : (
              <div className="py-1">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="group flex items-center gap-2 px-3 py-2 hover:bg-surface-3 cursor-pointer transition-colors"
                    onClick={() => handleSelect(tpl)}
                  >
                    <FileText size={12} className="text-text-muted shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">
                        {tpl.label}
                      </p>
                      <p className="text-2xs text-text-muted truncate font-mono mt-0.5">
                        {tpl.body.split("\n")[0]}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); startEdit(tpl); }}
                        className="h-6 w-6 flex items-center justify-center rounded hover:bg-surface-2 text-text-muted hover:text-text-primary cursor-pointer"
                        title="Edit template"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(tpl.id); }}
                        className="h-6 w-6 flex items-center justify-center rounded hover:bg-[#ff453a]/10 text-text-muted hover:text-[#ff453a] cursor-pointer"
                        title="Delete template"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer hint */}
          {!isFormOpen && (
            <div className="px-3 py-1.5 border-t border-border-30 text-2xs text-text-muted shrink-0">
              Click to insert • Hover to edit/delete
            </div>
          )}
        </div>
      )}
    </div>
  );
}
