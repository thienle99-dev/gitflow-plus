#!/usr/bin/env bash
# Create test fixture repos for GitFlow Desktop integration testing.
# Usage: bash scripts/create-test-fixtures.sh [output_dir]
# Default output: ./test-fixtures

set -euo pipefail

OUT="${1:-./test-fixtures}"
mkdir -p "$OUT"

echo "Creating test fixture repos in: $OUT"

# ──────────────────────────────────────────────
# 1. Conflict repo — two branches with competing edits on the same file
# ──────────────────────────────────────────────
echo "▸ [1/8] conflict-repo"
DIR="$OUT/conflict-repo"
rm -rf "$DIR" && mkdir -p "$DIR" && cd "$DIR"
git init -q
git config user.email "test@example.com"
git config user.name "Test User"
echo "base content" > conflict.txt
git add . && git commit -q -m "initial"
git checkout -q -b feature
echo "feature change" > conflict.txt
git add . && git commit -q -m "feature edit"
git checkout -q main
echo "main change" > conflict.txt
git add . && git commit -q -m "main edit"
git merge -q feature || true   # conflict
echo "  → conflict state: $(git status --short | head -3)"

# ──────────────────────────────────────────────
# 2. Binary repo — tracked binary files (.png, .pdf stubs)
# ──────────────────────────────────────────────
echo "▸ [2/8] binary-repo"
DIR="$OUT/binary-repo"
rm -rf "$DIR" && mkdir -p "$DIR" && cd "$DIR"
git init -q
git config user.email "test@example.com"
git config user.name "Test User"
dd if=/dev/urandom of=image.png bs=1024 count=64 2>/dev/null
dd if=/dev/urandom of=doc.pdf bs=1024 count=32 2>/dev/null
echo "text file" > readme.md
git add . && git commit -q -m "add binary files"
echo "  → tracked files: $(git ls-files | wc -l | tr -d ' ')"

# ──────────────────────────────────────────────
# 3. LFS repo — git-lfs tracked files (requires git-lfs installed)
# ──────────────────────────────────────────────
echo "▸ [3/8] lfs-repo"
DIR="$OUT/lfs-repo"
rm -rf "$DIR" && mkdir -p "$DIR" && cd "$DIR"
git init -q
git config user.email "test@example.com"
git config user.name "Test User"
if command -v git-lfs &>/dev/null || git lfs version &>/dev/null 2>&1; then
  git lfs install --local
  git lfs track "*.bin" "*.psd"
  echo "*.bin filter=lfs diff=lfs merge=lfs -text" > .gitattributes
  git add .gitattributes
  dd if=/dev/urandom of=asset.bin bs=1024 count=128 2>/dev/null
  dd if=/dev/urandom of=design.psd bs=1024 count=64 2>/dev/null
  echo "small text" > notes.txt
  git add . && git commit -q -m "add LFS tracked files"
  echo "  → LFS tracked: $(git lfs ls-files 2>/dev/null | wc -l | tr -d ' ')"
else
  echo "  ⚠ git-lfs not found; creating placeholder"
  echo "*.bin" > .gitattributes
  dd if=/dev/urandom of=asset.bin bs=1024 count=128 2>/dev/null
  git add . && git commit -q -m "add large binary (no LFS)"
fi

# ──────────────────────────────────────────────
# 4. Submodule repo — one repo with another as submodule
# ──────────────────────────────────────────────
echo "▸ [4/8] submodule-repo"
PARENT="$OUT/submodule-repo"
CHILD="$OUT/submodule-repo-lib"
rm -rf "$PARENT" "$CHILD"

# Child repo
mkdir -p "$CHILD" && cd "$CHILD"
git init -q
git config user.email "test@example.com"
git config user.name "Test User"
echo "export function hello() { return 'world'; }" > index.ts
git add . && git commit -q -m "initial child"

# Parent repo
mkdir -p "$PARENT" && cd "$PARENT"
git init -q
git config user.email "test@example.com"
git config user.name "Test User"
echo "# Parent Repo" > README.md
git add . && git commit -q -m "initial parent"
git submodule add "$CHILD" libs/child 2>/dev/null || git submodule add "$CHILD" libs/child
git commit -q -m "add submodule"
echo "  → submodule: $(git submodule status | head -1)"

