import { useMemo, useState } from "react";
import { formatBRL, num, isThisMonth, calcDeal, STAGES, type Deal } from "../lib/calc";

const CAT_COLORS = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)", "var(--cat-5)", "var(--cat-6)"];

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

function CircleChart({ data, hole = 0 }: { data: { label: string; value: number; color: string }[]; hole?: number }) {
  const size = 150;
  const r = size / 2;
  const total = data.reduce((s, d) => s + d.value, 0);
  const visible = data.filter((d) => d.value > 0);

  if (total === 0) return <p className="chart-empty">Sem dados ainda.</p>;

  // Uma unica fatia com 100% vira um circulo cheio -- um arco de 360 graus degenera
  // (ponto inicial == ponto final) e o SVG nao desenha nada.
  const isSingleSlice = visible.length === 1;

  let angle = -90;
  const slices = visible.map((d) => {
    const frac = d.value / total;
    const start = angle;
    const end = angle + frac * 360;
    angle = end;
    const largeArc = end - start > 180 ? 1 : 0;
    const toXY = (deg: number): [number, number] => {
      const rad = (deg * Math.PI) / 180;
      return [r + r * Math.cos(rad), r + r * Math.sin(rad)];
    };
    const [x1, y1] = toXY(start);
    const [x2, y2] = toXY(end);
    return { ...d, frac, path: `M ${r} ${r} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z` };
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Gráfico de distribuição">
        {isSingleSlice ? (
          <circle cx={r} cy={r} r={r} fill={slices[0].color} />
        ) : (
          slices.map((s) => <path key={s.label} d={s.path} fill={s.color} stroke="var(--n-900-40)" strokeWidth={2} />)
        )}
        {hole > 0 && <circle cx={r} cy={r} r={r * hole} fill="var(--n-900-40)" />}
      </svg>
      <div className="legend" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
        {slices.map((s) => (
          <span className="legend-item" key={s.label}>
            <span className="legend-swatch" style={{ background: s.color }} />
            {s.label} — {s.value} ({(s.frac * 100).toFixed(0)}%)
          </span>
        ))}
      </div>
    </div>
  );
}

function LineChart({ points }: { points: { label: string; value: number }[] }) {
  const width = 640;
  const height = 170;
  const pad = { top: 20, right: 16, bottom: 22, left: 16 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...points.map((p) => p.value));
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({ ...p, x: pad.left + i * stepX, y: pad.top + innerH - (p.value / max) * innerH }));
  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1]?.x ?? 0} ${pad.top + innerH} L ${coords[0]?.x ?? 0} ${pad.top + innerH} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Faturamento nos últimos meses">
      <line x1={pad.left} y1={pad.top + innerH} x2={width - pad.right} y2={pad.top + innerH} stroke="var(--n-800)" strokeWidth={1} />
      {coords.length > 1 && <path d={areaPath} fill="var(--amber-400)" opacity={0.1} />}
      {coords.length > 1 && <path d={linePath} fill="none" stroke="var(--amber-400)" strokeWidth={2} />}
      {coords.map((c) => (
        <g key={c.label}>
          <circle cx={c.x} cy={c.y} r={4} fill="var(--amber-400)" stroke="var(--n-900-40)" strokeWidth={1.5} />
          <text x={c.x} y={height - 6} textAnchor="middle" fontSize={9} fill="var(--n-500)">
            {c.label}
          </text>
          <text x={c.x} y={c.y - 9} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--n-300)">
            {formatBRL(c.value).replace("R$", "").trim()}
          </text>
        </g>
      ))}
    </svg>
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
        <Tile label="Ticket médio" value={formatBRL(ticketMedio)} />
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
