# 🎯 BRGestor IA - Resumo Completo do Deploy

**Data**: 10/01/2026  
**Status**: Build em andamento (aguardar ~3-5 min)

---

## 🔑 Credenciais e Acessos

### VPS
- **IP**: 72.60.14.172
- **Sistema**: Ubuntu 24.04.3 LTS
- **SSH Root**: `ssh root@72.60.14.172`
- **SSH Brgestor**: `ssh brgestor@72.60.14.172 -i deploy_key_brgestor`
- **Senha brgestor**: BRGestor2026!

### GitHub
- **Repositório**: https://github.com/TheLucianoBraga/brgestor-ia-v2
- **Branch**: master
- **Visibilidade**: Público (tornar privado depois)
- **Usuário**: TheLucianoBraga

### Chaves SSH
- **Privada**: `deploy_key_brgestor` (no PC local)
- **Pública**: `deploy_key_brgestor.pub` (instalada na VPS)
- **Localização VPS**: `/home/brgestor/.ssh/authorized_keys`

---

## ✅ O que já está configurado

1. ✓ Repositório GitHub criado e código enviado
2. ✓ Arquivos Docker, Caddy e CI/CD criados
3. ✓ VPS configurada (usuário, firewall, chaves SSH)
4. ✓ Docker instalado e rodando
5. ✓ Repositório clonado em `/home/brgestor/brgestor-ia-v2`
6. ✓ Build em andamento (iniciado às 21:40 UTC)

---

## 📋 Comandos úteis

### Verificar build
```bash
ssh root@72.60.14.172 "su - brgestor -c 'cd ~/brgestor-ia-v2 && docker compose ps'"
```

### Ver logs do build
```bash
ssh root@72.60.14.172 "su - brgestor -c 'cd ~/brgestor-ia-v2 && docker compose logs -f'"
```

### Subir containers (após build)
```bash
ssh root@72.60.14.172 "su - brgestor -c 'cd ~/brgestor-ia-v2 && docker compose up -d'"
```

### Status dos containers
```bash
ssh root@72.60.14.172 "su - brgestor -c 'cd ~/brgestor-ia-v2 && docker compose ps'"
```

### Reiniciar tudo
```bash
ssh root@72.60.14.172 "su - brgestor -c 'cd ~/brgestor-ia-v2 && docker compose restart'"
```

### Parar tudo
```bash
ssh root@72.60.14.172 "su - brgestor -c 'cd ~/brgestor-ia-v2 && docker compose down'"
```

### Ver logs em tempo real
```bash
ssh brgestor@72.60.14.172 -i deploy_key_brgestor
cd ~/brgestor-ia-v2
docker compose logs -f
```

---

## 🚀 Próximos passos (após build completar)

### 1. Verificar se build completou (~5 min)
```bash
ssh root@72.60.14.172 "su - brgestor -c 'cd ~/brgestor-ia-v2 && docker compose ps'"
```

Se mostrar containers rodando = OK! Se não:

```bash
ssh root@72.60.14.172 "su - brgestor -c 'cd ~/brgestor-ia-v2 && docker compose up -d'"
```

### 2. Testar acesso
```
http://72.60.14.172
```

### 3. Configurar GitHub Secrets para deploy automático

Acesse: https://github.com/TheLucianoBraga/brgestor-ia-v2/settings/secrets/actions

Crie os seguintes secrets:

