import { useState } from "react";
import { useRepoStore } from "@/stores/repo";
import { useAIGitCommandAssistant } from "@/queries/useAI";
import { showToast } from "@/lib/toast";
import { X, Send, Copy, AlertTriangle, CheckCircle, Shield } from "lucide-react";
import Dialog from "@/components/ui/overlay/Dialog";

interface GitCommandAssistantProps {
  open: boolean;
  onClose: () => void;
}

export default function GitCommandAssistant({ open, onClose }: GitCommandAssistantProps) {
  const repoPath = useRepoStore((s) => s.repoPath);
  const [intent, setIntent] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{
    command: string;
    description: string;
    safety: "safe" | "caution" | "dangerous";
    warning?: string;
  }>>([]);
  
  const gitCommandMutation = useAIGitCommandAssistant(repoPath);

  const handleSubmit = async () => {
    if (!intent.trim() || gitCommandMutation.isPending) return;
    
    try {
      const result = await gitCommandMutation.mutateAsync({ intent: intent.trim() });
      setSuggestions(result);
    } catch (e: any) {
      showToast(`AI command suggestion failed: ${e.message || e}`, "error");
    }
  };

  const handleCopyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    showToast("Command copied to clipboard", "success");
  };

  const getSafetyIcon = (safety: string) => {
    switch (safety) {
      case "safe":
        return <CheckCircle size={12} className="text-[#30d158]" />;
      case "caution":
        return <AlertTriangle size={12} className="text-[#ff9f0a]" />;
      case "dangerous":
        return <Shield size={12} className="text-[#ff375f]" />;
      default:
        return null;
    }
  };

  const getSafetyColor = (safety: string) => {
    switch (safety) {
      case "safe":
        return "bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20";
      case "caution":
        return "bg-[#ff9f0a]/10 text-[#ff9f0a] border-[#ff9f0a]/20";
      case "dangerous":
        return "bg-[#ff375f]/10 text-[#ff375f] border-[#ff375f]/20";
      default:
        return "bg-surface-2 text-text-muted border-border-40";
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Git Command Assistant" maxWidth="md">
      <div className="p-4 space-y-4">
        <div className="text-xs text-text-secondary">
          Describe what you want to do in natural language, and AI will suggest the appropriate git commands.
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="e.g., undo my last commit, show me what changed today..."
            className="flex-1 h-8 px-3 rounded border border-border-400 bg-surface-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            disabled={gitCommandMutation.isPending}
          />
          <button
            onClick={handleSubmit}
            disabled={!intent.trim() || gitCommandMutation.isPending}
            className="h-8 px-3 rounded bg-accent text-white text-xs font-medium hover:bg-accent-90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {gitCommandMutation.isPending ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={12} />
            )}
            <span>Suggest</span>
          </button>
        </div>

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
              Suggested Commands
            </div>
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="border border-border-300 rounded p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <code className="font-mono text-xs text-text-primary bg-surface-2 px-2 py-1 rounded flex-1">
                    {suggestion.command}
                  </code>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getSafetyColor(suggestion.safety)}`}>
                      {getSafetyIcon(suggestion.safety)}
                      <span className="ml-1 capitalize">{suggestion.safety}</span>
                    </span>
                    <button
                      onClick={() => handleCopyCommand(suggestion.command)}
                      className="p-1 hover:bg-surface-2 rounded transition-colors"
                      title="Copy command"
                    >
                      <Copy size={12} className="text-text-muted" />
                    </button>
                  </div>
                </div>
                <div className="text-[11px] text-text-secondary">
                  {suggestion.description}
                </div>
                {suggestion.warning && (
                  <div className="text-[10px] text-[#ff9f0a] bg-[#ff9f0a]/5 border border-[#ff9f0a]/20 rounded p-2">
                    {suggestion.warning}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {gitCommandMutation.isPending && (
          <div className="flex items-center justify-center py-8 text-text-muted text-xs">
            <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin mr-2" />
            Analyzing your request...
          </div>
        )}

        {!gitCommandMutation.isPending && suggestions.length === 0 && (
          <div className="py-8 text-center text-text-muted text-xs">
            <p className="mb-2">Try asking:</p>
            <ul className="space-y-1 text-[10px]">
              <li>"Show me the last 5 commits"</li>
              <li>"Undo my last commit but keep changes"</li>
              <li>"Create a new branch for the login feature"</li>
              <li>"What files have changed since yesterday?"</li>
            </ul>
          </div>
        )}
      </div>
    </Dialog>
  );
}