# ADS – Espace de gestion Discord

Site privé avec serveur : codes d'accès vérifiés côté serveur, données partagées, webhooks envoyés par le serveur. Aucune dépendance (Node 18+).

## Mise à jour d'un site déjà en ligne
Sur GitHub : « Add file » > « Upload files », glisse `server.js` et `index.html` (ils remplacent les anciens), « Commit changes ». Railway redéploie tout seul. Les données existantes sont conservées.

## Première installation
1. Mets les fichiers à la racine d'un dépôt GitHub (server.js, package.json, index.html, README.md).
2. Service web Railway/Render depuis le dépôt, commande de démarrage `node server.js`.
3. Variables : `ADMIN_CODE` = code du compte « Fondateur », `DATA_DIR` = `/data`.
4. Volume (disque persistant) monté sur `/data`, sinon les données sont perdues à chaque redémarrage.
5. Connecte-toi avec `ADMIN_CODE`, puis va dans Réglages.

## Rangs et codes
Rangs par défaut (du plus bas au plus haut, modifiables) : Gestionnaire, Senior, Vétéran, HG, Bras droit, Fondateur.
Chaque compte a un code lié à son rang (SE-..., VE-..., HG-...), ou un code choisi (6 caractères minimum).
Permissions réglables : tout voir et décider (HG), ajouter des points (Bras droit), Réglages et comptes (Bras droit).

## Réglages (sans toucher au code)
6 webhooks (entretiens, acceptés, refusés, en attente, formations, comptes rendus), ping du compte rendu, rangs, questions d'entretien, barème de points du compte rendu, quiz, tutoriels.

## Sécurité
Code vérifié à chaque requête, 10 essais ratés max par IP toutes les 10 minutes. Webhooks visibles des seuls comptes ayant accès aux Réglages, limités à discord.com. Sauvegarde : `data/db.json`.
