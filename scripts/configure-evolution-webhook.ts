/**
 * 🤖 AUTOMAÇÃO - Configura Webhook no Evolution Manager
 * 
 * Este script usa Playwright para automatizar:
 * 1. Login no Manager (se necessário)
 * 2. Selecionar instância
 * 3. Configurar webhook com "Webhook By Events" ativado
 * 4. Salvar configuração
 */

import { chromium, Browser, Page } from 'playwright';

// Configurações
const CONFIG = {
  managerUrl: 'http://72.60.14.172:8081/manager',
  apiKey: 'evolution_api_key_2026',
  instanceName: 'tenant_a0000000',
  webhookUrl: 'https://uoogxqtbasbvcmtgxzcu.supabase.co/functions/v1/evolution-webhook',
  webhookEvents: ['MESSAGES_UPSERT'],
  timeout: 30000,
};

interface WebhookConfig {
  enabled: boolean;
  url: string;
  events: string[];
  webhookByEvents: boolean;
}

async function configureWebhook() {
  let browser: Browser | null = null;
  
  try {
    console.log('🚀 Iniciando automação Playwright...\n');
    
    // 1. Abrir navegador
    console.log('📱 Abrindo navegador headless...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
    });
    
    const page = await context.newPage();
    
    // 2. Acessar Manager
    console.log(`🌐 Acessando Manager: ${CONFIG.managerUrl}`);
    await page.goto(CONFIG.managerUrl, { 
      waitUntil: 'networkidle',
      timeout: CONFIG.timeout 
    });
    
    // 3. Verificar se precisa de autenticação
    await handleAuthentication(page);
    
    // 4. Aguardar carregamento da lista de instâncias
    console.log('⏳ Aguardando lista de instâncias...');
    await page.waitForTimeout(2000);
    
    // 5. Buscar a instância
    console.log(`🔍 Buscando instância: ${CONFIG.instanceName}`);
    const instanceFound = await findAndSelectInstance(page);
    
    if (!instanceFound) {
      throw new Error(`❌ Instância ${CONFIG.instanceName} não encontrada no Manager`);
    }
    
    // 6. Configurar webhook
    console.log('⚙️  Configurando webhook...');
    await configureWebhookSettings(page);
    
    // 7. Salvar configuração
    console.log('💾 Salvando configuração...');
    await saveConfiguration(page);
    
    // 8. Validar configuração
    console.log('✅ Validando configuração...');
    await validateConfiguration(page);
    
    console.log('\n🎉 SUCESSO! Webhook configurado automaticamente no Manager!');
    console.log('\n📋 Próximos passos:');
    console.log('   1. Envie mensagem no WhatsApp para testar');
    console.log('   2. Verifique logs: docker logs evolution-api --tail 50 -f');
    console.log('   3. IA deve responder automaticamente\n');
    
  } catch (error) {
    console.error('\n❌ ERRO na automação:');
    console.error(error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Navegador fechado.');
    }
  }
}

async function handleAuthentication(page: Page) {
  try {
    // Verificar se existe campo de API Key ou autenticação
    const apiKeyInput = await page.locator('input[name="apikey"], input[placeholder*="API"], input[type="password"]').first();
    
    if (await apiKeyInput.isVisible({ timeout: 5000 })) {
      console.log('🔐 Detectado campo de autenticação, inserindo API Key...');
      await apiKeyInput.fill(CONFIG.apiKey);
      
      const loginButton = await page.locator('button:has-text("Login"), button:has-text("Entrar"), button[type="submit"]').first();
      if (await loginButton.isVisible({ timeout: 2000 })) {
        await loginButton.click();
        await page.waitForTimeout(2000);
        console.log('✅ Login realizado');
      }
    } else {
      console.log('ℹ️  Manager sem autenticação (acesso público)');
    }
  } catch (error) {
    console.log('ℹ️  Sem autenticação necessária, continuando...');
  }
}

async function findAndSelectInstance(page: Page): Promise<boolean> {
  try {
    // Estratégias para encontrar a instância
    const strategies = [
      // Estratégia 1: Buscar por texto direto
      `text="${CONFIG.instanceName}"`,
      // Estratégia 2: Buscar em tabela
      `tr:has-text("${CONFIG.instanceName}")`,
      // Estratégia 3: Buscar em cards
      `div[class*="instance"]:has-text("${CONFIG.instanceName}")`,
      // Estratégia 4: Buscar por data-attribute
      `[data-instance="${CONFIG.instanceName}"]`,
    ];
    
    for (const selector of strategies) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 3000 })) {
        console.log(`✅ Instância encontrada usando: ${selector}`);
        
        // Clicar para expandir/selecionar
        await element.click();
        await page.waitForTimeout(1000);
        
        // Buscar botão de configuração/settings
        const settingsButton = page.locator('button:has-text("Config"), button:has-text("Settings"), button:has-text("Webhook"), [aria-label*="setting"]').first();
        if (await settingsButton.isVisible({ timeout: 3000 })) {
          await settingsButton.click();
          await page.waitForTimeout(1000);
        }
        
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('❌ Erro ao buscar instância:', error);
    return false;
  }
}

