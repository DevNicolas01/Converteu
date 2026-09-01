import { useContext } from "react";
import { DialogContext } from "./dialog-context";

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog precisa estar dentro de <DialogProvider>");
  return ctx;
}
