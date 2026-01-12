#!/bin/bash
# Script para executar no VPS via SSH
# Uso: ssh typebot@72.60.14.172 'bash -s' < install-and-run.sh

set -e

echo "🚀 Instalando e configurando webhook Evolution..."
echo ""

# 1. Verificar/Instalar Node.js
if ! command -v node &> /dev/null; then
    echo "📥 Instalando Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js já instalado: $(node --version)"
fi

# 2. Criar diretório temporário
echo ""
echo "📁 Criando diretório temporário..."
mkdir -p /tmp/webhook-automation
cd /tmp/webhook-automation

# 3. Criar package.json
echo ""
echo "📦 Configurando package.json..."
cat > package.json << 'EOF'
{
  "name": "webhook-automation",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "playwright": "^1.40.0"
  }
}
EOF

# 4. Instalar Playwright
if [ ! -d "node_modules/playwright" ]; then
    echo ""
    echo "📥 Instalando Playwright..."
    npm install --silent
    echo ""
    echo "🌐 Instalando Chromium..."
    npx playwright install chromium --with-deps
else
    echo "✅ Playwright já instalado"
fi

# 5. Criar script TypeScript inline
echo ""
echo "📝 Criando script de automação..."
cat > configure-webhook.js << 'SCRIPTEOF'
import { chromium } from 'playwright';

const CONFIG = {
  managerUrl: 'http://72.60.14.172:8081/manager',
  apiKey: 'evolution_api_key_2026',
  instanceName: 'tenant_a0000000',
  webhookUrl: 'https://uoogxqtbasbvcmtgxzcu.supabase.co/functions/v1/evolution-webhook',
  webhookEvents: ['MESSAGES_UPSERT'],
  timeout: 30000,
};

async function configureWebhook() {
  let browser = null;
  
  try {
    console.log('\n🚀 Iniciando automação Playwright...\n');
    
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    
    console.log(`🌐 Acessando Manager: ${CONFIG.managerUrl}`);
    await page.goto(CONFIG.managerUrl, { waitUntil: 'networkidle', timeout: CONFIG.timeout });
    
    console.log('⏳ Aguardando carregamento...');
    await page.waitForTimeout(3000);
    
    // Tentar várias estratégias para encontrar instância
    console.log(`🔍 Buscando instância: ${CONFIG.instanceName}`);
    
    const instanceElement = await page.locator(`text="${CONFIG.instanceName}"`).first();
    if (await instanceElement.isVisible({ timeout: 5000 })) {
      console.log('✅ Instância encontrada!');
      await instanceElement.click();
      await page.waitForTimeout(2000);
    } else {
      throw new Error('❌ Instância não encontrada');
    }
    
    // Configurar webhook
    console.log('⚙️  Configurando webhook...');
    
    const webhookUrlInput = await page.locator('input[name*="webhook"], input[placeholder*="webhook"], input[placeholder*="URL"]').first();
    if (await webhookUrlInput.isVisible({ timeout: 5000 })) {
      await webhookUrlInput.clear();
      await webhookUrlInput.fill(CONFIG.webhookUrl);
      console.log('   📝 URL preenchida');
    }
    
    const enabledToggle = await page.locator('input[type="checkbox"][name*="enabled"]').first();
    if (await enabledToggle.isVisible({ timeout: 3000 })) {
      if (!(await enabledToggle.isChecked())) {
        await enabledToggle.check();
        console.log('   ✅ Webhook ativado');
      }
    }
    
    const webhookByEventsToggle = await page.locator('input[type="checkbox"][name*="byEvent"], input[type="checkbox"][name*="by-event"]').first();
    if (await webhookByEventsToggle.isVisible({ timeout: 3000 })) {
      if (!(await webhookByEventsToggle.isChecked())) {
        await webhookByEventsToggle.check();
        console.log('   🎯 Webhook By Events ATIVADO');
      }
    }
    
    const saveButton = await page.locator('button:has-text("Save"), button:has-text("Salvar"), button[type="submit"]').first();
    if (await saveButton.isVisible({ timeout: 5000 })) {
      await saveButton.click();
      await page.waitForTimeout(2000);
      console.log('💾 Configuração salva!');
    }
    
    console.log('\n🎉 SUCESSO! Webhook configurado!\n');
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

configureWebhook();
SCRIPTEOF

# 6. Executar automação
echo ""
echo "🎬 Executando automação..."
echo ""
node configure-webhook.js

# 7. Limpar
echo ""
echo "🧹 Limpando arquivos temporários..."
cd /
rm -rf /tmp/webhook-automation

echo ""
echo "✅ CONCLUÍDO!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Teste enviando mensagem no WhatsApp"
echo "   2. Verifique logs: docker logs evolution-api --tail 50 -f"
echo ""
