/* Port guide: loaded only when opened. Location remains in memory, never in account state. */
const portMapState={guide:null,guidePromise:null,portId:'hakodate',filter:'all',selectedId:null,map:null,container:null,pins:null,routeLayer:null,routeOriginLayer:null,userLayer:null,location:null,route:null,request:0,locateRequest:0,locating:false,abort:null,busy:false,benefitDemo:false};
function portCategoryIcon(kind){const paths={food:'<path d="M6 3v6m-3-6v4a3 3 0 0 0 6 0V3M6 10v11M18 3c-3 3-4 8 0 9v9m0-18v9"/>',sightseeing:'<path d="m3 21 5-13 4 7 3-5 6 11ZM6 4h.01"/><circle cx="17" cy="5" r="2"/>',shopping:'<path d="M4 8h16l-1 13H5ZM8 8V6a4 4 0 0 1 8 0v2"/>',bus:'<rect x="5" y="3" width="14" height="16" rx="4"/><path d="M5 11h14M8 19v2m8-2v2M9 15h.01M15 15h.01M9 6h6"/>',port:'<path d="M4 14l8-3 8 3-2 5H6ZM7 12V6h10v6M12 6V2M3 21q3-3 6 0 3-3 6 0 3-3 6 0"/>'};return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind]||paths.sightseeing}</svg>`}
const portCategories={food:{name:'食事',symbol:portCategoryIcon('food')},sightseeing:{name:'観光スポット',symbol:portCategoryIcon('sightseeing')},shopping:{name:'買い物',symbol:portCategoryIcon('shopping')},bus:{name:'バス停',symbol:portCategoryIcon('bus')},port:{name:'港',symbol:portCategoryIcon('port')}};
function canUsePortMap(){return onboard()&&previewMode}
function onboardMapEntry(){return canUsePortMap()?`<button class="port-map-entry" onclick="go('portMap')"><span class="port-map-entry-icon" aria-hidden="true">${icon('compass')}</span><span><small>寄港地を、もっと楽しむ</small><strong>寄港地マップをひらく</strong><span>おすすめスポット・ぐるっとバス・港への帰り方</span></span>${icon('arrow')}</button>`:''}
function portMapCurrent(){return portMapState.guide?.ports.find(p=>p.id===portMapState.portId)}
function portMapCoords(point){return [point.lat,point.lng]}
function portMapDistance(a,b){const rad=x=>x*Math.PI/180;const x=rad(b.lat-a.lat),y=rad(b.lng-a.lng);const h=Math.sin(x/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(y/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)))}
function portReturnEstimate(guide,spot,stop){if(!spot||!stop)return null;const walk=Math.ceil(spot.walkMetersToStop/guide.walkMetersPerMinute);const portWalk=Math.ceil(stop.walkMetersAtPort/guide.walkMetersPerMinute);return {walk,portWalk,bus:stop.busMinutesToPort,wait:stop.headwayMinutes,total:walk+portWalk+stop.busMinutesToPort+stop.headwayMinutes,buffer:guide.returnBufferMinutes}}
function portBenefit(spot){if(spot.benefit?.verified&&(!spot.benefit.expiresOn||spot.benefit.expiresOn>=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'})))return spot.benefit;if(portMapState.benefitDemo&&previewMode&&spot.id===portMapCurrent()?.spots.find(s=>s.category==='food')?.id)return {label:'特典あり（表示例）',description:'提携店の特典をここに表示します。このスポットで利用できる特典ではありません。',demo:true};return null}
function portMapPage(){
 if(!canUsePortMap())return `<section class="empty"><h1>寄港地マップ</h1><p>乗船中にご利用いただけます。</p><button onclick="go('home')">ホームへ戻る</button></section>`;
 const guide=portMapState.guide,p=portMapCurrent();
 return `<section class="port-guide"><div class="port-guide-heading"><div><h1>寄港地マップ</h1><span class="port-map-sample">バス停・時間は設定例</span></div><button class="textbtn" onclick="go('home')">← ホーム</button></div>${!guide?'<p role="status">地図とスポットを準備しています…</p>':`<div class="port-map-toolbar" aria-label="マップの操作"><div class="port-map-tools"><div class="port-picker"><label for="port-map-port">寄港地</label><select id="port-map-port" onchange="changePortMap(this.value)">${guide.ports.map(port=>`<option value="${port.id}" ${port.id===p.id?'selected':''}>${port.name}</option>`).join('')}</select></div><button id="port-nearest-button" class="primary" onclick="findNearestPortBus()" aria-label="最寄りのバス停への徒歩ルートを検索（確認用）">近くのバス停に行く ${icon('arrow')}</button><button class="port-fit-button" onclick="fitPortMap()" aria-label="港と全スポットを表示">街の全体</button><button class="port-country-button" onclick="showAllCruisePorts()">全国の寄港地</button></div><div class="port-map-filters" role="group" aria-label="地図のカテゴリ">${[['all','すべて'],['food','食事'],['sightseeing','観光スポット'],['shopping','買い物'],['bus','バス停'],['benefit','特典あり']].map(([key,label])=>`<button type="button" data-port-filter="${key}" aria-pressed="${portMapState.filter===key}" onclick="filterPortMap('${key}')">${label}</button>`).join('')}</div></div><div class="port-map-frame"><div id="port-map-canvas" class="port-map-canvas" role="region" aria-label="${esc(p.name)}の港・おすすめスポット・確認用バス停の地図"><span class="port-map-loading" role="status">地図を読み込んでいます…</span></div><div id="port-map-error" class="port-map-error" role="status" hidden></div><div id="port-route-result" class="port-route-result" role="status" aria-live="polite" hidden></div><section id="port-selected" class="port-selected" aria-label="選んだスポットの詳細" hidden></section><button id="port-locate-button" class="port-locate-button" onclick="locatePortUser()" aria-label="仮の現在地を表示（検証用）" title="仮の現在地を表示（検証用）"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg><span>現在地</span></button></div><div class="port-map-footnote"><p id="port-location-note" aria-live="polite">現在地は検証用の仮位置です · ダブルタップで拡大</p><button class="textbtn" onclick="showPortMapHelp()">運行・現在地について</button></div><div class="port-map-legend" aria-label="ピンの見分け方">${Object.entries(portCategories).map(([key,c])=>`<span><b class="port-pin-key pin-${key}">${c.symbol}</b>${c.name}${key==='bus'?'（仮）':''}</span>`).join('')}<span class="port-benefit-badge">特典あり</span></div><div class="port-spots-heading"><div><h2 id="port-spots-title">周辺のおすすめスポット</h2><p id="port-spots-count"></p></div><button class="textbtn" onclick="showPortGuideSources()">情報・写真の出典</button></div><div id="port-spots-list" class="port-spots-list"></div><details class="port-guide-settings"><summary>表示例・移動時間の計算について</summary><p>帰港目安＝設定したバス停までの徒歩＋運行間隔1本分の待ち時間＋港までのバス乗車＋港内の徒歩。さらに${guide.returnBufferMinutes}分の余裕をおすすめします。</p><label class="check"><input type="checkbox" ${portMapState.benefitDemo?'checked':''} onchange="togglePortBenefitDemo(this.checked)">特典ピンの表示例を見る（実際の特典なし）</label><p>ピンは施設の代表地点です。情報確認：${guide.updatedAt}。写真は撮影時点のものです。</p></details>`}</section>`
}
async function loadPortGuide(){if(portMapState.guide)return portMapState.guide;if(!portMapState.guidePromise)portMapState.guidePromise=fetch('port-guide.json?v=port-3').then(r=>{if(!r.ok)throw Error('スポット情報を読み込めませんでした。');return r.json()}).then(guide=>{portMapState.guide=guide;return guide}).catch(e=>{portMapState.guidePromise=null;throw e});return portMapState.guidePromise}
let portLeafletPromise;
function loadPortLeaflet(){if(window.L)return Promise.resolve(window.L);if(!portLeafletPromise)portLeafletPromise=new Promise((resolve,reject)=>{if(!document.getElementById('port-leaflet-css')){const css=document.createElement('link');css.id='port-leaflet-css';css.rel='stylesheet';css.href='vendor/leaflet.css?v=1.9.4';document.head.append(css)}const script=document.createElement('script');script.src='vendor/leaflet.js?v=1.9.4';script.onload=()=>resolve(window.L);script.onerror=()=>{script.remove();portLeafletPromise=null;reject(Error('地図を読み込めませんでした。スポット一覧からも詳細を確認できます。'))};document.head.append(script)});return portLeafletPromise}
function disposePortMap(){stopPortNavigation();portMapState.request++;portMapState.locateRequest++;portMapState.abort?.abort();portMapState.abort=null;portMapState.busy=false;portMapState.locating=false;if(portMapState.map)portMapState.map.remove();portMapState.map=null;portMapState.container=null;portMapState.pins=null;portMapState.routeLayer=null;portMapState.routeOriginLayer=null;portMapState.userLayer=null;portMapState.location=null;portMapState.route=null}
async function syncPortMap(){const existing=portMapState.container;if(existing&&!existing.isConnected)disposePortMap();if(tab!=='portMap'||!canUsePortMap())return;if(!portMapState.guide){try{await loadPortGuide();if(tab==='portMap'&&canUsePortMap())render()}catch(error){if(tab==='portMap'){const page=document.querySelector('.port-guide');if(page)page.innerHTML='<h1>寄港地マップ</h1><p>'+esc(error.message)+'</p><button onclick="render()">もう一度読み込む</button>'}}return}const container=document.getElementById('port-map-canvas');if(!container||container===portMapState.container)return;portMapState.container=container;renderPortRecommendations();try{const L=await loadPortLeaflet();if(!container.isConnected||tab!=='portMap'||container!==portMapState.container)return;container.innerHTML='';const map=L.map(container,{scrollWheelZoom:false,doubleClickZoom:true,touchZoom:true,zoomControl:true,minZoom:4,maxZoom:19});portMapState.map=map;const tiles=L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png',{maxZoom:19,maxNativeZoom:18,attribution:'出典：<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">国土地理院・地理院タイル</a>'}).addTo(map);let loaded=0;tiles.on('tileload',()=>{loaded++;const error=document.getElementById('port-map-error');if(error)error.hidden=true});tiles.on('tileerror',()=>{if(!loaded)portMapError('地図の背景を取得できません。スポット一覧と外部地図をご利用ください。')});portMapState.pins=L.layerGroup().addTo(map);drawPortPins();fitPortMap();portDemoLocation();map.on('zoomend',()=>{drawPortPins();container.classList.toggle('port-map-close',map.getZoom()>=15)});if(portMapState.selectedId)selectPortSpot(portMapState.selectedId,false)}catch(error){portMapError(error.message)}}
function portMapError(message){const node=document.getElementById('port-map-error');if(node){node.textContent=message;node.hidden=false}}
function drawCruisePortButtons(){const map=portMapState.map;for(const port of portMapState.guide.ports){const markerIcon=L.divIcon({className:'cruise-port-marker',iconSize:[116,44],iconAnchor:map.getSize().x<600?({hakodate:[58,38],akita:[72,10],kanazawa:[155,32],yokohama:[15,10],nagasaki:[95,37],kagoshima:[10,0]}[port.id]||[58,22]):({nagasaki:[72,35],kagoshima:[44,10]}[port.id]||[58,22]),html:`<span class="cruise-port-pill">${portCategoryIcon('port')}<b>${esc(port.name)}</b><span>›</span></span>`});L.marker(portMapCoords(port.port),{icon:markerIcon,title:port.name+'の地図を見る',alt:port.name+'の地図を見る'}).on('add',function(){this.getElement()?.setAttribute('aria-label',port.name+'の地図を見る')}).addTo(portMapState.pins).on('click',()=>focusCruisePort(port.id))}}
function focusCruisePort(id){if(id===portMapState.portId){closePortSelection();hidePortRoutePanel();fitPortMap();return}changePortMap(id)}
function showAllCruisePorts(){if(!portMapState.map)return;portMapState.request++;portMapState.abort?.abort();setPortRouteBusy(false);closePortSelection();clearPortRoute();portRouteStatus('');portMapState.map.invalidateSize({pan:false});portMapState.map.fitBounds(L.latLngBounds(portMapState.guide.ports.map(p=>portMapCoords(p.port))),{padding:[65,55],maxZoom:6});const note=document.getElementById('port-location-note');if(note)note.textContent='寄港地名のボタンを押すと、その街の地図が開きます。'}
function changePortMap(id){if(!portMapState.guide?.ports.some(p=>p.id===id))return;disposePortMap();portMapState.portId=id;portMapState.filter='all';portMapState.selectedId=null;render()}
function filterPortMap(filter){if(!['all','food','sightseeing','shopping','bus','benefit'].includes(filter))return;portMapState.filter=filter;document.querySelectorAll('[data-port-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.portFilter===filter)));drawPortPins();renderPortRecommendations()}
function togglePortBenefitDemo(value){portMapState.benefitDemo=!!value;drawPortPins();renderPortRecommendations();if(portMapState.selectedId)selectPortSpot(portMapState.selectedId,false)}
function visiblePortSpots(){const p=portMapCurrent();if(!p)return [];const f=portMapState.filter;return p.spots.filter(s=>f==='all'||f===s.category||f==='benefit'&&portBenefit(s))}
function portMarkerIcon(point,kind,index){const category=portCategories[kind],benefit=kind!=='bus'&&kind!=='port'&&portBenefit(point);return L.divIcon({className:'port-marker',iconSize:[42,46],iconAnchor:kind==='bus'?[0,26]:kind==='port'?[43,43]:[21,43],html:`<span class="port-marker-head pin-${kind}"><b>${category.symbol}</b>${benefit?`<small class="port-marker-benefit">${benefit.demo?'特典例':'特典'}</small>`:''}</span>`})}
function drawPortPins(){if(!portMapState.map||!portMapState.pins)return;const p=portMapCurrent();portMapState.pins.clearLayers();if(portMapState.map.getZoom()<=8){drawCruisePortButtons();return}L.marker(portMapCoords(p.port),{icon:portMarkerIcon(p.port,'port'),title:p.port.name,alt:p.port.name,zIndexOffset:500}).on('add',function(){this.getElement()?.setAttribute('aria-label',p.port.name)}).addTo(portMapState.pins).bindTooltip('港（参考地点）',{permanent:true,direction:'top',offset:[0,-40],className:'port-map-label port-label-always'}).on('click',()=>showPortTerminal());p.stops.forEach((stop,index)=>{L.marker(portMapCoords(stop),{icon:portMarkerIcon(stop,'bus',index+1),title:'確認用バス停 '+stop.name,alt:'確認用バス停 '+stop.name,zIndexOffset:300}).on('add',function(){this.getElement()?.setAttribute('aria-label','確認用バス停 '+stop.name)}).addTo(portMapState.pins).bindTooltip(`B${index+1} ${esc(stop.name)}（仮）`,{permanent:true,direction:'top',offset:[0,-40],className:'port-map-label'}).on('click',()=>selectPortStop(stop.id))});visiblePortSpots().forEach(spot=>{const index=p.spots.indexOf(spot)+1;L.marker(portMapCoords(spot),{icon:portMarkerIcon(spot,spot.category,index),title:spot.name,alt:spot.name}).on('add',function(){this.getElement()?.setAttribute('aria-label',spot.name)}).addTo(portMapState.pins).bindTooltip(esc(spot.name),{permanent:true,direction:'top',offset:[0,-40],className:'port-map-label'}).on('click',()=>selectPortSpot(spot.id))})}
function fitPortMap(){if(!portMapState.map)return;const p=portMapCurrent();portMapState.map.fitBounds(L.latLngBounds([p.port,...p.stops,...p.spots].map(portMapCoords)),{padding:[42,55],maxZoom:15});portMapState.map.invalidateSize()}
function portEstimateHtml(spot){const guide=portMapState.guide,p=portMapCurrent(),stop=p.stops.find(s=>s.id===spot.stopId),e=portReturnEstimate(guide,spot,stop);if(!e)return '';return `<div class="port-return-estimate"><span>港までの目安 <small>設定例</small></span><strong>約${e.total}分</strong><small>徒歩${e.walk}分（設定${spot.walkMetersToStop}m）＋待ち最大${e.wait}分＋バス${e.bus}分＋港内徒歩${e.portWalk}分</small><small>さらに${e.buffer}分の余裕を。実際の時刻表とは連動していません。</small></div>`}
function portPhoto(spot,className=''){return spot.photo?`<img class="${className}" src="${esc(spot.photo.src)}" alt="${esc(spot.name)}（撮影時点の写真）" loading="lazy" decoding="async" onerror="this.hidden=true">`:`<div class="port-photo-empty ${className}">${portCategories[spot.category].name}<small>写真は準備中</small></div>`}
function renderPortRecommendations(){const node=document.getElementById('port-spots-list');if(!node)return;const p=portMapCurrent(),filter=portMapState.filter;document.getElementById('port-spots-title').textContent=filter==='bus'?'ぐるっとバス停（確認用）':'周辺のおすすめスポット';const spots=visiblePortSpots();document.getElementById('port-spots-count').textContent=filter==='bus'?`${p.stops.length}か所 · 実際の乗降地点は未確認`:`${spots.length}件 · ピンやカードを押すと詳しく見られます`;if(filter==='bus'){node.innerHTML=p.stops.map((stop,index)=>`<button class="port-stop-card" onclick="selectPortStop('${stop.id}')"><b class="port-pin-key pin-bus">B${index+1}</b><span><strong>${esc(stop.name)}</strong><small>仮乗降地点 · 港までバス${stop.busMinutesToPort}分（設定例）</small></span>${icon('arrow')}</button>`).join('');return}node.innerHTML=spots.length?spots.map(spot=>{const benefit=portBenefit(spot);return `<button class="port-spot-card" onclick="selectPortSpot('${spot.id}')">${portPhoto(spot)}<span class="port-spot-card-body"><span class="port-spot-kind"><b class="port-pin-key pin-${spot.category}">${portCategories[spot.category].symbol}${p.spots.indexOf(spot)+1}</b>${portCategories[spot.category].name}${benefit?`<span class="port-benefit-badge">${esc(benefit.label||'特典あり')}</span>`:''}</span><strong>${esc(spot.name)}</strong><span class="port-spot-description">${esc(spot.description)}</span>${portEstimateHtml(spot)}<span class="port-card-link">写真・詳しい情報を見る ${icon('arrow')}</span></span></button>`}).join(''):'<div class="empty"><h3>特典情報は準備中です</h3><p>確認できた特典だけを掲載します。「すべて」からおすすめスポットをご覧ください。</p></div>'}
function revealPortSelection(html){stopPortNavigation();const node=document.getElementById('port-selected');if(!node)return;node.innerHTML=html;node.hidden=false;const route=document.getElementById('port-route-result');if(route)route.hidden=true}
function routeToPortSpot(id){
 const spot=portMapCurrent()?.spots.find(item=>item.id===id);
 if(spot) return startPortRoute({locate:true,destination:spot});
}
function selectPortSpot(id,pan=true){
 const p=portMapCurrent(),spot=p?.spots.find(s=>s.id===id);if(!spot)return;portMapState.selectedId=id;const benefit=portBenefit(spot),stop=p.stops.find(s=>s.id===spot.stopId),estimate=portReturnEstimate(portMapState.guide,spot,stop);
 revealPortSelection(`<div class="port-popup-heading"><div><span class="tiny-kicker">${portCategories[spot.category].name}</span><h2>${esc(spot.name)}</h2></div><button class="port-popup-close" onclick="closePortSelection()" aria-label="スポット詳細を閉じる">×</button></div><div class="port-popup-intro">${portPhoto(spot,'port-detail-photo')}<p>${esc(spot.description)}</p></div>${benefit?`<div class="port-benefit-detail"><b>${esc(benefit.label||'特典あり')}</b><p>${esc(benefit.description)}</p></div>`:''}${estimate?`<div class="port-popup-return"><span>港までの目安 <small>設定例</small></span><strong>約${estimate.total}分</strong></div>`:''}<button class="primary port-popup-route" onclick="routeToPortSpot('${spot.id}')">このスポットへの徒歩ルート ${icon('arrow')}</button><button class="port-popup-route" onclick="routePortSpotToStop('${spot.id}')">ここからバス停へ（確認用） ${icon('arrow')}</button><details class="port-popup-more"><summary>詳しい情報・写真の出典</summary><p class="port-spot-tip">${esc(spot.tip)}</p>${portEstimateHtml(spot)}<div class="port-detail-actions"><a href="${portExternalMapUrl(spot)}" target="_blank" rel="noopener">外部地図で見る ↗</a><a href="${esc(spot.source)}" target="_blank" rel="noopener">公式情報・営業状況 ↗</a></div>${spot.photo?`<p class="port-photo-credit">写真：${esc(spot.photo.author)} · <a href="${esc(spot.photo.source)}" target="_blank" rel="noopener">Wikimedia Commons</a> · <a href="${esc(spot.photo.licenseUrl)}" target="_blank" rel="noopener">${esc(spot.photo.license)}</a>（縮小・トリミング表示）</p>`:''}</details>`);
 if(pan)centerPortPoint(spot);
 document.querySelectorAll('.port-spot-card').forEach(card=>card.classList.toggle('is-selected',card.getAttribute('onclick')===`selectPortSpot('${id}')`))
}
function closePortSelection(){portMapState.selectedId=null;const node=document.getElementById('port-selected');if(node)node.hidden=true}
function centerPortPoint(point){const map=portMapState.map;if(!map)return;map.setView(portMapCoords(point),Math.max(15,map.getZoom()),{animate:!reduceMotion()})}
function portDemoLocation(){if(portMapState.location?.demo)return portMapState.location;const map=portMapState.map,size=map.getSize(),point=map.containerPointToLatLng([size.x*.77,size.y*.23]);const location={lat:point.lat,lng:point.lng,accuracy:20,demo:true};portMapState.location=location;return location}
function selectPortStop(id){const p=portMapCurrent(),stop=p?.stops.find(s=>s.id===id);if(!stop)return;portMapState.selectedId=null;revealPortSelection(`<div class="port-popup-heading"><div><span class="tiny-kicker">ぐるっとバス · 仮乗降地点</span><h2>${esc(stop.name)}</h2></div><button class="port-popup-close" onclick="closePortSelection()" aria-label="スポット詳細を閉じる">×</button></div><p>確認用の位置です。実際のバス停ではありません。</p><div class="port-popup-return"><span>港までバス <small>設定例</small></span><strong>約${stop.busMinutesToPort}分</strong></div><p class="port-popup-small">運行間隔：${stop.headwayMinutes}分（設定例）</p><button class="primary port-popup-route" onclick="routeToPortStop('${stop.id}')">現在地からこの仮乗降地点へ</button>`);centerPortPoint(stop)}
function showPortTerminal(){const p=portMapCurrent();portMapState.selectedId=null;revealPortSelection(`<div class="port-popup-heading"><div><span class="tiny-kicker">港 · 参考地点</span><h2>${esc(p.port.name)}</h2></div><button class="port-popup-close" onclick="closePortSelection()" aria-label="スポット詳細を閉じる">×</button></div><p>この航海の着岸バースは未連携です。船内の帰船場所を確認してください。</p><a class="account-link" href="${portExternalMapUrl(p.port)}" target="_blank" rel="noopener">参考地点を外部地図で見る ↗</a>`);centerPortPoint(p.port)}
function portExternalMapUrl(point,origin){const params=new URLSearchParams(origin?{api:'1',origin:`${origin.lat},${origin.lng}`,destination:`${point.lat},${point.lng}`,travelmode:'walking'}:{api:'1',query:`${point.lat},${point.lng}`});return 'https://www.google.com/maps/'+(origin?'dir/?':'search/?')+params.toString()}
function portRouteStatus(text){const node=document.getElementById('port-route-result');if(node){node.textContent=text;node.hidden=!text;document.getElementById('port-map-canvas')?.parentElement?.classList.toggle('has-route',!!text);if(text){const selected=document.getElementById('port-selected');if(selected)selected.hidden=true}}}
function portMapLocation({allowOutsidePort=false}={}){if(portMapState.location?.demo)return Promise.resolve(portMapState.location);return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject(Error('この端末では現在地を取得できません。スポットからのルートをご利用ください。'));navigator.geolocation.getCurrentPosition(position=>{const point={lat:Number(position.coords.latitude.toFixed(5)),lng:Number(position.coords.longitude.toFixed(5)),accuracy:Math.round(position.coords.accuracy)};if(!allowOutsidePort&&point.accuracy>500)return reject(Error('現在地の精度が低いため最寄りを判断できません。屋外で再取得してください。'));if(!allowOutsidePort&&portMapDistance(point,portMapCurrent().port)>50000)return reject(Error('現在地が選んだ寄港地から離れています。寄港地を選び直すか、スポットからのルートをご利用ください。'));resolve(point)},error=>reject(Error(error.code===1?'位置情報が許可されていません。端末設定で許可するか、スポットからのルートをご利用ください。':'現在地を取得できませんでした。屋外で再度お試しください。')),{enableHighAccuracy:true,timeout:12000,maximumAge:30000})})}
let portRouteQueue=Promise.resolve(),portRouteLastTime=0;
function fetchPortWalkingRoute(from,to,signal){const task=portRouteQueue.catch(()=>{}).then(async()=>{const wait=1100-(Date.now()-portRouteLastTime);if(wait>0)await new Promise(resolve=>setTimeout(resolve,wait));if(signal.aborted)throw new DOMException('Aborted','AbortError');portRouteLastTime=Date.now();const url=`https://routing.openstreetmap.de/routed-foot/route/v1/foot/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;const response=await fetch(url,{signal});if(!response.ok)throw Error('route unavailable');const result=await response.json(),route=result.routes?.[0];if(result.code!=='Ok'||!route?.geometry?.coordinates?.length||!Number.isFinite(route.distance)||!Number.isFinite(route.duration))throw Error('route unavailable');return route});portRouteQueue=task;return task}
function setPortRouteBusy(busy){portMapState.busy=busy;const button=document.getElementById('port-nearest-button');if(button){button.disabled=busy;button.textContent=busy?'バス停を検索中…':'近くのバス停に行く →'}}
async function findNearestPortBus(){return startPortRoute({locate:true})}
async function routeToPortStop(id){return startPortRoute({locate:true,stopId:id})}
async function routePortSpotToStop(id){const spot=portMapCurrent()?.spots.find(s=>s.id===id);if(!spot)return;return startPortRoute({origin:spot,stopId:spot.stopId,originName:spot.name})}
async function startPortRoute(options){if(!canUsePortMap()||tab!=='portMap'||portMapState.busy)return;portMapState.abort?.abort();const request=++portMapState.request,controller=new AbortController();portMapState.abort=controller;setPortRouteBusy(true);clearPortRoute();portRouteStatus(options.locate?'現在地を取得しています…':'スポットからの徒歩ルートを検索しています…');const timer=setTimeout(()=>controller.abort(),30000);try{const from=options.locate?await portMapLocation():options.origin;if(request!==portMapState.request||controller.signal.aborted)return;const p=portMapCurrent();const candidates=options.destination?[options.destination]:options.stopId?p.stops.filter(s=>s.id===options.stopId):[...p.stops].sort((a,b)=>portMapDistance(from,a)-portMapDistance(from,b));const found=[];for(const stop of candidates){if(controller.signal.aborted)throw Error('ルート検索がタイムアウトしました。');try{const route=await fetchPortWalkingRoute(from,stop,controller.signal);found.push({stop,route})}catch(error){if(controller.signal.aborted)throw Error('ルート検索がタイムアウトしました。')}}if(request!==portMapState.request||tab!=='portMap')return;if(!found.length){const nearest=candidates[0];portRouteFallback(from,nearest,!!options.destination);return}found.sort((a,b)=>a.route.distance-b.route.distance);const best=found[0];if(options.locate)portMapState.location=from;portMapState.route={...best,from,isSpot:!!options.destination,originName:options.originName||'現在地',partial:found.length<candidates.length};showPortRouteResult();drawPortWalkingRoute()}catch(error){if(request===portMapState.request&&tab==='portMap')portRouteStatus(controller.signal.aborted?'検索に時間がかかっています。もう一度お試しいただくか、スポットからのルートをご利用ください。':error.message)}finally{clearTimeout(timer);if(request===portMapState.request)setPortRouteBusy(false)}}
function clearPortRoute(){stopPortNavigation();portMapState.routeLayer?.remove();portMapState.routeOriginLayer?.remove();portMapState.routeLayer=null;portMapState.routeOriginLayer=null;portMapState.route=null}
function drawPortWalkingRoute(){const r=portMapState.route,map=portMapState.map;if(!r||!map)return;map.invalidateSize({pan:false});portMapState.routeLayer=L.geoJSON(r.route.geometry,{style:{color:'#1769aa',weight:6,opacity:.9}}).addTo(map);if(r.from===portMapState.location)showPortUserPosition(portMapState.location);else portMapState.routeOriginLayer=L.circleMarker(portMapCoords(r.from),{radius:8,fillColor:'#1769aa',color:'#fff',fillOpacity:1,weight:3}).addTo(map).bindTooltip(r.originName);map.fitBounds(portMapState.routeLayer.getBounds(),{padding:[38,38],maxZoom:17})}
function showPortRouteResult(){
 const r=portMapState.route,node=document.getElementById('port-route-result');
 if(!r||!node)return;
 const walk=Math.ceil(r.route.duration/60);
 const actions='<div class="port-nav-actions"><button class="primary" onclick="beginPortNavigation(true)">GPSで案内開始</button><button onclick="beginPortNavigation()">案内をデモで試す</button></div>';
 const busTotal=r.isSpot?null:walk+r.stop.headwayMinutes+r.stop.busMinutesToPort+Math.ceil(r.stop.walkMetersAtPort/portMapState.guide.walkMetersPerMinute);
 node.hidden=false;
 document.getElementById('port-map-canvas')?.parentElement?.classList.add('has-route');
 node.innerHTML=`<div class="port-route-summary"><div class="port-popup-heading"><div><span class="port-map-sample">${r.isSpot?'スポットへのルート':'仮バス停へのルート'}${r.from.demo?' · 仮の現在地':''}</span><h3>${esc(r.stop.name)}へ 徒歩約${walk}分</h3></div><button class="port-popup-close" onclick="hidePortRoutePanel()" aria-label="経路の情報を閉じる">×</button></div>
 ${actions}<div class="route-brief"><span>約${Math.round(r.route.distance)}m${r.partial?' · 取得できた経路で比較':''}</span>${busTotal===null?'':`<strong>港まで約${busTotal}分（設定例）</strong>`}<a href="${portExternalMapUrl(r.stop,r.from)}" target="_blank" rel="noopener">Google マップで案内 ↗</a><button onclick="resetPortRoute()">ルートを消す</button></div>
 ${busTotal===null?'':`<details class="port-popup-more"><summary>帰港時間の内訳</summary><p>徒歩約${walk}分＋バス待ち最大${r.stop.headwayMinutes}分＋バス${r.stop.busMinutesToPort}分＋港内の徒歩約${Math.ceil(r.stop.walkMetersAtPort/portMapState.guide.walkMetersPerMinute)}分。運行・帰船時刻は船内でご確認ください。</p></details>`}<p class="port-route-credit"><a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noopener">FOSSGIS / OSRM</a>（© OpenStreetMap contributors）</p></div>`;
}

