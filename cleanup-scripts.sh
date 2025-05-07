#!/bin/bash
# Script para limpar os scripts desnecessários do sistema
# Mantendo apenas o push.sh

echo "Iniciando limpeza de scripts desnecessários..."

# Diretório base do projeto
BASE_DIR="/root/metricsmail"

# Criar diretório de backup para scripts que serão removidos
BACKUP_DIR="$BASE_DIR/scripts_backup_$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Mover scripts desnecessários para o backup
echo "Fazendo backup dos scripts antes de removê-los..."
for script in $BASE_DIR/scripts/*.js; do
  if [ -f "$script" ]; then
    echo " - Movendo $script para backup"
    cp "$script" "$BACKUP_DIR/"
  fi
done

# Backup do diretório utils
if [ -d "$BASE_DIR/scripts/utils" ]; then
  echo " - Movendo diretório utils para backup"
  cp -r "$BASE_DIR/scripts/utils" "$BACKUP_DIR/"
fi

# Manter apenas o push.sh e remover os demais scripts
echo "Removendo scripts desnecessários..."
find $BASE_DIR/scripts -name "*.js" -type f -exec rm -f {} \;

# Remover diretório utils se estiver vazio
if [ -d "$BASE_DIR/scripts/utils" ]; then
  if [ -z "$(ls -A $BASE_DIR/scripts/utils)" ]; then
    echo " - Removendo diretório utils vazio"
    rmdir "$BASE_DIR/scripts/utils"
  fi
fi

echo "Limpeza concluída! Apenas o push.sh foi mantido."
echo "Backup dos scripts removidos está em: $BACKUP_DIR"
