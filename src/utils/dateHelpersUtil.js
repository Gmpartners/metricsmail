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

module.exports = {
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  formatDateISO,
  formatDateDisplay,
  isValidDate,
  getDateRange
};