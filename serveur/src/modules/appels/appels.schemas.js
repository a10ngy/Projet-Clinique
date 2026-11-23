import { z } from 'zod';
import { normaliserTelephone, versDateSql } from '../../utils/formats.js';

const idRequis = (message) => z.number({ message }).int().positive({ message });
const idFacultatif = z.number().int().positive().nullable();
const texteFacultatif = (max) => z.string().trim().max(max, `${max} caractères maximum`).nullish().transform((v) => v || null);
const dateIso = z.string().datetime({ offset: true, message: 'Date et heure invalides' });

export const LANGUES = ['fr', 'en', 'es', 'autre'];
export const ACTIONS_SUIVI = ['rappel_en_cours', 'message_laisse', 'aucune_reponse', 'cliente_rejointe', 'rappel_prevu', 'transfere', 'autre'];

export const schemaAppel = z.object({
  nom_appelant: texteFacultatif(120),
  telephone: z
    .string({ message: 'Numéro requis' })
    .transform(normaliserTelephone)
    .refine((v) => v !== null, 'Numéro invalide : 10 chiffres requis'),
  recu_le: dateIso
    .refine((v) => Number.isNaN(Date.parse(v)) || Date.parse(v) <= Date.now() + 5 * 60 * 1000, 'La date ne peut pas être dans le futur')
    .transform(versDateSql),
  categorie_id: idFacultatif,
  description: texteFacultatif(5000),
  langue: z.enum(LANGUES, { message: 'Langue invalide' }),
  consigne_confidentialite: texteFacultatif(255),
  boite_vocale_id: idFacultatif,
  recu_par_id: idFacultatif,
  responsable_id: idFacultatif,
  statut_id: idRequis('Statut requis'),
});

// Modification : seulement les champs envoyés, plus la version lue (détection des conflits)
export const schemaModification = schemaAppel.partial().extend({
  version: z.number({ message: 'Version manquante' }).int().positive(),
});

export const schemaFiltres = z.object({
  recherche: z.string().trim().max(100).optional(),
  statut: z.coerce.number().int().positive().optional(),
  groupe: z.enum(['en_attente', 'rappel', 'en_cours', 'termine']).optional(),
  responsable: z.union([z.literal('aucun'), z.coerce.number().int().positive()]).optional(),
  boite: z.coerce.number().int().positive().optional(),
  langue: z.enum(LANGUES).optional(),
  du: dateIso.transform(versDateSql).optional(),
  au: dateIso.transform(versDateSql).optional(),
  archives: z.enum(['0', '1']).default('0'),
  mes_suivis: z.enum(['0', '1']).default('0'),
  tri: z.enum(['recu_le', 'nom_appelant', 'statut', 'responsable', 'modifie_le']).default('recu_le'),
  ordre: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
});

export const schemaNote = z.object({
  type: z.enum(['note', 'commentaire']).default('commentaire'),
  contenu: z.string({ message: 'Texte requis' }).trim().min(1, 'Texte requis').max(5000, '5000 caractères maximum'),
});

export const schemaSuivi = z.object({
  action: z.enum(ACTIONS_SUIVI, { message: 'Action invalide' }),
  details: texteFacultatif(500),
  prochain_rappel_le: dateIso.transform(versDateSql).nullish(),
});
