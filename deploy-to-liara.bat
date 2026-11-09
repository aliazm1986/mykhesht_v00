@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo   Direct Deployment to Liara (without needing GitHub)
echo ============================================================
npx --yes @liara/cli deploy --port=3000 --platform=node
pause
