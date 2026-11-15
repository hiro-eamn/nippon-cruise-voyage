/* Firebase backend.
   The site used to call a server at /api/*. This file answers the same calls
   with Firestore + Google sign-in, so the rest of the site is unchanged.
   Data layout (see firestore.rules):
     users/{uid}        private record  {stateJson, version}
     profiles/{uid}     public profile  {name, avatar, avatarImage, avatarCustomJson}
     follows/{uid}      private         {ids: []}
     media/{id}         photo           {ownerId, data: 'data:image/jpeg;base64,...'}
     posts/{id}         public post     {authorId, title, place, images: ['media:ID'], likedBy: [], ...}
     posts/{id}/comments/{cid}
     hiddenPosts/{id}   posts hidden by their author or an admin
     reports, feedback, audit           admin-only reading
     admins/{uid}       an (empty) document here makes that user an admin */
(function(){
const SDK='https://www.gstatic.com/firebasejs/10.14.1/';
const cfg=window.FIREBASE_CONFIG||{};
const configured=!!(cfg.apiKey&&cfg.projectId&&!/YOUR_/.test(cfg.apiKey+cfg.projectId));
const PAGE=20,MAX_PHOTO=950000;
const DEFAULT_PROFILE={name:'さすらいの旅人',avatar:'👨🏻‍🦳'};
let ready=null;
const mediaUrl=new Map(),mediaId=new Map(),profiles=new Map(),commentPost=new Map();

function fail(message,status){const e=Error(message);e.status=status||400;return e}
function now(){return new Date().toISOString()}
function clean(value){return JSON.parse(JSON.stringify(value??null))}
function notify(message){if(typeof toast==='function')toast(message)}

function load(){if(!ready)ready=init();return ready}
async function init(){
  const [appM,authM,fs]=await Promise.all([import(SDK+'firebase-app.js'),import(SDK+'firebase-auth.js'),import(SDK+'firebase-firestore.js')]);
  const app=appM.initializeApp(cfg),auth=authM.getAuth(app),db=fs.getFirestore(app);
  const user=await new Promise(resolve=>{const off=authM.onAuthStateChanged(auth,u=>{off();resolve(u)},()=>resolve(null))});
  let isAdmin=false;
  if(user){try{isAdmin=(await fs.getDoc(fs.doc(db,'admins',user.uid))).exists()}catch{}}
  return {authM,fs,auth,db,user,uid:user?user.uid:null,isAdmin};
}
function need(c){if(!c.uid)throw fail('ログインが必要です。',401)}
function needAdmin(c){if(!c.isAdmin)throw fail('管理者専用です。',403)}
function can(c,authorId){return !!c.uid&&(c.uid===authorId||c.isAdmin)}

/* ---- photos: kept as Firestore documents, shown as data URLs ---- */
function remember(id,src){mediaUrl.set(id,src);if(src)mediaId.set(src,id)}
async function putMedia(c,src){
  if(mediaId.has(src))return mediaId.get(src);
  need(c);
  if(!src.startsWith('data:image/jpeg;base64,'))throw fail('写真をJPEGで選び直してください。');
  if(src.length>MAX_PHOTO)throw fail('写真のサイズが大きすぎます。別の写真でお試しください。');
  const ref=c.fs.doc(c.fs.collection(c.db,'media'));
  await c.fs.setDoc(ref,{ownerId:c.uid,data:src,createdAt:now()});
  remember(ref.id,src);
  return ref.id;
}
async function getMedia(c,id){
  if(mediaUrl.has(id))return mediaUrl.get(id);
  let src='';
  try{const snap=await c.fs.getDoc(c.fs.doc(c.db,'media',id));if(snap.exists())src=snap.data().data||''}catch{}
  remember(id,src);
  return src;
}
async function toRef(c,src){return typeof src==='string'&&src.startsWith('data:image/jpeg')?'media:'+await putMedia(c,src):src}
async function fromRef(c,value){return typeof value==='string'&&value.startsWith('media:')?getMedia(c,value.slice(6)):value}

/* ---- profiles ---- */
function profileOut(d){
  let avatarCustom;
  try{avatarCustom=d.avatarCustomJson?JSON.parse(d.avatarCustomJson):undefined}catch{}
  return {name:d.name||DEFAULT_PROFILE.name,avatar:d.avatar||DEFAULT_PROFILE.avatar,avatarImage:d.avatarImage||undefined,avatarCustom};
}
function profileIn(p){
  const out={name:String(p.name||DEFAULT_PROFILE.name).slice(0,40),avatar:String(p.avatar||DEFAULT_PROFILE.avatar).slice(0,40),updatedAt:now()};
  if(p.avatarCustom)out.avatarCustomJson=JSON.stringify(p.avatarCustom);
  else if(p.avatarImage)out.avatarImage=p.avatarImage;
  return out;
}
async function getProfile(c,uid){
  if(!profiles.has(uid))profiles.set(uid,(async()=>{
    try{const snap=await c.fs.getDoc(c.fs.doc(c.db,'profiles',uid));return snap.exists()?profileOut(snap.data()):null}catch{return null}
  })());
  return profiles.get(uid);
}

/* ---- account ---- */
async function getAccount(c){
  need(c);
  const {fs,db,uid}=c,userRef=fs.doc(db,'users',uid),profileRef=fs.doc(db,'profiles',uid);
  const [userSnap,profileSnap]=await Promise.all([fs.getDoc(userRef),fs.getDoc(profileRef)]);
  if(!profileSnap.exists())await fs.setDoc(profileRef,profileIn(DEFAULT_PROFILE));
  if(!userSnap.exists())await fs.setDoc(userRef,{stateJson:'{}',version:0,updatedAt:now()});
  let state={};
  try{state=JSON.parse(userSnap.exists()?userSnap.data().stateJson||'{}':'{}')}catch{}
  for(const m of state.memories||[])if(m&&m.image)m.image=await fromRef(c,m.image);
  return {id:uid,version:userSnap.exists()?userSnap.data().version||0:0,state,profile:profileSnap.exists()?clean(profileOut(profileSnap.data())):{...DEFAULT_PROFILE}};
}
async function putAccount(c,body){
  need(c);
  const {fs,db,uid}=c,state=clean(body.state)||{};
  for(const m of state.memories||[])if(m&&m.image)m.image=await toRef(c,m.image);
  const stateJson=JSON.stringify(state);
  if(stateJson.length>MAX_PHOTO)throw fail('記録が大きすぎて保存できません。');
  const userRef=fs.doc(db,'users',uid);
  const version=await fs.runTransaction(db,async tx=>{
    const snap=await tx.get(userRef),current=snap.exists()?snap.data().version||0:0;
    if(current!==(body.version||0))throw fail('別の端末で記録が更新されています。画面を再読み込みしてください。',409);
    tx.set(userRef,{stateJson,version:current+1,updatedAt:now()});
    tx.set(fs.doc(db,'profiles',uid),profileIn(body.profile||{}));
    return current+1;
  });
  profiles.delete(uid);
  return {version};
}

/* ---- posts ---- */
async function loadComments(c,postId){
  const {fs,db}=c;
  try{
    const snap=await fs.getDocs(fs.query(fs.collection(db,'posts',postId,'comments'),fs.orderBy('createdAt')));
    return Promise.all(snap.docs.map(async d=>{
      const x=d.data(),p=await getProfile(c,x.authorId);
      commentPost.set(d.id,postId);
      return {id:d.id,authorId:x.authorId,name:p?p.name:'退会した参加者',text:x.text,createdAt:x.createdAt,updatedAt:x.updatedAt||undefined,canManage:can(c,x.authorId)};
    }));
  }catch{return []}
}
async function shapePost(c,id,d){
  const [p,images,comments]=await Promise.all([getProfile(c,d.authorId),Promise.all((d.images||[]).map(v=>fromRef(c,v))),loadComments(c,id)]);
  const likedBy=d.likedBy||[],author=p||{name:'退会した参加者',avatar:'👤'};
  return {id,authorId:d.authorId,name:author.name,avatar:author.avatar,avatarImage:author.avatarImage,avatarCustom:author.avatarCustom,title:d.title,place:d.place||'',images:images.filter(Boolean),voyageId:d.voyageId||'current',cruise:d.cruise||'current',createdAt:d.createdAt,updatedAt:d.updatedAt||undefined,likes:likedBy.length,liked:!!c.uid&&likedBy.includes(c.uid),canManage:can(c,d.authorId),comments};
}
async function feed(c,before){
  const {fs,db}=c,parts=[fs.orderBy('createdAt','desc')];
  if(before)parts.push(fs.startAfter(before));else profiles.clear();
  parts.push(fs.limit(PAGE));
  const snap=await fs.getDocs(fs.query(fs.collection(db,'posts'),...parts));
  const items=await Promise.all(snap.docs.map(d=>shapePost(c,d.id,d.data())));
  return {items,next:snap.size===PAGE?items[items.length-1].createdAt:null};
}
async function myPosts(c){
  need(c);
  const {fs,db,uid}=c,snap=await fs.getDocs(fs.query(fs.collection(db,'posts'),fs.where('authorId','==',uid)));
  const items=await Promise.all(snap.docs.map(d=>shapePost(c,d.id,d.data())));
  items.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  return {items,next:null,total:items.length};
}
async function postFields(c,body){
  const title=String(body.title||'').trim();
  if(!title)throw fail('ひとことを入力してください。');
  const images=[];
  for(const src of (body.images||[]).slice(0,10))if(src)images.push(await toRef(c,src));
  return {title:title.slice(0,2000),place:String(body.place||'').slice(0,100),images,voyageId:String(body.voyageId||'current')};
}
async function createPost(c,body){
  need(c);
  const {fs,db,uid}=c,ref=fs.doc(fs.collection(db,'posts'));
  await fs.setDoc(ref,{...await postFields(c,body),authorId:uid,cruise:String(body.cruise||'current'),createdAt:now(),likedBy:[]});
  return {id:ref.id};
}
async function updatePost(c,id,body){
  need(c);
  await c.fs.updateDoc(c.fs.doc(c.db,'posts',id),{...await postFields(c,body),updatedAt:now()});
  return {ok:true};
}
async function audit(c,action,target){
  if(!c.isAdmin)return;
  try{await c.fs.addDoc(c.fs.collection(c.db,'audit'),{action,target_id:target,actorId:c.uid,created_at:now()})}catch{}
}
async function movePost(c,id,from,to,action){
  need(c);
  const {fs,db}=c,source=fs.doc(db,from,id),snap=await fs.getDoc(source);
  if(!snap.exists())throw fail('投稿が見つかりません。',404);
  const d=snap.data();
  if(!can(c,d.authorId))throw fail('この投稿は操作できません。',403);
  const batch=fs.writeBatch(db),copy={...d};
  if(to==='hiddenPosts'){copy.deletedAt=now();copy.deletedBy=c.uid}else{delete copy.deletedAt;delete copy.deletedBy}
  batch.set(fs.doc(db,to,id),copy);batch.delete(source);
  await batch.commit();
  if(d.authorId!==c.uid)await audit(c,action,id);
  return {ok:true};
}
async function deletedPosts(c){
  need(c);
  const snap=await c.fs.getDocs(c.fs.query(c.fs.collection(c.db,'hiddenPosts'),c.fs.where('authorId','==',c.uid)));
  return {items:snap.docs.map(d=>({id:d.id,title:d.data().title,deletedAt:d.data().deletedAt})).sort((a,b)=>String(b.deletedAt).localeCompare(String(a.deletedAt)))};
}
async function setLike(c,id,on){
  need(c);
  await c.fs.updateDoc(c.fs.doc(c.db,'posts',id),{likedBy:on?c.fs.arrayUnion(c.uid):c.fs.arrayRemove(c.uid)});
  return {ok:true};
}
function commentText(body){const text=String(body.text||'').trim().slice(0,300);if(!text)throw fail('コメントを入力してください。');return text}
async function addComment(c,postId,body){
  need(c);
  const ref=await c.fs.addDoc(c.fs.collection(c.db,'posts',postId,'comments'),{authorId:c.uid,text:commentText(body),createdAt:now()});
  commentPost.set(ref.id,postId);
  return {id:ref.id};
}
function commentRef(c,cid){
  const postId=commentPost.get(cid);
  if(!postId)throw fail('コメントが見つかりません。画面を更新してください。',404);
  return c.fs.doc(c.db,'posts',postId,'comments',cid);
}

/* ---- follows ---- */
async function follows(c,method,body){
  need(c);
  const {fs,db,uid}=c,ref=fs.doc(db,'follows',uid);
  if(method==='GET'){const snap=await fs.getDoc(ref);return {ids:snap.exists()?snap.data().ids||[]:[]}}
  const target=String(body.target||'');
  if(!target||target===uid)throw fail('フォローできません。');
  await fs.setDoc(ref,{ids:method==='POST'?fs.arrayUnion(target):fs.arrayRemove(target)},{merge:true});
  return {ok:true};
}

/* ---- admin ---- */
async function latest(c,name,count){
  needAdmin(c);
  const snap=await c.fs.getDocs(c.fs.query(c.fs.collection(c.db,name),c.fs.orderBy('created_at','desc'),c.fs.limit(count)));
  return {items:snap.docs.map(d=>({id:d.id,...d.data()}))};
}
async function backup(c){
  needAdmin(c);
  const out={createdAt:now(),note:'写真本体(media)は含みません。'};
  for(const name of ['users','profiles','follows','posts','hiddenPosts','reports','feedback','audit']){
    const snap=await c.fs.getDocs(c.fs.collection(c.db,name));
    out[name]=snap.docs.map(d=>({id:d.id,...d.data()}));
  }
  await audit(c,'backup','all');
  return out;
}

/* ---- router ---- */
async function handle(path,method,body){
  const [pathname,queryString]=path.split('?'),seg=pathname.replace(/^\/api\//,'').split('/'),query=new URLSearchParams(queryString||'');
  body=body||{};
  if(!configured){
    if(seg[0]==='session')return {signedIn:false,isAdmin:false};
    if(seg[0]==='feed')return {items:[],next:null};
    throw fail('データベース（Firebase）が未設定です。firebase-config.js を設定してください。',503);
  }
  const c=await load(),{fs,db}=c;
  switch(seg[0]){
    case 'session':return {signedIn:!!c.uid,isAdmin:c.isAdmin};
    case 'account':return method==='PUT'?putAccount(c,body):getAccount(c);
    case 'media':await putMedia(c,String(body.data||''));return {url:body.data};
    case 'feed':return feed(c,query.get('before'));
    case 'my-posts':return myPosts(c);
    case 'deleted':return deletedPosts(c);
    case 'follows':return follows(c,method,body);
    case 'export':{const account=await getAccount(c);return {exportedAt:now(),account,posts:(await myPosts(c)).items}}
    case 'people':{const p=await getProfile(c,seg[1]);if(!p)throw fail('参加者が見つかりません。コードをご確認ください。',404);return {authorId:seg[1],...p}}
    case 'feedback':
      if(method==='POST'){
        const message=String(body.message||'').trim().slice(0,3000);
        if(!message)throw fail('内容を入力してください。');
        /* Light flood guard: one request a minute, five a day, per browser. */
        let sent=[];try{sent=JSON.parse(localStorage.getItem('nc-feedback-sent')||'[]').filter(t=>Date.now()-t<86400000)}catch{}
        if(sent.some(t=>Date.now()-t<60000))throw fail('続けて送信はできません。1分ほどおいてからお試しください。',429);
        if(sent.length>=5)throw fail('本日の送信回数の上限に達しました。明日またお送りください。',429);
        try{localStorage.setItem('nc-feedback-sent',JSON.stringify([...sent,Date.now()]))}catch{}
        await fs.addDoc(fs.collection(db,'feedback'),{category:String(body.category||'その他').slice(0,40),message,name:String(body.name||'').slice(0,40),created_at:now()});
        return {ok:true};
      }
      return latest(c,'feedback',500);
    case 'posts':
      if(!seg[1])return createPost(c,body);
      if(!seg[2])return method==='PUT'?updatePost(c,seg[1],body):movePost(c,seg[1],'posts','hiddenPosts','hide-post');
      if(seg[2]==='restore')return movePost(c,seg[1],'hiddenPosts','posts','restore-post');
      if(seg[2]==='like')return setLike(c,seg[1],method==='POST');
      if(seg[2]==='comments')return addComment(c,seg[1],body);
      if(seg[2]==='report'){
        need(c);
        const reason=String(body.reason||'').trim().slice(0,500);
        if(!reason)throw fail('理由を入力してください。');
        await fs.addDoc(fs.collection(db,'reports'),{post_id:seg[1],reason,reporterId:c.uid,created_at:now()});
        return {ok:true};
      }
      break;
    case 'comments':
      need(c);
      if(method==='PUT')await fs.updateDoc(commentRef(c,seg[1]),{text:commentText(body),updatedAt:now()});
      else await fs.deleteDoc(commentRef(c,seg[1]));
      return {ok:true};
    case 'admin':
      if(seg[1]==='reports')return latest(c,'reports',200);
      if(seg[1]==='audit')return latest(c,'audit',200);
      if(seg[1]==='backups')return method==='POST'?backup(c):{items:[]};
  }
  throw fail('この機能は利用できません。',404);
}

window.cruiseApi=async function(path,method='GET',body){
  try{return await handle(path,method,body)}
  catch(e){
    if(e.code==='permission-denied')throw fail('この操作は許可されていません。',403);
    if(e.code==='unavailable')throw fail('通信できませんでした。');
    throw e;
  }
};
window.cruiseSignIn=async function(){
  if(!configured)return notify('ログイン機能（Firebase）が未設定です。');
  try{
    const c=await load();
    await c.authM.signInWithPopup(c.auth,new c.authM.GoogleAuthProvider());
    location.reload();
  }catch(e){
    if(!/popup-closed|cancelled-popup/.test(e.code||''))notify('ログインできませんでした。もう一度お試しください。');
  }
};
/* Email + password sign-in for visitors without a Google account.
   mode: 'login' | 'register'. Resolves to '' on success or a message to show. */
const AUTH_ERRORS={
  'auth/invalid-email':'メールアドレスの形式をご確認ください。',
  'auth/missing-password':'パスワードを入力してください。',
  'auth/weak-password':'パスワードは6文字以上にしてください。',
  'auth/email-already-in-use':'このメールアドレスは登録済みです。「ログイン」をお試しください。',
  'auth/invalid-credential':'メールアドレスかパスワードが違います。',
  'auth/wrong-password':'メールアドレスかパスワードが違います。',
  'auth/user-not-found':'メールアドレスかパスワードが違います。',
  'auth/too-many-requests':'試行回数が多すぎます。しばらくしてからお試しください。',
  'auth/operation-not-allowed':'メールでのログインは現在ご利用いただけません。',
  'auth/network-request-failed':'通信できませんでした。'
};
window.cruiseEmailSignIn=async function(email,password,mode){
  if(!configured)return 'ログイン機能（Firebase）が未設定です。';
  try{
    const c=await load();
    if(mode==='register')await c.authM.createUserWithEmailAndPassword(c.auth,email,password);
    else await c.authM.signInWithEmailAndPassword(c.auth,email,password);
    location.reload();
    return '';
  }catch(e){return AUTH_ERRORS[e.code]||'ログインできませんでした。もう一度お試しください。'}
};
window.cruiseResetPassword=async function(email){
  if(!configured)return 'ログイン機能（Firebase）が未設定です。';
  try{
    const c=await load();
    c.auth.languageCode='ja';
    await c.authM.sendPasswordResetEmail(c.auth,email);
    return '';
  }catch(e){return AUTH_ERRORS[e.code]||'メールを送信できませんでした。'}
};
window.cruiseSignOut=async function(){
  if(!configured)return;
  const c=await load();
  await c.authM.signOut(c.auth);
  location.reload();
};
if(configured)load().catch(()=>{});
})();
