import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchMe, getToken, logout as apiLogout, syncSessionCookie, type AuthUser } from "../lib/api";
import { fetchMyProfile } from "../lib/profileApi";

type AuthState = {
  user: AuthUser | null;
  ready: boolean;
  // Photo de profil du compte connecté (règle : le profil signe l'identité).
  photo: string | null;
  // Ouvre la session après une connexion réussie (code e-mail ou Google).
  signIn: (user: AuthUser) => void;
  logout: () => Promise<void>;
  // Rafraîchit la photo après édition du profil (mise à jour immédiate de l'en-tête).
  refreshPhoto: () => void;
};

const AuthContext = createContext<AuthState>({
  user: null,
  ready: false,
  photo: null,
  signIn: () => {},
  logout: async () => {},
  refreshPhoto: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    syncSessionCookie(token);
    if (!token) {
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

  const signIn = useCallback((u: AuthUser) => setUser(u), []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, photo, signIn, logout, refreshPhoto }),
    [user, ready, photo, signIn, logout, refreshPhoto],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
