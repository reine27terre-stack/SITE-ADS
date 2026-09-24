// ADS – serveur de gestion Discord. Node 18+, aucune dépendance.
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000,DIR=process.env.DATA_DIR||path.join(__dirname,'data'),FILE=path.join(DIR,'db.json');
const rnd=n=>crypto.randomBytes(n).toString('hex'),T=(x,n=300)=>String(x??'').trim().slice(0,n),N=(x,m=1e9)=>{x=Number(x);return isFinite(x)?Math.max(-m,Math.min(m,x)):0},r2=x=>Math.round(x*100)/100;
const slug=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'quiz';
const today=()=>new Date().toISOString().slice(0,10),isD=s=>/^\d{4}-\d\d-\d\d$/.test(s||'');
const fd=s=>{const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(s||'');return m?m[3]+'/'+m[2]+'/'+m[1]:(s||'')},men=id=>/^\d{5,25}$/.test(id)?'<@'+id+'>':'',who=(n,id)=>(/<@[!&]?\d+>/.test(n)?n:men(id)||n)+(id?' / '+id:'');
const CSP="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' https: data:; media-src 'self' https:; frame-src https://www.youtube-nocookie.com; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

// ---------- Valeurs par défaut (tout est modifiable ensuite dans Réglages) ----------
const DR=["Gestionnaire","Senior","Vétéran","HG","Bras droit","Fondateur"];
const DRQ=["## Questions générales :","Demander au candidat de se présenter rapidement (âge, motivations, loisirs)","Qu’est-ce que la gestion ADS selon toi ?","Quelles qualités te semblent indispensables pour occuper le poste de gestion ADS ?","Qu’est-ce que tu pourrais apporter de plus qu’un autre candidat ?","As-tu de l’expérience sur les réseaux sociaux (poste-t-il des TikTok, vidéos YouTube ou a-t-il de l’expérience en montage vidéo) ?","As-tu de l’expérience sur discord (Gestion, Staff..) ?","As-tu des conflits avec des owners ou des hauts staffs sur Shibuya ?","Combien de temps penses-tu rester en gestion ADS ?","As-tu déjà effectué de la modération ?","As-tu de l’expérience en tant que grabbeur ?","As-tu de l’expérience en tant que jaileur ?","## Questions de mise en situation","Tu dois poster un TikTok aujourd’hui mais tu manques d’idées. Que fais-tu ?","Tu rencontres un membre qui t’insulte en vocal, que fais-tu ?","Si tu es pris(e), quels sont tes objectifs au sein de la Gestion ADS ?","Es-tu en possession d’un ordinateur ?","Un membre effectue une action étant un motif de ban, que fais-tu ?","Tu as un conflit avec un haut staff ou un autre gestion, que fais-tu ?"];
// Barème officiel ADS : points par unité (1000 vues = 10 points, soit 0,01 par vue).
const DST=[{s:'main',e:'<:emoji_113:1518005433590354072>',l:'Nombre de vidéos tiktok réalisées',p:5},{s:'main',e:'<:emoji_114:1518005438694559785>',l:'Nombre de tweet réalisées',p:5},{s:'main',e:'👀',l:'Nombre de vues totales réalisées',p:0.01},{s:'main',e:'📝',l:'Nombre de commentaires réalisées',p:3},{s:'main',e:'<:blurpleshield:1400686608268922880>',l:'Nombre de jail réalisés',p:6},{s:'main',e:'<:blurpleshield:1400686608268922880>',l:'Nombre de jail top 5 réalisés',p:10},{s:'main',e:'📈',l:'Nombre stat-modération réalisés',p:3},{s:'main',e:'👥',l:'Nombre de rank / dérank / staff réalisés',p:3},{s:'main',e:'💷',l:'Nombre de contributeurs trouvés',p:15},{s:'main',e:'💷',l:'Nombre de pub contri réalisées',p:5},{s:'sec',e:'👀',l:'Nombre de grab bataillon réalisés',p:5},{s:'sec',e:'👀',l:'Nombre de grab RC réalisés',p:10},{s:'sec',e:'📶',l:'Nombre d’entretiens réalisés',p:5,rec:1},{s:'sec',e:'📝',l:'Nombre de formations réalisées',p:10,rec:1}];
const BQ={id:'bareme-des-points',t:'Barème des points',q:[["Combien de points rapportent 1000 vues ?",["5 points","10 points","15 points"],1],["Combien de points rapporte un grab RC ?",["5 points","10 points","15 points"],1],["Combien de points rapporte une contri ?",["10 points","15 points","20 points"],1],["Combien de points rapporte une formation ?",["5 points","10 points","15 points"],1],["Où les stats doivent-elles être prouvées ?",["Dans le serveur « Stats ADS » et les channels prévus","Nulle part","En message privé"],0]]};
const DQZ=[
{id:'bases-de-la-gestion-ads',t:'Bases de la gestion ADS',q:[["Où doit-on déposer son compte rendu ?",["Dans son salon personnalisé","En message privé à un HG","Dans le salon général"],0],["Quand le compte rendu doit-il être remis ?",["Chaque samedi avant 22h00","Chaque dimanche","Quand on a le temps"],0],["Que risque-t-on si le compte rendu n’est pas remis à temps ?",["Rien","Une sanction","Un bonus"],1],["En cas de doute sur une situation, que faire ?",["Improviser","Demander à un supérieur","Attendre"],1]]},
{id:'comptes-rendus-et-points',t:'Comptes rendus et points',q:[["Comment le total de points d’un compte rendu est-il calculé ?",["À la main par le gestionnaire","Automatiquement à partir des stats et des missions","Par tirage au sort"],1],["Que doit écrire le gestionnaire pour chaque activité ?",["Un long texte","Uniquement le nombre réalisé","Rien"],1],["Qui peut ajouter des points sur un profil ?",["N’importe qui","Un membre autorisé (à partir du rang bras droit)","Le gestionnaire lui-même"],1],["Où voit-on qui a ajouté des points ?",["Dans la page Logs","Nulle part","Sur Discord uniquement"],0]]},
{id:'moderation',t:'Modération',q:[["Un membre enfreint le règlement pour la première fois. Que faire ?",["Le bannir directement","Avertir puis noter l’avertissement","Ne rien faire"],1],["Que faire d’une preuve de sanction (capture, vidéo) ?",["La supprimer","La conserver","La publier"],1],["Un collègue poste un contenu qui ne respecte pas les règles. Ta réaction ?",["Le signaler à un supérieur","L’ignorer","Le critiquer publiquement"],0],["Comment traiter un conflit entre deux membres ?",["Prendre parti","Rester neutre et prévenir les supérieurs","Supprimer les messages"],1]]},
{id:'reseaux-sociaux',t:'Réseaux sociaux',q:[["Tu dois poster un TikTok mais tu manques d’idées. Que faire ?",["Ne rien poster","Chercher des tendances ou demander de l’aide à l’équipe","Copier la vidéo d’un autre"],1],["Quelle activité est comptée dans les stats du compte rendu ?",["Le nombre de vidéos TikTok réalisées","Le nombre d’heures de sommeil","Le nombre d’amis"],0],["Que doit-on indiquer en bas du compte rendu ?",["Son TikTok et son Twitter","Son adresse","Rien"],0]]},
{id:'recrutement-et-entretiens',t:'Recrutement et entretiens',q:[["Qui décide d’accepter ou de refuser une candidature ?",["Le candidat","Un HG","Tout le monde"],1],["Que se passe-t-il après une candidature acceptée ?",["Le membre passe en attente de formation","Il devient HG","Rien"],0],["À la fin de la formation, que faut-il faire ?",["Envoyer le rapport de formation","Rien","Supprimer le candidat"],0],["Que remplit-on sous chaque question d’entretien ?",["La réponse du candidat","Son mot de passe","Rien"],0]]},BQ];
const DTU=[
{t:'Recrutement',b:"1. Ouvre la page Recrutement.\n2. Remplis le pseudo et l’ID du candidat, la date, qui a fait l’entretien et qui supervise.\n3. Écris la réponse du candidat sous chaque question.\n4. Clique sur « Enregistrer et envoyer le rapport d’entretien » : le rapport part dans Discord.\n5. Un HG accepte, refuse ou met la candidature en attente : chaque décision part dans son salon.\n6. Si le candidat est accepté, il reste « en attente de formation » jusqu’au bouton « Formation terminée », qui envoie le rapport de formation."},
{t:'Comptes rendus',b:"1. Ouvre la page Comptes rendus.\n2. Pour chaque activité, écris seulement le nombre réalisé.\n3. Le total de points se calcule tout seul : stats, autres activités et missions données.\n4. Remplis le point de vue et ton TikTok/Twitter, puis envoie.\n5. À rendre chaque samedi avant 22h00.\n6. Justificatifs obligatoires : toutes les stats doivent être prouvées et documentées dans le serveur « Stats ADS » et dans les channels prévus."},
{t:'Profils',b:"Chaque profil affiche les points, l’historique et les quiz. Les membres autorisés (à partir du rang bras droit) peuvent ajouter ou retirer des points avec un motif. Tout est enregistré dans les Logs."},
{t:'Quiz',b:"1. Ouvre la page Quiz et choisis un quiz.\n2. Réponds à toutes les questions, puis clique sur « Corriger ».\n3. Ton dernier score est gardé sur ton profil. Les quiz servent aussi de rappel de formation."}];

