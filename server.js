// ADS – serveur de gestion Discord. Node 18+, aucune dépendance.
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000,DIR=process.env.DATA_DIR||path.join(__dirname,'data'),FILE=path.join(DIR,'db.json');
const rnd=n=>crypto.randomBytes(n).toString('hex'),T=(x,n=300)=>String(x??'').trim().slice(0,n),N=(x,m=1e9)=>{x=Number(x);return isFinite(x)?Math.max(-m,Math.min(m,x)):0},r2=x=>Math.round(x*100)/100;
const slug=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'quiz';
const today=()=>new Date().toISOString().slice(0,10),isD=s=>/^\d{4}-\d\d-\d\d$/.test(s||'');
const fd=s=>{const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(s||'');return m?m[3]+'/'+m[2]+'/'+m[1]:(s||'')},men=id=>/^\d{5,25}$/.test(id)?'<@'+id+'>':'',who=(n,id)=>(men(id)||n)+(id?' / '+id:'');
const CSP="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'";

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

// ---------- Base de données ----------
let db,bad={};
const save=()=>{fs.writeFileSync(FILE+'.tmp',JSON.stringify(db));fs.renameSync(FILE+'.tmp',FILE)};
function norm(d){const c=d.cfg=d.cfg||{};
  c.name=c.name||'ADS';c.ranks=c.ranks||DR.slice();c.perm=Object.assign({hg:'HG',pts:'Bras droit',set:'Bras droit'},c.perm);
  c.hooks=Object.assign({rc:'',acc:'',ref:'',att:'',forma:'',cr:''},c.hooks);
  if(c.hooks.dec){for(const k of['acc','ref','att'])c.hooks[k]=c.hooks[k]||c.hooks.dec;delete c.hooks.dec}
  c.crPing=c.crPing??'<@&1538282326377893889>';c.quizzes=c.quizzes||DQZ;c.tutos=c.tutos||DTU;
  if((c.ver||0)<2){c.rq=DRQ;c.stats=DST;if(!c.quizzes.some(z=>z.id==BQ.id))c.quizzes.push(BQ);c.ver=2}
  c.rq=c.rq||DRQ;c.stats=c.stats||DST;
  d.users=d.users||[];for(const h of c.hg||[])d.users.push({id:h.id,name:h.name,code:h.code,rank:c.ranks[c.ranks.length-1],rec:true});
  delete c.hg;delete c.qs;delete c.quiz;delete c.admin;
  for(const u of d.users){u.rank=u.rank||c.ranks[0];u.pts=(u.pts||[]).map(p=>({t:'mission',by:'-',...p}));u.qz=(u.qz&&typeof u.qz=='object')?u.qz:{};u.did=u.did||''}
  d.rcs=(d.rcs||[]).map(r=>({cand:r.pseudo,...r}));d.crs=d.crs||[];d.logs=d.logs||[];return d}
if(fs.existsSync(FILE))db=norm(JSON.parse(fs.readFileSync(FILE,'utf8')));
else{fs.mkdirSync(DIR,{recursive:true});const c=process.env.ADMIN_CODE||'FO-'+rnd(4).toUpperCase();
  db=norm({cfg:{},users:[{id:'u0',name:'Fondateur',code:c,rank:DR[DR.length-1],rec:true}]});save();console.log('Premier démarrage. Code fondateur :',c)}

const lvl=r=>db.cfg.ranks.indexOf(r),perm=u=>{const l=lvl(u.rank),c=db.cfg.perm;return{hg:l>=lvl(c.hg),pts:l>=lvl(c.pts),set:l>=lvl(c.set)}};
const mk=u=>({id:u.id,name:u.name,rank:u.rank,rec:!!u.rec,did:u.did,p:perm(u)});
const gen=r=>{let c;do c=String(r||'GE').normalize('NFD').replace(/[^A-Za-z]/g,'').slice(0,2).toUpperCase()+'-'+rnd(4).toUpperCase();while(db.users.some(u=>u.code===c));return c};
const LOG=(t,by,x)=>{db.logs.unshift({id:rnd(4),d:Date.now(),t,by,x:T(x,400)});db.logs.length=Math.min(db.logs.length,1000)};

