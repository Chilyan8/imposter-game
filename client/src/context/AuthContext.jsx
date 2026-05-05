import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    const pseudo = localStorage.getItem('pseudo');
    const isGuest = localStorage.getItem('isGuest') === 'true';
    if (token && pseudo) return { token, pseudo, isGuest };
    return null;
  });

  const login = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('pseudo', data.pseudo);
    localStorage.setItem('isGuest', data.isGuest);
    setUser(data);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
