import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/jeu/etats-financiers-k7p2x9m4q8a3')({ component: EtatsFinanciers });

type Box = { id: string; role: 'source' | 'target'; x: number; y: number; w: number; h: number; fill: string; text: string; size: number };
type PanelGeo = { color: string; x: number; y: number; w: number; h: number; tx: number; ty: number };
type Conn = { id: string; src: string; tgt: string };
type Lang = 'fr' | 'en';

const DURATION = 240;

const PANELS: PanelGeo[] = [
  { color: '#2E6E66', x: 20, y: 40, w: 370, h: 480, tx: 205, ty: 74 },
  { color: '#1E4D4D', x: 415, y: 40, w: 370, h: 480, tx: 600, ty: 66 },
  { color: '#011E4B', x: 810, y: 40, w: 370, h: 480, tx: 995, ty: 74 },
];

const BOXES: Box[] = [
  { id: 'ex',  role: 'target', x: 50, y: 110, w: 310, h: 110, fill: '#3A5DA8', text: '#fff', size: 18 },
  { id: 'fin', role: 'target', x: 50, y: 222, w: 310, h: 70,  fill: '#BCCFE8', text: '#1c2a44', size: 17 },
  { id: 'imp', role: 'target', x: 50, y: 294, w: 310, h: 55,  fill: '#DCE6F2', text: '#1c2a44', size: 16 },
  { id: 's_rn', role: 'source', x: 85, y: 402, w: 240, h: 58, fill: '#DCDCDC', text: '#2E2A32', size: 18 },
  { id: 'fe', role: 'target', x: 445, y: 110, w: 310, h: 80, fill: '#1E4D4D', text: '#fff', size: 16 },
  { id: 'fi', role: 'target', x: 445, y: 194, w: 310, h: 80, fill: '#E0962E', text: '#fff', size: 16 },
  { id: 'ff', role: 'target', x: 445, y: 278, w: 310, h: 80, fill: '#8C8C8C', text: '#fff', size: 16 },
  { id: 's_vc', role: 'source', x: 480, y: 402, w: 240, h: 58, fill: '#DCDCDC', text: '#2E2A32', size: 18 },
  { id: 'actif',  role: 'target', x: 840, y: 110, w: 140, h: 348, fill: '#F4BC82', text: '#3a2a14', size: 19 },
  { id: 'cp',     role: 'target', x: 985, y: 110, w: 155, h: 168, fill: '#8298B0', text: '#11233a', size: 17 },
  { id: 'dettes', role: 'target', x: 985, y: 283, w: 155, h: 175, fill: '#F6E27C', text: '#3a3414', size: 18 },
];

// Ordered cause -> effect
const PAIRS: [string, string][] = [['s_rn', 'cp'], ['s_vc', 'actif']];

