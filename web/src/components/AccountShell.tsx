import { useEffect, useState } from "react";
import {
  getAccountStatus,
  listProposals,
  createProposal,
  updateProposal,
  deleteProposal,
  getCompanyProfile,
  saveCompanyProfile,
  uploadCompanyLogo,
  type AccountStatus,
  type CompanyProfile,
} from "../lib/db";
import { useAuth } from "../context/AuthContext";
import { isThisMonth, planLimit, PLANS, type Deal } from "../lib/calc";
import QuoteForm from "./QuoteForm";
import ProposalsBoard from "./ProposalsBoard";
import SalesOverview from "./SalesOverview";
import CompanySetupForm from "./CompanySetupForm";
import ThemeToggle from "./ThemeToggle";
import Modal from "./Modal";
import { UserIcon, LogoutIcon } from "./Icons";

type Tab = "calc" | "funil" | "painel";

export default function AccountShell({ accountId, asAdmin = false }: { accountId: string; asAdmin?: boolean }) {
  const { logout } = useAuth();
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loadErr, setLoadErr] = useState("");
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [tab, setTab] = useState<Tab>("calc");
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [showCompanyEditor, setShowCompanyEditor] = useState(false);

  async function loadAll() {
    const s = await getAccountStatus(accountId);
    setStatus(s);
    if (!s.isActiveAndValid) return;
    const [profile, proposals] = await Promise.all([getCompanyProfile(accountId), listProposals(accountId)]);
    setCompany(profile);
    setDeals(proposals as unknown as Deal[]);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadAll();
      } catch (e) {
        console.error("Falha ao carregar conta", e);
        if (!cancelled) setLoadErr("Não foi possível carregar essa conta.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  if (loadErr) {
    return (
      <div className="auth-screen">
        <div className="panel auth-panel">
          <h2 className="panel-title">Erro</h2>
          <p className="panel-help">{loadErr}</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="auth-screen">
        <div className="panel auth-panel">
          <p className="panel-help">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!status.isActiveAndValid) {
    const rawStatus = (status as { status?: string }).status;
    const needsPayment = rawStatus === "pending_payment" || rawStatus === "payment_failed";
    const blockedMessage = rawStatus === "pending_payment"
      ? "Falta confirmar o pagamento pra ativar sua conta."
      : rawStatus === "payment_failed"
        ? "A última cobrança não passou. Atualize o pagamento pra continuar usando."
        : status.isSuspended
          ? "Conta suspensa. Fale com o suporte para reativar."
          : "Assinatura vencida. Fale com o suporte para renovar.";
    return (
      <div className="auth-screen">
        <div className="panel auth-panel">
          <h2 className="panel-title">Acesso bloqueado</h2>
          <p className="panel-help">{blockedMessage}</p>
          {needsPayment && !asAdmin && (
            <button
              className="save-btn"
              style={{ width: "100%", marginBottom: 8 }}
              disabled={startingCheckout}
              onClick={async () => {
                setStartingCheckout(true);
                try {
                  const res = await fetch("/api/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      accountId,
                      email: status.email,
                      plan: status.plan || "start",
                      billingCycle: status.billingCycle || "mensal",
                    }),
                  });
                  const { url } = await res.json();
                  window.location.href = url;
                } catch {
                  setStartingCheckout(false);
                  alert("Não foi possível abrir o pagamento. Tente de novo.");
                }
              }}
            >
              {startingCheckout ? "Abrindo pagamento..." : "Assinar agora"}
            </button>
          )}
          {!asAdmin && (
            <button className="save-btn" style={{ width: "100%" }} onClick={() => logout()}>
              Sair
            </button>
          )}
        </div>
      </div>
    );
  }

  async function handleSaveCompany(data: Omit<CompanyProfile, "logoUrl">, file: File | null) {
    await saveCompanyProfile(accountId, data);
    // Salva os dados de texto primeiro, independente da logo — assim uma falha só no envio
    // da imagem (ex: sem internet no momento) não faz parecer que nada foi salvo.
    setCompany(await getCompanyProfile(accountId));
    if (file) {
      await uploadCompanyLogo(accountId, file);
      setCompany(await getCompanyProfile(accountId));
    }
    setShowCompanyEditor(false);
  }

  const companyIncomplete = !!company && (!company.companyName || !company.endereco || !company.telefone || !company.logoUrl);

  async function handleSaveDeal(deal: Deal) {
    if (deal.id) {
      await updateProposal(accountId, deal.id, deal);
    } else {
      const limit = planLimit(status?.plan);
      const usados = deals.filter((d) => isThisMonth(d.createdAt)).length;
      if (limit != null && usados >= limit) {
        alert(
          `Você atingiu o limite de ${limit} orçamentos neste mês do plano ${PLANS.find((p) => p.id === status?.plan)?.label || "atual"}. Faça upgrade pra continuar criando orçamentos.`,
        );
        return;
      }
      await createProposal(accountId, { ...deal, obraNumero: deals.length + 1 });
    }
    setEditingDeal(null);
    const proposals = await listProposals(accountId);
    setDeals(proposals as unknown as Deal[]);
  }

  async function handleChangeStage(deal: Deal, stage: string) {
    const patch: Partial<Deal> = { stage };
    if (stage === "fechado" && !deal.closedAt) patch.closedAt = new Date().toISOString();
    if (stage === "aguardando" && !deal.sentAt) patch.sentAt = new Date().toISOString();
    const updated = { ...deal, ...patch };
    await updateProposal(accountId, deal.id!, updated);
    setDeals((ds) => ds.map((d) => (d.id === deal.id ? updated : d)));
  }

  async function handleSetFollowUpDate(deal: Deal, date: string) {
    const updated = { ...deal, followUpDate: date };
    await updateProposal(accountId, deal.id!, updated);
    setDeals((ds) => ds.map((d) => (d.id === deal.id ? updated : d)));
  }

  async function handleSetPago(deal: Deal, pago: boolean) {
    const updated = { ...deal, pago };
    await updateProposal(accountId, deal.id!, updated);
    setDeals((ds) => ds.map((d) => (d.id === deal.id ? updated : d)));
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta proposta?")) return;
    await deleteProposal(accountId, id);
    setDeals((ds) => ds.filter((d) => d.id !== id));
  }

  return (
    <div id="app">
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo
      </a>
      {asAdmin && (
        <div style={{ background: "#7c3aed", color: "#fff", textAlign: "center", padding: "8px 12px", fontSize: 13 }}>
          Você está vendo o painel como o cliente <strong>{company?.companyName || status.companyName || status.email}</strong> (modo admin).{" "}
          <a href="/admin" style={{ color: "#fff", textDecoration: "underline", marginLeft: 8 }}>
            Voltar ao painel admin
          </a>
        </div>
      )}
      <header className="topbar">
        <div className="brand-area">
          <div className="logo-container">
            <img src="/arrowshot-logo.png" alt="Arrow Shot" className="company-logo" />
          </div>
          <div className="brand-info">
            <h1 className="brand">
              Conv<span>erteu</span>
            </h1>
            <p className="subtitle">Orçamentos para você!</p>
          </div>
        </div>
        <div className="nav-area">
          <nav className="tabnav" aria-label="Seções do painel">
            <button className={`tabbtn${tab === "calc" ? " active" : ""}`} aria-current={tab === "calc" ? "page" : undefined} onClick={() => setTab("calc")}>
              Calculadora
            </button>
            <button className={`tabbtn${tab === "funil" ? " active" : ""}`} aria-current={tab === "funil" ? "page" : undefined} onClick={() => setTab("funil")}>
              Propostas
            </button>
            <button className={`tabbtn${tab === "painel" ? " active" : ""}`} aria-current={tab === "painel" ? "page" : undefined} onClick={() => setTab("painel")}>
              Resultados
            </button>
          </nav>
          <ThemeToggle />
          <button className="theme-toggle" title="Perfil" aria-label="Perfil" onClick={() => setShowCompanyEditor(true)}>
            <UserIcon />
          </button>
          {!asAdmin && (
            <button className="theme-toggle" title="Sair" aria-label="Sair" onClick={() => logout()}>
              <LogoutIcon />
            </button>
          )}
        </div>
      </header>

      {showCompanyEditor && company && (
        <Modal onClose={() => setShowCompanyEditor(false)}>
          <CompanySetupForm
            bare
            initial={company}
            onCancel={() => setShowCompanyEditor(false)}
            onSave={handleSaveCompany}
          />
        </Modal>
      )}

      <main className="main" id="main-content">
        {tab === "calc" && companyIncomplete && (
          <div className="hint-banner" role="status">
            <span>Coloque os dados da sua empresa pra aparecer no PDF dos orçamentos.</span>
            <button
              type="button"
              onClick={() => setShowCompanyEditor(true)}
              style={{ fontSize: 12, whiteSpace: "nowrap", border: "1px solid var(--amber-500)", borderRadius: 6, padding: "4px 10px" }}
            >
              Completar perfil
            </button>
          </div>
        )}
        {tab === "calc" && (
          <QuoteForm
            key={editingDeal?.id || "new"}
            initialDeal={editingDeal}
            company={company || {}}
            obraNumero={deals.length + 1}
            onSave={handleSaveDeal}
            onCancelEdit={() => setEditingDeal(null)}
          />
        )}
        {tab === "funil" && (
          <ProposalsBoard
            deals={deals}
            company={company || {}}
            onEdit={(deal) => {
              setEditingDeal(deal);
              setTab("calc");
            }}
            onDelete={handleDelete}
            onChangeStage={handleChangeStage}
            onSetFollowUpDate={handleSetFollowUpDate}
            onSetPago={handleSetPago}
          />
        )}
        {tab === "painel" && <SalesOverview deals={deals} />}
      </main>
    </div>
  );
}
