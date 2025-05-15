#!/bin/bash

# Script para implantação completa do sistema de IDs numéricos
# Este script executa todas as etapas necessárias para:
# 1. Fazer backup do banco de dados
# 2. Atualizar os modelos
# 3. Executar a migração
# 4. Testar a migração
# 5. Atualizar os controllers e rotas

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}     IMPLANTAÇÃO DO SISTEMA DE IDs NUMÉRICOS         ${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo ""

# Verificar se estamos no diretório correto
if [ ! -d "./src" ] || [ ! -d "./scripts" ]; then
  echo -e "${RED}Erro: Execute este script a partir do diretório raiz do projeto${NC}"
  exit 1
fi

# 1. Fazer backup do banco de dados
echo -e "\n${YELLOW}1. Realizando backup do banco de dados...${NC}"

# Obter variáveis do arquivo .env
if [ -f .env ]; then
  MONGODB_URI=$(grep MONGODB_URI .env | cut -d '=' -f2)
  DB_NAME=$(echo $MONGODB_URI | sed 's/.*\/\([^?]*\).*/\1/')
  
  echo -e "  Base de dados detectada: ${BLUE}$DB_NAME${NC}"
  BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
  mkdir -p $BACKUP_DIR
  
  echo -e "  Criando backup em: ${BLUE}$BACKUP_DIR${NC}"
  
  # Verificar se mongodump está instalado
  if command -v mongodump &> /dev/null; then
    mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR"
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}  ✅ Backup concluído com sucesso!${NC}"
    else
      echo -e "${RED}  ❌ Erro ao realizar backup. Abortando...${NC}"
      exit 1
    fi
  else
    echo -e "${YELLOW}  ⚠️ mongodump não encontrado. Pulando backup automatizado.${NC}"
    echo -e "${YELLOW}  ⚠️ Recomendamos fazer backup manual antes de continuar.${NC}"
    
    read -p "Continuar mesmo sem backup? (s/N): " confirm
    if [[ "$confirm" != "s" && "$confirm" != "S" ]]; then
      echo -e "${RED}Implantação cancelada pelo usuário.${NC}"
      exit 1
    fi
  fi
else
  echo -e "${YELLOW}  ⚠️ Arquivo .env não encontrado. Não foi possível realizar backup automático.${NC}"
  echo -e "${YELLOW}  ⚠️ Recomendamos fazer backup manual antes de continuar.${NC}"
  
  read -p "Continuar mesmo sem backup? (s/N): " confirm
  if [[ "$confirm" != "s" && "$confirm" != "S" ]]; then
    echo -e "${RED}Implantação cancelada pelo usuário.${NC}"
    exit 1
  fi
fi

# 2. Atualizar Controllers e Rotas
echo -e "\n${YELLOW}2. Atualizando controllers e rotas...${NC}"

# Mover os arquivos gerados para substituir os existentes
if [ -f "./scripts/updateControllers.js" ]; then
  echo -e "  📝 Instruções para atualização manual de controllers disponíveis em:"
  echo -e "     ${BLUE}./scripts/updateControllers.js${NC}"
fi

if [ -f "./src/controllers/metricsController.js.update" ]; then
  cp ./src/controllers/metricsController.js ./src/controllers/metricsController.js.bak-deploy
  cp ./src/controllers/metricsController.js.update ./src/controllers/metricsController.js
  echo -e "${GREEN}  ✅ Controller de métricas atualizado com sucesso!${NC}"
fi

if [ -f "./src/routes/metricsRoutes.js.bak" ]; then
  echo -e "${GREEN}  ✅ Rotas de métricas já possuem backup!${NC}"
else
  cp ./src/routes/metricsRoutes.js ./src/routes/metricsRoutes.js.bak-deploy
  echo -e "${GREEN}  ✅ Backup das rotas de métricas criado!${NC}"
fi

# 3. Executar a migração
echo -e "\n${YELLOW}3. Executando migração para adicionar IDs numéricos...${NC}"
echo -e "  🕒 Este processo pode demorar dependendo do tamanho do banco de dados."
echo -e "  ⚠️ Não interrompa o processo!"

read -p "Executar migração agora? (s/N): " confirm
if [[ "$confirm" == "s" || "$confirm" == "S" ]]; then
  node ./scripts/migrations/add-numeric-ids.js
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}  ✅ Migração concluída com sucesso!${NC}"
  else
    echo -e "${RED}  ❌ Erro durante a migração. Verifique os logs acima.${NC}"
    echo -e "${YELLOW}  ⚠️ Recomendamos restaurar o backup antes de continuar.${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}  ⚠️ Migração adiada pelo usuário.${NC}"
  echo -e "${YELLOW}  ⚠️ Execute manualmente mais tarde: node ./scripts/migrations/add-numeric-ids.js${NC}"
