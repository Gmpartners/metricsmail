// Dashboard de Métricas de Email Marketing

// Dados simulados para o período de 01/05/2025 a 07/05/2025
const campaignsData = [
    {
        name: 'email-01-bloco-06-06-FA-GN-ZA-02-07-24',
        subject: 'Voice message notification',
        date: '2025-05-01',
        sends: 55,
        opens: 15,
        clicks: 4,
        unsubs: 1,
        bounces: 0,
        openRate: '27.27%',
        ctoRate: '26.67%',
        clickRate: '7.27%',
        unsubRate: '1.82%',
        fwdRate: '0.00%',
        bounceRate: '0.00%'
    },
    {
        name: 'email-01-bloco-01-0834-KS-GN-ZA-13-11-24',
        subject: '%FIRSTNAME% Your account update',
        date: '2025-05-01',
        sends: 33,
        opens: 5,
        clicks: 2,
        unsubs: 0,
        bounces: 0,
        openRate: '15.15%',
        ctoRate: '40.00%',
        clickRate: '6.06%',
        unsubRate: '0.00%',
        fwdRate: '0.00%',
        bounceRate: '0.00%'
    },
    {
        name: 'email-01-bloco-02-0835-KS-GN-ZA-02-07-24',
        subject: '📷 Photo upload confirmation',
        date: '2025-05-02',
        sends: 32,
        opens: 9,
        clicks: 2,
        unsubs: 0,
        bounces: 0,
        openRate: '28.13%',
        ctoRate: '22.22%',
        clickRate: '6.25%',
        unsubRate: '0.00%',
        fwdRate: '0.00%',
        bounceRate: '0.00%'
    },
    {
        name: 'email-01-bloco-01-33-AM-GN-ZA-23-12-24',
        subject: 'Has your card arrived?',
        date: '2025-05-02',
        sends: 32,
        opens: 10,
        clicks: 2,
        unsubs: 0,
        bounces: 0,
        openRate: '31.25%',
        ctoRate: '20.00%',
        clickRate: '6.25%',
        unsubRate: '0.00%',
        fwdRate: '0.00%',
        bounceRate: '0.00%'
    },
    {
        name: 'email-01-bloco-05-0510-KS-GN-ZA-V2-AB-01-11-24',
        subject: 'Approved limit increase',
        date: '2025-05-03',
        sends: 68,
        opens: 16,
        clicks: 3,
        unsubs: 1,
        bounces: 0,
        openRate: '23.53%',
        ctoRate: '18.75%',
        clickRate: '4.41%',
        unsubRate: '1.47%',
        fwdRate: '0.00%',
        bounceRate: '0.00%'
    },
    {
        name: 'email-01-bloco-10-0832-KS-GN-ZA-13-11-24',
        subject: 'AUTHORISED REFUND',
        date: '2025-05-03',
        sends: 34,
        opens: 12,
        clicks: 1,
        unsubs: 0,
        bounces: 0,
        openRate: '35.29%',
        ctoRate: '8.33%',
        clickRate: '2.94%',
        unsubRate: '0.00%',
        fwdRate: '0.00%',
        bounceRate: '0.00%'
    },
    {
        name: 'email-01-bloco-09-0832-KS-GN-ZA-04-11-24',
        subject: '🔑 Voice message notification',
        date: '2025-05-04',
        sends: 30,
        opens: 8,
        clicks: 2,
        unsubs: 0,
        bounces: 0,
        openRate: '26.67%',
        ctoRate: '25.00%',
        clickRate: '6.67%',
        unsubRate: '0.00%',
        fwdRate: '0.00%',
        bounceRate: '0.00%'
    },
    {
        name: 'email-01-bloco-09-02-FA-GN-ZA-04-11-24',
        subject: 'Your account has been updated',
        date: '2025-05-04',
        sends: 36,
        opens: 14,
        clicks: 1,
        unsubs: 0,
        bounces: 0,
        openRate: '38.89%',
        ctoRate: '7.14%',
        clickRate: '2.78%',
        unsubRate: '0.00%',
        fwdRate: '0.00%',
        bounceRate: '0.00%'
    },
    {
        name: 'email-01-bloco-07-02-AM-GN-ZA-01-11-24',
        subject: "You're missing out on rewards",
        date: '2025-05-05',
        sends: 26,
        opens: 5,
        clicks: 1,
        unsubs: 0,
        bounces: 0,
        openRate: '19.23%',
        ctoRate: '20.00%',
        clickRate: '3.85%',
        unsubRate: '0.00%',
        fwdRate: '0.00%',
        bounceRate: '0.00%'
    },
    {
        name: 'email-01-bloco-08-07-AM-GN-ZA-01-11-24',
        subject: 'The address was found',
        date: '2025-05-05',
        sends: 30,
        opens: 6,
        clicks: 1,
        unsubs: 0,
        bounces: 0,
        openRate: '20.00%',
        ctoRate: '16.67%',
        clickRate: '3.33%',
        unsubRate: '0.00%',
        fwdRate: '0.00%',
        bounceRate: '0.00%'
    },
    {
        name: 'Email-Double-optin-02-ZA-02-07-24',
        subject: '%FIRSTNAME% Confirm your subscription',
        date: '2025-05-06',
        sends: 100,
        opens: 55,
        clicks: 15,
        unsubs: 2,
        bounces: 0,
        openRate: '55.00%',
        ctoRate: '27.27%',
        clickRate: '15.00%',
        unsubRate: '2.00%',
        fwdRate: '0.00%',
        bounceRate: '0.00%'
    },
    {
        name: '0308_AM_A1_ZA_1411_17-04-2025_15-/card-14',
        subject: 'A special rate was applied',
        date: '2025-05-06',
        sends: 266,
        opens: 35,
        clicks: 9,
        unsubs: 0,
        bounces: 0,
        openRate: '13.16%',
        ctoRate: '25.71%',
        clickRate: '3.38%',
        unsubRate: '0.00%',
        fwdRate: '0.00%',
        bounceRate: '0.00%'
    },
    {
        name: 'email-01-bloco-02-0836-KS-GN-ZA-V2-30-07-24',
        subject: 'Your card is almost ready',
        date: '2025-05-07',
        sends: 30,
        opens: 5,
        clicks: 0,
        unsubs: 0,
        bounces: 0,
        openRate: '16.67%',
        ctoRate: '0.00%',
        clickRate: '0.00%',
        unsubRate: '0.00%',
        fwdRate: '0.00%',
        bounceRate: '0.00%'
    },
    {
        name: 'email-01-bloco-08-04-AM-GN-ZA-01-11-24',
        subject: 'Voicemail (002) notification',
        date: '2025-05-07',
        sends: 24,
        opens: 8,
        clicks: 0,
        unsubs: 0,
        bounces: 0,
        openRate: '33.33%',
        ctoRate: '0.00%',
        clickRate: '0.00%',
        unsubRate: '0.00%',
        fwdRate: '0.00%',
        bounceRate: '0.00%'
    }
];

