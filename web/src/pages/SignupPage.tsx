import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { saveCompanyProfile } from "../lib/db";
import { formatCpfCnpj, formatBRL } from "../lib/calc";
import { EyeIcon, EyeOffIcon } from "../components/Icons";

// Teste de oferta: preço único, sem planos/limites, pra validar se o app vende antes de
// reativar a grade de planos normal (Start/Converte/Ilimitado). O checkout roda na Kiwify em
// vez do Asaas -- assim que o Nicolas mandar o link, cola aqui.
const OFERTA_PRECO = 27.9;
const KIWIFY_CHECKOUT_URL = "";

export default function SignupPage() {
  const [companyName, setCompanyName] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) {
      setError("Informe o nome da empresa.");
      return;
    }
    if (cpfCnpj.replace(/\D/g, "").length < 11) {
      setError("Informe um CPF ou CNPJ válido.");
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
        // "sem_limite" pra não travar orçamento nenhum durante o teste da oferta -- sem
        // cobrança automática ainda, então fica "pending_payment" até confirmar o pagamento
        // na Kiwify e ativar a conta pelo painel admin.
        plan: "sem_limite",
        billingCycle: "mensal",
        status: "pending_payment",
        subscriptionExpiresAt: null,
        createdAt: Timestamp.now(),
      });
      // Já aproveita o nome e o CNPJ/CPF que ele acabou de digitar, pra não pedir de novo
      // na primeira vez que entrar no app.
      await saveCompanyProfile(uid, { companyName: companyName.trim(), cnpj: cpfCnpj.trim() });
    } catch (err) {
      console.error("Falha ao criar a conta", err);
      const code = (err as { code?: string }).code;
      if (code === "auth/email-already-in-use") {
        setError("Já existe uma conta com esse e-mail. Faça login.");
      } else {
        setError("Não foi possível criar a conta. Tente novamente.");
      }
      setSubmitting(false);
      return;
    }

    // A conta já existe nesse ponto (login + doc criados) -- se não tiver link da Kiwify
    // configurado ainda, manda pro app, que mostra a tela de "assinatura pendente".
    if (KIWIFY_CHECKOUT_URL) {
      window.location.href = KIWIFY_CHECKOUT_URL;
    } else {
      navigate("/");
    }
  }

  return (
    <div className="auth-screen">
      <form className="panel auth-panel signup-panel" onSubmit={handleSubmit}>
        <h2 className="panel-title">Criar conta</h2>
        <p className="panel-help" style={{ marginTop: 0 }}>
          Acesso completo: calculadora, propostas com funil, PDF profissional e gráficos de resultados.
        </p>

        <div className="offer-card">
          <span className="offer-card-badge">Oferta de lançamento</span>
          <span className="offer-card-price">
            {formatBRL(OFERTA_PRECO)}
            <span className="offer-card-period">/mês</span>
          </span>
          <span className="offer-card-note">Sem limite de orçamentos, sem pegadinha.</span>
        </div>

        <div className="field">
          <label htmlFor="signup-company">Nome da empresa</label>
          <input id="signup-company" className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="signup-cpfcnpj">CPF ou CNPJ</label>
          <input
            id="signup-cpfcnpj"
            className="input"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cpfCnpj}
            onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
            required
          />
          <p className="panel-help" style={{ margin: "4px 0 0" }}>
            Necessário pra gerar a cobrança.
          </p>
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
              className="theme-toggle"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>
        <button className="save-btn signup-cta" type="submit" style={{ width: "100%" }} disabled={submitting}>
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