const T: Record<Lang, {
  panels: string[][];
  labels: Record<string, string[]>;
  subtitle: string;
  joinText: string;
  teamPlaceholder: string;
  join: string; clear: string; check: string; start: string; team: string;
  consigne: string; perfect: string; result: string;
  helpWrong: string; helpMissing: string;
  causeLabel: string; effectLabel: string;
  found: string; missed: string;
  explanations: Record<string, string>;
  links: (c: number, t: number) => string;
}> = {
  fr: {
    panels: [['1. Compte de résultat'], ['2. Tableau des flux', 'de trésorerie'], ['3. Bilan']],
    labels: { ex: ["Résultat d'exploitation"], fin: ['Résultat financier'], imp: ['Impôts et taxes'], s_rn: ['Résultat Net'], fe: ['Flux de trésorerie', "d'exploitation"], fi: ['Flux de trésorerie', "d'investissement"], ff: ['Flux de trésorerie', 'de financement'], s_vc: ['Variation du cash'], actif: ['Actif'], cp: ['Capitaux', 'propres'], dettes: ['Dettes'] },
    subtitle: 'Articulation des états financiers',
    joinText: "Saisis le nom de ton équipe. Tes coéquipiers tapent le même nom pour vous retrouver sur le même plateau.",
    teamPlaceholder: "Nom de l'équipe",
    join: 'Rejoindre', clear: 'Effacer', check: 'Vérifier', start: 'Commencer', team: 'Équipe',
    consigne: "Quels éléments sont reliés entre eux ? Touchez une case et l'autre case de votre choix dans n'importe lequel des trois états.",
    perfect: 'Sans faute', result: 'Résultat',
    helpWrong: "Les liaisons en rouge sont incorrectes. Retire-les en cliquant dessus, tente une autre articulation, puis revérifie.",
    helpMissing: "Bonne piste. Il reste une articulation à trouver : relie deux autres cases, puis revérifie.",
    causeLabel: 'Cause', effectLabel: 'Effet', found: 'Trouvé', missed: 'Manqué',
    explanations: {
      's_rn|cp': "Le résultat net de l'exercice vient augmenter les capitaux propres au bilan, par l'intermédiaire du report à nouveau et des réserves, une fois la décision d'affectation prise.",
      's_vc|actif': "La variation de trésorerie du tableau des flux explique le mouvement du poste de trésorerie, qui figure à l'actif du bilan, et assure ainsi la réconciliation entre les deux états.",
    },
    links: (c, t) => `${c} / ${t} bonnes liaisons`,
  },
  en: {
    panels: [['1. Income Statement'], ['2. Cash Flow', 'Statement'], ['3. Balance Sheet']],
    labels: { ex: ['Operating profit'], fin: ['Financial result'], imp: ['Income taxes'], s_rn: ['Net income'], fe: ['Operating', 'cash flow'], fi: ['Investing', 'cash flow'], ff: ['Financing', 'cash flow'], s_vc: ['Change in cash'], actif: ['Assets'], cp: ['Equity'], dettes: ['Liabilities'] },
    subtitle: 'How the financial statements connect',
    joinText: 'Enter your team name. Your teammates type the same name to join the same board.',
    teamPlaceholder: 'Team name',
    join: 'Join', clear: 'Clear', check: 'Check', start: 'Start', team: 'Team',
    consigne: 'Which items are linked together? Tap one box and another box of your choice in any of the three statements.',
    perfect: 'Perfect', result: 'Result',
    helpWrong: "The links shown in red are incorrect. Remove them by clicking on them, try another connection, then check again.",
    helpMissing: "Good start. One connection is still missing: link two more boxes, then check again.",
    causeLabel: 'Cause', effectLabel: 'Effect', found: 'Found', missed: 'Missed',
    explanations: {
      's_rn|cp': "The net income for the period increases equity on the balance sheet, through retained earnings and reserves, once the appropriation decision has been made.",
      's_vc|actif': "The change in cash from the cash flow statement explains the movement in the cash position, which sits within assets on the balance sheet, and so reconciles the two statements.",
    },
    links: (c, t) => `${c} / ${t} correct links`,
  },
};

const byId: Record<string, Box> = Object.fromEntries(BOXES.map((b) => [b.id, b]));
const pairKey = (a: string, b: string) => [a, b].sort().join('|');
const CORRECT = new Set(PAIRS.map((p) => pairKey(p[0], p[1])));
const isCorrect = (c: { src: string; tgt: string }) => CORRECT.has(pairKey(c.src, c.tgt));
// Return [causeId, effectId] for a known-correct connection.
function causalOrder(c: { src: string; tgt: string }): [string, string] {
  const k = pairKey(c.src, c.tgt);
  const found = PAIRS.find((p) => pairKey(p[0], p[1]) === k);
  return found ? [found[0], found[1]] : [c.src, c.tgt];
}
const normTeam = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');

function attach(b: Box, side: 'l' | 'r') { const cy = b.y + b.h / 2; return side === 'r' ? { x: b.x + b.w, y: cy } : { x: b.x, y: cy }; }
function attachPair(s: Box, t: Box) { const sc = s.x + s.w / 2, tc = t.x + t.w / 2; return tc >= sc ? [attach(s, 'r'), attach(t, 'l')] : [attach(s, 'l'), attach(t, 'r')]; }
function curve(a: { x: number; y: number }, b: { x: number; y: number }) { const dx = Math.abs(b.x - a.x), k = Math.min(130, Math.max(45, dx * 0.4)), dir = b.x >= a.x ? 1 : -1; return `M ${a.x} ${a.y} C ${a.x + dir * k} ${a.y}, ${b.x - dir * k} ${b.y}, ${b.x} ${b.y}`; }
function fmt(s: number) { const m = Math.floor(s / 60), x = s % 60; return `${m < 10 ? '0' : ''}${m}:${x < 10 ? '0' : ''}${x}`; }
function detectLang(): Lang { try { return new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'fr'; } catch { return 'fr'; } }
function tempId() { try { return crypto.randomUUID(); } catch { return 't' + Date.now() + Math.round(performance.now()); } }