function portRouteFallback(from,stop,isSpot=false){const node=document.getElementById('port-route-result');if(!node)return;node.hidden=false;document.getElementById('port-map-canvas')?.parentElement?.classList.add('has-route');node.innerHTML=`<div class="port-route-summary"><div class="port-popup-heading"><h3>徒歩ルートを取得できませんでした</h3><button class="port-popup-close" onclick="hidePortRoutePanel()" aria-label="経路の情報を閉じる">×</button></div><p>「${esc(stop.name)}」への道順を外部地図で確認できます。${isSpot?'':'仮乗降地点への案内です。'}</p><a class="account-link" href="${portExternalMapUrl(stop,from)}" target="_blank" rel="noopener">Google マップで経路を確認 ↗</a></div>`}
function resetPortRoute(){clearPortRoute();portRouteStatus('');fitPortMap()}
function showPortGuideSources(){const guide=portMapState.guide,p=portMapCurrent();if(!guide||!p)return;modal(`<h2>${esc(p.name)}の情報・写真の出典</h2><p>情報確認：${guide.updatedAt}。紹介文は公式観光・施設情報をもとに編集しています。</p>${p.spots.map(spot=>`<article class="port-source-row"><h3>${esc(spot.name)}</h3><a href="${esc(spot.source)}" target="_blank" rel="noopener">施設・観光の公式情報 ↗</a>${spot.photo?`<p>写真：${esc(spot.photo.author)}<br><a href="${esc(spot.photo.source)}" target="_blank" rel="noopener">Wikimedia Commons</a> · <a href="${esc(spot.photo.licenseUrl)}" target="_blank" rel="noopener">${esc(spot.photo.license)}</a>（縮小・トリミング表示）</p>`:'<p>写真は準備中です。</p>'}</article>`).join('')}<p>バス停・移動時間・港は確認用の設定例です。位置情報は端末上で一時利用し、このサイトには保存しません。経路検索時は出発・到着座標をFOSSGISへ送信します。</p><a href="https://www.fossgis.de/datenschutzerklaerung/" target="_blank" rel="noopener">経路サービスのプライバシー情報 ↗</a>`)}

