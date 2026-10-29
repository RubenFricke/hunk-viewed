#!/usr/bin/env bash
# Records the README demo: builds a fixture repository with fixed dates, runs
# demo/hero.tape against it with an isolated Hunk config, and checks the GIF.
# Needs vhs (which brings ttyd and ffmpeg) and hunk on PATH.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
DEMO=${HUNK_VIEWED_DEMO:-/tmp/hunk-viewed-demo}
OUT="$ROOT/demo/out/hero.gif"
MAX_BYTES=$((1500 * 1024))

for tool in vhs ffmpeg hunk git; do
  command -v "$tool" >/dev/null || { echo "$tool is not on PATH." >&2; exit 1; }
done

# The fixture: five short files, each with a small change, so the whole review
# fits the recording. Fixed dates keep the recording the same on every run.
rm -rf "$DEMO"
mkdir -p "$DEMO/config" "$DEMO/state" "$DEMO/repo"
cd "$DEMO/repo"
git init -q -b main
git config user.name "Demo"
git config user.email "demo@example.com"
export GIT_AUTHOR_DATE="2026-01-01T09:00:00+00:00"
export GIT_COMMITTER_DATE="$GIT_AUTHOR_DATE"

mkdir -p src docs
cat > src/cart.ts <<'EOF'
export const total = (prices: number[]) =>
  prices.reduce((sum, price) => sum + price, 0);
EOF
cat > src/order.ts <<'EOF'
export const place = (items: string[]) => {
  if (items.length === 0) {
    throw new Error('empty order');
  }
  return { items, status: 'placed' };
};
EOF
cat > src/user.ts <<'EOF'
export const greet = (name: string) => `Hi ${name}`;
EOF
cat > src/stock.ts <<'EOF'
export const inStock = (count: number) => count > 0;
EOF
cat > docs/guide.md <<'EOF'
# Guide

Add items to the cart, then place the order.
EOF
git add -A
git commit -q -m "init"

cat > src/cart.ts <<'EOF'
export const total = (prices: number[]) =>
  prices.reduce((sum, price) => sum + price, 0);

export const isEmpty = (prices: number[]) =>
  prices.length === 0;
EOF
cat > src/order.ts <<'EOF'
export const place = (items: string[]) => {
  if (items.length === 0) {
    throw new Error('An order needs items');
  }
  return { items, status: 'placed' };
};
EOF
cat > src/user.ts <<'EOF'
export const greet = (name: string) => `Hello ${name}`;
EOF
cat > src/stock.ts <<'EOF'
export const inStock = (count: number) => count > 0;
export const isLow = (count: number) => count < 5;
EOF
cat > docs/guide.md <<'EOF'
# Guide

Add items to the cart, then place the order.
An empty cart cannot be ordered.
EOF

cd "$ROOT"
mkdir -p demo/out
HUNK_VIEWED_DEMO="$DEMO" HUNK_VIEWED_ROOT="$ROOT" vhs demo/hero.tape

# The checks: a recording that would slow the README down, or one where
# nothing happened on screen, must not land in it.
bytes=$(( $(wc -c < "$OUT") ))
if [ "$bytes" -gt "$MAX_BYTES" ]; then
  echo "hero.gif is $bytes bytes; the limit is $MAX_BYTES." >&2
  exit 1
fi
frames=$(mktemp -d)
ffmpeg -v error -i "$OUT" -vf "select=eq(n\,0)" -vframes 1 "$frames/first.png"
ffmpeg -v error -sseof -0.5 -i "$OUT" -update 1 -vframes 1 "$frames/last.png"
if cmp -s "$frames/first.png" "$frames/last.png"; then
  echo "The first and last frame are the same: nothing happened on screen." >&2
  exit 1
fi
rm -rf "$frames"
echo "Recorded $OUT: $bytes bytes, on Hunk $(hunk --version)."
