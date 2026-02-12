#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ -z "${WIKI_REPO:-}" ]]; then
  echo "[wiki-sync] WIKI_REPO is required (for example: github.com/org/repo.wiki.git)"
  exit 1
fi

if [[ -z "${WIKI_PUSH_TOKEN:-}" ]]; then
  echo "[wiki-sync] WIKI_PUSH_TOKEN is required"
  exit 1
fi

"$ROOT_DIR/.wiki/scripts/docs_qa.sh"

tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

repo_url="https://${WIKI_PUSH_TOKEN}@${WIKI_REPO}"
git clone "$repo_url" "$tmp_dir/wiki"

# Sync markdown pages only; keep wiki git metadata.
find "$tmp_dir/wiki" -maxdepth 1 -type f -name '*.md' -delete
cp "$ROOT_DIR"/.wiki/*.md "$tmp_dir/wiki"/

cd "$tmp_dir/wiki"
if [[ -n "$(git status --porcelain)" ]]; then
  git config user.name "nself-family docs bot"
  git config user.email "docs-bot@nself-family.local"
  git add .
  git commit -m "docs: sync wiki content"
  git push origin HEAD
  echo "[wiki-sync] wiki updated"
else
  echo "[wiki-sync] no wiki changes"
fi
