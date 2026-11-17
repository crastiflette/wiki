# Cisco Cheat Sheet

Aide-mémoire des commandes Cisco IOS, en français, pour réviser le **CCNA** et le **CCNP ENCOR**.
Le site contient des fiches de configuration pas à pas, une référence des commandes filtrable et
un QCM d'entraînement.

C'est un site statique : du HTML, du CSS et du JavaScript, sans dépendance ni étape de compilation.

## Ce que contient le site

| Vue | Adresse | Contenu |
| --- | --- | --- |
| **Guide** | `#guide/<fiche>` | 35 fiches pas à pas. Chacune a ses étapes (obligatoire, recommandée ou facultative), ses commandes de vérification, ses pièges courants et souvent un schéma de topologie et un exemple de sortie. |
| **Référence** | `#ref` | Toutes les commandes des fiches, avec des filtres par niveau, catégorie et type (config, show, dépannage, debug). |
| **Favoris** | `#fav` | Les commandes marquées d'une étoile, regroupées par fiche. |
| **Entraînement** | `#quiz` | 197 questions : 105 CCNA, 73 CCNP ENCOR et 19 CSNE (Stormshield), avec au moins 5 questions par fiche. Chaque réponse est expliquée. Le site suit ta progression et peut te reproposer tes erreurs. |

Autres fonctions :
- **Variables** : les `<VARIABLES>` d'une fiche (adresse IP, VLAN…) peuvent être remplies. Tes
  valeurs remplacent les variables à l'écran et dans tout ce que tu copies.
- **Thème** clair ou sombre.
- **Mémorisation** dans le navigateur (`localStorage`) : favoris, valeurs des variables, filtres
  et statistiques du QCM. Rien n'est envoyé à un serveur.

## Lancer le site en local

Ouvre `index.html` dans un navigateur.

Tu peux aussi lancer un petit serveur depuis le dossier du projet, puis aller sur
<http://localhost:8000> :

```bash
python3 -m http.server 8000
```

## Structure des fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | La page et le chargement des scripts |
| `styles.css` | Le thème, la mise en page et les composants |
| `data.js` | Les fiches (tableau `D`) : **c'est là que se trouve le contenu** |
| `extras.js` | Les schémas de topologie (`X.topo`) et les exemples de sortie (`X.out`) |
| `quiz.js` | Les questions du QCM (tableau `Q`) |
| `app.js` | La logique : navigation, recherche, guide, référence, favoris, QCM |
| `CHANGELOG.md` | L'historique des versions |

Les scripts doivent être chargés dans cet ordre : `data.js`, `extras.js`, `quiz.js`, puis `app.js`.

## Modifier le contenu

Le format de chaque fichier est décrit dans le commentaire en tête du fichier. Le plus simple pour
ajouter un élément est de copier un bloc existant.

### Ajouter ou modifier une fiche (`data.js`)

Champs principaux :
- `name`, `description` : le titre et le texte d'introduction ;
- `level` : `"CCNA"` ou `"ENCOR"` ;
- `category` : `""`, `"sec"` (sécurité) ou `"svc"` (services) ;
- `prompt` : l'équipement affiché dans le prompt (`R1`, `SW1`…) ;
- `config`, `show`, `troubleshoot`, `debug` : une commande par ligne. Une ligne qui commence par
  `!` est un commentaire ;
- `id` et `requires` : l'identifiant de la fiche (utilisé dans l'adresse `#guide/<id>`) et les
  fiches à configurer avant ;
- `guide.steps` et `guide.pitfalls` : les étapes du guide et les pièges courants.

Écris les variables en majuscules entre chevrons, par exemple `<VLAN_ID>` : elles sont mises en
valeur et peuvent être remplies par l'utilisateur.

### Ajouter un schéma ou un exemple de sortie (`extras.js`)

- `X.topo["<id de fiche>"]` : un schéma en texte, affiché en haut de la fiche.
- `X.out["<commande>"]` : un exemple de sortie (`out`) et ce qu'il faut y lire (`read`). La clé doit
  être écrite **exactement** comme la commande dans un champ `verify` de `data.js`.

### Ajouter une question (`quiz.js`)

- `id` : un identifiant unique (il sert à mémoriser les réussites et les erreurs) ;
- `t` : le thème, soit l'`id` d'une fiche, soit une clé de `QT` ;
- `lv` : la catégorie (`"CCNA"`, `"ENCOR"`, `"CSNE"`…). Une nouvelle valeur crée une nouvelle
  catégorie ;
- `k` : `"sit"` pour une mise en situation, `"th"` pour une question de théorie ;
- `q`, `o`, `a` : l'énoncé, les réponses proposées et la position des bonnes réponses (0 = la
  première) ;
- `why` : l'explication affichée après validation.

## Publier une modification

Le site est servi derrière le cache de Cloudflare. **À chaque modification d'un fichier CSS ou JS,
augmente son numéro `?v=N` dans `index.html`.** Sinon, les visiteurs continuent de recevoir
l'ancienne version en cache.

```html
<script src="data.js?v=10"></script>  <!-- devient ?v=11 après une modification de data.js -->
```

Pense aussi à mettre à jour :
- le numéro de version affiché, dans la constante `VERSION` en haut de `app.js` ;
- le `CHANGELOG.md`.

## Fiabilité du contenu

Une partie du contenu a été rédigée de mémoire, sans test sur un équipement réel. La version 2.2.0
l'a relu et confronté à la documentation Cisco et Stormshield (voir le `CHANGELOG.md`). Les
exemples de sortie restent représentatifs : leur format varie selon la plate-forme et la version
d'IOS. Vérifie toujours une commande sur ton matériel avant de l'utiliser en production.
