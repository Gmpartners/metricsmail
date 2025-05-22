# Script de População de Dados - populate.js

## Descrição
Este script popula dados históricos de email marketing para um usuário específico no período de 17/05/2025 a 22/05/2025.

## Como usar

### Sintaxe
```bash
node populate.js {userId}
```

### Exemplo
```bash
node populate.js user123456
```

## O que o script faz

1. **Busca contas**: Encontra todas as contas associadas ao userId fornecido
2. **Limpa dados existentes**: Remove dados do período especificado para evitar duplicatas
3. **Cria campanhas**: Gera campanhas realistas para cada dia do período
4. **Cria emails**: Cria templates de email para cada campanha
5. **Gera eventos**: Popula eventos realistas (envios, entregas, aberturas, cliques, bounces, etc.)
6. **Calcula métricas**: Gera métricas agregadas diárias automaticamente

## Dados gerados

### Período
- **Início**: 17/05/2025 00:00:00 UTC
- **Fim**: 22/05/2025 23:59:59 UTC

### Tipos de eventos
- **send**: Envios de email
- **delivery**: Entregas bem-sucedidas
- **open**: Aberturas de email (totais e únicas)
- **click**: Cliques em links (totais e únicos)
- **bounce**: Devoluções (hard e soft)
- **unsubscribe**: Cancelamentos de inscrição
- **complaint**: Reclamações/spam

### Métricas realistas
- Taxa de entrega: 92-98%
- Taxa de abertura: 15-40%
- Taxa de clique: 2-10% das aberturas
- Taxa de bounce: 2-8%
- Taxa de cancelamento: 0.1-0.5%
- Taxa de reclamação: 0.01-0.1%

## Pré-requisitos

1. O usuário deve ter pelo menos uma conta configurada no sistema
2. MongoDB deve estar rodando e acessível
3. Variáveis de ambiente configuradas (.env)

## Verificar se há contas
```bash
# No MongoDB ou através da API, verificar:
# Contas para o usuário: db.accounts.find({userId: "seuUserId"})
```

## Logs do script
O script exibe logs detalhados durante a execução:
- 🚀 Início do processo
- 📊 Contas encontradas
- 🏢 Processamento de cada conta
- 📅 Dados por dia
- 📧 Emails criados
- 🎯 Eventos gerados
- 📈 Métricas calculadas
- ✅ Conclusão

## Saída esperada
```
🚀 Iniciando população de dados para userId: user123456
📊 Encontradas 2 conta(s) para o usuário

🏢 Processando conta: Minha Conta Mautic (mautic)
📅 Populando dados para: 2025-05-17
  📧 Email "Newsletter Template" criado com 1200 destinatários e 2500 eventos
...
✅ Conta Minha Conta Mautic processada com sucesso!

📋 Resumo da população:
📅 Período: 2025-05-17 a 2025-05-22
👤 UserId: user123456
📊 Campanhas criadas: 8
📧 Emails criados: 8
🎯 Eventos criados: 15420
📈 Métricas calculadas: 12
```

## Troubleshooting

### Erro: "Nenhuma conta encontrada"
- Verifique se o userId está correto
- Confirme se existem contas criadas para este usuário

### Erro de conexão MongoDB
- Verifique se o MongoDB está rodando
- Confirme as variáveis de ambiente no .env

### Erro de duplicata
- O script limpa dados existentes automaticamente
- Em caso de erro, execute novamente

## Limpeza manual
Se necessário limpar dados manualmente:
```javascript
// No MongoDB
db.events.deleteMany({userId: "seuUserId", timestamp: {$gte: ISODate("2025-05-17"), $lte: ISODate("2025-05-22")}})
db.campaigns.deleteMany({userId: "seuUserId", createdAt: {$gte: ISODate("2025-05-17"), $lte: ISODate("2025-05-22")}})
db.emails.deleteMany({userId: "seuUserId", createdAt: {$gte: ISODate("2025-05-17"), $lte: ISODate("2025-05-22")}})
db.metrics.deleteMany({userId: "seuUserId", date: {$gte: ISODate("2025-05-17"), $lte: ISODate("2025-05-22")}})
```