function hidePortRoutePanel(){const node=document.getElementById('port-route-result');if(node)node.hidden=true;document.getElementById('port-map-canvas')?.parentElement?.classList.remove('has-route');portMapState.map?.invalidateSize({pan:false})}
function setPortLocateBusy(busy){portMapState.locating=busy;const button=document.getElementById('port-locate-button');if(button){button.disabled=busy;button.setAttribute('aria-busy',String(busy));const label=button.querySelector('span');if(label)label.textContent=busy?'取得中':'現在地'}}
function showPortUserPosition(point){const map=portMapState.map;if(!map)return;portMapState.userLayer?.remove();const dot=L.circleMarker(portMapCoords(point),{radius:8,fillColor:'#1769aa',color:'#fff',fillOpacity:1,weight:3}).bindTooltip(point.demo?'仮の現在地（検証用）':'現在地');const layers=[dot];if(point.accuracy>0)layers.unshift(L.circle(portMapCoords(point),{radius:Math.min(point.accuracy,10000),color:'#1769aa',weight:1,fillColor:'#1769aa',fillOpacity:.09,interactive:false}));portMapState.userLayer=L.layerGroup(layers).addTo(map);document.getElementById('port-locate-button')?.classList.add('has-location')}
async function locatePortUser(){if(portNavigation){const point=portNavigation.point;if(point)portMapState.map.setView(portMapCoords(point),17);return}if(!canUsePortMap()||tab!=='portMap'||portMapState.locating)return;if(!portMapState.map){portRouteStatus('地図を準備しています。読み込み後にもう一度お試しください。');return}const request=++portMapState.locateRequest;setPortLocateBusy(true);try{const point=await Promise.resolve(portDemoLocation());if(request!==portMapState.locateRequest||tab!=='portMap'||!portMapState.map)return;showPortUserPosition(point);portMapState.map.setView(portMapCoords(point),16,{animate:!reduceMotion()});closePortSelection();portRouteStatus('');const note=document.getElementById('port-location-note');if(note)note.textContent='青い点は仮の現在地です（検証用）。'}catch(error){if(request===portMapState.locateRequest&&tab==='portMap')portRouteStatus(error.message)}finally{if(request===portMapState.locateRequest)setPortLocateBusy(false)}}
function showPortMapHelp(){modal(`<h2>寄港地マップのご案内</h2><p>${esc(portMapState.guide.transportNote)}</p><h3>現在地について</h3><p>現在は検証用です。地図を開いたときの右上付近に仮の現在地を置き、右下のボタンで青い点へ移動します。通常の経路プレビューは仮位置を使います。「GPSで案内開始」を押した場合は、終了するまで端末の位置を確認し、必要に応じて現在地から経路を検索します。「現在地から」のルート検索にもこの仮位置を使います。寄港地を変更すると仮位置を設定し直します。</p><h3>徒歩ルートについて</h3><p>「バス停へ」やスポットの案内ボタンを押すと、出発地と到着地の座標をFOSSGISの経路サービスへ送信します。</p><p>地図のピンは施設の代表地点です。入口や通行できる道、実際の帰船場所は現地でご確認ください。</p><a href="https://www.fossgis.de/datenschutzerklaerung/" target="_blank" rel="noopener">経路サービスのプライバシー情報 ↗</a>`)}

