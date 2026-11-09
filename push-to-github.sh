#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if [ ! -d ".git" ]; then
  git init -b main
fi
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/aliazm1986/mykhesht_v00.git
git branch -M main
git add -A
git commit -m "feat: production-ready Khesht platform for Liara deployment" || true
git push -u origin main --force
echo "✅ Pushed successfully to https://github.com/aliazm1986/mykhesht_v00.git"
