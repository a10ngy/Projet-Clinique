import test from 'node:test';
import assert from 'node:assert/strict';
import { schemaAppel, schemaFiltres, schemaModification } from '../src/modules/appels/appels.schemas.js';
import { calculerChangements, construireFiltres, statutChange } from '../src/modules/appels/appels.requetes.js';

const appelValide = {
  nom_appelant: '  Julie Test ',
  telephone: '819 555-0142',
  recu_le: '2026-11-18T09:14:00-05:00',
  categorie_id: 1,
  description: 'Souhaite un rendez-vous',
  langue: 'fr',
  boite_vocale_id: null,
  recu_par_id: 2,
  responsable_id: null,
  statut_id: 1,
};

test('un appel valide est nettoyé (espaces, téléphone, date UTC)', () => {
  const r = schemaAppel.safeParse(appelValide);
  assert.equal(r.success, true);
  assert.equal(r.data.nom_appelant, 'Julie Test');
  assert.equal(r.data.telephone, '+18195550142');
  assert.equal(r.data.recu_le, '2026-11-18 14:14:00');
  assert.equal(r.data.consigne_confidentialite, null);
});

test('champs invalides refusés avec un message en français', () => {
  const futur = new Date(Date.now() + 86_400_000).toISOString();
  const r = schemaAppel.safeParse({ ...appelValide, telephone: '123', langue: 'de', statut_id: null, recu_le: futur });
  const messages = Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message]));
  assert.equal(messages.telephone, 'Numéro invalide : 10 chiffres requis');
  assert.equal(messages.langue, 'Langue invalide');
  assert.equal(messages.statut_id, 'Statut requis');
  assert.equal(messages.recu_le, 'La date ne peut pas être dans le futur');
});

test('une modification exige la version lue (détection des conflits)', () => {
  assert.equal(schemaModification.safeParse({ statut_id: 2 }).success, false);
  assert.deepEqual(schemaModification.parse({ statut_id: 2, version: 4 }), { statut_id: 2, version: 4 });
});

test('filtres : valeurs par défaut et tri limité à une liste fixe', () => {
  assert.deepEqual(schemaFiltres.parse({}), { archives: '0', mes_suivis: '0', tri: 'recu_le', ordre: 'desc', page: 1 });
  assert.equal(schemaFiltres.safeParse({ tri: 'id; DROP TABLE appels' }).success, false);
});

test('recherche par numéro, par nom, et pagination', () => {
  const parNumero = construireFiltres(schemaFiltres.parse({ recherche: '819 555 01', page: '3' }), 7);
  assert.match(parNumero.where, /a\.telephone LIKE \?/);
  assert.equal(parNumero.valeurs[0], '%81955501%');
  assert.equal(parNumero.decalage, 50);

  const parNom = construireFiltres(schemaFiltres.parse({ recherche: 'Ju' }), 7);
  assert.doesNotMatch(parNom.where, /telephone/);
  assert.deepEqual(parNom.valeurs, ['%Ju%']);
});

test('« mes suivis » et archives filtrent correctement, sans valeur dans le texte SQL', () => {
  const f = construireFiltres(schemaFiltres.parse({ mes_suivis: '1', archives: '1', responsable: 'aucun', tri: 'statut', ordre: 'asc' }), 7);
  assert.match(f.where, /a\.archive_le IS NOT NULL/);
  assert.match(f.where, /a\.responsable_id IS NULL/);
  assert.deepEqual(f.valeurs, [7]);
  assert.equal(f.orderBy, 'ORDER BY s.ordre IS NULL, s.ordre ASC, a.id DESC');
});

test('historique : libellés lisibles et textes longs masqués', () => {
  const avant = { statut: 'Nouveau message', responsable: null, description: 'Texte A', telephone: '+18195550142' };
  const apres = { statut: 'À rappeler', responsable: 'Émile Équipe', description: 'Texte B', telephone: '+18195550142' };
  assert.deepEqual(calculerChangements(avant, apres), [
    { champ: 'Responsable', ancienne: null, nouvelle: 'Émile Équipe' },
    { champ: 'Statut', ancienne: 'Nouveau message', nouvelle: 'À rappeler' },
    { champ: 'Description', ancienne: '(texte précédent)', nouvelle: '(texte modifié)' },
  ]);
});

test('« Je rappelle » : seul un nouveau statut y met fin, pas une simple modification', () => {
  const avant = { statut_id: 2 };
  assert.equal(statutChange(avant, { statut_id: 3 }), true);
  assert.equal(statutChange(avant, { statut_id: 2, description: 'Texte corrigé' }), false);
  assert.equal(statutChange(avant, { description: 'Texte corrigé' }), false);
});
