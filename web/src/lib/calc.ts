export interface Deal {
  id: string | null;
  obraNumero: number | null;
  obraNome: string;
  endereco: string;
  responsavel: string;
  dataInicio: string;
  dataTermino: string;
  dataVisitaTecnica: string;
  /** Anotações da vistoria técnica (superfície, sujidade, estado da obra etc.) — entra no PDF. */
  observacoesVisita: string;
  clientName: string;
  clienteEmail: string;
  clientePhone: string;
  clientType: string;
  leadSource: string;
  /** Qual plataforma de tráfego pago (Google ou Meta) — só quando leadSource === "Tráfego pago". */
  leadSourcePaidChannel: string;
  stage: string;
  createdAt: string;
  closedAt: string | null;
  sentAt: string | null;
  followUpDate: string;

  metragem: string;
  dias: string;
  margem: string;

  vtQtd: string;
  vtValor: string;
  almocoQtd: string;
  almocoValor: string;
  estacionamento: string;
  pedagio: string;
  combKmPorLitro: string;
  combValorLitro: string;
  combKmRodar: string;

  qtd: Record<string, string>;
  diaria: Record<string, string>;

  visitaTecnica: string;
  rateioAdm: string;
  valorNota: string;
  impostoPct: string;
  valorPagamento: string;
  valorFinal?: number;

  /** Produtos/materiais de limpeza usados no serviço (nome + custo), somados ao cálculo automático por faixa. */
  produtos: ProdutoItem[];
  /** Override manual do % de materiais sobre o custo-base — vazio usa a faixa automática (4/8/12%). */
  materialPctManual: string;
}

export interface ProdutoItem {
  nome: string;
  quantidade: string;
  valorUnitario: string;
}

export const ROLES = [
  { key: "auxiliar", label: "Auxiliar de limpeza" },
  { key: "lider", label: "Líder" },
  { key: "supervisor", label: "Supervisor" },
  { key: "administrativo", label: "Administrativo (ADM)" },
] as const;

export const LEAD_SOURCES = ["Google Meu Negócio", "Tráfego pago", "Redes sociais", "Indicação", "Recorrente", "Outro"];

export const CLIENT_TYPES = ["Residência", "Apartamento", "Sala comercial", "Condomínio", "Obra/Construtora", "Outro"];

/** Só relevante quando leadSource === "Tráfego pago" — qual plataforma trouxe o lead. */
export const PAID_TRAFFIC_CHANNELS = ["Google", "Meta"];

// Funil simplificado: Em aberto -> Aguardando resposta -> Fechado / Perdido.
export const STAGES = [
  { id: "aberto", label: "Em aberto" },
  { id: "aguardando", label: "Aguardando resposta" },
  { id: "fechado", label: "Fechado" },
  { id: "perdido", label: "Perdido" },
] as const;

export function emptyDeal(): Deal {
  return {
    id: null,
    obraNumero: null,
    obraNome: "",
    endereco: "",
    responsavel: "",
    dataInicio: "",
    dataTermino: "",
    dataVisitaTecnica: "",
    observacoesVisita: "",
    clientName: "",
    clienteEmail: "",
    clientePhone: "",
    clientType: "Residência",
    leadSource: "Google Meu Negócio",
    leadSourcePaidChannel: "",
    stage: "aberto",
    createdAt: new Date().toISOString(),
    closedAt: null,
    sentAt: null,
    followUpDate: "",

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

    qtd: { auxiliar: "1", lider: "0", supervisor: "0", administrativo: "0" },
    diaria: { auxiliar: "120", lider: "180", supervisor: "150", administrativo: "150" },

    visitaTecnica: "",
    rateioAdm: "",
    valorNota: "",
    impostoPct: "",
    valorPagamento: "",
    produtos: [],
    materialPctManual: "",
  };
}

export const PLANS = [
  { id: "teste", label: "Teste", limit: 3 },
  { id: "start", label: "Start", limit: 15 },
  { id: "cresce", label: "Cresce", limit: 40 },
  { id: "sem_limite", label: "Sem Limite", limit: null },
] as const;
export type PlanId = (typeof PLANS)[number]["id"];

export type BillingCycle = "mensal" | "anual";

/** Preços fixos dos planos pagos (o Teste é sempre gratuito, não passa pelo Asaas). */
export const PLAN_PRICES: Record<Exclude<PlanId, "teste">, Record<BillingCycle, number>> = {
  start: { mensal: 14.9, anual: 149 },
  cresce: { mensal: 24.9, anual: 249 },
  sem_limite: { mensal: 39.9, anual: 399 },
};