// ---------- Sécurité : secret, codes hachés, sessions, chiffrement des webhooks ----------
const SF=path.join(DIR,'secret.key');let SEC=process.env.SECRET;
if(!SEC){fs.mkdirSync(DIR,{recursive:true});try{SEC=fs.readFileSync(SF,'utf8').trim()}catch{SEC=rnd(32);fs.writeFileSync(SF,SEC,{mode:0o600})}}
const K=crypto.createHash('sha256').update(SEC).digest(),hm=c=>crypto.createHmac('sha256',K).update(String(c)).digest('hex'),shash=t=>crypto.createHash('sha256').update(t).digest('hex');
const eq=(a,b)=>{a=Buffer.from(String(a));b=Buffer.from(String(b));return a.length==b.length&&crypto.timingSafeEqual(a,b)};
const enc=t=>{if(!t)return'';const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',K,iv),d=Buffer.concat([c.update(t,'utf8'),c.final()]);return'e1:'+Buffer.concat([iv,c.getAuthTag(),d]).toString('base64')};
const dec=t=>{if(!t||!t.startsWith('e1:'))return t||'';try{const b=Buffer.from(t.slice(3),'base64'),c=crypto.createDecipheriv('aes-256-gcm',K,b.subarray(0,12));c.setAuthTag(b.subarray(12,28));return Buffer.concat([c.update(b.subarray(28)),c.final()]).toString('utf8')}catch{return''}};
const SESS=12*36e5,MDIR=path.join(DIR,'media'),MASK='https://discord.com/api/webhooks/…',mask=u=>u?MASK+u.slice(-6):'';
const RL={},rl=(k,max,ms)=>{const n=Date.now();if(Object.keys(RL).length>5000)for(const x in RL)if(RL[x].t<n)delete RL[x];const y=RL[k]&&RL[k].t>n?RL[k]:(RL[k]={n:0,t:n+ms});return ++y.n>max};
const SH={'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()'};

// ---------- Base de données ----------
const DHOME="## Bienvenue sur l’espace de gestion\nUtilise le menu pour faire tes entretiens, envoyer ton compte rendu, passer les quiz et suivre tes points.\nLes HG peuvent modifier ce texte, et y ajouter images et vidéos, dans Réglages.";
let db,bad={};
const BK=path.join(DIR,'backups');let persist=true;try{persist=fs.statSync(DIR).dev!==fs.statSync('/').dev}catch{}persist=persist||process.env.DATA_PERSISTENT=='1';
const ser=bk=>{const o=JSON.parse(JSON.stringify(db));for(const k in o.cfg.hooks)o.cfg.hooks[k]=enc(o.cfg.hooks[k]);if(bk)o.sess={};return JSON.stringify(o)};
const save=()=>{fs.writeFileSync(FILE+'.tmp',ser(),{mode:0o600});if(fs.existsSync(FILE))fs.copyFileSync(FILE,FILE+'.bak');fs.renameSync(FILE+'.tmp',FILE);dayBak()};
function dayBak(){try{fs.mkdirSync(BK,{recursive:true});const f=path.join(BK,'db-'+today()+'.json');if(!fs.existsSync(f)){fs.writeFileSync(f,ser(1),{mode:0o600});for(const x of fs.readdirSync(BK).filter(x=>/^db-/.test(x)).sort().slice(0,-14))fs.unlinkSync(path.join(BK,x))}}catch{}}
// Début de semaine (dimanche 00h00) dans le fuseau tz : date locale du dimanche courant
function wk(tz,t=new Date()){const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'}).formatToParts(t).map(x=>[x.type,x.value]));
  return new Date(Date.UTC(+p.year,+p.month-1,+p.day)-['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday)*864e5).toISOString().slice(0,10)}
function norm(d){const c=d.cfg=d.cfg||{};
  c.name=c.name||'ADS';c.ranks=c.ranks||DR.slice();c.perm=Object.assign({hg:'HG',dec:c.ranks[1]||c.ranks[0],pts:'Bras droit',set:'Bras droit'},c.perm);
  c.hooks=Object.assign({rc:'',acc:'',ref:'',att:'',forma:'',cr:'',bak:''},c.hooks);
  if(c.hooks.dec){for(const k of['acc','ref','att'])c.hooks[k]=c.hooks[k]||c.hooks.dec;delete c.hooks.dec}
  for(const k in c.hooks)c.hooks[k]=dec(c.hooks[k]);
  c.crPing=c.crPing??'<@&1538282326377893889>';c.quizzes=c.quizzes||DQZ;c.tutos=c.tutos||DTU;
  if((c.ver||0)<2){c.rq=DRQ;c.stats=DST;if(!c.quizzes.some(z=>z.id==BQ.id))c.quizzes.push(BQ);c.ver=2}
  c.rq=c.rq||DRQ;c.stats=c.stats||DST;c.home=c.home??DHOME;c.pingRoles=c.pingRoles||['1538282326377893889'];c.reset=Object.assign({on:true,tz:'Europe/Paris'},c.reset);d.lastReset=d.lastReset||wk(c.reset.tz);
  d.users=d.users||[];for(const h of c.hg||[])d.users.push({id:h.id,name:h.name,code:h.code,rank:c.ranks[c.ranks.length-1],rec:true});
  delete c.hg;delete c.qs;delete c.quiz;delete c.admin;
  for(const u of d.users){if(u.code){u.ck=hm(u.code);delete u.code}u.rank=u.rank||c.ranks[0];u.pts=(u.pts||[]).map(p=>({t:'mission',by:'-',...p}));u.qz=(u.qz&&typeof u.qz=='object')?u.qz:{};u.did=u.did||'';u.weeks=u.weeks||[]}
  d.rcs=(d.rcs||[]).map(r=>({cand:r.pseudo,...r}));d.crs=d.crs||[];d.logs=d.logs||[];d.sess=d.sess||{};d.media=d.media||[];return d}
fs.mkdirSync(MDIR,{recursive:true});
const readDb=f=>norm(JSON.parse(fs.readFileSync(f,'utf8')));
const latestBackup=()=>{try{const fs2=fs.readdirSync(BK).filter(x=>/^db-\d{4}-\d\d-\d\d\.json$/.test(x)).sort();return fs2.length?path.join(BK,fs2[fs2.length-1]):null}catch{return null}};
if(fs.existsSync(FILE)){
  try{db=readDb(FILE)}catch(e){console.error('db.json illisible, retour à la copie de secours :',e.message);fs.renameSync(FILE,FILE+'.corrompu');db=readDb(FILE+'.bak')}
  save()
}else{
  // db.json est absent. Un vrai premier démarrage ne l'a jamais eu ; un site déjà utilisé qui perd son disque se retrouve dans le même état.
  // On ne recrée donc PAS un site vide en silence : on restaure la dernière sauvegarde automatique trouvée sur ce disque, s'il y en a une.
  const bk=latestBackup();
  if(bk){console.error('AVERTISSEMENT : db.json introuvable au démarrage. Restauration automatique depuis '+bk+'. Le disque persistant (Volume Railway sur /data) doit être vérifié.');
    db=readDb(bk);db.autoRestored=path.basename(bk);save()}
  else if(process.env.EXPECT_DATA=='1'){
    console.error('ERREUR : db.json introuvable et EXPECT_DATA=1 (ce site est censé déjà avoir des données). Démarrage refusé pour éviter d’écraser silencieusement un ancien site. Vérifie le Volume Railway monté sur /data, puis redémarre. Si c’est vraiment un nouveau site, retire la variable EXPECT_DATA.');
    process.exit(1)
  }else{
    const c=process.env.ADMIN_CODE||'FO-'+rnd(6).toUpperCase();
    db=norm({cfg:{},users:[{id:'u0',name:'Fondateur',code:c,rank:DR[DR.length-1],rec:true}]});save();console.log('Premier démarrage. Code fondateur :',c)
  }
}

const lvl=r=>db.cfg.ranks.indexOf(r),perm=u=>{const l=lvl(u.rank),c=db.cfg.perm;return{hg:l>=lvl(c.hg),dec:l>=lvl(c.dec),pts:l>=lvl(c.pts),set:l>=lvl(c.set)}};
const mk=u=>({id:u.id,name:u.name,rank:u.rank,rec:!!u.rec,did:u.did,p:perm(u)});
const gen=r=>{let c;do c=String(r||'GE').normalize('NFD').replace(/[^A-Za-z]/g,'').slice(0,2).toUpperCase()+'-'+rnd(6).toUpperCase();while(db.users.some(u=>eq(u.ck,hm(c))));return c};
const LOG=(t,by,x)=>{db.logs.unshift({id:rnd(4),d:Date.now(),t,by,x:T(x,400)});db.logs.length=Math.min(db.logs.length,1000)};
const revoke=id=>{for(const k in db.sess)if(db.sess[k].uid==id)delete db.sess[k]};

// ---------- Discord : embeds, avec pings dans le message ----------
const okHook=u=>/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(u);
const V=x=>T(x,1024)||'-',E=o=>({color:0x3aa0d8,footer:{text:db.cfg.name},timestamp:new Date().toISOString(),...o});
const pack=(base,fl)=>{const o=[];let c={...base,fields:[]},n=(base.title||'').length+(base.description||'').length;
  for(const f of fl){const l=f.name.length+f.value.length;if(c.fields.length>=25||n+l>5500){o.push(c);c={...base,title:(base.title||'')+' (suite)',description:undefined,fields:[]};n=c.title.length}c.fields.push(f);n+=l}o.push(c);return o};
const mIds=t=>[...String(t).matchAll(/<@!?(\d{5,25})>/g)].map(m=>m[1]),rIds=t=>[...String(t).matchAll(/<@&(\d{5,25})>/g)].map(m=>m[1]),uq=a=>[...new Set(a)];
// Un embed ne notifie personne : les mentions tapées sur le site sont donc aussi placées dans le message, avec une liste précise de personnes autorisées à être notifiées.
// Les rôles tapés à la main ne sont notifiés que s'ils figurent dans la liste autorisée (Réglages).
async function say(k,embeds,typed=''){const u=db.cfg.hooks[k];if(!u||!okHook(u))return;
  const src=k=='cr'?db.cfg.crPing:'',ok=new Set([...db.cfg.pingRoles,...rIds(src)]),us=uq([...mIds(src),...mIds(typed)]).slice(0,10),rs=uq([...rIds(src),...rIds(typed).filter(x=>ok.has(x))]).slice(0,5);
  const content=[...us.map(x=>'<@'+x+'>'),...rs.map(x=>'<@&'+x+'>')].join(' ');
  for(let i=0;i<embeds.length;i++){try{await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:i?'':content,embeds:[embeds[i]],allowed_mentions:i?{parse:[]}:{users:us,roles:rs}})})}catch{}}}
