// "Som do mar": ambiente subaquático sintetizado ao vivo (nenhum arquivo de áudio).
// Ruído marrom filtrado faz o mar, um zumbido grave faz o fundo, e bolhas
// aparecem mais perto da superfície.
export function createSea() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);

  // mar: ruído marrom em loop, com "ondas" de volume
  const len = ctx.sampleRate * 6, buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch); let last = 0;
    for (let i = 0; i < len; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }
  }
  const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = .5;
  const swell = ctx.createGain(); swell.gain.value = .55;
  const lfo = ctx.createOscillator(); lfo.frequency.value = .07;
  const lfoAmt = ctx.createGain(); lfoAmt.gain.value = .3;
  lfo.connect(lfoAmt).connect(swell.gain);
  noise.connect(lp).connect(swell).connect(master);

  // fundo: zumbido grave
  const drone = ctx.createGain(); drone.gain.value = .0; drone.connect(master);
  [55, 82.4, 110.3].forEach((f, i) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.detune.value = (i - 1) * 6;
    const g = ctx.createGain(); g.gain.value = [.05, .025, .012][i]; o.connect(g).connect(drone); o.start();
  });

  noise.start(); lfo.start();
  let depth = 0, timer = 0, on = false;

  function bubble() {
    if (!on) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    const f = 300 + Math.random() * 500;
    o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (2.2 + Math.random()), t + .07);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05 * Math.exp(-depth / 200), t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + .1);
    o.connect(g).connect(master); o.start(t); o.stop(t + .12);
    const rate = 160 + depth * 1.4;
    timer = setTimeout(bubble, rate + Math.random() * rate * 4);
  }

  return {
    play() { on = true; ctx.resume(); master.gain.cancelScheduledValues(ctx.currentTime); master.gain.linearRampToValueAtTime(.55, ctx.currentTime + 1.5); clearTimeout(timer); bubble(); },
    pause() { on = false; clearTimeout(timer); master.gain.cancelScheduledValues(ctx.currentTime); master.gain.linearRampToValueAtTime(0, ctx.currentTime + .6); },
    setDepth(d) {
      depth = Math.max(0, d);
      const t = ctx.currentTime;
      lp.frequency.setTargetAtTime(120 + 420 * Math.exp(-depth / 900), t, .4);
      drone.gain.setTargetAtTime(Math.min(1, depth / 2500) * .9, t, .6);
    },
  };
}
