import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchMe, getToken, login as apiLogin, logout as apiLogout, type AuthUser } from "../lib/api";
import { fetchMyProfile } from "../lib/profileApi";

type AuthState = {
  user: AuthUser | null;
  ready: boolean;
  // Photo de profil du compte connecté (règle : le profil signe l'identité).
  photo: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  // Rafraîchit la photo après édition du profil (mise à jour immédiate de l'en-tête).
  refreshPhoto: () => void;
};

const AuthContext = createContext<AuthState>({
  user: null,
  ready: false,
  photo: null,
  login: async () => {},
  logout: async () => {},
  refreshPhoto: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  const refreshPhoto = useCallback(() => {
    fetchMyProfile()
      .then((p) => setPhoto(p.photo))
      .catch(() => setPhoto(null));
  }, []);

  // La photo vit dans le profil (côté Next), pas dans /me : on la charge dès qu'un
  // utilisateur est connu, et on la vide à la déconnexion.
  useEffect(() => {
    if (!user) {
      setPhoto(null);
      return;
    }
    refreshPhoto();
  }, [user, refreshPhoto]);

  const login = useCallback(async (email: string, password: string) => {
    setUser(await apiLogin(email, password));
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, photo, login, logout, refreshPhoto }),
    [user, ready, photo, login, logout, refreshPhoto],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
