import { useState, type ReactNode } from "react";
import {
  Book,
  X,
  ChevronRight,
  GitBranch,
  FileText,
  GitBranchPlus,
  Sparkles,
  GitCommit,
  FileDiff,
  RefreshCw,
  Zap,
  MousePointer,
  Palette,
  Clock,
  Search,
  Tag,
  Layers,
  Terminal,
  Eye,
  SplitSquareHorizontal,
  Download,
  Upload,
  RotateCcw,
  Keyboard,
  Moon,
  Undo2,
  Shovel,
  FileSearch,
  GitFork,
  Merge,
  Workflow,
  Columns,
  Globe,
} from "lucide-react";
import {
  CommitGraphIllustration,
  WorkingTreeIllustration,
  GitFlowIllustration,
  AIFeaturesIllustration,
  GitOperationsIllustration,
  DiffViewerIllustration,
  RemoteSyncIllustration,
  ProductivityIllustration,
  CanvasCommitGraphFeatureIllustration,
  BranchTagBadgesFeatureIllustration,
  ContextMenuFeatureIllustration,
  IncrementalLoadingFeatureIllustration,
  StageUnstageFeatureIllustration,
  MultiSelectBatchFeatureIllustration,
  CommitReadinessFeatureIllustration,
  AICommitMessagesFeatureIllustration,
  AICommitScopeSuggestionFeatureIllustration,
  AmendLastCommitFeatureIllustration,
  FeatureStartFinishFeatureIllustration,
  ReleaseStartFinishFeatureIllustration,
  HotfixStartFinishFeatureIllustration,
  GitFlowInitWizardFeatureIllustration,
  GenerateCommitMessagesFeatureIllustration,
  CodeReviewFeatureIllustration,
  ExplainCommitsFeatureIllustration,
  AIConflictResolutionFeatureIllustration,
  CommitScopeAnalysisFeatureIllustration,
  BranchManagementFeatureIllustration,
  MergeConflictDetectionFeatureIllustration,
  InteractiveRebaseFeatureIllustration,
  CherryPickFeatureIllustration,
  StashManagementFeatureIllustration,
  TagCRUDFeatureIllustration,
  BlameViewFeatureIllustration,
  FileHistoryFeatureIllustration,
  SubmoduleSupportFeatureIllustration,
  SplitUnifiedModesFeatureIllustration,
  InlineHunkActionsFeatureIllustration,
  AICodeReviewFeatureIllustration,
  ConflictResolverFeatureIllustration,
  PullPushFetchFeatureIllustration,
  AutoFetchFeatureIllustration,
  SyncStatusFeatureIllustration,
  CloneRepositoriesFeatureIllustration,
  KeyboardShortcutsFeatureIllustration,
  SearchCommitsFeatureIllustration,
  DarkLightThemesFeatureIllustration,
  RecentRepositoriesFeatureIllustration,
  UndoOperationsFeatureIllustration,
} from "./FeatureIllustrations";

interface FeatureGuideDialogProps {
  open: boolean;
  onClose: () => void;
}

interface FeatureDetail {
  steps?: string[];
  shortcuts?: string[];
  tips?: string[];
  notes?: string;
}

interface Feature {
  name: string;
  description: string;
  icon: React.ReactNode;
  illustration?: React.ReactNode;
  details?: FeatureDetail;
}

interface FeatureSection {
  category: string;
  icon: ReactNode;
  illustration: ReactNode;
  features: Feature[];
}

