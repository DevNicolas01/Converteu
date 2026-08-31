import { cloneElement, useEffect, useMemo, useState, type ReactElement } from "react";
import {
  emptyDeal,
  calcDeal,
  computeDataTermino,
  estimateProductCostByArea,
  formatBRL,
  formatDateBR,
  formatPhoneBR,
  num,
  ROLES,
  LEAD_SOURCES,
  CLIENT_TYPES,
  PAID_TRAFFIC_CHANNELS,
  type Deal,
  type ProdutoItem,
} from "../lib/calc";
import { downloadClientPdf, downloadInternalPdf } from "../lib/pdf";
import PresentationView from "./PresentationView";
import type { CompanyProfile } from "../lib/db";
import { BuildingIcon, UsersIcon, CreditCardIcon, BoxIcon, PercentIcon, TruckIcon, CoffeeIcon, DropletIcon, ParkingIcon, TrashIcon } from "./Icons";

interface Props {
  initialDeal?: Deal | null;
  company: CompanyProfile;
  obraNumero: number;
  onSave: (deal: Deal) => Promise<void>;
  onCancelEdit?: () => void;
}

const STEPS = [
  { label: "Obra e cliente", icon: <BuildingIcon />, color: "var(--cat-1)" },
  { label: "Equipe", icon: <UsersIcon />, color: "var(--cat-2)" },
  { label: "Transporte e apoio", icon: <CreditCardIcon />, color: "var(--cat-3)" },
  { label: "Materiais e produtos", icon: <BoxIcon />, color: "var(--cat-5)" },
  { label: "Custos e margem", icon: <PercentIcon />, color: "var(--cat-6)" },
] as const;

const ROLE_COLORS = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)"];

function field(label: string, input: ReactElement<{ id?: string }>, key: string) {
  const id = `qf-${key}`;
  return (
    <div className="field" key={key}>
      <label htmlFor={id}>{label}</label>
      {cloneElement(input, { id })}
    </div>
  );
}

function StepHeader({ index }: { index: number }) {
  const s = STEPS[index];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <div className="cost-group-icon" style={{ background: s.color, marginBottom: 0 }}>
        {s.icon}
      </div>
      <p className="eyebrow" style={{ margin: 0 }}>
        {s.label}
      </p>
    </div>
  );
}

