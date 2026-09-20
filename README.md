# ADS – Espace de gestion Discord

Site privé avec serveur : données partagées, codes vérifiés côté serveur, webhooks envoyés par le serveur en embeds. Aucune dépendance (Node 18+).

## Mise à jour d'un site déjà en ligne
Sur GitHub : « Add file » > « Upload files », glisse `server.js` et `index.html` (ils remplacent les anciens), « Commit changes ». Railway redéploie tout seul. Les données existantes sont conservées et migrées automatiquement (les codes existants continuent de fonctionner mais ne sont plus stockés en clair).

## Première installation
1. Mets les fichiers à la racine d'un dépôt GitHub (server.js, package.json, index.html, README.md).
2. Service web Railway/Render depuis le dépôt, commande de démarrage `node server.js`.
3. Variables : `ADMIN_CODE` = code du compte « Fondateur », `DATA_DIR` = `/data`, et `SECRET` = une longue phrase secrète au choix (recommandé : elle sert à protéger les codes et à chiffrer les webhooks, et reste hors du disque).
4. Volume (disque persistant) monté sur `/data`, sinon les données sont perdues à chaque redémarrage.
5. Connecte-toi avec `ADMIN_CODE`, puis va dans Réglages.

## Sécurité
- Codes : jamais stockés en clair (empreinte HMAC), affichés une seule fois à la création. Longs et aléatoires par défaut, 8 caractères minimum si choisis à la main. Un nouveau code coupe les sessions du compte.
- Session : cookie HttpOnly + SameSite=Strict + Secure (en HTTPS), 12 h. Protection anti-CSRF (en-tête personnalisé + contrôle de l'origine).
- Anti-force brute : 10 essais ratés par IP et par 10 min, 300 au total, plus une limite générale de requêtes.
- Webhooks : chiffrés sur le disque, masqués dans l'interface, limités à discord.com. Les pings sont contrôlés : un rôle n'est notifié que s'il est dans la liste autorisée (Réglages).
- Médias : réservés aux comptes connectés, type vérifié sur le contenu du fichier (pas sur le nom), tailles limitées.
- En-têtes de sécurité : CSP, X-Frame-Options, HSTS, Referrer-Policy, etc. Journal de sécurité (connexions, échecs) dans la page Logs.

## Rangs et codes
Rangs par défaut (modifiables) : Gestionnaire, Senior, Vétéran, HG, Bras droit, Fondateur. Codes préfixés par rang (SE-..., VE-..., HG-...).
Permissions réglables : tout voir et décider, ajouter des points (à un membre, à un rang entier ou à une sélection), Réglages et comptes.

## Messages Discord
Tout part en embed. Une mention tapée dans un champ (`<@id>` dans le pseudo, par exemple) s'affiche dans l'embed ET notifie la personne (la mention est aussi placée dans le message, seul endroit où Discord notifie).

## Médias
Réglages > Médias : téléverse une image ou une vidéo, copie sa ligne (`image: /media/...`) dans l'accueil ou un tutoriel. Liens https et vidéos YouTube acceptés aussi.

## Ne pas perdre les données
- **Le point essentiel** : un volume (disque persistant) monté sur `/data` + la variable `DATA_DIR=/data`. Sans lui, l'hébergeur efface tout à chaque redémarrage. Si le site ne détecte pas de disque persistant, les comptes ayant accès aux Réglages voient un bandeau d'avertissement (si le disque est bon malgré l'avertissement, ajoute la variable `DATA_PERSISTENT=1`).
- **Variable `SECRET`** : à définir sur l'hébergeur. Sans elle, une sauvegarde ne peut pas être relue sur un nouveau serveur (les codes sont liés au secret).
- **Copies automatiques** : copie de secours à chaque enregistrement (`db.json.bak`), une sauvegarde par jour pendant 14 jours (`data/backups/`) et une copie avant chaque remise à zéro ou restauration.
- **Sauvegarde dans Discord** : renseigne le webhook « Sauvegarde » (salon privé) dans Réglages : une copie part chaque jour, et à la demande.
- **Télécharger / restaurer** : Réglages > Sauvegarde des données. Après une restauration, reconnecte-toi.
- **Code de secours** : `ADMIN_CODE` reste valable comme code de secours du plus haut rang (utile après une restauration avec un autre `SECRET`). Garde-le secret, ou supprime la variable une fois tout en place.

## Remise à zéro hebdomadaire des points
Chaque dimanche à 00h00 (heure de Paris par défaut, donc à la fin du samedi), les points de tous les profils repartent à 0. Le total de la semaine est archivé sur le profil (« Semaines précédentes »), les comptes rendus et les logs sont conservés. Si le serveur est éteint à ce moment-là, la remise à zéro est rattrapée au démarrage. Réglable ou désactivable dans Réglages, avec un bouton « Remettre à zéro maintenant ».

## Sauvegarde manuelle
Les données sont dans `data/db.json` (sur le volume), les médias dans `data/media/`. Copie-les de temps en temps. Sans `SECRET` en variable, la clé est dans `data/secret.key` : garde-la avec la sauvegarde, sinon les webhooks ne pourront pas être relus.
