// ADS – serveur de gestion Discord. Node 18+, aucune dépendance.
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000,DIR=process.env.DATA_DIR||path.join(__dirname,'data'),FILE=path.join(DIR,'db.json');
const rnd=n=>crypto.randomBytes(n).toString('hex'),gen=()=>'G-'+rnd(4).toUpperCase(),T=(x,n=300)=>String(x??'').trim().slice(0,n);
const CSP="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'";
const DQS=[["Disponibilité par semaine",["Moins de 3 h","3 à 7 h","Plus de 7 h"]],["Expérience de gestion",["Aucune","Autre serveur","Déjà staff ADS"]],["Connaissance du règlement",["Faible","Correcte","Excellente"]],["Réaction face à un conflit",["Ignorer","Prévenir un HG","Médier puis rapporter"]],["Motivation",["Faible","Moyenne","Forte"]]];
const DQUIZ=[["Un membre enfreint le règlement pour la première fois. Que faire ?",["Le bannir","Avertir puis noter l’avertissement","Ne rien faire"],1],["Qui décide de l’acceptation d’une candidature ?",["Tout le monde","Le candidat","Les HG"],2],["Où déposer un compte rendu ?",["Dans l’espace Comptes rendus","En message privé","Nulle part"],0],["Que faire d’une preuve de sanction ?",["La supprimer","La conserver","La publier"],1],["En cas de doute sur une situation ?",["Demander à un HG","Improviser","Attendre"],0]];
const VL={attente:['en attente',0x9a6212],ok:['acceptée',0x237a4b],no:['refusée',0xa83a33]};
let db,bad={};
const save=()=>{fs.writeFileSync(FILE+'.tmp',JSON.stringify(db));fs.renameSync(FILE+'.tmp',FILE)};
try{db=JSON.parse(fs.readFileSync(FILE,'utf8'))}catch{
  fs.mkdirSync(DIR,{recursive:true});const c=process.env.ADMIN_CODE||'ADS-'+rnd(4).toUpperCase();
  db={cfg:{name:'ADS',hg:[{id:'h0',name:'Fondateur',code:c}],hooks:{rc:'',dec:'',cr:''},qs:DQS,quiz:DQUIZ},users:[],rcs:[],crs:[]};save();
  console.log('Premier démarrage. Code HG :',c)}
// Seules les adresses de webhook Discord sont acceptées (évite qu'on fasse appeler n'importe quel site au serveur)
const okHook=u=>/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(u);
async function hook(k,embed){const u=db.cfg.hooks[k];if(!u||!okHook(u))return;
  try{await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({embeds:[embed]})})}catch{}}

