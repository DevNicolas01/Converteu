import { useMemo, useState } from "react";
import { formatBRL, num, isThisMonth, calcDeal, roundCents, STAGES, type Deal } from "../lib/calc";
import { Tile, BarRow, CircleChart, LineChart } from "./charts";

const CAT_COLORS = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)", "var(--cat-5)", "var(--cat-6)"];

const STAGE_COLORS: Record<string, string> = {
  aberto: "var(--n-600)",
  aguardando: "var(--amber-400)",
  fechado: "var(--emerald-400)",
  perdido: "var(--red-400)",
};

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

  const valorVendido = roundCents(fechados.reduce((s, d) => s + num(d.valorFinal), 0));
  const valorPerdido = roundCents(perdidos.reduce((s, d) => s + num(d.valorFinal), 0));
  const valorEmAberto = roundCents(aguardando.reduce((s, d) => s + num(d.valorFinal), 0));

  const decididas = fechados.length + perdidos.length;
  const taxaConversao = decididas > 0 ? (fechados.length / decididas) * 100 : 0;
  const ticketMedio = fechados.length > 0 ? roundCents(valorVendido / fechados.length) : 0;

  const valorPago = roundCents(fechados.reduce((s, d) => s + Math.min(num(d.valorPago), num(d.valorFinal)), 0));
  const valorNaoPago = roundCents(valorVendido - valorPago);
  const pagoPct = valorVendido > 0 ? (valorPago / valorVendido) * 100 : 0;

  const custosOperacionais = roundCents(fechados.reduce((s, d) => s + calcDeal(d).custosOperacionais, 0));
  const saldo = roundCents(valorVendido - custosOperacionais);

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

  const porLeadSource = useMemo(() => {
    const map = new Map<string, number>();
    base.forEach((d) => {
      const key = d.leadSource || "Outro";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value, color: CAT_COLORS[i % CAT_COLORS.length] }));
  }, [base]);

  const porFormaPagamento = useMemo(() => {
    const map = new Map<string, number>();
    fechados.forEach((d) => {
      const key = d.formaPagamento || "Não informado";
      map.set(key, (map.get(key) || 0) + num(d.valorFinal));
    });
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value, color: CAT_COLORS[i % CAT_COLORS.length] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechados]);

  const faturamentoMensal = useMemo(() => {
    const now = new Date();
    const months: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = ref.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      const total = deals
        .filter((d) => d.stage === "fechado" && d.closedAt)
        .filter((d) => {
          const c = new Date(d.closedAt!);
          return c.getFullYear() === ref.getFullYear() && c.getMonth() === ref.getMonth();
        })
        .reduce((s, d) => s + num(d.valorFinal), 0);
      months.push({ label, value: total });
    }
    return months;
  }, [deals]);

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
        <Tile label="Venda média" value={formatBRL(ticketMedio)} hint="média só dos fechados" />
      </div>

      <div className="chart-grid" style={{ marginBottom: 16 }}>
        <div className="chart-card">
          <p className="chart-title">Funil de vendas</p>
          <div className="funnel" style={{ marginBottom: 14 }}>
            {porStage.map((s) => (
              <BarRow key={s.id} label={s.label} metric={s.count} max={maxStageCount} color={STAGE_COLORS[s.id]} display={`${s.count} · ${formatBRL(s.value)}`} />
            ))}
          </div>
          <CircleChart hole={0.55} data={porStage.map((s) => ({ label: s.label, value: s.count, color: STAGE_COLORS[s.id] }))} />
        </div>

        <div className="chart-card">
          <p className="chart-title">Faturamento</p>
          <div style={{ display: "grid", gap: 10 }}>
            <Tile label="Faturado (fechados)" value={formatBRL(valorVendido)} />
            <Tile label="Aguardando resposta" value={formatBRL(valorEmAberto)} />
            <Tile label="Perdido" value={formatBRL(valorPerdido)} />
          </div>
        </div>

        <div className="chart-card">
          <p className="chart-title">Custos e saldo dos fechados</p>
          <div style={{ display: "grid", gap: 10 }}>
            <Tile label="Custos operacionais" value={formatBRL(custosOperacionais)} hint="soma dos custos calculados de cada fechado" />
            <Tile label="Saldo (lucro)" value={formatBRL(saldo)} hint="faturado − custos operacionais" />
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

        <div className="chart-card">
          <p className="chart-title">Formas de pagamento (fechados)</p>
          {porFormaPagamento.length === 0 ? (
            <p className="chart-empty">Nenhum fechado ainda.</p>
          ) : (
            <CircleChart data={porFormaPagamento} formatValue={formatBRL} />
          )}
        </div>

        <div className="chart-card">
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

      <div className="chart-grid" style={{ marginTop: 16 }}>
        <div className="chart-card">
          <p className="chart-title">Origem dos leads</p>
          <CircleChart data={porLeadSource} />
        </div>

        <div className="chart-card" style={{ gridColumn: "span 2" }}>
          <p className="chart-title">Faturamento nos últimos 6 meses</p>
          <LineChart points={faturamentoMensal} />
        </div>
      </div>
    </div>
  );
}
