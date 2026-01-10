# Script para organizar arquivos .md por data
# Uso: .\organize-md-files.ps1

param(
    [string]$ProjectRoot = $PSScriptRoot,
    [string]$Date = (Get-Date -Format "dd-MM-yyyy")
)

$DestinationFolder = Join-Path $ProjectRoot "AlteraçõesVscode\$Date"
$MdFiles = Get-ChildItem -Path $ProjectRoot -Filter "*.md" -File | 
    Where-Object { $_.Name -ne "README.md" }  # Mantém README.md principal na raiz

if ($MdFiles.Count -eq 0) {
    Write-Host "Nenhum arquivo .md encontrado na raiz do projeto." -ForegroundColor Yellow
    exit 0
}

# Criar pasta da data se não existir
if (-not (Test-Path $DestinationFolder)) {
    New-Item -ItemType Directory -Path $DestinationFolder -Force | Out-Null
    Write-Host "Pasta criada: $DestinationFolder" -ForegroundColor Green
}

# Mover arquivos
$MovedCount = 0
foreach ($file in $MdFiles) {
    try {
        Move-Item -Path $file.FullName -Destination $DestinationFolder -Force
        Write-Host "✓ Movido: $($file.Name)" -ForegroundColor Green
        $MovedCount++
    }
    catch {
        Write-Host "✗ Erro ao mover: $($file.Name) - $_" -ForegroundColor Red
    }
}

Write-Host "`n$MovedCount arquivo(s) .md movido(s) para: AlteraçõesVscode\$Date" -ForegroundColor Cyan
