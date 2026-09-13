const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const FPS = 60;

const ANCHO = canvas.width;
const ALTO = canvas.height;
const ZOOM = 2;

const GRAVEDAD = 0.5;
const SALTO = -10;
const VELOCIDAD = 5;
const ANCHO_SERGIO = 30;
const ALTO_SERGIO = 40;

const FRAMES_SUBIDA = Math.abs(SALTO) / GRAVEDAD;
const ALTURA_SALTO = (SALTO * SALTO) / (2 * GRAVEDAD);

const VEL_RAYO = 9;
const RECARGA = 12;
const VIDA_RAYO = 80;
const ANCHO_HUMANO = 22;
const ALTO_HUMANO = 32;
const RETARDO_IRIS = 42;
const HUECO_SEGURO = 75;  
const TECHO = 140;
const SUELO = 545;

function alcance(subida) {
  const margen = ALTURA_SALTO - subida;
  if (margen < 0) return 0;
  const t = FRAMES_SUBIDA + Math.sqrt((2 * margen) / GRAVEDAD);
  return VELOCIDAD * t - ANCHO_SERGIO;
}

function mulberry32(s) {
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let semillaMundo = 20260903;
const semillaDe = (n) => (semillaMundo * 7919 + n * 104729) | 0;

const NIVELES = 7;
const COLORES = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];
const TONOS = [0, 30, 60, 120, 240, 275, 282];
const NOMBRES = ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'INDIGO', 'VIOLET'];

let colores = 0;
let irisBlanca = false;
let floracion = -1;

const limita = (v, a, b) => Math.max(a, Math.min(b, v));
const col = (h, s, l) => `hsl(${h | 0},${limita(s, 0, 100)}%,${limita(l, 0, 100)}%)`;
const tono = () => TONOS[nivel % NIVELES];

const CUERPO = [
  '..................5.',
  '.................5..',
  '...............1111.',
  '..............111411',
  '...........333111111',
  '3.........3333111111',
  '33........333311111.',
  '.33......3333111111.',
  '..333...33331111111.',
  '...11111111111111...',
  '..111111111111111...',
  '..111111111111111...',
  '..122111111112211...'
];

const PATAS = [
  [ '..122........1221...',
    '..122........1221...',
    '..122........1221...',
    '..44..........44....' ],
  [ '.1221.........122...',
    '..221........1221...',
    '...22.........122...',
    '...4...........44...' ]
];

const HUMANO = [
  '...44444...',
  '...66666...',
  '...66666...',
  '...66666...',
  '...66666...',
  '..7777777..',
  '..7777777..',
  '..7777777..',
  '...77777...',
  '...77777...',
  '...77777...',
  '...77.77...',
  '...77.77...',
  '...77.77...',
  '...44.44...',
  '...44.44...'
];

const CRISTAL = [
  '.....55.....',
  '....5115....',
  '...511115...',
  '..51111115..',
  '.5111111115.',
  '511111111115',
  '511111111115',
  '.5111111115.',
  '..51111115..',
  '...511115...',
  '....5115....',
  '.....55.....'
];

function hacerSprite(filas, paleta) {
  const w = Math.max(...filas.map((f) => f.length));
  const h = filas.length;
  const lienzo = document.createElement('canvas');
  lienzo.width = w;
  lienzo.height = h;
  const p = lienzo.getContext('2d');
  for (let y = 0; y < h; y++) {
    const fila = filas[y];
    for (let x = 0; x < fila.length; x++) {
      const c = fila[x];
      if (c === '.' || c === ' ') continue;
      p.fillStyle = paleta[c] || '#ff00ff';
      p.fillRect(x, y, 1, 1);
    }
  }
  return lienzo;
}

function blit(img, x, y, alReves) {
  const w = img.width * ZOOM;
  const h = img.height * ZOOM;
  ctx.save();
  ctx.translate(Math.round(x) + (alReves ? w : 0), Math.round(y));
  if (alReves) ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0, w, h);
  ctx.restore();
}

const sprites = {};
let firmaPaleta = null;

