import { useEffect, useRef, useState, type FormEvent } from "react";

interface Props {
  initialName: string;
  initialLogoUrl?: string | null;
  onSave: (name: string, logoFile: File | null) => Promise<void>;
  onCancel?: () => void;
  /** Quando true, não desenha o wrapper de tela cheia (usado dentro de um Modal). */
  bare?: boolean;
}

export default function CompanySetupForm({ initialName, initialLogoUrl, onSave, onCancel, bare = false }: Props) {
  const [name, setName] = useState(initialName);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialLogoUrl || null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setMsg("Informe o nome da empresa.");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      await onSave(name.trim(), file);
    } catch (err) {
      console.error("Falha ao salvar dados da empresa", err);
      setMsg("Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  const content = (
    <form className="panel auth-panel" onSubmit={handleSubmit}>
      <h2 className="panel-title">Dados da empresa</h2>
      <p className="panel-help" style={{ marginTop: 0 }}>
        Nome e logo aparecem no PDF de todos os orçamentos.
      </p>
      <div className="field">
        <label>Nome da empresa (obrigatório)</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Arrow Shot" required />
      </div>
      <div className="field">
        <label>Logo da empresa (opcional)</label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 64,
              height: 64,
              borderRadius: 10,
              border: "1px dashed var(--n-700)",
              background: "var(--n-950)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
              padding: 0,
            }}
            title="Escolher logo"
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span className="microlabel">Logo</span>
            )}
          </button>
          <div>
            <button type="button" className="link-btn" onClick={() => fileInputRef.current?.click()}>
              {previewUrl ? "Trocar logo" : "Escolher logo"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="save-btn" type="submit" style={{ width: "100%" }} disabled={saving}>
          Salvar {onCancel ? "" : "e continuar"}
        </button>
        {onCancel && (
          <button className="link-btn" type="button" onClick={onCancel}>
            cancelar
          </button>
        )}
      </div>
      <p className={`save-msg${msg.startsWith("Não") ? " is-error" : ""}`}>{msg}</p>
    </form>
  );

  if (bare) return content;
  return <div className="auth-screen">{content}</div>;
}
