/**
 * Utilitários para manipulação de datas
 */

// Pega a data atual no início do dia (00:00:00)
const startOfDay = (date = new Date()) => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

// Pega a data atual no final do dia (23:59:59.999)
const endOfDay = (date = new Date()) => {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};

// Adiciona dias a uma data
const addDays = (date, days) => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
};

// Subtrai dias de uma data
const subDays = (date, days) => {
  return addDays(date, -days);
};

// Formata a data para ISO sem timezone (YYYY-MM-DD)
const formatDateISO = (date = new Date()) => {
  return date.toISOString().split('T')[0];
};

// Formata data para exibição (DD/MM/YYYY)
const formatDateDisplay = (date = new Date()) => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Valida se a string é uma data válida
const isValidDate = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  const timestamp = date.getTime();
  
  if (isNaN(timestamp)) return false;
  
  return date.toISOString().split('T')[0] === dateString;
};

// Retorna o início e fim do período conforme o parâmetro (hoje, ontem, semana, mês, ano)
const getDateRange = (period = 'hoje') => {
  const today = new Date();
  let start, end;
  
  switch (period.toLowerCase()) {
    case 'hoje':
      start = startOfDay(today);
      end = endOfDay(today);
      break;
    case 'ontem':
      start = startOfDay(subDays(today, 1));
      end = endOfDay(subDays(today, 1));
      break;
    case 'semana':
      // Considera início da semana como domingo
      const dayOfWeek = today.getDay();
      start = startOfDay(subDays(today, dayOfWeek));
      end = endOfDay(today);
      break;
    case 'mes':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      start = startOfDay(start);
      end = endOfDay(today);
      break;
    case 'ano':
      start = new Date(today.getFullYear(), 0, 1);
      start = startOfDay(start);
      end = endOfDay(today);
      break;
    default:
      start = startOfDay(today);
      end = endOfDay(today);
  }
  
  return { start, end };
};

// Retorna o formato de agrupamento de data para o MongoDB agregação
const getGroupByDateFormat = (dateField, groupBy) => {
  switch (groupBy) {
    case 'hour':
      return {
        year: { $year: dateField },
        month: { $month: dateField },
        day: { $dayOfMonth: dateField },
        hour: { $hour: dateField }
      };
    case 'day':
      return {
        year: { $year: dateField },
        month: { $month: dateField },
        day: { $dayOfMonth: dateField }
      };
    case 'week':
      return {
        year: { $year: dateField },
        week: { $week: dateField }
      };
    case 'month':
      return {
        year: { $year: dateField },
        month: { $month: dateField }
      };
    default:
      return {
        year: { $year: dateField },
        month: { $month: dateField },
        day: { $dayOfMonth: dateField }
      };
  }
};

// Formata data para visualização baseado no agrupamento
const formatDate = (date, groupBy) => {
  if (!date) return null;
  
  // Verificar se estamos recebendo um objeto do MongoDB (groupBy)
  if (typeof date === 'object' && date !== null) {
    switch (groupBy) {
      case 'hour':
        return `${date.year}-${date.month.toString().padStart(2, '0')}-${date.day.toString().padStart(2, '0')} ${date.hour.toString().padStart(2, '0')}:00`;
      case 'day':
        return `${date.year}-${date.month.toString().padStart(2, '0')}-${date.day.toString().padStart(2, '0')}`;
      case 'week':
        // Formato ano-semana (YYYY-WW)
        return `${date.year}-W${date.week.toString().padStart(2, '0')}`;
      case 'month':
        // Formato ano-mês (YYYY-MM)
        return `${date.year}-${date.month.toString().padStart(2, '0')}`;
      default:
        return `${date.year}-${date.month.toString().padStart(2, '0')}-${date.day.toString().padStart(2, '0')}`;
    }
  }
  
  // Se for uma data regular
  const d = new Date(date);
  return formatDateISO(d);
};

module.exports = {
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  formatDateISO,
  formatDateDisplay,
  isValidDate,
  getDateRange,
  getGroupByDateFormat,
  formatDate
};