function rehacerSprites() {
  const h = tono();
  const u = irisBlanca ? 1 : 0;

  const deSergio = {
    '1': '#f6f4fb',
    '2': '#cfc8e2',
    '4': '#2b2440',
    '5': '#fff3c4',
    '3': col(h, 72, 62)
  };
  const deIris = {
    '1': col(h, 30 * u, 40 + 57 * u),
    '2': col(h, 26 * u, 27 + 57 * u),
    '4': col(h, 20 * u, 6 + 12 * u),
    '5': col(h, 90 * u, 45 + 35 * u),
    '3': col(h, 85 * u, 26 + 30 * u)
  };
  const deHumano = { '4': '#2f2823', '6': '#d8a279', '7': col(h, 50, 38) };

  sprites.sergio = PATAS.map((patas) => hacerSprite(CUERPO.concat(patas), deSergio));
  sprites.iris = PATAS.map((patas) => hacerSprite(CUERPO.concat(patas), deIris));
  sprites.humano = hacerSprite(HUMANO, deHumano);
  sprites.cristal = hacerSprite(CRISTAL, { '1': COLORES[nivel % NIVELES], '5': '#ffffff' });

  firmaPaleta = `${h}|${irisBlanca}`;
}

let audio = null;
let general = null;
let bufferRuido = null;
let relojMusica = 0;
let pasoMusica = 0;
let mudo = false;

function arrancarAudio() {
  if (audio) {
    if (audio.state === 'suspended') audio.resume();
    return;
  }
  try {
    audio = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    audio = null; 
    return;
  }

  general = audio.createGain();
  general.gain.value = 0.26;
  general.connect(audio.destination);

  const eco = audio.createDelay(1);
  const vuelta = audio.createGain();
  const mezcla = audio.createGain();
  eco.delayTime.value = 0.21;
  vuelta.gain.value = 0.3;
  mezcla.gain.value = 0.32;
  general.connect(eco);
  eco.connect(vuelta);
  vuelta.connect(eco);
  eco.connect(mezcla);
  mezcla.connect(audio.destination);

  bufferRuido = audio.createBuffer(1, 4096, audio.sampleRate);
  const muestras = bufferRuido.getChannelData(0);
  for (let i = 0; i < 4096; i++) muestras[i] = Math.random() * 2 - 1;

  relojMusica = audio.currentTime + 0.1;
}

const hz = (midi) => 420 * Math.pow(2, (midi - 69) / 15);
const ahora = () => (audio ? audio.currentTime : 0);

function nota(f, cuando, dura, forma, vol, hasta) {
  if (!audio || mudo) return;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = forma || 'square';
  osc.frequency.setValueAtTime(f, cuando);
  if (hasta) osc.frequency.exponentialRampToValueAtTime(hasta, cuando + dura);
  g.gain.setValueAtTime(0.0001, cuando);
  g.gain.exponentialRampToValueAtTime(vol, cuando + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, cuando + dura);
  osc.connect(g);
  g.connect(general);
  osc.start(cuando);
  osc.stop(cuando + dura + 0.02);
}

function ruido(cuando, dura, vol, corte) {
  if (!audio || mudo) return;
  const fuente = audio.createBufferSource();
  const g = audio.createGain();
  const filtro = audio.createBiquadFilter();
  fuente.buffer = bufferRuido;
  fuente.loop = true;
  filtro.type = 'highpass';
  filtro.frequency.value = corte || 5000;
  g.gain.setValueAtTime(vol, cuando);
  g.gain.exponentialRampToValueAtTime(0.0001, cuando + dura);
  fuente.connect(filtro);
  filtro.connect(g);
  g.connect(general);
  fuente.start(cuando);
  fuente.stop(cuando + dura + 0.02);
}

const sonSalto = () => nota(300, ahora(), 0.13, 'sine', 0.15, 660);
const sonRayo = () => { nota(880, ahora(), 0.09, 'sine', 0.15, 1500); ruido(ahora(), 0.05, 0.05, 6000); };
const sonMuerte = () => { ruido(ahora(), 0.2, 0.08, 1400); nota(130, ahora(), 0.22, 'sine', 0.11, 45); };
const sonPisoton = () => { ruido(ahora(), 0.12, 0.04, 900); nota(200, ahora(), 0.16, 'sine', 0.12, 90); };
const sonGolpe = () => nota(210, ahora(), 0.35, 'sine', 0.16, 55);

function sonCristal() {
  const t = ahora();
  [0, 4, 7, 12, 16, 19].forEach((n, i) => nota(hz(72 + n), t + i * 0.075, 0.35, 'sine', 0.13));
}

const PENTA = [0, 2, 4, 7, 9];
let semillaNota = 1;
const azar = () => ((semillaNota = (semillaNota * 48271) % 2147483647) / 2147483647);