# ──────────────────────────────────────────────
# 5. Large history repo — 2000 commits for virtual-scroll testing
# ──────────────────────────────────────────────
echo "▸ [5/8] large-history-repo"
DIR="$OUT/large-history-repo"
rm -rf "$DIR" && mkdir -p "$DIR" && cd "$DIR"
git init -q
git config user.email "test@example.com"
git config user.name "Test User"
echo "initial" > data.txt
git add . && git commit -q -m "commit 0"
for i in $(seq 1 2000); do
  echo "change $i at $(date +%s%N)" >> data.txt
  git add . && git commit -q -m "commit $i" --no-verify 2>/dev/null || \
    git add . && git commit -q -m "commit $i"
  if (( i % 500 == 0 )); then
    echo "  → $i commits..."
  fi
done
echo "  → total commits: $(git rev-list --count HEAD)"

# ──────────────────────────────────────────────
# 6. Rename/delete repo — file renames and deletes
# ──────────────────────────────────────────────
echo "▸ [6/8] rename-delete-repo"
DIR="$OUT/rename-delete-repo"
rm -rf "$DIR" && mkdir -p "$DIR" && cd "$DIR"
git init -q
git config user.email "test@example.com"
git config user.name "Test User"
echo "file A content" > fileA.txt
echo "file B content" > fileB.txt
echo "file C content" > fileC.txt
echo "file D content" > subdir/fileD.txt 2>/dev/null || { mkdir -p subdir && echo "file D content" > subdir/fileD.txt; }
git add . && git commit -q -m "add files"

# Rename fileA → fileA_renamed
git mv fileA.txt fileA_renamed.txt
git commit -q -m "rename fileA"

# Delete fileB
git rm -q fileB.txt
git commit -q -m "delete fileB"

# Rename with content change
git mv subdir/fileD.txt fileD_renamed.txt
echo "modified after rename" >> fileD_renamed.txt
git add . && git commit -q -m "rename and modify fileD"

echo "  → final files: $(git ls-files)"

# ──────────────────────────────────────────────
# 7. Detached HEAD repo — in detached HEAD state
# ──────────────────────────────────────────────
echo "▸ [7/8] detached-head-repo"
DIR="$OUT/detached-head-repo"
rm -rf "$DIR" && mkdir -p "$DIR" && cd "$DIR"
git init -q
git config user.email "test@example.com"
git config user.name "Test User"
echo "commit 1" > file.txt
git add . && git commit -q -m "first"
FIRST=$(git rev-parse HEAD)
echo "commit 2" >> file.txt
git add . && git commit -q -m "second"
echo "commit 3" >> file.txt
git add . && git commit -q -m "third"
git checkout -q "$FIRST"
echo "  → HEAD: $(git rev-parse --short HEAD) (detached: $(git symbolic-ref -q HEAD || echo 'yes'))"

# ──────────────────────────────────────────────
# 8. Shallow clone repo — shallow clone with depth=1
# ──────────────────────────────────────────────
echo "▸ [8/8] shallow-clone-repo"
SOURCE="$OUT/shallow-source"
SHALLOW="$OUT/shallow-clone-repo"
rm -rf "$SOURCE" "$SHALLOW"

# Create source repo with history
mkdir -p "$SOURCE" && cd "$SOURCE"
git init -q
git config user.email "test@example.com"
git config user.name "Test User"
for i in $(seq 1 50); do
  echo "line $i" >> data.txt
  git add . && git commit -q -m "commit $i"
done
SOURCE_COMMIT_COUNT=$(git rev-list --count HEAD)

# Shallow clone
cd "$OUT"
git clone -q --depth=1 "$SOURCE" "$SHALLOW"
cd "$SHALLOW"
CLONE_COMMIT_COUNT=$(git rev-list --count HEAD)
echo "  → source commits: $SOURCE_COMMIT_COUNT, shallow clone commits: $CLONE_COMMIT_COUNT"

# ──────────────────────────────────────────────
# Cleanup source used for shallow clone test
# ──────────────────────────────────────────────
rm -rf "$SOURCE"

echo ""
echo "✅ All 8 test fixture repos created in: $OUT"
echo ""
ls -1 "$OUT"