// ---------- Discord ----------
const okHook=u=>/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(u);
const chunks=t=>{const o=[];let c='';for(const l of t.split('\n')){if(c&&c.length+l.length+1>1900){o.push(c);c=''}c+=(c?'\n':'')+l.slice(0,1900)}if(c)o.push(c);return o};
async function say(k,text){const u=db.cfg.hooks[k];if(!u||!okHook(u))return;
  for(const c of chunks(text)){try{await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:c,allowed_mentions:{parse:['roles','users']}})})}catch{}}}
const entText=n=>{let i=0;const o=['**Entretien :** Candidat : '+who(n.cand,n.did),'Date : '+fd(n.date),'Réalisé par : '+n.by,'Supervisé par : '+(n.sup||'-')];
  for(const x of n.a)o.push(...(x[0]=='##'?['','## '+x[1],'']:['• Question '+(++i)+' : '+x[0],'> Réponse : '+(x[1]||'-'),'']));return o.join('\n')};

async function handle(req,res){
  const p=new URL(req.url,'http://x').pathname,send=(c,o)=>{res.writeHead(c,{'Content-Type':'application/json'});res.end(JSON.stringify(o))};
  if(!p.startsWith('/api/')){
    if(p!=='/'){res.writeHead(404);return res.end()}
    const pg=['index.html','public/index.html'].map(x=>path.join(__dirname,x)).find(x=>fs.existsSync(x));
    if(!pg){res.writeHead(500,{'Content-Type':'text/plain; charset=utf-8'});return res.end('Le serveur tourne, mais le fichier index.html est introuvable. Vérifie qu’il est bien dans le dépôt GitHub, à côté de server.js.')}
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','X-Content-Type-Options':'nosniff','Content-Security-Policy':CSP});
    return res.end(fs.readFileSync(pg))}
  let b={};try{const ch=[];let n=0;for await(const c of req){n+=c.length;if(n>1e6)throw 0;ch.push(c)}if(ch.length)b=JSON.parse(Buffer.concat(ch))}catch{return send(400,{error:'Requête invalide'})}
  // Authentification : le code est vérifié à chaque requête. 10 essais ratés max par IP toutes les 10 minutes.
  const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',')[0].trim(),f=bad[ip],now=Date.now();
  if(f&&f.t>now&&f.n>=10)return send(429,{error:'Trop d’essais, réessaie dans 10 minutes'});
  const code=String(req.headers['x-code']||'').trim(),usr=code&&db.users.find(x=>x.code===code);
  if(!usr){bad[ip]=f&&f.t>now?{n:f.n+1,t:f.t}:{n:1,t:now+6e5};return send(401,{error:'Code inconnu'})}
  delete bad[ip];
  const me=mk(usr),P=me.p,need=k=>P[k]||(send(403,{error:'Accès refusé'}),false);
  const cur=()=>db.users.find(u=>u.id==me.id)||usr;
  const view=()=>{const c=db.cfg,P2=perm(cur());
    const pub={name:c.name,ranks:c.ranks,perm:c.perm,stats:c.stats,rq:c.rq,tutos:c.tutos,quizzes:c.quizzes.map(z=>({id:z.id,t:z.t,q:z.q.map(y=>[y[0],y[1]])}))};
    const nc=u=>{const{code,...x}=u;return x};
    return{cfg:P2.set?c:pub,users:P2.set?db.users:P2.hg?db.users.map(nc):db.users.filter(u=>u.id==me.id).map(nc),
      rcs:P2.hg?db.rcs:db.rcs.filter(x=>x.uid==me.id),crs:P2.hg?db.crs:db.crs.filter(x=>x.uid==me.id),logs:P2.hg?db.logs.slice(0,300):[]}};
  const out=(x={})=>send(200,{me:mk(cur()),S:view(),...x});
  const mgr=x=>lvl(x.rank)<=lvl(me.rank),r=req.method+' '+p;let m;

  if(r=='GET /api/state')return out();

  // --- Entretiens ---
  if(r=='POST /api/rc'){
    if(!(me.rec||P.hg))return send(403,{error:'Réservé aux recruteurs et aux HG'});
    const a=(Array.isArray(b.a)?b.a:[]).slice(0,40).map(y=>y[0]=='##'?['##',T(y[1],100)]:[T(y[0],300),T(y[1],900)]),
      n={id:rnd(5),uid:me.id,cand:T(b.cand,60),did:T(b.did,25),date:isD(b.date)?b.date:today(),by:T(b.by,60)||me.name,sup:T(b.sup,60),a,v:'attente',tr:0,d:Date.now()};
    if(!n.cand)return send(400,{error:'Le pseudo du candidat est obligatoire'});
    db.rcs.unshift(n);LOG('ent',me.name,'Entretien de '+n.cand);save();say('rc',entText(n));return out()}
  if(m=r.match(/^POST \/api\/rc\/(\w+)\/verdict$/)){
    if(!need('hg'))return;const n=db.rcs.find(x=>x.id==m[1]);if(!n)return send(404,{error:'Introuvable'});
    const V={ok:['acc','✅','acceptée'],no:['ref','❌','refusée'],attente:['att','⏳','mise en attente']}[b.v];if(!V)return send(400,{error:'Décision invalide'});
    n.v=b.v;LOG('dec',me.name,'Candidature '+V[2]+' : '+n.cand);save();
    say(V[0],V[1]+' **Candidature '+V[2]+'** : '+who(n.cand,n.did)+'\nDécision de '+me.name+(b.v=='ok'?'\nProchaine étape : formation.':''));return out()}
  if(m=r.match(/^POST \/api\/rc\/(\w+)\/trained$/)){
    if(!(me.rec||P.hg))return send(403,{error:'Accès refusé'});const n=db.rcs.find(x=>x.id==m[1]);if(!n)return send(404,{error:'Introuvable'});
    if(n.v!='ok')return send(400,{error:'Ce candidat n’est pas accepté'});
    n.tr=1;n.trBy=me.name;n.trD=Date.now();n.trNote=T(b.note,800);LOG('forma',me.name,'Formation terminée : '+n.cand);save();
    say('forma',['🎓 **Rapport de formation**','Candidat : '+who(n.cand,n.did),'Formé par : '+me.name,'Date : '+fd(today()),'Remarques : '+(n.trNote||'-')].join('\n'));return out()}
  if(m=r.match(/^DELETE \/api\/rc\/(\w+)$/)){if(!need('hg'))return;db.rcs=db.rcs.filter(x=>x.id!=m[1]);save();return out()}

  // --- Comptes rendus : points calculés côté serveur ---
  if(r=='POST /api/cr'){
    const st=db.cfg.stats,vals=st.map((s,i)=>s.rec&&!me.rec?null:Math.max(0,N((b.vals||[])[i]))),x=cur(),id=rnd(5),date=isD(b.date)?b.date:today(),
      pts=r2(st.reduce((t,s,i)=>t+(vals[i]||0)*s.p,0)),op=N(b.op,1e6),mis=r2(x.pts.filter(q=>q.t=='mission'&&!q.rep).reduce((t,q)=>t+q.v,0)),total=r2(pts+op+mis),
      L=l=>st.map((s,i)=>s.s==l&&vals[i]!==null?(s.e?s.e+' ':'')+'• '+s.l+' : '+vals[i]:null).filter(Boolean);
    const txt=[db.cfg.crPing,'**Compte Rendu  : **','','👤 • Pseudo & Identifiant : '+who(T(b.pseudo,60)||me.name,T(b.did,25)),'📅 • Date Du Compte Rendu : '+fd(date),'','**Activité Principale :**',...L('main'),
      '📜 • Autres activités effectuées (précisez le nombre de points accordés) : '+(T(b.ot,300)||'-')+' ('+op+' pts)','','**Activité secondaire :**',...L('sec'),'','**Total De Points :** '+total,
      '(stats : '+pts+', autres : '+op+', missions : '+mis+')','','**Point De Vue :**','🔗 • Problèmes rencontrés sur le serveur, si oui lesquels ? : '+(T(b.prob,600)||'-'),'💡• Améliorations Suggérées : '+(T(b.amel,600)||'-'),
      '🎓 • Ping supérieurs hiérarchiques : '+(T(b.ping,200)||'-'),'','**Activité Shibuya (optionel) :**','📊 • Vos Statistiques (s?u) : '+(T(b.shib,400)||'-'),'','**Votre TikTok & Twitter :** '+(T(b.tt,300)||'-')].join('\n');
    const add=r2(pts+op);if(add)x.pts.push({v:add,w:'Compte rendu du '+fd(date),t:'cr',by:'système',d:Date.now()});
    x.pts.forEach(q=>{if(q.t=='mission'&&!q.rep)q.rep=id});
    db.crs.unshift({id,uid:me.id,by:me.name,date,total,txt,d:Date.now()});db.crs.length=Math.min(db.crs.length,500);
    LOG('cr',me.name,'Compte rendu du '+fd(date)+' : '+total+' pts');save();say('cr',txt);return out({total})}

  // --- Comptes, rangs, points ---
  if(r=='POST /api/users'){
    if(!need('set'))return;const name=T(b.n,60),rank=b.rank||db.cfg.ranks[0];if(!name)return send(400,{error:'Nom obligatoire'});
    if(lvl(rank)<0||lvl(rank)>lvl(me.rank))return send(400,{error:'Rang invalide ou supérieur au tien'});
    let c=T(b.code,80);if(c&&(c.length<6||db.users.some(u=>u.code===c)))return send(400,{error:'Code trop court (6 caractères minimum) ou déjà utilisé'});
    db.users.push({id:rnd(4),name,code:c||gen(rank),rank,did:T(b.did,25),rec:!!b.rec,pts:[],qz:{}});LOG('cpt',me.name,'Compte créé : '+name+' ('+rank+')');save();return out()}
  if(m=r.match(/^POST \/api\/users\/(\w+)\/(points|code|rank|rec)$/)){
    const x=db.users.find(y=>y.id==m[1]);if(!x)return send(404,{error:'Introuvable'});
    if(m[2]=='points'){
      if(!need('pts'))return;const v=N(b.v,1e5),w=T(b.w,200)||'Mission';if(!v)return send(400,{error:'Points invalides'});
      x.pts.push({v,w,t:'mission',by:me.name,d:Date.now()});LOG('pts',me.name,(v>0?'+':'')+v+' pts à '+x.name+' : '+w)}
    else{
      if(!need('set'))return;if(!mgr(x))return send(403,{error:'Ce compte a un rang supérieur au tien'});
      if(m[2]=='code'){x.code=gen(x.rank);LOG('cpt',me.name,'Nouveau code pour '+x.name)}
      else if(m[2]=='rec'){x.rec=!x.rec;LOG('cpt',me.name,x.name+(x.rec?' devient recruteur':' n’est plus recruteur'))}
      else{const rk=b.rank,old=x.rank;if(lvl(rk)<0||lvl(rk)>lvl(me.rank))return send(400,{error:'Rang invalide ou supérieur au tien'});
        x.rank=rk;if(!db.users.some(u=>perm(u).set)){x.rank=old;return send(400,{error:'Il doit rester au moins un compte avec accès aux Réglages'})}
        LOG('cpt',me.name,x.name+' : '+old+' vers '+rk)}}
    save();return out()}
  if(m=r.match(/^DELETE \/api\/users\/(\w+)$/)){
    if(!need('set'))return;const x=db.users.find(y=>y.id==m[1]);if(!x)return send(404,{error:'Introuvable'});
    if(x.id==me.id)return send(400,{error:'Tu ne peux pas supprimer ton propre compte'});if(!mgr(x))return send(403,{error:'Ce compte a un rang supérieur au tien'});
    if(!db.users.some(u=>u.id!=x.id&&perm(u).set))return send(400,{error:'Il doit rester au moins un compte avec accès aux Réglages'});
    db.users=db.users.filter(u=>u.id!=x.id);LOG('cpt',me.name,'Compte supprimé : '+x.name);save();return out()}

  // --- Quiz (correction côté serveur) ---
  if(r=='POST /api/quiz'){
    const z=db.cfg.quizzes.find(y=>y.id==b.id);if(!z)return send(404,{error:'Quiz introuvable'});
    const sc=z.q.reduce((s,y,i)=>s+(Number((b.a||[])[i])===y[2]?1:0),0);cur().qz[z.id]=sc;
    LOG('quiz',me.name,'Quiz « '+z.t+' » : '+sc+'/'+z.q.length);save();return out({score:sc})}

  // --- Réglages ---
  if(r=='PUT /api/config'){
    if(!need('set'))return;
    const rk=[...new Set((Array.isArray(b.ranks)?b.ranks:[]).map(x=>T(x,30)).filter(Boolean))].slice(0,12),pm=b.perm||{};
    if(rk.length<2||!['hg','pts','set'].every(k=>rk.includes(pm[k])))return send(400,{error:'Il faut au moins 2 rangs, et chaque permission doit viser un rang de la liste'});
    const u2=db.users.find(u=>!rk.includes(u.rank));if(u2)return send(400,{error:'Le rang « '+u2.rank+' » est encore utilisé par '+u2.name+' : change son rang avant'});
    if(!db.users.some(u=>rk.indexOf(u.rank)>=rk.indexOf(pm.set)))return send(400,{error:'Il doit rester un compte avec accès aux Réglages'});
    const ho={};for(const k of['rc','acc','ref','att','forma','cr']){ho[k]=T((b.hooks||{})[k],200);if(ho[k]&&!okHook(ho[k]))return send(400,{error:'Webhook « '+k+' » invalide : il doit commencer par https://discord.com/api/webhooks/'})}
    const ping=T(b.crPing,100);if(!/^(<@&?\d+>\s*)*$/.test(ping))return send(400,{error:'Le ping doit être une mention de rôle ou de membre, par exemple <@&123456>'});
    const O=x=>(Array.isArray(x)?x:[]).slice(0,10).map(o=>T(o,120)).filter(Boolean);
    const rq=(Array.isArray(b.rq)?b.rq:[]).slice(0,60).map(x=>T(x,300)).filter(Boolean);
    const stats=(Array.isArray(b.stats)?b.stats:[]).slice(0,30).map(s=>({s:s.s=='sec'?'sec':'main',e:T(s.e,60),l:T(s.l,120),p:N(s.p,1e6),...(s.rec?{rec:1}:{})})).filter(s=>s.l);
    const seen={},quizzes=(Array.isArray(b.quizzes)?b.quizzes:[]).slice(0,30).map(z=>{const id0=slug(T(z.t,80));let id=id0,n=1;while(seen[id])id=id0+'-'+(++n);seen[id]=1;
      return{id,t:T(z.t,80),q:(Array.isArray(z.q)?z.q:[]).slice(0,40).map(y=>[T(y[0]),O(y[1]),parseInt(y[2])||0]).filter(y=>y[0]&&y[1].length>1&&y[2]>=0&&y[2]<y[1].length)}}).filter(z=>z.t&&z.q.length);
    const tutos=(Array.isArray(b.tutos)?b.tutos:[]).slice(0,40).map(t=>({t:T(t.t,80),b:T(t.b,3000)})).filter(t=>t.t&&t.b);
    db.cfg={...db.cfg,name:T(b.name,40)||'ADS',ranks:rk,perm:{hg:pm.hg,pts:pm.pts,set:pm.set},hooks:ho,crPing:ping,rq,stats,quizzes,tutos};
    LOG('cfg',me.name,'Réglages modifiés');save();return out()}
  if(r=='POST /api/hook-test'){
    if(!need('set'))return;const url=T(b.url,200);if(!okHook(url))return send(400,{error:'Adresse invalide : elle doit commencer par https://discord.com/api/webhooks/'});
    let ok=false;try{ok=(await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:'Test de connexion, demandé par '+me.name})})).ok}catch{}
    return send(200,{ok})}

  send(404,{error:'Introuvable'})}

http.createServer((q,r)=>handle(q,r).catch(e=>{console.error(e);r.headersSent||r.writeHead(500);r.end()})).listen(PORT,()=>console.log('ADS sur le port',PORT));
