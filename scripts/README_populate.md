# Script de População de Dados Históricos

## Descrição
Script para popular dados históricos de métricas de email marketing no banco de dados. Cria contas, campanhas, emails e eventos de forma dinâmica e configurável.

## Características
- **Datas Dinâmicas**: Funciona com qualquer período de datas
- **Volume Realista**: Ajusta volume baseado em dias da semana
- **Métricas Realistas**: Taxas de abertura e clique baseadas em benchmarks do mercado
- **Flexível**: Permite definir período e data final

## Como Usar

### Sintaxe Básica
```bash
node scripts/populate_historical_data.js {userId} [dias] [data-fim]
```

### Parâmetros
- `userId` (obrigatório): ID do usuário no sistema
- `dias` (opcional): Número de dias para gerar dados (padrão: 7)
- `data-fim` (opcional): Data final do período (padrão: hoje)

### Exemplos

1. **Últimos 7 dias (padrão)**
```bash
node scripts/populate_historical_data.js user123
```

2. **Últimos 30 dias**
```bash
node scripts/populate_historical_data.js user123 30
```

3. **15 dias antes de uma data específica**
```bash
node scripts/populate_historical_data.js user123 15 2025-06-01
```

4. **Período específico (maio de 2025)**
```bash
node scripts/populate_historical_data.js user123 4 2025-05-22
# Gerará dados de 19/05/2025 a 22/05/2025
```

## Dados Gerados

### Contas
- 1 conta Mautic por usuário
- Nome: "Mautic - Conta Principal"
- Status: ativo

### Campanhas
- 6 tipos de campanhas:
  - Newsletter Semanal
  - Campanha Promocional  
  - Onboarding Novos Usuários
  - Reengajamento
  - Lançamento de Produto
  - Black Friday

### Emails
- 1-4 emails por dia (varia por dia da semana)
- Volume menor nos fins de semana (30%)
- Volume maior em terça e quarta (120%)
- 200-500 emails base por envio

### Eventos
- **Send**: Todos os emails enviados
- **Open**: 15-35% de taxa de abertura
- **Click**: 2-8% de taxa de clique
- **Bounce**: 1-5% de taxa de bounce
- **Unsubscribe**: 0.1-0.4% de taxa de descadastro

### Contatos
- 42 contatos simulados
- Emails variados (gmail, hotmail, yahoo, outlook)

## Métricas Realistas
- **Taxa de Abertura**: 15-35% (benchmark brasileiro)
- **Taxa de Clique**: 2-8% 
- **Taxa de Bounce**: 1-5%
- **Taxa de Unsubscribe**: 0.1-0.4%
- **Aberturas Únicas**: 65-100% das aberturas totais
- **Cliques Únicos**: 75-100% dos cliques totais

## Ajustes por Dia da Semana
- **Segunda a Sexta**: Volume normal (100%)
- **Terça e Quarta**: Volume aumentado (120%)
- **Sábado e Domingo**: Volume reduzido (30%)

## Exemplo de Saída
```
🚀 Iniciando população de dados históricos
👤 UserId: user123
📅 Período: 2025-05-16 até 2025-05-22
📊 Dias a gerar: 7
✅ Conectado ao MongoDB
✅ Usando conta existente: Mautic - Conta Principal
✅ 6 campanhas preparadas

📅 Processando 2025-05-16 (Sex)
✅ Email criado: Newsletter Semanal - 2025-05-16
   📊 Métricas: 350 enviados, 87 aberturas (24.9%), 21 cliques (6.0%)
   ✅ 459 eventos criados

...

🎉 DADOS HISTÓRICOS CRIADOS COM SUCESSO!
📊 RESUMO FINAL:
   👤 UserId: user123
   📅 Período: 2025-05-16 até 2025-05-22 (7 dias)
   🏢 Conta: Mautic - Conta Principal
   📧 Total de emails enviados: 12,450
   🎯 Total de eventos criados: 16,238
   📊 Média diária: 1,779 emails/dia

📈 BANCO DE DADOS:
   Total de emails no banco: 28
   Total de eventos no banco: 16,238

✅ Conexão com MongoDB fechada
```

## Observações
- O script detecta emails duplicados e não recria
- Performance otimizada com inserção em lotes (500 eventos por vez)
- Todos os eventos têm timestamps realistas distribuídos ao longo do dia
- Dados marcados com `simulatedData: true` nos metadata

## Exemplo para o usuário específico do dashboard:

node scripts/populate_historical_data.js 1QJHAiuGWKltTQZkvs9RsBxuiavE 7