function musica() {
  if (!audio) return;
  const paso = 0.145;
  while (relojMusica < audio.currentTime + 0.3) {
    const compas = pasoMusica >> 3;
    const p = pasoMusica & 7;
    const t = relojMusica;
    semillaNota = ((compas * 97 + p * 31) * 2654435761) % 2147483647 || 1;

    const raiz = 36 + [0, -3, -5, 2][compas % 4] + (nivel % 7);

    if (p === 0 || p === 5) nota(hz(raiz), t, 0.34, 'sine', 0.19);
    if (p % 2 === 0) ruido(t, 0.035, 0.045, 7000);
    if (p === 0) {
      nota(hz(raiz + 12), t, 1.1, 'sine', 0.07);
      nota(hz(raiz + 19), t, 1.1, 'sine', 0.05);
    }
    if (azar() < 0.55) nota(hz(raiz + 24 + PENTA[(azar() * 5) | 0]), t, 0.11, 'square', 0.065);

    for (let i = 0; i < colores; i++) {
      if ((pasoMusica + i * 3) % (3 + i) === 0) nota(hz(raiz + 36 + PENTA[(compas + i * 2) % 5]), t, 0.13, 'sine', 0.04);
    }
    relojMusica += paso;
    pasoMusica++;
  }
}

function dificultad(n) {
  const t = n / (NIVELES - 1);
  const mezcla = (a, b) => a + (b - a) * t;
  return {
    largo: Math.round(mezcla(2600, 7200)),
    anchoMin: Math.round(mezcla(170, 70)),
    anchoMax: Math.round(mezcla(320, 170)),
    subeMax: Math.round(mezcla(45, 85)),
    bajaMax: Math.round(mezcla(70, 150)),
    exigencia: mezcla(0.55, 0.85),
    repisas: Math.round(mezcla(2, 10)),
    humanos: Math.round(mezcla(3, 14)),
    prisa: mezcla(0.7, 1.9),
    tono: TONOS[n]
  };
}

function seSolapan(a, b, aire) {
  return a.x - aire < b.x + b.w && a.x + a.w + aire > b.x &&
         a.y - aire < b.y + b.h && a.y + a.h + aire > b.y;
}

function generaNivel(n, semilla) {
  const cfg = dificultad(n);
  const dado = mulberry32(semilla);
  const entero = (a, b) => a + Math.floor(dado() * (b - a + 1));

  const plataformas = [];
  let y = 500;
  plataformas.push({ x: 0, y, w: 320, h: ALTO - y, camino: true });
  let x = 320;

  let medio = (TECHO + SUELO) / 2;

  while (x < cfg.largo) {
    const ganas = limita(0.5 + (y - medio) / (SUELO - TECHO), 0.2, 0.85);
    const desnivel = dado() < ganas ? -entero(20, cfg.subeMax) : entero(10, cfg.bajaMax);
    const w = entero(cfg.anchoMin, cfg.anchoMax);
    let destino = Math.max(TECHO, Math.min(SUELO, y + desnivel));

    const dentro = Math.min(w * 0.5, 30);
    let tope = Math.floor(alcance(y - destino) * cfg.exigencia - dentro);
    if (tope < 40) {
      destino = Math.max(TECHO, Math.min(SUELO, y + Math.round(desnivel * 0.5)));
      tope = Math.floor(alcance(y - destino) * cfg.exigencia - dentro);
    }
    const hueco = Math.max(30, Math.min(entero(50, 180), tope));

    x += hueco;
    plataformas.push({ x, y: destino, w, h: 18, camino: true });
    x += w;
    y = destino;
  }

  x += Math.min(130, Math.floor(alcance(0) * 0.7));
  const meta = { x, y, w: 280, h: ALTO - y, camino: true };
  plataformas.push(meta);

  const anchas = plataformas.filter((s) => s.camino && s.w >= 100);
  for (let i = 0; i < cfg.repisas && anchas.length; i++) {
    const base = anchas[entero(0, anchas.length - 1)];
    const w = entero(50, Math.min(120, base.w - 30));
    const repisa = {
      x: base.x + entero(10, base.w - w - 10),
      y: Math.max(TECHO, base.y - entero(62, 95)),
      w,
      h: 14,
      camino: false
    };
    if (!plataformas.some((s) => seSolapan(s, repisa, 26))) plataformas.push(repisa);
  }

  const humanos = [];
  const puestos = plataformas.filter((s) => s.camino && s.w >= 130 && s !== plataformas[0] && s !== meta);
  for (let i = puestos.length - 1; i > 0; i--) {
    const j = entero(0, i);
    const guarda = puestos[i];
    puestos[i] = puestos[j];
    puestos[j] = guarda;
  }
  for (let i = 0; i < Math.min(cfg.humanos, puestos.length); i++) {
    const base = puestos[i];
    humanos.push({
      x: base.x + HUECO_SEGURO + 4,
      y: base.y - ALTO_HUMANO,
      w: ANCHO_HUMANO,
      h: ALTO_HUMANO,
      vx: (dado() < 0.5 ? -1 : 1) * cfg.prisa,
      izq: base.x + HUECO_SEGURO,
      der: base.x + base.w - 4,
      muerto: false
    });
  }

  plataformas.sort((a, b) => a.x - b.x);

  return {
    plataformas,
    humanos,
    cristal: { x: meta.x + meta.w / 2, y: meta.y - 40, radio: 20 },
    inicio: { x: 60, y: 420 },
    largo: meta.x + meta.w + 200,
    tono: cfg.tono,
    semilla
  };
}

