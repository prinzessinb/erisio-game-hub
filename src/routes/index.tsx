import { createFileRoute } from '@tanstack/react-router';
import { useState, type CSSProperties } from 'react';

export const Route = createFileRoute('/')({ component: Home });

type Lang = 'fr' | 'en';

const SLOGAN = 'Connection leads transformation';

const TT: Record<Lang, { brand: string; title: string; intro: string; access: string; site: string }> = {
  fr: { brand: 'ERISIO ADVISORY', title: "Les applications d'Erisio Advisory", intro: "Cet espace héberge les applications et les outils de formation d'Erisio Advisory.", access: "L'accès aux applications se fait par lien privé, communiqué par Erisio Advisory.", site: 'Aller sur erisio.com' },
  en: { brand: 'ERISIO ADVISORY', title: 'Erisio Advisory apps', intro: "This space hosts Erisio Advisory's apps and training tools.", access: 'Access to the apps is by private link, shared by Erisio Advisory.', site: 'Go to erisio.com' },
};

function detectLang(): Lang { try { return new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'fr'; } catch { return 'fr'; } }

function Home() {
  const [lang, setLang] = useState<Lang>(detectLang());
  const t = TT[lang];
  function toggleLang() {
    const nl: Lang = lang === 'fr' ? 'en' : 'fr';
    setLang(nl);
    try { const u = new URL(window.location.href); u.searchParams.set('lang', nl); window.history.replaceState({}, '', u.toString()); } catch {}
  }
  return (
    <div style={S.page}>
      <video style={S.video} src="/Video.mp4" autoPlay muted loop playsInline />
      <div style={S.veil} />
      <div style={S.content}>
        <header style={S.header}>
          <div style={S.brand}>{t.brand}</div>
          <button style={S.langBtn} onClick={toggleLang}>{lang === 'fr' ? 'EN' : 'FR'}</button>
        </header>
        <main style={S.main}>
          <div style={S.glass}>
            <h1 style={S.slogan}>{SLOGAN}</h1>
            <h2 style={S.title}>{t.title}</h2>
            <p style={S.intro}>{t.intro}</p>
            <p style={S.access}>{t.access}</p>
            <a style={S.btn} href="https://erisio.com">{t.site}</a>
          </div>
        </main>
      </div>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  page: { position: 'relative', minHeight: '100vh', background: '#011E4B', color: '#fff', fontFamily: "'Arial Narrow', Arial, sans-serif", overflow: 'hidden' },
  video: { position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, pointerEvents: 'none' },
  veil: { position: 'fixed', inset: 0, background: 'rgba(1, 30, 75, 0.40)', zIndex: 1, pointerEvents: 'none' },
  content: { position: 'relative', zIndex: 2 },
  header: { background: 'transparent', color: '#fff', padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 20, letterSpacing: '.3px' },
  langBtn: { background: 'transparent', border: '1px solid currentColor', color: 'inherit', borderRadius: 8, padding: '4px 10px', fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  main: { maxWidth: 820, margin: '0 auto', padding: '12vh 22px 64px' },
  glass: { maxWidth: 720, background: 'rgba(255, 255, 255, 0.10)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(255, 255, 255, 0.22)', borderRadius: 18, padding: '40px 36px', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)' },
  slogan: { fontFamily: 'Arial, sans-serif', fontWeight: 700, color: '#F6F5F8', fontSize: 44, lineHeight: 1.1, margin: '0 0 12px' },
  title: { fontFamily: 'Arial, sans-serif', fontWeight: 700, color: '#fff', fontSize: 22, margin: '0 0 14px' },
  intro: { fontSize: 19, lineHeight: 1.55, marginBottom: 14, color: '#fff' },
  access: { fontSize: 16, color: 'rgba(255, 255, 255, 0.85)', borderLeft: '4px solid #8C577F', paddingLeft: 14, marginBottom: 28 },
  btn: { display: 'inline-block', background: '#fff', color: '#011E4B', fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 15, padding: '11px 20px', borderRadius: 8, textDecoration: 'none' },
};
