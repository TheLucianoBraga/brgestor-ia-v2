# 🚀 INSTRUÇÕES PARA SUBIR CÓDIGO PARA GITHUB E VPS

## 📋 PASSO 1: Criar Repositório no GitHub

1. Acesse: https://github.com/new
2. Preencha:
   - **Repository name:** `brgestor-ia-v2`
   - **Description:** Sistema BRGestor IA v2 - Gestão empresarial com IA integrada
   - **Private** (marque como privado por segurança)
3. **NÃO** marque "Initialize this repository with a README"
4. Clique em **"Create repository"**

---

## 📋 PASSO 2: Push para GitHub

Depois de criar o repositório, execute:

```powershell
# Definir branch principal como master
git branch -M master

# Adicionar remote (se ainda não adicionou)
git remote remove origin
git remote add origin https://github.com/theBragaCH/brgestor-ia-v2.git

# Push inicial
git push -u origin master
```

**OU se preferir SSH:**

```powershell
git remote remove origin
git remote add origin git@github.com:theBragaCH/brgestor-ia-v2.git
git push -u origin master
```

---

## 📋 PASSO 3: Deploy no VPS

Depois do push para o GitHub, execute no VPS:

```bash
# SSH no VPS
ssh root@72.60.14.172

# Navegar para diretório
cd /var/www

# Se já existe, fazer backup
if [ -d "brgestor-ia-v2" ]; then
  mv brgestor-ia-v2 brgestor-ia-v2-backup-$(date +%Y%m%d-%H%M%S)
fi

# Clonar repositório
git clone https://github.com/theBragaCH/brgestor-ia-v2.git
cd brgestor-ia-v2

# Instalar dependências
npm install

# Build
npm run build

# Configurar nginx (se necessário)
sudo cp nginx.conf /etc/nginx/sites-available/brgestor
sudo ln -sf /etc/nginx/sites-available/brgestor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔧 PASSO 4: Configurar Variáveis de Ambiente

Criar arquivo `.env` no VPS:

```bash
cd /var/www/brgestor-ia-v2
nano .env
```

Copie o conteúdo de `Sensivel/.env-complete` para o arquivo `.env` no VPS.

---

## ✅ RESUMO DOS COMANDOS

### No Windows (Local):
```powershell
# 1. Criar repositório no GitHub primeiro (via navegador)

# 2. Push
git branch -M master
git remote remove origin
git remote add origin https://github.com/theBragaCH/brgestor-ia-v2.git
git push -u origin master
```

### No VPS (Linux):
```bash
# 3. Deploy
ssh root@72.60.14.172
cd /var/www
git clone https://github.com/theBragaCH/brgestor-ia-v2.git
cd brgestor-ia-v2
npm install
npm run build
```

---

## 📝 NOTAS

- ✅ Commit já feito: `479081d`
- ✅ Edge Function `waha-api` já deployed no Supabase
- ⚠️ Lembre-se de configurar as variáveis de ambiente no VPS
- ⚠️ Verificar se nginx está configurado corretamente

---

## 🔍 TROUBLESHOOTING

### Se der erro "repository not found":
1. Certifique-se de ter criado o repositório no GitHub
2. Verifique se o nome está correto: `brgestor-ia-v2`
3. Use HTTPS em vez de SSH se não tiver configurado chaves SSH

### Se der erro de autenticação:
1. Use Personal Access Token em vez de senha
2. Gere em: https://github.com/settings/tokens
3. Selecione "repo" scope
4. Use o token como senha no git push

---

**Status atual:** ✅ Código commitado localmente  
**Próximo passo:** Criar repositório no GitHub e fazer push
