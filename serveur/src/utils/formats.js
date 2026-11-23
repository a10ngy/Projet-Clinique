// Numéro nord-américain -> format E.164 (+18195550142). null si le numéro est inutilisable.
export function normaliserTelephone(brut) {
  const chiffres = String(brut ?? '').replace(/\D/g, '');
  if (chiffres.length === 10) return `+1${chiffres}`;
  if (chiffres.length === 11 && chiffres.startsWith('1')) return `+${chiffres}`;
  return null;
}

// Date ISO (avec fuseau) -> DATETIME MySQL en UTC : '2026-11-19 15:00:00'
export function versDateSql(iso) {
  return new Date(iso).toISOString().slice(0, 19).replace('T', ' ');
}

// Rend une recherche LIKE sûre : % et _ deviennent des caractères ordinaires
export function echapperLike(texte) {
  return texte.replace(/[\\%_]/g, '\\$&');
}
