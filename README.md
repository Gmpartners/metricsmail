# MetricsMail

Dashboard de métricas de email marketing com suporte a múltiplos usuários e integração com várias plataformas (Mautic, Klaviyo, ActiveCampaign, Mailchimp).

## Visão Geral

MetricsMail é uma API e dashboard para monitoramento de métricas de email marketing que permite a múltiplos usuários acompanhar o desempenho de suas campanhas em diversas plataformas. O sistema coleta, armazena e exibe métricas importantes como taxas de abertura, cliques, rejeições e descadastramento.

## Estrutura Multiusuário

O MetricsMail foi projetado desde o início para suportar múltiplos usuários, onde cada usuário tem suas próprias contas, campanhas e métricas. A estrutura da API reflete isso:

- Todas as requisições à API incluem o ID do usuário na rota: `/api/users/{userId}/...`
- Todos os dados são filtrados por `userId` nos controladores
- Cada modelo (Account, Campaign, Email, Event, Metrics) possui um campo `userId` para separar os dados

Esta abordagem garante que cada usuário só pode acessar e manipular seus próprios dados.

## Tecnologias Utilizadas

- **Node.js** - Ambiente de execução
- **Express** - Framework web
- **MongoDB** - Banco de dados
- **Mongoose** - ODM para MongoDB

## Funcionalidades

- Suporte a múltiplos usuários
- Integração com múltiplas plataformas de email marketing
- Visualização unificada de métricas de várias plataformas
- Dashboard interativo com gráficos e tabelas
- Filtros por conta, campanha e período
- API completa para acesso a todos os dados

## Autenticação

O sistema utiliza uma autenticação simples baseada em API Key:

- **API Key**: `MAaDylN2bs0Y01Ep66`

Todas as requisições à API devem incluir esta chave em um dos dois formatos:
1. Header: `x-api-key: MAaDylN2bs0Y01Ep66`
2. Query parameter: `?apiKey=MAaDylN2bs0Y01Ep66`

## Instalação e Execução

### Requisitos

- Node.js >= 14.x
- MongoDB >= 4.x

### Passos

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure as variáveis de ambiente copiando o arquivo `.env.example` para `.env` e ajustando conforme necessário
4. Execute o servidor:
   ```bash
   npm run dev
   ```

### Dados de Teste

Para popular o banco de dados com dados de teste para o usuário "test-user", execute:

```bash
node teste-user-dados-fix.js
```

Este script criará contas, campanhas, templates de email, eventos e métricas para o período de 01/05/2025 a 07/05/2025.

## Endpoints da API

Todos os endpoints principais da API seguem o padrão:

```
/api/users/{userId}/...
```

### Contas

- `GET /api/users/{userId}/accounts` - Listar todas as contas
- `GET /api/users/{userId}/accounts/:id` - Obter detalhes de uma conta
- `POST /api/users/{userId}/accounts` - Criar uma nova conta
- `PUT /api/users/{userId}/accounts/:id` - Atualizar uma conta
- `DELETE /api/users/{userId}/accounts/:id` - Excluir uma conta
- `POST /api/users/{userId}/accounts/:id/test-connection` - Testar conexão com a conta

### Métricas

- `GET /api/users/{userId}/metrics/by-date` - Métricas por data
- `GET /api/users/{userId}/metrics/by-account` - Métricas por conta
- `GET /api/users/{userId}/metrics/by-campaign` - Métricas por campanha
- `GET /api/users/{userId}/metrics/opens` - Emails abertos
- `GET /api/users/{userId}/metrics/rates` - Taxas (CTR, bounce, unsubscribe)
- `GET /api/users/{userId}/metrics/send-rate` - Taxa de envio por conta
- `GET /api/users/{userId}/metrics/daily-sends` - Envios diários
- `GET /api/users/{userId}/metrics/daily-opens` - Aberturas diárias
- `GET /api/users/{userId}/metrics/daily-clicks` - Cliques diários

## Interface de Usuário

O sistema inclui uma interface de usuário para visualização dos dados, acessível em:

```
/apresentacao.html
```

## Próximas Etapas

- Implementação de autenticação JWT completa
- Integração com novas plataformas
- Aprimoramentos na interface de usuário
- Implementação de webhooks para eventos em tempo real