const onboardWithoutPortMap=onboardToday;
onboardToday=function(){return onboardWithoutPortMap()};

let portNavigation = null;

function portRouteSteps(route) {
  let offset = 0;
  return (route.legs || []).flatMap(leg => leg.steps || []).filter(step => step.maneuver?.location).map(step => {
    const entry = {step, offset};
    offset += step.distance || 0;
    return entry;
  });
}

function portStepText(step) {
  const {type, modifier, exit} = step.maneuver;
  const road = step.name ? `「${step.name}」を` : '';
  const turn = {'left':'左','slight left':'斜め左','sharp left':'大きく左','right':'右','slight right':'斜め右','sharp right':'大きく右'};
  if (type === 'arrive') return '目的地に到着';
  if (type === 'depart') return `${road}青いルートに沿って進む`;
  if (type === 'roundabout' || type === 'rotary') return exit ? `環状交差点の${exit}番目の出口へ` : '環状交差点を青いルートに沿って進む';
  if (modifier === 'uturn') return '安全に折り返す';
  if (turn[modifier]) return ['fork','merge','on ramp','off ramp'].includes(type) ? `${turn[modifier]}方向へ進む` : `${turn[modifier]}に曲がる`;
  return `${road}そのまま進む`;
}

function portRouteProgress(route, point) {
  const coords = route.geometry.coordinates;
  const scale = Math.cos(point.lat * Math.PI / 180);
  let total = 0, traveled = 0, nearest = Infinity;
  for (let i = 1; i < coords.length; i++) {
    const [lng, lat] = coords[i-1];
    const [nextLng, nextLat] = coords[i];
    const dx = (nextLng-lng)*scale, dy = nextLat-lat;
    const length2 = dx*dx+dy*dy;
    if (!length2) continue;
    const t = Math.max(0,Math.min(1,((point.lng-lng)*scale*dx+(point.lat-lat)*dy)/length2));
    const length = portMapDistance({lng,lat},{lng:nextLng,lat:nextLat});
    const distance = portMapDistance(point,{lng:lng+(nextLng-lng)*t,lat:lat+dy*t});
    if (distance < nearest) { nearest = distance; traveled = total+length*t; }
    total += length;
  }
  return {nearest, traveled: total ? traveled/total*route.distance : 0};
}

