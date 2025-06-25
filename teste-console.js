// TESTE RÁPIDO - Cole no console do navegador (F12)

(function() {
    console.log('🚀 Iniciando cache MailNumbers...');
    
    // Função para salvar conta
    function salvarConta() {
        const selects = document.querySelectorAll('select');
        let contaEncontrada = null;
        
        selects.forEach(select => {
            const opcaoSelecionada = select.selectedOptions[0];
            if (opcaoSelecionada && 
                opcaoSelecionada.textContent.includes('ZA') && 
                !opcaoSelecionada.textContent.includes('Selecione')) {
                
                contaEncontrada = {
                    value: opcaoSelecionada.value,
                    text: opcaoSelecionada.textContent.trim()
                };
                
                localStorage.setItem('mailnumbers_conta', JSON.stringify(contaEncontrada));
                console.log('✅ Conta salva:', contaEncontrada.text);
            }
        });
        
        return contaEncontrada;
    }
    
    // Função para restaurar conta
    function restaurarConta() {
        const contaSalva = localStorage.getItem('mailnumbers_conta');
        if (!contaSalva) {
            console.log('❌ Nenhuma conta salva');
            return false;
        }
        
        const conta = JSON.parse(contaSalva);
        const selects = document.querySelectorAll('select');
        
        selects.forEach(select => {
            const opcoes = Array.from(select.options);
            const opcaoCorreta = opcoes.find(op => 
                op.value === conta.value || 
                op.textContent.trim() === conta.text ||
                op.textContent.includes(conta.text.split(' ')[0])
            );
            
            if (opcaoCorreta) {
                select.value = opcaoCorreta.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                select.dispatchEvent(new Event('input', { bubbles: true }));
                console.log('🔄 Conta restaurada:', conta.text);
                return true;
            }
        });
        
        return false;
    }
    
    // Adicionar listeners para salvar automaticamente
    function adicionarListeners() {
        const selects = document.querySelectorAll('select');
        selects.forEach(select => {
            select.addEventListener('change', salvarConta);
        });
        console.log('👂 Listeners adicionados para', selects.length, 'selects');
    }
    
    // Tentar restaurar agora
    setTimeout(() => {
        restaurarConta();
        adicionarListeners();
    }, 1000);
    
    // API global
    window.ContaCache = {
        salvar: salvarConta,
        restaurar: restaurarConta,
        limpar: () => {
            localStorage.removeItem('mailnumbers_conta');
            console.log('🗑️ Cache limpo');
        },
        ver: () => {
            const conta = localStorage.getItem('mailnumbers_conta');
            console.log('📋 Conta salva:', conta ? JSON.parse(conta) : 'Nenhuma');
        }
    };
    
    console.log('✅ Cache instalado! Use ContaCache.ver() para verificar');
    
})();