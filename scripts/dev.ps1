param(
    [ValidateSet("up", "down", "logs", "restart", "reset", "status", "pytest", "deps")]
    [string]$Action
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent

function Show-Menu {
    Write-Host ""
    Write-Host "=== ProjetoDev Docker Menu ==="
    Write-Host "1) up      - Build e sobe backend + banco + frontend"
    Write-Host "2) down    - Para os containers"
    Write-Host "3) logs    - Mostra logs de backend e banco"
    Write-Host "4) restart - Reinicia os containers"
    Write-Host "5) reset   - Remove volumes e recria tudo (apaga dados)"
    Write-Host "6) status  - Mostra status dos servicos"
    Write-Host "7) pytest  - Roda testes automatizados do backend"
    Write-Host "8) deps    - Instala dependencias do frontend local"
    Write-Host ""
}

function Install-FrontendDependencies {
    $frontendPath = Join-Path $ProjectRoot "frontend"
    if (-not (Test-Path $frontendPath)) {
        throw "Pasta frontend nao encontrada em: $frontendPath"
    }

    Push-Location $frontendPath
    try {
        if (Test-Path "package-lock.json") {
            Write-Host "Instalando dependencias do frontend com npm ci..."
            npm ci
        }
        else {
            Write-Host "package-lock.json nao encontrado. Instalando com npm install..."
            npm install
        }
    }
    finally {
        Pop-Location
    }
}

if (-not $Action) {
    Show-Menu
    $choice = Read-Host "Escolha uma opcao (1-8)"

    $Action = switch ($choice) {
        "1" { "up" }
        "2" { "down" }
        "3" { "logs" }
        "4" { "restart" }
        "5" { "reset" }
        "6" { "status" }
        "7" { "pytest" }
        "8" { "deps" }
        default {
            throw "Opcao invalida: $choice"
        }
    }
}

Push-Location $ProjectRoot
try {
    switch ($Action) {
        "up" {
            docker compose up -d --build
            break
        }
        "down" {
            docker compose down
            break
        }
        "logs" {
            docker compose logs -f backend db frontend
            break
        }
        "restart" {
            docker compose down
            docker compose up -d --build
            break
        }
        "reset" {
            Write-Host "ATENCAO: isso apaga dados do banco (volume)."
            $confirm = Read-Host "Digite RESET para confirmar"
            if ($confirm -ne "RESET") {
                throw "Operacao cancelada."
            }
            docker compose down -v
            docker compose up -d --build
            break
        }
        "status" {
            docker compose ps
            break
        }
        "pytest" {
            python -m pytest backend/tests -q
            break
        }
        "deps" {
            Install-FrontendDependencies
            break
        }
    }
}
finally {
    Pop-Location
}