function stopPortNavigation(restore = false) {
  const nav = portNavigation;
  if (!nav) return;
  portNavigation = null;
  if (nav.watch != null) navigator.geolocation.clearWatch(nav.watch);
  nav.controller?.abort();
  if (restore && portMapState.route) {
    showPortRouteResult();
    if (portMapState.routeLayer) {
      portMapState.map.invalidateSize({pan:false});
      portMapState.map.fitBounds(portMapState.routeLayer.getBounds(),{padding:[38,38],maxZoom:17});
    }
  }
}

function beginPortNavigation(live = false) {
  const plan = portMapState.route;
  if (!canUsePortMap() || tab !== 'portMap' || !plan || !portMapState.map || portMapState.busy) return;
  stopPortNavigation();
  const nav = {live, steps:portRouteSteps(plan.route), index:0, traveled:0, status:'', ready:!live, lastSearch:0};
  portNavigation = nav;
  if (!live) {
    if (!nav.steps.length) nav.status = 'この経路の曲がり角情報を取得できませんでした。地図の青い線をご確認ください。';
    else movePortDemoStep(0);
    renderPortNavigation();
    return;
  }
  if (!navigator.geolocation) {
    nav.status = 'この端末ではGPSを利用できません。案内を終了してデモをお試しください。';
    renderPortNavigation();
    return;
  }
  nav.status = 'GPSの現在地を確認しています…';
  renderPortNavigation();
  nav.watch = navigator.geolocation.watchPosition(position => updatePortNavigation(nav, position), error => {
    if (portNavigation !== nav) return;
    if (error.code === 1 && nav.watch != null) {
      navigator.geolocation.clearWatch(nav.watch);
      nav.watch = null;
    }
    nav.status = '現在地を取得できません。端末の位置情報設定をご確認ください。';
    renderPortNavigation();
  }, {enableHighAccuracy:true,maximumAge:3000,timeout:15000});
}

