import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import {
  Calculator, LayoutGrid, BarChart3, Trash2, Plus, X, Save
} from "lucide-react";

/* ================= CONFIG ================= */

const STAGES = [
  { id: "contato_inicial", label: "Contato inicial" },
  { id: "em_andamento", label: "Em andamento" },
  { id: "follow_up", label: "Follow-up" },
  { id: "proposta_enviada", label: "Proposta enviada" },
  { id: "negociacao", label: "Negociação" },
  { id: "fechado", label: "Fechado" },
  { id: "perdido", label: "Perdido" },
];

const ROLES = [
  { key: "auxiliar", label: "Auxiliar de limpeza" },
  { key: "lider", label: "Líder" },
  { key: "supervisor", label: "Supervisor" },
];

const LEAD_SOURCES = ["Google", "Indicação", "Recorrente", "Outro"];

const STORAGE_KEY = "deals-v2";

const emptyDeal = () => ({
  id: null,
  obraNumero: null,
  obraNome: "",
  endereco: "",
  responsavel: "",
  dataInicio: "",
  dataTermino: "",
  clientName: "",
  clientType: "PF",
  leadSource: "Google",
  stage: "contato_inicial",
  createdAt: new Date().toISOString(),
  closedAt: null,

  metragem: "",
  dias: "",
  margem: "48",

  vtQtd: "",
  vtValor: "",
  almocoQtd: "",
  almocoValor: "",
  estacionamento: "",
  pedagio: "",
  combKmPorLitro: "",
  combValorLitro: "",
  combKmRodar: "",

  qtd: { auxiliar: "1", lider: "0", supervisor: "0" },
  diaria: { auxiliar: "120", lider: "180", supervisor: "150" },

  materiais: [],

  visitaTecnica: "",
  rateioAdm: "",
  valorNota: "",
  valorPagamento: "",
});

/* ================= HELPERS ================= */

const num = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