const sections: FeatureSection[] = [
  {
    category: "Commit Graph",
    icon: <GitBranch size={13} />,
    illustration: <CommitGraphIllustration />,
    features: [
      {
        name: "Canvas Commit Graph",
        description: "High-performance canvas-based graph with branch lane visualization and merge line rendering.",
        icon: <GitFork size={13} />,
        illustration: <CanvasCommitGraphFeatureIllustration />,
        details: {
          steps: [
            "Open a repository — the commit graph loads automatically in the center panel.",
            "Scroll vertically to navigate through commit history (infinite scroll).",
            "Branch lanes are color-coded for easy identification.",
            "Merge commits show lines connecting to both parent commits.",
          ],
          shortcuts: ["Scroll — Navigate commits", "Click — Select a commit"],
          tips: [
            "The graph uses HTML Canvas for rendering thousands of commits without lag.",
            "Commit messages are rendered as DOM elements overlaid on the canvas for text selection.",
          ],
        },
      },
      {
        name: "Branch & Tag Badges",
        description: "Ref labels displayed directly on commit nodes with color-coded branch indicators.",
        icon: <Tag size={13} />,
        illustration: <BranchTagBadgesFeatureIllustration />,
        details: {
          steps: [
            "Branch and tag labels appear to the right of commit messages.",
            "Local branches show in one color, remote branches in another.",
            "HEAD indicator marks the currently checked-out commit.",
          ],
          tips: [
            "Multiple refs on the same commit are stacked horizontally.",
            "The current branch is highlighted with an accent color badge.",
          ],
        },
      },
      {
        name: "Context Menu",
        description: "Right-click any commit to copy hash, checkout, create branch, cherry-pick, or revert.",
        icon: <MousePointer size={13} />,
        illustration: <ContextMenuFeatureIllustration />,
        details: {
          steps: [
            "Right-click on any commit in the graph.",
            "Choose from: Copy Hash, Checkout, Create Branch, Create Tag, Cherry-Pick, or Revert.",
            "Cherry-Pick and Revert open confirmation dialogs before applying.",
          ],
          shortcuts: ["Right-click — Open context menu on commit"],
          tips: [
            "Create Branch from a commit lets you branch off any historical point.",
            "Revert creates a new commit that undoes the selected commit's changes.",
          ],
        },
      },
      {
        name: "Incremental Loading",
        description: "Infinite scroll with cached commit list — only fetches new commits since last known HEAD.",
        icon: <Layers size={13} />,
        illustration: <IncrementalLoadingFeatureIllustration />,
        details: {
          steps: [
            "Scroll to the bottom of the commit list to automatically load more.",
            "New commits are detected by comparing the current HEAD with the last known hash.",
            "The cache is invalidated when switching branches or after fetch/pull.",
          ],
          tips: [
            "First load fetches a page of commits; subsequent scrolls load the next page.",
            "Branch switching triggers a full cache refresh for accurate history.",
          ],
        },
      },
    ],
  },
  {
    category: "Working Tree & Commits",
    icon: <FileText size={13} />,
    illustration: <WorkingTreeIllustration />,
    features: [
      {
        name: "Stage & Unstage",
        description: "Stage or unstage individual files, or use batch operations for all changes at once.",
        icon: <FileText size={13} />,
        illustration: <StageUnstageFeatureIllustration />,
        details: {
          steps: [
            "Modified files appear in the 'Changes' section of the right panel.",
            "Click the checkbox next to a file to stage it.",
            "Staged files move to the 'Staged Changes' section.",
            "Click the checkbox again to unstage.",
            "Use 'Stage All' / 'Unstage All' buttons for batch operations.",
          ],
          shortcuts: [
            "Cmd+S — Stage selected file",
            "Cmd+Shift+S — Unstage selected file",
            "Cmd+Shift+A — Stage all files",
          ],
          tips: [
            "File status badges show Modified (M), Added (A), Deleted (D), Renamed (R), etc.",
            "Staged changes are previewed in the diff viewer before committing.",
          ],
        },
      },
      {
        name: "Multi-Select Batch",
        description: "Shift+Click to select a range of files for batch stage/unstage operations.",
        icon: <MousePointer size={13} />,
        illustration: <MultiSelectBatchFeatureIllustration />,
        details: {
          steps: [
            "Click on a file to select it.",
            "Hold Shift and click another file to select the entire range.",
            "Use the batch stage/unstage buttons that appear for the selection.",
            "Cmd+Click to toggle individual files in a multi-selection.",
          ],
          tips: [
            "Multi-select works across both 'Changes' and 'Staged Changes' sections.",
            "Selected files are highlighted with a distinct background color.",
          ],
        },
      },
      {
        name: "Commit Readiness Indicator",
        description: "Visual indicator showing whether your changes are ready to commit.",
        icon: <Eye size={13} />,
        illustration: <CommitReadinessFeatureIllustration />,
        details: {
          steps: [
            "The indicator appears in the toolbar area.",
            "Green — staged changes are ready to commit.",
            "Yellow — unstaged changes exist but nothing is staged.",
            "No indicator — working tree is clean.",
          ],
          tips: [
            "The indicator updates in real-time as you stage/unstage files.",
          ],
        },
      },
      {
        name: "AI Commit Messages",
        description: "Click the ✨ button to generate a commit message from your staged diff using AI.",
        icon: <Sparkles size={13} />,
        illustration: <AICommitMessagesFeatureIllustration />,
        details: {
          steps: [
            "Stage the files you want to commit.",
            "Click the ✨ (sparkles) button next to the commit message textarea.",
            "AI analyzes the staged diff and generates a conventional commit message.",
            "Edit the generated message if needed, then click 'Commit'.",
          ],
          shortcuts: ["✨ Button — Generate AI commit message"],
          tips: [
            "Configure your AI provider (OpenAI, Anthropic, etc.) in Settings → AI.",
            "Commit message style (conventional, semantic, etc.) can be set in Settings.",
            "Detail level (minimal to comprehensive) controls message verbosity.",
            "If no AI provider is configured, a local fallback message is generated.",
          ],
        },
      },
      {
        name: "AI Commit Scope Suggestion",
        description: "AI analyzes staged changes and suggests splitting into atomic commits when changes span unrelated concerns.",
        icon: <Sparkles size={13} />,
        illustration: <AICommitScopeSuggestionFeatureIllustration />,
        details: {
          steps: [
            "Stage 5+ files across 2+ directories — scope analysis triggers automatically.",
            "A suggestion panel appears below the commit message if AI detects unrelated changes.",
            "Each suggested group shows files, a commit message, and the reasoning.",
            "Click 'Use this' on a group to unstage all, re-stage that group's files, and fill the message.",
            "Click 'Commit all as one' to dismiss the suggestion and commit everything together.",
          ],
          tips: [
            "Scope analysis runs in the background — it doesn't slow down commit message generation.",
            "The suggestion is informational; you always have full control over what to commit.",
            "Maximum 4 groups are suggested per analysis.",
          ],
        },
      },
      {
        name: "Amend Last Commit",
        description: "Toggle amend mode to modify the most recent commit instead of creating a new one.",
        icon: <RotateCcw size={13} />,
        illustration: <AmendLastCommitFeatureIllustration />,
        details: {
          steps: [
            "Stage the changes you want to add to the previous commit.",
            "Toggle the 'Amend' checkbox below the commit message textarea.",
            "The previous commit's message is loaded into the text field for editing.",
            "Click 'Commit' to amend — the previous commit is replaced with the new one.",
          ],
          tips: [
            "Only use amend on commits that haven't been pushed to a shared remote.",
            "Amending rewrites commit history — force push may be required if already pushed.",
          ],
        },
      },
    ],
  },
  {
    category: "GitFlow Workflow",
    icon: <GitBranchPlus size={13} />,
    illustration: <GitFlowIllustration />,
    features: [
      {
        name: "Feature Start / Finish",
        description: "Create feature branches from develop, merge back when done, and optionally delete the branch.",
        icon: <Workflow size={13} />,
        illustration: <FeatureStartFinishFeatureIllustration />,
        details: {
          steps: [
            "Click the GitFlow button in the toolbar.",
            "Select 'Start Feature' and enter a feature name (e.g., 'user-auth').",
            "A branch 'feature/user-auth' is created from develop and checked out.",
            "When done, click 'Finish Feature' to merge back into develop.",
            "Optionally delete the feature branch after merging.",
          ],
          tips: [
            "Feature branches are prefixed with 'feature/' by default (configurable via GitFlow Init).",
            "The finish step creates a merge commit on develop.",
          ],
        },
      },
      {
        name: "Release Start / Finish",
        description: "Create release branches from develop, merge into main + develop, and auto-create version tags.",
        icon: <Workflow size={13} />,
        illustration: <ReleaseStartFinishFeatureIllustration />,
        details: {
          steps: [
            "Click GitFlow → 'Start Release' and enter a version (e.g., '1.2.0').",
            "A branch 'release/1.2.0' is created from develop.",
            "Make final bug fixes and version bumps on the release branch.",
            "Click 'Finish Release' to merge into main AND develop.",
            "A tag 'v1.2.0' is automatically created on the main branch.",
          ],
          tips: [
            "Release branches allow you to continue development on develop while stabilizing the release.",
            "The tag is created with the 'v' prefix by default.",
          ],
        },
      },
      {
        name: "Hotfix Start / Finish",
        description: "Create hotfix branches from main, merge into main + develop, and auto-create version tags.",
        icon: <Workflow size={13} />,
        illustration: <HotfixStartFinishFeatureIllustration />,
        details: {
          steps: [
            "Click GitFlow → 'Start Hotfix' and enter a version (e.g., '1.2.1').",
            "A branch 'hotfix/1.2.1' is created from main (production).",
            "Apply the critical fix on the hotfix branch.",
            "Click 'Finish Hotfix' to merge into main AND develop.",
            "A tag 'v1.2.1' is automatically created.",
          ],
          tips: [
            "Hotfixes bypass the normal develop → release flow for urgent production fixes.",
            "Always merged into both main and develop to keep them in sync.",
          ],
        },
      },
      {
        name: "GitFlow Init Wizard",
        description: "Initialize GitFlow configuration with customizable branch prefixes and naming conventions.",
        icon: <GitBranchPlus size={13} />,
        illustration: <GitFlowInitWizardFeatureIllustration />,
        details: {
          steps: [
            "Click GitFlow → 'Initialize GitFlow' in the toolbar.",
            "Configure branch prefixes: production (main), development (develop), feature, release, hotfix.",
            "Default prefixes: main, develop, feature/, release/, hotfix/.",
            "Click 'Initialize' to set up the GitFlow configuration.",
          ],
          tips: [
            "GitFlow Init is only needed once per repository.",
            "If branches don't exist yet, the wizard offers to create them.",
            "You can customize all prefixes to match your team's conventions.",
          ],
        },
      },
    ],
  },
  {
    category: "AI Features",
    icon: <Sparkles size={13} />,
    illustration: <AIFeaturesIllustration />,
    features: [
      {
        name: "Generate Commit Messages",
        description: "AI analyzes your staged diff and generates professional commit messages in your preferred style.",
        icon: <Sparkles size={13} />,
        illustration: <GenerateCommitMessagesFeatureIllustration />,
        details: {
          steps: [
            "Stage your changes in the Working Tree panel.",
            "Click the ✨ button to trigger AI message generation.",
            "The AI reads the diff, understands the changes, and writes a message.",
            "Supports Conventional Commits, Semantic, and custom styles.",
          ],
          tips: [
            "Configure API key and model in Settings → AI.",
            "Supports OpenAI, Anthropic Claude, Google Gemini, and local models (Ollama).",
            "The detail level setting controls how verbose the message is (5 levels).",
            "Branch name context is included for better scope inference.",
          ],
        },
      },
      {
        name: "Code Review",
        description: "Get AI-powered code review with suggestions for bugs, security issues, and improvements.",
        icon: <Sparkles size={13} />,
        illustration: <CodeReviewFeatureIllustration />,
        details: {
          steps: [
            "Open a file in the diff viewer (click any file in Changes or Commit Detail).",
            "Click the 'AI Review' button in the diff header.",
            "AI analyzes the diff and provides feedback on potential issues.",
            "Review suggestions appear inline below the diff header.",
          ],
          tips: [
            "Reviews focus on bugs, security vulnerabilities, performance, and best practices.",
            "The review is specific to the current file's changes, not the entire codebase.",
          ],
        },
      },
      {
        name: "Explain Commits",
        description: "Click 'Explain' on any commit to get a natural-language explanation of what changed and why.",
        icon: <Sparkles size={13} />,
        illustration: <ExplainCommitsFeatureIllustration />,
        details: {
          steps: [
            "Click on any commit in the graph to open the commit detail panel.",
            "Click the 'Explain' button in the commit header.",
            "AI generates a plain-English summary of the commit's purpose and changes.",
            "The explanation appears in an expandable section below the commit info.",
          ],
          tips: [
            "Useful for understanding commits made by other team members.",
            "The AI considers the commit message, changed files, and actual diff content.",
          ],
        },
      },
      {
        name: "AI Conflict Resolution",
        description: "AI assists in resolving merge conflicts by suggesting the correct merged code.",
        icon: <Sparkles size={13} />,
        illustration: <AIConflictResolutionFeatureIllustration />,
        details: {
          steps: [
            "When a merge conflict is detected, the conflict resolver opens automatically.",
            "Click the 'AI Resolve' button in the conflict resolver header.",
            "AI analyzes both sides of the conflict and suggests a merged version.",
            "Review the suggestion, make adjustments if needed, and save.",
          ],
          tips: [
            "AI resolution works best with well-structured, small conflicts.",
            "Always review AI suggestions before accepting — AI may miss project-specific context.",
            "You can still manually edit the conflict markers after AI resolution.",
          ],
        },
      },
      {
        name: "Commit Scope Analysis",
        description: "AI detects when staged changes span multiple concerns and suggests splitting into atomic commits.",
        icon: <Sparkles size={13} />,
        illustration: <CommitScopeAnalysisFeatureIllustration />,
        details: {
          steps: [
            "Stage 5+ files across 2+ top-level directories.",
            "Click ✨ to generate a commit message — scope analysis runs in background.",
            "If changes span unrelated concerns, a suggestion panel appears.",
            "Each group has its own commit message and file list.",
            "Click 'Use this' to commit that group, or 'Commit all as one' to skip.",
          ],
          tips: [
            "Pre-filter: analysis only runs when ≥5 files AND ≥2 directories (avoids unnecessary API calls).",
            "Each suggested group follows Conventional Commits format.",
            "Maximum 4 groups per suggestion to keep things manageable.",
          ],
        },
      },
    ],
  },
  {
    category: "Git Operations",
    icon: <GitCommit size={13} />,
    illustration: <GitOperationsIllustration />,
    features: [
      {
        name: "Branch Management",
        description: "Create, checkout, and delete branches with remote tracking branch support.",
        icon: <GitBranch size={13} />,
        illustration: <BranchManagementFeatureIllustration />,
        details: {
          steps: [
            "Branches are listed in the sidebar, grouped by Local, Remote, and Tags.",
            "Click a branch name to checkout (switch to it).",
            "Use the '+' button or GitFlow menu to create new branches.",
            "Right-click a branch for checkout, delete, or merge options.",
          ],
          shortcuts: ["Cmd+B — Quick branch switcher"],
          tips: [
            "Remote tracking branches are fetched automatically with auto-fetch.",
            "Deleting a remote branch also deletes it on the remote (with confirmation).",
          ],
        },
      },
      {
        name: "Merge with Conflict Detection",
        description: "Merge branches with automatic conflict detection and redirect to the conflict resolver.",
        icon: <Merge size={13} />,
        illustration: <MergeConflictDetectionFeatureIllustration />,
        details: {
          steps: [
            "Select a branch in the sidebar and choose 'Merge' from the context menu.",
            "Or use the GitFlow workflow to merge feature/release/hotfix branches.",
            "If conflicts are detected, the conflict resolver opens automatically.",
            "Resolve conflicts file by file, then complete the merge.",
          ],
          tips: [
            "The merge status badge shows if you're in a merging state.",
            "You can abort a merge at any time to return to the pre-merge state.",
            "Merge continue stages resolved files and creates the merge commit.",
          ],
        },
      },
      {
        name: "Interactive Rebase",
        description: "Reorder, squash, edit, or drop commits with the interactive rebase editor.",
        icon: <RotateCcw size={13} />,
        illustration: <InteractiveRebaseFeatureIllustration />,
        details: {
          steps: [
            "Right-click a commit and select 'Rebase from here'.",
            "The rebase editor shows a list of commits to reorder or modify.",
            "Drag to reorder, change action to squash/edit/drop per commit.",
            "Click 'Start Rebase' to apply the changes.",
            "During rebase: continue, skip, or abort as needed.",
          ],
          tips: [
            "Interactive rebase rewrites history — avoid on shared branches.",
            "Squash combines the selected commit with the one above it.",
            "Edit pauses the rebase at that commit for amending.",
          ],
        },
      },
      {
        name: "Cherry-Pick",
        description: "Pick specific commits from other branches and apply them to your current branch.",
        icon: <GitCommit size={13} />,
        illustration: <CherryPickFeatureIllustration />,
        details: {
          steps: [
            "Right-click a commit in the graph and select 'Cherry-Pick'.",
            "A confirmation dialog shows the commit details.",
            "Click 'Cherry-Pick' to apply the commit to your current branch.",
            "If conflicts occur, the conflict resolver opens.",
          ],
          tips: [
            "Cherry-pick creates a new commit with the same changes on your current branch.",
            "Useful for applying hotfixes across multiple branches.",
          ],
        },
      },
      {
        name: "Stash Management",
        description: "Stash, pop, apply, and drop stashes with a built-in diff preview before applying.",
        icon: <Shovel size={13} />,
        illustration: <StashManagementFeatureIllustration />,
        details: {
          steps: [
            "Open the Stash panel from the sidebar or toolbar.",
            "Click 'Stash' to save current changes with an optional message.",
            "Click a stash entry to preview its diff.",
            "Use 'Pop' to apply and remove, or 'Apply' to keep the stash.",
            "'Drop' removes a stash without applying.",
          ],
          tips: [
            "Stash diff preview shows exactly what changes will be restored.",
            "Pop = Apply + Drop in one operation.",
          ],
        },
      },
      {
        name: "Tag CRUD",
        description: "Create, list, delete, and push lightweight and annotated tags.",
        icon: <Tag size={13} />,
        illustration: <TagCRUDFeatureIllustration />,
        details: {
          steps: [
            "Tags are listed in the sidebar under the Tags section.",
            "Right-click a commit to create a tag at that point.",
            "Enter a tag name and optional annotation message.",
            "Push tags to remote from the tag context menu.",
          ],
          tips: [
            "Annotated tags include a message and author info; lightweight tags are just pointers.",
            "GitFlow release/hotfix finish automatically creates version tags.",
          ],
        },
      },
      {
        name: "Blame View",
        description: "See who wrote each line of a file with inline blame annotations.",
        icon: <Terminal size={13} />,
        illustration: <BlameViewFeatureIllustration />,
        details: {
          steps: [
            "Right-click a file in the file list or diff viewer.",
            "Select 'Blame' to open the blame view.",
            "Each line shows the author, date, and commit hash that last modified it.",
            "Click a commit hash in the blame view to jump to that commit.",
          ],
          tips: [
            "Blame data is loaded on demand to avoid slowing down the UI.",
            "Useful for understanding who changed what and when.",
          ],
        },
      },
      {
        name: "File History",
        description: "View the complete commit history for any specific file in your repository.",
        icon: <Clock size={13} />,
        illustration: <FileHistoryFeatureIllustration />,
        details: {
          steps: [
            "Right-click a file in the diff viewer or file list.",
            "Select 'File History' to see all commits that touched that file.",
            "Click any commit in the history to view the diff at that point.",
            "Navigate through history to see how the file evolved over time.",
          ],
          tips: [
            "File history is separate from the main commit graph — filtered to one file.",
            "Renamed files may show history across multiple paths.",
          ],
        },
      },
      {
        name: "Submodule Support",
        description: "View submodule status, initialize, update, and manage git submodules.",
        icon: <Layers size={13} />,
        illustration: <SubmoduleSupportFeatureIllustration />,
        details: {
          steps: [
            "Submodules are listed in the sidebar under a 'Submodules' section.",
            "Click a submodule to view its status and details.",
            "Submodule entries show the current commit hash and branch.",
            "Initialize and update operations are available from the context menu.",
          ],
          tips: [
            "Submodules are detected automatically from .gitmodules.",
            "Nested repositories are treated as submodules for safety.",
          ],
        },
      },
    ],
  },
  {
    category: "Diff Viewer",
    icon: <FileDiff size={13} />,
    illustration: <DiffViewerIllustration />,
    features: [
      {
        name: "Split & Unified Modes",
        description: "Toggle between side-by-side split view and unified diff view.",
        icon: <Columns size={13} />,
        illustration: <SplitUnifiedModesFeatureIllustration />,
        details: {
          steps: [
            "Open a file diff by clicking any changed file.",
            "Toggle between Split and Unified using the button in the diff header.",
            "Split mode: original on the left, modified on the right.",
            "Unified mode: interleaved old/new lines with +/- markers.",
          ],
          tips: [
            "Split mode is better for large rewrites; unified is better for small changes.",
            "Scroll synchronization keeps both panels aligned in split mode.",
          ],
        },
      },
      {
        name: "Inline Hunk Actions",
        description: "Stage, unstage, or discard individual hunks directly from the diff viewer.",
        icon: <SplitSquareHorizontal size={13} />,
        illustration: <InlineHunkActionsFeatureIllustration />,
        details: {
          steps: [
            "Each hunk (changed section) has action buttons: Stage, Unstage, Discard.",
            "Click 'Stage' on a hunk to stage only that change.",
            "Click 'Discard' to revert that specific hunk (with confirmation).",
            "Hunk actions use `git apply` with a patch for the specific change.",
          ],
          tips: [
            "Hunk-level operations give you fine-grained control over what gets committed.",
            "Discard is permanent — always review before discarding changes.",
          ],
        },
      },
      {
        name: "AI Code Review",
        description: "Click 'AI Review' in the diff header to get suggestions specific to the current file.",
        icon: <Sparkles size={13} />,
        illustration: <AICodeReviewFeatureIllustration />,
        details: {
          steps: [
            "Open a file in the diff viewer.",
            "Click the 'AI Review' button in the diff header.",
            "AI analyzes the specific diff and provides targeted feedback.",
            "Results appear below the header with categorized suggestions.",
          ],
          tips: [
            "Review results include severity indicators for different types of issues.",
            "The review is scoped to the current file's changes only.",
          ],
        },
      },
      {
        name: "Conflict Resolver",
        description: "Three-panel CodeMirror editor for resolving merge conflicts with accept-current/incoming/both actions.",
        icon: <GitBranch size={13} />,
        illustration: <ConflictResolverFeatureIllustration />,
        details: {
          steps: [
            "When conflicts are detected during merge/rebase/cherry-pick, the resolver opens.",
            "Conflict markers (<<<<<<< / ======= / >>>>>>>) are highlighted.",
            "Use buttons: Accept Current, Accept Incoming, Accept Both.",
            "Or manually edit the code to create a custom resolution.",
            "Click 'Save' when the file is resolved, then continue the operation.",
          ],
          shortcuts: [
            "Accept Current — Keep your version",
            "Accept Incoming — Keep the other branch's version",
            "Accept Both — Keep both changes",
          ],
          tips: [
            "The AI Resolve button can suggest a merged version automatically.",
            "All conflict markers must be removed before the file can be saved.",
          ],
        },
      },
    ],
  },
  {
    category: "Remote & Sync",
    icon: <RefreshCw size={13} />,
    illustration: <RemoteSyncIllustration />,
    features: [
      {
        name: "Pull, Push & Fetch",
        description: "Sync with remote repositories using pull, push, and fetch operations from the toolbar.",
        icon: <RefreshCw size={13} />,
        illustration: <PullPushFetchFeatureIllustration />,
        details: {
          steps: [
            "Pull: Fetches remote changes and merges into the current branch.",
            "Push: Uploads local commits to the remote tracking branch.",
            "Fetch: Downloads remote refs without modifying your working tree.",
            "All operations are accessible from the toolbar buttons.",
          ],
          tips: [
            "Push will fail if the remote has diverged — pull first or force push (with caution).",
            "Fetch updates the remote branch list visible in the sidebar.",
          ],
        },
      },
      {
        name: "Auto-Fetch",
        description: "Background fetch at configurable intervals (default: 5 minutes) with 'commits behind' badge.",
        icon: <Download size={13} />,
        illustration: <AutoFetchFeatureIllustration />,
        details: {
          steps: [
            "Auto-fetch is enabled by default (configurable in Settings).",
            "Runs in the background every N minutes (default: 5).",
            "Updates remote branch refs and sync status.",
            "A badge shows how many commits you're behind the remote.",
          ],
          tips: [
            "Disable auto-fetch in Settings → General if you're on a slow connection.",
            "Auto-fetch only updates refs — it doesn't modify your working tree.",
          ],
        },
      },
      {
        name: "Sync Status",
        description: "Toolbar badge showing how many commits you're ahead/behind the remote.",
        icon: <Upload size={13} />,
        illustration: <SyncStatusFeatureIllustration />,
        details: {
          steps: [
            "The sync status badge appears in the toolbar next to Pull/Push buttons.",
            "Shows: ↑N (ahead by N commits) and ↓N (behind by N commits).",
            "Updates after fetch, pull, push, or commit operations.",
          ],
          tips: [
            "↑0 ↓0 means you're in sync with the remote.",
            "Behind count updates automatically with auto-fetch.",
          ],
        },
      },
      {
        name: "Clone Repositories",
        description: "Clone remote repositories from GitHub, GitLab, or any Git URL directly from the app.",
        icon: <Globe size={13} />,
        illustration: <CloneRepositoriesFeatureIllustration />,
        details: {
          steps: [
            "Click the 'Clone' button on the welcome screen or in the file menu.",
            "Enter the repository URL (HTTPS or SSH).",
            "Choose a local directory to clone into.",
            "Click 'Clone' — the repository is downloaded and opened automatically.",
          ],
          tips: [
            "Supports GitHub, GitLab, Bitbucket, and any standard Git remote.",
            "SSH keys must be configured on your system for SSH URLs.",
          ],
        },
      },
    ],
  },
  {
    category: "Productivity",
    icon: <Zap size={13} />,
    illustration: <ProductivityIllustration />,
    features: [
      {
        name: "Keyboard Shortcuts",
        description: "Full keyboard shortcut support — press Cmd+? to see all available shortcuts.",
        icon: <Keyboard size={13} />,
        illustration: <KeyboardShortcutsFeatureIllustration />,
        details: {
          steps: [
            "Press ⌘? anywhere in the app to open the shortcuts modal.",
            "Shortcuts are grouped by category: Navigation, Git, AI, UI.",
            "All shortcuts use Cmd on macOS and Ctrl on Windows/Linux.",
          ],
          shortcuts: [
            "⌘? — Open keyboard shortcuts",
            "⌘⇧H — Open Feature Guide",
            "⌘O — Open repository",
            "⌘S — Stage selected file",
            "⌘⇧S — Unstage selected file",
            "⌘Enter — Commit",
            "⌘F — Search commits",
            "⌘B — Branch switcher",
            "⌘K — Command palette",
            "⌘, — Settings",
            "⌘Z — Undo last operation",
          ],
          tips: [
            "Shortcuts work globally — no need to focus a specific panel first.",
          ],
        },
      },
      {
        name: "Search Commits",
        description: "Search by message, author, file, date range, or branch with Cmd+F.",
        icon: <Search size={13} />,
        illustration: <SearchCommitsFeatureIllustration />,
        details: {
          steps: [
            "Press ⌘F or click the search icon in the toolbar.",
            "Enter search terms — matches against commit messages and authors.",
            "Use filters: author, date range, file path, branch.",
            "Results are highlighted in the commit graph.",
          ],
          shortcuts: ["⌘F — Open search"],
          tips: [
            "Search supports regex patterns for advanced matching.",
            "Date filters use natural language (e.g., 'last week', '2024-01-01').",
          ],
        },
      },
      {
        name: "Dark & Light Themes",
        description: "Switch between light and dark themes, including Gruvbox variants.",
        icon: <Moon size={13} />,
        illustration: <DarkLightThemesFeatureIllustration />,
        details: {
          steps: [
            "Open Settings (⌘,) → General → Theme.",
            "Choose from: Light, Dark, Gruvbox Light, Gruvbox Dark, and more.",
            "Theme changes apply instantly across the entire application.",
          ],
          tips: [
            "Theme preference is persisted in localStorage.",
            "The app respects your system theme on first launch.",
          ],
        },
      },
      {
        name: "Recent Repositories",
        description: "Quick access to recently opened repositories from the sidebar or welcome screen.",
        icon: <Clock size={13} />,
        illustration: <RecentRepositoriesFeatureIllustration />,
        details: {
          steps: [
            "Recently opened repos appear in the sidebar under 'Recent Repositories'.",
            "Click any recent repo to open it instantly.",
            "The welcome screen also shows recent repos for quick access.",
            "Use 'Remove from list' to clean up the recent repos list.",
          ],
          tips: [
            "Up to 10 recent repositories are remembered.",
            "Invalid paths (deleted repos) are automatically cleaned up.",
          ],
        },
      },
      {
        name: "Undo Operations",
        description: "Undo last commit, stage, or checkout using reflog-based undo (Cmd+Z).",
        icon: <Undo2 size={13} />,
        illustration: <UndoOperationsFeatureIllustration />,
        details: {
          steps: [
            "Press ⌘Z or click the Undo button in the toolbar.",
            "The undo system uses git reflog to determine the last reversible operation.",
            "Supported undo targets: last commit, last checkout, last branch creation.",
            "A confirmation dialog shows what will be undone before applying.",
          ],
          shortcuts: ["⌘Z — Undo last operation"],
          tips: [
            "Undo uses reflog — it can reverse operations even across sessions.",
            "Not all operations are undoable (e.g., pushed commits).",
            "The undo button in the toolbar shows the operation that will be reversed.",
          ],
        },
      },
    ],
  },
];

