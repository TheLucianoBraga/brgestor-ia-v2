# 🌐 CONFIGURAR DOMÍNIO NA VPS - GUIA COMPLETO

**Data**: 11 de Janeiro de 2026  
**VPS IP**: 72.60.14.172  
**Sistema**: Ubuntu 24.04.3 LTS

---

## 📋 PRÉ-REQUISITOS

- [ ] Domínio registrado (ex: `brgestor.com.br`)
- [ ] Acesso ao painel DNS do domínio (Registro.br, Cloudflare, etc)
- [ ] Acesso SSH à VPS
- [ ] Caddy instalado e rodando na VPS

---

## 🎯 PASSO 1: CONFIGURAR DNS

### Opção A: DNS Direto (Registro.br, GoDaddy, etc)

Acesse o painel do seu provedor de domínio e adicione os seguintes registros:

```
Tipo: A
Nome: @
Valor: 72.60.14.172
TTL: 3600

Tipo: A
Nome: www
Valor: 72.60.14.172
TTL: 3600
```

### Opção B: Cloudflare (RECOMENDADO)

**Vantagens**:
- ✅ Proxy e proteção DDoS
- ✅ Cache automático
- ✅ SSL/TLS flexível
- ✅ Analytics gratuito

**Configuração**:

1. Criar conta em https://dash.cloudflare.com
2. Adicionar domínio (Add a Site)
3. Escolher plano FREE
4. Cloudflare fornecerá nameservers (ex: `amy.ns.cloudflare.com`)
5. Trocar nameservers no Registro.br para os do Cloudflare
6. Adicionar registros DNS no Cloudflare:

```
Type: A
Name: @
Content: 72.60.14.172
Proxy: ✅ Proxied (nuvem laranja)
TTL: Auto

Type: A
Name: www
Content: 72.60.14.172
Proxy: ✅ Proxied (nuvem laranja)
TTL: Auto
```

7. Configurar SSL/TLS:
   - SSL/TLS → Overview → SSL/TLS Encryption Mode: **Full (strict)**
   - Edge Certificates → Always Use HTTPS: **ON**

---

## 🔧 PASSO 2: CONFIGURAR CADDY NA VPS

### 2.1. Conectar na VPS

```bash
# Do seu computador local
ssh -i ./Sensivel/deploy_key_brgestor brgestor@72.60.14.172
```

### 2.2. Editar Caddyfile

```bash
cd ~/brgestor-ia-v2
nano Caddyfile
```

### 2.3. Configuração Caddy com Domínio

#### Versão 1: HTTP + HTTPS Automático (RECOMENDADO)

```caddy
# Caddyfile com SSL automático
brgestor.com.br, www.brgestor.com.br {
    # Proxy reverso para o container
    reverse_proxy brgestor:80
    
    # Compressão Gzip
    encode gzip
    
    # Headers de segurança
    header {
        # Segurança
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        
        # Cache para assets estáticos
        /assets/* {
            Cache-Control "public, max-age=31536000, immutable"
        }
        
        # Sem cache para HTML
        /*.html {
            Cache-Control "no-cache, no-store, must-revalidate"
        }
    }
    
    # Logs
    log {
        output file /var/log/caddy/access.log
        format json
    }
}
```

#### Versão 2: Apenas HTTP (Teste Inicial)

```caddy
# Caddyfile - HTTP apenas para teste
:80 {
    reverse_proxy brgestor:80
    encode gzip
    
    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
    }
}
```

### 2.4. Atualizar docker-compose.yml

```bash
nano docker-compose.yml
```

Verificar se o Caddy está configurado corretamente:

```yaml
services:
  caddy:
    image: caddy:2-alpine
    container_name: brgestor-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
      - caddy_logs:/var/log/caddy
    networks:
      - proxy
    depends_on:
      - brgestor

volumes:
  caddy_data:
  caddy_config:
  caddy_logs:
```

### 2.5. Reiniciar Caddy

```bash
# Rebuild e restart dos containers
docker-compose down
docker-compose up -d --build

# Verificar logs do Caddy
docker logs brgestor-caddy -f
```

---

## 🔍 PASSO 3: VERIFICAR CONFIGURAÇÃO

### 3.1. Testar DNS

```bash
# Do seu PC local
nslookup brgestor.com.br
nslookup www.brgestor.com.br

# Deve retornar: 72.60.14.172
```

### 3.2. Testar HTTP

```bash
# Testar acesso HTTP
curl -I http://brgestor.com.br
curl -I http://www.brgestor.com.br

# Testar HTTPS (se configurado)
curl -I https://brgestor.com.br
```

### 3.3. Verificar SSL (se Caddy gerando certificados)

