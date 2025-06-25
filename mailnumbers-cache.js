// Cache para Dashboard MailNumbers - Versão React/Next.js

(function() {
    'use strict';
    
    const CACHE_KEY = 'mailnumbers_selected_account';
    const ACCOUNT_SELECTORS = [
        'select[name*="conta"]',
        'select[name*="account"]', 
        'select:has(option[value*="ZA"])',
        '.account-select',
        '#account-select',
        '[data-testid*="account"]',
        'select:has(option:contains("Selecione uma conta"))'
    ];

    function saveAccount(accountId, accountName) {
        try {
            const data = {
                id: accountId,
                name: accountName,
                timestamp: Date.now()
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            console.log('✅ Conta salva:', accountName);
        } catch (e) {
            console.error('❌ Erro ao salvar conta:', e);
        }
    }

    function getSavedAccount() {
        try {
            const saved = localStorage.getItem(CACHE_KEY);
            if (!saved) return null;
            
            const data = JSON.parse(saved);
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias
            
            if (Date.now() - data.timestamp > maxAge) {
                localStorage.removeItem(CACHE_KEY);
                return null;
            }
            
            return data;
        } catch (e) {
            return null;
        }
    }

    function findAccountSelect() {
        for (const selector of ACCOUNT_SELECTORS) {
            const element = document.querySelector(selector);
            if (element) return element;
        }
        return null;
    }

    function restoreAccount() {
        const saved = getSavedAccount();
        if (!saved) return false;

        const accountSelect = findAccountSelect();
        if (!accountSelect) return false;

        // Procurar pela opção salva
        const options = Array.from(accountSelect.options || accountSelect.querySelectorAll('option'));
        const targetOption = options.find(option => 
            option.value === saved.id || 
            option.textContent.trim() === saved.name ||
            option.textContent.includes(saved.name)
        );

        if (targetOption) {
            accountSelect.value = targetOption.value;
            
            // Disparar eventos para frameworks React/Vue/Angular
            const events = ['change', 'input', 'blur'];
            events.forEach(eventType => {
                accountSelect.dispatchEvent(new Event(eventType, { 
                    bubbles: true, 
                    cancelable: true 
                }));
            });

            // Evento customizado para React
            if (window.React) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;
                nativeInputValueSetter.call(accountSelect, targetOption.value);
                
                const event = new Event('input', { bubbles: true });
                accountSelect.dispatchEvent(event);
            }

            console.log('🔄 Conta restaurada:', saved.name);
            return true;
        }

        return false;
    }

    function setupAutoSave() {
        const accountSelect = findAccountSelect();
        if (!accountSelect) return;

        const saveCurrentSelection = () => {
            const selectedOption = accountSelect.selectedOptions[0];
            if (selectedOption && selectedOption.value && selectedOption.value !== '' && !selectedOption.textContent.includes('Selecione')) {
                saveAccount(selectedOption.value, selectedOption.textContent.trim());
            }
        };

        // Observer para mudanças no DOM
        const observer = new MutationObserver(() => {
            saveCurrentSelection();
        });

        observer.observe(accountSelect, { 
            attributes: true, 
            attributeFilter: ['value'] 
        });

        accountSelect.addEventListener('change', saveCurrentSelection);
        accountSelect.addEventListener('input', saveCurrentSelection);
    }

    function init() {
        let attempts = 0;
        const maxAttempts = 20;
        
        const tryRestore = () => {
            attempts++;
            
            if (restoreAccount()) {
                setupAutoSave();
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(tryRestore, 500);
            }
        };

        // Tentar imediatamente
        tryRestore();

        // Tentar novamente quando a página carregar completamente
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', tryRestore);
        }

        // Tentar quando o window carregar
        window.addEventListener('load', tryRestore);

        // Para SPAs (Single Page Applications)
        let currentUrl = window.location.href;
        const urlObserver = new MutationObserver(() => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                setTimeout(tryRestore, 1000);
            }
        });

        urlObserver.observe(document.body, { 
            childList: true, 
            subtree: true 
        });
    }

    // API global para uso manual
    window.MailNumbersCache = {
        save: saveAccount,
        restore: restoreAccount,
        get: getSavedAccount,
        clear: () => localStorage.removeItem(CACHE_KEY)
    };

    // Inicializar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();