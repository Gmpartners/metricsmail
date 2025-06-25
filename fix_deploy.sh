#!/bin/bash
cd /var/www/metricsmail-backend
cp src/controllers/metricsSummaryController.js backup_metrics_$(date +%s).js
sed -i 's/if (startDate && endDate) {/if (startDate || endDate) {/' src/controllers/metricsSummaryController.js
sed -i '/eventFilter.timestamp = {/,/};/ {
    s/$gte: new Date(startDate),/$gte: startDate ? new Date(startDate + "T00:00:00.000Z") : dateHelpers.subDays(new Date(), 30),/
    s/$lte: new Date(endDate)/$lte: endDate ? new Date(endDate + "T23:59:59.999Z") : new Date()/
}' src/controllers/metricsSummaryController.js
pm2 restart metricsmail-backend
echo "DEPLOY CONCLUIDO COM SUCESSO!"