import { useId, useMemo, useState, type ReactElement } from "react";
import { STAGES, FORMAS_PAGAMENTO, formatBRL, num, type Deal } from "../lib/calc";
import { buildWhatsAppShareLink } from "../lib/db";
import { MESSAGE_TEMPLATES } from "../lib/templates";
import { downloadClientPdf } from "../lib/pdf";
import PresentationView from "./PresentationView";
import type { CompanyProfile } from "../lib/db";
import { InboxIcon, SendIcon, CheckCircleIcon, XCircleIcon, CreditCardIcon } from "./Icons";

const STAGE_META: Record<string, { icon: ReactElement; color: string }> = {
  aberto: { icon: <InboxIcon />, color: "var(--n-600)" },
  aguardando: { icon: <SendIcon />, color: "var(--amber-400)" },
  fechado: { icon: <CheckCircleIcon />, color: "var(--emerald-400)" },
  perdido: { icon: <XCircleIcon />, color: "var(--red-400)" },
};

interface Props {
  deals: Deal[];
  company: CompanyProfile;
  onEdit: (deal: Deal) => void;
  onDelete: (id: string) => void;
  onChangeStage: (deal: Deal, stage: string) => void;
  onSetFollowUpDate: (deal: Deal, date: string) => void;
  onSetPagamento: (deal: Deal, patch: Partial<Pick<Deal, "formaPagamento" | "valorPago">>) => void;
}

