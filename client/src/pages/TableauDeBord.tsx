import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { TableauDeBord as Donnees } from '../api/types';
import { FormulaireAppel } from '../composants/FormulaireAppel';
import { Avatar, Icone, type NomIcone } from '../composants/Icones';
import { Alerte, EtatVide } from '../composants/Interface';
import { useAuth } from '../contexte/Authentification';
import { Lien, useRoute } from '../routeur';
import { useTempsReel } from '../temps-reel';
import { ACTIONS_SUIVI, debutJourneeIso, formaterDate } from '../utils/format';

const aujourdhui = () => new Date().toLocaleDateString('en-CA'); // AAAA-MM-JJ à l'heure locale

const CARTES: { cle: keyof Omit<Donnees, 'activite'>; libelle: string; vers: () => string; ton: string; icone: NomIcone }[] = [
  { cle: 'recus_aujourdhui', libelle: 'Reçus aujourd’hui', vers: () => `/appels?du=${aujourdhui()}`, ton: 'neutre', icone: 'telephone' },
  { cle: 'en_attente', libelle: 'En attente', vers: () => '/appels?groupe=en_attente', ton: 'info', icone: 'horloge' },
  { cle: 'a_rappeler', libelle: 'À rappeler', vers: () => '/appels?groupe=rappel', ton: 'attention', icone: 'rappel' },
  { cle: 'en_cours', libelle: 'En cours', vers: () => '/appels?groupe=en_cours', ton: 'neutre', icone: 'activite' },
  { cle: 'termines', libelle: 'Terminés (non archivés)', vers: () => '/appels?groupe=termine', ton: 'succes', icone: 'coche' },
  { cle: 'mes_suivis', libelle: 'Attribués à moi', vers: () => '/mes-suivis', ton: 'accent', icone: 'suivis' },
];

function decrire(a: Donnees['activite'][number]) {
  if (a.type === 'note') return a.detail === 'note' ? 'a ajouté une note' : 'a commenté';
  if (a.type === 'suivi') return `a noté : ${ACTIONS_SUIVI[a.detail]?.toLowerCase() ?? a.detail}`;
  return a.detail === 'Création' ? 'a enregistré l’appel' : `a modifié : ${a.detail.toLowerCase()}`;
}

function salutation() {
  const heure = new Date().getHours();
  return heure < 5 || heure >= 18 ? 'Bonsoir' : 'Bonjour';
}

export function TableauDeBord() {
  const { utilisateur, peut } = useAuth();
  const { naviguer } = useRoute();
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState('');
  const [creation, setCreation] = useState(false);

  const charger = () =>
    api<Donnees>(`/tableau-de-bord?debut_journee=${encodeURIComponent(debutJourneeIso())}`)
      .then(setDonnees)
      .catch((e: Error) => setErreur(e.message));

  useEffect(() => {
    charger();
  }, []);
  useTempsReel(['appel:cree', 'appel:modifie', 'appel:activite'], charger);

  const date = new Date().toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const aRappeler = donnees?.a_rappeler ?? 0;
  const miens = donnees?.mes_suivis ?? 0;

  return (
    <>
      <section className="hero">
        <div className="hero-texte">
          <span className="surtitre surtitre-clair">{date}</span>
          <h1>{salutation()} {utilisateur?.nom_complet.split(' ')[0]}<span className="hero-point">.</span></h1>
          <p className="hero-resume">
            {!donnees ? 'Préparation de votre journée…' : (
              <>
                <strong>{aRappeler}</strong> appel{aRappeler > 1 ? 's' : ''} à rappeler et{' '}
                <strong>{miens}</strong> suivi{miens > 1 ? 's' : ''} qui vous {miens > 1 ? 'sont attribués' : 'est attribué'}.
              </>
            )}
          </p>
          <div className="hero-actions">
            {peut('appels:creer') && (
              <button type="button" className="bouton bouton-clair bouton-grand" onClick={() => setCreation(true)}>
                <Icone nom="plus" taille={18} /> Nouvel appel
              </button>
            )}
            <Lien vers="/mes-suivis" className="bouton bouton-contour-clair bouton-grand">
              Voir mes suivis <Icone nom="droite" taille={16} />
            </Lien>
          </div>
        </div>
        <Lien vers="/appels?groupe=rappel" className="hero-focus">
          <span className="hero-focus-libelle"><Icone nom="rappel" taille={16} /> Priorité du moment</span>
          <span className="hero-focus-nombre">{donnees ? aRappeler : '–'}</span>
          <span className="hero-focus-pied">à rappeler · ouvrir la liste <Icone nom="droite" taille={14} /></span>
        </Lien>
      </section>

      {erreur && <Alerte type="erreur">{erreur}</Alerte>}

      <div className="section-entete">
        <h2>Vue d’ensemble</h2>
        <Lien vers="/appels" className="lien-fleche">Tous les appels <Icone nom="droite" taille={14} /></Lien>
      </div>
      <section className="cartes" aria-label="Indicateurs">
        {CARTES.map((c, i) => (
          <Lien key={c.cle} vers={c.vers()} className={`carte carte-${c.ton}`}>
            <span className="carte-icone" style={{ animationDelay: `${i * 40}ms` }}><Icone nom={c.icone} taille={18} /></span>
            <span className="carte-nombre">{donnees ? donnees[c.cle] : <span className="squelette-texte" />}</span>
            <span className="carte-libelle">{c.libelle}</span>
            <span className="carte-fleche"><Icone nom="droite" taille={16} /></span>
          </Lien>
        ))}
      </section>

      <section className="panneau">
        <div className="panneau-entete">
          <h2>Activité récente de l’équipe</h2>
          <span className="direct"><span className="direct-point" /> En direct</span>
        </div>
        {donnees && !donnees.activite.length && <EtatVide icone="activite">Aucune activité pour l’instant.</EtatVide>}
        <ul className="activite">
          {donnees?.activite.map((a, i) => (
            <li key={i}>
              <Avatar nom={a.auteur} petit />
              <div className="activite-texte">
                <span>
                  <strong>{a.auteur}</strong> {decrire(a)} —{' '}
                  <Lien vers={`/appels/${a.appel_id}`}>{a.nom_appelant ?? `appel n° ${a.appel_id}`}</Lien>
                </span>
                <time className="discret">{formaterDate(a.cree_le)}</time>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {creation && (
        <FormulaireAppel
          onFermer={() => setCreation(false)}
          onEnregistre={(appel) => {
            setCreation(false);
            naviguer(`/appels/${appel.id}`);
          }}
        />
      )}
    </>
  );
}