const qEmbeds=n=>{let i=0;const fl=[];for(const x of n.a)fl.push(x[0]=='##'?{name:'━━ '+x[1]+' ━━',value:'\u200b'}:{name:('Question '+(++i)+' : '+x[0]).slice(0,256),value:V(x[1])});
  return pack(E({title:'📋 Rapport d’entretien',description:'**Candidat :** '+who(n.cand,n.did)+'\n**Date :** '+fd(n.date)+'\n**Réalisé par :** '+n.by+'\n**Supervisé par :** '+(n.sup||'-')}),fl)};

// ---------- Médias ----------
const MT={png:'image/png',jpg:'image/jpeg',gif:'image/gif',webp:'image/webp',mp4:'video/mp4',webm:'video/webm'};
function sniff(b){const s=(a,z)=>b.subarray(a,z).toString('latin1');
  if(b[0]==0x89&&s(1,4)=='PNG')return'png';if(b[0]==0xff&&b[1]==0xd8&&b[2]==0xff)return'jpg';if(s(0,4)=='GIF8')return'gif';
  if(s(0,4)=='RIFF'&&s(8,12)=='WEBP')return'webp';if(s(4,8)=='ftyp')return'mp4';if(b[0]==0x1a&&b[1]==0x45&&b[2]==0xdf&&b[3]==0xa3)return'webm';return null}