export default function QuoteForm({ initialDeal, company, obraNumero, onSave, onCancelEdit }: Props) {
  const [deal, setDeal] = useState<Deal>(() => initialDeal || emptyDeal());
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState(false);

  const calc = useMemo(() => calcDeal(deal), [deal]);
  const isEditing = !!deal.id;
  const lastStep = STEPS.length - 1;

  useEffect(() => {
    const termino = computeDataTermino(deal.dataInicio, deal.dias);
    if (termino !== deal.dataTermino) {
      setDeal((d) => ({ ...d, dataTermino: termino }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.dataInicio, deal.dias]);

  function set<K extends keyof Deal>(key: K, value: Deal[K]) {
    setDeal((d) => ({ ...d, [key]: value }));
  }

  function setRole(kind: "qtd" | "diaria", roleKey: string, value: string) {
    setDeal((d) => ({ ...d, [kind]: { ...d[kind], [roleKey]: value } }));
  }

  function addProduto() {
    setDeal((d) => ({ ...d, produtos: [...(d.produtos || []), { nome: "", quantidade: "1", valorUnitario: "" }] }));
  }

  function setProduto(index: number, patch: Partial<ProdutoItem>) {
    setDeal((d) => ({
      ...d,
      produtos: (d.produtos || []).map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }));
  }

  function removeProduto(index: number) {
    setDeal((d) => ({ ...d, produtos: (d.produtos || []).filter((_, i) => i !== index) }));
  }

  async function handleSave() {
    if (!deal.clientName.trim()) {
      setSaveError(true);
      setSaveMsg("Preencha o nome do cliente.");
      setStep(0);
      return;
    }
    setSaving(true);
    setSaveMsg("");
    try {
      await onSave({ ...deal, valorFinal: calc.valorFinal });
      setSaveError(false);
      setSaveMsg(isEditing ? "Alterações salvas!" : "Orçamento salvo em Propostas!");
      if (!isEditing) {
        setDeal(emptyDeal());
        setStep(0);
      }
    } catch (e) {
      console.error("Falha ao salvar orçamento", e);
      setSaveError(true);
      setSaveMsg("Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadClientPdf() {
    await downloadClientPdf({ ...deal, valorFinal: calc.valorFinal }, company, deal.obraNumero || obraNumero);
  }

  async function handleDownloadInternalPdf() {
    await downloadInternalPdf({ ...deal, valorFinal: calc.valorFinal }, company, deal.obraNumero || obraNumero);
  }

  return (
    <>
      <div className="quote-grid">
      <div className="panel">
        <h2 className="panel-title">{isEditing ? "Editar orçamento" : "Novo orçamento"}</h2>

        <div className="wizard-steps" role="tablist" aria-label="Etapas do orçamento">
          {STEPS.map((s, i) => (
            <button
              key={s.label}
              type="button"
              role="tab"
              aria-selected={step === i}
              className={`wizard-step${step === i ? " active" : ""}${i < step ? " done" : ""}`}
              onClick={() => setStep(i)}
            >
              <span className="wizard-step-num">{i < step ? "✓" : i + 1}</span>
              <span className="wizard-step-label">{s.label}</span>
            </button>
          ))}
        </div>

        {step === 0 && (
          <>
            <StepHeader index={0} />

            <div className="cost-group-grid">
              <div className="cost-group">
                <p className="cost-group-title">Cliente</p>
                <div className="cost-group-fields">
                  {field("Cliente", <input className="input" value={deal.clientName} onChange={(e) => set("clientName", e.target.value)} required />, "clientName")}
                  {field(
                    "Tipo de imóvel",
                    <select className="input" value={deal.clientType} onChange={(e) => set("clientType", e.target.value)}>
                      {CLIENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>,
                    "clientType",
                  )}
                  {field("E-mail", <input className="input" type="email" value={deal.clienteEmail} onChange={(e) => set("clienteEmail", e.target.value)} />, "clienteEmail")}
                  {field(
                    "WhatsApp",
                    <input
                      className="input"
                      type="tel"
                      placeholder="Ex: (11) 9 8888-7777"
                      value={deal.clientePhone}
                      onChange={(e) => set("clientePhone", formatPhoneBR(e.target.value))}
                    />,
                    "clientePhone",
                  )}
                </div>
              </div>

              <div className="cost-group">
                <p className="cost-group-title">Obra e local</p>
                <div className="cost-group-fields">
                  {field("Nome da obra", <input className="input" value={deal.obraNome} onChange={(e) => set("obraNome", e.target.value)} />, "obraNome")}
                  {field("Endereço", <input className="input" value={deal.endereco} onChange={(e) => set("endereco", e.target.value)} />, "endereco")}
                  {field("Responsável", <input className="input" value={deal.responsavel} onChange={(e) => set("responsavel", e.target.value)} />, "responsavel")}
                  {field("Metragem (m²)", <input className="input" type="number" value={deal.metragem} onChange={(e) => set("metragem", e.target.value)} />, "metragem")}
                </div>
              </div>

              <div className="cost-group">
                <p className="cost-group-title">Origem do lead</p>
                <div className="cost-group-fields">
                  {field(
                    "Como chegou",
                    <select className="input" value={deal.leadSource} onChange={(e) => set("leadSource", e.target.value)}>
                      {LEAD_SOURCES.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>,
                    "leadSource",
                  )}
                  {deal.leadSource === "Tráfego pago" &&
                    field(
                      "Plataforma",
                      <select className="input" value={deal.leadSourcePaidChannel} onChange={(e) => set("leadSourcePaidChannel", e.target.value)}>
                        <option value="">Selecione</option>
                        {PAID_TRAFFIC_CHANNELS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>,
                      "leadSourcePaidChannel",
                    )}
                </div>
              </div>

              <div className="cost-group">
                <p className="cost-group-title">Prazo</p>
                <div className="cost-group-fields">
                  {field("Dias de serviço", <input className="input" type="number" value={deal.dias} onChange={(e) => set("dias", e.target.value)} />, "dias")}
                  {field("Data de início", <input className="input" type="date" value={deal.dataInicio} onChange={(e) => set("dataInicio", e.target.value)} />, "dataInicio")}
                  {field(
                    "Previsão de término",
                    <input className="input" value={deal.dataTermino ? formatDateBR(deal.dataTermino) : "Preencha início e dias"} disabled />,
                    "dataTermino",
                  )}
                  {field("Visita técnica", <input className="input" type="date" value={deal.dataVisitaTecnica} onChange={(e) => set("dataVisitaTecnica", e.target.value)} />, "dataVisitaTecnica")}
                </div>
              </div>
            </div>

            <div className="cost-group" style={{ marginTop: 14 }}>
              <p className="cost-group-title">Observações da vistoria</p>
              <textarea
                className="input"
                rows={3}
                style={{ resize: "vertical" }}
                placeholder="Ex: piso porcelanato polido, cimento aderido em toda a área, rejunte epóxi nas pastilhas do banheiro, obra finalizada aguardando entrega."
                aria-label="Observações da vistoria (superfície, sujidade, estado da obra, restrições de acesso etc.)"
                value={deal.observacoesVisita}
                onChange={(e) => set("observacoesVisita", e.target.value)}
              />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <StepHeader index={1} />
            <div className="cost-group-grid">
              {ROLES.map((r, i) => {
                const subtotal = num(deal.qtd[r.key]) * num(deal.diaria[r.key]) * num(deal.dias);
                return (
                  <div className="cost-group" key={r.key}>
                    <div className="cost-group-icon" style={{ background: ROLE_COLORS[i % ROLE_COLORS.length] }}>
                      <UsersIcon />
                    </div>
                    <p className="cost-group-title">{r.label}</p>
                    <div className="cost-group-fields">
                      <div className="field">
                        <label htmlFor={`role-qtd-${r.key}`}>Qtd.</label>
                        <input
                          id={`role-qtd-${r.key}`}
                          className="input"
                          type="number"
                          aria-label={`Quantidade de ${r.label}`}
                          value={deal.qtd[r.key]}
                          onChange={(e) => setRole("qtd", r.key, e.target.value)}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`role-diaria-${r.key}`}>Diária (R$)</label>
                        <input
                          id={`role-diaria-${r.key}`}
                          className="input"
                          type="number"
                          aria-label={`Diária em reais de ${r.label}`}
                          value={deal.diaria[r.key]}
                          onChange={(e) => setRole("diaria", r.key, e.target.value)}
                        />
                      </div>
                    </div>
                    <p className="cost-group-subtotal">{formatBRL(subtotal)} no total</p>
                  </div>
                );
              })}
            </div>

            <div className="cost-total-banner">
              <span>Total de equipe</span>
              <strong>{formatBRL(calc.maoDeObraTotal)}</strong>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <StepHeader index={2} />
            <div className="cost-group-grid">
              <div className="cost-group">
                <div className="cost-group-icon" style={{ background: "var(--cat-1)" }}>
                  <TruckIcon />
                </div>
                <p className="cost-group-title">Vale-transporte</p>
                <div className="cost-group-fields">
                  {field("Qtd./dia", <input className="input" type="number" value={deal.vtQtd} onChange={(e) => set("vtQtd", e.target.value)} />, "vtQtd")}
                  {field("Valor (R$)", <input className="input" type="number" value={deal.vtValor} onChange={(e) => set("vtValor", e.target.value)} />, "vtValor")}
                </div>
                <p className="cost-group-subtotal">{formatBRL(calc.vtTotal)} no total</p>
              </div>

              <div className="cost-group">
                <div className="cost-group-icon" style={{ background: "var(--cat-2)" }}>
                  <CoffeeIcon />
                </div>
                <p className="cost-group-title">Alimentação</p>
                <div className="cost-group-fields">
                  {field("Qtd./dia", <input className="input" type="number" value={deal.almocoQtd} onChange={(e) => set("almocoQtd", e.target.value)} />, "almocoQtd")}
                  {field("Valor (R$)", <input className="input" type="number" value={deal.almocoValor} onChange={(e) => set("almocoValor", e.target.value)} />, "almocoValor")}
                </div>
                <p className="cost-group-subtotal">{formatBRL(calc.almocoTotal)} no total</p>
              </div>

              <div className="cost-group">
                <div className="cost-group-icon" style={{ background: "var(--cat-3)" }}>
                  <DropletIcon />
                </div>
                <p className="cost-group-title">Combustível</p>
                <div className="cost-group-fields">
                  {field("Km/litro", <input className="input" type="number" value={deal.combKmPorLitro} onChange={(e) => set("combKmPorLitro", e.target.value)} />, "combKmPorLitro")}
                  {field("Valor do litro (R$)", <input className="input" type="number" value={deal.combValorLitro} onChange={(e) => set("combValorLitro", e.target.value)} />, "combValorLitro")}
                  {field("Km rodados/dia", <input className="input" type="number" value={deal.combKmRodar} onChange={(e) => set("combKmRodar", e.target.value)} />, "combKmRodar")}
                </div>
                <p className="cost-group-subtotal">{formatBRL(calc.combustivelTotal)} no total</p>
              </div>

              <div className="cost-group">
                <div className="cost-group-icon" style={{ background: "var(--cat-4)" }}>
                  <ParkingIcon />
                </div>
                <p className="cost-group-title">Estacionamento e pedágio</p>
                <div className="cost-group-fields">
                  {field("Estacionamento (R$)", <input className="input" type="number" value={deal.estacionamento} onChange={(e) => set("estacionamento", e.target.value)} />, "estacionamento")}
                  {field("Pedágio (R$)", <input className="input" type="number" value={deal.pedagio} onChange={(e) => set("pedagio", e.target.value)} />, "pedagio")}
                </div>
                <p className="cost-group-subtotal">{formatBRL(num(deal.estacionamento) + num(deal.pedagio))} no total</p>
              </div>
            </div>

            <div className="cost-total-banner">
              <span>Total de transporte e apoio</span>
              <strong>{formatBRL(calc.apoioTotal)}</strong>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <StepHeader index={3} />

            {deal.metragem && (
              <div className="area-estimate-box">
                <span>
                  Estimativa por metragem ({deal.metragem} m² · {deal.clientType})
                </span>
                <strong>{formatBRL(estimateProductCostByArea(deal.clientType, num(deal.metragem)))}</strong>
                <p className="microlabel" style={{ margin: 0, flexBasis: "100%" }}>
                  Cruzamento de referência com base no tipo de imóvel — não entra na conta sozinho, ajuste os produtos abaixo comparando com esse número.
                </p>
              </div>
            )}

            {(deal.produtos || []).length > 0 && (
              <div className="produtos-table">
                <div className="produtos-row produtos-header">
                  <span>Produto</span>
                  <span>Qtd.</span>
                  <span>Custo unit. (R$)</span>
                  <span>Subtotal</span>
                  <span></span>
                </div>
                {(deal.produtos || []).map((p, i) => (
                  <div className="produtos-row" key={i}>
                    <input
                      className="input"
                      placeholder="Ex: detergente"
                      aria-label={`Nome do produto ${i + 1}`}
                      value={p.nome}
                      onChange={(e) => setProduto(i, { nome: e.target.value })}
                    />
                    <input
                      className="input"
                      type="number"
                      min={0}
                      aria-label={`Quantidade do produto ${i + 1}${p.nome ? `: ${p.nome}` : ""}`}
                      value={p.quantidade}
                      onChange={(e) => setProduto(i, { quantidade: e.target.value })}
                    />
                    <input
                      className="input"
                      type="number"
                      aria-label={`Custo unitário do produto ${i + 1}${p.nome ? `: ${p.nome}` : ""}`}
                      value={p.valorUnitario}
                      onChange={(e) => setProduto(i, { valorUnitario: e.target.value })}
                    />
                    <span className="produtos-subtotal">{formatBRL(num(p.quantidade || "1") * num(p.valorUnitario))}</span>
                    <button
                      type="button"
                      className="icon-action-btn danger produtos-remove-btn"
                      onClick={() => removeProduto(i)}
                      aria-label={`Remover produto ${i + 1}${p.nome ? `: ${p.nome}` : ""}`}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))}
                <div className="produtos-row produtos-total-row">
                  <span>Total dos produtos</span>
                  <span></span>
                  <span></span>
                  <span className="produtos-subtotal">{formatBRL(calc.custoProdutos)}</span>
                  <span></span>
                </div>
              </div>
            )}
            <button type="button" className="icon-action-btn" onClick={addProduto} style={{ marginBottom: 16 }}>
              + adicionar produto
            </button>

            <div className="material-pct-box">
              <label htmlFor="qf-materialPctManual">% de materiais sobre o custo-base</label>
              <div className="material-pct-input">
                <input
                  id="qf-materialPctManual"
                  className="input"
                  type="number"
                  placeholder={`Automático: ${(calc.materialPct * 100).toFixed(0)}`}
                  value={deal.materialPctManual}
                  onChange={(e) => set("materialPctManual", e.target.value)}
                />
                <span className="material-pct-suffix">%</span>
              </div>
              <p className="microlabel" style={{ marginTop: 6 }}>
                Deixe em branco pra calcular automático com base nos produtos informados (agora: {(calc.materialPct * 100).toFixed(0)}%).
              </p>
            </div>

            <div className="cost-total-banner" style={{ marginTop: 16 }}>
              <span>Total de materiais (produtos + %)</span>
              <strong>{formatBRL(calc.materiaisTotal)}</strong>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <StepHeader index={4} />
            <div className="cost-group-grid">
              <div className="cost-group">
                <p className="cost-group-title">Custos administrativos</p>
                <div className="cost-group-fields">
                  {field("Visita técnica (R$)", <input className="input" type="number" value={deal.visitaTecnica} onChange={(e) => set("visitaTecnica", e.target.value)} />, "visitaTecnica")}
                  {field("Rateio ADM (R$)", <input className="input" type="number" value={deal.rateioAdm} onChange={(e) => set("rateioAdm", e.target.value)} />, "rateioAdm")}
                  {field("Nota fiscal (R$)", <input className="input" type="number" value={deal.valorNota} onChange={(e) => set("valorNota", e.target.value)} />, "valorNota")}
                  {field("Imposto (%)", <input className="input" type="number" value={deal.impostoPct} onChange={(e) => set("impostoPct", e.target.value)} />, "impostoPct")}
                </div>
              </div>

              <div className="cost-group">
                <p className="cost-group-title">Margem e preço final</p>
                <div className="cost-group-fields">
                  {field("Margem desejada (%)", <input className="input" type="number" value={deal.margem} onChange={(e) => set("margem", e.target.value)} />, "margem")}
                  {field(
                    "Forçar valor final (R$)",
                    <input className="input" type="number" value={deal.valorPagamento} onChange={(e) => set("valorPagamento", e.target.value)} />,
                    "valorPagamento",
                  )}
                </div>
              </div>
            </div>

            <div className="cost-total-banner">
              <span>Preço sugerido</span>
              <strong>{formatBRL(calc.valorFinal)}</strong>
            </div>
          </>
        )}

        <div className="wizard-nav">
          <button type="button" className="icon-action-btn" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            ← Voltar
          </button>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {step < lastStep && (
              <button type="button" className="link-btn" onClick={handleSave} disabled={saving}>
                salvar agora
              </button>
            )}
            {step < lastStep ? (
              <button type="button" className="save-btn" onClick={() => setStep((s) => Math.min(lastStep, s + 1))}>
                Avançar →
              </button>
            ) : (
              <button className="save-btn" onClick={handleSave} disabled={saving}>
                {isEditing ? "Salvar alterações" : "Salvar e enviar para propostas"}
              </button>
            )}
          </div>
        </div>

        {step === lastStep && (
          <div className="actions-row">
            <button className="pdf-btn" onClick={() => setPresenting(true)} type="button" title="Mostra a proposta em slides, pra apresentar no celular/tablet">
              Apresentar
            </button>
            <button className="pdf-btn" onClick={handleDownloadClientPdf} type="button" title="Proposta limpa, sem detalhamento de custos — pra mandar ao cliente">
              PDF para o cliente
            </button>
            <button className="pdf-btn" onClick={handleDownloadInternalPdf} type="button" title="Com detalhamento de custos — só pra uso interno da empresa">
              PDF interno (com custos)
            </button>
            {isEditing && onCancelEdit && (
              <button className="link-btn" type="button" onClick={onCancelEdit}>
                cancelar edição
              </button>
            )}
          </div>
        )}
        <p className={`save-msg${saveError ? " is-error" : ""}`} role="status" aria-live="polite">
          {saveMsg}
        </p>
      </div>

      <div className="panel">
        <h2 className="panel-title">Resumo do orçamento</h2>
        <p className="microlabel">Equipe</p>
        <p>{formatBRL(calc.maoDeObraTotal)}</p>
        <p className="microlabel">Transporte e alimentação</p>
        <p>{formatBRL(calc.apoioTotal)}</p>
        <p className="microlabel">Materiais ({(calc.materialPct * 100).toFixed(0)}%)</p>
        <p>{formatBRL(calc.materiaisTotal)}</p>
        <p className="microlabel">Impostos</p>
        <p>{formatBRL(calc.impostoTotal)}</p>
        <p className="microlabel">Custo operacional total</p>
        <p>{formatBRL(calc.custosOperacionais)}</p>
        <hr style={{ borderColor: "var(--n-800)" }} />
        <p className="microlabel">Preço sugerido</p>
        <p style={{ fontSize: 22, fontWeight: 700, color: "var(--amber-400)" }}>{formatBRL(calc.valorFinal)}</p>
        <p className="microlabel">Margem real: {(calc.margemReal * 100).toFixed(1)}%</p>
        <p className="microlabel">Custo por m²: {formatBRL(calc.custoPorM2)}</p>
      </div>
      </div>
      {presenting && (
        <PresentationView
          deal={{ ...deal, valorFinal: calc.valorFinal }}
          companyName={company.companyName || ""}
          logoUrl={company.logoUrl}
          onClose={() => setPresenting(false)}
        />
      )}
    </>
  );
}
