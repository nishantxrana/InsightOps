#!/usr/bin/env bash
# Remux the public InsightOps demo MP4 for progressive playback (faststart).
# You manually upload the output to Azure Blob to overwrite the existing file.
#
# What this script does:
#   1. Downloads the current public demo MP4 from Azure Blob (no login)
#   2. Remuxes with ffmpeg "-movflags +faststart" so moov metadata is at the
#      START of the file — browsers can start playing before the full download
#   3. Writes scripts/insightops-demo-fast.mp4 for you to upload in Azure Portal
#
# What this script does NOT do:
#   - No az login
#   - No upload / overwrite in Azure
#   - No storage account API version changes
#
# Prerequisites: Docker (for ffmpeg), curl
#
# Usage:
#   ./scripts/optimize-demo-video.sh
#   SOURCE_URL=https://.../insightops-demo.mp4 ./scripts/optimize-demo-video.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ACCOUNT="${ACCOUNT:-stteamtrackerprdcin}"
CONTAINER="${CONTAINER:-insightops}"
BLOB="${BLOB:-insightops-demo.mp4}"
SOURCE_URL="${SOURCE_URL:-https://${ACCOUNT}.blob.core.windows.net/${CONTAINER}/${BLOB}}"
OUTPUT_FILE="${OUTPUT_FILE:-${SCRIPT_DIR}/insightops-demo-fast.mp4}"
WORK_DIR="${TMPDIR:-/tmp}/insightops-video-$$"

echo "==> Source (public URL): ${SOURCE_URL}"
echo "==> Output: ${OUTPUT_FILE}"
mkdir -p "${WORK_DIR}"

echo "==> Checking Range headers on current blob (info only)..."
curl -sI -H "Range: bytes=0-1" "${SOURCE_URL}" | tr -d '\r' | grep -iE 'HTTP/|Accept-Ranges|Content-Range|x-ms-version|Content-Type' || true

echo "==> Downloading..."
curl -L --fail -o "${WORK_DIR}/source.mp4" "${SOURCE_URL}"

echo "==> Remuxing with faststart (moov atom first) via Docker ffmpeg..."
export MSYS_NO_PATHCONV=1
# Resolve a Docker-friendly host path on Windows Git Bash
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
echo "==> Done. Optimized file ready:"
echo "    ${OUTPUT_FILE}"
echo ""
echo "Next (manual): Azure Portal → storage ${ACCOUNT} → container ${CONTAINER}"
echo "  → overwrite blob '${BLOB}' with this file"
echo "  → set Content-Type to video/mp4"
echo "Then hard-refresh the landing page (Ctrl+Shift+R)."
