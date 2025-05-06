#!/bin/bash

# Verificar se foi fornecida uma mensagem de commit
if [ -z "$1" ]; then
    echo "Por favor, forneça uma mensagem de commit."
    echo "Uso: ./push.sh \"Sua mensagem de commit\""
    exit 1
fi

# Adicionar todas as alterações
git add .

# Commit com a mensagem fornecida
git commit -m "$1"

# Push para o GitHub
git push origin main

echo "Alterações enviadas com sucesso para o GitHub!"

