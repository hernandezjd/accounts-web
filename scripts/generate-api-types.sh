#!/bin/bash
set -e

SPECS_DIR="../accounts/docs/api"
OUT_DIR="src/api/generated"

mkdir -p "$OUT_DIR"

echo "Generating TypeScript types from OpenAPI specs..."
for spec in "$SPECS_DIR"/*.yaml; do
  name=$(basename "$spec" .yaml)
  echo "  Processing: $name"
  npx openapi-typescript "$spec" -o "$OUT_DIR/$name.ts"
done

echo "Done. Generated types in $OUT_DIR/"
