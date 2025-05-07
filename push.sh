#!/bin/bash

# Script para facilitar o processo de commit e push para o GitHub
# Uso: ./push.sh "Mensagem do commit"

# Verifica se a mensagem de commit foi fornecida
if [ -z "$1" ]; then
  echo "Erro: Mensagem de commit não fornecida"
  echo "Uso: ./push.sh \"Mensagem do commit\""
  exit 1
fi

# Verifica se estamos dentro de um repositório git
if [ ! -d .git ]; then
  echo "Erro: Este diretório não é um repositório Git"
  exit 1
fi

# Armazena a mensagem de commit
COMMIT_MESSAGE="$1"

echo "🔄 Adicionando alterações..."
git add .

echo "✅ Realizando commit: \"$COMMIT_MESSAGE\""
git commit -m "$COMMIT_MESSAGE"

echo "⬆️ Enviando para o GitHub..."
git push origin main

if [ $? -eq 0 ]; then
  echo "🎉 Push realizado com sucesso!"
else
  echo "❌ Erro ao fazer push. Verifique erros acima."
  exit 1
fi

echo "📊 Status atual do repositório:"
git status

echo "
📝 Últimos 3 commits:"
git log -3 --pretty=format:"%h - %an, %ar : %s"