// Configuração de datas iniciais
document.addEventListener('DOMContentLoaded', () => {
    // Definir as datas padrão (01/05/2025 a 07/05/2025)
    document.getElementById('start-date').value = '2025-05-01';
    document.getElementById('end-date').value = '2025-05-07';
    
    // Simular uma pequena demora
    setTimeout(() => {
        fetchDemoData();
    }, 500);
});

// Atualizar campos de data com base no seletor de período
function updateDateInputs() {
    const dateRange = document.getElementById('date-range').value;
    const endDate = new Date('2025-05-07'); // Data final fixa para demo
    const startDate = new Date('2025-05-07'); // Começar da data final
    
    if (dateRange !== 'custom') {
        // Subtrair dias conforme seleção
        startDate.setDate(startDate.getDate() - parseInt(dateRange));
        
        // Formatar datas para o input
        document.getElementById('start-date').value = formatDateForInput(startDate);
        document.getElementById('end-date').value = formatDateForInput(endDate);
    }
}

// Formatar data para o formato do input date (YYYY-MM-DD)
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Formatar data para exibição (DD/MM/YYYY)
function formatDateForDisplay(dateStr) {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
}

// Aplicar filtros
function applyFilters() {
    fetchDemoData();
}

// Dados simulados para o período de 01/05/2025 a 07/05/2025
function fetchDemoData() {
    // Atualizar status da API
    document.getElementById('api-status').textContent = 'API conectada com sucesso!';
    document.getElementById('api-status').className = 'api-status';

    // Atualizar estatísticas
    document.getElementById('emails-sent').textContent = '11,235';
    document.getElementById('open-rate').textContent = '29.3%';
    document.getElementById('click-rate').textContent = '6.2%';
    document.getElementById('last-send').textContent = '2h atrás';

    // Filtrar os dados conforme necessário
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
    
    // Renderizar tabela de campanhas
    const tableBody = document.getElementById('campaigns-table');
    tableBody.innerHTML = '';

    if (filteredData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="14" class="text-center">Nenhum resultado encontrado para os filtros selecionados.</td>`;
        tableBody.appendChild(row);
    } else {
        // Calcular totais
        let totalSends = 0;
        let totalOpens = 0;
        let totalClicks = 0;
        let totalUnsubs = 0;
        let totalBounces = 0;
        
        filteredData.forEach(campaign => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${campaign.name}</td>
                <td>${campaign.subject}</td>
                <td>${campaign.date}</td>
                <td class="text-right">${campaign.sends}</td>
                <td class="text-right">${campaign.opens}</td>
                <td class="text-right">${campaign.clicks}</td>
                <td class="text-right">${campaign.unsubs}</td>
                <td class="text-right">${campaign.bounces}</td>
                <td>${campaign.openRate}</td>
                <td>${campaign.ctoRate}</td>
                <td>${campaign.clickRate}</td>
                <td>${campaign.unsubRate}</td>
                <td>${campaign.fwdRate}</td>
                <td>${campaign.bounceRate}</td>
            `;
            tableBody.appendChild(row);
            
            // Acumular totais
            totalSends += campaign.sends;
            totalOpens += campaign.opens;
            totalClicks += campaign.clicks;
            totalUnsubs += campaign.unsubs;
            totalBounces += campaign.bounces;
        });
        
        // Calcular médias
        const avgOpenRate = totalSends > 0 ? ((totalOpens / totalSends) * 100).toFixed(2) + '%' : '0.00%';
        const avgCTORate = totalOpens > 0 ? ((totalClicks / totalOpens) * 100).toFixed(2) + '%' : '0.00%';
        const avgClickRate = totalSends > 0 ? ((totalClicks / totalSends) * 100).toFixed(2) + '%' : '0.00%';
        const avgUnsubRate = totalSends > 0 ? ((totalUnsubs / totalSends) * 100).toFixed(2) + '%' : '0.00%';
        const avgBounceRate = totalSends > 0 ? ((totalBounces / totalSends) * 100).toFixed(2) + '%' : '0.00%';
        
        // Atualizar totais no rodapé
        document.getElementById('total-sends').textContent = totalSends;
        document.getElementById('total-opens').textContent = totalOpens;
        document.getElementById('total-clicks').textContent = totalClicks;
        document.getElementById('total-unsubs').textContent = totalUnsubs;
        document.getElementById('total-bounces').textContent = totalBounces;
        document.getElementById('avg-open-rate').textContent = avgOpenRate;
        document.getElementById('avg-cto-rate').textContent = avgCTORate;
        document.getElementById('avg-click-rate').textContent = avgClickRate;
        document.getElementById('avg-unsub-rate').textContent = avgUnsubRate;
        document.getElementById('avg-fwd-rate').textContent = '0.00%';
        document.getElementById('avg-bounce-rate').textContent = avgBounceRate;
    }
}

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
