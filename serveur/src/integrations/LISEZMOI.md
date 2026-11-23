# Intégrations futures (phase 2)

Rien n'est branché ici pour l'instant, volontairement. Ce dossier recevra plus tard trois sortes de modules, chacun indépendant du reste de l'application.

Le dossier `telephonie/` contiendra un adaptateur par fournisseur (par exemple ComUnik). Son rôle sera de transformer un message reçu du fournisseur en données d'appel, puis d'appeler `creerAppel(donnees, null)` dans `modules/appels/appels.service.js`, exactement comme le formulaire le fait. Les colonnes `fournisseur_externe` et `id_appel_externe` de la table `appels` (avec leur clé unique) empêcheront les doublons.

Le dossier `transcription/` remplira `transcription` et `statut_transcription`. Le dossier `ia/` remplira `resume_ia` et `langue_detectee`, toujours comme suggestions à valider par une personne.

Avant d'activer l'une de ces intégrations avec de vraies données : documentation et autorisations du fournisseur, évaluation des facteurs relatifs à la vie privée (Loi 25) et accord de la clinique.
