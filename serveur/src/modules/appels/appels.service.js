import { bd } from '../../config/bd.js';
import { peutModifierAppel } from '../../securite/permissions.js';
import { diffuser, notifierUtilisateur } from '../../temps-reel/socket.js';
import { erreurHttp } from '../../utils/http.js';
import { calculerChangements, construireFiltres } from './appels.requetes.js';

const SELECT_APPEL = `
  SELECT a.id, a.nom_appelant, a.telephone, a.recu_le, a.description, a.langue, a.consigne_confidentialite,
         a.categorie_id, c.libelle AS categorie, a.boite_vocale_id, b.nom AS boite_vocale,
         a.recu_par_id, rp.nom_complet AS recu_par, a.responsable_id, r.nom_complet AS responsable,
         a.statut_id, s.libelle AS statut, s.couleur AS statut_couleur, s.groupe AS statut_groupe,
         a.rappel_par_id, rap.nom_complet AS rappel_par, a.rappel_depuis, a.archive_le, a.version,
         a.cree_le, a.modifie_le, mp.nom_complet AS modifie_par,
         a.fournisseur_externe, a.transcription, a.statut_transcription, a.resume_ia, a.langue_detectee
  FROM appels a
  JOIN statuts s ON s.id = a.statut_id
  LEFT JOIN categories c ON c.id = a.categorie_id
  LEFT JOIN boites_vocales b ON b.id = a.boite_vocale_id
  LEFT JOIN utilisateurs rp ON rp.id = a.recu_par_id
  LEFT JOIN utilisateurs r ON r.id = a.responsable_id
  LEFT JOIN utilisateurs rap ON rap.id = a.rappel_par_id
  LEFT JOIN utilisateurs mp ON mp.id = a.modifie_par_id`;

const CHAMPS_MODIFIABLES = ['nom_appelant', 'telephone', 'recu_le', 'categorie_id', 'description', 'langue',
  'consigne_confidentialite', 'boite_vocale_id', 'recu_par_id', 'responsable_id', 'statut_id'];

export async function listerAppels(filtres, utilisateurId) {
  const f = construireFiltres(filtres, utilisateurId);
  const [[[{ total }]], [appels]] = await Promise.all([
    bd.query(`SELECT COUNT(*) AS total FROM appels a JOIN statuts s ON s.id = a.statut_id ${f.where}`, f.valeurs),
    bd.query(`${SELECT_APPEL} ${f.where} ${f.orderBy} LIMIT ? OFFSET ?`, [...f.valeurs, f.limite, f.decalage]),
  ]);
  return { appels, total: Number(total), page: filtres.page, par_page: f.limite };
}

export async function chargerAppel(id) {
  const [[appel]] = await bd.query(`${SELECT_APPEL} WHERE a.id = ?`, [id]);
  if (!appel) throw erreurHttp(404, 'Appel introuvable');
  return appel;
}

// Fiche complète : l'appel, ses notes, ses actions de suivi et son historique
export async function obtenirFiche(id) {
  const appel = await chargerAppel(id);
  const [[notes], [suivis], [historique]] = await Promise.all([
    bd.query(`SELECT n.id, n.type, n.contenu, n.cree_le, u.nom_complet AS auteur
              FROM notes_appel n JOIN utilisateurs u ON u.id = n.auteur_id WHERE n.appel_id = ? ORDER BY n.id DESC`, [id]),
    bd.query(`SELECT su.id, su.action, su.details, su.prochain_rappel_le, su.cree_le, u.nom_complet AS auteur
              FROM suivis su JOIN utilisateurs u ON u.id = su.utilisateur_id WHERE su.appel_id = ? ORDER BY su.id DESC`, [id]),
    bd.query(`SELECT h.id, h.champ, h.ancienne_valeur, h.nouvelle_valeur, h.cree_le, u.nom_complet AS auteur
              FROM historique_appels h LEFT JOIN utilisateurs u ON u.id = h.utilisateur_id WHERE h.appel_id = ? ORDER BY h.id DESC`, [id]),
  ]);
  return { ...appel, notes, suivis, historique };
}

async function ajouterHistorique(appelId, utilisateurId, changements) {
  if (!changements.length) return;
  const lignes = changements.map((c) => [appelId, utilisateurId, c.champ, c.ancienne?.slice(0, 255) ?? null, c.nouvelle?.slice(0, 255) ?? null]);
  await bd.query('INSERT INTO historique_appels (appel_id, utilisateur_id, champ, ancienne_valeur, nouvelle_valeur) VALUES ?', [lignes]);
}

// utilisateur = null pour une future intégration (ex. ComUnik) : l'appel arrive alors sans créateur humain
export async function creerAppel(donnees, utilisateur) {
  const [resultat] = await bd.query('INSERT INTO appels SET ?', [{ ...donnees, cree_par_id: utilisateur?.id ?? null }]);
  const id = resultat.insertId;
  await ajouterHistorique(id, utilisateur?.id ?? null, [{ champ: 'Création', ancienne: null, nouvelle: 'Appel enregistré' }]);
  diffuser('appel:cree', { id });
  if (donnees.responsable_id && donnees.responsable_id !== utilisateur?.id) {
    notifierUtilisateur(donnees.responsable_id, 'suivi:attribue', { id });
  }
  return chargerAppel(id);
}

