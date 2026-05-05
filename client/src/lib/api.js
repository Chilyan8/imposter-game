const BASE = import.meta.env.VITE_SERVER_URL || '';

export const apiFetch = (path, options = {}) => {
  return fetch(`${BASE}${path}`, options);
};
