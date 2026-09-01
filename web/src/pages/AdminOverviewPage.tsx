import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PLANS, PLAN_PRICES, planLimit, type PlanId } from "../lib/calc";
import { Tile, CircleChart } from "../components/charts";
import {
  adminListAccounts,
  adminGetDashboardStats,
  adminGetCompanyProfiles,
  adminRenewSubscription,
  adminSetAccountStatus,
  adminDeleteAccount,
  adminListAdmins,
  adminAddAdmin,
  adminRemoveAdmin,
  type AdminAccount,
  type AdminAccountStats,
  type AdminCompanyProfile,
  type AdminEntry,
} from "../lib/adminDb";
import { useAuth } from "../context/useAuth";
import { useDialog } from "../context/useDialog";
import ThemeToggle from "../components/ThemeToggle";
import { LogoutIcon } from "../components/Icons";

function formatBRL(value: number | undefined) {
  return (value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: Date | null | undefined) {
  if (!value) return "-";
  return value.toLocaleDateString("pt-BR");
}

function monthsAndDays(totalDays: number) {
  const months = Math.floor(totalDays / 30);
  const days = totalDays % 30;
  if (months > 0 && days > 0) return `${months} mês(es) e ${days} dia(s)`;
  if (months > 0) return `${months} mês(es)`;
  return `${days} dia(s)`;
}

function daysRemainingLabel(expiresAt: Date | null) {
  if (!expiresAt) return "sem data de vencimento";
  const diffDays = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays > 0) return `faltam ${monthsAndDays(diffDays)}`;
  if (diffDays === 0) return "vence hoje";
  return `vencida há ${monthsAndDays(Math.abs(diffDays))}`;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const maybe = value as { toDate?: () => Date };
  return maybe.toDate?.() ?? null;
}

type StatusKey = "ativo" | "pendente" | "falhou" | "suspenso" | "vencido";

function statusKey(status: string | undefined, isExpired: boolean): StatusKey {
  if (status === "pending_payment") return "pendente";
  if (status === "payment_failed") return "falhou";
  if (status === "suspended") return "suspenso";
  if (isExpired) return "vencido";
  return "ativo";
}

const STATUS_META: Record<StatusKey, { label: string; color: string; bg: string }> = {
  ativo: { label: "Ativo", color: "var(--emerald-400)", bg: "rgba(21,128,61,0.14)" },
  pendente: { label: "Aguardando pagamento", color: "var(--amber-500)", bg: "var(--amber-300)" },
  falhou: { label: "Pagamento falhou", color: "var(--red-400)", bg: "rgba(220,38,38,0.14)" },
  suspenso: { label: "Suspenso", color: "var(--red-400)", bg: "rgba(220,38,38,0.14)" },
  vencido: { label: "Vencido", color: "var(--red-400)", bg: "rgba(220,38,38,0.14)" },
};

function StatusBadge({ status, isExpired }: { status: string | undefined; isExpired: boolean }) {
  const meta = STATUS_META[statusKey(status, isExpired)];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        color: meta.color,
        background: meta.bg,
        whiteSpace: "nowrap",
      }}
    >
      {meta.label}
    </span>
  );
}

function monthlyValue(plan: string | undefined, billingCycle: string | undefined): number {
  if (!plan || plan === "teste" || !(plan in PLAN_PRICES)) return 0;
  const price = PLAN_PRICES[plan as Exclude<PlanId, "teste">][billingCycle === "anual" ? "anual" : "mensal"];
  return billingCycle === "anual" ? price / 12 : price;
}

const PLAN_COLORS: Record<string, string> = {
  teste: "var(--n-600)",
  start: "var(--cat-1)",
  cresce: "var(--cat-3)",
  sem_limite: "var(--cat-5)",
};

function isAccountUrgent(acc: AdminAccount, isExpired: boolean, diffDays: number | null): boolean {
  return acc.status === "payment_failed" || acc.status === "suspended" || isExpired || (diffDays !== null && diffDays <= 3);
}

