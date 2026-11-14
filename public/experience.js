/* Quiet, non-blocking interaction and recoverable writing. */
const reduceMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const tabPositions=new Map();
const originalGo=go;
go=function(next){if(next===tab){window.scrollTo({top:0,behavior:reduceMotion()?'auto':'smooth'});return}tabPositions.set(tab,window.scrollY);tab=next;render();window.scrollTo({top:tabPositions.get(next)||0,behavior:'instant'});const main=$('#main');main.dataset.page=next;if(!reduceMotion())main.animate([{opacity:.5,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:170,easing:'ease-out'});const heading=main.querySelector('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true})}};
let activeDraftKey=null,draftGeneration=0,draftCleared=false,draftTimer;
const draftMemory=new Map();
let draftDB;
function openDraftDB(){return draftDB??=new Promise((resolve,reject)=>{const request=indexedDB.open('jc-writing-drafts-'+data.userId,1);request.onupgradeneeded=()=>request.result.createObjectStore('drafts');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
async function writeDraft(key,value){draftMemory.set(key,value);try{const db=await openDraftDB();await new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}catch{const note=$('#draftstatus');if(note)note.textContent='入力はこの画面に保持しています。端末への一時保存は利用できません。'}}
async function readDraft(key){if(draftMemory.has(key))return draftMemory.get(key);try{const db=await openDraftDB();return await new Promise((resolve,reject)=>{const req=db.transaction('drafts').objectStore('drafts').get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}catch{return null}}
function captureDraft(){if(!activeDraftKey||draftCleared)return;const fields={};$('#modal').querySelectorAll('input:not([type=file]),textarea,select').forEach(el=>{if(el.id)fields[el.id]=el.value});const value={fields,photos:activeDraftKey==='savePost(event)'?[...postPhotos]:null,photo:activeDraftKey.startsWith('saveMemory(')?photoData:null};writeDraft(activeDraftKey,value);const status=$('#draftstatus');if(status)status.textContent='下書きはこの端末に一時保存します。閉じても続きから書けます。'}
function clearActiveDraft(){clearTimeout(draftTimer);draftCleared=true;if(activeDraftKey)writeDraft(activeDraftKey,null);activeDraftKey=null}
const originalModal=modal;
modal=function(html){captureDraft();const generation=++draftGeneration;draftCleared=false;activeDraftKey=null;originalModal(html);const form=$('#modal form'),signature=form?.getAttribute('onsubmit')||'';if(/^(savePost|saveMemory|addComment)\(/.test(signature)){activeDraftKey=signature;const key=signature;const status=document.createElement('p');status.id='draftstatus';status.className='draft-status';status.setAttribute('role','status');status.textContent='下書きはこの端末に一時保存します。';form.append(status);readDraft(key).then(value=>{if(!value||generation!==draftGeneration||key!==activeDraftKey||form.dataset.touched)return;for(const [id,valueText]of Object.entries(value.fields||{})){const field=document.getElementById(id);if(field)field.value=valueText}if(key==='savePost(event)'&&value.photos){postPhotos=value.photos;updateDraftPhotos()}if(key.startsWith('saveMemory(')&&value.photo){photoData=value.photo;$('#photopreview').innerHTML=`<img class="uploadpreview" src="${photoData}" alt="下書きの写真">`}status.textContent='前回の下書きを戻しました。続きから書けます。'});form.addEventListener('input',()=>{form.dataset.touched='true';captureDraft()});form.addEventListener('change',()=>{form.dataset.touched='true';captureDraft()})}if(!reduceMotion())$('#modal').animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:170,easing:'ease-out'})};
const originalClose=closeModal;
closeModal=function(){captureDraft();activeDraftKey=null;++draftGeneration;originalClose()};
$('#dialog').addEventListener('cancel',()=>{captureDraft();activeDraftKey=null;++draftGeneration});
window.addEventListener('pagehide',captureDraft);
document.addEventListener('visibilitychange',()=>{if(document.hidden)captureDraft()});
const originalUpdatePhotos=updateDraftPhotos;
updateDraftPhotos=function(){originalUpdatePhotos();if(!photosLoading)captureDraft()};
const originalLoadPhoto=loadPhoto;
loadPhoto=async function(input){await originalLoadPhoto(input);const area=$('#photopreview');if(!area)return;const watch=new MutationObserver(()=>{captureDraft();watch.disconnect()});watch.observe(area,{childList:true});setTimeout(()=>watch.disconnect(),15000)};
// Keep the primary action within reach while writing; no additional confirmation step.
document.addEventListener('click',event=>{const button=event.target.closest('button');if(button&&!button.disabled&&!reduceMotion()){button.animate([{filter:'brightness(.94)'},{filter:'brightness(1)'}],{duration:130})}},true);