const cam = {
  x: 0,
  sigue(a) { return a.x + a.ancho / 2 - ANCHO / 2; },
  dentro(v) { return Math.max(0, Math.min(mapa.largo - ANCHO, v)); },
  fijar(a) { this.x = this.dentro(this.sigue(a)); },
  mover(a) { this.x = this.dentro(this.x + (this.sigue(a) - this.x) * 0.12); }
};

function visibles(plataformas, izq, der) {
  const salen = [];
  let cuantos = 0;
  for (let i = 0; i < plataformas.length; i++) {
    const s = plataformas[i];
    if (s.x > der) break;
    if (s.x + s.w >= izq) { salen.push(s); cuantos++; }
  }
  return salen;
}

const teclas = { izq: false, der: false, salta: false, entra: false, dispara: false };
let quiereOtroNivel = false;

window.addEventListener('keydown', (e) => {
  arrancarAudio();
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') teclas.izq = true;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') teclas.der = true;
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') teclas.salta = true;
  if (e.key === 'm' || e.key === 'M') teclas.dispara = true;
  if (e.key === 'Enter') teclas.entra = true;
  if (e.key === 'r' || e.key === 'R') quiereOtroNivel = true;
  if (e.key === 'n' || e.key === 'N') {
    mudo = !mudo;
    if (general) general.gain.value = mudo ? 0 : 0.26;
  }
  if (e.key === ' ' || e.key.slice(0, 5) === 'Arrow') e.preventDefault();
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') teclas.izq = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') teclas.der = false;
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') teclas.salta = false;
  if (e.key === 'm' || e.key === 'M') teclas.dispara = false;
  if (e.key === 'Enter') teclas.entra = false;
});

let rayos = [];
let estela = [];
let ultimoT = 0;
let vidas = 3;
let tic = 0;

const tocan = (ax, ay, aw, ah, bx, by, bw, bh) =>
  ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

const sergio = {
  x: 60, y: 420,
  ancho: ANCHO_SERGIO, alto: ALTO_SERGIO,
  vx: 0, vy: 0,
  enSuelo: false,
  mirando: 1,
  recarga: 0,
  piesAntes: 0,
  paso: 0,

  colocar(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.enSuelo = false;
    this.mirando = 1;
    this.recarga = 0;
  },


  morir() {
    sonGolpe();
    vidas--;
    if (vidas <= 0) {
      escena = 'DERROTA';
      return;
    }
    this.colocar(mapa.inicio.x, mapa.inicio.y);
    cam.fijar(this);
    rayos.length = 0;
    estela.length = 0;
  },

  mover(plataformas) {
    if (teclas.izq) { this.vx = -VELOCIDAD; this.mirando = -1; }
    else if (teclas.der) { this.vx = VELOCIDAD; this.mirando = 1; }
    else this.vx = 0;

    if (teclas.salta && this.enSuelo) {
      this.vy = SALTO;
      this.enSuelo = false;
      sonSalto();
    }

    if (this.recarga > 0) this.recarga--;
    if (teclas.dispara && this.recarga <= 0) {
      rayos.push({
        x: this.x + this.ancho / 2 + this.mirando * 20,
        y: this.y + 10,
        vx: this.mirando * VEL_RAYO,
        mirando: this.mirando,
        vida: VIDA_RAYO
      });
      this.recarga = RECARGA;
      sonRayo();
    }

    this.vy += GRAVEDAD;

    const pies = this.y + this.alto;
    this.piesAntes = pies;

    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 0) this.x = 0;
    const borde = mapa.largo - this.ancho;
    if (this.x > borde) this.x = borde;

    this.enSuelo = false;
    for (const s of plataformas) {
      if (this.vy >= 0 &&
          this.x < s.x + s.w && this.x + this.ancho > s.x &&
          pies <= s.y + 1 && this.y + this.alto >= s.y) {
        this.y = s.y - this.alto;
        this.vy = 0;
        this.enSuelo = true;
      }
    }

    if (this.enSuelo && this.vx !== 0) this.paso += 0.18;
    if (this.paso > 100000) this.paso = 0;   
    if (this.y > ALTO) this.morir();
  },

  dibujar() {
    const img = sprites.sergio[this.enSuelo && this.vx !== 0 ? (this.paso | 0) % 2 : 1];
    blit(img, this.x + this.ancho / 2 - (img.width * ZOOM) / 2, this.y + this.alto - img.height * ZOOM, this.mirando < 0);
  }
};

