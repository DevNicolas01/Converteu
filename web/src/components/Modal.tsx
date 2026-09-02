import type { ReactNode } from "react";
import { CloseIcon } from "./Icons";

export default function Modal({
  children,
  onClose,
  maxWidth = 420,
}: {
  children: ReactNode;
  onClose: () => void;
  maxWidth?: number;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 12, 20, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div style={{ maxWidth, width: "100%", maxHeight: "90vh", position: "relative" }} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" aria-label="Fechar" onClick={onClose}>
          <CloseIcon />
        </button>
        {/* Scroll fica num wrapper à parte -- o X é posicionado (absolute) relativo ao div de fora,
            que não tem overflow, senão o próprio scroll corta o botão que fica ligeiramente pra
            fora da borda (top: -14px). */}
        <div style={{ maxHeight: "90vh", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>{children}</div>
      </div>
    </div>
  );
}
