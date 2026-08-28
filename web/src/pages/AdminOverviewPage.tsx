import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PLANS, PLAN_PRICES, planLimit, type PlanId } from "../lib/calc";
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
import { useAuth } from "../context/AuthContext";
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
  const key = statusKey(status, isExpired);
  const meta = STATUS_META[key];
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

export default function AdminOverviewPage() {
  const { logout } = useAuth();
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
    if (!confirm("Remover o acesso de admin dessa pessoa?")) return;
    try {
      await adminRemoveAdmin(uid);
      await loadAdmins();
    } catch (e) {
      console.error("Falha ao remover admin", e);
      alert("Não foi possível remover.");
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
      alert("Não foi possível renovar.");
    }
  }

  async function handleToggleStatus(accountId: string, currentStatus: string | undefined) {
    const next = currentStatus === "active" ? "suspended" : "active";
    if (next === "suspended" && !confirm("Suspender esta conta? O cliente perde acesso imediatamente.")) return;
    try {
      await adminSetAccountStatus(accountId, next);
      await loadAccounts();
    } catch (e) {
      console.error("Falha ao atualizar status", e);
      alert("Não foi possível atualizar o status.");
    }
  }

  async function handleDeleteAccount(accountId: string, companyName: string | undefined) {
    if (!confirm(`Excluir a conta "${companyName || accountId}"? Apaga todas as propostas e dados dela. Não tem como desfazer.`)) return;
    try {
      await adminDeleteAccount(accountId);
      await loadAccounts();
    } catch (e) {
      console.error("Falha ao excluir conta", e);
      alert("Não foi possível excluir a conta.");
    }
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

  const planCounts = useMemo(() => {
    const counts: Record<string, number> = { sem_plano: 0 };
    PLANS.forEach((p) => (counts[p.id] = 0));
    accounts.forEach((acc) => {
      const key = acc.plan && acc.plan in counts ? acc.plan : "sem_plano";
      counts[key] += 1;
    });
    return counts;
  }, [accounts]);

  const visibleAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts
      .filter((acc) => {
        if (!q) return true;
        const displayName = profiles[acc.id]?.companyName || acc.companyName || "";
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
        const nameA = profiles[a.id]?.companyName || a.companyName || "";
        const nameB = profiles[b.id]?.companyName || b.companyName || "";
        return nameA.localeCompare(nameB);
      });
  }, [accounts, profiles, search, statusFilter, planFilter, sortBy, stats]);

  return (
    <div id="app">
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo
      </a>
      <header className="topbar">
        <div className="brand-area">
          <div className="logo-container">
            <img src="/arrowshot-logo.png" alt="Arrow Shot" className="company-logo" />
          </div>
          <div className="brand-info">
            <h1 className="brand">
              Painel <span>Admin</span>
            </h1>
            <p className="subtitle">Contas e relatórios — Converteu</p>
          </div>
        </div>
        <div className="nav-area">
          <ThemeToggle />
          <button className="theme-toggle" title="Sair" aria-label="Sair" onClick={() => logout()}>
            <LogoutIcon />
          </button>
        </div>
      </header>

      <main className="main" id="main-content">
        <p className="eyebrow" style={{ margin: "16px 16px 8px" }}>
          Assinaturas
        </p>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, margin: "0 16px 16px" }}>
          <div className="metric-card">
            <p className="metric-label">MRR (receita mensal recorrente)</p>
            <p className="metric-value">{formatBRL(mrr)}</p>
            <p className="microlabel" style={{ marginTop: 4 }}>
              só contas ativas, planos pagos normalizados por mês
            </p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Contas</p>
            <p className="metric-value">{accounts.length}</p>
          </div>
          {PLANS.map((p) => (
            <div className="metric-card" key={p.id}>
              <p className="metric-label">{p.label}</p>
              <p className="metric-value">{planCounts[p.id] ?? 0}</p>
            </div>
          ))}
        </section>

        <p className="eyebrow" style={{ margin: "0 16px 8px" }}>
          Atividade dos clientes
        </p>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, margin: 16, marginBottom: 0 }}>
          <div className="metric-card">
            <p className="metric-label">Propostas (todas as contas)</p>
            <p className="metric-value">{totals.totalPropostas}</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Faturado (fechado)</p>
            <p className="metric-value">{formatBRL(totals.valorTotalFechado)}</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Em aberto</p>
            <p className="metric-value">{formatBRL(totals.valorEmAberto)}</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Tráfego pago Google (fechados)</p>
            <p className="metric-value">
              {totals.googleTotal} <span style={{ fontSize: 13, fontWeight: 400 }}>({totals.googleFechados} fechados)</span>
            </p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Tráfego pago Meta (fechados)</p>
            <p className="metric-value">
              {totals.metaTotal} <span style={{ fontSize: 13, fontWeight: 400 }}>({totals.metaFechados} fechados)</span>
            </p>
          </div>
        </section>
        <p className="microlabel" style={{ margin: "0 16px 8px" }}>
          Propostas com origem "Tráfego pago" que o cliente marcou como Google ou Meta — mostra se os anúncios estão convertendo.
        </p>

        <section className="panel" style={{ margin: 16, marginBottom: 0 }}>
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
                <li key={a.uid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderTop: "1px solid var(--n-800)" }}>
                  <span>{a.email || a.uid}</span>
                  <button className="link-btn" onClick={() => handleRemoveAdmin(a.uid)} aria-label={`Remover admin ${a.email || a.uid}`}>
                    remover
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

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
          {loading && <p>Carregando...</p>}
          {loadError && <p className="save-msg is-error">{loadError}</p>}
          {!loading && !loadError && (
            <div className="admin-accounts-grid">
              {accounts.length === 0 && <p>Nenhuma conta ainda.</p>}
              {accounts.length > 0 && visibleAccounts.length === 0 && <p>Nenhuma conta bate com esse filtro.</p>}
              {visibleAccounts.map((acc) => {
                  const s = stats[acc.id];
                  const profile = profiles[acc.id];
                  const displayName = profile?.companyName || acc.companyName;
                  const expiresAt = toDate(acc.subscriptionExpiresAt);
                  const isExpired = expiresAt ? expiresAt < new Date() : true;
                  const createdAt = toDate(acc.createdAt);
                  const isExpanded = expandedId === acc.id;
                  const diffDays = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                  const isUrgent = acc.status === "payment_failed" || acc.status === "suspended" || isExpired || (diffDays !== null && diffDays <= 3);
                  const limit = planLimit(acc.plan);
                  const used = s?.orcamentosEsteMes ?? 0;
                  return (
                    <div className="account-card" key={acc.id} style={isUrgent ? { borderLeft: "4px solid var(--red-400)" } : undefined}>
                      {profile?.logoUrl ? (
                        <img className="account-logo" src={profile.logoUrl} alt="" style={{ gridArea: "logo" }} />
                      ) : (
                        <div className="account-logo-placeholder" style={{ gridArea: "logo" }}>
                          {(displayName || "?").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div style={{ gridArea: "name" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <strong>{displayName}</strong>
                          <StatusBadge status={acc.status} isExpired={isExpired} />
                        </div>
                        <p className="microlabel">
                          {acc.plan === "teste" ? "Plano gratuito — sem vencimento" : `vence ${formatDate(expiresAt)} (${daysRemainingLabel(expiresAt)})`}
                          {" · "}
                          {PLANS.find((p) => p.id === acc.plan)?.label || "Sem plano"}
                          {acc.billingCycle && acc.plan !== "teste" ? ` (${acc.billingCycle})` : ""}
                        </p>
                      </div>
                      <div style={{ gridArea: "email" }} className="microlabel">
                        {acc.email}
                      </div>
                      <div className="account-card-meta">
                        <span>Propostas: {s?.totalPropostas ?? 0}</span>
                        <span>Abertas: {s?.abertas ?? 0}</span>
                        <span>Em aberto: {formatBRL(s?.valorEmAberto)}</span>
                        <span>Fechados: {s?.fechados ?? 0}</span>
                        <span>Faturado: {formatBRL(s?.valorTotalFechado)}</span>
                      </div>
                      <div style={{ gridColumn: "1 / -1", marginTop: 4, maxWidth: 260 }}>
                        <p className="microlabel" style={{ marginBottom: 2 }}>
                          Orçamentos este mês: {used}
                          {limit != null ? `/${limit}` : " (ilimitado)"}
                        </p>
                        {limit != null && (
                          <div className="checklist-progress-track" style={{ marginTop: 0 }}>
                            <div
                              className="checklist-progress-fill"
                              style={{ width: `${Math.min(100, (used / limit) * 100)}%`, background: used >= limit ? "var(--red-400)" : "var(--amber-400)" }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="account-actions-row" style={{ gridArea: "actions" }}>
                        <Link className="icon-action-btn primary" to={`/admin/contas/${acc.id}`} target="_blank" rel="noopener">
                          Ver como cliente
                        </Link>
                        <button className="icon-action-btn" onClick={() => setExpandedId(isExpanded ? null : acc.id)}>
                          {isExpanded ? "Ocultar detalhes ▲" : "Ver detalhes ▼"}
                        </button>
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
                      {isExpanded && (
                        <div className="account-card-details">
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
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
