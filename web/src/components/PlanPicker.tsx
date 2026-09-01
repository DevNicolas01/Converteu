import { PLANS, PLAN_PRICES, formatBRL, type PlanId, type BillingCycle } from "../lib/calc";

interface Props {
  plan: PlanId;
  billingCycle: BillingCycle;
  onChangePlan: (plan: PlanId) => void;
  onChangeBillingCycle: (cycle: BillingCycle) => void;
  /** Plano atualmente ativo na conta — ganha a etiqueta "Plano atual" em vez de "Recomendado". */
  currentPlanId?: PlanId;
  /** Esconde o plano Teste — usado no upgrade, já que quem já é cliente não pode voltar pro grátis. */
  hideFree?: boolean;
  recommendedPlanId?: PlanId;
}

export default function PlanPicker({
  plan,
  billingCycle,
  onChangePlan,
  onChangeBillingCycle,
  currentPlanId,
  hideFree = false,
  recommendedPlanId = "cresce",
}: Props) {
  const plans = hideFree ? PLANS.filter((p) => p.id !== "teste") : PLANS;

  return (
    <div>
      <div className="billing-toggle" role="group" aria-label="Ciclo de cobrança">
        <button
          type="button"
          className={`billing-toggle-btn${billingCycle === "mensal" ? " active" : ""}`}
          onClick={() => onChangeBillingCycle("mensal")}
        >
          Mensal
        </button>
        <button
          type="button"
          className={`billing-toggle-btn${billingCycle === "anual" ? " active" : ""}`}
          onClick={() => onChangeBillingCycle("anual")}
        >
          Anual <span className="billing-save-badge">2 meses grátis</span>
        </button>
      </div>

      <div className="plan-grid">
        {plans.map((p, i) => {
          const isFree = p.id === "teste";
          const cyclePrice = isFree ? 0 : PLAN_PRICES[p.id][billingCycle];
          const monthlyEquivalent = !isFree && billingCycle === "anual" ? cyclePrice / 12 : cyclePrice;
          const annualSavings = !isFree ? PLAN_PRICES[p.id].mensal * 12 - PLAN_PRICES[p.id].anual : 0;
          const isSelected = plan === p.id;
          const isCurrent = currentPlanId === p.id;
          const isRecommended = !isCurrent && p.id === recommendedPlanId;
          return (
            <label
              key={p.id}
              className={`plan-card${isSelected ? " selected" : ""}${isRecommended ? " recommended" : ""}`}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              {isCurrent && <span className="plan-badge plan-badge-current">Plano atual</span>}
              {isRecommended && <span className="plan-badge">★ Recomendado</span>}
              <input
                type="radio"
                name="plan"
                value={p.id}
                checked={isSelected}
                onChange={() => onChangePlan(p.id)}
                className="plan-card-radio"
                aria-label={p.label}
              />
              <span className="plan-card-name">{p.label}</span>
              <span className="plan-card-price">
                {isFree ? "Grátis" : formatBRL(monthlyEquivalent)}
                {!isFree && <span className="plan-card-period">/mês</span>}
              </span>
              {!isFree && billingCycle === "anual" && (
                <span className="plan-card-savings">economize {formatBRL(annualSavings)}/ano</span>
              )}
              <span className="plan-card-limit">{p.limit ? `até ${p.limit} orçamentos/mês` : "orçamentos ilimitados"}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
