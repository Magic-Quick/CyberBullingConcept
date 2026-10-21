@echo off
chcp 65001 >nul
title Генерация Рэп-Трека (Агрон)
cd /d "H:\PLBX\CyberBullingConcept"
echo ========================================================
echo   ГЕНЕРАЦИЯ РЭП-ТРЕКА ИИ-ЛОРДА ЧЕРЕЗ АГЕНТА «АГРОН»
echo ========================================================
echo Нажмите Win+H для диктовки или введите пожелания к тексту:
set /p USER_TASK="Тема/пожелания: "
if "%USER_TASK%"=="" set USER_TASK=Написать новый куплет/панчи ИИ-Лорда с учетом золотых файлов и контекста лора

python "F:\AI\gemini-integration\gemini_pipeline.py" --path "H:\PLBX\CyberBullingConcept" --agent agron --task "%USER_TASK%"
pause
