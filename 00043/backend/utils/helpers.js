import crypto from 'crypto';

export const generateId = () => crypto.randomBytes(12).toString('hex');

export const parseJSON = (str, defaultValue = null) => {
  if (!str) return defaultValue;
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
};

export const toJSON = (obj) => {
  if (obj === undefined || obj === null) return null;
  return JSON.stringify(obj);
};

export const formatRow = (row, fieldsToParse = []) => {
  if (!row) return null;
  const formatted = { ...row };
  fieldsToParse.forEach(field => {
    if (formatted[field] !== undefined) {
      formatted[field] = parseJSON(formatted[field], []);
    }
  });
  return formatted;
};

export const formatRows = (rows, fieldsToParse = []) => {
  return rows.map(row => formatRow(row, fieldsToParse));
};