function FeatureItem({ feature }: { feature: Feature }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = feature.details && (
    (feature.details.steps && feature.details.steps.length > 0) ||
    (feature.details.shortcuts && feature.details.shortcuts.length > 0) ||
    (feature.details.tips && feature.details.tips.length > 0) ||
    feature.details.notes
  );
  const isExpandable = hasDetails || !!feature.illustration;

  return (
    <div className="rounded-lg border border-border-30 overflow-hidden transition-all">
      <div
        className={`flex items-start gap-2.5 p-2.5 ${isExpandable ? "cursor-pointer hover:bg-surface-2-30" : ""} transition-colors`}
        onClick={() => isExpandable && setExpanded(!expanded)}
      >
        <div className="mt-0.5 text-accent shrink-0">
          {feature.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            {feature.name}
            {isExpandable && (
              <ChevronRight
                size={11}
                className={`text-text-muted transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
              />
            )}
          </p>
          <p className="text-2xs text-text-muted leading-relaxed mt-0.5">
            {feature.description}
          </p>
        </div>
      </div>

      {expanded && (feature.illustration || feature.details) && (
        <div className="px-2.5 pb-2.5 space-y-2.5 border-t border-border-20 bg-surface-1-20 animate-in slide-in-from-top-1 duration-150">
          {/* Illustration */}
          {feature.illustration && (
            <div className="pt-2.5">
              {feature.illustration}
            </div>
          )}
          {feature.details && (
            <>
              {/* Steps */}
              {feature.details.steps && feature.details.steps.length > 0 && (
                <div className="space-y-1 pt-2.5">
                  <p className="text-3xs font-semibold text-text-muted uppercase tracking-wider">How to use</p>
                  <ol className="space-y-1 pl-0">
                    {feature.details.steps.map((step, i) => (
                      <li key={i} className="flex gap-2 text-2xs text-text-secondary leading-relaxed">
                        <span className="text-accent font-semibold shrink-0 mt-px">{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Shortcuts */}
              {feature.details.shortcuts && feature.details.shortcuts.length > 0 && (
                <div className="space-y-1">
                  <p className="text-3xs font-semibold text-text-muted uppercase tracking-wider">Shortcuts & Actions</p>
                  <div className="space-y-0.5">
                    {feature.details.shortcuts.map((shortcut, i) => (
                      <div key={i} className="flex items-center gap-2 text-2xs text-text-secondary">
                        <span className="text-accent">▸</span>
                        <span>{shortcut}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips */}
              {feature.details.tips && feature.details.tips.length > 0 && (
                <div className="space-y-1">
                  <p className="text-3xs font-semibold text-text-muted uppercase tracking-wider">💡 Tips</p>
                  <div className="space-y-0.5">
                    {feature.details.tips.map((tip, i) => (
                      <div key={i} className="flex gap-1.5 text-2xs text-text-secondary leading-relaxed">
                        <span className="text-accent shrink-0">•</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {feature.details.notes && (
                <p className="text-2xs text-text-muted italic border-l-2 border-accent-30 pl-2">
                  {feature.details.notes}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function FeatureGuideDialog({ open, onClose }: FeatureGuideDialogProps) {
  const [activeTab, setActiveTab] = useState(0);

  if (!open) return null;

  const currentSection = sections[activeTab];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div className="bg-surface-0 rounded-mac shadow-2xl border border-border w-[720px] max-h-[82vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-surface-1-40">
          <Book size={15} className="text-accent shrink-0" />
          <span className="text-xs font-semibold text-text-primary flex-1">
            Feature Guide
          </span>
          <span className="text-3xs text-text-muted bg-surface-2 rounded-full px-2 py-0.5 font-medium">
            {sections.reduce((sum, s) => sum + s.features.length, 0)} features
          </span>
          <button
            onClick={onClose}
            className="ghost p-1 text-text-muted hover:text-text-primary"
            title="Close (Esc)"
          >
            <X size={13} />
          </button>
        </div>

        {/* Tab Bar — pill style */}
        <div className="px-4 pt-3 pb-0 bg-surface-1-20 border-b border-border">
          <div className="flex gap-1 overflow-x-auto scrollbar-none pb-2.5">
            {sections.map((section, idx) => {
              const isActive = activeTab === idx;
              return (
                <button
                  key={section.category}
                  onClick={() => setActiveTab(idx)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-mac-sm text-2xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-accent-15 text-accent shadow-sm border border-accent-30"
                      : "text-text-muted hover:text-text-secondary hover:bg-surface-2-40 border border-transparent"
                  }`}
                  title={section.category}
                >
                  <span className="shrink-0">{section.icon}</span>
                  <span>{section.category}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 pr-4">
          {/* Section header with illustration */}
          <div className="space-y-3">
            {/* Category title bar */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-6 h-6 rounded bg-accent-10 text-accent shrink-0">
                {currentSection.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-text-primary">
                  {currentSection.category}
                </h3>
              </div>
              <span className="text-3xs font-medium text-text-muted bg-surface-2-50 rounded-full px-2 py-0.5 shrink-0">
                {currentSection.features.length} features
              </span>
            </div>

            {/* Illustration */}
            <div className="rounded-mac overflow-hidden border border-border-30">
              {currentSection.illustration}
            </div>

            {/* Features list */}
            <div className="bg-surface-1-30 border border-border-40 rounded-mac p-2.5 space-y-1.5">
              {currentSection.features.map((feature, idx) => (
                <FeatureItem key={`${activeTab}-${idx}`} feature={feature} />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-1 pb-1">
            <p className="text-3xs text-text-muted">
              Use tabs to browse categories · Press <kbd className="px-1 py-0.5 bg-surface-2 rounded text-3xs font-mono">⌘?</kbd> for keyboard shortcuts
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
