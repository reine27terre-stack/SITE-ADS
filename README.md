# ADS – Espace de gestion Discord

Site privé avec serveur : codes d'accès vérifiés côté serveur, données partagées entre tous, webhooks Discord envoyés par le serveur.
Aucune dépendance à installer (Node 18 ou plus).

## Lancer en local
    node server.js
Ouvre http://localhost:3000. Le code HG du premier démarrage s'affiche dans la console (ou impose-le avec `ADMIN_CODE=ton-code`).

## Mettre en ligne (Railway, Render, Fly.io, VPS...)
1. Mets ce dossier sur GitHub.
2. Crée un service web depuis le dépôt. Commande de démarrage : `node server.js`.
3. Variables : `ADMIN_CODE` = ton code HG de départ, `DATA_DIR` = `/data`.
4. Ajoute un volume (disque persistant) monté sur `/data`. Sans lui, les données sont perdues à chaque redémarrage.
5. Ouvre l'adresse fournie, connecte-toi avec `ADMIN_CODE`, puis va dans Réglages : webhooks, comptes HG, questions.

## Donner l'accès à ton supérieur
Réglages > Comptes HG : ajoute une ligne `Nom | code` (6 caractères minimum). Il se connecte avec son code et peut tout régler.

## Sécurité
- Le code est vérifié à chaque requête ; 10 essais ratés maximum par IP toutes les 10 minutes.
- Les webhooks ne sont visibles que des HG et doivent commencer par https://discord.com/api/webhooks/.
- Change le code initial dès la première connexion, et utilise le site en HTTPS (fourni par les hébergeurs ci-dessus).
- Les données sont dans `data/db.json` : copie-le de temps en temps.