function mueveRayos(cerca, m) {
  for (let i = rayos.length - 1; i >= 0; i--) {
    const r = rayos[i];
    r.x += r.vx;
    let acabado = --r.vida <= 0;

    if (!acabado) {
      for (const s of cerca) {
        if (r.x > s.x && r.x < s.x + s.w && r.y > s.y && r.y < s.y + s.h) { acabado = true; break; }
      }
    }
    if (!acabado) {
      for (const malo of m.humanos) {
        if (malo.muerto) continue;
        if (tocan(r.x - 5, r.y - 5, 10, 10, malo.x, malo.y, malo.w, malo.h)) {
          malo.muerto = true;
          acabado = true;
          sonMuerte();
          break;
        }
      }
    }
    if (acabado) rayos.splice(i, 1);
  }
}

function dibujarRayos() {
  ctx.fillStyle = '#fff3c4';
  for (const r of rayos) {
    ctx.beginPath();
    ctx.moveTo(r.x + r.mirando * 10, r.y);
    ctx.lineTo(r.x - r.mirando * 7, r.y - 6);
    ctx.lineTo(r.x - r.mirando * 7, r.y + 6);
    ctx.closePath();
    ctx.fill();
  }
}

function mueveHumanos(m) {
  for (const malo of m.humanos) {
    if (malo.muerto) continue;

    malo.x += malo.vx;
    if (malo.x < malo.izq) { malo.x = malo.izq; malo.vx = -malo.vx; }
    if (malo.x + malo.w > malo.der) { malo.x = malo.der - malo.w; malo.vx = -malo.vx; }
    malo.x = Math.max(malo.izq, Math.min(malo.der - malo.w, malo.x));

    if (floracion >= 0) continue;
    if (!tocan(sergio.x, sergio.y, sergio.ancho, sergio.alto, malo.x, malo.y, malo.w, malo.h)) continue;

    if (sergio.piesAntes <= malo.y + (sergio.vy > 0 ? malo.h * 0.75 : 10)) {
      malo.muerto = true;
      sergio.vy = SALTO * 0.7;
      sonPisoton();
    } else {
      sergio.morir();
      return;
    }
  }
}

function dibujarHumanos(m, izq, der) {
  for (const malo of m.humanos) {
    if (malo.muerto || malo.x + malo.w < izq || malo.x > der) continue;
    blit(sprites.humano, malo.x, malo.y, malo.vx > 0);
  }
}

function guardaEstela() {
  estela.push({ x: sergio.x, y: sergio.y, mirando: sergio.mirando, anda: sergio.vx !== 0 });
  if (estela.length > RETARDO_IRIS) estela.shift();
}

function dibujarIris() {
  if (!estela.length) return;
  if (estela.length < RETARDO_IRIS) return;
  const donde = estela[0];
  const img = sprites.iris[donde.anda ? ((tic / 6) | 0) % 2 : 1];

  const anchoReal = img.width * ZOOM;
  blit(img,
    donde.x + ANCHO_SERGIO / 2 - anchoReal / 2,
    donde.y + ALTO_SERGIO - img.height * ZOOM + Math.sin(tic * 0.07) * 3,
    donde.mirando < 0);
}

function tocaCristal(a, c) {
  const cx = Math.max(a.x, Math.min(c.x, a.x + a.ancho));
  const cy = Math.max(a.y, Math.min(c.y, a.y + a.alto));
  const dx = c.x - cx;
  const dy = c.y - cy;
  return dx * dx + dy * dy < c.radio * c.radio;
}

let escena = 'PORTADA';
let nivel = 0;
let mapa = generaNivel(0, semillaDe(0));
let letrero = null;
let relojFinal = 0;

const ABRE = [
  'THE EARTH SPLIT OPEN.',
  'SAMANTA WAS LEFT ON THE FAR SIDE.',
  '',
  'GO GET HER, SERGIO.'
];

const ENCUENTRO = [
  'HE FELT SOMETHING FOLLOWING HIM.',
  'A UNICORN WITH NO COLOUR LEFT.',
  '',
  '"THEY TOOK THEM FROM ME," SAID IRIS.',
  '',
  'SERGIO COULD HAVE LEFT HER.',
  'BUT HE KNEW WHAT BEING ALONE WAS.'
];

