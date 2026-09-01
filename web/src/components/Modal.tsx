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
      <div style={{ maxWidth, width: "100%", position: "relative" }} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" aria-label="Fechar" onClick={onClose}>
          <CloseIcon />
        </button>
        {children}
      </div>
    </div>
  );
}
