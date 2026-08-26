import { formatBRL, num, type Deal } from "../lib/calc";

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
    </div>
  );
}

function isThisMonth(iso: string | null | undefined) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export default function SalesOverview({ deals }: { deals: Deal[] }) {
  const thisMonth = deals.filter((d) => isThisMonth(d.createdAt));
  const orcamentos = thisMonth.length;
  const propostasEnviadas = thisMonth.filter((d) => ["aguardando", "fechado", "perdido"].includes(d.stage)).length;
  const fechados = thisMonth.filter((d) => d.stage === "fechado");
  const valorVendido = fechados.reduce((s, d) => s + num(d.valorFinal), 0);
  const aguardando = thisMonth.filter((d) => d.stage === "aguardando");
  const valorEmAberto = aguardando.reduce((s, d) => s + num(d.valorFinal), 0);

  return (
    <div className="panel">
      <h2 className="panel-title">Este mês</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <Tile label="Orçamentos" value={String(orcamentos)} />
        <Tile label="Propostas enviadas" value={String(propostasEnviadas)} />
        <Tile label="Fechados" value={String(fechados.length)} />
        <Tile label="Vendidos" value={formatBRL(valorVendido)} />
        <Tile label="Em propostas aguardando resposta" value={formatBRL(valorEmAberto)} />
      </div>
    </div>
  );
}
