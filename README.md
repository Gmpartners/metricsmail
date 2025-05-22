# 📧 MetricsMail API

> Sistema completo de métricas para Email Marketing com integração Mautic

[![API Status](https://img.shields.io/badge/API-Online-green)](https://metrics.devoltaaojogo.com/api)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/Gmpartners/metricsmail)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## 🚀 Visão Geral

MetricsMail é uma API robusta para análise de métricas de email marketing com conexão direta ao Mautic. Oferece busca inteligente, suporte a acentos, autocomplete e sincronização em tempo real.

### ✨ Principais Funcionalidades

- 📊 **Métricas Completas** - Aberturas, cliques, bounces, descadastros
- 🔍 **Busca Inteligente** - Suporte total a acentos e cedilha
- ⚡ **Autocomplete** - Sugestões em tempo real
- 🔗 **Integração Mautic** - Conexão direta com dados atualizados
- 📱 **API RESTful** - Fácil integração com qualquer frontend
- 🎯 **Filtering Avançado** - Por conta, campanha, email específico

## 🌐 Base URL

```
https://metrics.devoltaaojogo.com/api
```

## 🔐 Autenticação

Inclua a API Key em todas as requisições:

```bash
# Header (Recomendado)
x-api-key: MAaDylN2bs0Y01Ep66

# Ou Query Parameter
?apiKey=MAaDylN2bs0Y01Ep66
```

## 🚀 Quick Start

### Buscar Emails por Nome

```bash
curl "https://metrics.devoltaaojogo.com/api/users/teste-certo/emails?search=00-GP-21-ZA-7" \
  -H "x-api-key: MAaDylN2bs0Y01Ep66"
```

### Conectar Diretamente ao Mautic

```bash
curl "https://metrics.devoltaaojogo.com/api/users/teste-certo/accounts/682e5d60a408065db40b8938/mautic/emails?search=Complete" \
  -H "x-api-key: MAaDylN2bs0Y01Ep66"
```

### Obter Métricas Gerais

```bash
curl "https://metrics.devoltaaojogo.com/api/users/teste-certo/metrics" \
  -H "x-api-key: MAaDylN2bs0Y01Ep66"
```

## 📚 Endpoints Principais

### 📊 Métricas

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/users/{userId}/metrics` | GET | Resumo geral de métricas |
| `/users/{userId}/metrics/events` | GET | Eventos específicos (aberturas, cliques) |
| `/users/{userId}/metrics/by-date` | GET | Métricas agrupadas por data |

### 📧 Emails (Database Local)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/users/{userId}/emails` | GET | Listar emails com busca inteligente |
| `/users/{userId}/emails/search/suggestions` | GET | Autocomplete/sugestões |
| `/users/{userId}/emails/{emailId}` | GET | Detalhes de email específico |

### 🔗 Mautic (Conexão Direta)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/users/{userId}/accounts/{accountId}/mautic/emails` | GET | Emails direto do Mautic |
| `/users/{userId}/accounts/{accountId}/mautic/campaigns` | GET | Campanhas do Mautic |

### 🏢 Contas

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/users/{userId}/accounts` | GET | Listar contas |
| `/users/{userId}/accounts/{accountId}` | GET | Detalhes da conta |

## 🔍 Busca Inteligente

### Suporte a Acentos

A API suporta busca com e sem acentos automaticamente:

```bash
# Ambos funcionam
curl "...?search=Promoção"  # Com cedilha
curl "...?search=promocao"  # Sem acentos
```

### Highlighting

Destaque automático dos termos encontrados:

```bash
curl "...?search=GP&highlight=true"
```

**Resposta:**
```json
{
  "highlightedName": "00-<mark>GP</mark>-21-ZA-7"
}
```

## 💻 Exemplos de Código

### JavaScript/Frontend

```javascript
class MetricsMailAPI {
  constructor() {
    this.baseURL = 'https://metrics.devoltaaojogo.com/api';
    this.apiKey = 'MAaDylN2bs0Y01Ep66';
  }
  
  async searchEmails(userId, query, options = {}) {
    const params = new URLSearchParams({
      search: query,
      highlight: options.highlight || 'true',
      ...options
    });
    
    const response = await fetch(
      `${this.baseURL}/users/${userId}/emails?${params}`,
      {
        headers: { 'x-api-key': this.apiKey }
      }
    );
    
    return response.json();
  }
  
  async getMauticEmails(userId, accountId, query = '') {
    const params = query ? `?search=${encodeURIComponent(query)}` : '';
    
    const response = await fetch(
      `${this.baseURL}/users/${userId}/accounts/${accountId}/mautic/emails${params}`,
      {
        headers: { 'x-api-key': this.apiKey }
      }
    );
    
    return response.json();
  }
  
  async getMetrics(userId) {
    const response = await fetch(
      `${this.baseURL}/users/${userId}/metrics`,
      {
        headers: { 'x-api-key': this.apiKey }
      }
    );
    
    return response.json();
  }
}

// Uso
const api = new MetricsMailAPI();

// Buscar emails
const results = await api.searchEmails('teste-certo', '00-GP-21-ZA-7');

// Dados do Mautic
const mauticData = await api.getMauticEmails(
  'teste-certo', 
  '682e5d60a408065db40b8938',
  'Complete'
);

// Métricas gerais
const metrics = await api.getMetrics('teste-certo');
```

### React Hook

```javascript
import { useState, useEffect } from 'react';

function useEmailSearch(userId) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const searchEmails = async (query) => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(
        `https://metrics.devoltaaojogo.com/api/users/${userId}/emails/search/suggestions?q=${encodeURIComponent(query)}`,
        {
          headers: { 'x-api-key': 'MAaDylN2bs0Y01Ep66' }
        }
      );
      
      const data = await response.json();
      setResults(data.data.suggestions || []);
    } catch (error) {
      console.error('Erro na busca:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };
  
  return { results, loading, searchEmails };
}

// Componente
function EmailSearch() {
  const { results, loading, searchEmails } = useEmailSearch('teste-certo');
  const [query, setQuery] = useState('');
  
  useEffect(() => {
    searchEmails(query);
  }, [query]);
  
  return (
    <div>
      <input
        type="text"
        placeholder="Buscar emails..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      
      {loading && <div>Carregando...</div>}
      
      <div className="results">
        {results.map(email => (
          <div key={email.id} className="result-item">
            <h3 dangerouslySetInnerHTML={{ 
              __html: email.highlightedName 
            }} />
            <p dangerouslySetInnerHTML={{ 
              __html: email.highlightedSubject 
            }} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Python

```python
import requests

class MetricsMailAPI:
    def __init__(self):
        self.base_url = "https://metrics.devoltaaojogo.com/api"
        self.api_key = "MAaDylN2bs0Y01Ep66"
        self.headers = {"x-api-key": self.api_key}
    
    def search_emails(self, user_id, query, highlight=True):
        params = {
            "search": query,
            "highlight": str(highlight).lower()
        }
        
        response = requests.get(
            f"{self.base_url}/users/{user_id}/emails",
            headers=self.headers,
            params=params
        )
        
        return response.json()
    
    def get_mautic_emails(self, user_id, account_id, search=None):
        params = {"search": search} if search else {}
        
        response = requests.get(
            f"{self.base_url}/users/{user_id}/accounts/{account_id}/mautic/emails",
            headers=self.headers,
            params=params
        )
        
        return response.json()
    
    def get_metrics(self, user_id):
        response = requests.get(
            f"{self.base_url}/users/{user_id}/metrics",
            headers=self.headers
        )
        
        return response.json()

# Uso
api = MetricsMailAPI()

# Buscar emails
results = api.search_emails('teste-certo', '00-GP-21-ZA-7')

# Métricas
metrics = api.get_metrics('teste-certo')
```

## 📖 Casos de Uso

### 1. Buscar Email por Nome Específico

**Problema:** Encontrar o email "00-GP-21-ZA-7" e suas métricas.

**Solução:**
```bash
# Busca local (mais rápida)
curl "https://metrics.devoltaaojogo.com/api/users/teste-certo/emails?search=00-GP-21-ZA-7&highlight=true"

# Busca no Mautic (sempre atualizada)
curl "https://metrics.devoltaaojogo.com/api/users/teste-certo/accounts/682e5d60a408065db40b8938/mautic/emails?search=00-GP-21-ZA-7"
```

### 2. Implementar Autocomplete

**Problema:** Sugestões em tempo real enquanto o usuário digita.

**Solução:**
```javascript
const getSuggestions = async (query) => {
  const response = await fetch(
    `https://metrics.devoltaaojogo.com/api/users/teste-certo/emails/search/suggestions?q=${query}`,
    { headers: { 'x-api-key': 'MAaDylN2bs0Y01Ep66' } }
  );
  return response.json();
};
```

### 3. Dashboard de Métricas

**Problema:** Exibir resumo geral de performance.

**Solução:**
```bash
curl "https://metrics.devoltaaojogo.com/api/users/teste-certo/metrics"
```

### 4. Rastrear Eventos Específicos

**Problema:** Ver quem clicou em um email específico.

**Solução:**
```bash
curl "https://metrics.devoltaaojogo.com/api/users/teste-certo/metrics/events?eventType=click&emailIds=682e5de0681420552a725ad2"
```

## 🔧 Parâmetros Comuns

### Busca e Filtros

| Parâmetro | Tipo | Descrição | Exemplo |
|-----------|------|-----------|---------|
| `search` | string | Busca por nome, assunto, remetente | `?search=GP-21` |
| `highlight` | boolean | Destacar termos encontrados | `?highlight=true` |
| `accountIds` | string | IDs de contas (separados por vírgula) | `?accountIds=123,456` |
| `campaignIds` | string | IDs de campanhas | `?campaignIds=789` |
| `emailIds` | string | IDs de emails específicos | `?emailIds=abc,def` |

### Paginação

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `limit` | number | 100 | Número de resultados por página |
| `page` | number | 1 | Página atual |

### Eventos

| Parâmetro | Tipo | Descrição | Valores |
|-----------|------|-----------|---------|
| `eventType` | string | Filtrar por tipo de evento | `send`, `open`, `click`, `bounce`, `unsubscribe` |
| `contactEmail` | string | Email do contato específico | `user@example.com` |
| `startDate` | ISO date | Data inicial | `2025-05-01T00:00:00Z` |
| `endDate` | ISO date | Data final | `2025-05-31T23:59:59Z` |

## ⚡ Performance e Boas Práticas

### 1. Cache
- Use cache local para dados que não mudam frequentemente
- TTL recomendado: 5-15 minutos para métricas

### 2. Paginação
- Sempre use `limit` para listas grandes
- Máximo recomendado: 100 itens por página

### 3. Busca Local vs Mautic
- **Local**: Autocomplete, busca rápida, dados históricos
- **Mautic**: Dados sempre atualizados, emails novos

### 4. Rate Limiting
- Respeite os limites da API
- Implemente retry com backoff exponencial

## 🔒 Segurança

- ✅ API Key obrigatória em todas as requisições
- ✅ HTTPS obrigatório
- ✅ CORS configurado
- ✅ Validação de parâmetros
- ✅ Rate limiting implementado

## 📊 Códigos de Status

| Código | Descrição |
|--------|-----------|
| `200` | Sucesso |
| `400` | Erro na requisição (parâmetros inválidos) |
| `401` | Não autorizado (API key inválida) |
| `404` | Recurso não encontrado |
| `429` | Rate limit excedido |
| `500` | Erro interno do servidor |

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 Suporte

- 📧 Email: suporte@devoltaaojogo.com
- 🌐 Website: [https://metrics.devoltaaojogo.com](https://metrics.devoltaaojogo.com)
- 📖 Documentação: [API Docs](https://metrics.devoltaaojogo.com/api)

## 🎯 Roadmap

- [ ] GraphQL Support
- [ ] Webhooks para eventos em tempo real
- [ ] Dashboard Web integrado
- [ ] Exportação para Excel/PDF
- [ ] Integração com outros provedores (Klaviyo, ActiveCampaign)
- [ ] API de relatórios automatizados

---

**MetricsMail** - Transformando dados de email marketing em insights acionáveis 🚀
