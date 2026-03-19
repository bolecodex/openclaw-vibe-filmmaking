#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SKILLS_SRC="${PROJECT_ROOT}/../skills-openclaw"
OPENCLAW_HOME="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"
WORKSPACE_DIR="${OPENCLAW_HOME}/workspace/skills"
BUNDLED_DIR="${OPENCLAW_HOME}/bundled-skills"

BUNDLED_SKILLS=(
  novel-00-long-novel-to-script
  novel-to-script
  novel-01-character-extractor
  novel-02-script-to-scenes
  novel-03-scenes-to-storyboard
  novel-04-shots-to-images
  novel-05-shots-to-audio
  novel-06-shots-to-ai-video
  novel-07-shots-to-video
  novel-07-remotion
  novel-08-ai-edit-video
  novel-09-video-quality-review
)

is_bundled() {
  local name="$1"
  for b in "${BUNDLED_SKILLS[@]}"; do
    [[ "$name" == "$b" ]] && return 0
  done
  return 1
}

echo "=== OpenClaw Studio Skills Deploy ==="
echo "Source:  ${SKILLS_SRC}"
echo "Bundled: ${BUNDLED_DIR}"
echo "User:    ${WORKSPACE_DIR}"

mkdir -p "$BUNDLED_DIR" "$WORKSPACE_DIR"

bundled_count=0
user_count=0
for skill_path in "$SKILLS_SRC"/*/; do
  if [[ -f "${skill_path}SKILL.md" ]]; then
    skill_name=$(basename "$skill_path")
    [[ "$skill_name" == "mcp-proxy" ]] && continue

    if is_bundled "$skill_name"; then
      target="${BUNDLED_DIR}/${skill_name}"
      mkdir -p "$target"
      rsync -a --quiet "${skill_path}" "${target}/" 2>/dev/null || \
        cp -a "${skill_path}/." "${target}/" 2>/dev/null || true
      echo "  [bundled] ${skill_name}"
      bundled_count=$((bundled_count + 1))
    else
      target="${WORKSPACE_DIR}/${skill_name}"
      mkdir -p "$target"
      rsync -a --quiet "${skill_path}" "${target}/" 2>/dev/null || \
        cp -a "${skill_path}/." "${target}/" 2>/dev/null || true
      echo "  [user]    ${skill_name}"
      user_count=$((user_count + 1))
    fi
  fi
done

if [[ -f "${PROJECT_ROOT}/pipeline.yaml" ]]; then
  cp "${PROJECT_ROOT}/pipeline.yaml" "${BUNDLED_DIR}/_pipeline.yaml"
  echo "  [pipeline] _pipeline.yaml"
fi

echo "=== Done: ${bundled_count} bundled + ${user_count} user skills deployed ==="
