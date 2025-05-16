# Scripts Agendados (Cron Jobs)

## collectDailyLeads.js

Este script coleta automaticamente estatísticas de leads cadastrados no Mautic para todas as contas ativas.

### Funcionamento

- Executa automaticamente todos os dias à meia-noite (00:00, UTC-3)
- Coleta os leads cadastrados no dia anterior para cada conta ativa
- Salva as contagens no banco de dados para consulta histórica
- Logs são armazenados em `/root/metricsmail/logs/leadStats.log`

### Execução Manual

Para executar o script manualmente:

```bash
npm run collect-leads
```

### Configuração do Cron

O script está configurado para executar automaticamente via crontab:

```
0 0 * * * cd /root/metricsmail && /root/.nvm/versions/node/v18.20.8/bin/node scripts/cronjobs/collectDailyLeads.js >> logs/cron.log 2>&1
```

Para modificar a configuração do cron:

```bash
crontab -e
```