function EtatsFinanciers() {
  const [lang, setLang] = useState<Lang>(detectLang());
  const t = T[lang];
  const [phase, setPhase] = useState<'join' | 'play' | 'done'>('join');
  const [teamInput, setTeamInput] = useState('');
  const [team, setTeam] = useState('');
  const [conns, setConns] = useState<Conn[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(DURATION);
  const [validated, setValidated] = useState(false);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  // Local-only "checked" state: shows green/red colors until the player edits the board again.
  const [checked, setChecked] = useState(false);
  const [helpMsg, setHelpMsg] = useState<string | null>(null);

  const connsRef = useRef<Conn[]>([]); connsRef.current = conns;
  const validatedRef = useRef(false); validatedRef.current = validated;
  const teamRef = useRef(''); teamRef.current = team;

  function toggleLang() {
    const nl: Lang = lang === 'fr' ? 'en' : 'fr';
    setLang(nl);
    try { const u = new URL(window.location.href); u.searchParams.set('lang', nl); window.history.replaceState({}, '', u.toString()); } catch {}
  }

  async function refetch(tm: string) {
    const { data, error } = await supabase.from('connections').select('id,src,tgt').eq('team', tm);
    if (error) { console.error('refetch', error); setErr(error.message); return; }
    setConns((data || []) as Conn[]);
    // Any board change clears the local check coloring.
    setChecked(false);
    setHelpMsg(null);
  }

  async function join() {
    const tm = normTeam(teamInput);
    if (!tm) return;
    setErr(null);
    setSelected(null);
    setConns([]);
    setStartedAt(null);
    setRemaining(DURATION);
    setValidated(false);
    setScore(0);
    setCorrect(0);
    setChecked(false);
    setHelpMsg(null);
    // Create the room without a start time; the timer only starts on "Commencer".
    const up = await supabase.from('rooms').upsert({ team: tm, started_at: null }, { onConflict: 'team', ignoreDuplicates: true });
    if (up.error) { console.error('room upsert', up.error); setErr(up.error.message); }
    let { data: room } = await supabase.from('rooms').select('*').eq('team', tm).single();
    const startedMs = room?.started_at ? new Date(room.started_at).getTime() : null;
    const isExpired = startedMs != null && Date.now() - startedMs >= DURATION * 1000;
    // If the previous round on this team was already finished or expired, start a fresh one.
    if (room && (room.validated || isExpired)) {
      const del = await supabase.from('connections').delete().eq('team', tm);
      if (del.error) { console.error('connections reset', del.error); setErr(del.error.message); }
      const reset = await supabase.from('rooms').update({ validated: false, score: 0, correct: 0, started_at: null }).eq('team', tm).select('*').single();
      if (reset.error) { console.error('room reset', reset.error); setErr(reset.error.message); }
      if (reset.data) room = reset.data;
    }
    setStartedAt(room && room.started_at ? new Date(room.started_at).getTime() : null);
    await refetch(tm);
    setTeam(tm);
    setPhase('play');
  }


  async function startTimer() {
    if (startedAt) return;
    const now = new Date().toISOString();
    setStartedAt(Date.now());
    const { error } = await supabase.from('rooms').update({ started_at: now, validated: false, score: 0, correct: 0 }).eq('team', team);
    if (error) console.error('start', error);
  }

  useEffect(() => {
    if (!team) return;
    const ch = supabase.channel('room-' + team)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections', filter: `team=eq.${team}` }, () => refetch(team))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `team=eq.${team}` }, (p) => {
        const r: any = p.new; if (!r) return;
        if (r.team !== teamRef.current) return;
        setStartedAt(r.started_at ? new Date(r.started_at).getTime() : null);
        setValidated(Boolean(r.validated));
        setScore(r.score || 0);
        setCorrect(r.correct || 0);
        if (r.validated) setPhase('done');
        else setPhase((prev) => prev === 'done' ? 'play' : prev);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [team]);

  useEffect(() => {
    if (phase !== 'play' || startedAt == null) { setRemaining(DURATION); return; }
    const tick = () => { const rem = Math.max(0, DURATION - Math.floor((Date.now() - startedAt) / 1000)); setRemaining(rem); if (rem <= 0 && !validatedRef.current) finalize(); };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [phase, startedAt]);

  async function finalize() {
    const tm = teamRef.current;
    if (validatedRef.current || !tm) return;
    const c = connsRef.current.filter(isCorrect).length;
    setValidated(true); setScore(c * 10); setCorrect(c); setPhase('done');
    const { error } = await supabase.from('rooms').update({ validated: true, score: c * 10, correct: c }).eq('team', tm);
    if (error) console.error('validate', error);
  }

  function onCheck() {
    if (validated) return;
    const list = connsRef.current;
    const wrong = list.filter((c) => !isCorrect(c)).length;
    const good = list.filter(isCorrect).length;
    setChecked(true);
    if (wrong === 0 && good === PAIRS.length) {
      // Perfect: end the game for the whole team.
      finalize();
      return;
    }
    if (wrong > 0) setHelpMsg(t.helpWrong);
    else setHelpMsg(t.helpMissing);
  }

  async function onBoxClick(id: string) {
    if (validated) return;
    if (!selected) { setSelected(id); return; }
    if (selected === id) { setSelected(null); return; }
    const k = pairKey(selected, id);
    const src = selected, tgt = id;
    setSelected(null);
    if (conns.some((c) => pairKey(c.src, c.tgt) === k)) return;
    setConns((prev) => [...prev, { id: tempId(), src, tgt }]);
    setChecked(false); setHelpMsg(null);
    const { error } = await supabase.from('connections').insert({ team, src, tgt });
    if (error) { console.error('insert', error); setErr(error.message); return; }
    refetch(team);
  }

  async function removeConn(c: Conn) {
    if (validated) return;
    setConns((prev) => prev.filter((x) => x.id !== c.id));
    setChecked(false); setHelpMsg(null);
    await supabase.from('connections').delete().eq('id', c.id);
    refetch(team);
  }

  async function clearAll() {
    if (validated) return;
    setConns([]); setSelected(null); setChecked(false); setHelpMsg(null);
    await supabase.from('connections').delete().eq('team', team);
    refetch(team);
  }

  if (phase === 'join') {
    return (
      <div style={S.page}>
        <div style={S.joinCard}>
          <div style={S.joinTop}>
            <div style={S.brand}>ERISIO ACADEMY</div>
            <button style={S.langBtn} onClick={toggleLang}>{lang === 'fr' ? 'EN' : 'FR'}</button>
          </div>
          <h1 style={S.joinTitle}>{t.subtitle}</h1>
          <p style={S.joinText}>{t.joinText}</p>
          <input style={S.input} placeholder={t.teamPlaceholder} value={teamInput} onChange={(e) => setTeamInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') join(); }} />
          <button style={S.btnPrimary} onClick={join} disabled={!normTeam(teamInput)}>{t.join}</button>
        </div>
      </div>
    );
  }

  const notStarted = startedAt == null;
  const displayRem = notStarted ? DURATION : remaining;
  const low = !notStarted && remaining <= 30;
  return (
    <div style={S.page}>
      <header style={S.header}>
        <div>
          <div style={S.brand}>ERISIO ACADEMY</div>
          <div style={S.sub}>{t.subtitle}</div>
        </div>
        <div style={S.hdrRight}>
          <button style={S.langBtn} onClick={toggleLang}>{lang === 'fr' ? 'EN' : 'FR'}</button>
          <span style={S.chip}>{t.team} <b>{team}</b></span>
          <div style={{ ...S.chrono, ...(low ? S.chronoLow : null) }}>⏱ {fmt(displayRem)}</div>
        </div>
      </header>
      <main style={S.main}>
        <div style={S.consigne}>{t.consigne}</div>
        {err && <div style={S.err}>Base : {err}. Le plateau fonctionne en local ; la synchro entre joueurs demande de vérifier Supabase.</div>}
        {helpMsg && <div style={S.help}>{helpMsg}</div>}
        <div style={S.toolbar}>
          {notStarted && (
            <button style={S.btnPrimary} onClick={startTimer}>{t.start}</button>
          )}
          <button style={S.btnGhost} onClick={clearAll} disabled={validated || notStarted}>{t.clear}</button>
          <button style={S.btnPrimary} onClick={onCheck} disabled={validated || notStarted}>{t.check}</button>
        </div>
        <div style={S.stage}>
          <svg viewBox="0 0 1200 540" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', display: 'block' }}>
            <defs>
              <marker id="head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="#011E4B" />
              </marker>
              <marker id="head-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="#2E8B57" />
              </marker>
              <marker id="head-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="#C0392B" />
              </marker>
              <marker id="head-grey" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="#b8b4c0" />
              </marker>
            </defs>
            {PANELS.map((p, i) => (
              <g key={'p' + i}>
                <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={14} fill="none" stroke="#dad7e0" strokeWidth={1.5} />
                {t.panels[i].map((ln, j) => (<text key={j} x={p.tx} y={p.ty + j * 22} textAnchor="middle" fill={p.color} fontSize={20} fontFamily="Arial, sans-serif" fontWeight={700}>{ln}</text>))}
              </g>
            ))}
            {BOXES.map((b) => {
              const isSel = selected === b.id;
              const stroke = isSel ? '#011E4B' : b.role === 'source' ? '#6b6b6b' : '#00000000';
              const sw = isSel ? 4 : b.role === 'source' ? 1.6 : 0;
              const dash = b.role === 'source' && !isSel ? '5 4' : undefined;
              const cy = b.y + b.h / 2;
              const lines = t.labels[b.id];
              return (
                <g key={b.id} onClick={() => onBoxClick(b.id)} style={{ cursor: validated ? 'default' : 'pointer' }}>
                  <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={8} fill={b.fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} style={{ pointerEvents: 'all' }} />
                  {lines.map((ln, j) => (<text key={j} x={b.x + b.w / 2} y={cy + (j - (lines.length - 1) / 2) * (b.size + 3) + b.size / 3} textAnchor="middle" fill={b.text} fontSize={b.size} fontFamily="'Arial Narrow', Arial, sans-serif" fontWeight={600} style={{ pointerEvents: 'none' }}>{ln}</text>))}
                </g>
              );
            })}
            {conns.map((c) => {
              if (!byId[c.src] || !byId[c.tgt]) return null;
              const showColors = validated || checked;
              const good = isCorrect(c);
              // Causal orientation only when colored and correct.
              let fromId = c.src, toId = c.tgt;
              if (showColors && good) { [fromId, toId] = causalOrder(c); }
              const [a, b] = attachPair(byId[fromId], byId[toId]);
              const col = showColors ? (good ? '#2E8B57' : '#C0392B') : '#011E4B';
              const marker = showColors ? (good ? 'url(#head-green)' : 'url(#head-red)') : 'url(#head)';
              return (
                <g key={c.id}>
                  <path d={curve(a, b)} fill="none" stroke={col} strokeWidth={4.5} markerEnd={marker} />
                  <path d={curve(a, b)} fill="none" stroke="#00000000" strokeWidth={20} style={{ cursor: validated ? 'default' : 'pointer' }} onClick={() => removeConn(c)} />
                </g>
              );
            })}
            {validated && PAIRS.filter((p) => !conns.some((c) => pairKey(c.src, c.tgt) === pairKey(p[0], p[1]))).map((p, i) => {
              const [a, b] = attachPair(byId[p[0]], byId[p[1]]);
              return <path key={'m' + i} d={curve(a, b)} fill="none" stroke="#b8b4c0" strokeWidth={4.5} strokeDasharray="7 7" markerEnd="url(#head-grey)" />;
            })}
          </svg>
        </div>
      </main>
      {validated && (
        <div style={S.overlay}>
          <div style={S.card}>
            <h2 style={S.cardTitle}>{correct === PAIRS.length ? t.perfect : t.result}</h2>
            <div style={S.scoreBig}>{score}</div>
            <div style={S.scoreSub}>{t.links(correct, PAIRS.length)}</div>
            <div style={S.explList}>
              {PAIRS.map(([from, to]) => {
                const k = pairKey(from, to);
                const wasFound = conns.some((c) => pairKey(c.src, c.tgt) === k);
                const fromLbl = t.labels[from].join(' ');
                const toLbl = t.labels[to].join(' ');
                return (
                  <div key={k} style={S.explItem}>
                    <div style={S.explHead}>
                      <span style={S.explArrow}>
                        <span style={S.explTag}>{t.causeLabel}</span> {fromLbl} → <span style={S.explTag}>{t.effectLabel}</span> {toLbl}
                      </span>
                      <span style={{ ...S.badge, ...(wasFound ? S.badgeOk : S.badgeMiss) }}>{wasFound ? t.found : t.missed}</span>
                    </div>
                    <div style={S.explWhy}>{t.explanations[k]}</div>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: 14, color: '#6b6770', margin: '12px 0 0' }}>{t.team} {team}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  page: { fontFamily: "'Arial Narrow', Arial, sans-serif", color: '#2E2A32', background: '#F6F5F8', minHeight: '100vh' },
  header: { background: '#011E4B', color: '#fff', padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  brand: { fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 20, letterSpacing: '.3px' },
  sub: { fontSize: 14, color: '#7995AB', marginTop: 2 },
  hdrRight: { display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  langBtn: { background: 'transparent', border: '1px solid currentColor', color: 'inherit', borderRadius: 8, padding: '4px 10px', fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  chip: { background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 999, padding: '5px 12px', fontSize: 13 },
  chrono: { fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 24, letterSpacing: 1, background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 10, padding: '6px 16px', color: '#fff' },
  chronoLow: { background: 'rgba(192,57,43,.9)', borderColor: '#fff' },
  main: { maxWidth: 1180, margin: '0 auto', padding: '18px 16px 60px' },
  consigne: { background: '#fff', borderLeft: '4px solid #8C577F', padding: '16px 20px', borderRadius: 6, fontSize: 21, fontWeight: 700, lineHeight: 1.4, marginBottom: 14 },
  help: { background: '#FFF7E0', color: '#5b4a12', border: '1px solid #F2D27A', borderLeft: '4px solid #E0962E', borderRadius: 6, padding: '12px 16px', fontSize: 16, marginBottom: 12 },
  err: { background: '#fdecea', color: '#8a1c12', border: '1px solid #f3b9b3', borderRadius: 6, padding: '8px 12px', fontSize: 14, marginBottom: 12 },
  toolbar: { display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 12 },
  stage: { background: '#fff', borderRadius: 12, padding: 8, boxShadow: '0 2px 14px rgba(1,30,75,.08)' },
  btnPrimary: { fontFamily: 'Arial, sans-serif', fontWeight: 700, border: 0, borderRadius: 8, padding: '11px 20px', fontSize: 15, cursor: 'pointer', background: '#011E4B', color: '#fff' },
  btnGhost: { fontFamily: 'Arial, sans-serif', fontWeight: 700, borderRadius: 8, padding: '11px 20px', fontSize: 15, cursor: 'pointer', background: '#fff', color: '#011E4B', border: '1.5px solid #011E4B' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(1,30,75,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' },
  card: { background: '#fff', borderRadius: 16, maxWidth: 560, width: '100%', padding: 28, textAlign: 'center', boxShadow: '0 18px 50px rgba(0,0,0,.3)', maxHeight: '90vh', overflowY: 'auto' },
  cardTitle: { fontFamily: 'Arial, sans-serif', color: '#011E4B', margin: '0 0 6px' },
  scoreBig: { fontFamily: 'Arial, sans-serif', fontSize: 54, fontWeight: 700, color: '#8C577F', lineHeight: 1 },
  scoreSub: { fontSize: 17, margin: '6px 0 14px' },
  explList: { display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', marginTop: 8 },
  explItem: { background: '#F6F5F8', border: '1px solid #e6e3ec', borderRadius: 10, padding: '12px 14px' },
  explHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6, flexWrap: 'wrap' },
  explArrow: { fontFamily: 'Arial, sans-serif', fontWeight: 700, color: '#011E4B', fontSize: 15 },
  explTag: { display: 'inline-block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#8C577F', background: '#fff', border: '1px solid #e0d3dc', borderRadius: 999, padding: '2px 7px', marginRight: 4 },
  explWhy: { fontSize: 14, lineHeight: 1.45, color: '#2E2A32' },
  badge: { fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 12, borderRadius: 999, padding: '3px 10px' },
  badgeOk: { background: '#E2F3E8', color: '#1f6b41', border: '1px solid #9bd1b1' },
  badgeMiss: { background: '#FDE6E1', color: '#8a1c12', border: '1px solid #f3b9b3' },
  joinCard: { maxWidth: 460, margin: '12vh auto 0', background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 10px 40px rgba(1,30,75,.12)' },
  joinTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  joinTitle: { fontFamily: 'Arial, sans-serif', color: '#011E4B', fontSize: 22, margin: '10px 0 8px' },
  joinText: { fontSize: 16, lineHeight: 1.5, marginBottom: 18 },
  input: { width: '100%', fontFamily: "'Arial Narrow', Arial, sans-serif", fontSize: 18, padding: '12px 14px', border: '1.5px solid #cfd3dc', borderRadius: 10, marginBottom: 14, boxSizing: 'border-box' },
};
