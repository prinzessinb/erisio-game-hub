import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, type CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/')({ component: Home });

type Lang = 'fr' | 'en';

const SLOGAN = 'Connection Leads Transformation';

const TT: Record<Lang, { brand: string; title: string; intro: string; access: string; site: string }> = {
  fr: { brand: 'ERISIO ADVISORY', title: "Les applications d'Erisio Advisory", intro: "Cet espace héberge les applications et les outils de formation d'Erisio Advisory.", access: "L'accès aux applications se fait par lien privé, communiqué par Erisio Advisory.", site: 'Aller sur erisio.com' },
  en: { brand: 'ERISIO ADVISORY', title: 'Erisio Advisory apps', intro: "This space hosts Erisio Advisory's apps and training tools.", access: 'Access to the apps is by private link, shared by Erisio Advisory.', site: 'Go to erisio.com' },
};

function detectLang(): Lang { try { return new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'fr'; } catch { return 'fr'; } }

function Home() {
  const [lang, setLang] = useState<Lang>(detectLang());
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const t = TT[lang];
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.storage.from('branding').createSignedUrl('logo.png', 60 * 60);
        if (data?.signedUrl) setLogoSrc(data.signedUrl);
      } catch {}
    })();
  }, []);
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
          {logoSrc ? (
            <div style={S.logoBox}><img src={logoSrc} alt={t.brand} style={S.logo} /></div>
          ) : (
            <div style={S.brand}>{t.brand}</div>
          )}
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
  brand: { fontFamily: "'Arial Narrow', Arial, sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: '.3px' },
  logoBox: { height: 56, overflow: 'hidden', display: 'flex', alignItems: 'center', marginTop: -14, marginBottom: -14 },
  logo: { height: 112, width: 'auto', objectFit: 'contain', display: 'block' },
  langBtn: { background: 'transparent', border: '1px solid currentColor', color: 'inherit', borderRadius: 8, padding: '4px 10px', fontFamily: "'Arial Narrow', Arial, sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  main: { maxWidth: 820, margin: '0 auto', padding: '12vh 22px 64px' },
  glass: { maxWidth: 720, background: 'rgba(255, 255, 255, 0.10)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255, 255, 255, 0.22)', borderRadius: 18, padding: '40px 36px', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)' },
  slogan: { fontFamily: "'Arial Narrow', Arial, sans-serif", fontWeight: 700, color: '#fff', fontSize: 44, lineHeight: 1.1, letterSpacing: '-.01em', margin: '0 0 14px' },
  title: { fontFamily: "'Arial Narrow', Arial, sans-serif", fontWeight: 700, color: '#fff', fontSize: 22, margin: '0 0 14px' },
  intro: { fontFamily: "'Arial Narrow', Arial, sans-serif", fontWeight: 400, fontSize: 19, lineHeight: 1.55, marginBottom: 14, color: '#fff' },
  access: { fontFamily: "'Arial Narrow', Arial, sans-serif", fontWeight: 400, fontSize: 16, color: 'rgba(255, 255, 255, 0.85)', borderLeft: '4px solid #8C577F', paddingLeft: 14, marginBottom: 28 },
  btn: { display: 'inline-block', background: 'rgba(255,255,255,0.85)', color: '#011E4B', fontFamily: "'Arial Narrow', Arial, sans-serif", fontWeight: 700, fontSize: 15, padding: '11px 20px', borderRadius: 8, textDecoration: 'none' },
};
