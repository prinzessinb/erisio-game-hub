import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type CSSProperties } from "react";
import { supabase } from "@/integrations/supabase/client";

type Lang = "fr" | "en";

const TT: Record<Lang, { brand: string; title: string; intro: string; access: string; site: string }> = {
  fr: {
    brand: "ERISIO ADVISORY",
    title: "Les applications d'Erisio Advisory",
    intro: "Cet espace héberge les applications et les outils de formation d'Erisio Advisory.",
    access: "L'accès aux applications se fait par lien privé, communiqué par Erisio Advisory.",
    site: "Aller sur erisio.com",
  },
  en: {
    brand: "ERISIO ADVISORY",
    title: "Erisio Advisory apps",
    intro: "This space hosts Erisio Advisory's apps and training tools.",
    access: "Access to the apps is by private link, shared by Erisio Advisory.",
    site: "Go to erisio.com",
  },
};

function detectLang(): Lang {
  try {
    return new URLSearchParams(window.location.search).get("lang") === "en" ? "en" : "fr";
  } catch {
    return "fr";
  }
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Erisio Advisory — Applications" },
      { name: "description", content: "Applications et outils de formation d'Erisio Advisory." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Home,
});

function Home() {
  const [lang, setLang] = useState<Lang>(detectLang());
  const [logoOk, setLogoOk] = useState(true);
  const t = TT[lang];

  const [logoSrc] = useState(() => {
    const { data } = supabase.storage.from("branding").getPublicUrl("logo.png");
    return data.publicUrl;
  });

  useEffect(() => {
    const img = new Image();
    img.onload = () => setLogoOk(true);
    img.onerror = () => setLogoOk(false);
    img.src = logoSrc;
  }, [logoSrc]);

  function toggleLang() {
    const nl: Lang = lang === "fr" ? "en" : "fr";
    setLang(nl);
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("lang", nl);
      window.history.replaceState({}, "", u.toString());
    } catch {}
  }

  return (
    <div style={S.page}>
      <header style={S.header}>
        {logoOk ? (
          <img src={logoSrc} alt={t.brand} style={S.logo} />
        ) : (
          <div style={S.brand}>{t.brand}</div>
        )}
        <button style={S.langBtn} onClick={toggleLang}>
          {lang === "fr" ? "EN" : "FR"}
        </button>
      </header>
      <main style={S.main}>
        <h1 style={S.h1}>{t.title}</h1>
        <p style={S.intro}>{t.intro}</p>
        <p style={S.access}>{t.access}</p>
        <a style={S.btn} href="https://erisio.com">
          {t.site}
        </a>
      </main>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  page: { fontFamily: "'Arial Narrow', Arial, sans-serif", color: "#2E2A32", background: "#F6F5F8", minHeight: "100vh" },
  header: { background: "#011E4B", color: "#fff", padding: "14px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  brand: { fontFamily: "Arial, sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: ".3px" },
  logo: { height: 40, width: "auto", objectFit: "contain", display: "block" },
  langBtn: { background: "transparent", border: "1px solid currentColor", color: "inherit", borderRadius: 8, padding: "4px 10px", fontFamily: "Arial, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  main: { maxWidth: 720, margin: "0 auto", padding: "64px 22px" },
  h1: { fontFamily: "Arial, sans-serif", fontWeight: 700, color: "#011E4B", fontSize: 34, margin: "0 0 14px" },
  intro: { fontSize: 19, lineHeight: 1.55, marginBottom: 14 },
  access: { fontSize: 16, color: "#555", borderLeft: "4px solid #8C577F", paddingLeft: 14, marginBottom: 28 },
  btn: { display: "inline-block", background: "#011E4B", color: "#fff", fontFamily: "Arial, sans-serif", fontWeight: 700, fontSize: 15, padding: "11px 20px", borderRadius: 8, textDecoration: "none" },
};
