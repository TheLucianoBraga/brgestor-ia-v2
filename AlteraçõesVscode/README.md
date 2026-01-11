# 📁 Sistema de Organização de Documentação

Este sistema organiza automaticamente todos os arquivos `.md` criados no projeto em pastas por data.

---

## 🔥 ÚLTIMA ATUALIZAÇÃO: 11/01/2026

### 🔧 **Correção Crítica: IA WhatsApp Não Respondia**
**Status:** ✅ CORRIGIDO | **Impacto:** CRÍTICO

A IA não estava respondendo mensagens devido a 6 bloqueios no código. Correções aplicadas em [supabase/functions/waha-webhook/index.ts](../supabase/functions/waha-webhook/index.ts).

📁 **Documentação completa:** [11-01-2026/](11-01-2026/)
- [RESUMO_EXECUTIVO.md](11-01-2026/RESUMO_EXECUTIVO.md)
- [COMANDOS_RAPIDOS.md](11-01-2026/COMANDOS_RAPIDOS.md)
- [GUIA_DEPLOY_IA_WHATSAPP.md](11-01-2026/GUIA_DEPLOY_IA_WHATSAPP.md)

🚀 **Deploy rápido:**
```powershell
supabase functions deploy waha-webhook
```

---

## 📂 Estrutura

```
AlteraçõesVscode/
├── 10-01-2026/
│   ├── COMO_VER_LOGS_EDGE_FUNCTION.md
│   ├── CORRIGIR_CADASTRO_CLIENTE.md
│   └── ...
├── 11-01-2026/
│   ├── CORRECAO_IA_WHATSAPP.md ⭐ NOVO
│   ├── GUIA_DEPLOY_IA_WHATSAPP.md ⭐ NOVO
│   ├── COMANDOS_RAPIDOS.md ⭐ NOVO
│   ├── RESUMO_EXECUTIVO.md ⭐ NOVO
│   └── verificar-e-ativar-ia-whatsapp.sql ⭐ NOVO
└── ...
```

## 🚀 Como Usar

### Opção 1: Script Automático (Recomendado)

Execute o script PowerShell na raiz do projeto:

```powershell
.\organize-md-files.ps1
```

O script irá:
- ✓ Identificar todos os arquivos `.md` na raiz
- ✓ Criar a pasta com a data de hoje (formato: DD-MM-YYYY)
- ✓ Mover todos os arquivos para a pasta correspondente
- ✓ Exibir relatório do que foi movido

### Opção 2: Manual

```powershell
# Criar pasta da data atual
$data = Get-Date -Format "dd-MM-yyyy"
New-Item -ItemType Directory -Path "AlteraçõesVscode\$data" -Force

# Mover arquivos .md
Move-Item -Path "*.md" -Destination "AlteraçõesVscode\$data\" -Force
```

## 📋 Boas Práticas

1. **Execute regularmente**: Rode o script ao final do dia ou quando tiver vários arquivos `.md` na raiz
2. **Mantenha a raiz limpa**: Arquivos de documentação devem ser movidos para evitar poluição visual
3. **README.md**: Este arquivo permanece na raiz (você pode adicionar uma exceção no script se necessário)

## ⚙️ Personalização

Para excluir arquivos específicos (como README.md principal), edite o script:

```powershell
$MdFiles = Get-ChildItem -Path $ProjectRoot -Filter "*.md" -File | 
    Where-Object { $_.Name -ne "README.md" }
```

## 📅 Formato de Data

O formato usado é `DD-MM-YYYY` (dia-mês-ano), por exemplo:
- 10-01-2026 (10 de janeiro de 2026)
- 25-12-2025 (25 de dezembro de 2025)

---

**Última atualização**: 10 de janeiro de 2026