type Tab = "geral" | "clientes" | "admins";

export default function AdminOverviewPage() {
  const { logout } = useAuth();
  const { confirmDialog, alertDialog } = useDialog();
  const [tab, setTab] = useState<Tab>("geral");
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [stats, setStats] = useState<Record<string, AdminAccountStats>>({});
  const [profiles, setProfiles] = useState<Record<string, AdminCompanyProfile>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | StatusKey>("todos");
  const [planFilter, setPlanFilter] = useState<string>("todos");
  const [sortBy, setSortBy] = useState<"nome" | "vencimento" | "faturado">("nome");
  const [renewMonths, setRenewMonths] = useState<Record<string, number>>({});

  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [adminMsg, setAdminMsg] = useState("");
  const [adminMsgError, setAdminMsgError] = useState(false);
  const [addingAdmin, setAddingAdmin] = useState(false);

  async function loadAdmins() {
    try {
      setAdmins(await adminListAdmins());
    } catch (e) {
      console.error("Falha ao carregar admins", e);
    }
  }

  async function handleAddAdmin(e: FormEvent) {
    e.preventDefault();
    if (!newAdminEmail.trim()) {
      setAdminMsgError(true);
      setAdminMsg("Informe o e-mail.");
      return;
    }
    setAddingAdmin(true);
    setAdminMsg("Adicionando...");
    setAdminMsgError(false);
    try {
      await adminAddAdmin(newAdminEmail.trim());
      setAdminMsg("Admin adicionado! Ele recebe um e-mail pra definir a senha.");
      setNewAdminEmail("");
      await loadAdmins();
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setAdminMsgError(true);
      setAdminMsg("Não foi possível adicionar: " + (err.code || err.message || String(e)));
    } finally {
      setAddingAdmin(false);
    }
  }

  async function handleRemoveAdmin(uid: string) {
    if (!(await confirmDialog("Remover o acesso de admin dessa pessoa?", { confirmLabel: "Remover", tone: "danger" }))) return;
    try {
      await adminRemoveAdmin(uid);
      await loadAdmins();
    } catch (e) {
      console.error("Falha ao remover admin", e);
      await alertDialog("Não foi possível remover.");
    }
  }

  async function loadAccounts() {
    setLoading(true);
    setLoadError("");
    try {
      const accs = await adminListAccounts();
      setAccounts(accs);
      const [statList, profileMap] = await Promise.all([
        adminGetDashboardStats(),
        adminGetCompanyProfiles(accs.map((a) => a.id)),
      ]);
      setStats(Object.fromEntries(statList.map((s) => [s.accountId, s])));
      setProfiles(profileMap);
    } catch (e) {
      console.error("Falha ao carregar contas", e);
      setLoadError("Não foi possível carregar as contas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
    loadAdmins();
  }, []);

  async function handleRenew(accountId: string, months: number) {
    try {
      await adminRenewSubscription(accountId, months);
      await loadAccounts();
    } catch (e) {
      console.error("Falha ao renovar assinatura", e);
      await alertDialog("Não foi possível renovar.");
    }
  }

  async function handleToggleStatus(accountId: string, currentStatus: string | undefined) {
    const next = currentStatus === "active" ? "suspended" : "active";
    if (
      next === "suspended" &&
      !(await confirmDialog("Suspender esta conta? O cliente perde acesso imediatamente.", {
        confirmLabel: "Suspender",
        tone: "danger",
      }))
    )
      return;
    try {
      await adminSetAccountStatus(accountId, next);
      await loadAccounts();
    } catch (e) {
      console.error("Falha ao atualizar status", e);
      await alertDialog("Não foi possível atualizar o status.");
    }
  }

  async function handleDeleteAccount(accountId: string, companyName: string | undefined) {
    if (
      !(await confirmDialog(`Excluir a conta "${companyName || accountId}"? Apaga todas as propostas e dados dela. Não tem como desfazer.`, {
        confirmLabel: "Excluir",
        tone: "danger",
      }))
    )
      return;
    try {
      await adminDeleteAccount(accountId);
      await loadAccounts();
    } catch (e) {
      console.error("Falha ao excluir conta", e);
      await alertDialog("Não foi possível excluir a conta.");
    }
  }

  function displayNameOf(acc: AdminAccount) {
    return profiles[acc.id]?.companyName || acc.companyName || "Sem nome";
  }

  function jumpToClient(acc: AdminAccount) {
    setSearch(displayNameOf(acc));
    setTab("clientes");
  }

  const totals = Object.values(stats).reduce(
    (acc, s) => ({
      totalPropostas: acc.totalPropostas + s.totalPropostas,
      valorTotalFechado: acc.valorTotalFechado + s.valorTotalFechado,
      valorEmAberto: acc.valorEmAberto + s.valorEmAberto,
      googleTotal: acc.googleTotal + s.trafegoPagoGoogle.total,
      googleFechados: acc.googleFechados + s.trafegoPagoGoogle.fechados,
      metaTotal: acc.metaTotal + s.trafegoPagoMeta.total,
      metaFechados: acc.metaFechados + s.trafegoPagoMeta.fechados,
    }),
    { totalPropostas: 0, valorTotalFechado: 0, valorEmAberto: 0, googleTotal: 0, googleFechados: 0, metaTotal: 0, metaFechados: 0 },
  );

  const mrr = accounts.reduce((sum, acc) => (acc.status === "active" ? sum + monthlyValue(acc.plan, acc.billingCycle) : sum), 0);
  const contasAtivas = accounts.filter((a) => a.status === "active").length;

  const planCounts = useMemo(() => {
    const counts: Record<string, number> = { sem_plano: 0 };
    PLANS.forEach((p) => (counts[p.id] = 0));
    accounts.forEach((acc) => {
      const key = acc.plan && acc.plan in counts ? acc.plan : "sem_plano";
      counts[key] += 1;
    });
    return counts;
  }, [accounts]);

  const attentionList = useMemo(() => {
    return accounts
      .map((acc) => {
        const expiresAt = toDate(acc.subscriptionExpiresAt);
        const isExpired = expiresAt ? expiresAt < new Date() : true;
        const diffDays = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
        return { acc, isExpired, urgent: isAccountUrgent(acc, isExpired, diffDays) };
      })
      .filter((x) => x.urgent);
  }, [accounts]);

  const visibleAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts
      .filter((acc) => {
        if (!q) return true;
        const displayName = displayNameOf(acc);
        return displayName.toLowerCase().includes(q) || (acc.email || "").toLowerCase().includes(q);
      })
      .filter((acc) => {
        if (statusFilter === "todos") return true;
        const expiresAt = toDate(acc.subscriptionExpiresAt);
        const isExpired = expiresAt ? expiresAt < new Date() : true;
        return statusKey(acc.status, isExpired) === statusFilter;
      })
      .filter((acc) => planFilter === "todos" || (acc.plan || "sem_plano") === planFilter)
      .sort((a, b) => {
        if (sortBy === "vencimento") {
          const da = toDate(a.subscriptionExpiresAt)?.getTime() ?? Infinity;
          const db_ = toDate(b.subscriptionExpiresAt)?.getTime() ?? Infinity;
          return da - db_;
        }
        if (sortBy === "faturado") {
          return (stats[b.id]?.valorTotalFechado ?? 0) - (stats[a.id]?.valorTotalFechado ?? 0);
        }
        return displayNameOf(a).localeCompare(displayNameOf(b));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, profiles, search, statusFilter, planFilter, sortBy, stats]);

  return (
    <div id="app">
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo
      </a>
      <header className="topbar">
        <div className="brand-area">
          <div className="logo-container">
            <img src="/logo.png" alt="Deal Shot" className="company-logo" />
          </div>
          <div className="brand-info">
            <h1 className="brand">
              Painel <span>Admin</span>
            </h1>
            <p className="subtitle">Contas e relatórios — Deal Shot</p>
          </div>
        </div>
        <div className="nav-area">
          <nav className="tabnav" aria-label="Seções do admin">
            <button type="button" className={`tabbtn${tab === "geral" ? " active" : ""}`} onClick={() => setTab("geral")}>
              Visão geral
            </button>
            <button type="button" className={`tabbtn${tab === "clientes" ? " active" : ""}`} onClick={() => setTab("clientes")}>
              Clientes
            </button>
            <button type="button" className={`tabbtn${tab === "admins" ? " active" : ""}`} onClick={() => setTab("admins")}>
              Administradores
            </button>
          </nav>
          <ThemeToggle />
          <button className="theme-toggle" title="Sair" aria-label="Sair" onClick={() => logout()}>
            <LogoutIcon />
          </button>
        </div>
      </header>

      <main className="main" id="main-content">
        {loading && <p style={{ margin: 16 }}>Carregando...</p>}
        {loadError && (
          <p className="save-msg is-error" style={{ margin: 16 }}>
            {loadError}
          </p>
        )}

        {!loading && !loadError && tab === "geral" && (
          <>
            <div className="hero-mrr">
              <div>
                <p className="hero-mrr-label">Receita mensal recorrente (MRR)</p>
                <p className="hero-mrr-value">{formatBRL(mrr)}</p>
                <p className="microlabel" style={{ color: "inherit", opacity: 0.85 }}>
                  {contasAtivas} conta(s) ativa(s) de {accounts.length} no total
                </p>
              </div>
              <div className="hero-mrr-plans">
                {PLANS.map((p) => (
                  <div key={p.id} className="hero-mrr-plan">
                    <span className="hero-mrr-plan-dot" style={{ background: PLAN_COLORS[p.id] }} />
                    {p.label}: <strong>{planCounts[p.id] ?? 0}</strong>
                  </div>
                ))}
              </div>
            </div>

            {attentionList.length > 0 && (
              <section className="panel attention-panel" style={{ margin: 16, marginBottom: 0 }}>
                <h2 className="panel-title" style={{ color: "var(--red-400)" }}>
                  {attentionList.length} conta(s) precisam de atenção
                </h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {attentionList.map(({ acc, isExpired }) => (
                    <button key={acc.id} type="button" className="attention-chip" onClick={() => jumpToClient(acc)}>
                      {displayNameOf(acc)}
                      <StatusBadge status={acc.status} isExpired={isExpired} />
                    </button>
                  ))}
                </div>
              </section>
            )}

            <div className="chart-grid" style={{ margin: 16 }}>
              <div className="chart-card">
                <p className="chart-title">Distribuição de planos</p>
                <CircleChart hole={0.55} data={PLANS.map((p) => ({ label: p.label, value: planCounts[p.id] ?? 0, color: PLAN_COLORS[p.id] }))} />
              </div>
              <div className="chart-card" style={{ gridColumn: "span 2" }}>
                <p className="chart-title">Atividade dos clientes (todas as contas)</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                  <Tile label="Propostas" value={String(totals.totalPropostas)} />
                  <Tile label="Faturado (fechado)" value={formatBRL(totals.valorTotalFechado)} />
                  <Tile label="Em aberto" value={formatBRL(totals.valorEmAberto)} />
                  <Tile label="Tráfego pago Google" value={`${totals.googleTotal}`} hint={`${totals.googleFechados} fechados`} />
                  <Tile label="Tráfego pago Meta" value={`${totals.metaTotal}`} hint={`${totals.metaFechados} fechados`} />
                </div>
              </div>
            </div>
          </>
        )}

        {!loading && !loadError && tab === "admins" && (
          <section className="panel" style={{ margin: 16 }}>
            <h2 className="panel-title">Administradores</h2>
            <p className="panel-help" style={{ marginTop: 0 }}>
              Pessoas com acesso total ao painel admin. A pessoa recebe um e-mail pra definir a própria senha.
            </p>
            <form onSubmit={handleAddAdmin} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 220 }}>
                <label htmlFor="new-admin-email">E-mail do novo admin</label>
                <input id="new-admin-email" className="input" type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} />
              </div>
              <button className="save-btn" type="submit" disabled={addingAdmin}>
                Adicionar admin
              </button>
            </form>
            <p className={`save-msg${adminMsgError ? " is-error" : ""}`} role="status" aria-live="polite">
              {adminMsg}
            </p>
            {admins.length > 0 && (
              <ul style={{ margin: "8px 0 0", paddingLeft: 0, listStyle: "none" }}>
                {admins.map((a) => (
                  <li key={a.uid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--n-800)" }}>
                    <span>{a.email || a.uid}</span>
                    <button className="link-btn" onClick={() => handleRemoveAdmin(a.uid)} aria-label={`Remover admin ${a.email || a.uid}`}>
                      remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {!loading && !loadError && tab === "clientes" && (
          <section className="panel" style={{ margin: 16 }}>
            <h2 className="panel-title">Clientes</h2>
            <div className="field-grid" style={{ marginBottom: 16 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="account-search" className="microlabel">
                  Buscar cliente
                </label>
                <input
                  id="account-search"
                  className="input"
                  placeholder="Buscar por empresa ou e-mail..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="account-status-filter" className="microlabel">
                  Status
                </label>
                <select id="account-status-filter" className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
                  <option value="todos">Todos</option>
                  <option value="ativo">Ativo</option>
                  <option value="pendente">Aguardando pagamento</option>
                  <option value="falhou">Pagamento falhou</option>
                  <option value="suspenso">Suspenso</option>
                  <option value="vencido">Vencido</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="account-plan-filter" className="microlabel">
                  Plano
                </label>
                <select id="account-plan-filter" className="input" value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
                  <option value="todos">Todos</option>
                  {PLANS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                  <option value="sem_plano">Sem plano</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="account-sort" className="microlabel">
                  Ordenar por
                </label>
                <select id="account-sort" className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
                  <option value="nome">Nome (A-Z)</option>
                  <option value="vencimento">Vencimento mais próximo</option>
                  <option value="faturado">Mais faturado</option>
                </select>
              </div>
            </div>

            <div className="client-rows">
              {accounts.length === 0 && <p>Nenhuma conta ainda.</p>}
              {accounts.length > 0 && visibleAccounts.length === 0 && <p>Nenhuma conta bate com esse filtro.</p>}
              {visibleAccounts.map((acc) => {
                const s = stats[acc.id];
                const profile = profiles[acc.id];
                const displayName = displayNameOf(acc);
                const expiresAt = toDate(acc.subscriptionExpiresAt);
                const isExpired = expiresAt ? expiresAt < new Date() : true;
                const createdAt = toDate(acc.createdAt);
                const isExpanded = expandedId === acc.id;
                const diffDays = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                const urgent = isAccountUrgent(acc, isExpired, diffDays);
                const limit = planLimit(acc.plan);
                const used = s?.orcamentosEsteMes ?? 0;
                return (
                  <div className={`client-row${urgent ? " urgent" : ""}`} key={acc.id}>
                    <div className="client-row-main">
                      {profile?.logoUrl ? (
                        <img className="account-logo" src={profile.logoUrl} alt="" />
                      ) : (
                        <div className="account-logo-placeholder">{(displayName || "?").slice(0, 2).toUpperCase()}</div>
                      )}
                      <div className="client-row-id">
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <strong>{displayName}</strong>
                          <StatusBadge status={acc.status} isExpired={isExpired} />
                        </div>
                        <p className="microlabel">{acc.email}</p>
                      </div>

                      <div className="client-row-plan">
                        <span>{PLANS.find((p) => p.id === acc.plan)?.label || "Sem plano"}</span>
                        <p className="microlabel" style={{ margin: 0 }}>
                          {acc.plan === "teste" ? "sem vencimento" : `${daysRemainingLabel(expiresAt)}`}
                        </p>
                      </div>

                      <div className="client-row-quota">
                        <p className="microlabel" style={{ margin: "0 0 2px" }}>
                          Orçamentos: {used}
                          {limit != null ? `/${limit}` : " (ilimitado)"}
                        </p>
                        {limit != null && (
                          <div className="checklist-progress-track">
                            <div
                              className="checklist-progress-fill"
                              style={{ width: `${Math.min(100, (used / limit) * 100)}%`, background: used >= limit ? "var(--red-400)" : "var(--amber-400)" }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="client-row-money">
                        <p className="microlabel" style={{ margin: 0 }}>
                          Faturado
                        </p>
                        <strong>{formatBRL(s?.valorTotalFechado)}</strong>
                      </div>

                      <div className="client-row-actions">
                        <Link className="icon-action-btn primary" to={`/admin/contas/${acc.id}`} target="_blank" rel="noopener">
                          Ver como cliente
                        </Link>
                        <button className="icon-action-btn" onClick={() => setExpandedId(isExpanded ? null : acc.id)} aria-expanded={isExpanded}>
                          {isExpanded ? "▲" : "▼"}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="client-row-expanded">
                        <div className="account-card-meta" style={{ marginBottom: 12 }}>
                          <span>Propostas: {s?.totalPropostas ?? 0}</span>
                          <span>Abertas: {s?.abertas ?? 0}</span>
                          <span>Em aberto: {formatBRL(s?.valorEmAberto)}</span>
                          <span>Fechados: {s?.fechados ?? 0}</span>
                        </div>
                        <div className="account-card-details" style={{ marginTop: 0, borderTop: "none", paddingTop: 0 }}>
                          <div>
                            <p className="microlabel">Cliente desde</p>
                            <p>{formatDate(createdAt)}</p>
                          </div>
                          <div>
                            <p className="microlabel">Última atividade</p>
                            <p>{formatDate(s?.lastActivity)}</p>
                          </div>
                          <div>
                            <p className="microlabel">Taxa de conversão</p>
                            <p>{(s?.taxaConversao ?? 0).toFixed(0)}%</p>
                          </div>
                          <div>
                            <p className="microlabel">Ticket médio (fechados)</p>
                            <p>{formatBRL(s?.ticketMedio)}</p>
                          </div>
                          <div>
                            <p className="microlabel">Propostas perdidas</p>
                            <p>{s?.perdidos ?? 0}</p>
                          </div>
                          <div>
                            <p className="microlabel">Tráfego pago — Google</p>
                            <p>
                              {s?.trafegoPagoGoogle.total ?? 0} propostas ({s?.trafegoPagoGoogle.fechados ?? 0} fechadas)
                            </p>
                          </div>
                          <div>
                            <p className="microlabel">Tráfego pago — Meta</p>
                            <p>
                              {s?.trafegoPagoMeta.total ?? 0} propostas ({s?.trafegoPagoMeta.fechados ?? 0} fechadas)
                            </p>
                          </div>
                          <div>
                            <p className="microlabel">ID da conta</p>
                            <p style={{ fontSize: 11, wordBreak: "break-all" }}>{acc.id}</p>
                          </div>
                        </div>
                        <div className="account-actions-row" style={{ marginTop: 14 }}>
                          <span className="renew-inline">
                            <input
                              className="input"
                              type="number"
                              min={1}
                              value={renewMonths[acc.id] ?? 1}
                              onChange={(e) => setRenewMonths((m) => ({ ...m, [acc.id]: Number(e.target.value) || 1 }))}
                            />
                            <button className="icon-action-btn" onClick={() => handleRenew(acc.id, renewMonths[acc.id] ?? 1)}>
                              Renovar mês(es)
                            </button>
                          </span>
                          <button
                            className={`icon-action-btn${acc.status === "active" ? " danger-filled" : ""}`}
                            onClick={() => handleToggleStatus(acc.id, acc.status)}
                          >
                            {acc.status === "active" ? "Suspender" : "Ativar"}
                          </button>
                          <button className="icon-action-btn danger" onClick={() => handleDeleteAccount(acc.id, displayName)}>
                            Excluir conta
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
