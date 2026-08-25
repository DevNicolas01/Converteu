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

const PIE_COLORS = ["#F2A900", "#6FA085", "#8B8680", "#C8790A", "#4A4238"];

function emptyDeal() {
  return {
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
            <h2 class="panel-title">Obra Nº ${esc(f.obraNumero || nextObraNumero)} — ${isEditing ? "editar proposta" : "nova proposta"}</h2>
            ${isEditing ? `<button class="link-btn" id="btn-cancel-edit">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              cancelar edição
            </button>` : ""}
          </div>

          <div class="grid-2">
            <div class="field">
              <label>Nome da obra / imóvel</label>
              <input class="input" id="f-obraNome" placeholder="Ex: Apartamento decorado" value="${esc(f.obraNome)}">
            </div>
            <div class="field">
              <label>Endereço da obra</label>
              <input class="input" id="f-endereco" value="${esc(f.endereco)}">
            </div>
            <div class="field">
              <label>Responsável pela obra</label>
              <input class="input" id="f-responsavel" value="${esc(f.responsavel)}">
            </div>
            <div class="field">
              <label>Cliente</label>
              <input class="input" id="f-clientName" placeholder="Nome do cliente" value="${esc(f.clientName)}">
            </div>
            <div class="field">
              <label>Data de início</label>
              <input type="date" class="input" id="f-dataInicio" value="${esc(f.dataInicio)}">
            </div>
            <div class="field">
              <label>Data de término</label>
              <input type="date" class="input" id="f-dataTermino" value="${esc(f.dataTermino)}">
            </div>
            <div class="field">
              <label>Tipo de cliente</label>
              <select class="input" id="f-clientType">
                <option value="PF" ${f.clientType === "PF" ? "selected" : ""}>Pessoa física</option>
                <option value="PJ" ${f.clientType === "PJ" ? "selected" : ""}>Pessoa jurídica</option>
              </select>
            </div>
            <div class="field">
              <label>Origem do lead</label>
              <select class="input" id="f-leadSource">
                ${LEAD_SOURCES.map((s) => `<option value="${esc(s)}" ${f.leadSource === s ? "selected" : ""}>${esc(s)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label>Metragem (m²)</label>
              <input type="number" class="input" id="f-metragem" value="${esc(f.metragem)}">
            </div>
            <div class="field">
              <label>Quantidade de dias</label>
              <input type="number" class="input" id="f-dias" value="${esc(f.dias)}">
            </div>
          </div>
        </section>

        <section class="panel">
          <p class="eyebrow">Apoio operacional (por dia)</p>
          <div class="grid-2">
            <div class="field">
              <label>VT — qtd pessoas / valor unitário</label>
              <div class="row-2">
                <input type="number" class="input" id="f-vtQtd" placeholder="qtd" value="${esc(f.vtQtd)}">
                <input type="number" class="input" id="f-vtValor" placeholder="R$" value="${esc(f.vtValor)}">
              </div>
            </div>
            <div class="field">
              <label>Almoço — qtd pessoas / valor unitário</label>
              <div class="row-2">
                <input type="number" class="input" id="f-almocoQtd" placeholder="qtd" value="${esc(f.almocoQtd)}">
                <input type="number" class="input" id="f-almocoValor" placeholder="R$" value="${esc(f.almocoValor)}">
              </div>
            </div>
            <div class="field">
              <label>Estacionamento (R$ total)</label>
              <input type="number" class="input" id="f-estacionamento" value="${esc(f.estacionamento)}">
            </div>
            <div class="field">
              <label>Pedágio (R$ total)</label>
              <input type="number" class="input" id="f-pedagio" value="${esc(f.pedagio)}">
            </div>
          </div>
          <p class="microlabel" style="margin-bottom:8px;">Combustível (calculado automaticamente)</p>
          <div class="grid-3">
            <div>
              <label class="microlabel">Média km/l</label>
              <input type="number" class="input" id="f-combKmPorLitro" value="${esc(f.combKmPorLitro)}">
            </div>
            <div>
              <label class="microlabel">Valor do combustível (R$/l)</label>
              <input type="number" class="input" id="f-combValorLitro" value="${esc(f.combValorLitro)}">
            </div>
            <div>
              <label class="microlabel">Km a rodar</label>
              <input type="number" class="input" id="f-combKmRodar" value="${esc(f.combKmRodar)}">
            </div>
          </div>
        </section>

        <section class="panel">
          <p class="eyebrow">Mão de obra</p>
          <div class="grid-3">
            ${ROLES.map((r) => `
              <div class="role-card">
                <p>${esc(r.label)}</p>
                <label class="microlabel">Qtd. pessoas</label>
                <input type="number" class="input" id="f-qtd-${r.key}" value="${esc(f.qtd[r.key])}">
                <label class="microlabel">Valor/dia (R$)</label>
                <input type="number" class="input" id="f-diaria-${r.key}" value="${esc(f.diaria[r.key])}">
              </div>
            `).join("")}
          </div>
        </section>

        <section class="panel">
          <div class="panel-header" style="margin-bottom:12px;">
            <p class="eyebrow" style="margin:0;">Produtos e materiais</p>
            <button class="link-btn" id="btn-add-material" style="color:var(--amber-400);">
              <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              item
            </button>
          </div>
          <div id="materials-list"></div>
        </section>

        <section class="panel">
          <div class="grid-2">
            <div class="field">
              <label>Curso / visita técnica (R$)</label>
              <input type="number" class="input" id="f-visitaTecnica" value="${esc(f.visitaTecnica)}">
            </div>
            <div class="field">
              <label>Rateio despesa administrativa (R$)</label>
              <input type="number" class="input" id="f-rateioAdm" value="${esc(f.rateioAdm)}">
            </div>
            <div class="field">
              <label>Margem de lucro alvo (%)</label>
              <input type="number" class="input" id="f-margem" value="${esc(f.margem)}">
            </div>
            <div class="field">
              <label>Valor da nota (opcional, informativo)</label>
              <input type="number" class="input" id="f-valorNota" value="${esc(f.valorNota)}">
            </div>
          </div>
          <div class="field">
            <label>Valor de pagamento (deixe em branco para usar o preço sugerido)</label>
            <input type="number" class="input" id="f-valorPagamento" value="${esc(f.valorPagamento)}">
          </div>
        </section>

        <button class="save-btn" id="btn-save-deal">
          <svg class="icon" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
          ${isEditing ? "Salvar alterações" : "Salvar e enviar ao funil"}
        </button>
        <p class="save-msg" id="save-msg">${esc(state.saveMsg)}</p>
      </div>

      <div class="panel preview-panel">
        <h2 class="panel-title">Resultado do cálculo</h2>
        <ul class="result-list" id="result-list"></ul>
        <div class="final-block">
          <p class="eyebrow">Valor de pagamento (final da proposta)</p>
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
    ["Apoio operacional", formatBRL(preview.apoioTotal)],
    ["Mão de obra", formatBRL(preview.maoDeObraTotal)],
    ["Materiais", formatBRL(preview.materiaisTotal)],
    ["Custo da obra (custos operacionais)", formatBRL(preview.custosOperacionais)],
    ["Preço de venda sugerido", formatBRL(preview.precoVendaSugerido)],
    ["Lucro (R$)", formatBRL(preview.lucroRS)],
    ["Custo por m²", formatBRL(preview.custoPorM2)],
  ];
  if (state.form.valorNota) {
    rows.push(["Valor da nota", formatBRL(num(state.form.valorNota))]);
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
        ${metricCard("Total de leads", m.totalLeads)}
        ${metricCard("Leads ativos", m.leadsAtivos)}
        ${metricCard("Propostas enviadas", m.propostasEnviadas)}
        ${metricCard("Contratos ganhos", m.contratosGanhos)}
        ${metricCard("Ticket médio", formatBRL(m.ticketMedio))}
        ${metricCard("Taxa de conversão", m.taxaConversao.toFixed(1) + "%")}
        ${metricCard("Preço médio / m²", formatBRL(m.precoMedioM2))}
        ${metricCard("Receita PF / PJ", `${formatBRL(m.receitaPF)} / ${formatBRL(m.receitaPJ)}`, true)}
        ${metricCard("Metragem enviada", `${m.metragemEnviada} m²`)}
        ${metricCard("Metragem fechada", `${m.metragemFechada} m²`)}
      </div>

      <div class="chart-grid">
        <div class="chart-card">
          <p class="chart-title">Resultados por mês (fechados)</p>
          <div id="chart-bar"></div>
        </div>
        <div class="chart-card">
          <p class="chart-title">Origem do lead</p>
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

  let bars = "";
  let labels = "";
  const gridLines = 4;
  let grid = "";
  for (let i = 0; i <= gridLines; i++) {
    const y = padT + (chartH / gridLines) * i;
    grid += `<line x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}" stroke="#333029" stroke-width="1"/>`;
  }

  data.forEach((d, i) => {
    const barH = maxVal > 0 ? (d.valor / maxVal) * chartH : 0;
    const x = padL + i * barSlot + (barSlot - barW) / 2;
    const y = padT + chartH - barH;
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="#F2A900" rx="3"><title>${esc(d.mes)}: ${esc(formatBRL(d.valor))}</title></rect>`;
    labels += `<text x="${(x + barW / 2).toFixed(1)}" y="${h - padB + 14}" font-size="10" fill="#A69C8D" text-anchor="middle">${esc(d.mes)}</text>`;
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
    const sweep = (d.value / total) * 360;
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

/* ================= INIT ================= */

function init() {
  loadDeals();

  document.querySelectorAll(".tabbtn").forEach((btn) => {
    btn.addEventListener("click", () => setTab(btn.dataset.tab));
  });

  renderCalcTab();
}

document.addEventListener("DOMContentLoaded", init);
