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
