import { createContext } from "react";
import type { User } from "firebase/auth";

export interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);
