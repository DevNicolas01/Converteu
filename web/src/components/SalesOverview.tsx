import { useMemo, useState } from "react";
import { formatBRL, num, isThisMonth, calcDeal, STAGES, type Deal } from "../lib/calc";

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      {hint && (
        <p className="microlabel" style={{ marginTop: 4 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

const STAGE_COLORS: Record<string, string> = {
  aberto: "var(--n-600)",
  aguardando: "var(--amber-400)",
  fechado: "var(--emerald-400)",
  perdido: "var(--red-400)",
};

function BarRow({ label, metric, max, color, display }: { label: string; metric: number; max: number; color: string; display: string }) {
  const pct = max > 0 ? Math.max((metric / max) * 100, metric > 0 ? 3 : 0) : 0;
  return (
    <div className="funnel-row">
      <span className="funnel-row-label">{label}</span>
      <div className="funnel-row-track">
        <div className="funnel-row-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="funnel-row-value">{display}</span>
    </div>
  );
}

export default function SalesOverview({ deals }: { deals: Deal[] }) {
  const [period, setPeriod] = useState<"mes" | "tudo">("mes");
  const base = useMemo(() => (period === "mes" ? deals.filter((d) => isThisMonth(d.createdAt)) : deals), [deals, period]);

  const porStage = STAGES.map((s) => {
    const items = base.filter((d) => d.stage === s.id);
    return { ...s, count: items.length, value: items.reduce((sum, d) => sum + num(d.valorFinal), 0) };
  });
  const maxStageCount = Math.max(1, ...porStage.map((s) => s.count));

  const enviadas = base.filter((d) => ["aguardando", "fechado", "perdido"].includes(d.stage));
  const fechados = base.filter((d) => d.stage === "fechado");
  const perdidos = base.filter((d) => d.stage === "perdido");
  const aguardando = base.filter((d) => d.stage === "aguardando");

  const valorVendido = fechados.reduce((s, d) => s + num(d.valorFinal), 0);
  const valorPerdido = perdidos.reduce((s, d) => s + num(d.valorFinal), 0);
  const valorEmAberto = aguardando.reduce((s, d) => s + num(d.valorFinal), 0);

  const decididas = fechados.length + perdidos.length;
  const taxaConversao = decididas > 0 ? (fechados.length / decididas) * 100 : 0;
  const ticketMedio = fechados.length > 0 ? valorVendido / fechados.length : 0;

  const valorPago = fechados.filter((d) => d.pago).reduce((s, d) => s + num(d.valorFinal), 0);
  const valorNaoPago = valorVendido - valorPago;
  const pagoPct = valorVendido > 0 ? (valorPago / valorVendido) * 100 : 0;

  const custosOperacionais = fechados.reduce((s, d) => s + calcDeal(d).custosOperacionais, 0);
  const saldo = valorVendido - custosOperacionais;

  const porCliente = useMemo(() => {
    const map = new Map<string, number>();
    fechados.forEach((d) => {
      const name = d.clientName || "Sem nome";
      map.set(name, (map.get(name) || 0) + num(d.valorFinal));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);
  const maxCliente = Math.max(1, ...porCliente.map(([, v]) => v));

  return (
    <div>
      <div className="panel-header">
        <h2 className="panel-title" style={{ margin: 0 }}>
          Resultados
        </h2>
        <div className="stage-pills" style={{ margin: 0 }}>
          <button type="button" className={`stage-pill${period === "mes" ? " active" : ""}`} onClick={() => setPeriod("mes")}>
            Este mês
          </button>
          <button type="button" className={`stage-pill${period === "tudo" ? " active" : ""}`} onClick={() => setPeriod("tudo")}>
            Todo o período
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
        <Tile label="Orçamentos" value={String(base.length)} />
        <Tile label="Propostas enviadas" value={String(enviadas.length)} />
        <Tile label="Fechados" value={String(fechados.length)} />
        <Tile label="Perdidos" value={String(perdidos.length)} />
        <Tile label="Taxa de conversão" value={`${taxaConversao.toFixed(0)}%`} hint="fechados ÷ (fechados + perdidos)" />
        <Tile label="Ticket médio" value={formatBRL(ticketMedio)} />
      </div>

      <div className="chart-grid" style={{ marginBottom: 16 }}>
        <div className="chart-card">
          <p className="chart-title">Funil de vendas</p>
          <div className="funnel">
            {porStage.map((s) => (
              <BarRow key={s.id} label={s.label} metric={s.count} max={maxStageCount} color={STAGE_COLORS[s.id]} display={`${s.count} · ${formatBRL(s.value)}`} />
            ))}
          </div>
        </div>

        <div className="chart-card">
          <p className="chart-title">Faturamento</p>
          <div style={{ display: "grid", gap: 10 }}>
            <Tile label="Faturado (fechados)" value={formatBRL(valorVendido)} />
            <Tile label="Em aberto (aguardando)" value={formatBRL(valorEmAberto)} />
            <Tile label="Perdido" value={formatBRL(valorPerdido)} />
          </div>
        </div>

        <div className="chart-card">
          <p className="chart-title">Custos e saldo dos fechados</p>
          <div style={{ display: "grid", gap: 10 }}>
            <Tile label="Custos operacionais" value={formatBRL(custosOperacionais)} hint="soma dos custos calculados de cada fechado" />
            <Tile label="Saldo (lucro)" value={formatBRL(saldo)} />
          </div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <p className="chart-title">Pago vs. a receber (fechados)</p>
          {fechados.length === 0 ? (
            <p className="chart-empty">Nenhum fechado ainda.</p>
          ) : (
            <>
              <div className="split-bar">
                <div className="split-bar-seg" style={{ width: `${pagoPct}%`, background: "var(--emerald-400)" }} />
                <div className="split-bar-seg" style={{ width: `${100 - pagoPct}%`, background: "var(--n-700)" }} />
              </div>
              <div className="legend">
                <span className="legend-item">
                  <span className="legend-swatch" style={{ background: "var(--emerald-400)" }} /> Pago — {formatBRL(valorPago)}
                </span>
                <span className="legend-item">
                  <span className="legend-swatch" style={{ background: "var(--n-700)" }} /> A receber — {formatBRL(valorNaoPago)}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="chart-card" style={{ gridColumn: "span 2" }}>
          <p className="chart-title">Vendas por cliente (fechados)</p>
          {porCliente.length === 0 ? (
            <p className="chart-empty">Nenhuma venda fechada ainda.</p>
          ) : (
            <div className="funnel">
              {porCliente.map(([name, value]) => (
                <BarRow key={name} label={name} metric={value} max={maxCliente} color="var(--amber-400)" display={formatBRL(value)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
