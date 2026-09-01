import Modal from "./Modal";
import { RocketIcon } from "./Icons";

interface Props {
  used: number;
  limit: number;
  planLabel: string;
  /** Ex.: "neste mês" (planos pagos) ou "no total do plano Teste" (limite vitalício). */
  periodLabel: string;
  onUpgrade: () => void;
  onClose: () => void;
}

export default function LimitModal({ used, limit, planLabel, periodLabel, onUpgrade, onClose }: Props) {
  return (
    <Modal onClose={onClose}>
      <div className="panel limit-modal">
        <span className="limit-modal-icon">
          <RocketIcon />
        </span>
        <h2 className="limit-modal-title">Você bombou este mês! 🎉</h2>
        <p className="limit-modal-text">
          Você já criou <strong>{used} de {limit}</strong> orçamentos permitidos {periodLabel} no plano <strong>{planLabel}</strong>.
          Melhore sua assinatura pra continuar criando orçamentos sem parar.
        </p>
        <div className="limit-modal-actions">
          <button type="button" className="save-btn limit-modal-upgrade-btn" onClick={onUpgrade}>
            <RocketIcon /> Melhorar assinatura
          </button>
          <button type="button" className="link-btn" onClick={onClose}>
            Continuar sem melhorar
          </button>
        </div>
      </div>
    </Modal>
  );
}
