interface Props {
  used: number;
  limit: number | null;
  /** Ex.: "neste mês" (planos pagos) ou "no total do plano Teste" (limite vitalício). */
  periodLabel: string;
  onClick: () => void;
}

export default function UsageBadge({ used, limit, periodLabel, onClick }: Props) {
  if (limit == null) {
    return (
      <button type="button" className="usage-badge usage-badge-unlimited" onClick={onClick} title="Ver plano e assinatura">
        <span className="usage-badge-count">∞ orçamentos</span>
      </button>
    );
  }

  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 100;
  const level = pct >= 100 ? "full" : pct >= 80 ? "warn" : "ok";

  return (
    <button
      type="button"
      className={`usage-badge usage-badge-${level}`}
      onClick={onClick}
      title={`${used} de ${limit} orçamentos usados ${periodLabel} — ver plano e assinatura`}
    >
      <span className="usage-badge-count">
        {used}/{limit} orçamentos
      </span>
      <span className="usage-badge-track">
        <span className="usage-badge-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="usage-badge-period">{periodLabel}</span>
    </button>
  );
}
