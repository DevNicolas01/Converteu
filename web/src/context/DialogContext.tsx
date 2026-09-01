import { useCallback, useRef, useState, type ReactNode } from "react";
import Modal from "../components/Modal";
import { DialogContext, type AlertOptions, type ConfirmOptions } from "./dialog-context";

interface DialogState {
  kind: "confirm" | "alert";
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  resolve: (value: boolean) => void;
}

/**
 * Substitui window.confirm/window.alert por um modal com a cara do app -- os nativos abrem
 * como um pop-up genérico do navegador (com o domínio/ícone do Chrome), o que confunde quem
 * não é familiarizado com isso e parece que "abriu pelo Google" em vez de fazer parte da tela.
 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolvedRef = useRef(false);

  const confirmDialog = useCallback((message: string, options: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      resolvedRef.current = false;
      setDialog({ kind: "confirm", message, resolve, ...options });
    });
  }, []);

  const alertDialog = useCallback((message: string, options: AlertOptions = {}) => {
    return new Promise<void>((resolve) => {
      resolvedRef.current = false;
      setDialog({
        kind: "alert",
        message,
        title: options.title,
        confirmLabel: options.okLabel,
        resolve: () => resolve(),
      });
    });
  }, []);

  function settle(value: boolean) {
    if (!dialog || resolvedRef.current) return;
    resolvedRef.current = true;
    dialog.resolve(value);
    setDialog(null);
  }

  return (
    <DialogContext.Provider value={{ confirmDialog, alertDialog }}>
      {children}
      {dialog && (
        <Modal onClose={() => settle(false)}>
          <div className="panel dialog-modal">
            <h2 className="panel-title">{dialog.title || (dialog.kind === "confirm" ? "Confirmar" : "Aviso")}</h2>
            <p className="panel-help dialog-modal-message">{dialog.message}</p>
            <div className="dialog-modal-actions">
              {dialog.kind === "confirm" && (
                <button type="button" className="pdf-btn" style={{ flex: 1 }} onClick={() => settle(false)}>
                  {dialog.cancelLabel || "Cancelar"}
                </button>
              )}
              <button
                type="button"
                className={`save-btn${dialog.tone === "danger" ? " save-btn-danger" : ""}`}
                style={{ flex: 1 }}
                onClick={() => settle(true)}
              >
                {dialog.confirmLabel || (dialog.kind === "confirm" ? "Confirmar" : "Ok, entendi")}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </DialogContext.Provider>
  );
}