async function configureWebhookSettings(page: Page) {
  try {
    // 1. Buscar campo de URL do webhook
    const webhookUrlInput = page.locator('input[name*="webhook"], input[placeholder*="webhook"], input[placeholder*="URL"]').first();
    
    if (await webhookUrlInput.isVisible({ timeout: 5000 })) {
      console.log('   📝 Preenchendo URL do webhook...');
      await webhookUrlInput.clear();
      await webhookUrlInput.fill(CONFIG.webhookUrl);
    }
    
    // 2. Ativar toggle "Webhook Enabled"
    const enabledToggle = page.locator('input[type="checkbox"][name*="enabled"], label:has-text("Enable") input, label:has-text("Ativar") input').first();
    
    if (await enabledToggle.isVisible({ timeout: 3000 })) {
      const isChecked = await enabledToggle.isChecked();
      if (!isChecked) {
        console.log('   ✅ Ativando webhook...');
        await enabledToggle.check();
      }
    }
    
    // 3. CRÍTICO: Ativar "Webhook By Events" (checkbox separado)
    const webhookByEventsToggle = page.locator(
      'input[type="checkbox"][name*="byEvent"], input[type="checkbox"][name*="by-event"], label:has-text("By Event") input, label:has-text("Por Evento") input'
    ).first();
    
    if (await webhookByEventsToggle.isVisible({ timeout: 3000 })) {
      const isChecked = await webhookByEventsToggle.isChecked();
      if (!isChecked) {
        console.log('   🎯 Ativando "Webhook By Events" (CRÍTICO)...');
        await webhookByEventsToggle.check();
        await page.waitForTimeout(500);
      }
    } else {
      console.warn('   ⚠️  Campo "Webhook By Events" não encontrado na UI');
    }
    
    // 4. Selecionar eventos
    console.log('   📋 Selecionando eventos...');
    for (const event of CONFIG.webhookEvents) {
      const eventCheckbox = page.locator(`input[value="${event}"], label:has-text("${event}") input`).first();
      if (await eventCheckbox.isVisible({ timeout: 2000 })) {
        const isChecked = await eventCheckbox.isChecked();
        if (!isChecked) {
          await eventCheckbox.check();
        }
      }
    }
    
    console.log('   ✅ Configurações do webhook aplicadas');
    
  } catch (error) {
    console.error('❌ Erro ao configurar webhook:', error);
    throw error;
  }
}

async function saveConfiguration(page: Page) {
  try {
    // Buscar botão de salvar
    const saveButton = page.locator(
      'button:has-text("Save"), button:has-text("Salvar"), button:has-text("Apply"), button[type="submit"]'
    ).first();
    
    if (await saveButton.isVisible({ timeout: 5000 })) {
      await saveButton.click();
      await page.waitForTimeout(2000);
      
      // Aguardar confirmação (toast/mensagem)
      const successMessage = page.locator('text=/saved|success|salvo|sucesso/i').first();
      if (await successMessage.isVisible({ timeout: 5000 })) {
        console.log('   ✅ Configuração salva com sucesso');
      }
    } else {
      console.warn('   ⚠️  Botão salvar não encontrado, configuração pode ser automática');
    }
  } catch (error) {
    console.warn('   ⚠️  Não foi possível confirmar salvamento:', error);
  }
}

async function validateConfiguration(page: Page) {
  try {
    await page.waitForTimeout(1000);
    
    // Verificar se a URL está preenchida
    const webhookUrlInput = page.locator('input[name*="webhook"], input[placeholder*="webhook"]').first();
    if (await webhookUrlInput.isVisible({ timeout: 3000 })) {
      const value = await webhookUrlInput.inputValue();
      if (value === CONFIG.webhookUrl) {
        console.log('   ✅ URL do webhook confirmada');
      }
    }
    
    // Verificar se "Webhook By Events" está marcado
    const webhookByEventsToggle = page.locator('input[type="checkbox"][name*="byEvent"]').first();
    if (await webhookByEventsToggle.isVisible({ timeout: 2000 })) {
      const isChecked = await webhookByEventsToggle.isChecked();
      if (isChecked) {
        console.log('   ✅ "Webhook By Events" está ATIVADO');
      } else {
        console.warn('   ⚠️  "Webhook By Events" NÃO está ativado (pode ser bug da UI)');
      }
    }
    
  } catch (error) {
    console.warn('   ⚠️  Não foi possível validar completamente:', error);
  }
}

// Executar
if (require.main === module) {
  configureWebhook()
    .then(() => {
      console.log('\n✅ Script finalizado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script falhou:', error);
      process.exit(1);
    });
}

export { configureWebhook };
