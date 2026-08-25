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

const PIE_COLORS = ["#1D4ED8", "#0EA5E9", "#64748B", "#F59E0B", "#94A3B8"];

const LOGO_BASE64 = "data:image/png;base64,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";

function emptyDeal() {
  return {
    id: null,
    obraNumero: null,
    obraNome: "",
    endereco: "",
    responsavel: "",
    dataInicio: "",
    dataTermino: "",
    dataVisita: "",
    dataVisitaTecnica: "",
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
  };
}

/* ================= HELPERS ================= */

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function formatBRL(value) {
  return (value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function formatDateBR(v) {
  if (!v) return "Não informada";
  const [y, m, d] = v.split("-");
  if (!y || !m || !d) return v;
  return `${d}/${m}/${y}`;
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

/* ================= STATE ================= */

const state = {
  deals: [],
  tab: "calc",
  form: emptyDeal(),
  saveMsg: "",
};

function loadDeals() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.deals = raw ? JSON.parse(raw) : [];
  } catch (e) {
    state.deals = [];
  }
}

function persist(nextDeals) {
  state.deals = nextDeals;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDeals));
  } catch (e) {
    console.error("Falha ao salvar", e);
  }
}

/* ================= ACTIONS ================= */

function addMaterial() {
  state.form.materiais.push({ id: Date.now().toString(), nome: "", qtd: "1", valorUnit: "" });
  renderMaterialsList();
  updatePreview();
}

function removeMaterial(id) {
  state.form.materiais = state.form.materiais.filter((m) => m.id !== id);
  renderMaterialsList();
  updatePreview();
}

function saveDeal() {
  if (!state.form.clientName || !state.form.metragem) return;
  const computed = calcDeal(state.form);
  const record = Object.assign({}, state.form, computed);

  let next;
  if (state.form.id) {
    next = state.deals.map((d) => (d.id === state.form.id ? record : d));
  } else {
    record.id = Date.now().toString();
    record.obraNumero = state.deals.length + 1;
    record.stage = record.stage || "contato_inicial";
    next = state.deals.concat([record]);
  }
  const wasEditing = !!state.form.id;
  persist(next);
  state.saveMsg = wasEditing ? "Proposta atualizada." : "Proposta criada e enviada ao funil.";
  state.form = emptyDeal();
  renderCalcTab();
  setTimeout(() => {
    state.saveMsg = "";
    const el = document.getElementById("save-msg");
    if (el) el.textContent = "";
  }, 2500);
}

function editDeal(deal) {
  state.form = JSON.parse(JSON.stringify(deal));
  setTab("calc");
}

function deleteDeal(id) {
  persist(state.deals.filter((d) => d.id !== id));
  renderFunilTab();
}

function moveStage(id, stage) {
  state.deals = state.deals.map((d) => {
    if (d.id !== id) return d;
    const closedAt = stage === "fechado" ? new Date().toISOString() : d.closedAt;
    return Object.assign({}, d, { stage, closedAt });
  });
  persist(state.deals);
  renderFunilTab();
}

function setTab(tab) {
  state.tab = tab;
  document.querySelectorAll(".tabbtn").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
  document.getElementById("tab-" + tab).classList.remove("hidden");

  if (tab === "calc") renderCalcTab();
  if (tab === "funil") renderFunilTab();
  if (tab === "painel") renderPainelTab();
}

/* ================= RENDER: CALC TAB ================= */

