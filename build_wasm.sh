#!/usr/bin/env bash
set -euo pipefail
em++ src/wasm/company_engine.cpp \
  -O3 \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME="CompanyEngine" \
  -s EXPORTED_FUNCTIONS='["_count_missing_coordinates","_count_duplicate_names"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
  -o src/wasm/company_engine.js
