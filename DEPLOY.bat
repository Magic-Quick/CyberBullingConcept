@echo off
chcp 65001 >nul
echo =====================================================================
echo  СЫГРАВШИЙ В ЯЩИК // PLAYBOX ДЕПЛОЙ-МЕНЕДЖЕР
echo =====================================================================
echo.
echo 1. Деплой на GitHub Pages (Magic-Quick/CyberBullingConcept)...
git add index.html game.html .nojekyll web_assets/ assets/
git commit -m "deploy: update Playbox presentation site and game runtime" 2>nul
git push origin master
if %errorlevel% equ 0 (
    echo [OK] GitHub Pages успешно обновлен!
    echo Ссылка: https://magic-quick.github.io/CyberBullingConcept/
) else (
    echo [!] Ошибка push в GitHub. Проверьте сеть или статус git.
)

echo.
echo 2. Синхронизация с Google Диском...
python "%~dp0tools\internal\deploy_to_gdrive.py"

echo.
echo =====================================================================
echo  ДЕПЛОЙ ЗАВЕРШЕН!
echo  Публичная ссылка: https://magic-quick.github.io/CyberBullingConcept/
echo =====================================================================
pause