function movePortDemoStep(delta) {
  const nav = portNavigation;
  if (!nav || nav.live || !nav.steps.length) return;
  nav.index = Math.min(nav.steps.length-1, Math.max(0,nav.index+delta));
  const entry = nav.steps[nav.index];
  const [lng,lat] = entry.step.maneuver.location;
  nav.traveled = entry.offset;
  nav.arrived = entry.step.maneuver.type === 'arrive';
  nav.point = {lat,lng,demo:true};
  showPortUserPosition(nav.point);
  renderPortNavigation();
  portMapState.map.invalidateSize({pan:false});
  portMapState.map.setView([lat,lng],17,{animate:!reduceMotion()});
}

async function updatePortNavigation(nav, position) {
  if (portNavigation !== nav || tab !== 'portMap') return;
  const {latitude:lat,longitude:lng,accuracy} = position.coords;
  const point = {lat,lng,accuracy};
  const plan = portMapState.route;
  if (accuracy > 60) {
    nav.status = 'GPSの精度が上がるまでお待ちください。';
    renderPortNavigation();
    return;
  }
  if (portMapDistance(point,plan.stop)>50000) {
    nav.status = '現在地が目的地から離れています。寄港地を確認してください。';
    renderPortNavigation();
    return;
  }
  nav.point = point;
  const progress = portRouteProgress(plan.route,point);
  const offRoute = progress.nearest > Math.max(45,accuracy*1.5);
  if (!nav.ready || offRoute) {
    if (nav.controller || Date.now()-nav.lastSearch < 25000) return;
    nav.lastSearch = Date.now();
    const controller = new AbortController();
    nav.controller = controller;
    nav.status = nav.ready ? '現在地からルートを引き直しています…' : '現在地からの徒歩ルートを検索しています…';
    renderPortNavigation();
    const timer = setTimeout(()=>controller.abort(),15000);
    try {
      const route = await fetchPortWalkingRoute(point,plan.stop,controller.signal);
      if (portNavigation !== nav) return;
      plan.route = route;
      plan.from = point;
      plan.originName = 'GPSの現在地';
      nav.steps = portRouteSteps(route);
      nav.traveled = 0;
      nav.ready = true;
      portMapState.routeLayer?.remove();
      portMapState.routeOriginLayer?.remove();
      drawPortWalkingRoute();
    } catch {
      if (portNavigation === nav) {
        nav.status = '徒歩ルートを取得できませんでした。現在地の更新後に再試行します。';
        renderPortNavigation();
      }
      return;
    } finally {
      clearTimeout(timer);
      nav.controller = null;
    }
  }
  if (nav.controller) return;
  nav.status = '';
  nav.traveled = portRouteProgress(plan.route,point).traveled;
  const [endLng,endLat] = plan.route.geometry.coordinates.at(-1);
  nav.arrived = portMapDistance(point,{lng:endLng,lat:endLat}) < Math.max(15,Math.min(30,accuracy));
  nav.index = nav.steps.findIndex(entry => entry.offset > nav.traveled+8);
  if (nav.index < 0) nav.index = Math.max(0,nav.steps.length-1);
  if (nav.arrived && nav.watch != null) {
    navigator.geolocation.clearWatch(nav.watch);
    nav.watch = null;
  }
  showPortUserPosition(point);
  portMapState.map.setView(portMapCoords(point),17,{animate:!reduceMotion()});
  renderPortNavigation();
}

