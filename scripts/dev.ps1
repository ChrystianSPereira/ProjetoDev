param(
    [ValidateSet("up", "down", "logs", "restart", "reset", "status")]
    [string]$Action
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent

function Show-Menu {
    Write-Host ""
    Write-Host "=== ProjetoDev Docker Menu ==="
    Write-Host "1) up      - Build e sobe backend + banco"
    Write-Host "2) down    - Para os containers"
    Write-Host "3) logs    - Mostra logs de backend e banco"
    Write-Host "4) restart - Reinicia os containers"
    Write-Host "5) reset   - Remove volumes e recria tudo (apaga dados)"
    Write-Host "6) status  - Mostra status dos servicos"
    Write-Host ""
}

if (-not $Action) {
    Show-Menu
    $choice = Read-Host "Escolha uma opcao (1-6)"

    $Action = switch ($choice) {
        "1" { "up" }
        "2" { "down" }
        "3" { "logs" }
        "4" { "restart" }
        "5" { "reset" }
        "6" { "status" }
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
            docker compose logs -f backend db
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
    }
}
finally {
    Pop-Location
}
