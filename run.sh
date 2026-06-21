#!/usr/bin/env bash
# Start the infrastructure dashboard dev server.
# Usage: ./run.sh
set -euo pipefail
cd "$(dirname "$0")"
exec npm run dev