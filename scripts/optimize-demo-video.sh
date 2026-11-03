#!/usr/bin/env bash
# Remux the public InsightOps demo MP4 for progressive playback (faststart).
# You manually upload the output to Azure Blob to overwrite the existing file.
#
# What this script does:
#   1. Downloads the public demo MP4 (no login)
#   2. Remuxes with ffmpeg "-movflags +faststart" so moov metadata is at the
#      START of the file — browsers can start playing before the full download
#   3. Writes scripts/insightops-demo-fast.mp4 for you to upload in Azure Portal
#
# Prerequisites: Docker (for ffmpeg), curl
#
# Usage:
#   ./scripts/optimize-demo-video.sh
#   ./scripts/optimize-demo-video.sh "https://other.blob.../video.mp4"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_URL="${1:-https://stteamtrackerprdcin.blob.core.windows.net/insightops/insightops-demo.mp4}"
OUTPUT_FILE="${SCRIPT_DIR}/insightops-demo-fast.mp4"
WORK_DIR="${TMPDIR:-/tmp}/insightops-video-$$"

echo "==> Source: ${SOURCE_URL}"
echo "==> Output: ${OUTPUT_FILE}"
mkdir -p "${WORK_DIR}"

echo "==> Downloading..."
curl -L --fail -o "${WORK_DIR}/source.mp4" "${SOURCE_URL}"

echo "==> Remuxing with faststart (moov atom first) via Docker ffmpeg..."
export MSYS_NO_PATHCONV=1
if command -v cygpath >/dev/null 2>&1; then
  HOST_WORK="$(cygpath -w "${WORK_DIR}" | tr '\\' '/')"
elif WIN_PWD="$(cd "${WORK_DIR}" && pwd -W 2>/dev/null)"; then
  HOST_WORK="${WIN_PWD}"
else
  HOST_WORK="${WORK_DIR}"
fi

docker run --rm -v "${HOST_WORK}:/data" -w /data jrottenberg/ffmpeg:4.4-alpine \
  -y -i source.mp4 -c copy -movflags +faststart optimized.mp4

cp "${WORK_DIR}/optimized.mp4" "${OUTPUT_FILE}"
rm -rf "${WORK_DIR}"

echo ""
echo "==> Done: ${OUTPUT_FILE}"
echo ""
echo "Next (manual): Azure Portal → overwrite the blob with this file"
echo "  → set Content-Type to video/mp4"
echo "Then hard-refresh the landing page (Ctrl+Shift+R)."
