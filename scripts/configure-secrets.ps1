# 🔑 Script para Configurar Secrets no Supabase
# Execute este script após fazer deploy das Edge Functions

$PROJECT_REF = "uoogxqtbasbvcmtgxzcu"

Write-Host "🔐 Configurando Supabase Secrets..." -ForegroundColor Cyan
Write-Host ""

# Verificar se Supabase CLI está instalado
try {
    $version = npx supabase --version
    Write-Host "✅ Supabase CLI encontrado: $version" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI não encontrado. Instalando..." -ForegroundColor Red
    npm install -g supabase
}

Write-Host ""
Write-Host "📋 Secrets que serão configurados:" -ForegroundColor Yellow
Write-Host "  1. WAHA_API_KEY - Chave de autenticação do WAHA"
Write-Host "  2. WAHA_API_URL - URL do servidor WAHA"
Write-Host "  3. VPS_IP - IP do servidor VPS"
Write-Host ""

# Prompt para confirmação
$confirm = Read-Host "Deseja continuar? (s/n)"
if ($confirm -ne 's' -and $confirm -ne 'S') {
    Write-Host "❌ Operação cancelada." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "🔧 Configurando secrets..." -ForegroundColor Cyan

# WAHA_API_KEY
Write-Host ""
Write-Host "1️⃣ WAHA_API_KEY" -ForegroundColor Yellow
$WAHA_API_KEY = Read-Host "Digite a WAHA_API_KEY (deixe em branco para usar padrão)"
if ([string]::IsNullOrWhiteSpace($WAHA_API_KEY)) {
    $WAHA_API_KEY = "BragaDIGITal_OBrabo_1996_2025Br"
    Write-Host "   Usando padrão: $WAHA_API_KEY" -ForegroundColor Gray
}

try {
    npx supabase secrets set WAHA_API_KEY=$WAHA_API_KEY --project-ref $PROJECT_REF
    Write-Host "✅ WAHA_API_KEY configurado" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao configurar WAHA_API_KEY: $_" -ForegroundColor Red
}

# VPS_IP
Write-Host ""
Write-Host "2️⃣ VPS_IP" -ForegroundColor Yellow
$VPS_IP = Read-Host "Digite o VPS_IP (deixe em branco para usar padrão)"
if ([string]::IsNullOrWhiteSpace($VPS_IP)) {
    $VPS_IP = "72.60.14.172"
    Write-Host "   Usando padrão: $VPS_IP" -ForegroundColor Gray
}

try {
    npx supabase secrets set VPS_IP=$VPS_IP --project-ref $PROJECT_REF
    Write-Host "✅ VPS_IP configurado" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao configurar VPS_IP: $_" -ForegroundColor Red
}

# WAHA_API_URL (construído automaticamente)
Write-Host ""
Write-Host "3️⃣ WAHA_API_URL" -ForegroundColor Yellow
$WAHA_API_URL = "http://${VPS_IP}:3000"
Write-Host "   Usando: $WAHA_API_URL" -ForegroundColor Gray

try {
    npx supabase secrets set WAHA_API_URL=$WAHA_API_URL --project-ref $PROJECT_REF
    Write-Host "✅ WAHA_API_URL configurado" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao configurar WAHA_API_URL: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Configuração concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Próximos passos:" -ForegroundColor Cyan
Write-Host "  1. Fazer deploy das Edge Functions:" -ForegroundColor White
Write-Host "     npx supabase functions deploy --project-ref $PROJECT_REF" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Testar a função waha-create-session" -ForegroundColor White
Write-Host ""
Write-Host "  3. Verificar logs:" -ForegroundColor White
Write-Host "     npx supabase functions logs waha-create-session --project-ref $PROJECT_REF" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  IMPORTANTE: As credenciais foram ocultadas nos logs por segurança!" -ForegroundColor Yellow
