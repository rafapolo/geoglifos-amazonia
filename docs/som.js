// Som do tour: música gerada na hora com Web Audio, sem arquivo de som.
// Escala pentatônica de ré menor (ré, fá, sol, lá, dó), flauta de bambu com sopro,
// maracá e chuva de sementes, tambor grave e bordão. Tudo segue a câmera:
//   zoom      → brilho do bordão (filtro) e o tambor, que só bate de perto
//   inclinação→ quanto vai para o eco da sala
//   rumo      → posição esquerda/direita do bordão e da flauta
//   velocidade→ densidade e força do maracá, chuva de sementes e vento nos voos
// Detalhes e valores em design/tour.md. ?som=debug expõe window.som.
(() => {
  const ESCALA = [0, 3, 5, 7, 10];          // pentatônica menor, em semitons sobre ré
  const RE = 146.83;                        // ré 3
  const BPM = 92, PASSO = 60 / BPM / 4;     // semicolcheia
  // nota do bordão de cada cena (semitons sobre ré, sempre dentro da escala)
  const RAIZ_CENA = [0, 3, 5, -2, 7, 0, 3, -2, 5, 0];
  const CHAVE = 'geoglifos-som';
  // coro de vozes cantando juntas; ?coro=0 desliga (para comparar)
  const CORO = new URLSearchParams(location.search).get('coro') !== '0';
  // cenas em que o grupo também marca o pulso: cerimônias (6) e o fecho (9)
  const CENAS_CANTO = new Set([6, 9]);
  // vogais pelos três primeiros formantes (Hz, voz grave; a aguda sobe ~17%)
  const VOGAIS = { a: [730, 1090, 2440], o: [570, 840, 2410], u: [320, 870, 2240], e: [530, 1840, 2480] };

  let ctx = null, saida, bus, sala, bordao, ventoG, ventoF, ruido, coroBus;
  let cenaN = 0;
  let tocando = false, ligado = true, raf = 0, timer = 0;
  let prox = 0, passo = 0, raiz = 0;
  let vel = 0, ultimo = null, ultimaFrase = 0;
  const cam = { zoom: 5, pitch: 0, bearing: 0, giro: 0 };

  try { ligado = localStorage.getItem(CHAVE) !== 'off'; } catch {}

  const hz = (semi, oit = 0) => RE * 2 ** ((semi + 12 * oit) / 12);
  const lim = (v, a, b) => Math.max(a, Math.min(b, v));
  const sorte = (a) => a[Math.floor(Math.random() * a.length)];

  function montar() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (navigator.audioSession) navigator.audioSession.type = 'ambient';
    // mestre: passa-altas → compressor → limitador → teto suave
    const pa = ctx.createBiquadFilter(); pa.type = 'highpass'; pa.frequency.value = 30;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.2;
    const limit = ctx.createDynamicsCompressor();
    limit.threshold.value = -3; limit.ratio.value = 20; limit.attack.value = 0.002; limit.release.value = 0.1;
    const teto = ctx.createWaveShaper();
    const curva = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) curva[i] = Math.tanh((i / 511.5 - 1) * 1.2) / Math.tanh(1.2);
    teto.curve = curva;
    saida = ctx.createGain(); saida.gain.value = 0;
    bus = ctx.createGain(); bus.gain.value = 0.8;
    bus.connect(pa); pa.connect(comp); comp.connect(limit); limit.connect(teto); teto.connect(saida); saida.connect(ctx.destination);

    // sala: 3 s de ruído morrendo, os agudos primeiro
    const n = ctx.sampleRate * 3, ir = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c); let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / n, k = 0.15 + 0.8 * t;
        lp += (Math.random() * 2 - 1 - lp) * (1 - k);
        d[i] = lp * (1 - t) ** 2.4 * 0.5;
      }
    }
    const conv = ctx.createConvolver(); conv.buffer = ir;
    const pre = ctx.createDelay(); pre.delayTime.value = 0.015;
    sala = ctx.createGain(); sala.gain.value = 0.3;
    sala.connect(pre); pre.connect(conv); conv.connect(bus);

    // ruído branco reaproveitado por maracá, vento e sopro
    ruido = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const r = ruido.getChannelData(0);
    for (let i = 0; i < r.length; i++) r[i] = Math.random() * 2 - 1;

    // bordão: triângulo duas oitavas abaixo + serra uma oitava abaixo, filtro do zoom
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.7; f.frequency.value = 300;
    const pan = ctx.createStereoPanner();
    const g = ctx.createGain(); g.gain.value = 0;
    const o1 = ctx.createOscillator(); o1.type = 'triangle';
    const o2 = ctx.createOscillator(); o2.type = 'sawtooth';
    const o3 = ctx.createOscillator(); o3.type = 'sawtooth'; o3.detune.value = 7;
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    o1.connect(g); o2.connect(g2); o3.connect(g2); g2.connect(g);
    // quinta acima, bem baixa: o bordão fica "aberto" como de taboca
    const o4 = ctx.createOscillator(); o4.type = 'sine';
    const g4 = ctx.createGain(); g4.gain.value = 0.18; o4.connect(g4); g4.connect(g);
    g.connect(f); f.connect(pan); pan.connect(bus);
    const env = ctx.createGain(); env.gain.value = 0.35; f.connect(env); env.connect(sala);
    [o1, o2, o3, o4].forEach((o) => o.start());
    bordao = { g, f, pan, o1, o2, o3, o4, env };
    afinarBordao(0, 0);

    // coro: soma das vozes, com mais sala que os outros instrumentos (canto em roda, ao ar livre)
    coroBus = ctx.createGain(); coroBus.gain.value = 1;
    const coroSala = ctx.createGain(); coroSala.gain.value = 0.7;
    coroBus.connect(bus); coroBus.connect(coroSala); coroSala.connect(sala);

    // vento dos voos: ruído em banda, mais alto e mais agudo quanto mais rápido
    const vs = ctx.createBufferSource(); vs.buffer = ruido; vs.loop = true;
    ventoF = ctx.createBiquadFilter(); ventoF.type = 'bandpass'; ventoF.Q.value = 1.2; ventoF.frequency.value = 400;
    ventoG = ctx.createGain(); ventoG.gain.value = 0;
    vs.connect(ventoF); ventoF.connect(ventoG); ventoG.connect(bus); ventoG.connect(sala);
    vs.start();
  }

  function afinarBordao(semi, deslize) {
    const t = ctx.currentTime;
    const alvo = (o, f) => o.frequency.setTargetAtTime(f, t, deslize || 0.001);
    alvo(bordao.o1, hz(semi, -2)); alvo(bordao.o2, hz(semi, -1)); alvo(bordao.o3, hz(semi, -1)); alvo(bordao.o4, hz(semi + 7, -2));
  }

  // ---------- instrumentos ----------

  // flauta de bambu: seno com deslize na entrada, vibrato tardio e sopro em banda
  function flauta(freq, t, dur, v = 0.6, pan = 0) {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(freq * 0.965, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.07);
    const vib = ctx.createOscillator(); vib.frequency.value = 5.2;
    const vg = ctx.createGain(); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(freq * 0.006, t + Math.min(dur, 0.45));
    vib.connect(vg); vg.connect(o.frequency);
    const h = ctx.createOscillator(); h.type = 'sine'; h.frequency.value = freq * 2;
    const hg = ctx.createGain(); hg.gain.value = 0.12; h.connect(hg);
    const s = ctx.createBufferSource(); s.buffer = ruido; s.playbackRate.value = 0.7 + Math.random() * 0.6;
    const sf = ctx.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = freq * 1.5; sf.Q.value = 6;
    const sg = ctx.createGain(); sg.gain.value = 0.5; s.connect(sf); sf.connect(sg);
    const g = ctx.createGain(), p = ctx.createStereoPanner(); p.pan.value = pan;
    const a = 0.06, pico = 0.09 * v;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(pico, t + a);
    g.gain.setTargetAtTime(pico * 0.75, t + a, 0.2);
    g.gain.setTargetAtTime(0, t + dur, 0.12);
    o.connect(g); hg.connect(g); sg.connect(g); g.connect(p); p.connect(bus);
    const e = ctx.createGain(); e.gain.value = 0.9; p.connect(e); e.connect(sala);
    const fim = t + dur + 0.8;
    [o, vib, h, s].forEach((x) => { x.start(t); x.stop(fim); });
  }

  // maracá: um golpe são 3 a 6 sementes batendo em 30 ms, ruído agudo de decaimento curto
  function maraca(t, v, pan, brilho = 1) {
    const n = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) semente(t + Math.random() * 0.03, v * (0.5 + Math.random() * 0.5), pan, 4500 * brilho + Math.random() * 2500, 0.035 + Math.random() * 0.05);
  }
  function semente(t, v, pan, freq, dec) {
    const s = ctx.createBufferSource(); s.buffer = ruido;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.6;
    const g = ctx.createGain(), p = ctx.createStereoPanner(); p.pan.value = lim(pan, -1, 1);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22 * v, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dec);
    s.connect(f); f.connect(g); g.connect(p); p.connect(bus);
    const e = ctx.createGain(); e.gain.value = 0.25; p.connect(e); e.connect(sala);
    s.start(t, Math.random() * 1.5); s.stop(t + dec + 0.02);
  }

  // tambor grave de couro: seno caindo de tom, com estalo na batida
  function tambor(t, v, pan = 0, base = 62) {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(base * 1.9, t); o.frequency.exponentialRampToValueAtTime(base, t + 0.08);
    const g = ctx.createGain(), p = ctx.createStereoPanner(); p.pan.value = pan;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5 * v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    o.connect(g); g.connect(p); p.connect(bus);
    const e = ctx.createGain(); e.gain.value = 0.3; p.connect(e); e.connect(sala);
    o.start(t); o.stop(t + 1);
    semente(t, v * 0.35, pan, 1800, 0.02);
  }

  // ---------- coro ----------

  // a voz canta numa tessitura confortável: grave entre lá 2 e ré 4, a aguda uma oitava acima
  const dobrar = (semi) => { while (semi > 12) semi -= 12; while (semi < -5) semi += 12; return semi; };

  // uma voz: serra (pregas vocais) com vibrato próprio, pelos três formantes da vogal, mais sopro;
  // as notas seguem em ligadura, como se canta
  function voz(notas, vogal, v, pan, aguda) {
    const t0 = notas[0].t, ult = notas[notas.length - 1], fim = ult.t + ult.d;
    const oit = aguda ? 1 : 0, desaf = 2 ** ((Math.random() * 24 - 12) / 1200);
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    notas.forEach((n, i) => {
      const f = hz(n.semi, oit) * desaf;
      if (i === 0) { o.frequency.setValueAtTime(f * 0.97, n.t); o.frequency.exponentialRampToValueAtTime(f, n.t + 0.12); }
      else o.frequency.setTargetAtTime(f, n.t, 0.035);
    });
    const vib = ctx.createOscillator(); vib.frequency.value = 4.6 + Math.random() * 1.4;
    const vg = ctx.createGain(); vg.gain.setValueAtTime(0, t0); vg.gain.linearRampToValueAtTime(hz(notas[0].semi, oit) * 0.009, t0 + 0.7);
    vib.connect(vg); vg.connect(o.frequency);
    const esc = aguda ? 1.17 : 1;
    const g = ctx.createGain(), p = ctx.createStereoPanner(); p.pan.value = lim(pan, -1, 1);
    VOGAIS[vogal].forEach((fm, k) => {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fm * esc; bp.Q.value = [8, 10, 12][k];
      const kg = ctx.createGain(); kg.gain.value = [1, 0.6, 0.3][k];
      o.connect(bp); bp.connect(kg); kg.connect(g);
    });
    const s = ctx.createBufferSource(); s.buffer = ruido; s.loop = true;
    const sf = ctx.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = VOGAIS[vogal][1] * esc; sf.Q.value = 1.5;
    const sg = ctx.createGain(); sg.gain.value = 0.05; s.connect(sf); sf.connect(sg); sg.connect(g);
    const pico = 0.11 * v, ataque = 0.08 + Math.random() * 0.14;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(pico, t0 + ataque);
    g.gain.setTargetAtTime(pico * 0.8, t0 + ataque, 0.4);
    g.gain.setTargetAtTime(0, fim, 0.16 + Math.random() * 0.12);
    g.connect(p); p.connect(coroBus);
    [o, vib, s].forEach((x) => { x.start(t0); x.stop(fim + 1.5); });
  }

  // o grupo: 8 vozes (metade grave, metade aguda) que entram cada uma no seu tempo, espalhadas em roda
  function coro(notas, forca = 1, vogal = sorte(['a', 'a', 'o', 'e', 'u'])) {
    if (!CORO || !notas.length) return;
    const N = 8;
    for (let i = 0; i < N; i++) {
      const atraso = Math.random() * 0.09;
      const minhas = notas.map((n) => ({ semi: dobrar(n.semi), t: n.t + atraso, d: n.d }));
      voz(minhas, vogal, forca * (0.65 + Math.random() * 0.35), -0.8 + (1.6 * i) / (N - 1) + (Math.random() - 0.5) * 0.2, i % 2 === 1);
    }
  }

  // ---------- composição ----------

  // frase da flauta: passeio na pentatônica; de longe notas longas e graves, de perto mais altas e ornadas
  function frase(t0 = ctx.currentTime + 0.05) {
    const perto = lim((cam.zoom - 5) / 10, 0, 1);
    const pan = Math.sin((cam.bearing * Math.PI) / 180) * 0.45;
    const n = 3 + Math.floor(Math.random() * 3 + perto * 2);
    let grau = 5 + Math.floor(perto * 3), t = t0;
    const batida = 60 / BPM, tocadas = [];
    for (let i = 0; i < n; i++) {
      grau = lim(grau + sorte([-2, -1, -1, 1, 1, 2, 0]), 2, 11);
      const semi = ESCALA[grau % 5] + 12 * Math.floor(grau / 5) + raiz;
      const ultima = i === n - 1;
      const d = (ultima ? sorte([2, 3]) : sorte(perto > 0.5 ? [0.5, 0.5, 1, 1.5] : [1, 1.5, 2])) * batida;
      // ornamento: apojatura de cima, mais comum de perto
      if (!ultima && Math.random() < 0.15 + perto * 0.3) flauta(hz(semi + 2, 1), t, 0.07, 0.4, pan);
      flauta(hz(semi, 1), t, d * 0.95, 0.55 + Math.random() * 0.25, pan);
      tocadas.push(semi);
      t += d;
    }
    // pergunta e resposta: o grupo repete o fim da frase e segura a última nota
    // (quase sempre nas cenas de cerimônia; de perto, mais vezes que de longe)
    const chance = CENAS_CANTO.has(cenaN) ? 0.9 : 0.45 + perto * 0.3;
    if (CORO && Math.random() < chance) {
      let tr = t + batida * 0.5;
      const fim = tocadas.slice(-Math.min(3, tocadas.length));
      const resposta = fim.map((semi, i) => {
        const d = (i === fim.length - 1 ? 3 : 1) * batida;
        const n = { semi, t: tr, d }; tr += d; return n;
      });
      coro(resposta, 0.8 + perto * 0.4);
      t = tr;
    }
    ultimaFrase = performance.now() + (t - t0) * 1000;
  }

  // agendador: semicolcheias à frente do relógio do áudio
  function agendar() {
    if (!ctx) return;
    while (prox < ctx.currentTime + 0.12) {
      const s = passo % 16, t = prox;
      const forca = s % 4 === 0 ? 1 : s % 2 === 0 ? 0.6 : 0.3;
      // maracá: parado só marca o tempo, em movimento enche até as semicolcheias
      const chance = s % 4 === 0 ? 0.35 + vel : s % 2 === 0 ? vel * 1.4 : vel * vel * 1.6;
      if (Math.random() < chance) {
        const lado = (s % 2 ? -1 : 1) * (0.2 + Math.min(0.6, Math.abs(cam.giro) / 40));
        maraca(t, forca * (0.35 + 0.65 * vel), lado, 0.9 + vel * 0.3);
      }
      // chuva de sementes (pau de chuva) nos voos rápidos
      const graos = Math.floor(vel * vel * 7 * Math.random());
      for (let i = 0; i < graos; i++) semente(t + Math.random() * PASSO, 0.12 + Math.random() * 0.2, Math.random() * 1.6 - 0.8, 3000 + Math.random() * 5000, 0.02 + Math.random() * 0.03);
      // tambor: só de perto (zoom 8 → 15), no 1 e no "e" do 3
      const perto = lim((cam.zoom - 8) / 7, 0, 1);
      if (perto > 0.05 && (s === 0 || (s === 10 && perto > 0.4)) ) tambor(t, (s === 0 ? 0.5 : 0.3) * (0.3 + 0.7 * perto), 0, hz(raiz, -3) * 0.75 + 20);
      // cenas de cerimônia: o grupo marca o pulso a cada dois compassos, "rê-ê" na nota da cena e na quinta abaixo
      if (CORO && CENAS_CANTO.has(cenaN) && passo % 32 === 0 && performance.now() > ultimaFrase - 200) {
        const b = 60 / BPM;
        coro([{ semi: raiz, t, d: b * 0.45 }, { semi: raiz, t: t + b, d: b * 0.45 }, { semi: raiz - 5, t: t + 2 * b, d: b * 1.6 }], 0.55, sorte(['e', 'a']));
      }
      passo++; prox += PASSO;
    }
    // com a câmera calma, a flauta volta sozinha
    if (vel < 0.25 && performance.now() - ultimaFrase > 7000 + Math.random() * 4000) frase();
  }

  // câmera → som, a cada quadro
  function seguir() {
    if (!tocando) return;
    raf = requestAnimationFrame(seguir);
    if (!ctx || !window.map) return;
    const agora = performance.now();
    const c = map.getCenter(), z = map.getZoom(), b = map.getBearing(), p = map.getPitch();
    if (ultimo) {
      const dt = Math.max(0.001, (agora - ultimo.t) / 1000);
      const pt = map.project(ultimo.c);
      const px = Math.hypot(pt.x - map.getCanvas().clientWidth / 2, pt.y - map.getCanvas().clientHeight / 2);
      const giro = ((b - ultimo.b + 540) % 360) - 180;
      const bruto = (px + Math.abs(z - ultimo.z) * 800 + Math.abs(giro) * 4) / dt;
      const alvo = lim(Math.sqrt(bruto / 1500), 0, 1);
      vel += (alvo - vel) * (alvo > vel ? 0.25 : 0.05);
      cam.giro = giro / dt;
    }
    ultimo = { t: agora, c, z, b };
    Object.assign(cam, { zoom: z, pitch: p, bearing: b });
    const t = ctx.currentTime;
    bordao.f.frequency.setTargetAtTime(lim(220 * 2 ** ((z - 5) / 2.6), 150, 2600), t, 0.15);
    bordao.pan.pan.setTargetAtTime(Math.sin((b * Math.PI) / 180) * 0.5, t, 0.2);
    sala.gain.setTargetAtTime(0.2 + (p / 78) * 0.45, t, 0.3);
    ventoG.gain.setTargetAtTime(0.09 * vel * vel, t, 0.15);
    ventoF.frequency.setTargetAtTime(300 + 1500 * vel, t, 0.15);
  }

  // ---------- API usada pelo tour ----------

  function iniciar() {
    if (!ligado) return;
    if (!ctx) montar();
    ctx.resume();
    tocando = true;
    const t = ctx.currentTime;
    saida.gain.cancelScheduledValues(t);
    saida.gain.setValueAtTime(saida.gain.value, t);
    saida.gain.linearRampToValueAtTime(1, t + 0.4);
    bordao.g.gain.setTargetAtTime(0.11, t, 0.8);
    prox = t + 0.1; passo = 0; vel = 0; ultimo = null; ultimaFrase = performance.now();
    clearInterval(timer); timer = setInterval(agendar, 25);
    cancelAnimationFrame(raf); seguir();
  }

  // nova cena: o bordão desliza para a nota da cena e o tambor marca a chegada
  function cena(i) {
    if (!tocando) return;
    cenaN = i;
    raiz = RAIZ_CENA[i % RAIZ_CENA.length];
    afinarBordao(raiz, 0.8);
    const t = ctx.currentTime + 0.02;
    tambor(t, 0.8, 0, hz(raiz, -3) * 0.75 + 20);
    tambor(t + 0.33, 0.45, 0, hz(raiz, -3) * 0.75 + 20);
  }

  // legenda nova: uma frase da flauta, se ela não estiver no meio de outra
  function legenda() {
    if (!tocando) return;
    if (performance.now() > ultimaFrase - 300) frase(ctx.currentTime + 0.3);
  }

  // fim: cadência descendo até o ré, rufo de maracá e o som se apaga
  function parar(cadencia = false) {
    if (!tocando) return;
    tocando = false;
    cancelAnimationFrame(raf);
    clearInterval(timer);
    const t = ctx.currentTime;
    let fade = 0.8;
    if (cadencia) {
      raiz = 0; afinarBordao(0, 0.5);
      [7, 5, 3, 0].forEach((s, i) => flauta(hz(s, 1), t + i * 0.32, i === 3 ? 2.4 : 0.34, 0.6));
      // o grupo desce junto e segura o ré
      coro([7, 5, 3, 0].map((semi, i) => ({ semi, t: t + i * 0.32, d: i === 3 ? 3 : 0.32 })), 0.9, 'a');
      for (let i = 0; i < 14; i++) maraca(t + i * 0.07, 0.25 + i * 0.03, (i % 2 ? -0.4 : 0.4));
      tambor(t + 0.96, 0.9); tambor(t + 1.28, 0.6);
      fade = 3.2;
    }
    ventoG.gain.setTargetAtTime(0, t, 0.1);
    saida.gain.cancelScheduledValues(t);
    saida.gain.setValueAtTime(saida.gain.value, t + (cadencia ? 1.2 : 0));
    saida.gain.linearRampToValueAtTime(0, t + (cadencia ? 1.2 : 0) + fade);
    bordao.g.gain.setTargetAtTime(0, t + (cadencia ? 1.2 : 0), fade / 3);
    setTimeout(() => { if (!tocando) ctx.suspend(); }, ((cadencia ? 1.2 : 0) + fade + 0.5) * 1000);
  }

  function alternar() {
    ligado = !ligado;
    try { localStorage.setItem(CHAVE, ligado ? 'on' : 'off'); } catch {}
    if (window.tour?.ativo()) {
      if (ligado) { iniciar(); cena(window.tour.cena?.() ?? 0); } else parar(false);
    }
    return ligado;
  }

  // a aba escondida cala; de volta, o som volta sozinho
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !tocando) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });
  // ?tour=1 começa sem gesto: o navegador segura o som até o primeiro toque
  addEventListener('pointerdown', () => { if (ctx && tocando && ctx.state !== 'running') ctx.resume(); }, true);
  addEventListener('keydown', () => { if (ctx && tocando && ctx.state !== 'running') ctx.resume(); }, true);

  const api = { iniciar, cena, legenda, parar, alternar, ligado: () => ligado };
  window.somTour = api;
  if (new URLSearchParams(location.search).get('som') === 'debug') {
    // som.pico(): maior amostra e RMS da saída agora (0–1)
    let an = null;
    const pico = () => {
      if (!ctx) return null;
      if (!an) { an = ctx.createAnalyser(); an.fftSize = 4096; saida.connect(an); }
      const d = new Float32Array(an.fftSize); an.getFloatTimeDomainData(d);
      let m = 0, q = 0; for (const x of d) { m = Math.max(m, Math.abs(x)); q += x * x; }
      return { pico: +m.toFixed(3), rms: +Math.sqrt(q / d.length).toFixed(3) };
    };
    window.som = { ...api, ctx: () => ctx, cam, vel: () => vel, frase, pico, coro: (semis = [0, 3, 5, 0], f = 1) => {
      const b = 60 / BPM, t = ctx.currentTime + 0.1;
      coro(semis.map((semi, i) => ({ semi, t: t + i * b, d: i === semis.length - 1 ? 3 * b : b })), f);
    } };
  }
})();
