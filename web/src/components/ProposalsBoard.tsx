import { useId, useMemo, useState } from "react";
import { STAGES, formatBRL, num, type Deal } from "../lib/calc";
import { buildWhatsAppShareLink } from "../lib/db";
import { MESSAGE_TEMPLATES } from "../lib/templates";
import { downloadClientPdf } from "../lib/pdf";
import PresentationView from "./PresentationView";
import type { CompanyProfile } from "../lib/db";

interface Props {
  deals: Deal[];
  company: CompanyProfile;
  onEdit: (deal: Deal) => void;
  onDelete: (id: string) => void;
  onChangeStage: (deal: Deal, stage: string) => void;
  onSetFollowUpDate: (deal: Deal, date: string) => void;
}

function daysSince(iso: string | null | undefined) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function DealCard({ deal, company, onEdit, onDelete, onChangeStage, onSetFollowUpDate }: Props & { deal: Deal }) {
  const [presenting, setPresenting] = useState(false);
  const [templateId, setTemplateId] = useState(MESSAGE_TEMPLATES[0].id);
  const template = MESSAGE_TEMPLATES.find((t) => t.id === templateId) || MESSAGE_TEMPLATES[0];
  const companyName = company.companyName || "";
  const message = template.build(deal, companyName, num(deal.valorFinal));
  const followUpId = useId();
  const templateSelectId = useId();

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

  return (
    <div className="deal-card">
      <div className="deal-card-top">
        <button type="button" className="deal-name" onClick={() => onEdit(deal)}>
          {deal.clientName || "Sem nome"}
        </button>
        <span className="deal-value">{formatBRL(deal.valorFinal)}</span>
      </div>
      {deal.stage === "aguardando" && sentDays !== null && (
        <p className="deal-meta">Enviada há {sentDays} dia(s)</p>
      )}

      <div className="stage-pills" role="group" aria-label={`Status da proposta de ${deal.clientName || "cliente sem nome"}: ${stageLabel}`}>
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
          return (
            <section className="funil-col" key={stage.id} aria-label={`Coluna ${stage.label}`}>
              <div className="funil-col-head">
                <span>
                  {stage.label} — {formatBRL(totalValue)}
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