const warns=()=>{const w=[];if(db.autoRestored)w.push('Le fichier de données a été retrouvé manquant au démarrage : les données ont été restaurées depuis la sauvegarde du '+db.autoRestored.replace('db-','').replace('.json','')+'. Si ça se reproduit, le disque persistant (Volume Railway sur /data) n’est probablement pas correctement configuré.');if(!persist)w.push('Aucun disque persistant détecté : les données risquent d’être effacées à chaque redémarrage. Vérifie que le volume Railway est monté sur /data et que la variable DATA_DIR vaut /data.');if(!process.env.SECRET)w.push('La variable SECRET n’est pas définie sur l’hébergeur : une sauvegarde ne pourra pas être relue sur un nouveau serveur.');return w};
async function sendBackup(){const u=db.cfg.hooks.bak;if(!u||!okHook(u))return false;
  try{const form=new FormData();form.append('payload_json',JSON.stringify({content:'💾 Sauvegarde ADS du '+fd(today()),allowed_mentions:{parse:[]}}));
    form.append('files[0]',new Blob([ser(1)],{type:'application/json'}),'ads-sauvegarde-'+today()+'.json');return(await fetch(u,{method:'POST',body:form})).ok}catch{return false}}
function resetPoints(key,by){try{fs.mkdirSync(BK,{recursive:true});fs.writeFileSync(path.join(BK,'avant-reset-'+key+'-'+Date.now()+'.json'),ser(1),{mode:0o600})}catch{}
  for(const u of db.users){u.weeks=[{d:key,t:r2(u.pts.reduce((s,p)=>s+p.v,0))},...(u.weeks||[])].slice(0,26);u.pts=[]}
  db.lastReset=key;LOG('pts',by,'Points remis à zéro pour '+db.users.length+' profils');save()}
async function tick(){try{const c=db.cfg.reset;if(c.on){const k=wk(c.tz);if(k!==db.lastReset)resetPoints(k,'Système')}
  if(db.cfg.hooks.bak&&db.lastBak!==today()){db.lastBak=today();save();sendBackup()}}catch(e){console.error(e)}}
