const parseHourToMinutes = (value) => {
  if (value === null || value === undefined || value === '') return 0;

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return 0;

  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?|am|pm)?$/i);
  if (!match) {
    const fallback = normalized.includes(':') ? normalized.split(':') : [normalized, '00'];
    const [hours, minutes] = fallback.map(Number);
    return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2] || '0');
  const meridiem = (match[3] || '').toLowerCase();

  if (meridiem.includes('p') && hours < 12) hours += 12;
  if (meridiem.includes('a') && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

const normalizeSurveyDate = (value) => {
  if (!value && value !== 0) return null;

  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const isoLike = trimmed.match(/^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(:\d{2})?)?$/);
    if (isoLike) {
      const dateOnly = new Date(trimmed.includes('T') || trimmed.includes(' ') ? trimmed : `${trimmed}T00:00:00`);
      return Number.isNaN(dateOnly.getTime()) ? null : dateOnly;
    }

    const localDate = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (localDate) {
      const [, day, month, year] = localDate;
      const normalizedDate = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
      return Number.isNaN(normalizedDate.getTime()) ? null : normalizedDate;
    }

    const date = new Date(trimmed);
    if (!Number.isNaN(date.getTime())) return date;
  }

  return null;
};

export const buildSurveyDateTime = (dateValue, timeValue, fallbackTime = '00:00') => {
  const baseDate = normalizeSurveyDate(dateValue);
  if (!baseDate) return null;

  const date = new Date(baseDate.getTime());
  const minutes = parseHourToMinutes(timeValue || fallbackTime);
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
};

export const isSurveyInTimeWindow = (survey, now = new Date()) => {
  if (!survey) return false;

  const startDate = buildSurveyDateTime(survey.fechaInicio, survey.horaInicio || '00:00');
  const endDate = buildSurveyDateTime(survey.fechaFin, survey.horaFin || '23:59');

  if (!startDate || !endDate) return false;

  return now >= startDate && now < endDate;
};

export const isSurveyTimeExpired = (survey, now = new Date()) => {
  if (!survey) return false;

  const endDate = buildSurveyDateTime(survey.fechaFin, survey.horaFin || '23:59');
  if (!endDate) return false;

  return now >= endDate;
};
