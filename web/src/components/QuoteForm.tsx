import { cloneElement, useEffect, useMemo, useState, type ReactElement } from "react";
import {
  emptyDeal,
  calcDeal,
  computeDataTermino,
  formatBRL,
  formatDateBR,
  formatPhoneBR,
  num,
  ROLES,
  LEAD_SOURCES,
  PAID_TRAFFIC_CHANNELS,
  type Deal,
  type ProdutoItem,
} from "../lib/calc";
import { downloadClientPdf, downloadInternalPdf } from "../lib/pdf";
import VisitChecklistTips from "./VisitChecklistTips";
import PresentationView from "./PresentationView";

interface Props {
  initialDeal?: Deal | null;
  companyName: string;
  logoUrl?: string | null;
  obraNumero: number;
  onSave: (deal: Deal) => Promise<void>;
  onCancelEdit?: () => void;
}

function field(label: string, input: ReactElement<{ id?: string }>, key: string) {
  const id = `qf-${key}`;
  return (
    <div className="field" key={key}>
      <label htmlFor={id}>{label}</label>
      {cloneElement(input, { id })}
    </div>
  );
}

export default function QuoteForm({ initialDeal, companyName, logoUrl, obraNumero, onSave, onCancelEdit }: Props) {
  const [deal, setDeal] = useState<Deal>(() => initialDeal || emptyDeal());
  const [saving, setSaving] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState(false);

  const calc = useMemo(() => calcDeal(deal), [deal]);
  const isEditing = !!deal.id;

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

  const [checklistChecked, setChecklistChecked] = useState<Set<string>>(new Set());

  function toggleChecklistItem(item: string) {
    const line = `• ${item}`;
    setChecklistChecked((prev) => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
        setDeal((d) => ({
          ...d,
          observacoesVisita: d.observacoesVisita
            .split("\n")
            .filter((l) => l !== line)
            .join("\n"),
        }));
      } else {
        next.add(item);
        setDeal((d) => ({
          ...d,
          observacoesVisita: d.observacoesVisita ? `${d.observacoesVisita}\n${line}` : line,
        }));
      }
      return next;
    });
  }

  async function handleSave() {
    if (!deal.clientName.trim()) {
      setSaveError(true);
      setSaveMsg("Preencha o nome do cliente.");
      return;
    }
    setSaving(true);
    setSaveMsg("");
    try {
      await onSave({ ...deal, valorFinal: calc.valorFinal });
      setSaveError(false);
      setSaveMsg(isEditing ? "Alterações salvas!" : "Orçamento salvo em Propostas!");
      if (!isEditing) setDeal(emptyDeal());
    } catch (e) {
      console.error("Falha ao salvar orçamento", e);
      setSaveError(true);
      setSaveMsg("Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadClientPdf() {
    await downloadClientPdf({ ...deal, valorFinal: calc.valorFinal }, companyName, logoUrl, deal.obraNumero || obraNumero);
  }

  async function handleDownloadInternalPdf() {
    await downloadInternalPdf({ ...deal, valorFinal: calc.valorFinal }, companyName, logoUrl, deal.obraNumero || obraNumero);
  }

  return (
    <>
      <VisitChecklistTips checked={checklistChecked} onToggle={toggleChecklistItem} />
      <div className="quote-grid">
      <div className="panel">
        <h2 className="panel-title">{isEditing ? "Editar orçamento" : "Novo orçamento"}</h2>

        <p className="eyebrow">Obra e cliente</p>
        <div className="field-grid">
          {field("Nome da obra", <input className="input" value={deal.obraNome} onChange={(e) => set("obraNome", e.target.value)} />, "obraNome")}
          {field("Cliente", <input className="input" value={deal.clientName} onChange={(e) => set("clientName", e.target.value)} required />, "clientName")}
          {field(
            "Tipo de cliente",
            <select className="input" value={deal.clientType} onChange={(e) => set("clientType", e.target.value as "PF" | "PJ")}>
              <option value="PF">Pessoa física</option>
              <option value="PJ">Pessoa jurídica</option>
            </select>,
            "clientType",
          )}
          {field("E-mail do cliente", <input className="input" type="email" value={deal.clienteEmail} onChange={(e) => set("clienteEmail", e.target.value)} />, "clienteEmail")}
          {field(
            "WhatsApp do cliente",
            <input
              className="input"
              type="tel"
              placeholder="Ex: (11) 9 8888-7777"
              value={deal.clientePhone}
              onChange={(e) => set("clientePhone", formatPhoneBR(e.target.value))}
            />,
            "clientePhone",
          )}
          {field("Endereço", <input className="input" value={deal.endereco} onChange={(e) => set("endereco", e.target.value)} />, "endereco")}
          {field("Responsável pelo serviço", <input className="input" value={deal.responsavel} onChange={(e) => set("responsavel", e.target.value)} />, "responsavel")}
          {field(
            "Como chegou até você",
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
              "Plataforma do tráfego pago",
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
          {field("Metragem (m²)", <input className="input" type="number" value={deal.metragem} onChange={(e) => set("metragem", e.target.value)} />, "metragem")}
          {field("Dias de serviço", <input className="input" type="number" value={deal.dias} onChange={(e) => set("dias", e.target.value)} />, "dias")}
          {field("Data de início", <input className="input" type="date" value={deal.dataInicio} onChange={(e) => set("dataInicio", e.target.value)} />, "dataInicio")}
          {field(
            "Data prevista para terminar",
            <input className="input" value={deal.dataTermino ? formatDateBR(deal.dataTermino) : "Preencha início e dias"} disabled />,
            "dataTermino",
          )}
          {field("Data da visita técnica", <input className="input" type="date" value={deal.dataVisitaTecnica} onChange={(e) => set("dataVisitaTecnica", e.target.value)} />, "dataVisitaTecnica")}
        </div>

        <div className="field">
          <label>Observações da vistoria (superfície, sujidade, estado da obra, restrições de acesso etc.)</label>
          <textarea
            className="input"
            rows={3}
            style={{ resize: "vertical" }}
            placeholder="Ex: piso porcelanato polido, cimento aderido em toda a área, rejunte epóxi nas pastilhas do banheiro, obra finalizada aguardando entrega."
            value={deal.observacoesVisita}
            onChange={(e) => set("observacoesVisita", e.target.value)}
          />
        </div>

        <p className="eyebrow" style={{ marginTop: 16 }}>
          Equipe
        </p>
        <div className="role-grid">
          {ROLES.map((r) => (
            <div className="role-card" key={r.key}>
              <p id={`role-label-${r.key}`}>{r.label}</p>
              <input
                className="input"
                type="number"
                placeholder="Qtd."
                aria-label={`Quantidade de ${r.label}`}
                aria-describedby={`role-label-${r.key}`}
                value={deal.qtd[r.key]}
                onChange={(e) => setRole("qtd", r.key, e.target.value)}
              />
              <input
                className="input"
                type="number"
                placeholder="Diária (R$)"
                aria-label={`Diária em reais de ${r.label}`}
                aria-describedby={`role-label-${r.key}`}
                value={deal.diaria[r.key]}
                onChange={(e) => setRole("diaria", r.key, e.target.value)}
              />
            </div>
          ))}
        </div>

        <p className="eyebrow" style={{ marginTop: 16 }}>
          Transporte, alimentação e apoio
        </p>
        <div className="field-grid">
          {field("Qtd. vale-transporte/dia", <input className="input" type="number" value={deal.vtQtd} onChange={(e) => set("vtQtd", e.target.value)} />, "vtQtd")}
          {field("Valor do VT (R$)", <input className="input" type="number" value={deal.vtValor} onChange={(e) => set("vtValor", e.target.value)} />, "vtValor")}
          {field("Qtd. almoços/dia", <input className="input" type="number" value={deal.almocoQtd} onChange={(e) => set("almocoQtd", e.target.value)} />, "almocoQtd")}
          {field("Valor do almoço (R$)", <input className="input" type="number" value={deal.almocoValor} onChange={(e) => set("almocoValor", e.target.value)} />, "almocoValor")}
          {field("Estacionamento (R$)", <input className="input" type="number" value={deal.estacionamento} onChange={(e) => set("estacionamento", e.target.value)} />, "estacionamento")}
          {field("Pedágio (R$)", <input className="input" type="number" value={deal.pedagio} onChange={(e) => set("pedagio", e.target.value)} />, "pedagio")}
          {field("Km/litro do veículo", <input className="input" type="number" value={deal.combKmPorLitro} onChange={(e) => set("combKmPorLitro", e.target.value)} />, "combKmPorLitro")}
          {field("Valor do litro (R$)", <input className="input" type="number" value={deal.combValorLitro} onChange={(e) => set("combValorLitro", e.target.value)} />, "combValorLitro")}
          {field("Km rodados/dia", <input className="input" type="number" value={deal.combKmRodar} onChange={(e) => set("combKmRodar", e.target.value)} />, "combKmRodar")}
        </div>

        <p className="eyebrow" style={{ marginTop: 16 }}>
          Materiais e produtos
        </p>
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
                  className="icon-action-btn danger"
                  onClick={() => removeProduto(i)}
                  aria-label={`Remover produto ${i + 1}${p.nome ? `: ${p.nome}` : ""}`}
                >
                  remover
                </button>
              </div>
            ))}
          </div>
        )}
        <button type="button" className="icon-action-btn" onClick={addProduto} style={{ marginBottom: 12 }}>
          + adicionar produto
        </button>
        <div className="field-grid">
          {field(
            `% de materiais sobre o custo-base (deixe vazio p/ automático: ${(calc.materialPct * 100).toFixed(0)}%)`,
            <input className="input" type="number" value={deal.materialPctManual} onChange={(e) => set("materialPctManual", e.target.value)} />,
            "materialPctManual",
          )}
        </div>

        <p className="eyebrow" style={{ marginTop: 16 }}>
          Custos administrativos e margem
        </p>
        <div className="field-grid">
          {field("Visita técnica (R$)", <input className="input" type="number" value={deal.visitaTecnica} onChange={(e) => set("visitaTecnica", e.target.value)} />, "visitaTecnica")}
          {field("Rateio administrativo (R$)", <input className="input" type="number" value={deal.rateioAdm} onChange={(e) => set("rateioAdm", e.target.value)} />, "rateioAdm")}
          {field("Valor da nota fiscal (R$)", <input className="input" type="number" value={deal.valorNota} onChange={(e) => set("valorNota", e.target.value)} />, "valorNota")}
          {field("Imposto (%)", <input className="input" type="number" value={deal.impostoPct} onChange={(e) => set("impostoPct", e.target.value)} />, "impostoPct")}
          {field("Margem desejada (%)", <input className="input" type="number" value={deal.margem} onChange={(e) => set("margem", e.target.value)} />, "margem")}
          {field(
            "Forçar valor final (R$, opcional)",
            <input className="input" type="number" value={deal.valorPagamento} onChange={(e) => set("valorPagamento", e.target.value)} />,
            "valorPagamento",
          )}
        </div>

        <div className="actions-row">
          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {isEditing ? "Salvar alterações" : "Salvar e enviar para propostas"}
          </button>
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
          companyName={companyName}
          logoUrl={logoUrl}
          onClose={() => setPresenting(false)}
        />
      )}
    </>
  );
}
