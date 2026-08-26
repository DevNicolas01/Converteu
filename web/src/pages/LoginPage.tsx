import { useState, type FormEvent } from "react";
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
          <>
            <p className="panel-help" style={{ marginTop: 0 }}>
              Acesso por conta — fale com o suporte se ainda não tem um login.
            </p>
            <p className="panel-help" style={{ marginTop: 0 }}>
              +55 (61) 99861-5779 {"<->"} @marketingparalimpeza
            </p>
          </>
        )}
        <div className="field">
          <label>E-mail</label>
          <input
            className="input"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Senha</label>
          <input
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
        <p className="save-msg">{error}</p>
      </form>
    </div>
  );
}
