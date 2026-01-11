# Script para organizar arquivos .md por data e dados sensiveis
param(
    [string]$ProjectRoot = $PSScriptRoot,
    [string]$Date = (Get-Date -Format "dd-MM-yyyy"),
    [switch]$WhatIf
)

function Test-SensitiveContent {
    param([string]$FilePath)
    
    try {
        $content = Get-Content -Path $FilePath -Raw -ErrorAction SilentlyContinue
        if (-not $content) { return $false }
        
        $patterns = @("password", "senha", "key", "chave", "credential", "secret", "token", "ssh", "database_url", "smtp", "auth", "login", "\d+\.\d+\.\d+\.\d+", "deploy_key")
        
        foreach ($pattern in $patterns) {
            if ($content -match $pattern) {
                return $true
            }
        }
        return $false
    }
    catch {
        return $false
    }
}

$DestinationFolder = Join-Path $ProjectRoot "AlteraçõesVscode\$Date"
$SensitiveFolder = Join-Path $ProjectRoot "Sensivel"

if (-not (Test-Path $SensitiveFolder)) {
    New-Item -ItemType Directory -Path $SensitiveFolder -Force | Out-Null
    Write-Host "Pasta Sensivel criada" -ForegroundColor Green
}

$MdFiles = Get-ChildItem -Path $ProjectRoot -Filter "*.md" -File | Where-Object { 
    $_.Name -ne "README.md" -and
    $_.FullName -notmatch "\\AlteraçõesVscode\\" -and
    $_.FullName -notmatch "\\Sensivel\\"
}

$SensitiveFiles = Get-ChildItem -Path $ProjectRoot -File | Where-Object {
    $_.FullName -notmatch "\\Sensivel\\" -and
    $_.FullName -notmatch "\\AlteraçõesVscode\\" -and (
        $_.Name -match "\.(env|key|pem|sh)$" -or
        $_.Name -match "(deploy_key|password|credential|secret|backup)"
    )
}

if ($MdFiles.Count -eq 0 -and $SensitiveFiles.Count -eq 0) {
    Write-Host "Nenhum arquivo encontrado para organizar." -ForegroundColor Yellow
    exit 0
}

Write-Host "Organizando arquivos..." -ForegroundColor Cyan
$MovedCount = 0
$SensitiveCount = 0

foreach ($file in $MdFiles) {
    $isSensitive = Test-SensitiveContent -FilePath $file.FullName
    
    if ($isSensitive) {
        Write-Host "SENSÍVEL: $($file.Name)" -ForegroundColor Red
        if (-not $WhatIf) {
            Move-Item -Path $file.FullName -Destination $SensitiveFolder -Force
        }
        $SensitiveCount++
    } else {
        Write-Host "Normal: $($file.Name)" -ForegroundColor Green
        if (-not $WhatIf) {
            if (-not (Test-Path $DestinationFolder)) {
                New-Item -ItemType Directory -Path $DestinationFolder -Force | Out-Null
            }
            Move-Item -Path $file.FullName -Destination $DestinationFolder -Force
        }
        $MovedCount++
    }
}

foreach ($file in $SensitiveFiles) {
    Write-Host "ARQUIVO SENSÍVEL: $($file.Name)" -ForegroundColor Red
    if (-not $WhatIf) {
        Move-Item -Path $file.FullName -Destination $SensitiveFolder -Force
    }
    $SensitiveCount++
}

if ($WhatIf) {
    Write-Host "SIMULAÇÃO:" -ForegroundColor Yellow
    Write-Host "$MovedCount arquivos .md seriam movidos para: AlteraçõesVscode\$Date" -ForegroundColor Cyan
    Write-Host "$SensitiveCount arquivos sensiveis seriam movidos para: Sensivel\" -ForegroundColor Red
} else {
    Write-Host "ORGANIZAÇÃO CONCLUÍDA:" -ForegroundColor Green
    Write-Host "$MovedCount arquivos .md movidos para: AlteraçõesVscode\$Date" -ForegroundColor Cyan
    Write-Host "$SensitiveCount arquivos sensiveis movidos para: Sensivel\" -ForegroundColor Red
}
