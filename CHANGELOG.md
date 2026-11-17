# Historique des versions

## v2.3.0 — QCM : au moins 5 questions par fiche

- **112 nouvelles questions** : chacune des 35 fiches en a désormais au moins 5 (PVLAN n'en avait
  aucune). Le QCM passe de 85 à **197 questions** : 105 CCNA, 73 CCNP ENCOR et 19 CSNE.
- Mises en situation (configuration à choisir, sortie de commande à analyser) et questions de
  théorie (valeurs par défaut, ports, ordre de décision, plages d'adresses…), toutes expliquées.
- Chaque fait sur lequel repose une question a été vérifié par recherche en ligne avant
  l'écriture (documentation Cisco, RFC, guides de configuration). Quand les sources se
  contredisaient (par exemple le sens de « up/down » sur un port Ethernet), la question a été
  écartée.
- Les nouvelles questions sont regroupées dans `quiz.js`, dans deux sections « compléments » : une
  pour le CCNA, une pour le CCNP ENCOR.

## v2.2.0 — relecture et corrections

Relecture complète des fiches, des schémas, des exemples de sortie et du QCM, confrontée à la
documentation Cisco et Stormshield.

### Suppression de la v1

- Le dossier `v1/` et le lien « version précédente » de la barre latérale sont supprimés.
- Les favoris enregistrés par la v1 dans le navigateur sont toujours repris automatiquement.

### Corrections

- **BGP** : `show ip bgp neighbors … received-routes` exige `neighbor … soft-reconfiguration inbound`.
  La commande de dépannage devient `… routes`, et une étape facultative explique comment activer
  `received-routes`.
- **NAT** : la raison donnée contre `permit any` est corrigée (consommation des ressources du
  routeur, d'après Cisco).
- **VRF** : IOS prévient bien quand `vrf forwarding` efface l'adresse IP (message cité).
  `show ip interface brief vrf`, non documentée, est remplacée par `show ip vrf interfaces`.
- **Wireless (9800)** : le default-policy-tag diffuse les WLAN d'ID 1 à 16 avec le profil de
  politique par défaut. Un WLAN sans tag personnalisé n'est donc pas forcément invisible.
- **GRE / IPsec** : une clé partagée différente se voit plutôt en MM_KEY_EXCH, pas en MM_NO_STATE.
- **SSH** : 2048 bits au minimum (IOS XE 17.11.1 et suivants refusent les clés RSA plus courtes),
  au lieu de « au moins 768 bits ».
- **OSPF** : le masque n'est vérifié que sur les réseaux multi-accès. Un type de réseau différent
  laisse le voisinage monter en FULL, mais les routes ne s'installent pas.
- **VOIP** : fiche réécrite. La configuration en trunk, non prise en charge pour le voice VLAN, est
  retirée. AutoQoS devient la méthode principale (anciens Catalyst comme Catalyst 9000).
  `mls qos` reste en option, réservé aux 2960, 3560 et 3750. La fiche passe au niveau CCNA, comme le
  voice VLAN dans le programme.
- **Sécurité de port** : 3 adresses MAC pour un téléphone IP avec un PC derrière, comme dans la
  fiche VOIP. La fiche Port Security indiquait 2.

### Précisions

- Redistribution : sur IOS XE récent, `subnets` est implicite.
- LACP : norme IEEE 802.1AX (autrefois 802.3ad).
- EIGRP : publié en RFC 7868 depuis 2016.
- SD-WAN : nouveaux noms des contrôleurs depuis la version 20.12 (SD-WAN Manager, Validator,
  Controller).
- Interfaces : `show interfaces status` et `show interfaces counters errors` sont réservées aux
  switchs.
- VLAN : un VLAN n'est pas créé automatiquement en VTP client ou s'il a été supprimé après coup.

### QCM

- 85 questions au total : 40 CCNA, 26 CCNP ENCOR, 19 CSNE (catégorie ajoutée après la v2.1.0).
- Explications complétées pour `vlan-missing` et `sdwan-roles`.
- À vérifier dans le support de cours CSNE : `csne-ips-q3` (alarmes de spoofing en mode IDS). Le
  guide ANSSI de SNS v4.3 indique que l'anti-spoofing s'applique avant la politique de filtrage.

## v2.1.0 — fiche VTP

- Nouvelle fiche **VTP** (CCNP ENCOR), rangée avec les fiches de commutation après PVLAN :
  guide en 7 étapes (domaine et version, rôles server / client / transparent, mot de passe,
  vérification de la synchronisation, pruning, remise à zéro du numéro de révision, serveur
  primaire en version 3), pièges courants, schéma de topologie et exemple de sortie de
  `show vtp status`.
- 4 questions VTP dans l'entraînement (3 mises en situation, 1 de théorie), avec explications.
- 35 fiches au total. Rédigé de mémoire, sans test sur un équipement réel.

## v2.0.0 — refonte

Refonte complète de l'interface, nouveau mode Entraînement (QCM) et contenu étendu.
La version précédente reste disponible (voir « Revenir à la v1 » en bas de page).

### Navigation : 10 onglets → 4 vues

| Avant (v1) | Maintenant (v2) |
| --- | --- |
| Guide | **Guide** |
| Tout, CCNA, CCNP ENCOR, Security, Services, Troubleshooting, All commands | **Référence**, une seule vue avec des filtres Niveau / Catégorie / Type / Affichage |
| Favoris | **Favoris** |
| Entraînement (config à trous) | **Entraînement** (QCM) |

- Tous les libellés sont en français.
- Chaque vue a son adresse (`#guide/ospf`, `#ref`, `#fav`, `#quiz`) : rechargement, bouton
  Précédent et partage de lien fonctionnent partout. Sans adresse précise, l'appli rouvre la
  dernière vue utilisée.
- Le thème clair / sombre choisi est mémorisé.
- La barre latérale occupe toute la hauteur de la fenêtre.
- Le numéro de version est affiché en bas de la barre latérale, avec un lien vers la v1.

### Guide

- **Recherche corrigée** : taper un mot ouvre la fiche qui correspond le mieux (le nom d'abord),
  au lieu de filtrer la liste sans changer la fiche. Sur mobile, le menu déroulant est filtré lui
  aussi et le nombre de résultats est affiché.
- **Variables** : un panneau liste les `<VARIABLES>` de la fiche. Les valeurs saisies remplacent
  les variables à l'écran et dans tout ce qui est copié (« Copier », « Copier toute la config »).
  Elles sont gardées d'une fiche à l'autre et au rechargement.
- **Schémas de topologie** sur 21 fiches.
- **Exemples de sortie** : 27 commandes de vérification ont un exemple dépliable, avec ce qu'il
  faut y lire.
- Lien « S'entraîner sur ce thème » vers les questions du QCM de la fiche.

### Référence (remplace 7 onglets)

- Fiches **repliées par défaut** : la page fait environ 2 000 px au lieu de 11 500. Un clic sur le
  titre déplie une fiche ; boutons « Tout déplier » / « Tout replier ».
- Les fiches se lisent de gauche à droite, dans l'ordre (plus de colonnes en serpentin).
- Filtres Niveau (CCNA, CCNP ENCOR), Catégorie (Sécurité, Services) et Type, tous mémorisés. Seuls
  les filtres qui ont un effet sont affichés.
- La recherche n'affiche plus deux fois la même commande, et rappelle la ligne parente
  (`interface …`) d'une sous-commande trouvée.
- « All commands » devient l'affichage **Liste de commandes**, intitulé « Commandes de
  vérification » : il annonce ce qu'il contient (show, troubleshoot et debug, sans doublon) et les
  filtres de type y fonctionnent.

### Favoris

- L'étoile est visible sans survol, avec une zone tactile plus grande sur mobile.
- Les **sous-commandes** (lignes indentées) peuvent être mises en favori ; leur ligne parente est
  enregistrée avec elles.
- Les favoris sont **regroupés par fiche d'origine**, avec un lien vers la fiche.
- Compteur dans le menu, « Tout copier », « Tout supprimer ».
- Ajouter un favori ne redessine plus la page.
- Les favoris de la v1 sont repris automatiquement.

### Entraînement : QCM

Remplace l'exercice de config à trous.

- **62 questions** (40 CCNA, 22 CCNP ENCOR), à choix unique ou multiple.
- **82 % de mises en situation** (51 questions) : un besoin à configurer ou une panne à résoudre,
  souvent avec une sortie de commande ou une configuration à analyser, et les commandes à choisir.
  Le reste est de la théorie (calcul de sous-réseau, élection du DR, choix du chemin BGP…).
- Chaque réponse est **expliquée**, avec un lien vers la fiche du Guide.
- Réglages : niveau, type de question, thème, nombre de questions (10, 20 ou toutes).
- **Suivi** : questions vues, taux de réussite, progression par thème, bouton « Revoir mes
  erreurs ». Les questions jamais vues ou ratées la dernière fois sont proposées en premier.
- Écran de fin : score, détail par thème, correction des questions ratées, « Refaire les questions
  ratées ».
- Clavier : A–F ou 1–6 pour cocher, Entrée pour valider et passer à la suite.

Les questions sont dans `quiz.js` (le format est décrit en tête de fichier).

### Contenu

8 nouvelles fiches CCNP ENCOR, chacune avec son guide pas à pas (34 fiches au total, contre 26) :
GRE / IPsec, QoS (MQC), Multicast / PIM, Wireless (WLC 9800), SD-WAN (WAN Edge),
NETCONF / RESTCONF / EEM, IP SLA / Tracking, SPAN / NetFlow.

### Corrections diverses

- Valider une recherche en cliquant ailleurs dans la page ne décale plus la mise en page sous le
  pointeur (le clic pouvait tomber à côté de sa cible).
- Échap vide la recherche.
- Le bouton « Copy » devient « Copier ».

### Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | page (mise à jour) |
| `styles.css` | styles (mis à jour) |
| `app.js` | logique (réécrit) |
| `data.js` | fiches (8 ajoutées, les 26 existantes inchangées) |
| `extras.js` | **nouveau** : schémas et exemples de sortie |
| `quiz.js` | **nouveau** : questions du QCM |
| `v1/` | **nouveau** : archive de la version 1.0 |

### À savoir

- Les 62 questions, les 8 nouvelles fiches et les exemples de sortie ont été rédigés de mémoire,
  sans vérification sur un équipement réel. Les sorties sont des exemples représentatifs : leur
  format varie selon la plate-forme et la version d'IOS. Une relecture est conseillée.
- La fiche SD-WAN reste courte : en production, la configuration vient des modèles de vManage.
- La page `/goon/` n'a pas été modifiée.

## v1.0 — version d'origine

Guide (26 fiches), vues Tout / CCNA / CCNP ENCOR / Security / Services / Troubleshooting /
All commands, Favoris, Entraînement à trous. Dernier commit : `274762f`.

## Retrouver la v1

L'archive `/v1/` a été supprimée en v2.2.0 et n'est plus en ligne. Son code reste dans l'historique
git : le commit `274762f` est la v1.0. Pour le marquer d'un tag :
`git tag v1.0 274762f && git push origin v1.0`.
