import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage({ adminHint = false }: { adminHint?: boolean }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, senha);
    } catch {
      setError("E-mail ou senha inválidos.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <form className="panel auth-panel" onSubmit={handleSubmit}>
        <h2 className="panel-title">{adminHint ? "Entrar como admin" : "Entrar"}</h2>
        {!adminHint && (
          <p className="panel-help" style={{ marginTop: 0 }}>
            Ainda não tem conta? <Link to="/signup">Criar conta</Link>
          </p>
        )}
        <div className="field">
          <label htmlFor="login-email">E-mail</label>
          <input
            id="login-email"
            className="input"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="login-password">Senha</label>
          <input
            id="login-password"
            className="input"
            type="password"
            autoComplete="current-password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>
        <button className="save-btn" type="submit" style={{ width: "100%" }} disabled={submitting}>
          Entrar
        </button>
        <p className="save-msg" role="alert" aria-live="assertive">
          {error}
        </p>
      </form>
    </div>
  );
}
