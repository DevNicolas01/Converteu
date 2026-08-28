import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { saveCompanyProfile } from "../lib/db";
import { PLANS, PLAN_PRICES, formatBRL, formatCpfCnpj, type PlanId, type BillingCycle } from "../lib/calc";
import { EyeIcon, EyeOffIcon } from "../components/Icons";

const FAR_FUTURE = new Date();
FAR_FUTURE.setFullYear(FAR_FUTURE.getFullYear() + 100);

export default function SignupPage() {
  const [companyName, setCompanyName] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [plan, setPlan] = useState<PlanId>("start");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("mensal");
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

    let uid: string;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      uid = cred.user.uid;
      await setDoc(doc(db, "accounts", uid), {
        companyName: companyName.trim(),
        email: email.trim(),
        ownerUid: uid,
        plan,
        billingCycle,
        status: plan === "teste" ? "active" : "pending_payment",
        subscriptionExpiresAt: plan === "teste" ? Timestamp.fromDate(FAR_FUTURE) : null,
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

    if (plan === "teste") {
      navigate("/");
      return;
    }

    // A conta já existe nesse ponto (login + doc criados). Se o pagamento falhar aqui,
    // não é mais um erro de cadastro — manda pro app, que mostra a tela de "Assinar agora".
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: uid,
          email: email.trim(),
          name: companyName.trim(),
          cpfCnpj: cpfCnpj.replace(/\D/g, ""),
          plan,
          billingCycle,
        }),
      });
      if (!res.ok) throw new Error("Falha ao iniciar pagamento");
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error("Conta criada, mas falhou ao iniciar o pagamento", err);
      navigate("/");
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
            Necessário pra gerar a cobrança da assinatura.
          </p>
        </div>
        <fieldset className="field" style={{ border: "none", padding: 0, margin: 0 }}>
          <legend className="panel-help" style={{ padding: 0, marginBottom: 6 }}>
            Escolha o plano
          </legend>
          {PLANS.map((p) => {
            const price = p.id === "teste" ? 0 : PLAN_PRICES[p.id][billingCycle];
            return (
              <label
                key={p.id}
                className="input"
                style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer" }}
              >
                <input type="radio" name="plan" value={p.id} checked={plan === p.id} onChange={() => setPlan(p.id)} />
                <span style={{ flex: 1 }}>
                  {p.label} <span className="microlabel">({p.limit ? `até ${p.limit}/mês` : "ilimitado"})</span>
                </span>
                <strong>
                  {price === 0
                    ? "Grátis"
                    : billingCycle === "anual"
                      ? `${formatBRL(price)}/ano`
                      : `${formatBRL(price)}/mês`}
                </strong>
              </label>
            );
          })}
        </fieldset>
        {plan !== "teste" && (
          <div className="field">
            <label htmlFor="signup-cycle">Cobrança</label>
            <select
              id="signup-cycle"
              className="input"
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
            >
              <option value="mensal">Mensal</option>
              <option value="anual">Anual (10x o valor do mês, com desconto)</option>
            </select>
          </div>
        )}
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
        <button className="save-btn" type="submit" style={{ width: "100%" }} disabled={submitting}>
          {submitting ? "Criando..." : plan === "teste" ? "Criar conta grátis" : "Criar conta e ir pro pagamento"}
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
