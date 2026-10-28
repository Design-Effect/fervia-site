(function(){
  var root=document.documentElement, reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine=matchMedia('(pointer:fine)').matches, small=innerWidth<720;

  // Titre : entrée en douceur une fois les polices prêtes
  var go=function(){root.classList.add('ready')};
  (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(go);
  setTimeout(go,900);

  // En-tête et menu
  var hd=document.getElementById('hd'), mb=document.getElementById('menuBtn');
  mb.addEventListener('click',function(){var o=hd.classList.toggle('open');mb.setAttribute('aria-expanded',o)});
  document.querySelectorAll('.mnav a').forEach(function(a){a.addEventListener('click',function(){hd.classList.remove('open');mb.setAttribute('aria-expanded',false)})});

  // Interrupteur clair / sombre : mémorise le choix, prime sur le système.
  var themeBtn=document.getElementById('themeBtn'), metaTC=document.querySelector('meta[name="theme-color"]');
  function syncTheme(t){
    root.setAttribute('data-theme',t);
    if(metaTC) metaTC.setAttribute('content',t==='dark'?'#0E2A31':'#F5F8F8');
    if(themeBtn) themeBtn.setAttribute('aria-label',t==='dark'?'Passer en mode clair':'Passer en mode sombre');
  }
  syncTheme(root.getAttribute('data-theme')||'light');
  if(themeBtn){
    themeBtn.addEventListener('click',function(){
      var next=(root.getAttribute('data-theme')==='dark')?'light':'dark';
      if(!reduce) root.classList.add('theme-anim');
      try{localStorage.setItem('fervia-theme',next)}catch(e){}
      syncTheme(next);
      clearTimeout(themeBtn._t); themeBtn._t=setTimeout(function(){root.classList.remove('theme-anim')},400);
    });
  }
  // Suivre le système tant qu'aucun choix manuel n'est mémorisé
  var mq=window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)');
  if(mq){var onSys=function(e){var s;try{s=localStorage.getItem('fervia-theme')}catch(x){} if(s!=='dark'&&s!=='light') syncTheme(e.matches?'dark':'light')};
    mq.addEventListener?mq.addEventListener('change',onSys):mq.addListener&&mq.addListener(onSys);}

  // Défilement : en-tête, et le premier écran qui s'éloigne en profondeur
  var heroEl=document.querySelector('.hero'), heroTxt=document.getElementById('heroTxt'), sceneWrap=document.getElementById('sceneWrap');
  var scrollP=0, heroH=1, ticking=false, stepsEl=document.querySelector('.steps');
  function measure(){
    heroH=heroEl?heroEl.offsetHeight||1:1;
    if(stepsEl) stepsEl.style.setProperty('--run',Math.max(0,stepsEl.offsetWidth*.92-12)+'px');
  }
  function paint(){
    ticking=false;
    if(!heroTxt||!sceneWrap) return; // pages de fond : pas de premier écran animé
    heroTxt.style.transform='translate3d(0,'+(scrollP*36)+'px,0)';
    // 28/10, retour d'AbduLlah : le texte s'effaçait trop tôt ; il reste plein jusqu'à 35 % du défilement du héros, puis s'efface en douceur jusqu'à 85 %
    var f=Math.max(0,Math.min(1,(scrollP-.35)/.5)); heroTxt.style.opacity=String(1-f*f*(3-2*f));
    sceneWrap.style.transform='translate3d(0,'+(scrollP*40)+'px,0) scale('+(1-scrollP*.12)+')';
  }
  function onScroll(){
    hd.classList.toggle('scrolled',scrollY>12);
    scrollP=Math.max(0,Math.min(1,scrollY/heroH));
    if(!reduce&&!ticking){ticking=true;requestAnimationFrame(paint)}
  }
  measure(); addEventListener('resize',function(){measure();onScroll()}); addEventListener('load',function(){measure();onScroll()});
  addEventListener('scroll',onScroll,{passive:true}); onScroll();

  // Apparitions en profondeur au défilement
  var rv=document.querySelectorAll('.rv');
  if('IntersectionObserver' in window&&!reduce){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px 10% 0px'});
    rv.forEach(function(el){io.observe(el)});
  } else rv.forEach(function(el){el.classList.add('in')});

  // Cartes en relief : inclinaison et reflet qui suivent la souris
  if(fine&&!reduce){
    document.querySelectorAll('.tilt').forEach(function(el){
      el.addEventListener('pointermove',function(e){
        var r=el.getBoundingClientRect(), x=(e.clientX-r.left)/r.width, y=(e.clientY-r.top)/r.height;
        el.style.transition='transform .12s linear, box-shadow .4s';
        el.style.transform='rotateY('+((x-.5)*7)+'deg) rotateX('+((.5-y)*6)+'deg) translateY(-4px)';
        el.style.setProperty('--gx',(x*100)+'%'); el.style.setProperty('--gy',(y*100)+'%');
      });
      el.addEventListener('pointerleave',function(){el.style.transition='transform .2s cubic-bezier(.23,1,.32,1), box-shadow .4s';el.style.transform=''});
    });
  }

  if(!window.THREE){var sc=document.getElementById('scene'); if(sc) sc.classList.add('fallback'); return}
  var T=THREE, C=function(x){return new T.Color(x).convertSRGBToLinear()};
  var mx=0,my=0,tx=0,ty=0;
  if(fine) addEventListener('pointermove',function(e){tx=(e.clientX/innerWidth-.5)*2;ty=(e.clientY/innerHeight-.5)*2},{passive:true});

  function makeRenderer(opts){
    var r;
    try{r=new T.WebGLRenderer(Object.assign({antialias:true,alpha:true},opts||{}))}catch(err){return null}
    r.outputEncoding=T.sRGBEncoding; r.toneMapping=T.ACESFilmicToneMapping; r.toneMappingExposure=1.08;
    return r;
  }
  function makeEnv(r){
    var pm=new T.PMREMGenerator(r), env=new T.Scene();
    env.add(new T.Mesh(new T.SphereGeometry(20,32,16),new T.MeshBasicMaterial({color:C(0xcfe2e2),side:T.BackSide})));
    [[16,9,-9,10,8,0xffffff],[10,12,11,3,6,0xf3fbfa],[18,5,0,-8,-9,0xb9e3dd],[8,8,-12,-2,-6,0xdbe9f5]].forEach(function(b){
      var m=new T.Mesh(new T.PlaneGeometry(b[0],b[1]),new T.MeshBasicMaterial({color:C(b[5]),side:T.DoubleSide}));
      m.position.set(b[2],b[3],b[4]); m.lookAt(0,0,0); env.add(m);
    });
    var tex=pm.fromScene(env,.035).texture; pm.dispose(); return tex;
  }
  function lights(scene,k){
    scene.add(new T.HemisphereLight(0xffffff,0xb9d6d3,.55));
    var d=new T.DirectionalLight(0xffffff,k||1.1); d.position.set(-4,7,8); scene.add(d);
    var r2=new T.DirectionalLight(0xd6f2ee,.5); r2.position.set(6,-2,-4); scene.add(r2);
    return d;
  }
  function gl(ns,o){if(!('IntersectionObserver' in window))return 0;ns=[].concat(ns);var vu=new Set();var io=new IntersectionObserver(function(es){es.forEach(function(e){e.isIntersecting?vu.add(e.target):vu.delete(e.target)});o.vis=vu.size>0;o.vis?o.start():o.stop()});ns.forEach(function(n){io.observe(n)})}
  function loop(fn){
    var o={on:false,raf:0,last:0,t:0};
    function f(now){var dt=Math.max(0,Math.min(.05,(now-o.last)/1000));o.last=now;o.t+=dt;fn(o.t,dt);if(o.on&&!reduce)o.raf=requestAnimationFrame(f)}
    o.start=function(){if(!o.on){o.on=true;o.last=performance.now();o.raf=requestAnimationFrame(f)}};
    o.stop=function(){o.on=false;cancelAnimationFrame(o.raf)};
    o.once=function(t){o.t=t;fn(t,0)};
    document.addEventListener('visibilitychange',function(){document.hidden?o.stop():(o.vis!==false&&o.start())});
    return o;
  }
  function roundedRect(w,h,r){var s=new T.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s}
  function slab(w,h,r,d,mat){var g=new T.ExtrudeGeometry(roundedRect(w,h,r),{depth:d,bevelEnabled:true,bevelThickness:Math.min(.03,d/3),bevelSize:Math.min(.03,r/3),bevelSegments:3,curveSegments:10});g.translate(0,0,-d/2);return new T.Mesh(g,mat)}
  function glossy(hex,o){return new T.MeshPhysicalMaterial(Object.assign({color:C(hex),roughness:.22,metalness:.04,clearcoat:1,clearcoatRoughness:.1},o||{}))}

  // --- La flamme : tracé d'origine du logo, lu tel quel ---
  var FLAME_D=["M567.317,347.521c35.36,50.817 49.883,138.235 17.301,204.89c-10.528,21.539 -26.089,44.373 -62.525,45.458c-42.8,1.275 -74.178,-48.506 -42.145,-88.042c30.053,-37.091 101.649,-54.984 87.369,-162.306Zm12.31,53.537c-5.963,35.591 -23.875,57.951 -43.408,75.76c-16.657,15.186 -34.89,26.477 -46.558,40.878c-24.577,30.333 -0.777,68.657 32.06,67.679c30.356,-0.904 42.895,-20.508 51.667,-38.453c22.104,-45.221 21.055,-100.62 6.239,-145.864Z","M490.391,237.971c-4.47,-3.855 111.996,76.729 40.025,155.3c-132.885,145.073 -57.458,199.556 -57.434,201.171c0.037,2.55 -142.56,-86.1 -36.644,-208.904c50.451,-58.495 74.523,-129.911 54.053,-147.567Zm-50.877,312.108c-2.892,-33.918 10.638,-87.687 81.685,-165.251c27.653,-30.189 22.608,-60.738 9.17,-84.896c-6.058,-10.892 -13.714,-20.584 -21.093,-28.559c-4.631,32.481 -27.498,80.619 -63.472,122.329c-26.092,30.251 -36.05,58.06 -36.107,82.744c-0.071,30.149 14.197,55.289 29.817,73.633Z"];
  var FC={x:501,y:418}, FS=.0155;
  function parseD(d){
    var tk=d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g), i=0, cx=0, cy=0, sx=0, sy=0, cmd='', subs=[], cur=null;
    function n(){return parseFloat(tk[i++])}
    while(i<tk.length){
      if(/^[a-zA-Z]$/.test(tk[i])){cmd=tk[i++]; if(cmd==='Z'||cmd==='z'){cx=sx;cy=sy;continue}}
      if(cmd==='M'){cx=n();cy=n();sx=cx;sy=cy;cur=[{x:cx,y:cy}];subs.push(cur);cmd='L'}
      else if(cmd==='m'){cx+=n();cy+=n();sx=cx;sy=cy;cur=[{x:cx,y:cy}];subs.push(cur);cmd='l'}
      else if(cmd==='c'){var a=[cx+n(),cy+n(),cx+n(),cy+n(),cx+n(),cy+n()];cur.push({c:a});cx=a[4];cy=a[5]}
      else if(cmd==='C'){var b=[n(),n(),n(),n(),n(),n()];cur.push({c:b});cx=b[4];cy=b[5]}
      else if(cmd==='l'){cx+=n();cy+=n();cur.push({l:[cx,cy]})}
      else if(cmd==='L'){cx=n();cy=n();cur.push({l:[cx,cy]})}
      else i++;
    }
    return subs;
  }
  var X=function(x){return (x-FC.x)*FS}, Y=function(y){return -(y-FC.y)*FS};
  function flameShapes(){
    return FLAME_D.map(function(d){
      var shape=null;
      parseD(d).forEach(function(sub,k){
        var p=k===0?new T.Shape():new T.Path();
        p.moveTo(X(sub[0].x),Y(sub[0].y));
        for(var j=1;j<sub.length;j++){var s=sub[j]; if(s.c)p.bezierCurveTo(X(s.c[0]),Y(s.c[1]),X(s.c[2]),Y(s.c[3]),X(s.c[4]),Y(s.c[5])); else p.lineTo(X(s.l[0]),Y(s.l[1]))}
        if(k===0)shape=p; else shape.holes.push(p);
      });
      return shape;
    });
  }
  var FPATHS=FLAME_D.map(function(d){return new Path2D(d)}), fctx=document.createElement('canvas').getContext('2d');
  function inFlame(x,y){for(var i=0;i<FPATHS.length;i++) if(fctx.isPointInPath(FPATHS[i],x,y,'evenodd')) return true; return false}
  function sampleFlame(n,depth){var out=new Float32Array(n*3);for(var i=0;i<n;i++){var x,y;do{x=388+Math.random()*226;y=226+Math.random()*384}while(!inFlame(x,y));out[i*3]=X(x);out[i*3+1]=Y(y);out[i*3+2]=(Math.random()-.5)*depth}return out}
  function gradientColors(geo,stops){
    geo.computeBoundingBox(); var bb=geo.boundingBox, pos=geo.attributes.position, col=new Float32Array(pos.count*3), c=new T.Color();
    for(var i=0;i<pos.count;i++){
      var t=(pos.getY(i)-bb.min.y)/(bb.max.y-bb.min.y);
      if(t<stops[1][0]) c.copy(stops[0][1]).lerp(stops[1][1],t/stops[1][0]); else c.copy(stops[1][1]).lerp(stops[2][1],(t-stops[1][0])/(1-stops[1][0]));
      col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;
    }
    geo.setAttribute('color',new T.BufferAttribute(col,3));
  }

  // --- 1. Premier écran : la flamme numérique ---
  (function(){
    var host=document.getElementById('scene');
    if(!host) return; // pas de flamme sur les pages de fond
    var renderer=makeRenderer();
    if(!renderer){host.classList.add('fallback');return}
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
    renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);
    var scene=new T.Scene(), camera=new T.PerspectiveCamera(28,1,.1,100);
    camera.position.set(0,1.1,17); camera.lookAt(0,-.25,0);
    scene.environment=makeEnv(renderer);
    var key=lights(scene,1.15); key.castShadow=true; key.shadow.mapSize.set(1024,1024); key.shadow.radius=10; key.shadow.bias=-.0004;
    var sc=key.shadow.camera; sc.left=-7; sc.right=7; sc.top=7; sc.bottom=-7; sc.near=1; sc.far=40;
    var glow=new T.PointLight(C(0x2BB7AD),0,9,2); glow.position.set(0,.4,2.4); scene.add(glow);

    var DEPTH=.34, shapes=flameShapes();
    var fGeo=new T.ExtrudeGeometry(shapes,{depth:DEPTH,bevelEnabled:true,bevelThickness:.07,bevelSize:.03,bevelSegments:5,curveSegments:36});
    fGeo.translate(0,0,-DEPTH/2);
    gradientColors(fGeo,[[0,C(0x07414A)],[.5,C(0x0F8E89)],[1,C(0x74DCCB)]]);
    var fMat=new T.MeshPhysicalMaterial({vertexColors:true,roughness:.14,metalness:.06,clearcoat:1,clearcoatRoughness:.05,emissive:C(0x14A39A),emissiveIntensity:0,transparent:true,opacity:0});
    var flame=new T.Mesh(fGeo,fMat); flame.castShadow=true;
    var mark=new T.Group(); mark.add(flame);
    var rig=new T.Group(); rig.add(mark); scene.add(rig);

    // contours lumineux avant et arrière : la touche « numérique »
    var lineMat=new T.LineBasicMaterial({color:C(0x7FE3D3),transparent:true,opacity:0}), outlines=new T.Group();
    shapes.forEach(function(s){
      [s].concat(s.holes).forEach(function(p){
        var pts=p.getPoints(90);
        [DEPTH/2+.08,-DEPTH/2-.08].forEach(function(z){
          var g=new T.BufferGeometry().setFromPoints(pts.map(function(v){return new T.Vector3(v.x,v.y,z)}));
          outlines.add(new T.LineLoop(g,lineMat));
        });
      });
    });
    mark.add(outlines);
    var echo=outlines.clone(); var echoMat=lineMat.clone(); echo.traverse(function(o){if(o.isLine)o.material=echoMat}); mark.add(echo);

    // barre de balayage qui parcourt la flamme
    var scan=new T.Mesh(new T.BoxGeometry(4.1,.03,1.1),new T.MeshBasicMaterial({color:C(0x5FD6C6),transparent:true,opacity:0,depthWrite:false}));
    mark.add(scan);

    // socle numérique
    var BASE=-3.55;
    var plat=new T.Mesh(new T.CylinderGeometry(3.3,3.5,.2,96),glossy(0xF2F8F8,{roughness:.42,clearcoat:.5,clearcoatRoughness:.3}));
    plat.position.y=BASE; plat.receiveShadow=true; scene.add(plat);
    var gp=[],k,a;
    for(k=1;k<=4;k++){var rr=k*.76;for(a=0;a<96;a++){var a0=a/96*Math.PI*2,a1=(a+1)/96*Math.PI*2;gp.push(Math.cos(a0)*rr,0,Math.sin(a0)*rr,Math.cos(a1)*rr,0,Math.sin(a1)*rr)}}
    for(a=0;a<24;a++){var aa=a/24*Math.PI*2;gp.push(Math.cos(aa)*.76,0,Math.sin(aa)*.76,Math.cos(aa)*3.04,0,Math.sin(aa)*3.04)}
    var gGeo=new T.BufferGeometry(); gGeo.setAttribute('position',new T.Float32BufferAttribute(gp,3));
    var grid=new T.LineSegments(gGeo,new T.LineBasicMaterial({color:C(0x0E7C86),transparent:true,opacity:.2})); grid.position.y=BASE+.105; scene.add(grid);
    var rim=new T.Mesh(new T.RingGeometry(3.18,3.26,128),new T.MeshBasicMaterial({color:C(0x14A39A),transparent:true,opacity:.55,side:T.DoubleSide}));
    rim.rotation.x=-Math.PI/2; rim.position.y=BASE+.106; scene.add(rim);
    var wave=new T.Mesh(new T.RingGeometry(.92,1,128),new T.MeshBasicMaterial({color:C(0x14A39A),transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}));
    wave.rotation.x=-Math.PI/2; wave.position.y=BASE+.11; scene.add(wave);

    // particules qui se rassemblent en flamme
    var N=small?900:1800, to=sampleFlame(N,DEPTH+.2), from=new Float32Array(N*3), cur=new Float32Array(N*3), delay=new Float32Array(N), n;
    for(n=0;n<N;n++){var dv=new T.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize().multiplyScalar(6+Math.random()*5);from[n*3]=dv.x;from[n*3+1]=dv.y;from[n*3+2]=dv.z;cur.set([dv.x,dv.y,dv.z],n*3);delay[n]=Math.random()*.9}
    var pGeo=new T.BufferGeometry(); pGeo.setAttribute('position',new T.BufferAttribute(cur,3));
    var pMat=new T.PointsMaterial({color:C(0x0E8A8C),size:.055,transparent:true,opacity:.95,depthWrite:false});
    var cloud=new T.Points(pGeo,pMat); mark.add(cloud);

    // pixels qui s'envolent en continu, et éclats à chaque impulsion
    var EM=small?90:170, ep=new Float32Array(EM*3), ev=new Float32Array(EM*3), el=new Float32Array(EM), ec=new Float32Array(EM*3), seeds=sampleFlame(EM*4,DEPTH);
    for(n=0;n<EM;n++){ep[n*3+1]=-99;el[n]=-Math.random()*3}
    var eGeo=new T.BufferGeometry(); eGeo.setAttribute('position',new T.BufferAttribute(ep,3)); eGeo.setAttribute('color',new T.BufferAttribute(ec,3));
    var embers=new T.Points(eGeo,new T.PointsMaterial({size:.07,vertexColors:true,depthWrite:false})); scene.add(embers);
    var BG=C(0xEEF5F4), HOT=C(0x14A39A), WHITE=C(0xFFFFFF), tmp=new T.Color(), wp=new T.Vector3();
    function spawn(n,burst){
      var s=Math.floor(Math.random()*EM*4)*3; wp.set(seeds[s],seeds[s+1],seeds[s+2]); if(!burst&&wp.y<-.4) wp.y=Math.abs(wp.y)*.6;
      mark.localToWorld(wp); ep[n*3]=wp.x;ep[n*3+1]=wp.y;ep[n*3+2]=wp.z;
      var spd=burst?2.4+Math.random()*2.6:.35+Math.random()*.7, ang=Math.random()*Math.PI*2;
      ev[n*3]=burst?Math.cos(ang)*spd*.6:(Math.random()-.5)*.25; ev[n*3+1]=burst?1+Math.random()*3:spd; ev[n*3+2]=burst?Math.sin(ang)*spd*.5+.8:(Math.random()-.5)*.2;
      el[n]=burst?.9+Math.random()*.6:1.6+Math.random()*1.6;
    }

    var orbs=[], cols=[0xA7DCD3,0xC7DDF0,0xFFFFFF];
    for(var i=0;i<3;i++){
      var om=new T.Mesh(new T.SphereGeometry(i===2?.34:.28,48,32),glossy(cols[i],{roughness:.18})); om.castShadow=true; om.visible=false; scene.add(om);
      orbs.push({m:om,r:[4.2,4.7,3.9][i],sp:[.22,-.17,.27][i],ph:[0,2.1,4.2][i],tilt:[.35,-.5,.2][i],el:document.querySelector('.orb-label[data-orb="'+i+'"]')});
    }

    var W=0,H=0,next=4.6,lastP=-10, bar=document.getElementById('forgeBar'), pct=document.getElementById('forgePct'), v=new T.Vector3();
    function size(){W=host.clientWidth;H=host.clientHeight;if(!W||!H)return;renderer.setSize(W,H,false);camera.aspect=W/H;camera.position.z=W/H<1.3?21.5:17;camera.updateProjectionMatrix()}
    size(); addEventListener('resize',size);
    var ease=function(x){return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2};

    var L=loop(function(t,dt){
      mx+=(tx-mx)*.05; my+=(ty-my)*.05;
      rig.rotation.y=-.38+Math.sin(t*.32)*.24+mx*.36+scrollP*1.3;
      rig.rotation.x=.03+Math.sin(t*.27)*.04+my*.12;
      rig.position.y=Math.sin(t*.7)*.12+scrollP*1.1;
      rig.position.z=-scrollP*5;

      // assemblage
      var asm=Math.min(1,t/2.6);
      if(cloud.visible){
        for(var n=0;n<N;n++){var p=ease(Math.max(0,Math.min(1,(t-delay[n])/1.7)));cur[n*3]=from[n*3]+(to[n*3]-from[n*3])*p;cur[n*3+1]=from[n*3+1]+(to[n*3+1]-from[n*3+1])*p;cur[n*3+2]=from[n*3+2]+(to[n*3+2]-from[n*3+2])*p}
        pGeo.attributes.position.needsUpdate=true;
        pMat.opacity=t<2.6?.95:Math.max(0,.95-(t-2.6)*1.6);
        if(t>3.3)cloud.visible=false;
      }
      var op=Math.max(0,Math.min(1,(t-1.6)/1.1));
      fMat.opacity=op; if(op>=1&&fMat.transparent){fMat.transparent=false;fMat.needsUpdate=true}
      lineMat.opacity=op*.7;
      var heat=t<2.4?op*.9:Math.max(0,.9*Math.exp(-(t-2.4)*1.1));
      if(bar){bar.style.transform='scaleX('+asm+')';pct.textContent=Math.round(asm*100)+' %'}

      // impulsion régulière : éclat, écho du contour, balayage, onde au sol, éclats de pixels
      if(t>next){lastP=t;next=t+5.2;for(var b=0,c=0;b<EM&&c<70;b++){if(el[b]<=0){spawn(b,true);c++}}}
      var ds=t-lastP, kk=Math.max(0,1-ds/.28);
      mark.scale.set(1+.016*kk,1-.03*kk,1+.016*kk);
      var flash=Math.exp(-ds*3.2)*.55;
      fMat.emissiveIntensity=Math.max(heat,flash); glow.intensity=Math.max(heat,flash)*2.4;
      var ew=Math.min(1,ds/1.2); echo.scale.setScalar(1+ew*.14); echoMat.opacity=ds<1.2?(1-ew)*.8:0;
      var sp=(t%4.2)/2.4; scan.position.y=-3.1+sp*6.2; scan.material.opacity=sp<1&&t>3?Math.sin(sp*Math.PI)*.55:0;
      var wv=Math.min(1,ds/1.4); wave.scale.setScalar(1+wv*3); wave.material.opacity=ds<1.4?(1-wv)*.7:0;
      rim.material.opacity=.4+.3*Math.exp(-ds*2);

      for(n=0;n<EM;n++){
        if(el[n]<=0){el[n]+=dt; if(el[n]>0&&t>3)spawn(n,false); else if(el[n]>0) el[n]=-Math.random(); continue}
        el[n]-=dt; ev[n*3+1]-=(ev[n*3+1]>1.5?4:-.15)*dt;
        ep[n*3]+=ev[n*3]*dt+Math.sin(t*2+n)*.002; ep[n*3+1]+=ev[n*3+1]*dt; ep[n*3+2]+=ev[n*3+2]*dt;
        var life=Math.min(1,el[n]/1.2);
        tmp.copy(BG).lerp(life>.7?WHITE:HOT,Math.min(1,life*1.5));
        ec[n*3]=tmp.r;ec[n*3+1]=tmp.g;ec[n*3+2]=tmp.b;
        if(el[n]<=0){ep[n*3+1]=-99;el[n]=-Math.random()*.8}
      }
      eGeo.attributes.position.needsUpdate=true; eGeo.attributes.color.needsUpdate=true;

      orbs.forEach(function(o){
        var ang=o.ph+t*o.sp, ap=Math.max(0,Math.min(1,(t-2.8)/.8));
        o.m.visible=ap>0; o.m.scale.setScalar(ap||.001);
        o.m.position.set(Math.cos(ang)*o.r,Math.sin(ang)*o.r*.3*Math.sign(o.tilt)+o.tilt+.3,Math.sin(ang)*o.r*.8);
        o.m.position.y+=rig.position.y; o.m.position.z+=rig.position.z;
        if(o.el){
          if(W<=520||!ap||scrollP>.5){o.el.style.opacity=0;return}
          v.copy(o.m.position).project(camera);
          var x=(v.x*.5+.5)*W+host.offsetLeft, y=(-v.y*.5+.5)*H+host.offsetTop, front=o.m.position.z>-.5+rig.position.z;
          o.el.style.transform='translate('+(x+18)+'px,'+(y-16)+'px) scale('+(front?1:.9)+')';
          o.el.style.opacity=(front?1:.35)*ap;
        }
      });
      renderer.render(scene,camera);
    });
    if(reduce){cloud.visible=false;L.once(6);return}
    L.start(); gl(host,L);
  })();

  // --- 2. Profondeur : des objets 3D derrière la page, qui défilent à des vitesses différentes ---
  (function(){
    var cv=document.getElementById('depth'), renderer=makeRenderer({canvas:cv});
    if(!renderer) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
    var scene=new T.Scene(), FOV=35, CZ=12, cam=new T.PerspectiveCamera(FOV,1,.1,60); cam.position.z=CZ;
    scene.environment=makeEnv(renderer); lights(scene,1);
    var geos=[new T.TorusGeometry(.55,.19,32,96),new T.SphereGeometry(.5,48,32),new T.TorusKnotGeometry(.42,.13,180,24),new T.OctahedronGeometry(.62,0),new T.IcosahedronGeometry(.62,1),new T.CylinderGeometry(.42,.42,.9,48)];
    var mats=[glossy(0xFFFFFF),glossy(0xA7DCD3),glossy(0x14A39A,{roughness:.16}),glossy(0xC7DDF0)];
    var wire=new T.LineBasicMaterial({color:C(0x0E7C86),transparent:true,opacity:.35});
    var objs=[], dust=null, upp=1;
    function build(){
      objs.forEach(function(o){scene.remove(o.m)}); objs=[]; if(dust)scene.remove(dust);
      var vh=innerHeight, vw=innerWidth; upp=2*CZ*Math.tan(FOV/2*Math.PI/180)/vh;
      var docH=document.documentElement.scrollHeight, heroH=(heroEl||document.querySelector(".phero")||{offsetHeight:0}).offsetHeight, count=small?10:22, halfW=vw/2*upp;
      for(var k=0;k<count;k++){
        var z=-(1.5+((k*37)%11)/11*6), docY=heroH*.85+(k+.5)*(docH-heroH)/count, side=k%2?1:-1, persp=(CZ-z)/CZ;
        var gi=k%geos.length, m;
        if(gi===4) m=new T.LineSegments(new T.EdgesGeometry(geos[gi]),wire); else m=new T.Mesh(geos[gi],mats[k%mats.length]);
        m.position.set(side*halfW*persp*(.8+((k*53)%7)/7*.25),-docY*upp,z);
        m.scale.setScalar(.8+((k*29)%5)/5*.7);
        m.rotation.set(k,k*.7,k*.3); scene.add(m);
        objs.push({m:m,rx:.1+((k*17)%7)/7*.25,ry:.12+((k*13)%5)/5*.3,by:docY*upp,ph:k});
      }
      var D=small?260:700, dp=new Float32Array(D*3);
      for(var i=0;i<D;i++){dp[i*3]=(Math.random()-.5)*halfW*3;dp[i*3+1]=-Math.random()*docH*upp;dp[i*3+2]=-1-Math.random()*9}
      var dg=new T.BufferGeometry(); dg.setAttribute('position',new T.BufferAttribute(dp,3));
      dust=new T.Points(dg,new T.PointsMaterial({color:C(0x7CC9BD),size:.035,transparent:true,opacity:.55,depthWrite:false})); scene.add(dust);
    }
    function size(){renderer.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();build()}
    size(); var rt; addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(size,200)}); setTimeout(size,1500);
    var L=loop(function(t){
      mx+=(tx-mx)*.04; my+=(ty-my)*.04;
      cam.position.y=-scrollY*upp-my*.15; cam.position.x=mx*.25;
      objs.forEach(function(o){o.m.rotation.x+=o.rx*.012;o.m.rotation.y+=o.ry*.012;o.m.position.y=-o.by+Math.sin(t*.6+o.ph)*.12});
      renderer.render(scene,cam);
    });
    if(reduce){L.once(0);addEventListener('scroll',function(){L.once(0)},{passive:true});return}
    L.start(); gl(document.body,L);
  })();

  // --- 3. Scènes 3D dans les cartes et le contact (une seule toile au-dessus de la page) ---
  (function(){
    var cv=document.getElementById('fx'), renderer=makeRenderer({canvas:cv});
    if(!renderer) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75)); renderer.setClearColor(0,0); renderer.autoClear=false;
    var env=makeEnv(renderer), views=[];
    // Détacher les objets blancs du fond : arêtes teal franches et ombre portée douce derrière (le dessin ne change pas)
    function edges(m,op){m.add(new T.LineSegments(new T.EdgesGeometry(m.geometry,35),new T.LineBasicMaterial({color:C(0x0A5F68),transparent:true,opacity:op||.6})))}
    var shTex=(function(){var c=document.createElement('canvas');c.width=c.height=128;var x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(5,38,44,1)');g.addColorStop(.55,'rgba(5,38,44,.55)');g.addColorStop(1,'rgba(5,38,44,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new T.CanvasTexture(c)})();
    function shadow(s,w,h,x,y,z,op){var m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:shTex,transparent:true,opacity:op||.5,depthWrite:false}));m.position.set(x,y,z);s.add(m);return m}
    function view(name,camZ,build){
      var el=document.querySelector('[data-view="'+name+'"]'); if(!el) return;
      var scene=new T.Scene(); scene.environment=env; lights(scene,1.05);
      var cam=new T.PerspectiveCamera(32,1,.1,50); cam.position.set(0,0,camZ);
      views.push({el:el,scene:scene,cam:cam,upd:build(scene,cam)});
    }

    // le site qui se construit
    view('web',6.4,function(s){
      var g=new T.Group(); s.add(g);
      var panel=slab(3.2,2.1,.16,.08,glossy(0xFFFFFF,{roughness:.3})); g.add(panel);
      var ghost=slab(3.2,2.1,.16,.05,new T.MeshPhysicalMaterial({color:C(0xA7DCD3),transparent:true,opacity:.5,roughness:.4})); edges(ghost,.45); edges(panel,.7); shadow(s,4.6,3.4,.3,-.35,-1.1,.55); ghost.position.set(.45,.3,-.55); g.add(ghost);
      [-1.38,-1.25,-1.12].forEach(function(x){var d=new T.Mesh(new T.SphereGeometry(.04,16,12),glossy(0xC5D6D6));d.position.set(x,.88,.07);g.add(d)});
      var specs=[[2.8,.1,.62,0xD8E4E4],[1.9,.26,.3,0x12323A],[1.6,.09,.02,0xD8E4E4],[1.2,.09,-.16,0xD8E4E4],[.9,.3,-.56,0x0E7C86]], blocks=[];
      specs.forEach(function(p){var m=slab(p[0],p[1],Math.min(.06,p[1]/2.2),.03,glossy(p[3],{roughness:.25}));var piv=new T.Group();piv.position.set(-1.4,p[2],.06);m.position.x=p[0]/2;edges(m,.4);piv.add(m);g.add(piv);blocks.push(piv)});
      var cursor=new T.Mesh(new T.TorusGeometry(.08,.022,12,40),glossy(0x0E7C86)); g.add(cursor);
      return function(t){
        var c=t%6;
        blocks.forEach(function(b,i){var st=.3+i*.35,p=Math.max(0,Math.min(1,(c-st)/.5));if(c>4.8)p=Math.max(0,1-(c-4.8)/.5);b.scale.set(Math.max(.001,p),1,1);b.position.z=.06+p*.08});
        var cp=Math.max(0,Math.min(1,(c-2.2)/.7)); cursor.position.set(1.1-cp*2.05,.7-cp*1.26,.3);
        var press=c>2.95&&c<3.2; blocks[4].scale.z=press?.4:1;
        g.rotation.y=-.38+Math.sin(t*.5)*.14+mx*.1; g.rotation.x=.2+Math.sin(t*.4)*.05; g.position.y=Math.sin(t*.9)*.06;
      };
    });

    // l'application qui défile
    view('mobile',6,function(s){
      var g=new T.Group(); s.add(g);
      g.add(slab(1.25,2.5,.2,.12,glossy(0x12323A,{roughness:.2})));
      var tc=document.createElement('canvas'); tc.width=256; tc.height=1024; var x=tc.getContext('2d');
      x.fillStyle='#F4FAF9'; x.fillRect(0,0,256,1024);
      for(var r=0;r<10;r++){var y=12+r*101; x.fillStyle='#FFFFFF'; x.beginPath(); x.roundRect?x.roundRect(14,y,228,86,16):x.rect(14,y,228,86); x.fill(); x.fillStyle=r%3===0?'#0E7C86':'#8FD3C7'; x.beginPath(); x.arc(52,y+43,16,0,7); x.fill(); x.fillStyle='#C5D6D6'; x.fillRect(84,y+28,120-(r%3)*20,10); x.fillStyle='#D8E4E4'; x.fillRect(84,y+50,90+(r%2)*40,8)}
      var tex=new T.CanvasTexture(tc); tex.encoding=T.sRGBEncoding; tex.wrapT=T.RepeatWrapping; tex.repeat.set(1,.48);
      var screen=new T.Mesh(new T.PlaneGeometry(1.08,2.28),new T.MeshBasicMaterial({map:tex})); screen.position.z=.105; g.add(screen);
      var notch=slab(.32,.06,.03,.02,glossy(0x0E2A31)); notch.position.set(0,1.06,.12); g.add(notch);
      var nc=document.createElement('canvas'); nc.width=512; nc.height=128; var y2=nc.getContext('2d');
      y2.fillStyle='#FFFFFF'; y2.fillRect(0,0,512,128); y2.fillStyle='#0E7C86'; y2.beginPath(); y2.arc(60,64,18,0,7); y2.fill(); y2.fillStyle='#12323A'; y2.font='700 46px Manrope, sans-serif'; y2.fillText('Nouvelle commande',100,80);
      var nt=new T.CanvasTexture(nc); nt.encoding=T.sRGBEncoding;
      var note=new T.Group(); var card=slab(1.6,.4,.12,.05,glossy(0xFFFFFF,{roughness:.3})); edges(card,.7); note.add(card); shadow(s,2.6,3.6,.25,-.3,-1,.5);
      var face=new T.Mesh(new T.PlaneGeometry(1.5,.37),new T.MeshBasicMaterial({map:nt,transparent:true})); face.position.z=.04; note.add(face);
      note.position.set(.75,.55,.5); g.add(note);
      return function(t,dt){
        tex.offset.y-=dt*.05;
        var c=t%7, p=c<2.2?0:c<2.7?(c-2.2)/.5:c<5.6?1:Math.max(0,1-(c-5.6)/.5);
        note.scale.setScalar(Math.max(.001,p)); note.position.z=.3+p*.35;
        g.rotation.y=Math.sin(t*.45)*.5-.2+mx*.1; g.rotation.x=.1+Math.sin(t*.35)*.05; g.position.y=Math.sin(t*.8)*.05;
      };
    });

    // le réseau d'un agent IA
    view('ai',5.4,function(s){
      var g=new T.Group(); s.add(g);
      var ico=new T.IcosahedronGeometry(1.3,2), eg=new T.EdgesGeometry(ico,1);
      g.add(new T.LineSegments(eg,new T.LineBasicMaterial({color:C(0x0E7C86),transparent:true,opacity:.28})));
      g.add(new T.Points(ico,new T.PointsMaterial({color:C(0x0E7C86),size:.032})));
      shadow(s,4,4,.2,-.25,-1.4,.4);
      var core=new T.Mesh(new T.SphereGeometry(.46,48,32),glossy(0x14A39A,{emissive:C(0x2BC4B8),emissiveIntensity:.15})); g.add(core);
      var ring=new T.Mesh(new T.TorusGeometry(1.75,.012,8,160),new T.MeshBasicMaterial({color:C(0x8FD3C7)})); ring.rotation.x=1.2; g.add(ring);
      var sat=new T.Mesh(new T.SphereGeometry(.07,16,12),glossy(0x0E7C86)); g.add(sat);
      var E=eg.attributes.position.array, ne=E.length/6, PN=12, pp=new Float32Array(PN*3), pulses=[];
      for(var i=0;i<PN;i++) pulses.push({e:Math.floor(Math.random()*ne),t:Math.random(),v:.6+Math.random()*.8});
      var pg=new T.BufferGeometry(); pg.setAttribute('position',new T.BufferAttribute(pp,3));
      g.add(new T.Points(pg,new T.PointsMaterial({color:C(0x2BC4B8),size:.075})));
      return function(t,dt){
        pulses.forEach(function(p,i){p.t+=dt*p.v;if(p.t>1){p.t=0;p.e=Math.floor(Math.random()*ne)}var o=p.e*6;pp[i*3]=E[o]+(E[o+3]-E[o])*p.t;pp[i*3+1]=E[o+1]+(E[o+4]-E[o+1])*p.t;pp[i*3+2]=E[o+2]+(E[o+5]-E[o+2])*p.t});
        pg.attributes.position.needsUpdate=true;
        core.material.emissiveIntensity=.15+(Math.sin(t*2.2)*.5+.5)*.35; core.scale.setScalar(1+Math.sin(t*2.2)*.04);
        var a=t*.9; sat.position.set(Math.cos(a)*1.75,Math.sin(a)*1.75*Math.cos(1.2),Math.sin(a)*1.75*Math.sin(1.2));
        g.rotation.y=t*.25+mx*.2; g.rotation.x=.25+my*.1;
      };
    });

    // la bande de données entre deux sections
    view('wave',4.2,function(s,cam){
      cam.position.set(0,1.45,4.2); cam.lookAt(0,0,-.6);
      var NX=small?80:150, NZ=34, P=NX*NZ, pos=new Float32Array(P*3), col=new Float32Array(P*3);
      var geo=new T.BufferGeometry(); geo.setAttribute('position',new T.BufferAttribute(pos,3)); geo.setAttribute('color',new T.BufferAttribute(col,3));
      s.add(new T.Points(geo,new T.PointsMaterial({size:.034,vertexColors:true})));
      var lo=C(0x0E7C86), hi=C(0x8FE8DA), bgc=C(0xFFFFFF), c=new T.Color();
      return function(t){
        var w=cam.aspect*2.6, i=0;
        for(var ix=0;ix<NX;ix++)for(var iz=0;iz<NZ;iz++,i++){
          var x=(ix/(NX-1)-.5)*w*1.4, z=-iz*.14+.6, y=Math.sin(x*1.1+t*1.1)*.2+Math.cos(z*1.7+t*.8)*.16+Math.sin((x+z)*.6-t*.6)*.1;
          pos[i*3]=x;pos[i*3+1]=y;pos[i*3+2]=z;
          var fade=Math.min(1,iz/4)*Math.min(1,(NZ-1-iz)/10)*Math.min(1,Math.min(ix,NX-1-ix)/(NX*.12));
          c.copy(lo).lerp(hi,Math.max(0,Math.min(1,y*2+.5))); c.lerp(bgc,1-fade);
          col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;
        }
        geo.attributes.position.needsUpdate=true; geo.attributes.color.needsUpdate=true;
      };
    });

    // le globe : Wavre, et les liens qui en partent
    view('globe',7.2,function(s){
      var g=new T.Group(); s.add(g); var R=1.6, D=small?900:1600, gp=new Float32Array(D*3);
      for(var i=0;i<D;i++){var y=1-(i/(D-1))*2,r=Math.sqrt(1-y*y),th=i*2.399963;gp[i*3]=Math.cos(th)*r*R;gp[i*3+1]=y*R;gp[i*3+2]=Math.sin(th)*r*R}
      var dg=new T.BufferGeometry(); dg.setAttribute('position',new T.BufferAttribute(gp,3));
      g.add(new T.Points(dg,new T.PointsMaterial({color:C(0x8FD3C7),size:.028,transparent:true,opacity:.8,blending:T.AdditiveBlending,depthWrite:false})));
      g.add(new T.Mesh(new T.SphereGeometry(R*.985,48,32),new T.MeshBasicMaterial({color:C(0x0E2A31)})));
      s.add(new T.Mesh(new T.SphereGeometry(R*1.12,48,32),new T.MeshBasicMaterial({color:C(0x8FD3C7),transparent:true,opacity:.06,side:T.BackSide})));
      function ll(lat,lon,rad){var ph=(90-lat)*Math.PI/180,th=(lon+180)*Math.PI/180;return new T.Vector3(-rad*Math.sin(ph)*Math.cos(th),rad*Math.cos(ph),rad*Math.sin(ph)*Math.sin(th))}
      var home=ll(50.72,4.6,R);
      var beacon=new T.Mesh(new T.SphereGeometry(.055,16,12),new T.MeshBasicMaterial({color:C(0xBFF5EC)})); beacon.position.copy(home); g.add(beacon);
      var ring=new T.Mesh(new T.RingGeometry(.07,.09,48),new T.MeshBasicMaterial({color:C(0x8FE8DA),transparent:true,side:T.DoubleSide,blending:T.AdditiveBlending,depthWrite:false}));
      ring.position.copy(home); ring.lookAt(home.clone().multiplyScalar(2)); g.add(ring);
      var spikeG=new T.BufferGeometry().setFromPoints([home,home.clone().multiplyScalar(1.22)]); g.add(new T.Line(spikeG,new T.LineBasicMaterial({color:C(0x8FE8DA)})));
      var arcs=[], targets=[[48.85,2.35],[51.5,-.12],[52.37,4.9],[50.11,8.68],[45.46,9.19],[40.42,-3.7],[46.2,6.14]];
      targets.forEach(function(tg,k){
        var b=ll(tg[0],tg[1],R), mid=home.clone().add(b).multiplyScalar(.5).normalize().multiplyScalar(R*1.35);
        var curve=new T.QuadraticBezierCurve3(home,mid,b), pts=curve.getPoints(60);
        var ag=new T.BufferGeometry().setFromPoints(pts); var line=new T.Line(ag,new T.LineBasicMaterial({color:C(0x8FE8DA),transparent:true,opacity:.7,blending:T.AdditiveBlending,depthWrite:false}));
        g.add(line); arcs.push({g:ag,ph:k*.55});
      });
      var fx0=Math.atan2(home.x,home.z);
      return function(t){
        arcs.forEach(function(a){var p=((t*.35+a.ph)%2.4)/1.6;a.g.setDrawRange(p<1?0:Math.floor((p-1)*61*1.6),Math.floor(Math.min(1,p)*61))});
        var pr=(t*1.1)%1; ring.scale.setScalar(1+pr*3); ring.material.opacity=1-pr;
        g.rotation.y=-fx0+Math.sin(t*.25)*.5+mx*.2; g.rotation.x=.75+my*.08;
      };
    });

    if(!views.length) return;
    root.classList.add('fx-on');
    function size(){renderer.setSize(innerWidth,innerHeight)}
    size(); addEventListener('resize',size);
    // Préparer les shaders des cartes pendant un temps mort, pas à leur première apparition au défilement
    // (à-coup mesuré au téléphone le 27/10 : 1 % bas à 25 i/s sur la toile des cartes).
    var prep=function(){views.forEach(function(v){try{renderer.compile(v.scene,v.cam)}catch(e){}})};
    ('requestIdleCallback' in window)?requestIdleCallback(prep,{timeout:2000}):setTimeout(prep,600);
    var L=loop(function(t,dt){
      renderer.setScissorTest(false); renderer.clear(); renderer.setScissorTest(true);
      var vh=innerHeight;
      views.forEach(function(v){
        var r=v.el.getBoundingClientRect();
        if(r.bottom<0||r.top>vh||r.width<2) return;
        var y=vh-r.bottom; renderer.setViewport(r.left,y,r.width,r.height); renderer.setScissor(r.left,y,r.width,r.height);
        v.cam.aspect=r.width/r.height; v.cam.updateProjectionMatrix(); v.upd(t,dt); renderer.render(v.scene,v.cam);
      });
    });
    if(reduce){L.once(2);addEventListener('scroll',function(){L.once(2)},{passive:true});return}
    L.start(); gl(views.map(function(v){return v.el}),L);
  })();

  // Confirmation d'envoi : FormSubmit renvoie vers /?envoye=1#contact
  try{
    var ok=document.getElementById('envoye');
    if(ok&&/(^|[?&])envoye=1(&|$)/.test(location.search)) ok.hidden=false;
  }catch(e){}
})();
