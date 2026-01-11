# 🚀 Próximos Passos - Deploy VPS

**Data**: 10-01-2026

## ✅ O que já foi feito:

1. ✓ Todos os arquivos de deploy criados e enviados para o GitHub
2. ✓ Chaves SSH de deploy geradas
3. ✓ Repositório configurado: https://github.com/TheLucianoBraga/brgestor-ia-v2

## 📋 O que você precisa fazer agora:

### 1. Configurar Secrets no GitHub

Acesse: https://github.com/TheLucianoBraga/brgestor-ia-v2/settings/secrets/actions

Clique em **"New repository secret"** e adicione:

**Secret 1: SSH_PRIVATE_KEY**
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBSzGJPwQr21u2zrUxmErFtM1LoEkgMYmRoazCR9RVoYgAAAJjfBv6e3wb+
ngAAAAtzc2gtZWQyNTUxOQAAACBSzGJPwQr21u2zrUxmErFtM1LoEkgMYmRoazCR9RVoYg
AAAEDK+chMUuuOMycElkpBMXWEhwjRtUVwOpAGJYRLzjtCf1LMYk/BCvbW7bOtTGYSsW0z
UugSSAxiZGhrMJH1FWhiAAAAE2RlcGxveS1rZXktYnJnZXN0b3IBAg==
-----END OPENSSH PRIVATE KEY-----
```

**Secret 2: SSH_USER**
```
brgestor
```

**Secret 3: SSH_HOST**
```
72.60.14.172
```

**Secret 4: SSH_PORT**
```
22
```

### 2. Conectar na VPS e configurar

```bash
# Conecte via SSH como root
ssh root@72.60.14.172

# Criar usuário brgestor
adduser brgestor
# Digite uma senha forte quando solicitado
usermod -aG sudo brgestor

# Instalar Docker
apt update && apt upgrade -y
apt install -y ca-certificates curl gnupg lsb-release
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Adicionar usuário brgestor ao grupo docker
usermod -aG docker brgestor

# Verificar instalação
docker --version
docker compose version

# Criar swap (opcional, mas recomendado)
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab

# Configurar firewall
apt install -y ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 3. Configurar SSH para o usuário brgestor

```bash
# Mudar para usuário brgestor
su - brgestor

# Criar diretório SSH
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Adicionar chave pública (cole a chave abaixo)
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFLMYk/BCvbW7bOtTGYSsW0zUugSSAxiZGhrMJH1FWhi deploy-key-brgestor" >> ~/.ssh/authorized_keys

chmod 600 ~/.ssh/authorized_keys
```

### 4. Clonar repositório e fazer primeiro deploy

```bash
# Ainda como usuário brgestor
cd ~

# Clonar repositório
git clone https://github.com/TheLucianoBraga/brgestor-ia-v2.git /home/brgestor/brgestor-ia-v2

cd /home/brgestor/brgestor-ia-v2

# Criar arquivo .env
cp .env.example .env

# Editar .env com suas configurações
nano .env
# Altere BRGESTOR_DOMAIN para seu domínio real

# Testar deploy em porta 8080 primeiro (seguro)
# Edite docker-compose.yml antes se necessário
nano docker-compose.yml
# Altere a linha "80:80" para "8080:80" se quiser testar sem conflitar com WAHA

# Build e subir containers
docker compose up -d --build

# Ver logs
docker compose logs -f

# Testar no navegador
# http://72.60.14.172:8080
```

### 5. Configurar DNS (quando estiver pronto para produção)

No seu provedor DNS, adicione:
- **Tipo**: A
- **Nome**: brgestor (ou o subdomínio que quiser)
- **Valor**: 72.60.14.172
- **TTL**: 300

### 6. Atualizar Caddyfile com domínio real

No projeto local, edite o arquivo `Caddyfile`:
```
brgestor.seudominio.com {
  reverse_proxy brgestor:80
  encode gzip
}
```

Depois commit e push:
```bash
git add Caddyfile
git commit -m "Update domain in Caddyfile"
git push origin master
```

O GitHub Actions vai fazer deploy automático!

### 7. Mudar para portas 80/443 (produção)

Quando estiver tudo funcionando em 8080, volte o `docker-compose.yml` para:
```yaml
ports:
  - "80:80"
  - "443:443"
```

E rode:
```bash
docker compose up -d
```

O Caddy vai obter certificados SSL automaticamente via Let's Encrypt!

## 📝 Comandos úteis na VPS

```bash
# Ver logs
docker compose logs -f

# Reiniciar serviços
docker compose restart

# Parar tudo
docker compose down

# Deploy manual
cd /home/brgestor/brgestor-ia-v2
./scripts/deploy.sh

# Ver containers rodando
docker ps

# Limpeza de imagens antigas
docker system prune -a
```

## ⚠️ Importante

- Nunca commit o arquivo `.env` com senhas
- Guarde as chaves SSH em local seguro
- Faça backup regular da VPS
- Monitore o uso de memória (sua VPS estava em 83%)

## 🎯 Deploy Automático

Após configurar tudo, qualquer push para a branch `master` vai:
1. Disparar GitHub Actions
2. Conectar na VPS via SSH
3. Fazer pull do código
4. Rebuild dos containers
5. Restart automático

## 📞 Suporte

Se algo der errado:
1. Verifique os logs: `docker compose logs -f`
2. Verifique se DNS está propagado: `nslookup seu-dominio.com`
3. Teste conectividade SSH: `ssh brgestor@72.60.14.172`
4. Verifique GitHub Actions: https://github.com/TheLucianoBraga/brgestor-ia-v2/actions

---

**Gerado em**: 10/01/2026
**Próxima etapa**: Configurar Secrets no GitHub
