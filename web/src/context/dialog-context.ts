import { createContext } from "react";

export interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" deixa o botão de confirmar vermelho -- usado em exclusões e outras ações irreversíveis. */
  tone?: "default" | "danger";
}

export interface AlertOptions {
  title?: string;
  okLabel?: string;
}

export interface DialogContextValue {
  confirmDialog: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  alertDialog: (message: string, options?: AlertOptions) => Promise<void>;
}

export const DialogContext = createContext<DialogContextValue | null>(null);
