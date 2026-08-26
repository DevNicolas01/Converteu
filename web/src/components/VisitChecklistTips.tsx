import { useState } from "react";

export const VISIT_CHECKLIST = [
  "Tipo de revestimento (porcelanato polido, cerâmica, granito, mármore, pedra ornamental, vinílico...)",
  "Grau de dificuldade da limpeza (superfície lisa, texturizada, rejunte exposto, frisos)",
  "Grau de sujidade (pó leve, tinta seca, cimento aderido, rejunte epóxi, graxa, ferrugem)",
  "Estado geral da obra (obra grossa concluída, acabamento em andamento, finalizada)",
  "Prazo de entrega do imóvel (urgência do cliente — interfere no preço e na equipe)",
  "Distância e logística de acesso (km, estacionamento, elevador, água, energia)",
  "Valor estimado do imóvel (padrão popular, médio ou alto — influencia percepção de valor)",
  "Metragem total (m² de piso, cômodos, banheiros, área de serviço, varanda)",
  "Presença de mobília/equipamentos que precisam ser protegidos ou movidos",
  "Já houve tentativa de limpeza anterior? (retrabalho de terceiros é mais crítico)",
  "Quem é o responsável técnico pelo imóvel (proprietário, construtora, síndico)?",
  "Há restrições de acesso ou horário para execução do serviço?",
  "Registro fotográfico feito antes da execução (proteção contratual)",
  "Altura e acesso dos vidros",
];

interface Props {
  checked: Set<string>;
  onToggle: (item: string) => void;
}

export default function VisitChecklistTips({ checked, onToggle }: Props) {
  const [open, setOpen] = useState(false);
  const total = VISIT_CHECKLIST.length;
  const done = checked.size;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="panel checklist-panel">
      <button type="button" className="checklist-toggle" onClick={() => setOpen((o) => !o)}>
        <div>
          <span className="panel-title" style={{ margin: 0 }}>
            Checklist da visita técnica
          </span>
          <p className="microlabel" style={{ margin: "2px 0 0" }}>
            {done} de {total} avaliados — marque o que já conferiu, isso já vai pras observações
          </p>
        </div>
        <span className="microlabel">{open ? "fechar ▲" : "abrir ▼"}</span>
      </button>

      <div className="checklist-progress-track">
        <div className="checklist-progress-fill" style={{ width: `${pct}%` }} />
      </div>

      {open && (
        <div className="checklist-items">
          {VISIT_CHECKLIST.map((item) => (
            <label key={item} className={`checklist-item${checked.has(item) ? " checked" : ""}`}>
              <input type="checkbox" checked={checked.has(item)} onChange={() => onToggle(item)} />
              <span>{item}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