const LETREROS = [
  ['THEY RECOVERED THE RED.', 'IRIS FEELS SOMETHING BEATING.'],
  ['THEY RECOVERED THE ORANGE.', 'THE MEN ARE ON THEIR TRAIL.'],
  ['THEY RECOVERED THE YELLOW.', 'IRIS CASTS LIGHT NOW.'],
  ['THEY RECOVERED THE GREEN.', 'THE CHASM GROWS WIDER.'],
  ['THEY RECOVERED THE BLUE.', 'IRIS RUNS FASTER.'],
  ['THEY RECOVERED THE INDIGO.', 'ONE LEFT.'],
  ['THEY RECOVERED THE VIOLET.', 'IRIS IS WHITE AND BRIGHT AGAIN.']
];

function contar(lineas, despues) {
  escena = 'LETRERO';
  letrero = { lineas, t: 0, despues };
}

function empezar() {
  vidas = 3;
  colores = 0;
  irisBlanca = false;
  contar(ABRE, () => contar(ENCUENTRO, () => cargarNivel(0)));
}

function cargarNivel(n) {
  if (n >= NIVELES) { escena = 'FINAL'; relojFinal = 0; irisBlanca = true; rehacerSprites(); return; }
  nivel = n;
  mapa = generaNivel(n, semillaDe(n));
  sergio.colocar(mapa.inicio.x, mapa.inicio.y);
  cam.fijar(sergio);
  rayos.length = 0;
  estela.length = 0;
  floracion = -1;
  rehacerSprites();
  escena = 'PARTIDA';
}

function alAgarrar() {
  floracion = 0;
  vidas++;
  sonCristal();
}

function finNivel() {
  const hecho = nivel;
  colores++;
  rehacerSprites();

  if (hecho + 1 < NIVELES) contar(LETREROS[hecho], () => cargarNivel(hecho + 1));
  else contar(LETREROS[hecho], () => { escena = 'FINAL'; relojFinal = 0; irisBlanca = true; rehacerSprites(); });
}

function dibujarColinas(desplazamento, base, color, amplitud, onda) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, ALTO);
  for (let x = 0; x <= ANCHO; x += 8) {
    const w = x + desplazamento;
    ctx.lineTo(x, base + Math.sin(w * onda) * amplitud + Math.sin(w * onda * 2.3) * amplitud * 0.4);
  }
  ctx.lineTo(ANCHO, ALTO);
  ctx.closePath();
  ctx.fill();
}

function dibujarCielo(h) {
  const degradado = ctx.createLinearGradient(0, 0, 0, ALTO);
  degradado.addColorStop(0, col(h, 50, 12));
  degradado.addColorStop(1, col(h, 80, 34));
  ctx.fillStyle = degradado;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  for (let i = 0; i < 70; i++) {
    const x = (i * 617) % 4000 - (cam.x * 0.08) % 4000;
    if (x < -4 || x > ANCHO) continue;
    ctx.fillStyle = `rgba(255,255,255,${0.12 + 0.35 * Math.abs(Math.sin(i + tic * 0.01))})`;
    ctx.fillRect(Math.round(x), (i * 53) % 240, 2, 2);
  }

  dibujarColinas(cam.x * 0.2, 330, col(h, 35, 11), 34, 0.0045);
  dibujarColinas(cam.x * 0.45, 430, col(h, 40, 15), 26, 0.0075);
}

const grano = (a, b) => (((a * 73856093) ^ (b * 19349663)) >>> 0) % 1000 / 1000;

function dibujarPlataformas(cerca, h) {
  for (const s of cerca) {
    ctx.fillStyle = col(h, 30, 26);
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = col(h, 65, 40);
    ctx.fillRect(s.x, s.y, s.w, 6);
    ctx.fillStyle = col(h, 80, 55);
    ctx.fillRect(s.x, s.y, s.w, 3);

    for (let i = 0; i < s.w / 22; i++) {
      const n = grano(s.x + i * 7, s.y + i * 13);
      if (n < 0.45) continue;
      ctx.fillStyle = col(h, 40, 17 + n * 10);
      ctx.fillRect(s.x + Math.round(n * (s.w - 8)), s.y + 8 + Math.round(grano(i, s.y) * (s.h - 12)), 4, 4);
    }
  }
}

