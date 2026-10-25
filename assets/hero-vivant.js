// Héros vivant v3 (source lisible). La page charge assets/hero-vivant.min.js, à régénérer après chaque modification :
//   npx terser assets/hero-vivant.js -c -m -f "preamble='/* Généré depuis assets/hero-vivant.js */'" -o assets/hero-vivant.min.js
//
// Le fond du héros redessiné en WebGL d'après assets/hero-bg.webp (hero-bg-mobile.webp sous 640 px) :
// dégradé bleu nuit, halo chaud en haut à gauche, poussière d'étoiles, et des rubans de lignes d'or très
// fines qui ondulent (houle lente, chaque ligne déphasée de sa voisine : le ruban se tord et respire).
// Par-dessus, les particules dorées sur trois plans, parallaxe souris ou inclinaison.
// L'image reste affichée au chargement ; le canvas, posé dans le calque de parallaxe .hero-bg, apparaît
// en fondu une fois sa première image dessinée, puis la recouvre. Sans WebGL, sans accélération graphique
// (rendu logiciel), sur 2 cœurs ou moins, si l'appareil ne tient pas la fluidité, ou en mouvement réduit :
// l'image fixe seule.
(function(){
  var mq = matchMedia('(prefers-reduced-motion: reduce)'), mqS = matchMedia('(max-width:640px)');
  if (mq.matches || navigator.hardwareConcurrency <= 2) return;
  var hero = document.querySelector('.hero'), bg = hero && hero.querySelector('.hero-bg');
  if (!bg) return;

  // Scènes, d'après l'image d'origine : [largeur, hauteur, amplitude de la houle (px), rubans, nuages de poussière, fond].
  // Ruban : [nombre de lignes, décalages des brins d'or vifs (-1 bord haut, 1 bord bas), points le long du ruban
  //          (x, bord haut, bord bas en dizaines de px, lumière en dixièmes)].
  // Nuage : [centre x, centre y, étendue x, étendue y en dizaines de px, nombre de grains en dizaines].
  // Fond : base RVB + assombrissement du bas, lueur bleue RVB + 0, lueur (centre x, y, rayons x, y) en fractions
  //        de l'image, halo RVB + 0, halo (centre x, y, cosinus et sinus de son axe), halo (longueur, largeur, rais, 0).
  var SC = {
    d: [1920, 1434, 46, [
      [90, [-1], [-15, 32, 72, 6,  0, 40, 76, 9,  15, 52, 80, 10,  30, 60, 84, 8,  45, 69, 88, 6,  60, 84, 95, 4,
        75, 96, 103, 3,  90, 101, 106, 2,  105, 105, 109, 2,  120, 106, 111, 2,  130, 103, 109, 4,  140, 95, 101, 7,
        148, 90, 94, 10,  156, 83, 88, 7,  165, 82, 86, 6,  175, 81, 86, 8,  185, 74, 87, 9,  192, 66, 88, 8,
        205, 54, 89, 6]],
      [75, [-.1], [-15, 76, 88, 5,  0, 79, 90, 7,  15, 83, 92, 8,  29, 88, 92, 10,  45, 94, 103, 6,  60, 101, 110, 4,
        75, 107, 114, 3,  90, 111, 117, 2,  105, 114, 119, 2,  120, 115, 120, 2,  135, 113, 120, 2,  150, 109, 117, 4,
        160, 106, 115, 5,  170, 101, 112, 8,  180, 98, 111, 8,  192, 96, 107, 6,  205, 93, 104, 5]],
      [25, [], [-15, 98, 115, 3,  0, 100, 115, 3,  30, 105, 118, 2,  70, 118, 125, 2,  110, 123, 129, 2,  140, 120, 130, 2,
        170, 108, 125, 3,  192, 105, 120, 3,  205, 103, 118, 3]]
    ], [[33, 47, 36, 30, 180], [28, 89, 20, 8, 60], [176, 62, 26, 34, 60], [168, 104, 33, 11, 40], [33, 111, 23, 9, 25], [20, 22, 30, 23, 100]],
    [.016, .03, .115, .35, .035, .07, .095, 0, .5, .36, .55, .5, .75, .52, .3, 0, 0, -.08, .743, .669, .32, .15, .1, 0]],
    m: [720, 1147, 30, [
      [40, [-.6], [-10, 52, 76, 6,  0, 59, 80, 7,  10, 68, 84, 6,  20, 77, 87, 5,  30, 84, 90, 4,  40, 86, 90, 4,
        50, 86, 90, 4,  60, 82, 88, 6,  70, 76, 86, 7,  82, 65, 83, 7]],
      [35, [.4, 1], [-10, 79, 88, 7,  0, 82, 88, 8,  15, 86, 90, 7,  30, 89, 92, 4,  45, 90, 94, 3,  55, 89, 94, 4,
        65, 84, 90, 8,  72, 80, 88, 10,  82, 74, 86, 8]]
    ], [[6, 56, 9, 17, 20], [68, 76, 7, 7, 6], [38, 94, 20, 4, 5]],
    [.018, .05, .135, .5, .025, .05, .07, 0, .45, .42, .8, .35, .12, .07, .01, 0, -.02, .04, .362, .932, .4, .16, .1, 0]]
  };

  // pulsations (rad/s) des phases du shader des lignes : houle (périodes de 11, 8,3 et 14 s), torsion, souffle, frisson
  var OM = [.571, .757, .449, .21, .17, .39, .9, .13],
      // particules par plan (lointain, moyen, proche) : rayon (px CSS), opacité, vitesse (px d'image/s), oscillation, parallaxe (px CSS)
      PL = [[1.5, 1.5, .12, .2, 4, 4, 3, 5, 2], [2, 6, .3, .45, 8, 8, 6, 8, 5], [8, 12, .02, .03, 16, 14, 10, 10, 12]],
      M = Math, rnd = M.random, min = M.min, max = M.max, TAU = 6.2832,
      cv, gl, PR = [], U = [], BU = [], nIdx = 0, nSpr = 0, sc, sk, lite, run, dead, timer, g0, b0, so,
      D = window.DeviceOrientationEvent, o = { passive: true },
      w = 0, h = 0, dpr = 1, visible = !document.hidden, inView = 1, raf = 0, mode = 0, gN = -10, tx = 0, ty = 0,
      // valeurs réécrites à chaque image, dans un objet à champs décimaux que V8 modifie sur place (sans allouer)
      H = { last: .5, acc: .5, T: .5, mx: .5, my: .5, gS: .5 },
      PH = new Float32Array(8), MV = new Float32Array(4), RV = new Float32Array(4), QV = new Float32Array(4), i;
  for (i in H) H[i] = 0;

  // Shaders. M : passage image → canvas (échelle, décalage x, y, densité de pixels) ; R : taille du canvas et de l'image.
  var VF = 'attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}',
      // fond : base, lueur bleue, halo chaud orienté (B[4].zw = cosinus et sinus de son axe) avec des rais doux,
      // assombrissement du bas, tramage contre les bandes
      FF = 'uniform vec4 M,R,B[6];void main(){vec2 f=gl_FragCoord.xy,p=(vec2(f.x,R.y-f.y)-M.yz)/M.x/R.zw,g=(p-B[2].xy)/B[2].zw,' +
        'q=(p-B[4].xy)*vec2(R.z/R.w,1);float l=dot(q,B[4].zw),e=(q.y*B[4].z-q.x*B[4].w)/B[5].y,a=atan(q.y,q.x),' +
        'm=min(l,0.)/B[5].y,y=max(p.y-.55,0.);l=max(l,0.)/B[5].x;gl_FragColor=vec4((B[0].rgb+B[1].rgb*exp(-dot(g,g))' +
        '+B[3].rgb*exp(-l*l-e*e-m*m)*(1.+B[5].z*sin(a*23.+1.)*sin(a*9.-.7)))*(1.-B[0].w*y*y)' +
        '+(fract(sin(dot(f,vec2(12.99,78.23)))*43758.5)-.5)/255.,1);}',
      // lignes : a = (x, milieu du ruban, demi-largeur, u), b = dérivées en u + côté de la bande (±1),
      // c = (décalage dans le ruban, n° du ruban + aléa, éclat, part d'or), e = (lumière le long du ruban, 0 ligne / 1 halo / 2 voile)
      // P : phases (mod 2π) calculées en JS ; A = (amplitude de la houle, 0, demi-largeur du halo, torsion)
      VL = 'attribute vec4 a,b,c;attribute vec2 e;uniform vec4 M,R,P[2],A;varying vec3 C,V;float l,r,f;' +
        // houle : trois ondes lentes qui se propagent le long du ruban, retardées selon la ligne (l, en secondes),
        // plus un frisson propre à chaque ligne
        'float W(float u){return .55*sin(11.*u-P[0].x-.571*l+r)+.3*sin(17.*u+P[0].y+.757*l+r*1.7)+.25*sin(7.*u-P[0].z-.449*l)' +
        '+.05*sin(23.*u+P[1].z+f*7.);}' +
        'void main(){float u=a.w,d=.003;f=c.y;r=floor(f);l=c.x*.7+fract(f)*.5;' +
        // torsion (les lignes se croisent quand le cosinus faiblit), souffle (le ruban se resserre et se détend),
        // et écart propre à chaque fil le long du ruban
        'float t=cos(A.w*(sin(2.3*u+P[0].w+r)+.6*sin(4.1*u-P[1].x+r*2.))),s=t*(1.+.16*sin(3.1*u+P[1].y+r))*c.x*(1.+.22*sin(u*5.+f*7.)),' +
        'w=W(u),lw=(c.z>1.?1.:.5)*M.w;vec2 p=vec2(a.x,a.y+a.z*s+A.x*w),' +
        'n=normalize(vec2(b.x,b.y+b.z*s+A.x*(W(u+d)-w)/d));' +
        'float h=e.y>1.5?a.z*abs(s/c.x)*M.x+16.*M.w:e.y>.5?A.z*M.w:lw*.5+1.;p=p*M.x+M.yz+vec2(-n.y,n.x)*b.w*h;' +
        'gl_Position=vec4((p/R.xy*2.-1.)*vec2(1,-1),0,1);V=vec3(b.w*h,e.y>.5?h:lw,e.y);' +
        // couleur : argent bleuté vers l'or selon la part d'or et la lumière du ruban ; éclat variable le long du fil ;
        // plus vif là où le ruban se resserre
        'C=mix(vec3(.5,.58,.78),vec3(1,.66,.28),clamp(c.w*.5+e.x*e.x*.9,0.,1.))*c.z*(c.z>1.?.05+e.x*e.x:(.15+.85*e.x)' +
        '*(.55+.45*sin(u*9.+f*13.)))*(1.3-.5*abs(t))*(e.y>1.5?e.x*e.x*e.x:e.y>.5?e.x*e.x:1.);}',
      // bande anticrénelée : profil en tente dont l'intégrale vaut l'épaisseur (lignes sous le pixel), halos gaussiens
      FL = 'varying vec3 C,V;void main(){float d=V.x*V.x/V.y/V.y,h=V.y*.5+1.;' +
        'gl_FragColor=vec4(C*(V.z>1.5?.3*exp(-2.5*d):V.z>.5?.3*exp(-3.*d):max(0.,1.-abs(V.x)/h)*V.y/h),1);}',
      // grains et particules : a = (x, y en px d'image, rayon en px CSS, forme : >0 gaussienne, <0 disque flou),
      // b = (vitesse de montée, amplitude et fréquence d'oscillation, phase), c = (opacité, scintillement, parallaxe), d = coin
      // Q = (temps, parallaxe x, y, densité de pixels)
      VS = 'attribute vec4 a,b,c;attribute vec2 d;uniform vec4 M,R,Q;varying vec4 v;void main(){float T=Q.x;' +
        'vec2 p=vec2(a.x+b.y*sin(T*b.z+b.w),mod(a.y-b.x*T+60.,R.w+120.)-60.)*M.x+M.yz+(d*a.z*2.-Q.yz*c.z)*M.w;' +
        'v=vec4(d,a.w,c.x*(.65+.35*sin(T*c.y+b.w*3.)));gl_Position=vec4((p/R.xy*2.-1.)*vec2(1,-1),0,1);}',
      FS = 'varying vec4 v;void main(){float r=dot(v.xy,v.xy);' +
        'gl_FragColor=vec4(vec3(1,.8,.5)*v.w*(v.z>0.?exp(-r*v.z):smoothstep(1.,.45,r)*.85+.15*exp(-3.*r)),1);}';

  // compile et lie sans attendre le résultat : le statut n'est lu qu'à la tâche suivante (voir pret)
  function prog(vs, fs){
    var p = gl.createProgram(), j, s;
    for (j = 0; j < 2; j++){
      s = gl.createShader(j ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER);
      // highp exigé : un vieux GPU qui ne l'a pas échoue ici et l'image fixe reste
      gl.shaderSource(s, j ? 'precision highp float;' + fs : vs);
      gl.compileShader(s);
      gl.attachShader(p, s);
    }
    for (j = 0; j < 3; j++) gl.bindAttribLocation(p, j, 'abc'[j]);
    gl.bindAttribLocation(p, 3, 'e');
    gl.bindAttribLocation(p, 3, 'd');
    gl.linkProgram(p);
    PR.push(p);
  }

  // Catmull-Rom sur les points d'un ruban (pas de 4), composante c, paramètre t de 0 à n - 1
  function cr(p, n, t, c){
    var k = min(n - 2, t | 0), f = t - k, a = p[max(k - 1, 0) * 4 + c], b = p[k * 4 + c], d = p[(k + 1) * 4 + c],
        e = p[min(k + 2, n - 1) * 4 + c];
    return (b + .5 * f * (d - a + f * (2 * a - 5 * b + 4 * d - e + f * (3 * (b - d) + e - a)))) * (c < 3 ? 10 : .1);
  }

  // Géométrie de la scène, construite une fois (et à chaque passage du seuil de 640 px) : rien n'est recalculé par image
  function construit(){
    var R = sc[3], S = lite ? 60 : 90, nl = 0, q, r, j, k, m, n, pts, side, v, x, y, z, L, X, Y, HW, LU, f, br,
        lines = [], data, idx, vi = 0, ii = 0, sp, g1, g2, c;
    // lignes de chaque ruban : décalage régulier légèrement aléatoire, la plupart pâles et bleutées, les brins d'or vifs avec halo
    for (r = 0; r < R.length; r++){
      n = R[r][0];
      for (j = 0; j < n; j++){
        br = rnd();
        lines.push([r, M.sin(1.5708 * (-1 + 2 * (j + .3 + .4 * rnd()) / n)), .11 + .19 * br * br + (rnd() < .08 ? .3 : 0), .1 + .5 * rnd(), 0, r + .999 * rnd()]);
      }
      // brin d'or et son halo : même aléa, donc exactement le même tracé
      R[r][1].forEach(function(ho){ f = r + .999 * rnd(); lines.push([r, ho, 1.6, 1, 0, f], [r, ho, 1.6, 1, 1, f]); });
      lines.push([r, .001, 1.25, 1, 2, r + .5]);
    }
    nl = lines.length;
    data = new Float32Array(nl * (S + 1) * 2 * 14);
    idx = new Uint16Array(nl * S * 6);
    X = new Float32Array(S + 1); Y = new Float32Array(S + 1); HW = new Float32Array(S + 1); LU = new Float32Array(S + 1);
    for (q = 0; q < nl; q++){
      L = lines[q]; pts = R[L[0]][2]; m = pts.length / 4;
      for (k = 0; k <= S; k++){
        z = k / S * (m - 1);
        X[k] = cr(pts, m, z, 0);
        y = cr(pts, m, z, 1); v = cr(pts, m, z, 2);
        Y[k] = (y + v) / 2; HW[k] = (v - y) / 2;
        LU[k] = max(0, min(1, cr(pts, m, z, 3)));
      }
      f = L[5];
      for (k = 0; k <= S; k++){
        j = max(0, k - 1); c = min(S, k + 1);
        for (side = -1; side < 2; side += 2){
          data.set([X[k], Y[k], HW[k], k / S,
            (X[c] - X[j]) / (c - j) * S, (Y[c] - Y[j]) / (c - j) * S, (HW[c] - HW[j]) / (c - j) * S, side,
            L[1], f, L[2], L[3], LU[k], L[4]], vi * 14);
          vi++;
        }
        if (k < S){ v = vi - 2; idx.set([v, v + 1, v + 2, v + 1, v + 3, v + 2], ii); ii += 6; }
      }
    }
    nIdx = ii;
    gl.bindBuffer(gl.ARRAY_BUFFER, BU[1]);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, BU[3]);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);

    // grains de poussière (fixes, répartis en nuages gaussiens) puis particules sur trois plans
    sp = [];
    sc[4].forEach(function(cl){
      for (j = 0; j < cl[4] * (lite ? 6 : 10); j++){
        g1 = M.sqrt(-2 * M.log(rnd() + 1e-9)); g2 = TAU * rnd();
        br = rnd(); x = 10 * cl[0] + cl[2] * 5 * g1 * M.cos(g2); y = 10 * cl[1] + cl[3] * 5 * g1 * M.sin(g2);
        if (x > 0 && y > 0 && x < sc[0] && y < sc[1])
          sp.push([x, y, .3 + 1.1 * br * br * br, 7, 0, 0, 0, TAU * rnd(), .2 + .8 * br * br, .5 + 1.5 * rnd(), .5]);
      }
    });
    c = lite ? [12, 22, 25] : [28, 52, 60];
    for (j = 0; j < c[2]; j++){
      q = PL[j < c[0] ? 0 : j < c[1] ? 1 : 2]; br = rnd();
      sp.push([rnd() * sc[0], rnd() * sc[1], q[0] + br * br * q[1], j < c[1] ? (j < c[0] ? 3 : 9) : -1,
        q[4] + rnd() * q[5], q[6] + rnd() * q[7], .3 + rnd() * .75, TAU * rnd(), q[2] + rnd() * q[3], 1 + rnd() * 4, q[8]]);
    }
    nSpr = sp.length * 6;
    data = new Float32Array(nSpr * 14);
    vi = 0;
    sp.forEach(function(s){
      for (k = 0; k < 6; k++){
        data.set([s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], s[8], s[9], s[10], 0,
          k == 1 || k > 3 ? 1 : -1, k > 1 && k != 4 ? 1 : -1], vi * 14);
        vi++;
      }
    });
    gl.bindBuffer(gl.ARRAY_BUFFER, BU[2]);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  }

  // branche les attributs du tampon b : n vecteurs (vec4, vec4, vec4, vec2) entrelacés, ou le triangle du fond
  function lay(b, n){
    var k;
    gl.bindBuffer(gl.ARRAY_BUFFER, BU[b]);
    for (k = 0; k < 4; k++){
      if (k < n || !k) gl.enableVertexAttribArray(k); else gl.disableVertexAttribArray(k);
      if (k < n) gl.vertexAttribPointer(k, k < 3 ? 4 : 2, gl.FLOAT, false, 56, k * 16);
    }
    if (!n) gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  }

  function taille(){
    var nw = bg.clientWidth, nh = bg.clientHeight, s = mqS.matches ? 'm' : 'd', k, z;
    w = hero.clientWidth; h = hero.clientHeight;
    lite = w <= 640;
    // densité de pixels plafonnée : 2 sur ordinateur, 1,5 sur téléphone, et jamais plus de 8 Mpx
    dpr = min(devicePixelRatio || 1, lite ? 1.5 : 2, M.sqrt(8e6 / nw / nh));
    cv.width = M.round(nw * dpr);
    cv.height = M.round(nh * dpr);
    gl.viewport(0, 0, cv.width, cv.height);
    if (s != sk){ sk = s; sc = SC[s]; construit(); }
    // même cadrage que le CSS (cover, centré)
    z = max(nw / sc[0], nh / sc[1]) * dpr;
    MV[0] = z; MV[1] = (cv.width - sc[0] * z) / 2; MV[2] = (cv.height - sc[1] * z) / 2; MV[3] = dpr;
    RV[0] = cv.width; RV[1] = cv.height; RV[2] = sc[0]; RV[3] = sc[1];
    for (k = 0; k < 3; k++){
      gl.useProgram(PR[k]);
      gl.uniform4fv(U[k].M, MV);
      gl.uniform4fv(U[k].R, RV);
    }
    gl.useProgram(PR[0]);
    gl.uniform4fv(U[0].B, sc[5]);
    gl.useProgram(PR[1]);
    gl.uniform4fv(U[1].A, [sc[2], 0, 7, .5]);
    dessine();
  }

  // une image : fond, puis lignes et grains en mélange additif (les recouvrements s'illuminent)
  function dessine(){
    var T = H.T, k;
    for (k = 0; k < 8; k++) PH[k] = T * OM[k] % TAU;
    QV[0] = T; QV[1] = H.mx; QV[2] = H.my; QV[3] = dpr;
    gl.disable(gl.BLEND);
    gl.useProgram(PR[0]);
    lay(0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.BLEND);
    gl.useProgram(PR[1]);
    gl.uniform4fv(U[1].P, PH);
    lay(1, 4);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, BU[3]);
    gl.drawElements(gl.TRIANGLES, nIdx, gl.UNSIGNED_SHORT, 0);
    gl.useProgram(PR[2]);
    gl.uniform4fv(U[2].Q, QV);
    lay(2, 4);
    gl.drawArrays(gl.TRIANGLES, 0, nSpr);
  }

  function frame(now){
    var raw = H.last ? now - H.last : 0, dt, a;
    raf = 0;
    H.last = now;
    // garde-fou : si l'appareil ne tient pas ~40 images/s (22 sur téléphone), l'image fixe reprend sa place ;
    // verdict après 60 images, ou dès 2 s de mesure sur un appareil très lent
    if (raw && gN < 60 && ++gN > 0){
      H.gS += raw;
      if ((gN == 60 || H.gS > 2e3) && H.gS / gN > (lite ? 45 : 25)) return repli();
      if (H.gS > 2e3) gN = 60;
    }
    H.acc += min(raw / 1000, .05);
    if (run) raf = requestAnimationFrame(frame);
    if (lite && H.acc < .03) return;   // téléphone : 30 images/s suffisent à ce rythme lent
    dt = H.acc;
    H.acc = 0;
    H.T += dt;
    a = min(1, dt * 2);
    H.mx += (tx - H.mx) * a;
    H.my += (ty - H.my) * a;
    dessine();
  }

  // Pause complète hors écran, onglet caché, ou mouvement réduit demandé en cours de route (le CSS masque
  // alors le canvas ; tout reprend si le réglage est retiré). L'inclinaison n'est écoutée que pendant l'animation.
  function etat(){
    var on = visible && inView && !dead && mode < 2;
    if (on != run && D){
      window[on ? 'addEventListener' : 'removeEventListener']('deviceorientation', tilt, o);
      g0 = null;
    }
    run = on;
    if (run && !raf) raf = requestAnimationFrame(frame);
    if (!run){ cancelAnimationFrame(raf); raf = H.last = 0; }
  }

  // repli définitif : le canvas s'efface en fondu, l'image fixe reste seule
  function repli(){
    if (mode == 2) return;
    mode = 2;
    etat();
    if (cv){
      cv.classList.remove('is-on');
      setTimeout(function(){ cv.remove(); }, 1700);
    }
  }

  // Inclinaison : axes échangés en paysage ; un saut brusque recentre ; le neutre suit la tenue du téléphone.
  // Aucune permission demandée : là où le navigateur en exige une (iOS), aucun événement n'arrive.
  function tilt(e){
    var l = so && so.angle % 180, x = l ? e.beta : e.gamma, y = l ? e.gamma : e.beta;
    if (x == null) return;
    if (g0 == null || M.abs(x - g0) > 40 || M.abs(y - b0) > 40){ g0 = x; b0 = y; }
    g0 += (x - g0) * .01;
    b0 += (y - b0) * .01;
    tx = max(-1, min(1, (x - g0) / 12));
    ty = max(-1, min(1, (y - b0) / 12));
  }

  function start(){
    var x;
    cv = document.createElement('canvas');
    cv.className = 'hero-ondes';
    gl = cv.getContext('webgl', { alpha: false, antialias: false, depth: false, failIfMajorPerformanceCaveat: true });
    if (!gl) return;
    // rendu logiciel (SwiftShader, llvmpipe… : pas de GPU) : l'animation saccaderait et écraserait le fil principal
    x = gl.getExtension('WEBGL_debug_renderer_info');
    if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(gl.getParameter(x ? x.UNMASKED_RENDERER_WEBGL : gl.RENDERER))) return;
    prog(VF, FF);
    prog(VL, FL);
    prog(VS, FS);
    pret(gl.getExtension('KHR_parallel_shader_compile'));
  }

  // la suite attend la fin de la compilation (en parallèle quand le navigateur le permet), dans une autre tâche
  function pret(x){
    x && !PR.every(function(p){ return gl.getProgramParameter(p, x.COMPLETION_STATUS_KHR); }) ? setTimeout(pret, 50, x) : setTimeout(fin);
  }

  function fin(){
    try {
      // uniformes de chaque programme (une absente vaut null, et l'écrire ne fait rien)
      PR.forEach(function(p, k){
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw 0;
        U[k] = {};
        'MRBPAQ'.split('').forEach(function(n){ U[k][n] = gl.getUniformLocation(p, n); });
      });
      for (i = 0; i < 4; i++) BU.push(gl.createBuffer());
      gl.bindBuffer(gl.ARRAY_BUFFER, BU[0]);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);   // un triangle couvre tout
      gl.blendFunc(gl.ONE, gl.ONE);
      bg.appendChild(cv);
      taille();
      if (gl.getError()) throw 0;
    } catch (err){ cv.remove(); return; }
    cv.addEventListener('webglcontextlost', repli);
    cv.classList.add('is-on');   // la première image est déjà dessinée : le fondu peut commencer

    if (window.IntersectionObserver) new IntersectionObserver(function(e){ inView = e[e.length - 1].isIntersecting; etat(); }).observe(hero);
    document.addEventListener('visibilitychange', function(){ visible = !document.hidden; etat(); });
    if (mq.addEventListener) mq.addEventListener('change', function(){ dead = mq.matches; etat(); });
    addEventListener('resize', function(){
      if (hero.clientWidth == w && hero.clientHeight == h) return;   // barre d'adresse mobile : rien à refaire
      clearTimeout(timer);
      timer = setTimeout(function(){ if (mode < 2) taille(); }, 150);
    }, o);
    // parallaxe de quelques pixels des particules : souris, ou inclinaison du téléphone
    addEventListener('pointermove', function(e){
      if (e.pointerType == 'mouse'){ tx = e.clientX / innerWidth * 2 - 1; ty = e.clientY / innerHeight * 2 - 1; }
    }, o);
    so = screen.orientation;
    etat();
  }

  // après load, puis au premier temps libre : le héros est déjà peint avec l'image, rien ne retarde l'affichage
  function idle(){ window.requestIdleCallback ? requestIdleCallback(start, { timeout: 2e3 }) : setTimeout(start, 200); }
  document.readyState == 'complete' ? idle() : addEventListener('load', idle, { once: true });
})();