/** Limite de orçamentos/mês do plano (null = ilimitado; plano desconhecido/antigo = sem limite). */
export function planLimit(planId: string | undefined): number | null {
  return PLANS.find((p) => p.id === planId)?.limit ?? null;
}

export function isThisMonth(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export function num(v: unknown): number {
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

export function formatBRL(value: number | undefined | null): string {
  return (value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Data de término = início + (dias - 1), já que 1 dia de serviço começa e termina no mesmo dia. */
export function computeDataTermino(dataInicio: string, dias: string): string {
  const n = num(dias);
  if (!dataInicio || n <= 0) return "";
  const d = new Date(dataInicio + "T00:00:00");
  d.setDate(d.getDate() + (n - 1));
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Formata enquanto digita: (51) 9 9805-8521 (celular) ou (51) 3805-8521 (fixo). */
export function formatPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (digits.length <= 2) return ddd ? `(${ddd}` : "";
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (digits.length <= 10) {
    // fixo: 8 dígitos -> (DD) NNNN-NNNN
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  // celular: 9 dígitos -> (DD) 9 NNNN-NNNN
  return `(${ddd}) ${rest.slice(0, 1)} ${rest.slice(1, 5)}-${rest.slice(5, 9)}`;
}

export function formatDateBR(v: string | null | undefined): string {
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

function materialPercent(base: number) {
  const tier = MATERIAL_TIERS.find((t) => base <= t.ate);
  return tier ? tier.pct : MATERIAL_TIERS[MATERIAL_TIERS.length - 1].pct;
}

export function calcDeal(d: Deal) {
  const dias = num(d.dias);

  const vtTotal = dias * num(d.vtQtd) * num(d.vtValor);
  const almocoTotal = dias * num(d.almocoQtd) * num(d.almocoValor);
  const estacionamento = num(d.estacionamento);
  const pedagio = num(d.pedagio);
  const combustivelTotal =
    num(d.combKmPorLitro) > 0 ? dias * (num(d.combKmRodar) / num(d.combKmPorLitro)) * num(d.combValorLitro) : 0;
  const apoioTotal = vtTotal + almocoTotal + estacionamento + pedagio + combustivelTotal;

  let maoDeObraTotal = 0;
  ROLES.forEach((r) => {
    maoDeObraTotal += num(d.qtd[r.key]) * num(d.diaria[r.key]) * dias;
  });

  const baseParaMaterial = maoDeObraTotal + apoioTotal + num(d.rateioAdm) + num(d.visitaTecnica);
  const materialPct = d.materialPctManual !== "" && d.materialPctManual != null
    ? num(d.materialPctManual) / 100
    : materialPercent(baseParaMaterial);
  const custoProdutos = (d.produtos || []).reduce((s, p) => s + num(p.quantidade || "1") * num(p.valorUnitario), 0);
  const materiaisTotal = baseParaMaterial * materialPct + custoProdutos;

  const impostoPct = num(d.impostoPct);
  const impostoTotal = num(d.valorNota) * (impostoPct / 100);

  const custosOperacionais = baseParaMaterial + materiaisTotal + impostoTotal;

  const margem = Math.min(num(d.margem) / 100, 0.95);
  const precoVendaSugerido = margem < 1 ? custosOperacionais / (1 - margem) : custosOperacionais;
  const lucroRS = precoVendaSugerido - custosOperacionais;

  const valorPagamento = d.valorPagamento !== "" && d.valorPagamento != null ? num(d.valorPagamento) : precoVendaSugerido;

  const valorFinal = valorPagamento;
  const margemReal = valorFinal > 0 ? (valorFinal - custosOperacionais) / valorFinal : 0;
  const markupRealFinal = custosOperacionais > 0 ? (valorFinal - custosOperacionais) / custosOperacionais : 0;
  const metragem = num(d.metragem);
  const custoPorM2 = metragem > 0 ? custosOperacionais / metragem : 0;

  return {
    vtTotal,
    almocoTotal,
    combustivelTotal,
    apoioTotal,
    maoDeObraTotal,
    materiaisTotal,
    materialPct,
    custoProdutos,
    impostoTotal,
    custosOperacionais,
    precoVendaSugerido,
    lucroRS,
    valorFinal,
    margemReal,
    markupRealFinal,
    custoPorM2,
  };
}
