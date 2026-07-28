# Backlog

## Fait

- **UBL tranché (2026-07-28)** : le préprocessé UBL (104 règles, 979 asserts, dont
  ~648 UBL-CR) passe le garde-fou — même sous-ensemble syntaxique que le CII.
  19/19 exemples officiels propres, ~257 ms/fichier en moyenne (74–480 ms à chaud).
  Smoke-parité Saxon : 0 diff sur les 19 fichiers. Reste à faire pour l'UBL :
  corpus de mutation dédié + intégration dans parity.ts/CI.
- **Issue upstream fontoxpath postée** : https://github.com/FontoXML/fontoxpath/issues/686
  (proposition de PR courte incluse ; patch local dans `patches/fontoxpath@3.34.0.patch`).

## Prochaines étapes

0. **RÉSOLU (2026-07-28)** — fork `fontoxpath-exact-decimal@3.34.0-exact.1` publié
   par CI avec provenance, dépendance basculée via alias, patch local supprimé,
   suite complète verte sur le paquet publié (40 tests + parité 34 fichiers/0 diff).
   Signalé sur #686. Historique du bloquant ci-dessous :
   **le patch décimal ne voyage pas avec le paquet.**
   `patchedDependencies` ne s'applique qu'à notre workspace : un `npm install en16931`
   résout fontoxpath vanilla (float64) et BR-O-08 redevient un faux positif chez
   l'utilisateur. Fait : auto-contrôle au chargement (sonde `1.1 + 2.2 = 3.3`,
   `decimalExact` dans chaque résultat + warning explicite ; sonde vérifiée `false`
   sur fontoxpath vanilla). Reste avant de publier : **préparer le fork patché
   maintenant** (mentor, 2026-07-28 : « #686 date d'hier, ne compte pas dessus
   pour début septembre ») — `fontoxpath-exact-decimal` ou équivalent, documenté
   comme temporaire avec lien vers #686 ; publication npm par l'utilisateur
   (auth requise). **Ne jamais publier en se reposant sur le patch local.**
1. **Le repo** — déclencheur atteint (UBL tranché + issue postée). À décider ensemble :
   nom, scope npm, README, et surtout la formulation de la garantie. Décision de
   positionnement associée : « EN 16931 les deux syntaxes » vs « Factur-X/CII d'abord,
   UBL en package séparé » (le marché FR initial est dominé par Factur-X/CII ;
   l'UBL double la surface de maintenance à chaque release CEF).
2. **Corpus de mutation UBL + parité UBL en CI** — même discipline que le CII.
3. **Extraction PDF Factur-X**, puis **couche FR** — après la base prouvée.

## À publier le moment venu (matériel README/blog)

- La tolérance de BR-CO-17/BR-S-09 dans les artefacts CEF est **±1 unité entière**,
  pas ±0,01 : un centime d'écart sur le montant de TVA passe par conception.
  Introuvable en doc, source de confusion récurrente.

## Risques identifiés à retester plus tard

- **`fn:sum()` accumule en float64 dans fontoxpath** (non couvert par le patch
  opérateurs). Invisible sur les artefacts CEF car leurs auteurs wrappent chaque
  somme dans `round(... * 100) div 100`. Les extensions françaises **EXT-FR-FE-\***
  ne sont pas écrites par les auteurs CEF — aucune garantie de la même hygiène
  défensive. À l'ajout de la couche FR : tester spécifiquement les règles
  arithmétiques françaises avec des montants qui font dériver une somme float
  (ex. beaucoup de lignes à 0.1), et si ça mord, étendre le patch à `fn:sum`/`fn:avg`.

- **Le validateur de référence easybill (0.6.0) exécute un millésime d'artefacts
  antérieur à ce qu'il annonce** — divergences documentées et tolérées explicitement
  dans `parity.ts` (BR-63, BR-50/BR-61/CII-SR-470, CII-SR-009 : textes publiés
  1.3.15 = 1.3.16, notre comportement conforme au texte, le leur non). Surveiller
  leurs releases : quand ils passeront en 1.3.16, ces entrées du registre doivent
  disparaître (la CI le signalera si les diffs s'inversent).

- **Périmètre Schematron** : le runner exécute les artefacts EN 16931 préprocessés,
  pas Schematron dans l'absolu. Garde-fou au chargement : toute construction hors
  sous-ensemble (`let`, `value-of`, `report`, patterns abstraits, `defaultPhase`)
  est une erreur dure, jamais un skip silencieux.

## Rappel de périmètre produit

Pas de générateur, pas de transport PA. Le validateur EN 16931 qui n'existe pas en JS.
L'argument n° 1 est la correction (parité Saxon vérifiée en CI, corpus de mutation),
la perf (~50–200 ms/facture) est le bonus.
