import { jsPDF } from "jspdf";
import { calcDeal, formatBRL, formatDateBR, type Deal } from "./calc";
import type { CompanyProfile } from "./db";

function getImageDimensions(src: string): Promise<{ width: number; height: number; img: HTMLImageElement } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve({ width: img.width, height: img.height, img });
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function fitBox(natW: number, natH: number, maxW: number, maxH: number) {
  const scale = Math.min(maxW / natW, maxH / natH);
  return { w: natW * scale, h: natH * scale };
}

function buildProposalDoc(
  deal: Deal,
  company: CompanyProfile,
  obraNumero: number,
  imgInfo: { width: number; height: number; img: HTMLImageElement } | null,
  includeCosts: boolean,
) {
  const companyName = company.companyName || "Sua empresa";
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
  doc.setFontSize(9);
  doc.setTextColor(103, 114, 138);
  const companyLine = [company.cnpj && `CNPJ ${company.cnpj}`, company.endereco, company.telefone, company.email]
    .filter(Boolean)
    .join("  •  ");
  doc.text(companyLine || (includeCosts ? "Orçamento interno" : "Orçamento de serviço"), textX, 24);

  doc.setDrawColor(225, 229, 236);
  doc.line(marginX, 30, pageW - marginX, 30);

  y = 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20, 32, 58);
  doc.text(`Obra Nº ${obraNumero} — ${deal.obraNome || "Sem nome"}`, marginX, y);
  y += 10;

  const addSectionTitle = (title: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(29, 78, 216);
    doc.text(title, marginX, y);
    y += 7;
  };

  const addRow = (label: string, value: string | number | null | undefined) => {
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
  addRow("Tipo de imóvel", deal.clientType || "-");
  addRow("Endereço", deal.endereco || "-");
  addRow("Responsável pelo serviço", deal.responsavel || "-");
  addRow("Como o cliente chegou até você", deal.leadSource || "-");
  addRow("Tamanho do local", `${deal.metragem || 0} m²`);
  addRow("Duração do serviço", `${deal.dias || 0} dia(s)`);
  y += 2;
  addRow("Data da visita técnica", formatDateBR(deal.dataVisitaTecnica));
  addRow("Data de início do serviço", formatDateBR(deal.dataInicio));
  addRow("Data prevista para terminar", formatDateBR(deal.dataTermino));

  if (deal.observacoesVisita) {
    y += 5;
    addSectionTitle("Observações da vistoria");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 68, 84);
    const lines = doc.splitTextToSize(deal.observacoesVisita, pageW - marginX * 2);
    doc.text(lines, marginX, y);
    y += lines.length * 5 + 2;
  }

  if (includeCosts) {
    y += 5;
    addSectionTitle("Resumo de custos (uso interno)");
    addRow("Transporte e alimentação", formatBRL(calc.apoioTotal));
    addRow("Equipe", formatBRL(calc.maoDeObraTotal));
    (deal.produtos || [])
      .filter((p) => p.nome || p.valorUnitario)
      .forEach((p) => {
        const qtd = Number(p.quantidade) || 1;
        const subtotal = qtd * (Number(p.valorUnitario) || 0);
        addRow(`Produto: ${p.nome || "-"} (${qtd}x)`, formatBRL(subtotal));
      });
    addRow("Materiais (total)", formatBRL(calc.materiaisTotal));
    addRow("Impostos", formatBRL(calc.impostoTotal));
    addRow("Custo total do serviço", formatBRL(calc.custosOperacionais));
    addRow("Lucro estimado", formatBRL(calc.lucroRS));
    addRow("Margem real", `${(calc.margemReal * 100).toFixed(1)}%`);
  }

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
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const sufixo = includeCosts ? "interno" : "cliente";
  return { doc, fileName: `orcamento-obra-${obraNumero}-${nomeArquivo || "cliente"}-${sufixo}.pdf` };
}

async function buildProposalPdf(deal: Deal, company: CompanyProfile, obraNumero: number, includeCosts: boolean) {
  const imgInfo = company.logoUrl ? await getImageDimensions(company.logoUrl) : null;
  return buildProposalDoc(deal, company, obraNumero, imgInfo, includeCosts);
}

/** PDF limpo pra mandar ao cliente — sem detalhamento de custos nem margem. */
export async function downloadClientPdf(deal: Deal, company: CompanyProfile, obraNumero: number) {
  const { doc, fileName } = await buildProposalPdf(deal, company, obraNumero, false);
  doc.save(fileName);
}

/** PDF completo, com o detalhamento de custos e margem — só pra uso interno da empresa. */
export async function downloadInternalPdf(deal: Deal, company: CompanyProfile, obraNumero: number) {
  const { doc, fileName } = await buildProposalPdf(deal, company, obraNumero, true);
  doc.save(fileName);
}

export async function getProposalPdfBlob(deal: Deal, company: CompanyProfile, obraNumero: number) {
  const { doc, fileName } = await buildProposalPdf(deal, company, obraNumero, false);
  return { blob: doc.output("blob") as Blob, fileName };
}
