@echo off
chcp 65001 >nul
python "%~dp0deploy_to_gdrive.py" %*
pause
