#!/usr/bin/env bash
# Create (or recreate) a release tag and push it.
# The tag push triggers .github/workflows/cli-release.yml.
#
# Usage:
#   pnpm release v1.2.3
#   pnpm release 1.2.3          # v-prefix added automatically
#   pnpm release                # uses version from apps/cli/package.json
set -euo pipefail

cd "$(dirname "$0")/.."
REMOTE="${RELEASE_REMOTE:-origin}"

TAG="${1:-}"
if [ -z "$TAG" ]; then
  # Fall back to the CLI package version.
  VERSION="$(node -p "require('./apps/cli/package.json').version")"
  TAG="v${VERSION}"
fi
# Ensure a leading "v".
case "$TAG" in
  v*) ;;
  *) TAG="v${TAG}" ;;
esac

echo "▸ Releasing ${TAG} on ${REMOTE}"

# Refuse to release a dirty tree — the tag must point at committed work.
if [ -n "$(git status --porcelain)" ]; then
  echo "✗ Working tree is dirty. Commit or stash first." >&2
  exit 1
fi

# Delete the tag locally if it already exists.
if git rev-parse -q --verify "refs/tags/${TAG}" >/dev/null; then
  echo "  • deleting existing local tag"
  git tag -d "${TAG}" >/dev/null
fi

# Delete the tag on the remote if it already exists (ignore if absent).
if git ls-remote --exit-code --tags "${REMOTE}" "refs/tags/${TAG}" >/dev/null 2>&1; then
  echo "  • deleting existing remote tag"
  git push "${REMOTE}" ":refs/tags/${TAG}" >/dev/null
fi

# Create the annotated tag on the current commit and push it.
git tag -a "${TAG}" -m "Release ${TAG}"
git push "${REMOTE}" "${TAG}"

echo "✓ Pushed ${TAG} — the release workflow will run."
