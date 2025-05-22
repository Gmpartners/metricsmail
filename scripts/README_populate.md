# 📊 Script de População de Dados Históricos

## 🎯 Propósito
Este script cria dados históricos realistas de email marketing para um usuário específico, cobrindo o período de **19/05/2025 a 22/05/2025**.

## 🚀 Como usar

### Comando básico:
```bash
node scripts/populate_historical_data.js {userId}
```

### Exemplo:
```bash
node scripts/populate_historical_data.js wBnoxuKZfUUluhg8jwUtQBB3Jgo2
```

## 📈 O que o script cria:

### 🏢 **Estrutura de dados:**
- 1 Conta Mautic (se não existir)
- 4 Campanhas diferentes
- 5-8 Emails distribuídos ao longo de 4 dias
- Milhares de eventos realistas

### 📧 **Tipos de emails criados:**
- Newsletter Semanal
- Promoção Flash  
- Boas-vindas
- Recuperação de Carrinho
- Evento Webinar
- Pesquisa Satisfação
- Produto Novo
- Newsletter Mensal

### 📊 **Eventos gerados:**
- **SEND**: Envios de email
- **OPEN**: Aberturas (com controle de únicos)
- **CLICK**: Cliques em links (com controle de únicos)
- **BOUNCE**: Rejeições de email
- **UNSUBSCRIBE**: Cancelamentos

### 🎲 **Volumes realistas por dia:**
- **19/05**: 150-250 envios por email
- **20/05**: 200-350 envios por email  
- **21/05**: 100-200 envios por email
- **22/05**: 80-150 envios por email

### 📈 **Taxas de mercado simuladas:**
- Taxa de abertura: 18-30%
- Taxa de clique: 2-6%
- Taxa de bounce: 1-4%
- Taxa de unsubscribe: 0.1-0.5%

## ⚡ **Performance:**
- Inserção em lotes de 100 eventos
- Timestamps distribuídos realisticamente
- Métricas calculadas automaticamente
- Campanhas atualizadas com totais

## 📝 **Logs detalhados:**
O script mostra em tempo real:
- Emails sendo criados
- Quantidade de eventos por tipo
- Métricas finais
- Relatório de performance

## ⚠️ **Importante:**
- O script NÃO sobrescreve dados existentes
- Cria apenas novos registros
- Todos os eventos são marcados como `simulatedData: true`
- Conexão MongoDB é fechada automaticamente
