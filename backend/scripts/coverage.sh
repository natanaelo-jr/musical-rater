#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

uv run coverage erase
uv run coverage run manage.py test
uv run coverage html
uv run coverage report