function conflit(appel) {
  const qui = appel.modifie_par ?? 'une autre personne';
  return erreurHttp(409, `Cet appel vient d’être modifié par ${qui}. Rechargez la fiche pour voir la version à jour.`, {
    version: appel.version,
  });
}

export async function modifierAppel(id, { version, ...changements }, utilisateur) {
  const avant = await chargerAppel(id);
  if (!peutModifierAppel(utilisateur, avant)) throw erreurHttp(403, 'Seule la personne responsable ou la réception peut modifier cet appel');
  if (avant.version !== version) throw conflit(avant);

  const colonnes = CHAMPS_MODIFIABLES.filter((c) => changements[c] !== undefined);
  if (!colonnes.length) return avant;
  // Un nouveau statut termine aussi le « Je rappelle » en cours
  const finRappel = colonnes.includes('statut_id') ? ', rappel_par_id = NULL, rappel_depuis = NULL' : '';
  const [resultat] = await bd.query(
    `UPDATE appels SET ${colonnes.map((c) => `${c} = ?`).join(', ')}${finRappel},
       version = version + 1, modifie_par_id = ? WHERE id = ? AND version = ?`,
    [...colonnes.map((c) => changements[c]), utilisateur.id, id, version],
  );
  if (resultat.affectedRows === 0) throw conflit(await chargerAppel(id)); // modifié entre la lecture et l'écriture

  const apres = await chargerAppel(id);
  await ajouterHistorique(id, utilisateur.id, calculerChangements(avant, apres));
  diffuser('appel:modifie', { id, version: apres.version });
  if (apres.responsable_id && apres.responsable_id !== avant.responsable_id && apres.responsable_id !== utilisateur.id) {
    notifierUtilisateur(apres.responsable_id, 'suivi:attribue', { id });
  }
  return apres;
}

export async function changerArchivage(id, archiver, utilisateur) {
  const appel = await chargerAppel(id);
  if (archiver && appel.statut_groupe !== 'termine') throw erreurHttp(400, 'Seul un appel terminé peut être archivé');
  await bd.query(
    `UPDATE appels SET archive_le = ${archiver ? 'NOW()' : 'NULL'}, version = version + 1, modifie_par_id = ? WHERE id = ?`,
    [utilisateur.id, id],
  );
  await ajouterHistorique(id, utilisateur.id, [{ champ: 'Archivage', ancienne: null, nouvelle: archiver ? 'Archivé' : 'Sorti des archives' }]);
  diffuser('appel:modifie', { id });
}

export async function ajouterNote(id, { type, contenu }, utilisateur) {
  await chargerAppel(id);
  await bd.query('INSERT INTO notes_appel (appel_id, auteur_id, type, contenu) VALUES (?, ?, ?, ?)', [id, utilisateur.id, type, contenu]);
  diffuser('appel:activite', { id });
}

// Toute action de suivi autre que « rappel en cours » libère le « Je rappelle »
export async function ajouterSuivi(id, { action, details, prochain_rappel_le }, utilisateur) {
  await chargerAppel(id);
  await bd.query(
    'INSERT INTO suivis (appel_id, utilisateur_id, action, details, prochain_rappel_le) VALUES (?, ?, ?, ?, ?)',
    [id, utilisateur.id, action, details, prochain_rappel_le ?? null],
  );
  if (action !== 'rappel_en_cours') await bd.query('UPDATE appels SET rappel_par_id = NULL, rappel_depuis = NULL WHERE id = ?', [id]);
  diffuser('appel:activite', { id });
}

// « Je rappelle » : avertit si quelqu'un d'autre rappelle déjà, sans bloquer si la personne confirme
export async function prendreRappel(id, forcer, utilisateur) {
  const appel = await chargerAppel(id);
  if (appel.rappel_par_id && appel.rappel_par_id !== utilisateur.id && !forcer) {
    throw erreurHttp(409, `${appel.rappel_par} rappelle déjà cette personne.`, { rappel_par: appel.rappel_par, rappel_depuis: appel.rappel_depuis });
  }
  await bd.query('UPDATE appels SET rappel_par_id = ?, rappel_depuis = NOW() WHERE id = ?', [utilisateur.id, id]);
  await ajouterSuivi(id, { action: 'rappel_en_cours', details: null }, utilisateur);
}

export async function libererRappel(id, utilisateur) {
  await bd.query('UPDATE appels SET rappel_par_id = NULL, rappel_depuis = NULL WHERE id = ? AND rappel_par_id = ?', [id, utilisateur.id]);
  diffuser('appel:activite', { id });
}
