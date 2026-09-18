DELETE FROM public.atelier_notes
WHERE team = 'english-check'
  AND board IN ('bilan-en', 'bilan-detaille-en');