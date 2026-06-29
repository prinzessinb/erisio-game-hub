import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Route secrète (lien mystère). Ne pas deviner : seul ce lien donne accès aux ateliers.
export const Route = createFileRoute('/atelier/postits-r9k3m7p2x5q8')({ component: AtelierPostits });

// Clé animatrice. Le lien animatrice porte ?anim=<cette clé> ; le lien participant ne la porte pas.
const ADMIN_KEY = 'eris-9k2p7x5q';
const TEMPLATE = '__tpl__'; // équipe « modèle » : le stock préparé par l'animatrice

type Lang = 'fr' | 'en';
type Phase = 'setup' | 'join' | 'board';
type Note = { id: string; team: string; tpl: string | null; x: number; y: number; text: string; color: number; w: number; h: number };

const COLORS: { bg: string; fg: string }[] = [
  { bg: '#FFE680', fg: '#2E2A32' }, { bg: '#CBD8E2', fg: '#11233a' }, { bg: '#E7CFE1', fg: '#3a2336' },
  { bg: '#CDE7CF', fg: '#1f3a23' }, { bg: '#F7C9D6', fg: '#3a1f29' }, { bg: '#011E4B', fg: '#ffffff' },
];

const T: Record<Lang, Record<string, string>> = {
  fr: {
    brand: 'ERISIO ACADEMY', sub: 'Atelier post-its',
    setupTitle: 'Atelier post-its', setupText: 'Donne un nom à ton tableau, puis prépare le modèle : pose l’image et range tes post-its dans un coin. Chaque équipe en recevra sa propre copie à placer. Le tableau reste enregistré d’une formation à l’autre.',
    boardPh: 'Nom du tableau (ex. achats-2026)', open: 'Préparer comme animatrice',
    joinTitle: 'Atelier post-its', joinText: 'Saisis le nom de ton équipe. Tu reçois ta copie des post-its à placer sur l’image. Tes coéquipiers tapent le même nom pour vous retrouver.',
    teamPh: 'Nom de l’équipe', join: 'Rejoindre', board: 'Tableau', team: 'Équipe',
    consigneAnim: 'Vue animatrice : tu prépares le modèle. Pose l’image, ajoute tes post-its et range-les dans un coin. Leur position ici est la position de départ de chaque équipe.',
    consignePlay: 'Placez vos post-its sur l’image pour dire où va chaque élément. Glissez-les, redimensionnez-les, écrivez dessus.',
    add: '+ Ajouter un post-it', url: 'Image par lien', file: 'Image depuis l’ordinateur',
    empty: 'Aucune image. Choisissez une image par lien ou depuis l’ordinateur, puis ajoutez des post-its.',
    urlPrompt: 'Colle l’adresse (URL) de l’image :', notePh: 'Écris ici…', uploading: 'Envoi de l’image…',
    lockImg: 'Verrouiller l’image', unlockImg: 'Déverrouiller l’image',
    resetTeams: 'Réinitialiser les équipes', confirmReset: 'Remettre les post-its de toutes les équipes dans le coin de départ ?',
    restart: 'Tout ranger', confirmRestart: 'Remettre tes post-its dans le coin de départ ?',
    animOn: 'Mode animatrice', copyLink: 'Copier le lien participant', copied: 'Lien copié',
  },
  en: {
    brand: 'ERISIO ACADEMY', sub: 'Sticky-note workshop',
    setupTitle: 'Sticky-note workshop', setupText: 'Name your board, then prepare the template: place the image and tuck your sticky notes into a corner. Each team gets its own copy to place. The board stays saved between sessions.',
    boardPh: 'Board name (e.g. procurement-2026)', open: 'Prepare as facilitator',
    joinTitle: 'Sticky-note workshop', joinText: 'Enter your team name. You receive your copy of the sticky notes to place on the image. Teammates type the same name to join you.',
    teamPh: 'Team name', join: 'Join', board: 'Board', team: 'Team',
    consigneAnim: 'Facilitator view: prepare the template. Place the image, add your notes and tuck them in a corner. Their position here is each team’s starting position.',
    consignePlay: 'Place your sticky notes on the image to show where each item goes. Drag them, resize them, write on them.',
    add: '+ Add a sticky note', url: 'Image by link', file: 'Image from computer',
    empty: 'No image yet. Choose an image by link or from your computer, then add sticky notes.',
    urlPrompt: 'Paste the image address (URL):', notePh: 'Write here…', uploading: 'Uploading image…',
    lockImg: 'Lock image', unlockImg: 'Unlock image',
    resetTeams: 'Reset teams', confirmReset: 'Send every team’s notes back to the starting corner?',
    restart: 'Tidy up', confirmRestart: 'Send your notes back to the starting corner?',
    animOn: 'Facilitator mode', copyLink: 'Copy participant link', copied: 'Link copied',
  },
};

