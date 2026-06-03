import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface CommitTemplate {
  id: string;
  label: string;
  body: string;
  isDefault?: boolean;
}

const STORAGE_PREFIX = "gitflowCommitTemplates";

function storageKey(repoPath: string): string {
  return `${STORAGE_PREFIX}:${repoPath}`;
}

const DEFAULT_TEMPLATES: CommitTemplate[] = [
  {
    id: "feat",
    label: "feat: New feature",
    body: "feat({{scope}}): {{description}}\n\n{{body}}",
    isDefault: true,
  },
  {
    id: "fix",
    label: "fix: Bug fix",
    body: "fix({{scope}}): {{description}}\n\n{{body}}",
    isDefault: true,
  },
  {
    id: "docs",
    label: "docs: Documentation",
    body: "docs({{scope}}): {{description}}\n\n{{body}}",
    isDefault: true,
  },
  {
    id: "refactor",
    label: "refactor: Code refactor",
    body: "refactor({{scope}}): {{description}}\n\n{{body}}",
    isDefault: true,
  },
  {
    id: "chore",
    label: "chore: Maintenance",
    body: "chore({{scope}}): {{description}}\n\n{{body}}",
    isDefault: true,
  },
  {
    id: "test",
    label: "test: Tests",
    body: "test({{scope}}): {{description}}\n\n{{body}}",
    isDefault: true,
  },
  {
    id: "perf",
    label: "perf: Performance",
    body: "perf({{scope}}): {{description}}\n\n{{body}}",
    isDefault: true,
  },
  {
    id: "style",
    label: "style: Formatting",
    body: "style({{scope}}): {{description}}\n\n{{body}}",
    isDefault: true,
  },
];

function loadTemplates(repoPath: string): CommitTemplate[] {
  try {
    const raw = localStorage.getItem(storageKey(repoPath));
    if (raw) {
      const parsed = JSON.parse(raw) as CommitTemplate[];
      // Merge: user templates first, then defaults not already present
      const userIds = new Set(parsed.map((t) => t.id));
      const defaults = DEFAULT_TEMPLATES.filter((t) => !userIds.has(t.id));
      return [...parsed, ...defaults];
    }
  } catch {
    // fall through
  }
  return [...DEFAULT_TEMPLATES];
}

function saveTemplates(repoPath: string, templates: CommitTemplate[]) {
  // Only persist user-created templates (non-default) to avoid bloating storage
  const userTemplates = templates.filter((t) => !t.isDefault);
  localStorage.setItem(storageKey(repoPath), JSON.stringify(userTemplates));
}

function generateId(): string {
  return `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const QUERY_KEY = "commitTemplates";

export function useCommitTemplates(repoPath: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery<CommitTemplate[]>({
    queryKey: [QUERY_KEY, repoPath],
    queryFn: () => loadTemplates(repoPath!),
    enabled: !!repoPath,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const addTemplate = useMutation({
    mutationFn: async (template: Omit<CommitTemplate, "id">) => {
      const current = queryClient.getQueryData<CommitTemplate[]>([QUERY_KEY, repoPath]) ?? [];
      const newTemplate: CommitTemplate = { ...template, id: generateId() };
      const updated = [...current, newTemplate];
      saveTemplates(repoPath!, updated);
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData([QUERY_KEY, repoPath], updated);
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async (template: CommitTemplate) => {
      const current = queryClient.getQueryData<CommitTemplate[]>([QUERY_KEY, repoPath]) ?? [];
      const updated = current.map((t) => (t.id === template.id ? template : t));
      saveTemplates(repoPath!, updated);
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData([QUERY_KEY, repoPath], updated);
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const current = queryClient.getQueryData<CommitTemplate[]>([QUERY_KEY, repoPath]) ?? [];
      const updated = current.filter((t) => t.id !== id);
      saveTemplates(repoPath!, updated);
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData([QUERY_KEY, repoPath], updated);
    },
  });

  return {
    templates: query.data ?? [],
    isLoading: query.isLoading,
    addTemplate,
    updateTemplate,
    deleteTemplate,
  };
}

/** Resolve template placeholders in a body string. */
export function resolveTemplate(body: string, vars: Record<string, string> = {}): string {
  let result = body;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  // Strip unresolved placeholders and clean up extra blank lines
  result = result.replace(/\{\{[^}]+\}\}/g, "");
  result = result.replace(/\n{3,}/g, "\n\n");
  return result.trimEnd();
}