fi

# 4. Testar a migração
echo -e "\n${YELLOW}4. Testando a implementação...${NC}"

read -p "Executar testes agora? (s/N): " confirm
if [[ "$confirm" == "s" || "$confirm" == "S" ]]; then
  node ./scripts/tests/test-numeric-ids.js
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}  ✅ Testes concluídos com sucesso!${NC}"
  else
    echo -e "${RED}  ❌ Erro durante os testes. Verifique os logs acima.${NC}"
    echo -e "${YELLOW}  ⚠️ Recomendamos verificar a implementação manualmente.${NC}"
  fi
else
  echo -e "${YELLOW}  ⚠️ Testes adiados pelo usuário.${NC}"
  echo -e "${YELLOW}  ⚠️ Execute manualmente mais tarde: node ./scripts/tests/test-numeric-ids.js${NC}"
fi

# 5. Documentação
echo -e "\n${YELLOW}5. Atualizando documentação...${NC}"

mkdir -p ./docs

cat > ./docs/numeric-ids.md << 'DOC'
# Sistema de IDs Numéricos

Este documento descreve a implementação e uso do sistema de IDs numéricos sequenciais em toda a aplicação.

## Visão Geral

A aplicação agora utiliza IDs numéricos sequenciais para identificar entidades, em vez de depender exclusivamente dos ObjectIds gerados pelo MongoDB. Cada tipo de entidade (Account, Campaign, Email, Event, Metrics) possui seu próprio campo de ID numérico:

- `accountID` para contas
- `campaignID` para campanhas
- `emailID` para emails
- `eventID` para eventos
- `metricsID` para métricas

## Benefícios

- IDs mais amigáveis para uso em APIs e interfaces de usuário
- Consistência nos identificadores em todas as partes do sistema
- Simplificação de integrações com sistemas externos

## Relações entre Entidades

Internamente, o sistema ainda utiliza ObjectIds para manter os relacionamentos entre entidades no banco de dados MongoDB. Porém, cada documento agora armazena também referências por ID numérico:

```javascript
// Exemplo de documento Email
{
  _id: ObjectId("507f1f77bcf86cd799439011"),  // ObjectId interno do MongoDB
  emailID: 42,                                // ID numérico para APIs
  account: ObjectId("507f1f77bcf86cd799439022"),  // Referência interna por ObjectId
  accountID: 5,                               // Referência externa por ID numérico
  campaign: ObjectId("507f1f77bcf86cd799439033"),  // Referência interna por ObjectId
  campaignID: 12,                             // Referência externa por ID numérico
  // outros campos...
}
```

## Uso na API

Todos os endpoints da API agora utilizam os IDs numéricos para referências:

```
GET /api/users/:userId/metrics/by-campaign?accountId=5
```

Em vez de:

```
GET /api/users/:userId/metrics/by-campaign?accountId=507f1f77bcf86cd799439022
```

## Migração de Código Legado

Se você estiver trabalhando com código legado que ainda utiliza ObjectIds, você pode converter facilmente:

```javascript
// De ObjectId para ID numérico
const account = await Account.findById(objectId).select('accountID');
const accountID = account.accountID;

// De ID numérico para ObjectId
const account = await Account.findOne({ accountID: Number(accountID) });
const objectId = account._id;
```
DOC

echo -e "${GREEN}  ✅ Documentação criada em ./docs/numeric-ids.md${NC}"

# Concluído
echo -e "\n${GREEN}=====================================================${NC}"
echo -e "${GREEN}          IMPLANTAÇÃO CONCLUÍDA COM SUCESSO           ${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo -e "\n${BLUE}Próximos passos:${NC}"
echo -e "  1. Teste manualmente a aplicação para verificar se tudo funciona corretamente"
echo -e "  2. Monitore os logs em busca de erros relacionados aos IDs"
echo -e "  3. Atualize outros controllers conforme necessário"
echo -e "\n${BLUE}Em caso de problemas:${NC}"
echo -e "  1. Restaure o backup criado em: ${BACKUP_DIR}"
echo -e "  2. Consulte os arquivos .bak para restaurar o código original"
echo -e "\n${BLUE}Documentação:${NC}"
echo -e "  - ./docs/numeric-ids.md: Documentação sobre o sistema de IDs numéricos"
echo -e "\n${GREEN}Bom trabalho! 🎉${NC}"

exit 0