function renderPortNavigation() {
  const nav = portNavigation, plan = portMapState.route;
  const node = document.getElementById('port-route-result');
  if (!node || !nav || !plan) return;
  const entry = nav.steps[nav.index];
  const remaining = Math.max(0,plan.route.distance-nav.traveled);
  const distance = entry ? Math.max(0,Math.round(entry.offset-nav.traveled)) : 0;
  const instruction = nav.status || (nav.arrived ? '目的地に到着しました' : entry?.step.maneuver.type === 'arrive' ? '目的地へ進む' : entry ? portStepText(entry.step) : '青いルートに沿って進む');
  node.hidden = false;
  document.getElementById('port-map-canvas')?.parentElement?.classList.add('has-route');
  node.innerHTML = `<div class="port-route-summary port-navigation">
    <div class="port-popup-heading"><div><span class="port-map-sample">${nav.live?'GPS徒歩案内':'案内デモ'} · ${esc(plan.stop.name)}${plan.isSpot?'':'（仮バス停）'}</span><h3>${!nav.status&&!nav.arrived&&distance>8?`${distance}m先 · `:''}${esc(instruction)}</h3></div><button onclick="stopPortNavigation(true)" aria-label="徒歩案内を終了">終了</button></div>
    <div class="route-brief"><span>${nav.arrived?'':`残り約${Math.round(remaining)}m`}</span>${!nav.live&&entry?`<button onclick="movePortDemoStep(-1)" ${nav.index===0?'disabled':''}>前へ</button><button class="primary" onclick="movePortDemoStep(1)" ${nav.index===nav.steps.length-1?'disabled':''}>次の案内 →</button>`:''}</div></div>`;
}
window.addEventListener?.('pagehide', () => stopPortNavigation());
