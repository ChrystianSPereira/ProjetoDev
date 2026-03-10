@echo off
setlocal

set ACTION=%~1
set NO_PAUSE=%~2

powershell -ExecutionPolicy Bypass -File "%~dp0dev.ps1" %ACTION%
set EXIT_CODE=%ERRORLEVEL%

if /I not "%NO_PAUSE%"=="--no-pause" (
    echo.
    if not "%EXIT_CODE%"=="0" (
        echo Operacao finalizada com erro. Codigo: %EXIT_CODE%
    ) else (
        echo Operacao concluida.
    )
    pause
)

exit /b %EXIT_CODE%