const normName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
const detectLang = (): Lang => { try { return new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'fr'; } catch { return 'fr'; } };
const uid = () => { try { return crypto.randomUUID(); } catch { return 'n' + Date.now() + Math.round(Math.random() * 1e6); } };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
function readParams() {
  try { const q = new URLSearchParams(window.location.search); return { board: normName(q.get('board') || ''), anim: q.get('anim') === ADMIN_KEY }; }
  catch { return { board: '', anim: false }; }
}

// Lit un fichier image et le renvoie en data URL. Les gros fichiers sont réduits
// (max 1400 px, JPEG) pour rester légers : l'image est stockée dans la base, sans bucket.
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onload = () => {
      const raw = reader.result as string;
      if (file.size < 700000) { resolve(raw); return; }
      const img = new Image();
      img.onerror = () => reject(new Error('img'));
      img.onload = () => {
        const max = 1400; let w = img.width, h = img.height;
        if (w > max || h > max) { const r = Math.min(max / w, max / h); w = Math.round(w * r); h = Math.round(h * r); }
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const ctx = c.getContext('2d'); if (!ctx) { resolve(raw); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = raw;
    };
    reader.readAsDataURL(file);
  });
}

function AtelierPostits() {
  const init = readParams();
  const [lang, setLang] = useState<Lang>(detectLang());
  const t = T[lang];
  const [phase, setPhase] = useState<Phase>(init.board ? (init.anim ? 'board' : 'join') : 'setup');
  const [isAnim] = useState<boolean>(init.anim);
  const [boardInput, setBoardInput] = useState('');
  const [teamInput, setTeamInput] = useState('');
  const [board, setBoard] = useState(init.board);
  const [team, setTeam] = useState(init.anim ? TEMPLATE : '');
  const [imageUrl, setImageUrl] = useState('');
  const [imageLocked, setImageLocked] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<string | null>(null);
  const editingRef = useRef<string | null>(null);
  const viewTeamRef = useRef<string>(init.anim ? TEMPLATE : '');
  const writeTimers = useRef<Record<string, number>>({});

  const myTeam = isAnim ? TEMPLATE : team;
  viewTeamRef.current = myTeam;

  function toggleLang() {
    const nl: Lang = lang === 'fr' ? 'en' : 'fr';
    setLang(nl);
    try { const u = new URL(window.location.href); u.searchParams.set('lang', nl); window.history.replaceState({}, '', u.toString()); } catch {}
  }

  async function fetchNotes(bd: string, tm: string) {
    const { data, error } = await supabase.from('atelier_notes').select('id,team,tpl,x,y,w,h,text,color').eq('board', bd).eq('team', tm);
    if (error) { console.error('fetch', error); setErr(error.message); return [] as Note[]; }
    return (data || []) as Note[];
  }

  async function loadRoom(bd: string) {
    await supabase.from('atelier_rooms').upsert({ board: bd }, { onConflict: 'board', ignoreDuplicates: true });
    const { data: room } = await supabase.from('atelier_rooms').select('*').eq('board', bd).single();
    if (room) { if (room.image_url) setImageUrl(room.image_url); setImageLocked(!!room.image_locked); }
  }

  // Une équipe qui arrive sans post-its reçoit une copie du modèle (le stock), à la position de départ.
  async function cloneTemplateInto(bd: string, tm: string) {
    const tpls = await fetchNotes(bd, TEMPLATE);
    if (!tpls.length) return [] as Note[];
    const rows = tpls.map((s) => ({ id: uid(), board: bd, team: tm, tpl: s.id, x: s.x, y: s.y, w: s.w, h: s.h, text: s.text, color: s.color }));
    // upsert (board,team,tpl) unique : deux coéquipiers qui arrivent en même temps ne dupliquent pas.
    const { error } = await supabase.from('atelier_notes').upsert(rows, { onConflict: 'board,team,tpl', ignoreDuplicates: true });
    if (error) console.error('clone', error);
    return await fetchNotes(bd, tm);
  }

  async function enterBoard(bd: string, tm: string) {
    await loadRoom(bd);
    let mine = await fetchNotes(bd, tm);
    if (!mine.length && tm !== TEMPLATE) mine = await cloneTemplateInto(bd, tm);
    setNotes(mine);
  }

  useEffect(() => { if (init.board && init.anim) enterBoard(init.board, TEMPLATE); /* eslint-disable-next-line */ }, []);

  function openAsAnim() {
    const bd = normName(boardInput); if (!bd) return;
    setBoard(bd); setTeam(TEMPLATE); setPhase('board');
    try { const u = new URL(window.location.href); u.searchParams.set('board', bd); u.searchParams.set('anim', ADMIN_KEY); window.history.replaceState({}, '', u.toString()); } catch {}
    enterBoard(bd, TEMPLATE);
  }
  function joinTeam() {
    const tm = normName(teamInput); if (!tm || tm === TEMPLATE) return;
    setTeam(tm); setPhase('board');
    enterBoard(board, tm);
  }

  function participantLink() { try { const u = new URL(window.location.href); u.searchParams.set('board', board); u.searchParams.delete('anim'); u.searchParams.delete('lang'); return u.toString(); } catch { return ''; } }
  async function copyParticipant() { try { await navigator.clipboard.writeText(participantLink()); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch {} }

  // Temps réel : on ne garde que les évènements de la vue courante (modèle pour l'animatrice, sa propre équipe pour un participant).
  useEffect(() => {
    if (!board) return;
    const ch = supabase.channel('atelier-' + board)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atelier_notes', filter: `board=eq.${board}` }, (p) => {
        const ev = p.eventType;
        if (ev === 'DELETE') { const old = p.old as { id: string; team?: string }; if (old.team && old.team !== viewTeamRef.current) return; setNotes((prev) => prev.filter((x) => x.id !== old.id)); return; }
        const n = p.new as Note;
        if (n.team !== viewTeamRef.current) return;
        if (ev === 'INSERT') setNotes((prev) => (prev.some((x) => x.id === n.id) ? prev : [...prev, n]));
        else if (ev === 'UPDATE') { if (draggingRef.current === n.id || editingRef.current === n.id) return; setNotes((prev) => prev.map((x) => (x.id === n.id ? n : x))); }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atelier_rooms', filter: `board=eq.${board}` }, (p) => {
        const r: any = p.new; if (!r) return; if (typeof r.image_url === 'string') setImageUrl(r.image_url); setImageLocked(!!r.image_locked);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [board]);

  /* ---------- Image (animatrice) ---------- */
  async function saveImage(urlValue: string) { setImageUrl(urlValue); const { error } = await supabase.from('atelier_rooms').update({ image_url: urlValue }).eq('board', board); if (error) setErr(error.message); }
  function pickImageUrl() { if (imageLocked) return; const u = window.prompt(t.urlPrompt, imageUrl || ''); if (u && u.trim()) saveImage(u.trim()); }
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f || imageLocked) return;
    setBusy(true); setErr(null);
    try { const url = await fileToDataUrl(f); await saveImage(url); }
    catch { setErr('Image illisible.'); }
    setBusy(false);
  }
  async function toggleImageLock() { const v = !imageLocked; setImageLocked(v); const { error } = await supabase.from('atelier_rooms').update({ image_locked: v }).eq('board', board); if (error) setErr(error.message); }

  /* ---------- Post-its ---------- */
  async function addNoteAt(x: number, y: number) {
    const n: Note = { id: uid(), team: myTeam, tpl: null, x, y, text: '', color: 0, w: 0.13, h: 0.16 };
    setNotes((prev) => [...prev, n]);
    const { error } = await supabase.from('atelier_notes').insert({ board, ...n });
    if (error) setErr(error.message);
    setTimeout(() => { const el = document.querySelector<HTMLTextAreaElement>(`[data-id="${n.id}"] textarea`); if (el) el.focus(); }, 0);
  }
  const addNote = () => addNoteAt(isAnim ? 0.04 : 0.44, isAnim ? 0.05 : 0.40);

  function patchLocal(id: string, p: Partial<Note>) { setNotes((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x))); }
  function scheduleWrite(id: string, p: Partial<Note>) { const tm = writeTimers.current; if (tm[id]) window.clearTimeout(tm[id]); tm[id] = window.setTimeout(() => { supabase.from('atelier_notes').update(p).eq('id', id).then(({ error }) => { if (error) console.error(error); }); }, 250); }
  function writeNow(id: string, p: Partial<Note>) { supabase.from('atelier_notes').update(p).eq('id', id).then(({ error }) => { if (error) console.error(error); }); }
  async function deleteNote(id: string) { setNotes((prev) => prev.filter((x) => x.id !== id)); await supabase.from('atelier_notes').delete().eq('id', id); }
  const onText = (id: string, v: string) => { patchLocal(id, { text: v }); scheduleWrite(id, { text: v }); };
  const onColor = (id: string, color: number) => { patchLocal(id, { color }); writeNow(id, { color }); };

  // Ranger : remet les post-its dans le coin de départ (on les recrée à partir du modèle).
  async function resetTeams() {
    if (!window.confirm(t.confirmReset)) return;
    await supabase.from('atelier_notes').delete().eq('board', board).neq('team', TEMPLATE);
  }
  async function restartMine() {
    if (!window.confirm(t.confirmRestart)) return;
    await supabase.from('atelier_notes').delete().eq('board', board).eq('team', myTeam);
    const mine = await cloneTemplateInto(board, myTeam);
    setNotes(mine);
  }

  /* ---------- Déplacement ---------- */
  function startDrag(e: React.PointerEvent, n: Note) {
    const target = e.target as HTMLElement;
    if (target.closest('textarea') || target.closest('button')) return;
    e.preventDefault();
    const bd = boardRef.current; if (!bd) return;
    const el = e.currentTarget as HTMLElement;
    try { el.setPointerCapture(e.pointerId); } catch { /* pointeur synthétique : on suit via window */ }
    draggingRef.current = n.id;
    const rect = bd.getBoundingClientRect(); const nb = el.getBoundingClientRect();
    const offX = e.clientX - nb.left, offY = e.clientY - nb.top;
    const wf = nb.width / rect.width, hf = nb.height / rect.height;
    // On autorise un débordement (jusqu'à ~80% hors du bord) ; la surface n'est pas rognée,
    // donc le post-it reste visible même posé au-delà du cadre. Le haut reste accessible.
    const calc = (ev: PointerEvent) => ({ x: clamp((ev.clientX - offX - rect.left) / rect.width, -wf * 0.8, 1 - wf * 0.2), y: clamp((ev.clientY - offY - rect.top) / rect.height, -hf * 0.2, 1 - hf * 0.2) });
    const move = (ev: PointerEvent) => patchLocal(n.id, calc(ev));
    const up = (ev: PointerEvent) => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); draggingRef.current = null; writeNow(n.id, calc(ev)); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  }

  /* ---------- Redimensionnement ---------- */
  function startResize(e: React.PointerEvent, n: Note) {
    e.preventDefault(); e.stopPropagation();
    const bd = boardRef.current; if (!bd) return;
    const handle = e.currentTarget as HTMLElement;
    try { handle.setPointerCapture(e.pointerId); } catch { /* pointeur synthétique : on suit via window */ }
    draggingRef.current = n.id;
    const rect = bd.getBoundingClientRect();
    // Poignée d'angle : largeur depuis X, hauteur depuis Y (donc horizontal, vertical et diagonale).
    const calc = (ev: PointerEvent) => ({
      w: clamp((ev.clientX - rect.left - n.x * rect.width) / rect.width, 0.05, 0.7),
      h: clamp((ev.clientY - rect.top - n.y * rect.height) / rect.height, 0.04, 0.8),
    });
    const move = (ev: PointerEvent) => patchLocal(n.id, calc(ev));
    const up = (ev: PointerEvent) => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); draggingRef.current = null; writeNow(n.id, calc(ev)); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  }

  function onBoardDouble(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-id]')) return;
    const bd = boardRef.current; if (!bd) return;
    const rect = bd.getBoundingClientRect();
    addNoteAt(clamp((e.clientX - rect.left) / rect.width - 0.06, 0, 0.85), clamp((e.clientY - rect.top) / rect.height - 0.04, 0, 0.85));
  }

  /* ---------- Écran d'accueil animatrice ---------- */
  if (phase === 'setup') {
    return (
      <div style={S.page}><div style={S.joinCard}>
        <div style={S.joinTop}><div style={S.brand}>{t.brand}</div><button style={S.langBtn} onClick={toggleLang}>{lang === 'fr' ? 'EN' : 'FR'}</button></div>
        <h1 style={S.joinTitle}>{t.setupTitle}</h1>
        <p style={S.joinText}>{t.setupText}</p>
        <input style={S.input} placeholder={t.boardPh} value={boardInput} onChange={(e) => setBoardInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') openAsAnim(); }} />
        <button style={{ ...S.btnPrimary, width: '100%' }} onClick={openAsAnim} disabled={!normName(boardInput)}>{t.open}</button>
      </div></div>
    );
  }
  /* ---------- Écran équipe (participant) ---------- */
  if (phase === 'join') {
    return (
      <div style={S.page}><div style={S.joinCard}>
        <div style={S.joinTop}><div style={S.brand}>{t.brand}</div><button style={S.langBtn} onClick={toggleLang}>{lang === 'fr' ? 'EN' : 'FR'}</button></div>
        <h1 style={S.joinTitle}>{t.joinTitle}</h1>
        <p style={S.joinText}>{t.joinText}</p>
        <input style={S.input} placeholder={t.teamPh} value={teamInput} onChange={(e) => setTeamInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') joinTeam(); }} />
        <button style={{ ...S.btnPrimary, width: '100%' }} onClick={joinTeam} disabled={!normName(teamInput)}>{t.join}</button>
      </div></div>
    );
  }

  /* ---------- Tableau ---------- */
  const canImg = isAnim && !imageLocked;
  return (
    <div style={S.page}>
      <header style={S.header}>
        <div><div style={S.brand}>{t.brand}</div><div style={S.sub}>{t.sub}</div></div>
        <div style={S.hdrRight}>
          <button style={S.langBtn} onClick={toggleLang}>{lang === 'fr' ? 'EN' : 'FR'}</button>
          <span style={S.chip}>{isAnim ? t.board : t.team} <b>{isAnim ? board : team}</b></span>
        </div>
      </header>
      <main style={S.main}>
        <div style={S.consigne}>{isAnim ? t.consigneAnim : t.consignePlay}</div>
        {err && <div style={S.err}>Base : {err}.</div>}

        {isAnim && (
          <div style={S.animBar}>
            <span style={S.animTag}>{t.animOn}</span>
            <button style={S.btnSmall} onClick={toggleImageLock}>{imageLocked ? t.unlockImg : t.lockImg}</button>
            <button style={S.btnSmall} onClick={resetTeams}>{t.resetTeams}</button>
            <button style={{ ...S.btnSmall, marginLeft: 'auto' }} onClick={copyParticipant}>{copied ? t.copied : t.copyLink}</button>
          </div>
        )}

        <div style={S.toolbar}>
          <button style={S.btnPrimary} onClick={addNote}>{t.add}</button>
          {canImg && <button style={S.btnGhost} onClick={pickImageUrl}>{t.url}</button>}
          {canImg && <label style={{ ...S.btnGhost, display: 'inline-flex', alignItems: 'center' }}>{busy ? t.uploading : t.file}<input type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} /></label>}
          {!isAnim && <button style={S.btnGhost} onClick={restartMine}>{t.restart}</button>}
        </div>

        <div style={S.boardWrap}>
          <div ref={boardRef} style={S.board} onDoubleClick={onBoardDouble}>
            <div style={S.imgBox}>
              {imageUrl ? <img src={imageUrl} alt="" style={S.img} draggable={false} /> : <div style={S.empty}><div style={{ fontSize: 42 }}>🖼️</div><div>{t.empty}</div></div>}
            </div>
            {notes.map((n) => {
              const c = COLORS[n.color] || COLORS[0];
              return (
                <div key={n.id} data-id={n.id} onPointerDown={(e) => startDrag(e, n)}
                  style={{ ...S.note, left: `${n.x * 100}%`, top: `${n.y * 100}%`, width: `${n.w * 100}%`, height: `${n.h * 100}%`, background: c.bg, color: c.fg }}>
                  <textarea style={{ ...S.textarea, color: c.fg }} placeholder={t.notePh} value={n.text}
                    onFocus={() => { editingRef.current = n.id; }} onBlur={() => { if (editingRef.current === n.id) editingRef.current = null; }}
                    onPointerDown={(e) => e.stopPropagation()} onChange={(e) => onText(n.id, e.target.value)} />
                  <div style={S.bar} className="note-bar">
                    <div style={S.swatches}>{COLORS.map((cc, i) => (<button key={i} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onColor(n.id, i); }} style={{ ...S.swatch, background: cc.bg }} />))}</div>
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); deleteNote(n.id); }} style={S.del}>×</button>
                  </div>
                  <div className="note-grip" style={S.grip} onPointerDown={(e) => startResize(e, n)} title="" />
                </div>
              );
            })}
          </div>
        </div>
      </main>
      <style>{`.note-bar,.note-grip{opacity:0;transition:opacity .12s}[data-id]:hover .note-bar,[data-id]:hover .note-grip{opacity:1}
        [data-id] textarea::placeholder{color:inherit;opacity:.45}`}</style>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  page: { fontFamily: "'Arial Narrow', Arial, sans-serif", color: '#2E2A32', background: '#F6F5F8', minHeight: '100vh' },
  header: { background: '#011E4B', color: '#fff', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  brand: { fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 20, letterSpacing: '.3px' },
  sub: { fontSize: 14, color: '#7995AB', marginTop: 2 },
  hdrRight: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  langBtn: { background: 'transparent', border: '1px solid currentColor', color: 'inherit', borderRadius: 8, padding: '4px 10px', fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  chip: { background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 999, padding: '5px 12px', fontSize: 13 },
  main: { maxWidth: 1180, margin: '0 auto', padding: '16px' },
  consigne: { background: '#fff', borderLeft: '4px solid #8C577F', padding: '12px 18px', borderRadius: 6, fontSize: 18, fontWeight: 700, lineHeight: 1.4, marginBottom: 12 },
  err: { background: '#fdecea', color: '#8a1c12', border: '1px solid #f3b9b3', borderRadius: 6, padding: '8px 12px', fontSize: 14, marginBottom: 12 },
  animBar: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: '#011E4B', color: '#fff', borderRadius: 8, padding: '8px 12px', marginBottom: 12 },
  animTag: { fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 13, background: '#8C577F', borderRadius: 999, padding: '3px 10px' },
  btnSmall: { fontFamily: 'Arial, sans-serif', fontWeight: 700, border: '1px solid rgba(255,255,255,.4)', background: 'rgba(255,255,255,.1)', color: '#fff', borderRadius: 7, padding: '6px 12px', fontSize: 13, cursor: 'pointer' },
  toolbar: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 },
  btnPrimary: { fontFamily: 'Arial, sans-serif', fontWeight: 700, border: 0, borderRadius: 8, padding: '10px 18px', fontSize: 15, cursor: 'pointer', background: '#011E4B', color: '#fff' },
  btnGhost: { fontFamily: 'Arial, sans-serif', fontWeight: 700, borderRadius: 8, padding: '10px 18px', fontSize: 15, cursor: 'pointer', background: '#fff', color: '#011E4B', border: '1.5px solid #011E4B' },
  boardWrap: { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 2px 14px rgba(1,30,75,.08)', overflow: 'visible' },
  board: { position: 'relative', width: '100%', borderRadius: 8, overflow: 'visible', background: '#e9e7ee', minHeight: 380, userSelect: 'none', touchAction: 'none' },
  imgBox: { width: '60%', margin: '13% auto' },
  img: { display: 'block', width: '100%', height: 'auto', pointerEvents: 'none', boxShadow: '0 2px 10px rgba(0,0,0,.12)', borderRadius: 4 },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 280, color: '#6b6770', textAlign: 'center', padding: 24, background: '#fff', borderRadius: 6 },
  note: { position: 'absolute', containerType: 'inline-size', minHeight: 36, padding: '7px 7px 20px', borderRadius: 3, boxShadow: '0 6px 14px rgba(0,0,0,.22)', display: 'flex', flexDirection: 'column' },
  textarea: { flex: 1, border: 0, background: 'transparent', resize: 'none', fontFamily: "'Comic Sans MS','Segoe Print','Arial Narrow',sans-serif", fontSize: 'clamp(11px, 13cqi, 22px)', lineHeight: 1.2, outline: 'none', minHeight: 40, overflowY: 'auto' },
  bar: { position: 'absolute', left: 6, right: 6, bottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  swatches: { display: 'flex', gap: 3 },
  swatch: { width: 12, height: 12, borderRadius: '50%', border: '1px solid rgba(0,0,0,.25)', cursor: 'pointer', padding: 0 },
  del: { border: 0, background: 'rgba(0,0,0,.12)', color: 'inherit', borderRadius: '50%', width: 18, height: 18, fontSize: 12, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  grip: { position: 'absolute', right: 0, bottom: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 0 15px 15px', borderColor: 'transparent transparent rgba(0,0,0,.38) transparent', cursor: 'nwse-resize', touchAction: 'none' },
  joinCard: { maxWidth: 480, margin: '12vh auto 0', background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 10px 40px rgba(1,30,75,.12)' },
  joinTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  joinTitle: { fontFamily: 'Arial, sans-serif', color: '#011E4B', fontSize: 22, margin: '10px 0 8px' },
  joinText: { fontSize: 16, lineHeight: 1.5, marginBottom: 16 },
  input: { width: '100%', fontFamily: "'Arial Narrow', Arial, sans-serif", fontSize: 18, padding: '12px 14px', border: '1.5px solid #cfd3dc', borderRadius: 10, marginBottom: 12, boxSizing: 'border-box' },
};
