-- Structure de la base « gestion des appels ».
-- Exécuté par scripts/initialiser-bd.js (npm run bd:init). Toutes les dates sont en UTC.

CREATE TABLE roles (
  id TINYINT UNSIGNED PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  libelle VARCHAR(60) NOT NULL
);

CREATE TABLE utilisateurs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom_complet VARCHAR(120) NOT NULL,
  courriel VARCHAR(190) NOT NULL UNIQUE,
  mot_de_passe_hash VARCHAR(100) NOT NULL,
  role_id TINYINT UNSIGNED NOT NULL,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  derniere_connexion DATETIME NULL,
  cree_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modifie_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_utilisateurs_role FOREIGN KEY (role_id) REFERENCES roles (id)
);

CREATE TABLE boites_vocales (
  id TINYINT UNSIGNED PRIMARY KEY,
  nom VARCHAR(60) NOT NULL,
  poste VARCHAR(20) NULL,
  actif BOOLEAN NOT NULL DEFAULT TRUE
);

-- groupe : sert au tableau de bord (en attente, à rappeler, en cours, terminé)
CREATE TABLE statuts (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  libelle VARCHAR(80) NOT NULL UNIQUE,
  couleur CHAR(7) NOT NULL DEFAULT '#64748b',
  groupe ENUM('en_attente', 'rappel', 'en_cours', 'termine') NOT NULL,
  ordre SMALLINT NOT NULL DEFAULT 0,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  cree_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modifie_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  libelle VARCHAR(80) NOT NULL UNIQUE,
  ordre SMALLINT NOT NULL DEFAULT 0,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  cree_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modifie_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE appels (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom_appelant VARCHAR(120) NULL,
  telephone VARCHAR(20) NOT NULL,                 -- format E.164 : +18195550142
  recu_le DATETIME NOT NULL,
  categorie_id SMALLINT UNSIGNED NULL,
  description TEXT NULL,
  langue ENUM('fr', 'en', 'es', 'autre') NOT NULL DEFAULT 'fr',
  consigne_confidentialite VARCHAR(255) NULL,     -- ex. « ne pas laisser de message »
  boite_vocale_id TINYINT UNSIGNED NULL,          -- vide si l'appel a été répondu
  recu_par_id INT UNSIGNED NULL,
  responsable_id INT UNSIGNED NULL,
  statut_id SMALLINT UNSIGNED NOT NULL,
  rappel_par_id INT UNSIGNED NULL,                -- « Je rappelle » : qui rappelle en ce moment
  rappel_depuis DATETIME NULL,
  archive_le DATETIME NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,        -- détecte deux modifications simultanées
  cree_par_id INT UNSIGNED NULL,                  -- vide = créé par une future intégration
  modifie_par_id INT UNSIGNED NULL,
  cree_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modifie_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Future intégration téléphonique et IA : facultatif, rien n'est branché pour l'instant
  fournisseur_externe VARCHAR(40) NULL,
  id_appel_externe VARCHAR(191) NULL,
  chemin_audio VARCHAR(255) NULL,
  transcription TEXT NULL,
  statut_transcription ENUM('aucune', 'en_attente', 'terminee', 'erreur') NULL,
  resume_ia TEXT NULL,
  langue_detectee VARCHAR(20) NULL,
  UNIQUE KEY uq_appels_externe (fournisseur_externe, id_appel_externe),
  KEY idx_appels_telephone (telephone),
  KEY idx_appels_recu_le (recu_le),
  KEY idx_appels_statut_responsable (statut_id, responsable_id),
  KEY idx_appels_archive (archive_le),
  CONSTRAINT fk_appels_categorie FOREIGN KEY (categorie_id) REFERENCES categories (id),
  CONSTRAINT fk_appels_boite FOREIGN KEY (boite_vocale_id) REFERENCES boites_vocales (id),
  CONSTRAINT fk_appels_recu_par FOREIGN KEY (recu_par_id) REFERENCES utilisateurs (id),
  CONSTRAINT fk_appels_responsable FOREIGN KEY (responsable_id) REFERENCES utilisateurs (id),
  CONSTRAINT fk_appels_statut FOREIGN KEY (statut_id) REFERENCES statuts (id),
  CONSTRAINT fk_appels_rappel_par FOREIGN KEY (rappel_par_id) REFERENCES utilisateurs (id),
  CONSTRAINT fk_appels_cree_par FOREIGN KEY (cree_par_id) REFERENCES utilisateurs (id),
  CONSTRAINT fk_appels_modifie_par FOREIGN KEY (modifie_par_id) REFERENCES utilisateurs (id)
);

CREATE TABLE notes_appel (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  appel_id INT UNSIGNED NOT NULL,
  auteur_id INT UNSIGNED NOT NULL,
  type ENUM('note', 'commentaire') NOT NULL DEFAULT 'commentaire',
  contenu TEXT NOT NULL,
  cree_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notes_appel (appel_id),
  CONSTRAINT fk_notes_appel FOREIGN KEY (appel_id) REFERENCES appels (id),
  CONSTRAINT fk_notes_auteur FOREIGN KEY (auteur_id) REFERENCES utilisateurs (id)
);

CREATE TABLE suivis (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  appel_id INT UNSIGNED NOT NULL,
  utilisateur_id INT UNSIGNED NOT NULL,
  action ENUM('rappel_en_cours', 'message_laisse', 'aucune_reponse', 'cliente_rejointe', 'rappel_prevu', 'transfere', 'autre') NOT NULL,
  details VARCHAR(500) NULL,
  prochain_rappel_le DATETIME NULL,
  cree_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_suivis_appel (appel_id),
  CONSTRAINT fk_suivis_appel FOREIGN KEY (appel_id) REFERENCES appels (id),
  CONSTRAINT fk_suivis_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs (id)
);

-- Les textes longs (description, consigne) sont notés « modifié » sans recopier leur contenu
CREATE TABLE historique_appels (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  appel_id INT UNSIGNED NOT NULL,
  utilisateur_id INT UNSIGNED NULL,
  champ VARCHAR(60) NOT NULL,
  ancienne_valeur VARCHAR(255) NULL,
  nouvelle_valeur VARCHAR(255) NULL,
  cree_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_historique_appel (appel_id),
  CONSTRAINT fk_historique_appel FOREIGN KEY (appel_id) REFERENCES appels (id),
  CONSTRAINT fk_historique_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs (id)
);

CREATE TABLE journal_acces (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT UNSIGNED NULL,
  action VARCHAR(50) NOT NULL,
  details VARCHAR(255) NULL,
  adresse_ip VARCHAR(45) NULL,
  cree_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_journal_date (cree_le),
  CONSTRAINT fk_journal_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs (id)
);

-- Données de référence (modifiables ensuite dans l'administration)
INSERT INTO roles (id, code, libelle) VALUES
  (1, 'admin', 'Administrateur'),
  (2, 'reception', 'Réceptionniste'),
  (3, 'equipe', 'Membre de l''équipe'),
  (4, 'infirmiere', 'Infirmière');

INSERT INTO boites_vocales (id, nom) VALUES
  (1, 'Boîte vocale 1'), (2, 'Boîte vocale 2'), (3, 'Boîte vocale 3'), (4, 'Boîte vocale 4');

INSERT INTO statuts (libelle, couleur, groupe, ordre) VALUES
  ('Nouveau message', '#2563eb', 'en_attente', 1),
  ('À rappeler', '#d97706', 'rappel', 2),
  ('En cours de traitement', '#7c3aed', 'en_cours', 3),
  ('En attente', '#64748b', 'en_attente', 4),
  ('Rappel effectué', '#0891b2', 'en_cours', 5),
  ('Cliente rejointe', '#16a34a', 'termine', 6),
  ('Transféré à une infirmière', '#db2777', 'en_cours', 7),
  ('Transféré à un autre membre de l''équipe', '#9333ea', 'en_cours', 8),
  ('Aucun suivi nécessaire', '#475569', 'termine', 9),
  ('Terminé', '#15803d', 'termine', 10);

INSERT INTO categories (libelle, ordre) VALUES
  ('Prise de rendez-vous', 1),
  ('Annulation ou report', 2),
  ('Demande d''information', 3),
  ('Demande de rappel', 4),
  ('Question administrative', 5),
  ('Autre', 6);
