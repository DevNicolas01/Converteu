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

const PIE_COLORS = ["#1D4ED8", "#0EA5E9", "#64748B", "#F59E0B", "#94A3B8"];

const LOGO_BASE64 = "data:image/png;base64,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";

const MAX_LOGO_DIMENSION = 320;

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

    visitaTecnica: "",
    rateioAdm: "",
    valorNota: "",
    impostoPct: "",
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

const MATERIAL_TIERS = [
  { ate: 1000, pct: 0.04 },
  { ate: 2000, pct: 0.08 },
  { ate: Infinity, pct: 0.12 },
];

function materialPercent(base) {
  const tier = MATERIAL_TIERS.find((t) => base <= t.ate);
  return tier ? tier.pct : MATERIAL_TIERS[MATERIAL_TIERS.length - 1].pct;
}

function calcDeal(d) {
  const dias = num(d.dias);

  const vtTotal = dias * num(d.vtQtd) * num(d.vtValor);
  const almocoTotal = dias * num(d.almocoQtd) * num(d.almocoValor);
  const estacionamento = num(d.estacionamento);
  const pedagio = num(d.pedagio);
  const combustivelTotal = num(d.combKmPorLitro) > 0
    ? dias * (num(d.combKmRodar) / num(d.combKmPorLitro)) * num(d.combValorLitro)
    : 0;
  const apoioTotal = vtTotal + almocoTotal + estacionamento + pedagio + combustivelTotal;

  let maoDeObraTotal = 0;
  ROLES.forEach((r) => {
    maoDeObraTotal += num(d.qtd[r.key]) * num(d.diaria[r.key]) * dias;
  });

  const baseParaMaterial = maoDeObraTotal + apoioTotal + num(d.rateioAdm) + num(d.visitaTecnica);
  const materialPct = materialPercent(baseParaMaterial);
  const materiaisTotal = baseParaMaterial * materialPct;

  const impostoPct = num(d.impostoPct);
  const impostoTotal = num(d.valorNota) * (impostoPct / 100);

  const custosOperacionais = baseParaMaterial + materiaisTotal + impostoTotal;

  const margem = Math.min(num(d.margem) / 100, 0.95);
  const precoVendaSugerido = margem < 1 ? custosOperacionais / (1 - margem) : custosOperacionais;
  const lucroRS = precoVendaSugerido - custosOperacionais;

  const valorPagamento = d.valorPagamento !== "" && d.valorPagamento != null
    ? num(d.valorPagamento)
    : precoVendaSugerido;

  const valorFinal = valorPagamento;
  const margemReal = valorFinal > 0 ? (valorFinal - custosOperacionais) / valorFinal : 0;
  const markupRealFinal = custosOperacionais > 0 ? (valorFinal - custosOperacionais) / custosOperacionais : 0;
  const metragem = num(d.metragem);
  const custoPorM2 = metragem > 0 ? custosOperacionais / metragem : 0;

  return {
    vtTotal, almocoTotal, combustivelTotal, apoioTotal, maoDeObraTotal, materiaisTotal, materialPct,
    impostoTotal, custosOperacionais, precoVendaSugerido, lucroRS,
    valorFinal, margemReal, markupRealFinal, custoPorM2,
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
  company: null,
  companyForm: { name: "", logoUrl: "" },
  companyMsg: "",
};

async function loadDeals() {
  try {
    state.deals = await window.OrceiDB.listProposals();
  } catch (e) {
    console.error("Falha ao carregar propostas", e);
    state.deals = [];
  }
}

/* ================= ACTIONS ================= */

async function saveDeal() {
  if (!state.form.clientName || !state.form.metragem) return;
  const computed = calcDeal(state.form);
  const record = Object.assign({}, state.form, computed);
  const wasEditing = !!state.form.id;

  try {
    if (wasEditing) {
      await window.OrceiDB.updateProposal(record.id, record);
      state.deals = state.deals.map((d) => (d.id === record.id ? record : d));
    } else {
      record.obraNumero = state.deals.length + 1;
      record.stage = record.stage || "contato_inicial";
      record.id = await window.OrceiDB.createProposal(record);
      state.deals = state.deals.concat([record]);
    }
    state.saveMsg = wasEditing ? "Proposta atualizada." : "Proposta criada e enviada ao funil.";
  } catch (e) {
    console.error("Falha ao salvar proposta", e);
    state.saveMsg = "Não foi possível salvar. Tente novamente.";
  }

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

async function deleteDeal(id) {
  try {
    await window.OrceiDB.deleteProposal(id);
    state.deals = state.deals.filter((d) => d.id !== id);
  } catch (e) {
    console.error("Falha ao excluir proposta", e);
  }
  renderFunilTab();
}

async function moveStage(id, stage) {
  const deal = state.deals.find((d) => d.id === id);
  if (!deal) return;
  const closedAt = stage === "fechado" ? new Date().toISOString() : deal.closedAt;
  const updated = Object.assign({}, deal, { stage, closedAt });
  try {
    await window.OrceiDB.updateProposal(id, updated);
    state.deals = state.deals.map((d) => (d.id === id ? updated : d));
  } catch (e) {
    console.error("Falha ao mover estágio", e);
  }
  renderFunilTab();
}

async function sendDealByEmail(deal) {
  const destinatario = prompt("E-mail do cliente para enviar a proposta:");
  if (!destinatario) return;
  try {
    const { blob, fileName } = await getProposalPdfBlob(deal);
    await window.OrceiDB.sendProposalEmail({
      proposalId: deal.id,
      destinatario,
      assunto: `Orçamento — ${deal.obraNome || "proposta"}`,
      mensagem: "Segue em anexo o orçamento solicitado.",
      pdfBlob: blob,
      pdfFileName: fileName,
    });
    alert("Proposta enviada por e-mail!");
  } catch (e) {
    console.error("Falha ao enviar e-mail", e);
    alert("Não foi possível enviar o e-mail. Tente novamente.");
  }
}

function shareDealOnWhatsApp(deal) {
  const numero = prompt("Número de WhatsApp do cliente (com DDD):");
  if (!numero) return;
  const mensagem = `Olá! Segue o resumo do orçamento — Obra ${deal.obraNumero || ""}: ${formatBRL(deal.valorFinal)}.`;
  const link = window.OrceiDB.buildWhatsAppShareLink(numero, mensagem);
  window.open(link, "_blank");
}

async function scheduleDealOnCalendar(deal) {
  const startInput = prompt("Data e hora do evento (AAAA-MM-DDTHH:MM):", "");
  if (!startInput) return;
  const start = new Date(startInput);
  if (isNaN(start.getTime())) {
    alert("Data/hora inválida.");
    return;
  }
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  try {
    await window.OrceiDB.createCalendarEvent({
      proposalId: deal.id,
      title: `Proposta — ${deal.obraNome || deal.clientName || "cliente"}`,
      description: `Valor: ${formatBRL(deal.valorFinal)}`,
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
    });
    alert("Evento criado no Google Calendar!");
  } catch (e) {
    if (e && e.code === "functions/failed-precondition") {
      if (confirm("Você ainda não conectou o Google Calendar. Conectar agora?")) {
        window.OrceiDB.connectGoogleCalendar(window.OrceiDB.getGoogleOAuthStartUrl());
      }
      return;
    }
    console.error("Falha ao criar evento no Google Calendar", e);
    alert("Não foi possível criar o evento. Tente novamente.");
  }
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
          <p class="microlabel" style="margin-bottom:8px;">Combustível — preenchendo estes 3 campos, calculamos o valor pra você (multiplicado pelos dias de serviço)</p>
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
              <label class="microlabel">Quantos km vai rodar por dia (ida e volta)</label>
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
            <div class="field">
              <label>Imposto sobre a nota fiscal (%)</label>
              <input type="number" class="input" id="f-impostoPct" placeholder="Ex: 6" value="${esc(f.impostoPct)}">
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
          <p class="final-margin">Margem de lucro real (lucro ÷ preço de venda): <span id="final-margin"></span></p>
          <p class="final-margin">Markup real (lucro ÷ custo): <span id="final-markup"></span></p>
        </div>
      </div>
    </div>
  `;

  document.getElementById("tab-calc").innerHTML = html;

  attachCalcListeners();
  updatePreview();

  const cancelBtn = document.getElementById("btn-cancel-edit");
  if (cancelBtn) cancelBtn.addEventListener("click", () => { state.form = emptyDeal(); renderCalcTab(); });
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
  bind("f-dataVisita", "dataVisita");
  bind("f-dataVisitaTecnica", "dataVisitaTecnica");
  bind("f-clientType", "clientType");
  bind("f-leadSource", "leadSource");
  bind("f-metragem", "metragem");
  bind("f-dias", "dias");

  const recalcDias = () => {
    if (!f.dataInicio || !f.dataTermino) return;
    const inicio = new Date(f.dataInicio + "T00:00:00");
    const termino = new Date(f.dataTermino + "T00:00:00");
    const diffDias = Math.round((termino - inicio) / 86400000) + 1;
    if (diffDias > 0) {
      f.dias = String(diffDias);
      const diasEl = document.getElementById("f-dias");
      if (diasEl) diasEl.value = f.dias;
      updatePreview();
    }
  };
  const dataInicioEl = document.getElementById("f-dataInicio");
  const dataTerminoEl = document.getElementById("f-dataTermino");
  if (dataInicioEl) dataInicioEl.addEventListener("change", () => { f.dataInicio = dataInicioEl.value; recalcDias(); });
  if (dataTerminoEl) dataTerminoEl.addEventListener("change", () => { f.dataTermino = dataTerminoEl.value; recalcDias(); });

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
  bind("f-impostoPct", "impostoPct");
  bind("f-valorPagamento", "valorPagamento");

  ROLES.forEach((r) => {
    const qtdEl = document.getElementById(`f-qtd-${r.key}`);
    qtdEl.addEventListener("input", (e) => { f.qtd[r.key] = e.target.value; updatePreview(); });
    const diariaEl = document.getElementById(`f-diaria-${r.key}`);
    diariaEl.addEventListener("input", (e) => { f.diaria[r.key] = e.target.value; updatePreview(); });
  });
}

function updatePreview() {
  const preview = calcDeal(state.form);

  const rows = [
    ["Transporte e alimentação", formatBRL(preview.apoioTotal)],
    ["Equipe", formatBRL(preview.maoDeObraTotal)],
    [`Materiais (${(preview.materialPct * 100).toFixed(0)}% do custo base)`, formatBRL(preview.materiaisTotal)],
    ["Custo total do serviço", formatBRL(preview.custosOperacionais)],
    ["Preço sugerido para o cliente", formatBRL(preview.precoVendaSugerido)],
    ["Lucro estimado", formatBRL(preview.lucroRS)],
    ["Custo por m²", formatBRL(preview.custoPorM2)],
  ];
  if (state.form.valorNota) {
    rows.push(["Valor da nota fiscal", formatBRL(num(state.form.valorNota))]);
    rows.push(["Imposto sobre a nota", formatBRL(preview.impostoTotal)]);
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

  const finalMarkupEl = document.getElementById("final-markup");
  if (finalMarkupEl) finalMarkupEl.textContent = (preview.markupRealFinal * 100).toFixed(1) + "%";

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
                    <div class="deal-card-actions" style="display:flex;gap:10px;margin-top:8px;">
                      <button class="link-btn" data-send-email title="Enviar por e-mail">E-mail</button>
                      <button class="link-btn" data-share-whatsapp title="Compartilhar no WhatsApp">WhatsApp</button>
                      <button class="link-btn" data-schedule-calendar title="Agendar no Google Calendar">Agenda</button>
                    </div>
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
    card.querySelector("[data-send-email]").addEventListener("click", () => sendDealByEmail(deal));
    card.querySelector("[data-share-whatsapp]").addEventListener("click", () => shareDealOnWhatsApp(deal));
    card.querySelector("[data-schedule-calendar]").addEventListener("click", () => scheduleDealOnCalendar(deal));
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

/* ================= EMPRESA ================= */

async function loadCompanyProfile() {
  try {
    state.company = await window.OrceiDB.getCompanyProfile();
  } catch (e) {
    console.error("Falha ao carregar dados da empresa", e);
    state.company = { companyName: "", logoUrl: null };
  }
  state.companyForm = {
    name: (state.company && state.company.companyName) || "",
    logoUrl: (state.company && state.company.logoUrl) || "",
  };
}

/** Salva nome + retorna true se deu certo (usado pelo submit da tela de setup). */
async function saveCompanyProfile() {
  const name = state.companyForm.name.trim();
  if (!name) {
    state.companyMsg = "O nome da empresa é obrigatório.";
    renderCompanySetupScreen();
    return false;
  }

  try {
    await window.OrceiDB.saveCompanyProfile({ companyName: name });
    state.company = Object.assign({}, state.company, { companyName: name });
    state.companyMsg = "";
    return true;
  } catch (e) {
    console.error("Falha ao salvar dados da empresa", e);
    state.companyMsg = "Não foi possível salvar. Tente novamente.";
    renderCompanySetupScreen();
    return false;
  }
}

function handleCompanyLogoFile(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    state.companyMsg = "Escolha um arquivo de imagem.";
    renderCompanySetupScreen();
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_LOGO_DIMENSION / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          state.companyMsg = "Não foi possível processar essa imagem.";
          renderCompanySetupScreen();
          return;
        }
        state.companyMsg = "Enviando logo...";
        renderCompanySetupScreen();
        try {
          const logoFile = new File([blob], "logo.png", { type: "image/png" });
          const logoUrl = await window.OrceiDB.uploadCompanyLogo(logoFile);
          state.companyForm.logoUrl = logoUrl;
          state.company = Object.assign({}, state.company, { logoUrl });
          state.companyMsg = "Logo enviada.";
        } catch (err) {
          console.error("Falha ao enviar logo", err);
          state.companyMsg = "Não foi possível enviar a logo. Tente novamente.";
        }
        renderCompanySetupScreen();
      }, "image/png");
    };
    img.onerror = () => {
      state.companyMsg = "Não foi possível ler essa imagem.";
      renderCompanySetupScreen();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function removeCompanyLogo() {
  state.companyForm.logoUrl = "";
  try {
    await window.OrceiDB.clearCompanyLogo();
    state.company = Object.assign({}, state.company, { logoUrl: null });
  } catch (e) {
    console.error("Falha ao remover logo", e);
  }
  renderCompanySetupScreen();
}

/** Preenche a tela única de "dados da empresa" (roda uma vez, antes do app; reaberta pelo botão no topo). */
function renderCompanySetupScreen() {
  const nameInput = document.getElementById("company-setup-name");
  if (!nameInput) return;
  nameInput.value = state.companyForm.name;

  const preview = document.getElementById("company-setup-logo-preview");
  preview.innerHTML = state.companyForm.logoUrl ? `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
      <img src="${state.companyForm.logoUrl}" alt="Logo" style="max-width:80px;max-height:80px;border-radius:8px;border:1px solid var(--n-800);">
      <button class="link-btn" type="button" id="btn-remove-logo">remover logo</button>
    </div>
  ` : `<p class="empty-note" style="margin-bottom:8px;">Nenhuma logo escolhida ainda.</p>`;

  const removeBtn = document.getElementById("btn-remove-logo");
  if (removeBtn) removeBtn.addEventListener("click", removeCompanyLogo);

  const msgEl = document.getElementById("company-setup-msg");
  if (msgEl) msgEl.textContent = state.companyMsg;
}

function attachCompanySetupForm() {
  document.getElementById("company-setup-name").addEventListener("input", (e) => {
    state.companyForm.name = e.target.value;
  });
  document.getElementById("company-setup-logo-file").addEventListener("change", (e) => {
    handleCompanyLogoFile(e.target.files[0]);
  });
}

/* ================= PDF ================= */

function getImageDimensions(src) {
  return new Promise((resolve) => {
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve({ width: img.width, height: img.height, img });
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function fitBox(natW, natH, maxW, maxH) {
  const scale = Math.min(maxW / natW, maxH / natH);
  return { w: natW * scale, h: natH * scale };
}

function buildProposalPdf(deal) {
  const hasLogo = !!(state.company && state.company.logoUrl);
  const companyName = (state.company && state.company.companyName) || "Sua empresa";
  const logoSrc = hasLogo ? state.company.logoUrl : LOGO_BASE64;

  return getImageDimensions(logoSrc).then((imgInfo) => buildProposalDoc(deal, companyName, imgInfo));
}

function downloadPdf(deal) {
  if (typeof window.jspdf === "undefined") {
    alert("Não foi possível gerar o PDF agora. Verifique sua conexão com a internet e tente novamente.");
    return;
  }
  buildProposalPdf(deal).then(({ doc, fileName }) => doc.save(fileName));
}

async function getProposalPdfBlob(deal) {
  const { doc, fileName } = await buildProposalPdf(deal);
  return { blob: doc.output("blob"), fileName };
}

function buildProposalDoc(deal, companyName, imgInfo) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const calc = calcDeal(deal);
  const pageW = 210;
  const marginX = 18;
  let y = 20;

  let textX = marginX;
  if (imgInfo) {
    const box = fitBox(imgInfo.width, imgInfo.height, 18, 15);
    doc.addImage(imgInfo.img, marginX, 9 + (15 - box.h) / 2, box.w, box.h);
    textX = marginX + box.w + 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 32, 58);
  doc.text(companyName, textX, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(103, 114, 138);
  doc.text("Orçamento de serviço", textX, 24);

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

  const agora = new Date();
  const geradoEm = agora.toLocaleDateString("pt-BR") + " às " + agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  doc.setFontSize(8);
  doc.setTextColor(150, 160, 175);
  doc.text(`Gerado em ${geradoEm} — ${companyName}`, marginX, 287);

  const nomeArquivo = (deal.clientName || "cliente")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return { doc, fileName: `orcamento-obra-${numeroObra}-${nomeArquivo || "cliente"}.pdf` };
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

function showScreen(name) {
  document.getElementById("screen-login").classList.toggle("hidden", name !== "login");
  document.getElementById("screen-blocked").classList.toggle("hidden", name !== "blocked");
  document.getElementById("screen-company-setup").classList.toggle("hidden", name !== "company-setup");
  document.getElementById("app").classList.toggle("hidden", name !== "app");
}

function attachLoginForm() {
  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = document.getElementById("login-error");
    errEl.textContent = "";
    const email = document.getElementById("login-email").value.trim();
    const senha = document.getElementById("login-password").value;
    const btn = document.getElementById("login-submit");
    btn.disabled = true;
    try {
      await window.OrceiDB.login(email, senha);
    } catch (err) {
      errEl.textContent = "E-mail ou senha inválidos.";
    } finally {
      btn.disabled = false;
    }
  });
}

let tabsBound = false;

function bindTabsOnce() {
  if (tabsBound) return;
  tabsBound = true;
  document.querySelectorAll(".tabbtn").forEach((btn) => {
    btn.addEventListener("click", () => setTab(btn.dataset.tab));
  });
  document.getElementById("logout-btn").addEventListener("click", () => window.OrceiDB.logout());
  document.getElementById("edit-company-btn").addEventListener("click", () => {
    renderCompanySetupScreen();
    showScreen("company-setup");
  });
}

async function enterApp() {
  await loadDeals();
  bindTabsOnce();
  renderCalcTab();
  showScreen("app");
}

function boot() {
  initTheme();
  attachLoginForm();
  attachCompanySetupForm();
  document.getElementById("blocked-logout-btn").addEventListener("click", () => window.OrceiDB.logout());

  document.getElementById("company-setup-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const ok = await saveCompanyProfile();
    renderCompanySetupScreen();
    if (!ok) return;
    if (tabsBound) {
      showScreen("app");
    } else {
      await enterApp();
    }
  });

  window.OrceiDB.onAuthStateChange(async (user) => {
    if (!user) {
      showScreen("login");
      return;
    }

    let status;
    try {
      status = await window.OrceiDB.getAccountStatus();
    } catch (err) {
      console.error("Falha ao ler status da conta", err);
      showScreen("login");
      return;
    }

    if (!status.isActiveAndValid) {
      document.getElementById("blocked-message").textContent = status.isSuspended
        ? "Sua conta está suspensa. Fale com o suporte para reativar."
        : "Sua assinatura venceu. Fale com o suporte para renovar.";
      showScreen("blocked");
      return;
    }

    try {
      await window.OrceiDB.migrateFromLocalStorage();
    } catch (err) {
      console.error("Falha na migração dos dados antigos", err);
    }

    await loadCompanyProfile();

    if (!state.companyForm.name) {
      renderCompanySetupScreen();
      showScreen("company-setup");
      return;
    }

    await enterApp();
  });
}

document.addEventListener("DOMContentLoaded", boot);
