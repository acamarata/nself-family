#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

has_rg=0
if command -v rg >/dev/null 2>&1; then
  has_rg=1
fi

required_files=(
  ".wiki/Home.md"
  ".wiki/TOC.md"
  ".wiki/00-Getting-Started.md"
  ".wiki/03-Architecture-Reference.md"
  ".wiki/41-Feature-Index.md"
  ".wiki/42-Setup-and-Configuration.md"
  ".wiki/11-Operations-Runbooks.md"
  ".wiki/13-Roadmap-Backlog.md"
  ".wiki/43-Releases-Index.md"
  ".wiki/44-Release-Page-Template.md"
  ".wiki/CHANGELOG.md"
  ".wiki/LICENSE.md"
)

missing=0
for f in "${required_files[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "[docs-qa] missing required file: $f"
    missing=1
  fi
done
if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

link_error=0

if [[ "$has_rg" -eq 1 ]]; then
  link_source_cmd=(rg -n '\[[^]]+\]\([^)]*\)' .wiki -g '*.md')
else
  link_source_cmd=(grep -RInE '\[[^]]+\]\([^)]*\)' .wiki --include='*.md')
fi

while IFS= read -r line; do
  file="${line%%:*}"
  remainder="${line#*:}"
  line_num="${remainder%%:*}"
  line_text="${remainder#*:}"

  if [[ "$has_rg" -eq 1 ]]; then
    link_extract_cmd=(rg -o '\[[^]]+\]\([^)]*\)')
  else
    link_extract_cmd=(grep -oE '\[[^]]+\]\([^)]*\)')
  fi

  while IFS= read -r link; do
    target="${link#*](}"
    target="${target%)}"

    case "$target" in
      http://*|https://*|mailto:*|\#*)
        continue
        ;;
    esac

    target="${target%%#*}"
    if [[ -z "$target" ]]; then
      continue
    fi

    if [[ "$target" == /* ]]; then
      check_path="$target"
    else
      check_path="$(dirname "$file")/$target"
    fi

    if [[ ! -f "$check_path" ]]; then
      echo "[docs-qa] broken link: $file:$line_num -> $target"
      link_error=1
    fi
  done < <(printf '%s\n' "$line_text" | "${link_extract_cmd[@]}" || true)
done < <("${link_source_cmd[@]}")

if [[ "$link_error" -ne 0 ]]; then
  exit 1
fi

# Check for private AI directory references in public docs
private_dir_pattern='/\.ai/|\.ai/'
if [[ "$has_rg" -eq 1 ]]; then
  if rg -n "$private_dir_pattern" .wiki -g '*.md' >/dev/null; then
    echo "[docs-qa] found private .ai references in public docs"
    rg -n "$private_dir_pattern" .wiki -g '*.md'
    exit 1
  fi
else
  if grep -RInE "$private_dir_pattern" .wiki --include='*.md' >/dev/null; then
    echo "[docs-qa] found private .ai references in public docs"
    grep -RInE "$private_dir_pattern" .wiki --include='*.md'
    exit 1
  fi
fi

echo "[docs-qa] PASS"