async function handle(req,res){
  const now=Date.now(),p=new URL(req.url,'http://x').pathname,ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',')[0].trim();
  const secure=req.headers['x-forwarded-proto']=='https'||!!req.socket.encrypted;let setC=null;
  const hd=(h={})=>({...SH,...(secure?{'Strict-Transport-Security':'max-age=31536000; includeSubDomains'}:{}),...h}),
    send=(c,o,h={})=>{res.writeHead(c,hd({'Content-Type':'application/json','Cache-Control':'no-store',...(setC?{'Set-Cookie':setC}:{}),...h}));res.end(JSON.stringify(o))};
  if(rl('g'+ip,900,6e4))return send(429,{error:'Trop de requêtes, réessaie dans une minute'});
  // Session : cookie HttpOnly + SameSite=Strict (illisible par le JavaScript de la page)
  const tk=((req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ads_s='))||'').slice(6),ss=tk&&db.sess[shash(tk)];
  let usr=ss&&ss.exp>now?db.users.find(x=>x.id==ss.uid):null;

  if(req.method=='GET'&&p=='/'){
    const pg=['index.html','public/index.html'].map(x=>path.join(__dirname,x)).find(x=>fs.existsSync(x));
    if(!pg){res.writeHead(500,hd({'Content-Type':'text/plain; charset=utf-8'}));return res.end('Le serveur tourne, mais le fichier index.html est introuvable. Vérifie qu’il est bien dans le dépôt GitHub, à côté de server.js.')}
    res.writeHead(200,hd({'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':CSP}));return res.end(fs.readFileSync(pg))}
  let m;
  if(req.method=='GET'&&(m=p.match(/^\/media\/([0-9a-f]{16})\.(png|jpg|gif|webp|mp4|webm)$/))){ // médias : réservés aux comptes connectés
    if(!usr){res.writeHead(401,hd());return res.end()}
    const f=path.join(MDIR,m[1]+'.'+m[2]);if(!fs.existsSync(f)){res.writeHead(404,hd());return res.end()}
    const st=fs.statSync(f),h=hd({'Content-Type':MT[m[2]],'Cache-Control':'private, max-age=3600','Content-Security-Policy':'sandbox','Accept-Ranges':'bytes'}),rg=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range||'');
    if(rg){const a=rg[1]?+rg[1]:0,z=rg[2]?+rg[2]:st.size-1;if(a>z||z>=st.size){res.writeHead(416,{'Content-Range':'bytes */'+st.size});return res.end()}
      res.writeHead(206,{...h,'Content-Range':'bytes '+a+'-'+z+'/'+st.size,'Content-Length':z-a+1});return fs.createReadStream(f,{start:a,end:z}).pipe(res)}
    res.writeHead(200,{...h,'Content-Length':st.size});return fs.createReadStream(f).pipe(res)}
  if(!p.startsWith('/api/')){res.writeHead(404,hd());return res.end()}

  let b={};try{const ch=[];let n=0;const lim=(p=='/api/media'||p=='/api/restore')?22e6:1e6;for await(const c of req){n+=c.length;if(n>lim)throw 0;ch.push(c)}if(ch.length)b=JSON.parse(Buffer.concat(ch))}catch{return send(400,{error:'Requête invalide'})}
  if(req.method!='GET'){ // anti-CSRF : en-tête personnalisé obligatoire + origine identique
    let xo=false;try{const o=req.headers.origin;xo=!!o&&new URL(o).host!==req.headers.host}catch{xo=true}
    if(!req.headers['x-ads']||xo)return send(403,{error:'Requête refusée'})}
  let r=req.method+' '+p;

  if(r=='POST /api/login'){ // 10 essais ratés max par IP / 10 min, 300 au total : les codes sont longs et aléatoires
    const f=bad[ip];if((f&&f.t>now&&f.n>=10)||rl('L',300,6e5))return send(429,{error:'Trop d’essais, réessaie dans 10 minutes'});
    const c=T(b.code,100),k=hm(c),hu=c&&db.users.find(x=>eq(x.ck,k)),rc0=!hu&&c&&process.env.ADMIN_CODE&&eq(c,process.env.ADMIN_CODE)?db.users.filter(x=>perm(x).set).sort((a,z)=>lvl(z.rank)-lvl(a.rank))[0]:null,u=hu||rc0;
    if(!u){bad[ip]=f&&f.t>now?{n:f.n+1,t:f.t}:{n:1,t:now+6e5};if(bad[ip].n<=3){LOG('sec','?','Connexion refusée');save()}await new Promise(z=>setTimeout(z,500));return send(401,{error:'Code inconnu'})}
    delete bad[ip];const t=rnd(32);db.sess[shash(t)]={uid:u.id,exp:now+SESS};for(const x in db.sess)if(db.sess[x].exp<now)delete db.sess[x];
    LOG('sec',u.name,'Connexion'+(rc0?' (code de secours)':''));save();setC='ads_s='+t+'; HttpOnly; SameSite=Strict; Path=/; Max-Age='+SESS/1000+(secure?'; Secure':'');usr=u;r='GET /api/state'}
  if(r=='POST /api/logout'){if(tk){delete db.sess[shash(tk)];save()}setC='ads_s=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0';return send(200,{ok:1})}
  if(!usr)return send(401,{error:'Connexion requise'});
  if(ss&&!setC&&ss.exp-now<SESS/2)ss.exp=now+SESS;

  const me=mk(usr),P=me.p,need=k=>P[k]||(send(403,{error:'Accès refusé'}),false);
  const cur=()=>db.users.find(u=>u.id==me.id)||usr;
  const view=()=>{const c=db.cfg,P2=perm(cur());
    const pub={name:c.name,ranks:c.ranks,perm:c.perm,stats:c.stats,rq:c.rq,tutos:c.tutos,home:c.home,reset:c.reset,quizzes:c.quizzes.map(z=>({id:z.id,t:z.t,q:z.q.map(y=>[y[0],y[1]])}))};
    const nc=u=>{const{ck,...x}=u;return x};
    return{cfg:P2.set?{...c,hooks:Object.fromEntries(Object.entries(c.hooks).map(([k,v])=>[k,mask(v)]))}:pub,users:P2.hg?db.users.map(nc):db.users.filter(u=>u.id==me.id).map(nc),
      rcs:(P2.hg||P2.dec)?db.rcs:db.rcs.filter(x=>x.uid==me.id),crs:P2.hg?db.crs:db.crs.filter(x=>x.uid==me.id),logs:P2.hg?db.logs.slice(0,300):[],media:P2.set?db.media.slice(0,60):[],warn:P2.set?warns():[]}};
  const out=(x={})=>send(200,{me:mk(cur()),S:view(),...x});
  const mgr=x=>lvl(x.rank)<=lvl(me.rank);

  if(r=='GET /api/state')return out();

  // --- Entretiens ---
  if(r=='POST /api/rc'){
    if(!(me.rec||P.hg))return send(403,{error:'Réservé aux recruteurs et aux HG'});
    const a=(Array.isArray(b.a)?b.a:[]).slice(0,40).map(y=>y[0]=='##'?['##',T(y[1],100)]:[T(y[0],300),T(y[1],900)]),
      n={id:rnd(5),uid:me.id,cand:T(b.cand,60),did:T(b.did,25),date:isD(b.date)?b.date:today(),by:T(b.by,60)||me.name,sup:T(b.sup,60),a,v:'attente',tr:0,d:Date.now()};
    if(!n.cand)return send(400,{error:'Le pseudo du candidat est obligatoire'});
    db.rcs.unshift(n);LOG('ent',me.name,'Entretien de '+n.cand);save();say('rc',qEmbeds(n),[n.cand,n.by,n.sup,...a.map(y=>y[1])].join(' '));return out()}
  if(m=r.match(/^POST \/api\/rc\/(\w+)\/verdict$/)){
    if(!(P.hg||P.dec))return send(403,{error:'Accès refusé'});const n=db.rcs.find(x=>x.id==m[1]);if(!n)return send(404,{error:'Introuvable'});
    const D={ok:['acc','✅','acceptée',0x2fbf71],no:['ref','❌','refusée',0xd64545],attente:['att','⏳','mise en attente',0xe0a12b]}[b.v];if(!D)return send(400,{error:'Décision invalide'});
    n.v=b.v;LOG('dec',me.name,'Candidature '+D[2]+' : '+n.cand);save();
    say(D[0],[E({title:D[1]+' Candidature '+D[2],color:D[3],description:'**Candidat :** '+who(n.cand,n.did),fields:[{name:'Décision de',value:V(me.name),inline:true},{name:'Date',value:fd(today()),inline:true},...(b.v=='ok'?[{name:'Prochaine étape',value:'Formation'}]:[])]})],n.cand);return out()}
  if(m=r.match(/^POST \/api\/rc\/(\w+)\/trained$/)){
    if(!(me.rec||P.hg))return send(403,{error:'Accès refusé'});const n=db.rcs.find(x=>x.id==m[1]);if(!n)return send(404,{error:'Introuvable'});
    if(n.v!='ok')return send(400,{error:'Ce candidat n’est pas accepté'});
    n.tr=1;n.trBy=me.name;n.trD=Date.now();n.trNote=T(b.note,800);LOG('forma',me.name,'Formation terminée : '+n.cand);save();
    say('forma',[E({title:'🎓 Rapport de formation',color:0x4fd6a0,description:'**Candidat :** '+who(n.cand,n.did),fields:[{name:'Formé par',value:V(me.name),inline:true},{name:'Date',value:fd(today()),inline:true},{name:'Remarques',value:V(n.trNote)}]})],n.cand+' '+n.trNote);return out()}
  if(m=r.match(/^DELETE \/api\/rc\/(\w+)$/)){if(!need('hg'))return;db.rcs=db.rcs.filter(x=>x.id!=m[1]);save();return out()}

  // --- Comptes rendus : points calculés côté serveur ---
  if(r=='POST /api/cr'){
    const st=db.cfg.stats,vals=st.map((s,i)=>s.rec&&!me.rec?null:Math.max(0,N((b.vals||[])[i]))),x=cur(),id=rnd(5),date=isD(b.date)?b.date:today(),
      pts=r2(st.reduce((t,s,i)=>t+(vals[i]||0)*s.p,0)),op=N(b.op,1e6),mis=r2(x.pts.filter(q=>q.t=='mission'&&!q.rep).reduce((t,q)=>t+q.v,0)),total=r2(pts+op+mis),
      L=l=>st.map((s,i)=>s.s==l&&vals[i]!==null?(s.e?s.e+' ':'')+'• '+s.l+' : '+vals[i]:null).filter(Boolean),
      f={pseudo:T(b.pseudo,60)||me.name,did:T(b.did,25),ot:T(b.ot,300),prob:T(b.prob,600),amel:T(b.amel,600),ping:T(b.ping,200),shib:T(b.shib,400),tt:T(b.tt,300)};
    const emb=E({title:'📊 Compte rendu',description:'👤 • **Pseudo & Identifiant :** '+who(f.pseudo,f.did)+'\n📅 • **Date du compte rendu :** '+fd(date),fields:[
      {name:'Activité principale',value:V([...L('main'),'📜 • Autres activités effectuées : '+(f.ot||'-')+' ('+op+' pts)'].join('\n'))},
      {name:'Activité secondaire',value:V(L('sec').join('\n'))},
      {name:'Total de points',value:'**'+total+'** (stats : '+pts+', autres : '+op+', missions : '+mis+')'},
      {name:'🔗 Problèmes rencontrés sur le serveur',value:V(f.prob)},{name:'💡 Améliorations suggérées',value:V(f.amel)},{name:'🎓 Ping supérieurs hiérarchiques',value:V(f.ping)},
      {name:'📊 Activité Shibuya (optionnel)',value:V(f.shib)},{name:'Votre TikTok & Twitter',value:V(f.tt)}]});
    const txt=[emb.description,...emb.fields.map(y=>'\n'+y.name+'\n'+y.value)].join('\n');
    const add=r2(pts+op);if(add)x.pts.push({v:add,w:'Compte rendu du '+fd(date),t:'cr',by:'système',d:Date.now()});
    x.pts.forEach(q=>{if(q.t=='mission'&&!q.rep)q.rep=id});
    db.crs.unshift({id,uid:me.id,by:me.name,date,total,txt,d:Date.now()});db.crs.length=Math.min(db.crs.length,500);
    LOG('cr',me.name,'Compte rendu du '+fd(date)+' : '+total+' pts');save();say('cr',[emb],[f.pseudo,f.ping,f.ot,f.prob,f.amel,f.shib,f.tt].join(' '));return out({total})}

  // --- Comptes, rangs, points ---
  if(r=='POST /api/users'){
    if(!need('set'))return;const name=T(b.n,60),rank=b.rank||db.cfg.ranks[0];if(!name)return send(400,{error:'Nom obligatoire'});
    if(lvl(rank)<0||lvl(rank)>lvl(me.rank))return send(400,{error:'Rang invalide ou supérieur au tien'});
    const c=T(b.code,80);if(c&&(c.length<8||db.users.some(u=>eq(u.ck,hm(c)))))return send(400,{error:'Code trop court (8 caractères minimum) ou déjà utilisé'});
    const code=c||gen(rank);db.users.push({id:rnd(4),name,ck:hm(code),rank,did:T(b.did,25),rec:!!b.rec,pts:[],qz:{}});LOG('cpt',me.name,'Compte créé : '+name+' ('+rank+')');save();return out({newCode:{name,code}})}
  if(m=r.match(/^POST \/api\/users\/(\w+)\/(points|code|rank|rec)$/)){
    const x=db.users.find(y=>y.id==m[1]);if(!x)return send(404,{error:'Introuvable'});let ex={};
    if(m[2]=='points'){
      if(!need('pts'))return;const v=N(b.v,1e5),w=T(b.w,200)||'Mission';if(!v)return send(400,{error:'Points invalides'});
      x.pts.push({v,w,t:'mission',by:me.name,d:Date.now()});LOG('pts',me.name,(v>0?'+':'')+v+' pts à '+x.name+' : '+w)}
    else{
      if(!need('set'))return;if(!mgr(x))return send(403,{error:'Ce compte a un rang supérieur au tien'});
      if(m[2]=='code'){const nc=gen(x.rank);x.ck=hm(nc);revoke(x.id);ex={newCode:{name:x.name,code:nc}};LOG('cpt',me.name,'Nouveau code pour '+x.name)}
      else if(m[2]=='rec'){x.rec=!x.rec;LOG('cpt',me.name,x.name+(x.rec?' devient recruteur':' n’est plus recruteur'))}
      else{const rk=b.rank,old=x.rank;if(lvl(rk)<0||lvl(rk)>lvl(me.rank))return send(400,{error:'Rang invalide ou supérieur au tien'});
        x.rank=rk;if(!db.users.some(u=>perm(u).set)){x.rank=old;return send(400,{error:'Il doit rester au moins un compte avec accès aux Réglages'})}
        LOG('cpt',me.name,x.name+' : '+old+' vers '+rk)}}
    save();return out(ex)}
  if(r=='POST /api/points-bulk'){ // points pour tout un rang et/ou une sélection de membres
    if(!need('pts'))return;const v=N(b.v,1e5),w=T(b.w,200)||'Mission';if(!v)return send(400,{error:'Points invalides'});
    const rks=(Array.isArray(b.ranks)?b.ranks:[]).map(x=>T(x,30)),ids=(Array.isArray(b.ids)?b.ids:[]).map(x=>T(x,20)),tg=db.users.filter(u=>rks.includes(u.rank)||ids.includes(u.id)).slice(0,200);
    if(!tg.length)return send(400,{error:'Aucun destinataire sélectionné'});
    for(const u of tg)u.pts.push({v,w,t:'mission',by:me.name,d:Date.now()});
    LOG('pts',me.name,(v>0?'+':'')+v+' pts à '+tg.length+' membre(s) ('+tg.map(u=>u.name).slice(0,8).join(', ')+(tg.length>8?'…':'')+') : '+w);save();return out({n:tg.length})}
  if(m=r.match(/^DELETE \/api\/users\/(\w+)$/)){
    if(!need('set'))return;const x=db.users.find(y=>y.id==m[1]);if(!x)return send(404,{error:'Introuvable'});
    if(x.id==me.id)return send(400,{error:'Tu ne peux pas supprimer ton propre compte'});if(!mgr(x))return send(403,{error:'Ce compte a un rang supérieur au tien'});
    if(!db.users.some(u=>u.id!=x.id&&perm(u).set))return send(400,{error:'Il doit rester au moins un compte avec accès aux Réglages'});
    revoke(x.id);db.users=db.users.filter(u=>u.id!=x.id);LOG('cpt',me.name,'Compte supprimé : '+x.name);save();return out()}

  // --- Quiz (correction côté serveur) ---
  if(r=='POST /api/quiz'){
    const z=db.cfg.quizzes.find(y=>y.id==b.id);if(!z)return send(404,{error:'Quiz introuvable'});
    const sc=z.q.reduce((s,y,i)=>s+(Number((b.a||[])[i])===y[2]?1:0),0);cur().qz[z.id]=sc;
    LOG('quiz',me.name,'Quiz « '+z.t+' » : '+sc+'/'+z.q.length);save();return out({score:sc})}

  // --- Médias (images et vidéos pour l'accueil et les tutoriels) ---
  if(r=='POST /api/media'){
    if(!need('set'))return;
    const buf=Buffer.from(String(b.data||'').replace(/^data:[^,]*,/,''),'base64'),ext=buf.length?sniff(buf):null;
    if(!ext)return send(400,{error:'Format non pris en charge (PNG, JPG, GIF, WEBP, MP4 ou WEBM)'});
    const vid=ext=='mp4'||ext=='webm';if(buf.length>(vid?15e6:6e6))return send(400,{error:vid?'Vidéo trop lourde (15 Mo maximum)':'Image trop lourde (6 Mo maximum)'});
    if(db.media.reduce((s,y)=>s+y.size,0)+buf.length>5e8)return send(400,{error:'Espace média plein'});
    const id=rnd(8);fs.writeFileSync(path.join(MDIR,id+'.'+ext),buf);db.media.unshift({id,ext,name:T(b.name,80),size:buf.length,by:me.name,d:Date.now()});
    LOG('cfg',me.name,'Média ajouté : '+T(b.name,80));save();return out({media:'/media/'+id+'.'+ext})}
  if(m=r.match(/^DELETE \/api\/media\/([0-9a-f]{16})$/)){
    if(!need('set'))return;const x=db.media.find(y=>y.id==m[1]);
    if(x){try{fs.unlinkSync(path.join(MDIR,x.id+'.'+x.ext))}catch{}db.media=db.media.filter(y=>y!=x);save()}return out()}

  // --- Sauvegarde des données ---
  if(r=='GET /api/backup'){if(!need('set'))return;LOG('sec',me.name,'Sauvegarde téléchargée');save();res.writeHead(200,hd({'Content-Type':'application/json','Content-Disposition':'attachment; filename="ads-sauvegarde-'+today()+'.json"','Cache-Control':'no-store'}));return res.end(ser(1))}
  if(r=='POST /api/restore'){
    if(!need('set'))return;let d;try{d=norm(typeof b.data=='string'?JSON.parse(b.data):b.data)}catch{return send(400,{error:'Fichier de sauvegarde illisible'})}
    if(!d.users.some(u=>d.cfg.ranks.indexOf(u.rank)>=d.cfg.ranks.indexOf(d.cfg.perm.set)))return send(400,{error:'Cette sauvegarde ne contient aucun compte avec accès aux Réglages'});
    try{fs.mkdirSync(BK,{recursive:true});fs.writeFileSync(path.join(BK,'avant-restauration-'+Date.now()+'.json'),ser(1),{mode:0o600})}catch{}
    d.media=db.media;d.sess={};d.lastReset=wk(d.cfg.reset.tz);db=d;LOG('cfg',me.name,'Sauvegarde restaurée');save();
    setC='ads_s=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0';return send(200,{ok:1})}
  if(r=='POST /api/backup-now'){if(!need('set'))return;const ok=await sendBackup();return ok?send(200,{ok:1}):send(400,{error:'Envoi impossible : vérifie le webhook « Sauvegarde »'})}
  if(r=='POST /api/reset-now'){if(!need('set'))return;resetPoints(wk(db.cfg.reset.tz),me.name);return out()}

  // --- Réglages ---
  if(r=='PUT /api/config'){
    if(!need('set'))return;
    const rk=[...new Set((Array.isArray(b.ranks)?b.ranks:[]).map(x=>T(x,30)).filter(Boolean))].slice(0,12),pm=b.perm||{};
    if(rk.length<2||!['hg','pts','set'].every(k=>rk.includes(pm[k])))return send(400,{error:'Il faut au moins 2 rangs, et chaque permission doit viser un rang de la liste'});
    const u2=db.users.find(u=>!rk.includes(u.rank));if(u2)return send(400,{error:'Le rang « '+u2.rank+' » est encore utilisé par '+u2.name+' : change son rang avant'});
    if(!db.users.some(u=>rk.indexOf(u.rank)>=rk.indexOf(pm.set)))return send(400,{error:'Il doit rester un compte avec accès aux Réglages'});
    const ho={};for(const k of['rc','acc','ref','att','forma','cr','bak']){const v=(b.hooks||{})[k];
      if(v==null||String(v).startsWith(MASK))ho[k]=db.cfg.hooks[k]||'';
      else{ho[k]=T(v,200);if(ho[k]&&!okHook(ho[k]))return send(400,{error:'Webhook « '+k+' » invalide : il doit commencer par https://discord.com/api/webhooks/'})}}
    const ping=T(b.crPing,100);if(!/^(<@&?\d+>\s*)*$/.test(ping))return send(400,{error:'Le ping doit être une mention de rôle ou de membre, par exemple <@&123456>'});
    const pr=uq((Array.isArray(b.pingRoles)?b.pingRoles:[]).map(x=>T(x,25)).filter(x=>/^\d{5,25}$/.test(x))).slice(0,20);
    const O=x=>(Array.isArray(x)?x:[]).slice(0,10).map(o=>T(o,120)).filter(Boolean);
    const rq=(Array.isArray(b.rq)?b.rq:[]).slice(0,60).map(x=>T(x,300)).filter(Boolean);
    const stats=(Array.isArray(b.stats)?b.stats:[]).slice(0,30).map(s=>({s:s.s=='sec'?'sec':'main',e:T(s.e,60),l:T(s.l,120),p:N(s.p,1e6),...(s.rec?{rec:1}:{})})).filter(s=>s.l);
    const seen={},quizzes=(Array.isArray(b.quizzes)?b.quizzes:[]).slice(0,30).map(z=>{const id0=slug(T(z.t,80));let id=id0,n=1;while(seen[id])id=id0+'-'+(++n);seen[id]=1;
      return{id,t:T(z.t,80),q:(Array.isArray(z.q)?z.q:[]).slice(0,40).map(y=>[T(y[0]),O(y[1]),parseInt(y[2])||0]).filter(y=>y[0]&&y[1].length>1&&y[2]>=0&&y[2]<y[1].length)}}).filter(z=>z.t&&z.q.length);
    const tutos=(Array.isArray(b.tutos)?b.tutos:[]).slice(0,40).map(t=>({t:T(t.t,80),b:T(t.b,6000)})).filter(t=>t.t&&t.b);
    const pm2=b.perm||{};if(!rk.includes(pm2.dec))return send(400,{error:'La permission « décider des candidatures » doit viser un rang de la liste'});
    const rs=b.reset||{};let tz=T(rs.tz,60)||'Europe/Paris';try{new Intl.DateTimeFormat('en',{timeZone:tz})}catch{return send(400,{error:'Fuseau horaire invalide (exemple : Europe/Paris)'})}
    const RS={on:!!rs.on,tz};if(RS.on!=db.cfg.reset.on||RS.tz!=db.cfg.reset.tz)db.lastReset=wk(tz);
    db.cfg={...db.cfg,name:T(b.name,40)||'ADS',ranks:rk,perm:{hg:pm.hg,dec:pm2.dec,pts:pm.pts,set:pm.set},hooks:ho,crPing:ping,pingRoles:pr,home:T(b.home,6000),reset:RS,rq,stats,quizzes,tutos};
    LOG('cfg',me.name,'Réglages modifiés');save();return out()}
  if(r=='POST /api/hook-test'){
    if(!need('set'))return;const raw=String(b.url||''),url=raw.startsWith(MASK)?(db.cfg.hooks[b.k]||''):T(raw,200);
    if(!okHook(url))return send(400,{error:'Adresse invalide : elle doit commencer par https://discord.com/api/webhooks/'});
    let ok=false;try{ok=(await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({embeds:[E({title:'✅ Test de connexion',description:'Demandé par '+me.name})]})})).ok}catch{}
    return send(200,{ok})}

  send(404,{error:'Introuvable'})}

tick();setInterval(tick,6e4);for(const g of['SIGTERM','SIGINT'])process.on(g,()=>{try{save()}catch{}process.exit(0)});
http.createServer((q,r)=>handle(q,r).catch(e=>{console.error(e);r.headersSent||r.writeHead(500);r.end()})).listen(PORT,()=>console.log('ADS sur le port',PORT));
