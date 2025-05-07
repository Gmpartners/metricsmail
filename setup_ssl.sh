#!/bin/bash
# Script para remover o certificado autoassinado e instalar um certificado Let's Encrypt

# Definir variáveis
DOMAIN="metrics.devoltaaojogo.com"
EMAIL="admin@devoltaaojogo.com"
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"
SSL_DIR="/etc/nginx/ssl"
BACKUP_DIR="/root/ssl_backup_$(date +%Y%m%d%H%M%S)"

# Criar diretório de backup
mkdir -p $BACKUP_DIR

# Fazer backup dos arquivos atuais
echo "Fazendo backup das configurações atuais..."
cp $NGINX_CONF $BACKUP_DIR/
if [ -d "$SSL_DIR" ]; then
    cp -r $SSL_DIR/* $BACKUP_DIR/
fi

# Verificar se o Certbot está em execução
echo "Verificando se o Certbot está em execução..."
CERTBOT_PID=$(pgrep -f certbot)
if [ ! -z "$CERTBOT_PID" ]; then
    echo "Matando processos Certbot existentes..."
    kill -9 $CERTBOT_PID
    sleep 2
fi

# Modificar a configuração do Nginx para remover o SSL autoassinado
echo "Atualizando configuração do Nginx para preparar para Let's Encrypt..."
cat > $NGINX_CONF << EOL
server {
    listen 80;
    server_name $DOMAIN;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOL

# Recarregar o Nginx para aplicar as mudanças
echo "Recarregando Nginx..."
systemctl reload nginx

# Executar o Certbot para obter o certificado
echo "Executando Certbot para obter certificado Let's Encrypt..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

# Verificar se a instalação foi bem-sucedida
if [ $? -eq 0 ]; then
    echo "Certificado Let's Encrypt instalado com sucesso para $DOMAIN!"
    echo "Os backups dos arquivos originais estão em $BACKUP_DIR"
else
    echo "Erro ao instalar o certificado Let's Encrypt."
    echo "Restaurando configuração original..."
    cp $BACKUP_DIR/$(basename $NGINX_CONF) $NGINX_CONF
    systemctl reload nginx
    echo "A configuração original foi restaurada."
fi

# Verificar a configuração atual do Nginx
echo "Configuração atual do Nginx:"
nginx -T | grep -A 20 "server_name $DOMAIN"

echo "Script concluído!"
