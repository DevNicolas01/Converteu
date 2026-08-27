import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export default function SignupPage() {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) {
      setError("Informe o nome da empresa.");
      return;
    }
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = cred.user.uid;
      await setDoc(doc(db, "accounts", uid), {
        companyName: companyName.trim(),
        email: email.trim(),
        ownerUid: uid,
        status: "pending_payment",
        createdAt: Timestamp.now(),
      });

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: uid, email: email.trim() }),
      });
      if (!res.ok) throw new Error("Falha ao iniciar pagamento");
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error("Falha no cadastro", err);
      const code = (err as { code?: string }).code;
      if (code === "auth/email-already-in-use") {
        setError("Já existe uma conta com esse e-mail. Faça login.");
      } else {
        setError("Não foi possível criar a conta. Tente novamente.");
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <form className="panel auth-panel" onSubmit={handleSubmit}>
        <h2 className="panel-title">Criar conta</h2>
        <p className="panel-help" style={{ marginTop: 0 }}>
          Depois de criar a conta, você vai pra tela de pagamento pra ativar a assinatura.
        </p>
        <div className="field">
          <label htmlFor="signup-company">Nome da empresa</label>
          <input id="signup-company" className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="signup-email">E-mail</label>
          <input
            id="signup-email"
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="signup-password">Senha</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="signup-password"
              className="input"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="link-btn"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              style={{ whiteSpace: "nowrap" }}
            >
              {showPassword ? "Ocultar" : "Ver"}
            </button>
          </div>
        </div>
        <button className="save-btn" type="submit" style={{ width: "100%" }} disabled={submitting}>
          {submitting ? "Criando..." : "Criar conta e ir pro pagamento"}
        </button>
        <p className="save-msg" role="alert" aria-live="assertive">
          {error}
        </p>
        <p className="panel-help" style={{ textAlign: "center" }}>
          Já tem conta? <Link to="/">Entrar</Link>
        </p>
      </form>
    </div>
  );
}
