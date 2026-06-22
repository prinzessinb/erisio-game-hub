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
  const [logoSrc, setLogoSrc] = useState<string>("");
  const t = TT[lang];

  useEffect(() => {
    let cancelled = false;
    supabase.storage
      .from("branding")
      .createSignedUrl("logo.png", 60 * 60)
      .then(({ data, error }) => {
        if (cancelled) return;
        setLogoSrc(error || !data ? "" : data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      <video style={S.video} src="/Video.mp4" autoPlay muted loop playsInline />
      <div style={S.veil} />
      <div style={S.content}>
        <header style={S.header}>
          {logoSrc ? (
            <div style={S.logoBox}>
              <img src={logoSrc} alt={t.brand} style={S.logo} onError={() => setLogoSrc("")} />
            </div>
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
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  page: { position: "relative", minHeight: "100vh", background: "#011E4B", color: "#fff", fontFamily: "'Arial Narrow', Arial, sans-serif", overflow: "hidden" },
  video: { position: "fixed", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0, pointerEvents: "none" },
  veil: { position: "fixed", inset: 0, background: "rgba(1, 30, 75, 0.55)", zIndex: 1, pointerEvents: "none" },
  content: { position: "relative", zIndex: 2 },
  header: { background: "transparent", color: "#fff", padding: "14px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  brand: { fontFamily: "Arial, sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: ".3px" },
  logoBox: { height: 56, overflow: "hidden", display: "flex", alignItems: "center", marginTop: -14, marginBottom: -14 },
  logo: { height: 112, width: "auto", objectFit: "contain", display: "block" },
  langBtn: { background: "transparent", border: "1px solid currentColor", color: "inherit", borderRadius: 8, padding: "4px 10px", fontFamily: "Arial, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  main: { maxWidth: 720, margin: "0 auto", padding: "14vh 22px 64px" },
  h1: { fontFamily: "Arial, sans-serif", fontWeight: 700, color: "#fff", fontSize: 40, lineHeight: 1.12, margin: "0 0 16px" },
  intro: { fontSize: 20, lineHeight: 1.55, marginBottom: 16, color: "#fff" },
  access: { fontSize: 16, color: "rgba(255, 255, 255, 0.85)", borderLeft: "4px solid #8C577F", paddingLeft: 14, marginBottom: 30 },
  btn: { display: "inline-block", background: "#fff", color: "#011E4B", fontFamily: "Arial, sans-serif", fontWeight: 700, fontSize: 15, padding: "11px 20px", borderRadius: 8, textDecoration: "none" },
};
