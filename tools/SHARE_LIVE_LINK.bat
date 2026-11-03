@echo off
chcp 65001 >nul
python "%~dp0internal\share_live_link.py" %*
pause