function formatBRL(value) {
  return (value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcDeal(d) {
  const dias = num(d.dias);

  const vtTotal = dias * num(d.vtQtd) * num(d.vtValor);
  const almocoTotal = dias * num(d.almocoQtd) * num(d.almocoValor);
  const estacionamento = num(d.estacionamento);
  const pedagio = num(d.pedagio);
  const combustivelTotal = num(d.combKmPorLitro) > 0
    ? (num(d.combKmRodar) / num(d.combKmPorLitro)) * num(d.combValorLitro)
    : 0;
  const apoioTotal = vtTotal + almocoTotal + estacionamento + pedagio + combustivelTotal;

  let maoDeObraTotal = 0;
  ROLES.forEach((r) => {
    maoDeObraTotal += num(d.qtd[r.key]) * num(d.diaria[r.key]) * dias;
  });

  const materiaisTotal = (d.materiais || []).reduce(
    (s, m) => s + num(m.qtd) * num(m.valorUnit), 0
  );

  const custosOperacionais =
    apoioTotal + maoDeObraTotal + materiaisTotal + num(d.rateioAdm) + num(d.visitaTecnica);

  const margem = Math.min(num(d.margem) / 100, 0.95);
  const precoVendaSugerido = margem < 1 ? custosOperacionais / (1 - margem) : custosOperacionais;
  const lucroRS = precoVendaSugerido - custosOperacionais;

  const valorPagamento = d.valorPagamento !== "" && d.valorPagamento != null
    ? num(d.valorPagamento)
    : precoVendaSugerido;

  const valorFinal = valorPagamento;
  const margemReal = valorFinal > 0 ? (valorFinal - custosOperacionais) / valorFinal : 0;
  const metragem = num(d.metragem);
  const custoPorM2 = metragem > 0 ? custosOperacionais / metragem : 0;

  return {
    vtTotal, almocoTotal, combustivelTotal, apoioTotal, maoDeObraTotal, materiaisTotal,
    custosOperacionais, precoVendaSugerido, lucroRS, valorFinal, margemReal, custoPorM2,
  };
}

/* ================= APP ================= */

export default function App() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("calc");
  const [form, setForm] = useState(emptyDeal());
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (res && res.value) setDeals(JSON.parse(res.value));
      } catch (e) {
        // sem dados ainda
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function persist(nextDeals) {
    setDeals(nextDeals);
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(nextDeals), false);
    } catch (e) {
      console.error("Falha ao salvar", e);
    }
  }

  function updateForm(patch) {
    setForm((f) => ({ ...f, ...patch }));
  }
  function updateNested(field, key, value) {
    setForm((f) => ({ ...f, [field]: { ...f[field], [key]: value } }));
  }

  function addMaterial() {
    setForm((f) => ({
      ...f,
      materiais: [...f.materiais, { id: Date.now().toString(), nome: "", qtd: "1", valorUnit: "" }],
    }));
  }
  function updateMaterial(id, patch) {
    setForm((f) => ({
      ...f,
      materiais: f.materiais.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  }
  function removeMaterial(id) {
    setForm((f) => ({ ...f, materiais: f.materiais.filter((m) => m.id !== id) }));
  }

  function saveDeal() {
    if (!form.clientName || !form.metragem) return;
    const computed = calcDeal(form);
    const record = { ...form, ...computed };

    let next;
    if (form.id) {
      next = deals.map((d) => (d.id === form.id ? record : d));
    } else {
      record.id = Date.now().toString();
      record.obraNumero = deals.length + 1;
      record.stage = record.stage || "contato_inicial";
      next = [...deals, record];
    }
    persist(next);
    setSaveMsg(form.id ? "Proposta atualizada." : "Proposta criada e enviada ao funil.");
    setTimeout(() => setSaveMsg(""), 2500);
    setForm(emptyDeal());
  }

  function editDeal(deal) {
    setForm(deal);
    setTab("calc");
  }

  function deleteDeal(id) {
    persist(deals.filter((d) => d.id !== id));
  }

  function moveStage(id, stage) {
    const next = deals.map((d) => {
      if (d.id !== id) return d;
      const closedAt = stage === "fechado" ? new Date().toISOString() : d.closedAt;
      return { ...d, stage, closedAt };
    });
    persist(next);
  }

  const preview = useMemo(() => calcDeal(form), [form]);
  const metrics = useMemo(() => computeMetrics(deals), [deals]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-200 flex items-center justify-center">
        Carregando dados...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-amber-400 uppercase">Canteiro</h1>
          <p className="text-xs text-neutral-500">Custo, proposta e funil — Arrow Shot</p>
        </div>
        <nav className="flex gap-1 bg-neutral-900 border border-neutral-800 rounded-md p-1">
          <TabButton active={tab === "calc"} onClick={() => setTab("calc")} icon={Calculator} label="Calculadora" />
          <TabButton active={tab === "funil"} onClick={() => setTab("funil")} icon={LayoutGrid} label="Funil" />
          <TabButton active={tab === "painel"} onClick={() => setTab("painel")} icon={BarChart3} label="Painel" />
        </nav>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {tab === "calc" && (
          <CalcTab
            form={form}
            updateForm={updateForm}
            updateNested={updateNested}
            addMaterial={addMaterial}
            updateMaterial={updateMaterial}
            removeMaterial={removeMaterial}
            preview={preview}
            saveDeal={saveDeal}
            saveMsg={saveMsg}
            resetForm={() => setForm(emptyDeal())}
            isEditing={!!form.id}
            nextObraNumero={deals.length + 1}
          />
        )}
        {tab === "funil" && (
          <FunilTab deals={deals} moveStage={moveStage} editDeal={editDeal} deleteDeal={deleteDeal} />
        )}
        {tab === "painel" && <PainelTab metrics={metrics} />}
      </main>
    </div>
  );
}

/* ================= METRICS ================= */

function computeMetrics(deals) {
  const totalLeads = deals.length;
  const leadsAtivos = deals.filter((d) => !["fechado", "perdido"].includes(d.stage)).length;
  const propostaStages = ["proposta_enviada", "negociacao", "fechado", "perdido"];
  const propostasEnviadas = deals.filter((d) => propostaStages.includes(d.stage)).length;
  const fechados = deals.filter((d) => d.stage === "fechado");
  const contratosGanhos = fechados.length;

  const ticketMedio = fechados.length
    ? fechados.reduce((s, d) => s + num(d.valorFinal), 0) / fechados.length
    : 0;

  const receitaPF = fechados.filter((d) => d.clientType === "PF").reduce((s, d) => s + num(d.valorFinal), 0);
  const receitaPJ = fechados.filter((d) => d.clientType === "PJ").reduce((s, d) => s + num(d.valorFinal), 0);

  const taxaConversao = totalLeads ? (contratosGanhos / totalLeads) * 100 : 0;

  const metragemEnviada = deals
    .filter((d) => propostaStages.includes(d.stage))
    .reduce((s, d) => s + num(d.metragem), 0);
  const metragemFechada = fechados.reduce((s, d) => s + num(d.metragem), 0);

  const precoMedioM2 = fechados.length
    ? fechados.reduce((s, d) => s + (num(d.metragem) ? num(d.valorFinal) / num(d.metragem) : 0), 0) / fechados.length
    : 0;

  const origemMap = {};
  LEAD_SOURCES.forEach((o) => (origemMap[o] = 0));
  deals.forEach((d) => {
    origemMap[d.leadSource] = (origemMap[d.leadSource] || 0) + 1;
  });
  const origemLead = Object.entries(origemMap).map(([name, value]) => ({ name, value }));

  const tipoCliente = [
    { name: "PF", value: deals.filter((d) => d.clientType === "PF").length },
    { name: "PJ", value: deals.filter((d) => d.clientType === "PJ").length },
  ];

  const mesMap = {};
  fechados.forEach((d) => {
    const dt = new Date(d.closedAt || d.createdAt);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    mesMap[key] = (mesMap[key] || 0) + num(d.valorFinal);
  });
  const resultadosPorMes = Object.entries(mesMap)
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([mes, valor]) => ({ mes, valor }));

  return {
    totalLeads, leadsAtivos, propostasEnviadas, contratosGanhos, ticketMedio,
    receitaPF, receitaPJ, taxaConversao, metragemEnviada, metragemFechada,
    precoMedioM2, origemLead, tipoCliente, resultadosPorMes,
  };
}

/* ================= SUBCOMPONENTS ================= */

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
        active ? "bg-amber-500 text-neutral-900" : "text-neutral-400 hover:text-neutral-200"
      }`}
    >
      <Icon size={15} /> {label}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-amber-500";

function CalcTab({
  form, updateForm, updateNested, addMaterial, updateMaterial, removeMaterial,
  preview, saveDeal, saveMsg, resetForm, isEditing, nextObraNumero,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-5">

        <section className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-neutral-200">
              Obra Nº {form.obraNumero || nextObraNumero} — {isEditing ? "editar proposta" : "nova proposta"}
            </h2>
            {isEditing && (
              <button onClick={resetForm} className="text-xs text-neutral-500 hover:text-neutral-300 flex items-center gap-1">
                <X size={13} /> cancelar edição
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-4">
            <Field label="Nome da obra / imóvel">
              <input className={inputCls} value={form.obraNome} onChange={(e) => updateForm({ obraNome: e.target.value })} placeholder="Ex: Apartamento decorado" />
            </Field>
            <Field label="Endereço da obra">
              <input className={inputCls} value={form.endereco} onChange={(e) => updateForm({ endereco: e.target.value })} />
            </Field>
            <Field label="Responsável pela obra">
              <input className={inputCls} value={form.responsavel} onChange={(e) => updateForm({ responsavel: e.target.value })} />
            </Field>
            <Field label="Cliente">
              <input className={inputCls} value={form.clientName} onChange={(e) => updateForm({ clientName: e.target.value })} placeholder="Nome do cliente" />
            </Field>
            <Field label="Data de início">
              <input type="date" className={inputCls} value={form.dataInicio} onChange={(e) => updateForm({ dataInicio: e.target.value })} />
            </Field>
            <Field label="Data de término">
              <input type="date" className={inputCls} value={form.dataTermino} onChange={(e) => updateForm({ dataTermino: e.target.value })} />
            </Field>
            <Field label="Tipo de cliente">
              <select className={inputCls} value={form.clientType} onChange={(e) => updateForm({ clientType: e.target.value })}>
                <option value="PF">Pessoa física</option>
                <option value="PJ">Pessoa jurídica</option>
              </select>
            </Field>
            <Field label="Origem do lead">
              <select className={inputCls} value={form.leadSource} onChange={(e) => updateForm({ leadSource: e.target.value })}>
                {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Metragem (m²)">
              <input type="number" className={inputCls} value={form.metragem} onChange={(e) => updateForm({ metragem: e.target.value })} />
            </Field>
            <Field label="Quantidade de dias">
              <input type="number" className={inputCls} value={form.dias} onChange={(e) => updateForm({ dias: e.target.value })} />
            </Field>
          </div>
        </section>

        <section className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-3">Apoio operacional (por dia)</p>
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="VT — qtd pessoas / valor unitário">
              <div className="flex gap-2">
                <input type="number" className={inputCls} placeholder="qtd" value={form.vtQtd} onChange={(e) => updateForm({ vtQtd: e.target.value })} />
                <input type="number" className={inputCls} placeholder="R$" value={form.vtValor} onChange={(e) => updateForm({ vtValor: e.target.value })} />
              </div>
            </Field>
            <Field label="Almoço — qtd pessoas / valor unitário">
              <div className="flex gap-2">
                <input type="number" className={inputCls} placeholder="qtd" value={form.almocoQtd} onChange={(e) => updateForm({ almocoQtd: e.target.value })} />
                <input type="number" className={inputCls} placeholder="R$" value={form.almocoValor} onChange={(e) => updateForm({ almocoValor: e.target.value })} />
              </div>
            </Field>
            <Field label="Estacionamento (R$ total)">
              <input type="number" className={inputCls} value={form.estacionamento} onChange={(e) => updateForm({ estacionamento: e.target.value })} />
            </Field>
            <Field label="Pedágio (R$ total)">
              <input type="number" className={inputCls} value={form.pedagio} onChange={(e) => updateForm({ pedagio: e.target.value })} />
            </Field>
          </div>
          <p className="text-[11px] text-neutral-500 mb-2 mt-1">Combustível (calculado automaticamente)</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-neutral-500">Média km/l</label>
              <input type="number" className={inputCls} value={form.combKmPorLitro} onChange={(e) => updateForm({ combKmPorLitro: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-neutral-500">Valor do combustível (R$/l)</label>
              <input type="number" className={inputCls} value={form.combValorLitro} onChange={(e) => updateForm({ combValorLitro: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-neutral-500">Km a rodar</label>
              <input type="number" className={inputCls} value={form.combKmRodar} onChange={(e) => updateForm({ combKmRodar: e.target.value })} />
            </div>
          </div>
        </section>

        <section className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-3">Mão de obra</p>
          <div className="grid grid-cols-3 gap-3">
            {ROLES.map((r) => (
              <div key={r.key} className="bg-neutral-900 border border-neutral-800 rounded p-3">
                <p className="text-xs text-neutral-400 mb-2">{r.label}</p>
                <label className="text-[10px] text-neutral-500">Qtd. pessoas</label>
                <input type="number" className={inputCls + " mb-2"} value={form.qtd[r.key]}
                  onChange={(e) => updateNested("qtd", r.key, e.target.value)} />
                <label className="text-[10px] text-neutral-500">Valor/dia (R$)</label>
                <input type="number" className={inputCls} value={form.diaria[r.key]}
                  onChange={(e) => updateNested("diaria", r.key, e.target.value)} />
              </div>
            ))}
          </div>
        </section>

        <section className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Produtos e materiais</p>
            <button onClick={addMaterial} className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300">
              <Plus size={13} /> item
            </button>
          </div>
          {form.materiais.length === 0 && (
            <p className="text-xs text-neutral-600">Nenhum material adicionado ainda.</p>
          )}
          <div className="space-y-2">
            {form.materiais.map((m) => (
              <div key={m.id} className="flex gap-2 items-center">
                <input className={inputCls} placeholder="Produto" value={m.nome}
                  onChange={(e) => updateMaterial(m.id, { nome: e.target.value })} />
                <input type="number" className={inputCls + " w-20"} placeholder="qtd" value={m.qtd}
                  onChange={(e) => updateMaterial(m.id, { qtd: e.target.value })} />
                <input type="number" className={inputCls + " w-28"} placeholder="R$ unit." value={m.valorUnit}
                  onChange={(e) => updateMaterial(m.id, { valorUnit: e.target.value })} />
                <span className="text-xs font-mono text-neutral-400 w-24 text-right">
                  {formatBRL(num(m.qtd) * num(m.valorUnit))}
                </span>
                <button onClick={() => removeMaterial(m.id)} className="text-neutral-600 hover:text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-5">
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="Curso / visita técnica (R$)">
              <input type="number" className={inputCls} value={form.visitaTecnica} onChange={(e) => updateForm({ visitaTecnica: e.target.value })} />
            </Field>
            <Field label="Rateio despesa administrativa (R$)">
              <input type="number" className={inputCls} value={form.rateioAdm} onChange={(e) => updateForm({ rateioAdm: e.target.value })} />
            </Field>
            <Field label="Margem de lucro alvo (%)">
              <input type="number" className={inputCls} value={form.margem} onChange={(e) => updateForm({ margem: e.target.value })} />
            </Field>
            <Field label="Valor da nota (opcional, informativo)">
              <input type="number" className={inputCls} value={form.valorNota} onChange={(e) => updateForm({ valorNota: e.target.value })} />
            </Field>
          </div>
          <Field label="Valor de pagamento (deixe em branco para usar o preço sugerido)">
            <input type="number" className={inputCls} value={form.valorPagamento} onChange={(e) => updateForm({ valorPagamento: e.target.value })} placeholder={formatBRL(preview.precoVendaSugerido)} />
          </Field>
        </section>

        <button onClick={saveDeal} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-neutral-900 font-semibold text-sm px-4 py-2.5 rounded">
          <Save size={15} /> {isEditing ? "Salvar alterações" : "Salvar e enviar ao funil"}
        </button>
        {saveMsg && <p className="text-xs text-emerald-400 mt-2">{saveMsg}</p>}
      </div>

      <div className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-5 h-fit sticky top-4">
        <h2 className="font-semibold text-neutral-200 mb-4">Resultado do cálculo</h2>
        <ul className="text-sm space-y-2 mb-4">
          <Row label="Apoio operacional" value={formatBRL(preview.apoioTotal)} />
          <Row label="Mão de obra" value={formatBRL(preview.maoDeObraTotal)} />
          <Row label="Materiais" value={formatBRL(preview.materiaisTotal)} />
          <Row label="Custo da obra (custos operacionais)" value={formatBRL(preview.custosOperacionais)} />
          <Row label="Preço de venda sugerido" value={formatBRL(preview.precoVendaSugerido)} />
          <Row label="Lucro (R$)" value={formatBRL(preview.lucroRS)} />
          <Row label="Custo por m²" value={formatBRL(preview.custoPorM2)} />
          {form.valorNota && <Row label="Valor da nota" value={formatBRL(num(form.valorNota))} />}
        </ul>
        <div className="border-t border-neutral-800 pt-4">
          <p className="text-[11px] uppercase tracking-wide text-neutral-500 mb-1">Valor de pagamento (final da proposta)</p>
          <p className="text-2xl font-bold text-amber-400 font-mono">{formatBRL(preview.valorFinal)}</p>
          <p className="text-xs text-neutral-500 mt-1">
            Margem de lucro real: <span className="text-neutral-300">{(preview.margemReal * 100).toFixed(1)}%</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <li className="flex justify-between border-b border-neutral-800/60 pb-1.5">
      <span className="text-neutral-500">{label}</span>
      <span className="font-mono text-neutral-200">{value}</span>
    </li>
  );
}

function FunilTab({ deals, moveStage, editDeal, deleteDeal }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-3 min-w-[1100px]">
        {STAGES.map((stage) => {
          const items = deals.filter((d) => d.stage === stage.id);
          return (
            <div key={stage.id} className="flex-1 min-w-[150px] bg-neutral-900/40 border border-neutral-800 rounded-lg">
              <div className="px-3 py-2 border-b border-neutral-800 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{stage.label}</span>
                <span className="text-[10px] text-neutral-600 font-mono">{items.length}</span>
              </div>
              <div className="p-2 space-y-2 min-h-[120px]">
                {items.map((d) => (
                  <div key={d.id} className="bg-neutral-900 border border-neutral-800 rounded p-2.5">
                    <div className="flex justify-between items-start gap-1">
                      <button onClick={() => editDeal(d)} className="text-sm font-medium text-neutral-200 text-left hover:text-amber-400">
                        {d.clientName || "Sem nome"}
                      </button>
                      <button onClick={() => deleteDeal(d.id)} className="text-neutral-600 hover:text-red-400">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <p className="text-[11px] text-neutral-500">{d.metragem || 0} m² · {d.clientType} · Obra {d.obraNumero}</p>
                    <p className="text-xs font-mono text-amber-400 mt-1">{formatBRL(d.valorFinal)}</p>
                    <select
                      value={d.stage}
                      onChange={(e) => moveStage(d.id, e.target.value)}
                      className="mt-2 w-full bg-neutral-950 border border-neutral-800 rounded text-[11px] px-1.5 py-1 text-neutral-300"
                    >
                      {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const PIE_COLORS = ["#F2A900", "#6FA085", "#8B8680", "#C8790A", "#4A4238"];

function PainelTab({ metrics: m }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total de leads" value={m.totalLeads} />
        <MetricCard label="Leads ativos" value={m.leadsAtivos} />
        <MetricCard label="Propostas enviadas" value={m.propostasEnviadas} />
        <MetricCard label="Contratos ganhos" value={m.contratosGanhos} />
        <MetricCard label="Ticket médio" value={formatBRL(m.ticketMedio)} />
        <MetricCard label="Taxa de conversão" value={`${m.taxaConversao.toFixed(1)}%`} />
        <MetricCard label="Preço médio / m²" value={formatBRL(m.precoMedioM2)} />
        <MetricCard label="Receita PF / PJ" value={`${formatBRL(m.receitaPF)} / ${formatBRL(m.receitaPJ)}`} small />
        <MetricCard label="Metragem enviada" value={`${m.metragemEnviada} m²`} />
        <MetricCard label="Metragem fechada" value={`${m.metragemFechada} m²`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard title="Resultados por mês (fechados)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={m.resultadosPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333029" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#A69C8D" }} />
              <YAxis tick={{ fontSize: 11, fill: "#A69C8D" }} />
              <Tooltip contentStyle={{ background: "#2A2823", border: "1px solid #423E36" }} />
              <Bar dataKey="valor" fill="#F2A900" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Origem do lead">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={m.origemLead} dataKey="value" nameKey="name" outerRadius={75}>
                {m.origemLead.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11, color: "#A69C8D" }} />
              <Tooltip contentStyle={{ background: "#2A2823", border: "1px solid #423E36" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tipo de cliente">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={m.tipoCliente} dataKey="value" nameKey="name" outerRadius={75}>
                {m.tipoCliente.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11, color: "#A69C8D" }} />
              <Tooltip contentStyle={{ background: "#2A2823", border: "1px solid #423E36" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function MetricCard({ label, value, small }) {
  return (
    <div className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-3.5">
      <p className="text-[10px] uppercase tracking-wide text-neutral-500 mb-1">{label}</p>
      <p className={`font-mono font-semibold text-neutral-100 ${small ? "text-sm" : "text-lg"}`}>{value}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">{title}</p>
      {children}
    </div>
  );
}
