import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      await u.getIdToken(true);
      const { claims } = await u.getIdTokenResult();
      // Admin por custom claim (o primeiro admin, definido via script) OU por ter um doc
      // em admins/{uid} (quem foi adicionado depois, pelo próprio painel) — mesma lógica
      // usada nas regras do Firestore, senão esse admin fica bloqueado só no app.
      let admin = claims.admin === true;
      if (!admin) {
        try {
          const snap = await getDoc(doc(db, "admins", u.uid));
          admin = snap.exists();
        } catch {
          admin = false;
        }
      }
      setIsAdmin(admin);
      setUser(u);
      setLoading(false);
    });
  }, []);

  async function login(email: string, senha: string) {
    await signInWithEmailAndPassword(auth, email, senha);
  }

  async function logout() {
    await firebaseSignOut(auth);
  }

  return <AuthContext.Provider value={{ user, loading, isAdmin, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
