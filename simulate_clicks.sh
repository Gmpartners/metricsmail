#!/bin/bash

# URL do webhook
WEBHOOK_URL="https://metrics.devoltaaojogo.com/api/webhooks/528877a8-6eb4-434e-a9b8-073d15138f40"

# ID do email a ser usado nas simulações
EMAIL_ID=75

# Loop para simular 5 cliques
for i in {1..5}
do
  # Usa apenas os primeiros 5 contatos (que já abriram o email)
  CONTACT_ID=$((1000 + $i))
  
  # Cria um email para o contato
  CONTACT_EMAIL="teste${i}@example.com"
  
  # Cria um timestamp atual
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S+00:00")
  
  # Cria o payload para o clique
  PAYLOAD='{
    "mautic.email_on_click": [{
      "stat": {
        "id": '$((7000 + $i))',
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
        "url": "https://meganoapps.com/za/absa-flexi-core-credit-card/?utm_source=za-ac1&utm_medium=za-ac1-email",
        "dateClicked": "'$TIMESTAMP'",
        "trackingHash": "hash'$i'"
      },
      "timestamp": "'$TIMESTAMP'"
    }]
  }'
  
  # Envia o payload para o webhook
  echo "Enviando simulação $i de clique para $CONTACT_EMAIL"
  curl -X POST "$WEBHOOK_URL" \
       -H "Content-Type: application/json" \
       -d "$PAYLOAD"
  
  # Pausa breve para não sobrecarregar o servidor
  sleep 1
done

echo "Simulação de 5 cliques concluída!"
