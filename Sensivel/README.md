# 🔐 PASTA SENSÍVEL - ÍNDICE DE ARQUIVOS CONFIDENCIAIS

⚠️ **ATENÇÃO**: Esta pasta contém dados sensíveis e credenciais. **NÃO COMPARTILHAR** publicamente.

## 📋 ARQUIVOS ORGANIZADOS

### 🔑 CREDENCIAIS E CHAVES
- [`CREDENCIAIS_VPS.md`](CREDENCIAIS_VPS.md) - Senhas, usuários e comandos da VPS
- [`deploy_key_brgestor`](deploy_key_brgestor) - Chave SSH privada
- [`deploy_key_brgestor.pub`](deploy_key_brgestor.pub) - Chave SSH pública

### ⚙️ CONFIGURAÇÕES DE AMBIENTE
- [`.env`](.env) - Variáveis de ambiente principal
- [`.env-complete`](.env-complete) - Configurações completas com todas as variáveis
- [`.env.example`](.env.example) - Exemplo de configuração
- [`.env.local`](.env.local) - Configurações locais

### 🛠️ SCRIPTS DE GERENCIAMENTO
- [`manage-saas.sh`](manage-saas.sh) - Script de controle da infraestrutura SaaS
- [`vps-deploy.sh`](vps-deploy.sh) - Script de deploy na VPS

### 📖 DOCUMENTAÇÕES CONFIDENCIAIS
- [`DEPLOY.md`](DEPLOY.md) - Procedimentos de deploy com credenciais
- [`INFRAESTRUTURA_SAAS_STATUS.md`](INFRAESTRUTURA_SAAS_STATUS.md) - Status completo da infraestrutura
- [`VPS_DOCUMENTACAO_COMPLETA.md`](VPS_DOCUMENTACAO_COMPLETA.md) - Documentação completa da VPS
- [`MELHORIAS_RELATORIOS.md`](MELHORIAS_RELATORIOS.md) - Melhorias e configurações

## 🎯 ACESSO RÁPIDO

### 🚀 Conectar à VPS
```bash
ssh -i ./deploy_key_brgestor typebot@72.60.14.172
```

### 🔧 Gerenciar Stack SaaS
```bash
cd /home/typebot/saas-stack
./manage-saas.sh status
./manage-saas.sh with-waha
```

### 🌐 URLs de Acesso
- **Typebot Builder**: http://72.60.14.172:3002
- **Typebot Viewer**: http://72.60.14.172:3001
- **WAHA API**: http://72.60.14.172:3000
- **Evolution API**: http://72.60.14.172:8081

## 🔒 SEGURANÇA

- ✅ Pasta criada automaticamente pelo script `organize-md-files.ps1`
- ✅ Arquivos detectados automaticamente por padrões sensíveis
- ✅ Separação clara entre arquivos públicos e confidenciais
- ⚠️ **NUNCA** adicionar esta pasta ao controle de versão público

---
**Data de Organização**: 11 de Janeiro de 2026  
**Script**: `organize-md-files.ps1`  
**Status**: 13 arquivos sensíveis organizados