function renderCalcTab() {
  const f = state.form;
  const nextObraNumero = state.deals.length + 1;
  const isEditing = !!f.id;

  const html = `
    <div class="calc-grid">
      <div class="calc-left">

        <section class="panel">
          <div class="panel-header">
            <h2 class="panel-title">Obra Nº ${esc(f.obraNumero || nextObraNumero)} — ${isEditing ? "editar proposta" : "novo orçamento"}</h2>
            ${isEditing ? `<button class="link-btn" id="btn-cancel-edit">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              cancelar edição
            </button>` : ""}
          </div>

          <div class="grid-2">
            <div class="field">
              <label>Nome do local (ex: Apartamento decorado)</label>
              <input class="input" id="f-obraNome" placeholder="Ex: Apartamento decorado" value="${esc(f.obraNome)}">
            </div>
            <div class="field">
              <label>Endereço</label>
              <input class="input" id="f-endereco" value="${esc(f.endereco)}">
            </div>
            <div class="field">
              <label>Nome do cliente</label>
              <input class="input" id="f-clientName" placeholder="Nome do cliente" value="${esc(f.clientName)}">
            </div>
            <div class="field">
              <label>Quem é o responsável pelo serviço</label>
              <input class="input" id="f-responsavel" value="${esc(f.responsavel)}">
            </div>
            <div class="field">
              <label>Tipo de cliente</label>
              <select class="input" id="f-clientType">
                <option value="PF" ${f.clientType === "PF" ? "selected" : ""}>Pessoa física</option>
                <option value="PJ" ${f.clientType === "PJ" ? "selected" : ""}>Pessoa jurídica (empresa)</option>
              </select>
            </div>
            <div class="field">
              <label>Como o cliente chegou até você</label>
              <select class="input" id="f-leadSource">
                ${LEAD_SOURCES.map((s) => `<option value="${esc(s)}" ${f.leadSource === s ? "selected" : ""}>${esc(s)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label>Data da visita ao local</label>
              <input type="date" class="input" id="f-dataVisita" value="${esc(f.dataVisita)}">
            </div>
            <div class="field">
              <label>Data da visita técnica</label>
              <input type="date" class="input" id="f-dataVisitaTecnica" value="${esc(f.dataVisitaTecnica)}">
            </div>
            <div class="field">
              <label>Data de início do serviço</label>
              <input type="date" class="input" id="f-dataInicio" value="${esc(f.dataInicio)}">
            </div>
            <div class="field">
              <label>Data prevista para terminar</label>
              <input type="date" class="input" id="f-dataTermino" value="${esc(f.dataTermino)}">
            </div>
            <div class="field">
              <label>Tamanho do local (m²)</label>
              <input type="number" class="input" id="f-metragem" value="${esc(f.metragem)}">
            </div>
            <div class="field">
              <label>Quantos dias vai durar o serviço</label>
              <input type="number" class="input" id="f-dias" value="${esc(f.dias)}">
            </div>
          </div>
        </section>

        <section class="panel">
          <p class="eyebrow">Transporte e alimentação (por dia de serviço)</p>
          <div class="grid-2">
            <div class="field">
              <label>Vale-transporte — pessoas e valor por pessoa</label>
              <div class="row-2">
                <input type="number" class="input" id="f-vtQtd" placeholder="pessoas" value="${esc(f.vtQtd)}">
                <input type="number" class="input" id="f-vtValor" placeholder="R$ por pessoa" value="${esc(f.vtValor)}">
              </div>
            </div>
            <div class="field">
              <label>Almoço — pessoas e valor por pessoa</label>
              <div class="row-2">
                <input type="number" class="input" id="f-almocoQtd" placeholder="pessoas" value="${esc(f.almocoQtd)}">
                <input type="number" class="input" id="f-almocoValor" placeholder="R$ por pessoa" value="${esc(f.almocoValor)}">
              </div>
            </div>
            <div class="field">
              <label>Estacionamento (total em R$)</label>
              <input type="number" class="input" id="f-estacionamento" value="${esc(f.estacionamento)}">
            </div>
            <div class="field">
              <label>Pedágio (total em R$)</label>
              <input type="number" class="input" id="f-pedagio" value="${esc(f.pedagio)}">
            </div>
          </div>
          <p class="microlabel" style="margin-bottom:8px;">Combustível — preenchendo estes 3 campos, calculamos o valor pra você</p>
          <div class="grid-3">
            <div>
              <label class="microlabel">Quantos km o carro faz por litro</label>
              <input type="number" class="input" id="f-combKmPorLitro" value="${esc(f.combKmPorLitro)}">
            </div>
            <div>
              <label class="microlabel">Preço do combustível (R$ por litro)</label>
              <input type="number" class="input" id="f-combValorLitro" value="${esc(f.combValorLitro)}">
            </div>
            <div>
              <label class="microlabel">Quantos km vai rodar no total</label>
              <input type="number" class="input" id="f-combKmRodar" value="${esc(f.combKmRodar)}">
            </div>
          </div>
        </section>

        <section class="panel">
          <p class="eyebrow">Equipe</p>
          <div class="grid-3">
            ${ROLES.map((r) => `
              <div class="role-card">
                <p>${esc(r.label)}</p>
                <label class="microlabel">Quantas pessoas</label>
                <input type="number" class="input" id="f-qtd-${r.key}" value="${esc(f.qtd[r.key])}">
                <label class="microlabel">Quanto paga por dia (R$)</label>
                <input type="number" class="input" id="f-diaria-${r.key}" value="${esc(f.diaria[r.key])}">
              </div>
            `).join("")}
          </div>
        </section>

        <section class="panel">
          <div class="panel-header" style="margin-bottom:12px;">
            <p class="eyebrow" style="margin:0;">Materiais e produtos usados</p>
            <button class="link-btn" id="btn-add-material" style="color:var(--amber-400);">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              adicionar item
            </button>
          </div>
          <div id="materials-list"></div>
        </section>

        <section class="panel">
          <div class="grid-2">
            <div class="field">
              <label>Custo da visita técnica (R$)</label>
              <input type="number" class="input" id="f-visitaTecnica" value="${esc(f.visitaTecnica)}">
            </div>
            <div class="field">
              <label>Despesas administrativas (R$)</label>
              <input type="number" class="input" id="f-rateioAdm" value="${esc(f.rateioAdm)}">
            </div>
            <div class="field">
              <label>Quanto de lucro você quer (%)</label>
              <input type="number" class="input" id="f-margem" value="${esc(f.margem)}">
            </div>
            <div class="field">
              <label>Valor da nota fiscal (opcional)</label>
              <input type="number" class="input" id="f-valorNota" value="${esc(f.valorNota)}">
            </div>
          </div>
          <div class="field">
            <label>Valor combinado com o cliente (deixe vazio para usar o preço sugerido)</label>
            <input type="number" class="input" id="f-valorPagamento" value="${esc(f.valorPagamento)}">
          </div>
        </section>

        <div class="action-row">
          <button class="pdf-btn" id="btn-download-pdf">
            <svg class="icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><polyline points="9 15 12 18 15 15"></polyline></svg>
            Baixar PDF do orçamento
          </button>
          <button class="save-btn" id="btn-save-deal">
            <svg class="icon" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            ${isEditing ? "Salvar alterações" : "Salvar e enviar para propostas"}
          </button>
        </div>
        <p class="save-msg" id="save-msg">${esc(state.saveMsg)}</p>
      </div>

      <div class="panel preview-panel">
        <h2 class="panel-title">Resumo do orçamento</h2>
        <ul class="result-list" id="result-list"></ul>
        <div class="final-block">
          <p class="eyebrow">Valor final da proposta</p>
          <p class="final-value" id="final-value"></p>
          <p class="final-margin">Margem de lucro real: <span id="final-margin"></span></p>
        </div>
      </div>
    </div>
  `;

  document.getElementById("tab-calc").innerHTML = html;

  attachCalcListeners();
  renderMaterialsList();
  updatePreview();

  const cancelBtn = document.getElementById("btn-cancel-edit");
  if (cancelBtn) cancelBtn.addEventListener("click", () => { state.form = emptyDeal(); renderCalcTab(); });
  document.getElementById("btn-add-material").addEventListener("click", addMaterial);
  document.getElementById("btn-save-deal").addEventListener("click", saveDeal);
  document.getElementById("btn-download-pdf").addEventListener("click", () => downloadPdf(state.form));
}

function attachCalcListeners() {
  const f = state.form;
  const bind = (id, field, isNumberString) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", (e) => {
      f[field] = e.target.value;
      updatePreview();
    });
  };

  bind("f-obraNome", "obraNome");
  bind("f-endereco", "endereco");
  bind("f-responsavel", "responsavel");
  bind("f-clientName", "clientName");
  bind("f-dataInicio", "dataInicio");
  bind("f-dataTermino", "dataTermino");
  bind("f-dataVisita", "dataVisita");
  bind("f-dataVisitaTecnica", "dataVisitaTecnica");
  bind("f-clientType", "clientType");
  bind("f-leadSource", "leadSource");
  bind("f-metragem", "metragem");
  bind("f-dias", "dias");

  bind("f-vtQtd", "vtQtd");
  bind("f-vtValor", "vtValor");
  bind("f-almocoQtd", "almocoQtd");
  bind("f-almocoValor", "almocoValor");
  bind("f-estacionamento", "estacionamento");
  bind("f-pedagio", "pedagio");
  bind("f-combKmPorLitro", "combKmPorLitro");
  bind("f-combValorLitro", "combValorLitro");
  bind("f-combKmRodar", "combKmRodar");

  bind("f-visitaTecnica", "visitaTecnica");
  bind("f-rateioAdm", "rateioAdm");
  bind("f-margem", "margem");
  bind("f-valorNota", "valorNota");
  bind("f-valorPagamento", "valorPagamento");

  ROLES.forEach((r) => {
    const qtdEl = document.getElementById(`f-qtd-${r.key}`);
    qtdEl.addEventListener("input", (e) => { f.qtd[r.key] = e.target.value; updatePreview(); });
    const diariaEl = document.getElementById(`f-diaria-${r.key}`);
    diariaEl.addEventListener("input", (e) => { f.diaria[r.key] = e.target.value; updatePreview(); });
  });
}

function renderMaterialsList() {
  const container = document.getElementById("materials-list");
  const materiais = state.form.materiais;

  if (materiais.length === 0) {
    container.innerHTML = `<p class="empty-note">Nenhum material adicionado ainda.</p>`;
    return;
  }

  container.innerHTML = materiais.map((m) => `
    <div class="material-row" data-id="${esc(m.id)}">
      <input class="input name" placeholder="Produto" value="${esc(m.nome)}" data-field="nome">
      <input type="number" class="input qtd" placeholder="qtd" value="${esc(m.qtd)}" data-field="qtd">
      <input type="number" class="input price" placeholder="R$ unit." value="${esc(m.valorUnit)}" data-field="valorUnit">
      <span class="material-total" data-total>${formatBRL(num(m.qtd) * num(m.valorUnit))}</span>
      <button class="icon-btn" data-remove>
        <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
      </button>
    </div>
  `).join("");

  container.querySelectorAll(".material-row").forEach((row) => {
    const id = row.dataset.id;
    const material = materiais.find((m) => m.id === id);

    row.querySelectorAll("input[data-field]").forEach((input) => {
      input.addEventListener("input", (e) => {
        material[e.target.dataset.field] = e.target.value;
        row.querySelector("[data-total]").textContent = formatBRL(num(material.qtd) * num(material.valorUnit));
        updatePreview();
      });
    });

    row.querySelector("[data-remove]").addEventListener("click", () => removeMaterial(id));
  });
}

function updatePreview() {
  const preview = calcDeal(state.form);

  const rows = [
    ["Transporte e alimentação", formatBRL(preview.apoioTotal)],
    ["Equipe", formatBRL(preview.maoDeObraTotal)],
    ["Materiais", formatBRL(preview.materiaisTotal)],
    ["Custo total do serviço", formatBRL(preview.custosOperacionais)],
    ["Preço sugerido para o cliente", formatBRL(preview.precoVendaSugerido)],
    ["Lucro estimado", formatBRL(preview.lucroRS)],
    ["Custo por m²", formatBRL(preview.custoPorM2)],
  ];
  if (state.form.valorNota) {
    rows.push(["Valor da nota fiscal", formatBRL(num(state.form.valorNota))]);
  }

  const list = document.getElementById("result-list");
  if (list) {
    list.innerHTML = rows.map(([label, value]) => `
      <li class="result-row"><span class="label">${esc(label)}</span><span class="value">${esc(value)}</span></li>
    `).join("");
  }

  const finalValueEl = document.getElementById("final-value");
  if (finalValueEl) finalValueEl.textContent = formatBRL(preview.valorFinal);

  const finalMarginEl = document.getElementById("final-margin");
  if (finalMarginEl) finalMarginEl.textContent = (preview.margemReal * 100).toFixed(1) + "%";

  const valorPagamentoEl = document.getElementById("f-valorPagamento");
  if (valorPagamentoEl) valorPagamentoEl.placeholder = formatBRL(preview.precoVendaSugerido);
}

/* ================= RENDER: FUNIL TAB ================= */

function renderFunilTab() {
  const deals = state.deals;

  const html = `
    <div class="funil-scroll">
      <div class="funil-board">
        ${STAGES.map((stage) => {
          const items = deals.filter((d) => d.stage === stage.id);
          return `
            <div class="funil-col">
              <div class="funil-col-head">
                <span>${esc(stage.label)}</span>
                <span class="funil-count">${items.length}</span>
              </div>
              <div class="funil-col-body">
                ${items.map((d) => `
                  <div class="deal-card" data-id="${esc(d.id)}">
                    <div class="deal-card-top">
                      <button class="deal-name" data-edit>${esc(d.clientName || "Sem nome")}</button>
                      <button class="icon-btn" data-delete>
                        <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
                      </button>
                    </div>
                    <p class="deal-meta">${esc(d.metragem || 0)} m² · ${esc(d.clientType)} · Obra ${esc(d.obraNumero)}</p>
                    <p class="deal-value">${formatBRL(d.valorFinal)}</p>
                    <select class="deal-stage-select" data-stage-select>
                      ${STAGES.map((s) => `<option value="${esc(s.id)}" ${d.stage === s.id ? "selected" : ""}>${esc(s.label)}</option>`).join("")}
                    </select>
                  </div>
                `).join("")}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;

  document.getElementById("tab-funil").innerHTML = html;

  document.querySelectorAll("#tab-funil .deal-card").forEach((card) => {
    const id = card.dataset.id;
    const deal = deals.find((d) => d.id === id);
    card.querySelector("[data-edit]").addEventListener("click", () => editDeal(deal));
    card.querySelector("[data-delete]").addEventListener("click", () => deleteDeal(id));
    card.querySelector("[data-stage-select]").addEventListener("change", (e) => moveStage(id, e.target.value));
  });
}

/* ================= RENDER: PAINEL TAB ================= */

function renderPainelTab() {
  const m = computeMetrics(state.deals);

  const html = `
    <div class="painel-wrap">
      <div class="metric-grid">
        ${metricCard("Total de clientes", m.totalLeads)}
        ${metricCard("Em andamento", m.leadsAtivos)}
        ${metricCard("Propostas enviadas", m.propostasEnviadas)}
        ${metricCard("Negócios fechados", m.contratosGanhos)}
        ${metricCard("Valor médio por negócio", formatBRL(m.ticketMedio))}
        ${metricCard("Taxa de conversão", m.taxaConversao.toFixed(1) + "%")}
        ${metricCard("Preço médio por m²", formatBRL(m.precoMedioM2))}
        ${metricCard("Faturamento PF / PJ", `${formatBRL(m.receitaPF)} / ${formatBRL(m.receitaPJ)}`, true)}
        ${metricCard("Área orçada", `${m.metragemEnviada} m²`)}
        ${metricCard("Área fechada", `${m.metragemFechada} m²`)}
      </div>

      <div class="chart-grid">
        <div class="chart-card">
          <p class="chart-title">Faturamento por mês (negócios fechados)</p>
          <div id="chart-bar"></div>
        </div>
        <div class="chart-card">
          <p class="chart-title">De onde vieram os clientes</p>
          <div id="chart-origem"></div>
        </div>
        <div class="chart-card">
          <p class="chart-title">Tipo de cliente</p>
          <div id="chart-tipo"></div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("tab-painel").innerHTML = html;

  renderBarChart(document.getElementById("chart-bar"), m.resultadosPorMes);
  renderPieChart(document.getElementById("chart-origem"), m.origemLead);
  renderPieChart(document.getElementById("chart-tipo"), m.tipoCliente);
}

function metricCard(label, value, small) {
  return `
    <div class="metric-card">
      <p class="metric-label">${esc(label)}</p>
      <p class="metric-value${small ? " small" : ""}">${esc(value)}</p>
    </div>
  `;
}

/* ================= CHARTS (SVG) ================= */

function renderBarChart(container, data) {
  if (!data.length) {
    container.innerHTML = `<div class="chart-empty">Sem dados</div>`;
    return;
  }
  const w = 400, h = 220, padL = 36, padB = 28, padT = 10, padR = 10;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;
  const maxVal = Math.max(...data.map((d) => d.valor), 1);
  const barSlot = chartW / data.length;
  const barW = Math.min(barSlot * 0.6, 48);

  const style = getComputedStyle(document.documentElement);
  const gridColor = style.getPropertyValue("--n-800").trim() || "#E1E5EC";
  const labelColor = style.getPropertyValue("--n-500").trim() || "#67728A";
  const barColor = style.getPropertyValue("--amber-500").trim() || "#1D4ED8";

  let bars = "";
  let labels = "";
  const gridLines = 4;
  let grid = "";
  for (let i = 0; i <= gridLines; i++) {
    const y = padT + (chartH / gridLines) * i;
    grid += `<line x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}" stroke="${gridColor}" stroke-width="1"/>`;
  }

  data.forEach((d, i) => {
    const barH = maxVal > 0 ? (d.valor / maxVal) * chartH : 0;
    const x = padL + i * barSlot + (barSlot - barW) / 2;
    const y = padT + chartH - barH;
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${barColor}" rx="3"><title>${esc(d.mes)}: ${esc(formatBRL(d.valor))}</title></rect>`;
    labels += `<text x="${(x + barW / 2).toFixed(1)}" y="${h - padB + 14}" font-size="10" fill="${labelColor}" text-anchor="middle">${esc(d.mes)}</text>`;
  });

  container.innerHTML = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:220px;">${grid}${bars}${labels}</svg>`;
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
}

function renderPieChart(container, data) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) {
    container.innerHTML = `<div class="chart-empty">Sem dados</div>`;
    return;
  }
  const size = 180, cx = size / 2, cy = size / 2, r = 75;
  let angle = 0;
  let slices = "";
  data.forEach((d, i) => {
    if (d.value <= 0) return;
    const sweep = Math.min((d.value / total) * 360, 359.99);
    const path = describeArc(cx, cy, r, angle, angle + sweep);
    slices += `<path d="${path}" fill="${PIE_COLORS[i % PIE_COLORS.length]}"><title>${esc(d.name)}: ${d.value}</title></path>`;
    angle += sweep;
  });

  const legend = data.map((d, i) => `
    <span class="legend-item">
      <span class="legend-swatch" style="background:${PIE_COLORS[i % PIE_COLORS.length]}"></span>
      ${esc(d.name)} (${d.value})
    </span>
  `).join("");

  container.innerHTML = `
    <svg viewBox="0 0 ${size} ${size}" style="width:100%;height:220px;">${slices}</svg>
    <div class="legend">${legend}</div>
  `;
}

/* ================= PDF ================= */

function downloadPdf(deal) {
  if (typeof window.jspdf === "undefined") {
    alert("Não foi possível gerar o PDF agora. Verifique sua conexão com a internet e tente novamente.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const calc = calcDeal(deal);
  const pageW = 210;
  const marginX = 18;
  let y = 20;

  doc.addImage(LOGO_BASE64, "PNG", marginX, 10, 16, 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 32, 58);
  doc.text("Arrow Shot", marginX + 20, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(103, 114, 138);
  doc.text("Orçamento de serviço", marginX + 20, 24);

  doc.setDrawColor(225, 229, 236);
  doc.line(marginX, 30, pageW - marginX, 30);

  y = 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20, 32, 58);
  const numeroObra = deal.obraNumero || state.deals.length + 1;
  doc.text(`Obra Nº ${numeroObra} — ${deal.obraNome || "Sem nome"}`, marginX, y);
  y += 10;

  const addSectionTitle = (title) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(29, 78, 216);
    doc.text(title, marginX, y);
    y += 7;
  };

  const addRow = (label, value) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(103, 114, 138);
    doc.text(label, marginX, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 32, 58);
    doc.text(String(value == null || value === "" ? "-" : value), marginX + 68, y);
    y += 6.5;
  };

  addSectionTitle("Dados do cliente e da obra");
  addRow("Cliente", deal.clientName || "-");
  addRow("Tipo de cliente", deal.clientType === "PJ" ? "Pessoa jurídica" : "Pessoa física");
  addRow("Endereço", deal.endereco || "-");
  addRow("Responsável pelo serviço", deal.responsavel || "-");
  addRow("Como o cliente chegou até você", deal.leadSource || "-");
  addRow("Tamanho do local", `${deal.metragem || 0} m²`);
  addRow("Duração do serviço", `${deal.dias || 0} dia(s)`);
  y += 2;
  addRow("Data da visita ao local", formatDateBR(deal.dataVisita));
  addRow("Data da visita técnica", formatDateBR(deal.dataVisitaTecnica));
  addRow("Data de início do serviço", formatDateBR(deal.dataInicio));
  addRow("Data prevista para terminar", formatDateBR(deal.dataTermino));

  y += 5;
  addSectionTitle("Resumo de custos");
  addRow("Transporte e alimentação", formatBRL(calc.apoioTotal));
  addRow("Equipe", formatBRL(calc.maoDeObraTotal));
  addRow("Materiais", formatBRL(calc.materiaisTotal));
  addRow("Custo total do serviço", formatBRL(calc.custosOperacionais));

  y += 6;
  doc.setDrawColor(225, 229, 236);
  doc.line(marginX, y, pageW - marginX, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(103, 114, 138);
  doc.text("Valor final da proposta", marginX, y);
  y += 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(29, 78, 216);
  doc.text(formatBRL(calc.valorFinal), marginX, y);

  y += 9;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(103, 114, 138);
  doc.text(`Margem de lucro real: ${(calc.margemReal * 100).toFixed(1)}%`, marginX, y);

  const agora = new Date();
  const geradoEm = agora.toLocaleDateString("pt-BR") + " às " + agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  doc.setFontSize(8);
  doc.setTextColor(150, 160, 175);
  doc.text(`Gerado em ${geradoEm} — Arrow Shot`, marginX, 287);

  const nomeArquivo = (deal.clientName || "cliente")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  doc.save(`orcamento-obra-${numeroObra}-${nomeArquivo || "cliente"}.pdf`);
}

/* ================= INIT ================= */

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  try {
    localStorage.setItem("orcei-theme", theme);
  } catch (e) {}
}

function initTheme() {
  let saved = "light";
  try {
    saved = localStorage.getItem("orcei-theme") || "light";
  } catch (e) {}
  applyTheme(saved);

  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.addEventListener("click", () => {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      applyTheme(isDark ? "light" : "dark");
      if (state.tab === "painel") renderPainelTab();
    });
  }
}

function init() {
  initTheme();
  loadDeals();

  document.querySelectorAll(".tabbtn").forEach((btn) => {
    btn.addEventListener("click", () => setTab(btn.dataset.tab));
  });

  renderCalcTab();
}

document.addEventListener("DOMContentLoaded", init);
