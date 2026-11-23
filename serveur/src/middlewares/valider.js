import { erreurHttp } from '../utils/http.js';

// Valide le corps (ou la query) avec un schéma zod. Les données nettoyées vont dans req.donnees.
export const valider = (schema, source = 'body') => (req, res, suivant) => {
  const resultat = schema.safeParse(req[source] ?? {});
  if (!resultat.success) {
    const champs = {};
    for (const probleme of resultat.error.issues) {
      const cle = probleme.path.join('.') || 'formulaire';
      champs[cle] ??= probleme.message; // on garde le premier message de chaque champ
    }
    throw Object.assign(erreurHttp(400, 'Certains champs sont invalides'), { champs });
  }
  req.donnees = resultat.data;
  suivant();
};
