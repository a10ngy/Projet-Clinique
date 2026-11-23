import test from 'node:test';
import assert from 'node:assert/strict';
import { peut, peutModifierAppel } from '../src/securite/permissions.js';
import { normaliserTelephone, versDateSql, echapperLike } from '../src/utils/formats.js';

const reception = { id: 2, role: 'reception' };
const emile = { id: 3, role: 'equipe' };

test('seule l’administration gère les employés et voit le journal', () => {
  assert.equal(peut('admin', 'utilisateurs:gerer'), true);
  assert.equal(peut('reception', 'utilisateurs:gerer'), false);
  assert.equal(peut('infirmiere', 'journal:voir'), false);
  assert.equal(peut('role-inconnu', 'appels:voir'), false);
});

test('un membre de l’équipe modifie ses suivis et les appels non attribués, pas ceux des autres', () => {
  assert.equal(peutModifierAppel(emile, { responsable_id: 3 }), true);
  assert.equal(peutModifierAppel(emile, { responsable_id: null }), true);
  assert.equal(peutModifierAppel(emile, { responsable_id: 4 }), false);
  assert.equal(peutModifierAppel(reception, { responsable_id: 4 }), true);
});

test('numéros de téléphone convertis au format E.164', () => {
  assert.equal(normaliserTelephone('(819) 555-0142'), '+18195550142');
  assert.equal(normaliserTelephone('1-819-555-0142'), '+18195550142');
  assert.equal(normaliserTelephone('555-0142'), null);
  assert.equal(normaliserTelephone(undefined), null);
});

test('dates converties en UTC pour MySQL', () => {
  assert.equal(versDateSql('2026-11-19T10:00:00-05:00'), '2026-11-19 15:00:00');
});

test('les caractères spéciaux de LIKE sont neutralisés', () => {
  assert.equal(echapperLike('50%_test'), '50\\%\\_test');
});