function daysSince(iso: string | null | undefined) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function DealCard({ deal, company, onEdit, onDelete, onChangeStage, onSetFollowUpDate, onSetPagamento }: Props & { deal: Deal }) {
  const isDecided = deal.stage === "fechado" || deal.stage === "perdido";
  const [presenting, setPresenting] = useState(false);
  const [expanded, setExpanded] = useState(!isDecided);
  const [templateId, setTemplateId] = useState(MESSAGE_TEMPLATES[0].id);
  const template = MESSAGE_TEMPLATES.find((t) => t.id === templateId) || MESSAGE_TEMPLATES[0];
  const companyName = company.companyName || "";
  const message = template.build(deal, companyName, num(deal.valorFinal));
  const followUpId = useId();
  const templateSelectId = useId();
  const formaPagamentoId = useId();
  const valorPagoId = useId();

  const valorFinalNum = num(deal.valorFinal);
  const valorPagoNum = Math.min(num(deal.valorPago), valorFinalNum || num(deal.valorPago));
  const paymentStatus = valorFinalNum > 0 && valorPagoNum >= valorFinalNum ? "paid" : valorPagoNum > 0 ? "partial" : "unpaid";
  const paymentLabel = paymentStatus === "paid" ? "Pago" : paymentStatus === "partial" ? "Parcial" : "A receber";
  const paymentPct = valorFinalNum > 0 ? Math.min(100, (valorPagoNum / valorFinalNum) * 100) : 0;

  // WhatsApp e e-mail não deixam anexar arquivo por link (limitação da própria plataforma,
  // não dá pra contornar via navegador) — então a gente baixa o PDF automaticamente e já
  // abre a mensagem pronta; falta só anexar o arquivo baixado na hora de enviar.
  async function sendWhatsApp() {
    if (!deal.clientePhone) {
      alert("Cadastre o WhatsApp do cliente no orçamento primeiro.");
      return;
    }
    await downloadClientPdf(deal, company, deal.obraNumero || 1);
    window.open(buildWhatsAppShareLink(deal.clientePhone, `${message}\n\n(vou te mandar o PDF em seguida)`), "_blank");
  }

  async function sendEmail() {
    if (!deal.clienteEmail) {
      alert("Cadastre o e-mail do cliente no orçamento primeiro.");
      return;
    }
    await downloadClientPdf(deal, company, deal.obraNumero || 1);
    const subject = encodeURIComponent(`Orçamento — ${companyName}`);
    const body = encodeURIComponent(message + "\n\n(PDF baixado — anexe antes de enviar)");
    window.location.href = `mailto:${deal.clienteEmail}?subject=${subject}&body=${body}`;
  }

  const sentDays = daysSince(deal.sentAt);
  const stageLabel = STAGES.find((s) => s.id === deal.stage)?.label || deal.stage;
  const placeLabel = deal.obraNome || deal.endereco || "";

  return (
    <div className={`deal-card${isDecided ? " compact" : ""}`}>
      <div className="deal-card-top">
        <button type="button" className="deal-name" onClick={() => onEdit(deal)}>
          {deal.clientName || "Sem nome"}
        </button>
        <span className="deal-value">{formatBRL(deal.valorFinal)}</span>
      </div>
      {deal.stage === "aguardando" && sentDays !== null && <p className="deal-meta">Enviada há {sentDays} dia(s)</p>}
      {isDecided && placeLabel && <p className="deal-meta">{placeLabel}</p>}

      {deal.stage === "fechado" && (
        <div className="payment-summary">
          <div className="payment-summary-top">
            <span className={`payment-badge ${paymentStatus}`}>{paymentLabel}</span>
            <span className="payment-summary-amount">
              {formatBRL(valorPagoNum)} / {formatBRL(valorFinalNum)}
            </span>
          </div>
          <div className="payment-progress-track">
            <div className={`payment-progress-fill ${paymentStatus}`} style={{ width: `${paymentPct}%` }} />
          </div>
          {deal.formaPagamento && <p className="microlabel" style={{ margin: "4px 0 0" }}>{deal.formaPagamento}</p>}
        </div>
      )}

      {isDecided && (
        <button type="button" className="link-btn" onClick={() => setExpanded((e) => !e)}>
          {expanded ? "Recolher ▲" : "Ver detalhes ▾"}
        </button>
      )}

      {expanded && (
        <>
          <div
            className="stage-pills"
            role="group"
            aria-label={`Status da proposta de ${deal.clientName || "cliente sem nome"}: ${stageLabel}`}
          >
            {STAGES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`stage-pill${deal.stage === s.id ? " active" : ""}`}
                aria-pressed={deal.stage === s.id}
                onClick={() => onChangeStage(deal, s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {!isDecided && (
            <div className="field" style={{ marginBottom: 0, marginTop: 10 }}>
              <label htmlFor={followUpId} className="microlabel">
                Próximo follow-up
              </label>
              <input
                id={followUpId}
                className="input"
                type="date"
                value={deal.followUpDate || ""}
                onChange={(e) => onSetFollowUpDate(deal, e.target.value)}
              />
            </div>
          )}

          {deal.stage === "fechado" && (
            <div className="cost-group" style={{ marginTop: 10 }}>
              <div className="cost-group-icon" style={{ background: "var(--cat-3)" }}>
                <CreditCardIcon />
              </div>
              <p className="cost-group-title">Pagamento</p>
              <div className="cost-group-fields">
                <div className="field" style={{ marginBottom: 0 }}>
                  <label htmlFor={formaPagamentoId}>Forma de pagamento</label>
                  <select
                    id={formaPagamentoId}
                    className="input"
                    value={deal.formaPagamento}
                    onChange={(e) => onSetPagamento(deal, { formaPagamento: e.target.value })}
                  >
                    <option value="">Selecione</option>
                    {FORMAS_PAGAMENTO.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label htmlFor={valorPagoId}>Valor recebido (R$)</label>
                  <input
                    id={valorPagoId}
                    className="input"
                    type="number"
                    value={deal.valorPago}
                    onChange={(e) => onSetPagamento(deal, { valorPago: e.target.value })}
                  />
                </div>
              </div>
              {paymentStatus === "partial" && (
                <p className="microlabel" style={{ marginTop: 8, marginBottom: 0 }}>
                  Falta receber: <strong>{formatBRL(valorFinalNum - valorPagoNum)}</strong>
                </p>
              )}
            </div>
          )}

          <div className="deal-card-section">
            <label htmlFor={templateSelectId} className="microlabel">
              Mensagem
            </label>
            <select id={templateSelectId} className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {MESSAGE_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>

            <div className="deal-actions">
              <button type="button" className="icon-action-btn primary" onClick={() => setPresenting(true)}>
                Apresentar
              </button>
              <button type="button" className="icon-action-btn" onClick={sendWhatsApp}>
                WhatsApp
              </button>
              <button type="button" className="icon-action-btn" onClick={sendEmail}>
                E-mail
              </button>
              <button type="button" className="icon-action-btn" onClick={() => downloadClientPdf(deal, company, deal.obraNumero || 1)}>
                PDF
              </button>
              <button
                type="button"
                className="icon-action-btn danger"
                onClick={() => onDelete(deal.id!)}
                aria-label={`Excluir proposta de ${deal.clientName || "cliente sem nome"}`}
              >
                Excluir
              </button>
            </div>
          </div>
        </>
      )}

      {presenting && (
        <PresentationView deal={deal} companyName={companyName} logoUrl={company.logoUrl} onClose={() => setPresenting(false)} />
      )}
    </div>
  );
}

export function AlertsPanel({ deals }: { deals: Deal[] }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const pending = useMemo(
    () => deals.filter((d) => d.stage === "aguardando" && d.followUpDate && d.followUpDate <= todayStr),
    [deals, todayStr],
  );

  if (pending.length === 0) return null;

  return (
    <div className="panel" role="status" style={{ marginBottom: 16, borderColor: "var(--red-400)" }}>
      <h2 className="panel-title">Hoje você precisa falar com {pending.length} cliente(s)</h2>
      {pending.map((d) => {
        const days = daysSince(d.sentAt);
        return (
          <p key={d.id}>
            <strong>{d.clientName}</strong>
            {days !== null ? ` — recebeu a proposta há ${days} dia(s)` : ""}
          </p>
        );
      })}
    </div>
  );
}

export default function ProposalsBoard(props: Props) {
  const { deals } = props;
  return (
    <div>
      <AlertsPanel deals={deals} />
      <div className="funil-grid">
        {STAGES.map((stage) => {
          const items = deals.filter((d) => d.stage === stage.id);
          const totalValue = items.reduce((s, d) => s + num(d.valorFinal), 0);
          const meta = STAGE_META[stage.id];
          return (
            <section className="funil-col" key={stage.id} aria-label={`Coluna ${stage.label}`} style={{ borderTopColor: meta.color }}>
              <div className="funil-col-head">
                <div className="funil-col-icon" style={{ background: meta.color }}>
                  {meta.icon}
                </div>
                <span className="funil-col-title">
                  {stage.label}
                  <span className="microlabel" style={{ display: "block" }}>
                    {formatBRL(totalValue)}
                  </span>
                </span>
                <span className="funil-count">{items.length}</span>
              </div>
              <div className="funil-col-body">
                {items.map((deal) => (
                  <DealCard key={deal.id} deal={deal} {...props} />
                ))}
                {items.length === 0 && <p className="microlabel">Nenhuma proposta.</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
