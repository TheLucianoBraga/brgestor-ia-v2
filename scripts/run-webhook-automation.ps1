# 🤖 Script PowerShell - Executar Automação de Webhook
# Executa o script Playwright no VPS via SSH

param(
    [string]$VpsIp = "72.60.14.172",
    [string]$SshKey = "./Sensivel/deploy_key_brgestor",
    [string]$SshUser = "typebot",
    [switch]$Local
)

Write-Host "🚀 AUTOMAÇÃO - Configurar Webhook Evolution Manager" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

if ($Local) {
    Write-Host "📍 Modo LOCAL - Executando diretamente nesta máquina`n" -ForegroundColor Yellow
    
    # Verificar se Node.js e npm estão instalados
    try {
        $nodeVersion = node --version
        Write-Host "✅ Node.js detectado: $nodeVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ Node.js não encontrado. Instale: https://nodejs.org" -ForegroundColor Red
        exit 1
    }
    
    # Verificar/Instalar dependências
    Write-Host "`n📦 Verificando dependências..." -ForegroundColor Yellow
    
    if (!(Test-Path "node_modules/playwright")) {
        Write-Host "   📥 Instalando Playwright..." -ForegroundColor Yellow
        npm install playwright
        npx playwright install chromium
    } else {
        Write-Host "   ✅ Playwright já instalado" -ForegroundColor Green
    }
    
    if (!(Test-Path "node_modules/typescript")) {
        Write-Host "   📥 Instalando TypeScript..." -ForegroundColor Yellow
        npm install --save-dev typescript @types/node
    }
    
    # Compilar TypeScript
    Write-Host "`n🔨 Compilando TypeScript..." -ForegroundColor Yellow
    npx tsc scripts/configure-evolution-webhook.ts --outDir scripts/dist --esModuleInterop --skipLibCheck
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao compilar TypeScript" -ForegroundColor Red
        exit 1
    }
    
    # Executar script
    Write-Host "`n🎬 Executando automação...`n" -ForegroundColor Green
    node scripts/dist/configure-evolution-webhook.js
    
} else {
    Write-Host "📡 Modo REMOTO - Executando no VPS via SSH`n" -ForegroundColor Yellow
    
    # Verificar se chave SSH existe
    if (!(Test-Path $SshKey)) {
        Write-Host "❌ Chave SSH não encontrada: $SshKey" -ForegroundColor Red
        Write-Host "   Use -SshKey para especificar o caminho correto" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "📤 Enviando script para VPS..." -ForegroundColor Yellow
    
    # Criar script de instalação no VPS
    $remoteScript = @"
#!/bin/bash
set -e

echo '🔧 Preparando ambiente no VPS...'

# Criar diretório temporário
mkdir -p /tmp/webhook-automation
cd /tmp/webhook-automation

# Instalar Node.js se não existir
if ! command -v node &> /dev/null; then
    echo '📥 Instalando Node.js...'
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Criar package.json
cat > package.json << 'PKGEOF'
{
  "name": "webhook-automation",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "playwright": "^1.40.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
PKGEOF

# Instalar dependências
echo '📦 Instalando dependências...'
npm install --silent

# Instalar navegador Chromium
echo '🌐 Instalando Chromium para Playwright...'
npx playwright install chromium --with-deps

echo '✅ Ambiente preparado!'
"@

    # Salvar script temporário
    $tempScript = [System.IO.Path]::GetTempFileName() + ".sh"
    $remoteScript | Out-File -FilePath $tempScript -Encoding UTF8
    
    # Enviar e executar script de preparação
    Write-Host "   🔧 Preparando ambiente no VPS..." -ForegroundColor Yellow
    scp -i $SshKey $tempScript "${SshUser}@${VpsIp}:/tmp/prepare-webhook-env.sh"
    ssh -i $SshKey "${SshUser}@${VpsIp}" "chmod +x /tmp/prepare-webhook-env.sh && bash /tmp/prepare-webhook-env.sh"
    
    # Enviar script TypeScript
    Write-Host "`n   📤 Enviando script de automação..." -ForegroundColor Yellow
    scp -i $SshKey "./scripts/configure-evolution-webhook.ts" "${SshUser}@${VpsIp}:/tmp/webhook-automation/"
    
    # Compilar e executar no VPS
    Write-Host "`n🎬 Executando automação no VPS...`n" -ForegroundColor Green
    
    $executeScript = @"
#!/bin/bash
cd /tmp/webhook-automation

# Compilar TypeScript
echo '🔨 Compilando TypeScript...'
npx tsc configure-evolution-webhook.ts --outDir dist --esModuleInterop --skipLibCheck

# Executar
echo ''
echo '🤖 Iniciando automação Playwright...'
echo ''
node dist/configure-evolution-webhook.js

# Limpar
cd /
rm -rf /tmp/webhook-automation
echo ''
echo '🧹 Arquivos temporários removidos'
"@

    $tempExec = [System.IO.Path]::GetTempFileName() + ".sh"
    $executeScript | Out-File -FilePath $tempExec -Encoding UTF8
    
    scp -i $SshKey $tempExec "${SshUser}@${VpsIp}:/tmp/execute-webhook-automation.sh"
    ssh -i $SshKey "${SshUser}@${VpsIp}" "chmod +x /tmp/execute-webhook-automation.sh && bash /tmp/execute-webhook-automation.sh"
    
    # Limpar arquivos temporários locais
    Remove-Item $tempScript -Force
    Remove-Item $tempExec -Force
}

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "✅ AUTOMAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "`n📋 Próximos passos:" -ForegroundColor Yellow
Write-Host "   1. Teste enviando mensagem no WhatsApp" -ForegroundColor White
Write-Host "   2. IA deve responder automaticamente" -ForegroundColor White
Write-Host "   3. Verifique logs: docker logs evolution-api --tail 50 -f`n" -ForegroundColor White
