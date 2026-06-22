import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type CSSProperties } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres — Erisio Advisory" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Settings,
});

async function logoUrl() {
  const { data, error } = await supabase.storage
    .from("branding")
    .createSignedUrl("logo.png", 60 * 60);
  if (error || !data) return "";
  return data.signedUrl;
}

function Settings() {
  const [preview, setPreview] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    logoUrl().then(setPreview);
  }, []);

  async function handleFile(file: File) {
    setBusy(true);
    setStatus("Téléversement…");
    const { error } = await supabase.storage
      .from("branding")
      .upload("logo.png", file, { upsert: true, contentType: file.type || "image/png", cacheControl: "60" });
    setBusy(false);
    if (error) {
      setStatus(`Erreur : ${error.message}`);
      return;
    }
    setStatus("Logo mis à jour ✓");
    setPreview(await logoUrl());
  }

  async function handleRemove() {
    setBusy(true);
    setStatus("Suppression…");
    const { error } = await supabase.storage.from("branding").remove(["logo.png"]);
    setBusy(false);
    if (error) {
      setStatus(`Erreur : ${error.message}`);
      return;
    }
    setStatus("Logo supprimé ✓");
    setPreview("");
  }

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={S.brand}>Paramètres</div>
      </header>
      <main style={S.main}>
        <h1 style={S.h1}>Logo de l'en-tête</h1>
        <p style={S.intro}>
          Téléversez un fichier <strong>logo.png</strong> (ou tout PNG/JPG/SVG). Il remplacera le texte
          « ERISIO ADVISORY » en haut à gauche de la page d'accueil.
        </p>

        <div style={S.card}>
          <div style={S.previewBox}>
            {preview ? (
              <img
                src={preview}
                alt="Aperçu du logo"
                style={{ maxHeight: 80, maxWidth: "100%", objectFit: "contain" }}
                onError={() => setPreview("")}
              />
            ) : (
              <span style={{ color: "#888" }}>Aucun logo</span>
            )}
          </div>

          <label style={{ ...S.btn, opacity: busy ? 0.6 : 1, cursor: busy ? "wait" : "pointer" }}>
            Choisir un fichier…
            <input
              type="file"
              accept="image/*"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              style={{ display: "none" }}
            />
          </label>

          {preview && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              style={{ ...S.btnGhost, marginLeft: 10 }}
            >
              Supprimer le logo
            </button>
          )}

          {status && <p style={S.status}>{status}</p>}
        </div>
      </main>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  page: { fontFamily: "'Arial Narrow', Arial, sans-serif", color: "#2E2A32", background: "#F6F5F8", minHeight: "100vh" },
  header: { background: "#011E4B", color: "#fff", padding: "14px 22px" },
  brand: { fontFamily: "Arial, sans-serif", fontWeight: 700, fontSize: 20 },
  main: { maxWidth: 720, margin: "0 auto", padding: "48px 22px" },
  h1: { fontFamily: "Arial, sans-serif", fontWeight: 700, color: "#011E4B", fontSize: 28, margin: "0 0 12px" },
  intro: { fontSize: 16, lineHeight: 1.55, marginBottom: 22 },
  card: { background: "#fff", border: "1px solid #e3e4ea", borderRadius: 12, padding: 22 },
  previewBox: { background: "#011E4B", borderRadius: 8, padding: 16, marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 100 },
  btn: { display: "inline-block", background: "#011E4B", color: "#fff", fontFamily: "Arial, sans-serif", fontWeight: 700, fontSize: 14, padding: "10px 18px", borderRadius: 8, textDecoration: "none", border: "none" },
  btnGhost: { background: "transparent", color: "#011E4B", fontFamily: "Arial, sans-serif", fontWeight: 700, fontSize: 14, padding: "10px 18px", borderRadius: 8, border: "1.5px solid #011E4B", cursor: "pointer" },
  status: { marginTop: 14, fontSize: 14, color: "#555" },
};
