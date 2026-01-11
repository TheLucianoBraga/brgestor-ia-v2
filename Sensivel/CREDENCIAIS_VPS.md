# 🔐 DADOS SENSÍVEIS - VPS BR GESTOR

## 👤 CREDENCIAIS VPS
- **IP**: 72.60.14.172
- **Usuario Evolution**: evolution | **Senha**: evolution@2026
- **Usuario Typebot**: typebot | **Senha**: typebot@2026

## 🔑 CHAVES SSH
- **Arquivo**: deploy_key_brgestor
- **Localização**: /home/typebot/.ssh/authorized_keys

## 💾 DATABASES
- **PostgreSQL User**: typebot
- **PostgreSQL Password**: typebot_secure_2026
- **Database Typebot**: typebot
- **Database Evolution**: evolution

## 🔧 API KEYS
- **WAHA API Key**: waha_api_key_2026
- **Evolution API Key**: evolution_api_key_2026
- **NextAuth Secret**: your-super-secret-nextauth-key-change-this-32chars
- **Redis Password**: redis_secure_2026

## 📧 SMTP (Para configurar)
- **Host**: smtp.gmail.com
- **Port**: 587
- **User**: your-email@gmail.com
- **Password**: your-app-password

## 🚀 COMANDOS DE EMERGÊNCIA

### Conectar SSH
```bash
ssh -i ./deploy_key_brgestor typebot@72.60.14.172
```

### Comandos Stack SAAS
```bash
cd /home/typebot/saas-stack
./manage-saas.sh status
./manage-saas.sh with-waha
./manage-saas.sh logs
```

### Backup Database
```bash
docker exec typebot-db pg_dump -U typebot typebot > backup-$(date +%Y%m%d).sql
```

### Recuperação Completa
```bash
# 1. Parar tudo
./manage-saas.sh stop-waha
./manage-saas.sh stop-evolution

# 2. Reiniciar apenas Typebot
./manage-saas.sh typebot-only

# 3. Subir com WAHA
./manage-saas.sh with-waha
```

---
**⚠️ CONFIDENCIAL**: Não compartilhar estes dados
**Data**: 11 de Janeiro de 2026