#!/bin/bash

# URL do webhook
WEBHOOK_URL="https://metrics.devoltaaojogo.com/api/webhooks/528877a8-6eb4-434e-a9b8-073d15138f40"

# ID do email a ser usado nas simulações
EMAIL_ID=75

# Loop para simular 10 aberturas
for i in {1..10}
do
  # Usa apenas os primeiros 10 contatos (que já receberam o email)
  CONTACT_ID=$((1000 + $i))
  
  # Cria um email para o contato
  CONTACT_EMAIL="teste${i}@example.com"
  
  # Cria um timestamp atual
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S+00:00")
  
  # Cria o payload para a abertura
  PAYLOAD='{
    "mautic.email_on_open": [{
      "stat": {
        "id": '$((5000 + $i))',
        "email": {
          "id": '$EMAIL_ID',
          "name": "Teste Email",
          "subject": "Teste de Simulação de Envio"
        },
        "lead": {
          "id": '$CONTACT_ID',
          "email": "'$CONTACT_EMAIL'",
          "firstname": "Usuário",
          "lastname": "Teste'$i'"
        },
        "dateRead": "'$TIMESTAMP'",
        "trackingHash": "hash'$i'"
      },
      "timestamp": "'$TIMESTAMP'"
    }]
  }'
  
  # Envia o payload para o webhook
  echo "Enviando simulação $i de abertura para $CONTACT_EMAIL"
  curl -X POST "$WEBHOOK_URL" \
       -H "Content-Type: application/json" \
       -d "$PAYLOAD"
  
  # Pausa breve para não sobrecarregar o servidor
  sleep 1
done

echo "Simulação de 10 aberturas concluída!"