**SSH_PRIVATE_KEY**
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBSzGJPwQr21u2zrUxmErFtM1LoEkgMYmRoazCR9RVoYgAAAJjfBv6e3wb+
ngAAAAtzc2gtZWQyNTUxOQAAACBSzGJPwQr21u2zrUxmErFtM1LoEkgMYmRoazCR9RVoYg
AAAEDK+chMUuuOMycElkpBMXWEhwjRtUVwOpAGJYRLzjtCf1LMYk/BCvbW7bOtTGYSsW0z
UugSSAxiZGhrMJH1FWhiAAAAE2RlcGxveS1rZXktYnJnZXN0b3IBAg==
-----END OPENSSH PRIVATE KEY-----
```

**SSH_USER**
```
brgestor
```

**SSH_HOST**
```
72.60.14.172
```

**SSH_PORT**
```
22
```

### 4. Tornar repositório privado
```powershell
gh repo edit TheLucianoBraga/brgestor-ia-v2 --visibility private --accept-visibility-change-consequences
```

### 5. Configurar domínio (quando quiser)

**No Caddyfile** (editar localmente e fazer commit):
```
seu-dominio.com {
  reverse_proxy brgestor:80
  encode gzip
}
```

**No DNS** (seu provedor):
- Tipo: A
- Nome: @ (ou subdomínio)
- Valor: 72.60.14.172
- TTL: 300

Após commit + push → deploy automático!

---

## 🔧 Troubleshooting

### Container não sobe
```bash
ssh root@72.60.14.172 "su - brgestor -c 'cd ~/brgestor-ia-v2 && docker compose logs'"
```

### Limpar tudo e recomeçar
```bash
ssh root@72.60.14.172 "su - brgestor -c 'cd ~/brgestor-ia-v2 && docker compose down && docker system prune -af && docker compose build --no-cache && docker compose up -d'"
```

### Ver uso de recursos
```bash
ssh root@72.60.14.172 "free -h && df -h && docker ps"
```

### Rebuild sem cache
```bash
ssh root@72.60.14.172 "su - brgestor -c 'cd ~/brgestor-ia-v2 && docker compose build --no-cache --pull'"
```

---

## 📁 Estrutura de arquivos na VPS

```
/home/brgestor/
└── brgestor-ia-v2/
    ├── .env                    # Variáveis de ambiente
    ├── .env.example            # Template
    ├── docker-compose.yml      # Orquestração
    ├── Dockerfile              # Build da app
    ├── Caddyfile               # Proxy + SSL
    ├── .github/
    │   └── workflows/
    │       └── deploy.yml      # CI/CD automático
    ├── scripts/
    │   ├── deploy.sh           # Deploy manual
    │   └── remote_deploy.sh    # Deploy via Actions
    └── src/                    # Código da aplicação
```

---

## 🎯 Deploy Automático (após configurar Secrets)

**Como funciona:**
1. Você faz alterações no código localmente
2. Commit + push para branch `master`
3. GitHub Actions executa automaticamente
4. Conecta na VPS via SSH
5. Faz pull do código
6. Rebuild dos containers
7. Restart automático

**Testar:**
```bash
# No projeto local
echo "test" >> README.md
git add .
git commit -m "test deploy"
git push origin master

# Acompanhar: https://github.com/TheLucianoBraga/brgestor-ia-v2/actions
```

---

## 📊 Monitoramento

### Ver todos os logs
```bash
ssh brgestor@72.60.14.172 -i deploy_key_brgestor
cd ~/brgestor-ia-v2
docker compose logs -f --tail=100
```

### Ver apenas erros
```bash
docker compose logs | grep -i error
```

### Status do sistema
```bash
ssh root@72.60.14.172 "htop" # se instalado
ssh root@72.60.14.172 "top -n 1"
```

---

## ⚠️ Importante

1. **Backup** - Configure backups automáticos da VPS
2. **Monitoramento** - Memória estava em 86%, monitore após containers subirem
3. **Segurança** - Nunca commite `.env` ou chaves privadas
4. **Updates** - VPS pede restart após updates, é normal

---

## 🆘 Suporte Rápido

**Container não responde:**
```bash
ssh root@72.60.14.172 "su - brgestor -c 'cd ~/brgestor-ia-v2 && docker compose restart'"
```

**VPS lenta/travada:**
```bash
ssh root@72.60.14.172 "reboot"
# Aguardar 2-3 min e reconectar
```

**Erro no build:**
```bash
ssh root@72.60.14.172 "su - brgestor -c 'cd ~/brgestor-ia-v2 && docker compose down && docker system prune -af'"
# Depois rode build novamente
```

---

## ✅ Checklist Final

- [ ] Build completou (verificar com `docker compose ps`)
- [ ] Site acessível em http://72.60.14.172
- [ ] GitHub Secrets configurados
- [ ] Repositório tornado privado
- [ ] Domínio configurado (opcional)
- [ ] Deploy automático testado
- [ ] Backup configurado
- [ ] Documentação salva

---

**Próximo check**: Aguardar ~3 minutos e verificar se containers estão rodando!

**Comando de verificação:**
```bash
ssh root@72.60.14.172 "su - brgestor -c 'cd ~/brgestor-ia-v2 && docker compose ps'"
```

Se mostrar `Up` = **SUCESSO!** 🎉
