/**
 * Script para atualizar os controllers para usar os novos campos de ID.
 * Este script é uma ferramenta para guiar a atualização manual.
 */

console.log(`
============================================================
  GUIA PARA ATUALIZAÇÃO DE CONTROLLERS - CAMPOS ID NUMÉRICOS
============================================================

Em todos os controllers, faça as seguintes substituições:

1. BUSCA DE DOCUMENTOS:
   De:
   const campaign = await Campaign.findOne({ _id: campaignId });
   
   Para:
   const campaign = await Campaign.findOne({ campaignID: Number(campaignId) });

2. REFERÊNCIAS EM FILTROS:
   De:
   filter.campaign = campaignId;
   
   Para:
   filter.campaignID = Number(campaignId);

3. POPULATION DE RELACIONAMENTOS:
   De:
   .populate('campaign', 'name')
   
   Para:
   .populate('campaign', 'name campaignID')

4. RESPOSTA DE APIs:
   Sempre incluir os campos ID numéricos nas respostas:
   
   response = {
     id: item._id,          // Manter para compatibilidade se necessário
     numericId: item.campaignID,  // Adicionar o ID numérico
     // Outros campos...
   }

5. PARÂMETROS DE ROTAS:
   Documentar claramente que os parâmetros de ID agora esperam valores numéricos.

================================================================

Arquivos a serem atualizados:
1. /root/metricsmail/src/controllers/metricsController.js
2. /root/metricsmail/src/controllers/accountsController.js
3. /root/metricsmail/src/controllers/webhooksController.js

================================================================
`);