```bash
# Ver logs do Caddy buscando certificado
docker logs brgestor-caddy | grep -i "certificate"
docker logs brgestor-caddy | grep -i "acme"

# Verificar certificados gerados
docker exec brgestor-caddy ls -la /data/caddy/certificates/
```

---

## 🚨 TROUBLESHOOTING

### Erro: "DNS_PROBE_FINISHED_NXDOMAIN"
**Problema**: DNS não propagou ainda  
**Solução**: Aguardar até 48h (geralmente 1-2 horas)
```bash
# Verificar propagação mundial
https://www.whatsmydns.net/#A/brgestor.com.br
```

### Erro: "ERR_CONNECTION_TIMED_OUT"
**Problema**: Firewall bloqueando portas  
**Solução**: Abrir portas 80 e 443
```bash
ssh root@72.60.14.172
ufw allow 80/tcp
ufw allow 443/tcp
ufw status
```

### Erro: "Caddy não consegue obter certificado SSL"
**Problema**: Porta 443 não acessível ou DNS incorreto  
**Solução**:
```bash
# Verificar se porta 443 está aberta
telnet brgestor.com.br 443

# Ver erro específico nos logs
docker logs brgestor-caddy --tail 100

# Forçar renovação de certificado
docker exec brgestor-caddy caddy reload --config /etc/caddy/Caddyfile
```

### Erro: "502 Bad Gateway"
**Problema**: Container brgestor não está rodando  
**Solução**:
```bash
# Verificar status dos containers
docker ps -a

# Restart do brgestor
docker-compose restart brgestor

# Ver logs do brgestor
docker logs brgestor-app
```

### Erro: Redirect Loop (muito redirecionamentos)
**Problema**: Configuração SSL incorreta com Cloudflare  
**Solução**:
- No Cloudflare: SSL/TLS → Full (strict)
- Ou desabilitar proxy no Cloudflare (clicar na nuvem para ficar cinza)

---

## 📊 CONFIGURAÇÕES ADICIONAIS

### A. Adicionar Subdomínios

Editar Caddyfile:
```caddy
# Domínio principal
brgestor.com.br, www.brgestor.com.br {
    reverse_proxy brgestor:80
    encode gzip
}

# API
api.brgestor.com.br {
    reverse_proxy brgestor:80
    encode gzip
}

# Painel Admin
admin.brgestor.com.br {
    reverse_proxy brgestor:80
    encode gzip
    
    # Autenticação básica (opcional)
    basicauth {
        admin $2a$14$...hash...
    }
}
```

### B. Forçar HTTPS

```caddy
brgestor.com.br {
    # Redirecionar HTTP para HTTPS automaticamente
    # (Caddy faz isso por padrão quando usa domínio)
    
    reverse_proxy brgestor:80
}
```

### C. Rate Limiting

```caddy
brgestor.com.br {
    # Limitar requisições por IP
    rate_limit {
        zone dynamic {
            key {remote_host}
            events 100
            window 1m
        }
    }
    
    reverse_proxy brgestor:80
}
```

---

## ✅ CHECKLIST FINAL

- [ ] DNS configurado (A record para IP 72.60.14.172)
- [ ] Caddyfile atualizado com domínio
- [ ] docker-compose.yml revisado
- [ ] Containers reiniciados (`docker-compose up -d`)
- [ ] Firewall com portas 80 e 443 abertas
- [ ] DNS propagado (teste com nslookup)
- [ ] Site acessível via HTTP
- [ ] Site acessível via HTTPS (se SSL configurado)
- [ ] Certificado SSL válido (se SSL configurado)
- [ ] Redirecionamentos funcionando

---

## 🎯 COMANDOS RÁPIDOS

### Deploy Completo
```bash
# 1. Conectar VPS
ssh -i ./Sensivel/deploy_key_brgestor brgestor@72.60.14.172

# 2. Navegar para projeto
cd ~/brgestor-ia-v2

# 3. Atualizar código (se necessário)
git pull origin master

# 4. Rebuild e restart
docker-compose down
docker-compose up -d --build

# 5. Verificar logs
docker-compose logs -f

# 6. Testar
curl -I https://brgestor.com.br
```

### Monitoramento
```bash
# Ver logs do Caddy em tempo real
docker logs brgestor-caddy -f

# Ver logs do BRGestor
docker logs brgestor-app -f

# Status dos containers
docker ps

# Uso de recursos
docker stats
```

---

## 📞 SUPORTE

**Documentação Caddy**: https://caddyserver.com/docs/  
**Cloudflare Docs**: https://developers.cloudflare.com/  
**Let's Encrypt Status**: https://letsencrypt.status.io/

---

**Última atualização**: 11/01/2026  
**Autor**: Sistema de Deploy BRGestor IA