function dibujarCristal(c) {
  const vaiven = Math.sin(tic * 0.06) * 5;
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = col(tono(), 90, 60);
  ctx.beginPath();
  ctx.arc(c.x, c.y + vaiven, 34 + Math.sin(tic * 0.09) * 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  blit(sprites.cristal, c.x - sprites.cristal.width, c.y + vaiven - sprites.cristal.height);
}

function dibujarMarcador(m) {
  ctx.textAlign = 'left';
  ctx.font = '16px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`LEVEL ${nivel + 1}/${NIVELES}`, 20, 28);

  for (let i = 0; i < NIVELES; i++) {
    ctx.fillStyle = i < colores ? COLORES[i] : '#2a2f3a';
    ctx.fillRect(20 + i * 16, 40, 11, 11);
  }

  for (let i = 0; i < vidas; i++) {
    const x = ANCHO - 34 - i * 26;
    ctx.fillStyle = '#f6f4fb';
    ctx.fillRect(x, 18, 16, 16);
  }

  const avance = Math.min(1, sergio.x / (m.largo - ANCHO / 2));
  ctx.fillStyle = '#242a35';
  ctx.fillRect(20, 58, 240, 6);
  ctx.fillStyle = COLORES[nivel];
  ctx.fillRect(20, 58, 240 * avance, 6);
  ctx.textAlign = 'left';
}

function centrado(texto, y, tam, color) {
  ctx.textAlign = 'center';
  ctx.font = `${tam}px monospace`;
  ctx.fillStyle = color;
  ctx.fillText(texto, ANCHO / 2, y);
  ctx.textAlign = 'left';
}

const parpadea = () => ((tic / 30) | 0) % 2 === 0;

function dibujarPortada() {
  ctx.fillStyle = '#0a0812';
  ctx.fillRect(0, 0, ANCHO, ALTO);
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.1 + 0.5 * Math.abs(Math.sin(tic * 0.02 + i))})`;
    ctx.fillRect((i * 197) % ANCHO, (i * 91) % 300, 2, 2);
  }

  for (let i = 0; i < NIVELES; i++) {
    ctx.strokeStyle = COLORES[i];
    ctx.lineWidth = 6;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(-20, 470 - i * 7);
    ctx.quadraticCurveTo(ANCHO / 2, 120 - i * 18, ANCHO + 20, 470 - i * 7);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const letras = ctx.createLinearGradient(250, 0, 550, 0);
  COLORES.forEach((c, i) => letras.addColorStop(i / 6, c));
  ctx.textAlign = 'center';
  ctx.font = 'bold 92px monospace';
  ctx.fillStyle = letras;
  ctx.fillText('IRIS', ANCHO / 2, 190);
  ctx.textAlign = 'left';

  centrado('Recover the seven colours', 228, 18, '#9b93b8');
  if (parpadea()) centrado('PRESS ENTER', 420, 22, '#ffffff');

  blit(sprites.sergio[1], 120, 470, false);
  blit(sprites.iris[1], 620, 470, true);

  if (teclas.entra) empezar();
}

function dibujarLetrero() {
  ctx.fillStyle = '#0a0812';
  ctx.fillRect(0, 0, ANCHO, ALTO);
  letrero.t += 1 / FPS;

  letrero.lineas.forEach((linea, i) => centrado(linea, 230 + i * 34, 20, '#d8d2ec'));

  if (letrero.t > 0.8 && parpadea()) centrado('ENTER', 480, 15, '#5a5470');
  if (teclas.entra && letrero.t > 0.5) {
    const seguir = letrero.despues;
    letrero = null;
    seguir();
  }
}

function dibujarDerrota() {
  ctx.fillStyle = '#0a0812';
  ctx.fillRect(0, 0, ANCHO, ALTO);
  centrado('NO LIVES LEFT', 220, 46, '#e05a5a');
  centrado(`The chasm swallowed Sergio on level ${nivel + 1}.`, 300, 18, '#ffffff');
  centrado("Iris is grey once more.", 332, 18, '#7d7796');
  centrado('Press ENTER to start over', 420, 18, '#4caf50');
  if (teclas.entra) empezar();
}

function dibujarFinal() {
  relojFinal += 1 / 60;
  ctx.fillStyle = '#08060f';
  ctx.fillRect(0, 0, ANCHO, ALTO);
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.fillRect((i * 131) % ANCHO, (i * 71) % 360, 2, 2);
  }

  const px = 360;
  const py = 300;

  if (relojFinal < 4) {
    const ix = Math.min(px - 90, 80 + relojFinal * 70);
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ix + 20, py + 14, 38 + Math.sin(relojFinal * 3) * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    blit(sprites.iris[((relojFinal * 8) | 0) % 2], ix, py - 6, false);
  }

  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#cfe6ff';
  ctx.beginPath();
  ctx.moveTo(px, py - 40);
  ctx.lineTo(px + 36, py + 34);
  ctx.lineTo(px - 36, py + 34);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  if (relojFinal > 3.2) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.globalAlpha = Math.min(1, relojFinal - 3.2);
    ctx.beginPath();
    ctx.moveTo(90, py + 8);
    ctx.lineTo(px - 22, py + 8);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  for (let i = 0; i < NIVELES; i++) {
    const abierto = relojFinal - 4 - i * 0.3;
    if (abierto <= 0) continue;
    ctx.strokeStyle = COLORES[i];
    ctx.lineWidth = 7;
    ctx.globalAlpha = Math.min(1, abierto * 1.6);
    ctx.beginPath();
    ctx.moveTo(px + 18, py + 20 - i * 7);
    ctx.quadraticCurveTo(560, 110 - i * 12, 760, 400 - i * 6);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  if (relojFinal > 6.6) {
    const t = Math.min(1, (relojFinal - 6.6) / 4);
    const x = (1 - t) * (1 - t) * (px + 18) + 2 * (1 - t) * t * 560 + t * t * 700;
    const y = (1 - t) * (1 - t) * (py + 20) + 2 * (1 - t) * t * 110 + t * t * 396;
    blit(sprites.sergio[((relojFinal * 9) | 0) % 2], x - 20, y - 34, false);
  }

  if (relojFinal > 8) {
    ctx.globalAlpha = Math.min(1, relojFinal - 8);
    blit(sprites.sergio[1], 700, 380, true);
    ctx.globalAlpha = 1;
  }

  if (relojFinal > 11.5) {
    centrado('IRIS GAVE HERSELF UP SO THEY COULD BE TOGETHER.', 500, 20, '#cfc8e6');
    if (parpadea()) centrado('ENTER', 534, 15, '#6a6488');
    if (teclas.entra) {
      escena = 'PORTADA';
      colores = 0;
      irisBlanca = false;
      rehacerSprites();
    }
  }
}

function mueveTodo() {
  const izq = cam.x - 80;
  const der = cam.x + ANCHO + 80;
  const cerca = visibles(mapa.plataformas, izq, der);

  if (floracion < 0) {
    sergio.mover(cerca);
  } else {
    floracion++;
    if (floracion > 115) finNivel();
  }

  guardaEstela();
  mueveRayos(cerca, mapa);
  mueveHumanos(mapa);
  cam.mover(sergio);

  return { cerca, izq, der };
}

function dibujarPartida(vista) {
  dibujarCielo(mapa.tono);

  ctx.save();
  ctx.translate(-Math.round(cam.x), 0);
  dibujarPlataformas(vista.cerca, mapa.tono);
  dibujarCristal(mapa.cristal);
  dibujarIris();
  dibujarHumanos(mapa, vista.izq, vista.der);
  dibujarRayos();
  sergio.dibujar();
  ctx.restore();

  if (floracion >= 0 && floracion < 40) {
    ctx.globalAlpha = Math.max(0, 0.55 * (1 - floracion / 40));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, ANCHO, ALTO);
    ctx.globalAlpha = 1;
  }

  dibujarMarcador(mapa);
  if (floracion >= 0) centrado(`${NOMBRES[nivel]} RECOVERED`, 130, 24, '#ffffff');
  if (floracion >= 0) centrado('+1 LIFE', 162, 16, '#cfc8e6');
}

function bucle() {
  ctx.clearRect(0, 0, ANCHO, ALTO);
  musica();

  switch (escena) {
    case 'PORTADA':
      dibujarPortada();
      break;
    case 'LETRERO':
      dibujarLetrero();
      break;
    case 'PARTIDA':
      if (quiereOtroNivel) {
        semillaMundo = (Math.random() * 1e9) | 0;
        cargarNivel(nivel);
      }
      const vista = mueveTodo();
      if (escena === 'PARTIDA') {
        dibujarPartida(vista);
        if (floracion < 0 && tocaCristal(sergio, mapa.cristal)) alAgarrar();
      }
      break;
    case 'DERROTA':
      dibujarDerrota();
      break;
    case 'FINAL':
      dibujarFinal();
      break;
  }

  ultimoT = tic;
  tic++;
  quiereOtroNivel = false;
  requestAnimationFrame(bucle);
}

const ayuda = document.createElement('div');
ayuda.style.cssText = 'margin-top:16px;max-width:800px;text-align:center;font:14px monospace;color:#8f88b0;line-height:1.9;letter-spacing:.5px';
[
  '[A and D] Move   |   [W] Jump   |   [M] Shoot   |   [R] Restart   |   [N] Mute',
  'You have three lives. Each colour grants one   |   You can also land on the enemies'
].forEach((linea) => {
  const fila = document.createElement('p');
  fila.textContent = linea;
  fila.style.margin = '0';
  ayuda.appendChild(fila);
});
document.body.style.flexDirection = 'column';
document.body.appendChild(ayuda);

rehacerSprites();
requestAnimationFrame(bucle);
