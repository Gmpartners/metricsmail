// Funções para exportação de dados

// Exportar dados para CSV
function exportToCSV() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const fileName = `metricas_email_${startDate}_a_${endDate}.csv`;
    
    let csvContent = 'Nome da campanha,Assunto da campanha,Data de envio,Envios,Aberturas,Cliques,Cancelamentos,Bounces,Taxa de abertura,Taxa de clique para abertura,Taxa de cliques,Taxa de cancelamentos,Taxa de encaminhamentos,Taxa de rejeição\n';
    
    // Filtrar os dados conforme os filtros atuais
    const filteredData = getFilteredData();
    
    filteredData.forEach(campaign => {
        const row = [
            `"${campaign.name}"`,
            `"${campaign.subject}"`,
            campaign.date,
            campaign.sends,
            campaign.opens,
            campaign.clicks,
            campaign.unsubs,
            campaign.bounces,
            campaign.openRate,
            campaign.ctoRate,
            campaign.clickRate,
            campaign.unsubRate,
            campaign.fwdRate,
            campaign.bounceRate
        ];
        csvContent += row.join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Obter dados filtrados com base nos filtros atuais
function getFilteredData() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const campaignName = document.getElementById('campaign-name').value;
    const campaignType = document.getElementById('campaign-type').value;
    
    let filteredData = campaignsData;
    
    // Filtrar por data
    if (startDate && endDate) {
        filteredData = filteredData.filter(campaign => {
            return campaign.date >= startDate && campaign.date <= endDate;
        });
    }
    
    // Filtrar por nome de campanha
    if (campaignName !== 'all') {
        filteredData = filteredData.filter(campaign => {
            return campaign.name.toLowerCase().includes(campaignName);
        });
    }
    
    return filteredData;
}