async function handle(req,res){
  const p=new URL(req.url,'http://x').pathname,send=(c,o)=>{res.writeHead(c,{'Content-Type':'application/json'});res.end(JSON.stringify(o))};
  if(!p.startsWith('/api/')){
    if(p!=='/'){res.writeHead(404);return res.end()}
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','X-Content-Type-Options':'nosniff','Content-Security-Policy':CSP});
    return res.end(fs.readFileSync(path.join(__dirname,'public','index.html')))}
  let b={};try{const ch=[];let n=0;for await(const c of req){n+=c.length;if(n>1e6)throw 0;ch.push(c)}if(ch.length)b=JSON.parse(Buffer.concat(ch))}catch{return send(400,{error:'Requête invalide'})}
  // Authentification : le code est vérifié à chaque requête. 10 essais ratés max par IP toutes les 10 minutes.
  const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',')[0].trim(),f=bad[ip],now=Date.now();
  if(f&&f.t>now&&f.n>=10)return send(429,{error:'Trop d’essais, réessaie dans 10 minutes'});
  const code=String(req.headers['x-code']||'').trim(),h=db.cfg.hg.find(x=>x.code===code),u=db.users.find(x=>x.code===code);
  const me=code&&(h?{id:h.id,name:h.name,admin:true}:u?{id:u.id,name:u.name}:null);
  if(!me){bad[ip]=f&&f.t>now?{n:f.n+1,t:f.t}:{n:1,t:now+6e5};return send(401,{error:'Code inconnu'})}
  delete bad[ip];
  const isAdm=!!me.admin,adm=()=>isAdm||(send(403,{error:'Réservé aux HG'}),false);
  const view=()=>isAdm?db:{cfg:{name:db.cfg.name,qs:db.cfg.qs,quiz:db.cfg.quiz.map(q=>[q[0],q[1]])},users:db.users.filter(x=>x.id==me.id).map(({code,...x})=>x),rcs:db.rcs,crs:db.crs};
  const out=(x={})=>send(200,{me,S:view(),...x});
  const r=req.method+' '+p;let m;

  if(r=='GET /api/state')return out();

  if(r=='POST /api/rc'){
    const a=(Array.isArray(b.a)?b.a:[]).slice(0,20).map(y=>[T(y[0],200),T(y[1],200)]),n={id:rnd(5),did:T(b.did,40),pseudo:T(b.pseudo,60),a,note:T(b.note,1000),v:'attente',tr:0,by:me.name,d:Date.now()};
    if(!n.did||!n.pseudo)return send(400,{error:'ID Discord et pseudo obligatoires'});
    db.rcs.unshift(n);save();
    hook('rc',{title:'Rapport d’entretien : '+n.pseudo,color:0x1f6f78,fields:[{name:'ID Discord',value:n.did},...a.map(y=>({name:y[0]||'-',value:y[1]||'-'})),{name:'Remarques',value:n.note||'Aucune'},{name:'Mené par',value:n.by}]});
    return out()}
  if(m=r.match(/^POST \/api\/rc\/(\w+)\/(verdict|trained)$/)){
    if(!adm())return;const n=db.rcs.find(x=>x.id==m[1]);if(!n)return send(404,{error:'Introuvable'});
    if(m[2]=='trained')n.tr=1;
    else{if(!VL[b.v])return send(400,{error:'Décision invalide'});n.v=b.v;hook('dec',{title:'Candidature '+VL[b.v][0]+' : '+n.pseudo,color:VL[b.v][1],description:'ID '+n.did+', décision de '+me.name})}
    save();return out()}
  if(m=r.match(/^DELETE \/api\/rc\/(\w+)$/)){if(!adm())return;db.rcs=db.rcs.filter(x=>x.id!=m[1]);save();return out()}

  if(r=='POST /api/cr'){
    const c={t:T(b.t,200),b:T(b.b,4000),by:me.name,d:Date.now()};if(!c.t||!c.b)return send(400,{error:'Titre et texte obligatoires'});
    db.crs.unshift(c);save();hook('cr',{title:c.t,description:c.b,color:0x1f6f78,footer:{text:'Par '+me.name}});return out()}

  if(r=='POST /api/users'){if(!adm())return;const name=T(b.n,60);if(!name)return send(400,{error:'Nom obligatoire'});db.users.push({id:rnd(4),name,code:gen(),pts:[]});save();return out()}
  if(m=r.match(/^POST \/api\/users\/(\w+)\/(points|code)$/)){
    if(!adm())return;const x=db.users.find(y=>y.id==m[1]);if(!x)return send(404,{error:'Introuvable'});
    if(m[2]=='code')x.code=gen();else{const v=Number(b.v);if(!v||!isFinite(v))return send(400,{error:'Points invalides'});x.pts.push({v,w:T(b.w,200),d:Date.now()})}
    save();return out()}
  if(m=r.match(/^DELETE \/api\/users\/(\w+)$/)){if(!adm())return;db.users=db.users.filter(x=>x.id!=m[1]);save();return out()}

  if(r=='POST /api/quiz'){ // correction côté serveur
    const sc=db.cfg.quiz.reduce((s,q,i)=>s+(Number((b.a||[])[i])===q[2]?1:0),0),x=db.users.find(y=>y.id==me.id);
    if(x){x.qz=sc;save()}return out({score:sc})}

  if(r=='PUT /api/config'){
    if(!adm())return;
    const hg=(Array.isArray(b.hg)?b.hg:[]).slice(0,20).map((x,i)=>({id:'h'+i,name:T(x.name,60),code:T(x.code,80)})).filter(x=>x.name&&x.code),ho={};
    const all=[...hg.map(x=>x.code),...db.users.map(x=>x.code)];
    if(!hg.length||hg.some(x=>x.code.length<6)||new Set(all).size<all.length)return send(400,{error:'Chaque HG doit avoir un nom et un code unique de 6 caractères minimum'});
    for(const k of['rc','dec','cr']){ho[k]=T((b.hooks||{})[k],200);if(ho[k]&&!okHook(ho[k]))return send(400,{error:'Webhook invalide : il doit commencer par https://discord.com/api/webhooks/'})}
    const O=x=>(Array.isArray(x)?x:[]).slice(0,10).map(o=>T(o,100)).filter(Boolean);
    const qs=(Array.isArray(b.qs)?b.qs:[]).slice(0,20).map(q=>[T(q[0]),O(q[1])]).filter(q=>q[0]&&q[1].length>1);
    const quiz=(Array.isArray(b.quiz)?b.quiz:[]).slice(0,30).map(q=>[T(q[0]),O(q[1]),parseInt(q[2])||0]).filter(q=>q[0]&&q[1].length>1&&q[2]>=0&&q[2]<q[1].length);
    db.cfg={name:T(b.name,40)||'ADS',hg,hooks:ho,qs,quiz};save();return out()}

  if(r=='POST /api/hook-test'){
    if(!adm())return;const url=T(b.url,200);if(!okHook(url))return send(400,{error:'Adresse invalide : elle doit commencer par https://discord.com/api/webhooks/'});
    let ok=false;try{ok=(await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:'Test de connexion, demandé par '+me.name})})).ok}catch{}
    return send(200,{ok})}

  send(404,{error:'Introuvable'})}

http.createServer((q,r)=>handle(q,r).catch(e=>{console.error(e);r.headersSent||r.writeHead(500);r.end()})).listen(PORT,()=>console.log('ADS sur le port',PORT));
