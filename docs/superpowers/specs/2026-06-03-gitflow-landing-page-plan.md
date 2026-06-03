# GitFlow Landing Page — Implementation Plan

## Goal

Build a one-page public landing website for GitFlow Desktop that introduces the app, highlights its AI-powered Git workflow and beautiful desktop GUI, and directs users to download the app from GitHub Releases.

## Decisions

- Stack: React + Vite
- Location: `apps/landing`
- Page type: one-page landing website
- Download source: GitHub Releases
- Positioning: AI-powered Git client + Beautiful Git GUI
- Primary audience: developers who want a polished Git desktop app with AI-assisted commit/review workflows

## Content Structure

### Hero
- [ ] Headline: "AI-powered Git client with a beautiful desktop workflow"
- [ ] Supporting copy: mention commit graph, staging, merge preview, AI commit/review, PR/MR flow
- [ ] Primary CTA: "Download for macOS" → GitHub Releases
- [ ] Secondary CTA: "View on GitHub"
- [ ] Show platform note: Apple Silicon build available; Intel/universal build if available later

### Product Preview
- [ ] Large first-viewport product visual
- [ ] Prefer real app screenshot when available
- [ ] Fallback: styled mockup using app-like panels, commit graph, diff viewer, and AI review panel
- [ ] Keep product/app visible immediately; avoid generic decorative hero

### Features
- [ ] Beautiful commit graph — canvas-rendered graph, branch lanes, ref badges
- [ ] Interactive staging and diff viewer — split/unified diff, hunk/line actions
- [ ] AI commit messages — generate commit messages from staged changes
- [ ] AI code review and explain changes — summarize risks and improvements
- [ ] Merge and conflict support — preview merge, resolve conflicts, understand changes
- [ ] GitHub/GitLab PR/MR workflow — review pull/merge requests and checkout branches

### How It Works
- [ ] Step 1: Open or clone a repository
- [ ] Step 2: Review branch graph and working tree changes
- [ ] Step 3: Stage changes and generate commit messages with AI
- [ ] Step 4: Preview merge/push workflows and ship with confidence

### Download
- [ ] Download section repeats CTA for GitHub Releases
- [ ] Show latest release link
- [ ] Add short install note for macOS
- [ ] Add "View source on GitHub" link

### Footer
- [ ] GitHub repository link
- [ ] Releases link
- [ ] Docs/Guide link if available
- [ ] Product/version note

## UX / Visual Direction

- [ ] Use a refined desktop-app aesthetic: quiet, technical, polished
- [ ] Avoid marketing fluff; prioritize concrete app capability and product visuals
- [ ] Use responsive layout for desktop and mobile
- [ ] Keep cards compact with 8px radius or less unless matching app style requires otherwise
- [ ] Use icons from `lucide-react`
- [ ] Do not rely on one-note purple/blue gradients; use a balanced palette inspired by the desktop app
- [ ] CTA buttons must be obvious, accessible, and not overflow on mobile

## Implementation Steps

### Step 1: Scaffold
- [ ] Create `apps/landing`
- [ ] Add React + Vite + TypeScript setup
- [ ] Add build/dev scripts
- [ ] Wire workspace package if needed
- [ ] Reuse existing dependencies where practical (`lucide-react`, Vite tooling)

### Step 2: Landing UI
- [ ] Build one-page layout in `apps/landing/src/App.tsx`
- [ ] Add responsive CSS in `apps/landing/src/index.css`
- [ ] Build reusable sections: hero, preview, features, how-it-works, download, footer
- [ ] Add accessible CTA links for GitHub Releases and repository

### Step 3: Product Visual
- [ ] Use real screenshot if available in repo/assets
- [ ] Otherwise create a CSS/HTML product mockup showing commit graph, file changes, diff, and AI panel
- [ ] Ensure visual is clear on mobile and desktop

### Step 4: Deploy Readiness
- [ ] Ensure `pnpm --dir apps/landing build` passes
- [ ] Output static files in `apps/landing/dist`
- [ ] Add deployment notes for static hosting
- [ ] Confirm links point to correct GitHub Releases URL

## Suggested Links

- GitHub repository: `https://github.com/thienle99-dev/gitflow-plus`
- GitHub Releases: `https://github.com/thienle99-dev/gitflow-plus/releases`

## Acceptance Criteria

- [ ] One-page landing builds successfully
- [ ] Hero clearly communicates AI-powered Git client + beautiful Git GUI
- [ ] Download CTA links to GitHub Releases
- [ ] Page includes feature overview, short usage guide, product visual, and footer links
- [ ] Mobile layout has no overlapping text or overflowing buttons
- [ ] Desktop layout shows the app/product visual in the first viewport
- [ ] No dependency on Tauri runtime; website deploys as static frontend

## Future Enhancements

- [ ] Auto-detect latest GitHub Release and show version
- [ ] Add platform-specific download buttons for Apple Silicon, Intel, Universal, Windows, Linux
- [ ] Add screenshots/gallery once app visuals are finalized
- [ ] Add short docs page or FAQ
- [ ] Add analytics only if privacy policy is provided
