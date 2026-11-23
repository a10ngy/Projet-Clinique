// Les noms suivent les colonnes MySQL renvoyées par l'API
export type Role = 'admin' | 'reception' | 'equipe' | 'infirmiere';
export type Groupe = 'en_attente' | 'rappel' | 'en_cours' | 'termine';
export type Langue = 'fr' | 'en' | 'es' | 'autre';

export interface Utilisateur {
  id: number;
  nom_complet: string;
  courriel: string;
  role: Role;
  role_libelle: string;
  permissions: string[];
}

export interface Statut {
  id: number;
  libelle: string;
  couleur: string;
  groupe: Groupe;
  ordre: number;
  actif: number;
}

export interface Categorie {
  id: number;
  libelle: string;
  ordre: number;
  actif: number;
}

export interface References {
  statuts: Statut[];
  categories: Categorie[];
  boites: { id: number; nom: string; poste: string | null; actif: number }[];
  roles: { id: number; code: Role; libelle: string }[];
  employes: { id: number; nom_complet: string; role: Role }[];
}

export interface Appel {
  id: number;
  nom_appelant: string | null;
  telephone: string;
  recu_le: string;
  description: string | null;
  langue: Langue;
  consigne_confidentialite: string | null;
  categorie_id: number | null;
  categorie: string | null;
  boite_vocale_id: number | null;
  boite_vocale: string | null;
  recu_par_id: number | null;
  recu_par: string | null;
  responsable_id: number | null;
  responsable: string | null;
  statut_id: number;
  statut: string;
  statut_couleur: string;
  statut_groupe: Groupe;
  rappel_par_id: number | null;
  rappel_par: string | null;
  rappel_depuis: string | null;
  archive_le: string | null;
  version: number;
  cree_le: string;
  modifie_le: string;
  modifie_par: string | null;
}

export interface FicheAppel extends Appel {
  notes: { id: number; type: 'note' | 'commentaire'; contenu: string; cree_le: string; auteur: string }[];
  suivis: { id: number; action: string; details: string | null; prochain_rappel_le: string | null; cree_le: string; auteur: string }[];
  historique: { id: number; champ: string; ancienne_valeur: string | null; nouvelle_valeur: string | null; cree_le: string; auteur: string | null }[];
}

export interface PageAppels {
  appels: Appel[];
  total: number;
  page: number;
  par_page: number;
}

export interface TableauDeBord {
  recus_aujourdhui: number;
  en_attente: number;
  a_rappeler: number;
  en_cours: number;
  termines: number;
  mes_suivis: number;
  activite: { type: 'modification' | 'note' | 'suivi'; appel_id: number; detail: string; auteur: string; nom_appelant: string | null; cree_le: string }[];
}

export interface Employe {
  id: number;
  nom_complet: string;
  courriel: string;
  role: Role;
  role_libelle: string;
  actif: number;
  derniere_connexion: string | null;
  suivis_ouverts: number;
}
