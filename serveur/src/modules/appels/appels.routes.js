import { Router } from 'express';
import { z } from 'zod';
import { exigerPermission } from '../../middlewares/authentification.js';
import { valider } from '../../middlewares/valider.js';
import { lireId } from '../../utils/http.js';
import { schemaAppel, schemaFiltres, schemaModification, schemaNote, schemaSuivi } from './appels.schemas.js';
import * as service from './appels.service.js';

export const routeurAppels = Router();
const id = (req) => lireId(req.params.id);

routeurAppels.get('/', exigerPermission('appels:voir'), valider(schemaFiltres, 'query'), async (req, res) => {
  res.json(await service.listerAppels(req.donnees, req.utilisateur.id));
});

routeurAppels.post('/', exigerPermission('appels:creer'), valider(schemaAppel), async (req, res) => {
  res.status(201).json(await service.creerAppel(req.donnees, req.utilisateur));
});

routeurAppels.get('/:id', exigerPermission('appels:voir'), async (req, res) => {
  res.json(await service.obtenirFiche(id(req)));
});

// Une seule route de modification : formulaire complet, changement rapide de statut ou attribution
routeurAppels.patch('/:id', valider(schemaModification), async (req, res) => {
  res.json(await service.modifierAppel(id(req), req.donnees, req.utilisateur));
});

routeurAppels.post('/:id/archiver', exigerPermission('appels:archiver'), async (req, res) => {
  await service.changerArchivage(id(req), true, req.utilisateur);
  res.json({ ok: true });
});

routeurAppels.post('/:id/desarchiver', exigerPermission('appels:archiver'), async (req, res) => {
  await service.changerArchivage(id(req), false, req.utilisateur);
  res.json({ ok: true });
});

routeurAppels.post('/:id/notes', exigerPermission('appels:commenter'), valider(schemaNote), async (req, res) => {
  await service.ajouterNote(id(req), req.donnees, req.utilisateur);
  res.status(201).json({ ok: true });
});

routeurAppels.post('/:id/suivis', exigerPermission('appels:commenter'), valider(schemaSuivi), async (req, res) => {
  await service.ajouterSuivi(id(req), req.donnees, req.utilisateur);
  res.status(201).json({ ok: true });
});

routeurAppels.post('/:id/rappel', exigerPermission('appels:commenter'), valider(z.object({ forcer: z.boolean().default(false) })), async (req, res) => {
  await service.prendreRappel(id(req), req.donnees.forcer, req.utilisateur);
  res.json({ ok: true });
});

routeurAppels.delete('/:id/rappel', exigerPermission('appels:commenter'), async (req, res) => {
  await service.libererRappel(id(req), req.utilisateur);
  res.json({ ok: true });
});
