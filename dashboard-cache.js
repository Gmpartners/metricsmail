class DashboardFilterCache {
    constructor() {
        this.CACHE_KEY = 'mailnumbers_dashboard_cache';
        this.DEFAULT_CACHE = {
            selectedAccount: null,
            selectedAccountName: null,
            period: 'Últimos 7 dias',
            startDate: null,
            endDate: null,
            searchQuery: '',
            currentPage: 'dashboard'
        };
    }

    saveCache(data) {
        try {
            const cacheData = {
                ...this.getCache(),
                ...data,
                timestamp: Date.now()
            };
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
        } catch (error) {
            console.error('Erro ao salvar cache:', error);
        }
    }

    getCache() {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            if (!cached) return this.DEFAULT_CACHE;

            const data = JSON.parse(cached);
            const maxAge = 24 * 60 * 60 * 1000; // 24 horas
            
            if (Date.now() - data.timestamp > maxAge) {
                this.clearCache();
                return this.DEFAULT_CACHE;
            }

            return { ...this.DEFAULT_CACHE, ...data };
        } catch (error) {
            return this.DEFAULT_CACHE;
        }
    }

    saveSelectedAccount(accountId, accountName) {
        this.saveCache({
            selectedAccount: accountId,
            selectedAccountName: accountName
        });
    }

    getSelectedAccount() {
        const cache = this.getCache();
        return {
            id: cache.selectedAccount,
            name: cache.selectedAccountName
        };
    }

    clearCache() {
        localStorage.removeItem(this.CACHE_KEY);
    }

    restoreAccountSelection() {
        const account = this.getSelectedAccount();
        
        if (account.id && account.name) {
            const accountSelect = document.querySelector('select[name*="conta"], select[name*="account"], #account-select, .account-selector');
            
            if (accountSelect) {
                const option = Array.from(accountSelect.options).find(opt => 
                    opt.value === account.id || opt.textContent.includes(account.name)
                );
                
                if (option) {
                    accountSelect.value = option.value;
                    accountSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }
    }

    setupAutoSave() {
        const accountSelectors = document.querySelectorAll('select[name*="conta"], select[name*="account"], #account-select, .account-selector');
        
        accountSelectors.forEach(select => {
            select.addEventListener('change', (e) => {
                const selectedOption = e.target.selectedOptions[0];
                if (selectedOption && selectedOption.value) {
                    this.saveSelectedAccount(selectedOption.value, selectedOption.textContent);
                }
            });
        });

        if (window.addEventListener) {
            window.addEventListener('beforeunload', () => {
                const currentAccount = document.querySelector('select[name*="conta"], select[name*="account"]:checked, #account-select');
                if (currentAccount && currentAccount.value) {
                    this.saveSelectedAccount(currentAccount.value, currentAccount.textContent);
                }
            });
        }
    }
}

window.dashboardCache = new DashboardFilterCache();

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.dashboardCache.restoreAccountSelection();
        window.dashboardCache.setupAutoSave();
    }, 1000);
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardFilterCache;
}