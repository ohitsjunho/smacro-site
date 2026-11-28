/* The logging-first landing page: the try-it log card, the amount ruler, and the small touches. */
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var fmt = function (n) { return Math.round(n).toLocaleString('en-US'); };

  // ───────── reveal, ticker, look rail ─────────
  var rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    rv.forEach(function (el) { io.observe(el); });
  } else { rv.forEach(function (el) { el.classList.add('in'); }); }

  function loop(el, cls) {
    if (reduce) return;
    Array.prototype.slice.call(el.children).forEach(function (c) {
      var k = c.cloneNode(true); k.setAttribute('aria-hidden', 'true');
      k.querySelectorAll('img').forEach(function (i) { i.alt = ''; i.removeAttribute('loading'); });
      el.appendChild(k);
    });
    if (cls) el.classList.add(cls);
  }
  loop($('ticker'));
  loop($('rail'), 'run');

  // ───────── sound (off until asked for) ─────────
  var ctx = null, soundOn = false;
  var soundBtn = $('sound');
  soundBtn.addEventListener('click', function () {
    soundOn = !soundOn;
    if (soundOn && !ctx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    soundBtn.setAttribute('aria-pressed', String(soundOn));
    soundBtn.textContent = soundOn ? 'Sound on' : 'Sound off';
    if (soundOn) tock();
  });
  function blip(type, f0, f1, dur, vol, delay) {
    if (!soundOn || !ctx) return;
    var t = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function tock() { blip('sine', 520, 240, 0.14, 0.35); blip('sine', 1046, 1046, 0.22, 0.08, 0.07); blip('sine', 1568, 1568, 0.28, 0.05, 0.13); }
  function tick(major) { blip('triangle', major ? 1500 : 2600, major ? 900 : 1800, major ? 0.03 : 0.015, major ? 0.16 : 0.07); }
  // Vibrate only after a real tap (Android; iPhones don't vibrate for web pages), never for the demo.
  var touched = false;
  addEventListener('pointerdown', function () { touched = true; }, { once: true, capture: true });
  function buzz(ms) { if (touched && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} }

  // ───────── the log card ─────────
  var GOAL = { cal: 2025, p: 140, c: 220, f: 65 };
  // Per serving, or per 100 g where `g` is set (then `d` is the grams to assume).
  var FOODS = [
    { k: ['egg'], n: 'Egg, boiled', u: 'large', cal: 77.5, p: 6.3, c: .6, f: 5.3 },
    { k: ['banana'], n: 'Banana', u: 'medium', cal: 105, p: 1.3, c: 27, f: .4 },
    { k: ['oat', 'porridge'], n: 'Oatmeal, cooked', u: 'cup', cal: 166, p: 5.9, c: 28, f: 3.6 },
    { k: ['almond'], n: 'Almonds', u: 'oz', cal: 164, p: 6, c: 6, f: 14 },
    { k: ['chicken'], n: 'Chicken breast, cooked', g: true, d: 150, cal: 165, p: 31, c: 0, f: 3.6 },
    { k: ['salmon'], n: 'Salmon, cooked', g: true, d: 120, cal: 206, p: 22, c: 0, f: 12 },
    { k: ['yogurt', 'yoghurt'], n: 'Greek yogurt, plain', u: 'cup', cal: 150, p: 20, c: 8, f: 4 },
    { k: ['toast', 'bread'], n: 'Whole wheat toast', u: 'slice', cal: 80, p: 4, c: 14, f: 1 },
    { k: ['flat white', 'latte', 'coffee'], n: 'Flat white', u: 'cup', cal: 120, p: 6, c: 10, f: 6 },
    { k: ['avocado'], n: 'Avocado', u: 'whole', cal: 240, p: 3, c: 12, f: 22 },
    { k: ['rice'], n: 'White rice, cooked', u: 'cup', cal: 205, p: 4.3, c: 45, f: .4 },
    { k: ['apple'], n: 'Apple', u: 'medium', cal: 95, p: .5, c: 25, f: .3 },
    { k: ['peanut butter', 'pb'], n: 'Peanut butter', u: 'tbsp', cal: 95, p: 4, c: 3, f: 8 },
    { k: ['pizza'], n: 'Pizza, cheese', u: 'slice', cal: 285, p: 12, c: 36, f: 10 },
    { k: ['protein shake', 'shake', 'whey'], n: 'Protein shake', u: 'scoop', cal: 120, p: 24, c: 3, f: 1.5 }
  ];
  var WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, half: .5 };

  function parse(text) {
    var s = text.toLowerCase().trim();
    if (!s) return null;
    var qty = null, grams = false;
    var m = s.match(/^(\d+(?:\.\d+)?|(?:a|an|one|two|three|four|half)\b)\s*(g|grams?|gr)?\b\s*(?:of\s+)?/);
    if (m) {
      qty = WORDS[m[1]] !== undefined ? WORDS[m[1]] : parseFloat(m[1]);
      grams = !!m[2];
      s = s.slice(m[0].length);
    }
    s = s.replace(/^(cups?|slices?|oz|tbsp|scoops?|large|medium)\s+(of\s+)?/, '');
    if (!s) return null;
    var food = null;
    for (var i = 0; i < FOODS.length && !food; i++) {
      for (var j = 0; j < FOODS[i].k.length; j++) {
        var key = FOODS[i].k[j];
        if (s.indexOf(key) === 0 || key.indexOf(s) === 0 || s.indexOf(' ' + key) >= 0) { food = FOODS[i]; break; }
      }
    }
    if (!food) return null;
    var mult, sub;
    if (food.g) {
      var g = qty == null ? food.d : grams ? qty : qty * food.d;
      mult = g / 100; sub = fmt(g) + ' g';
    } else {
      mult = qty == null ? 1 : qty;
      var plural = mult > 1 && /^(cup|slice|scoop)$/.test(food.u) ? 's' : '';
      sub = (mult === .5 ? '½' : (Math.round(mult * 10) / 10)) + ' ' + food.u + plural;
    }
    if (mult <= 0 || mult > 40) return null;
    return {
      name: food.n, sub: sub,
      cal: food.cal * mult, p: food.p * mult, c: food.c * mult, f: food.f * mult
    };
  }

  var card = $('card'), input = $('line'), sug = $('sug'), btn = $('logBtn'), rows = $('rows'), empty = $('empty');
  var shown = { cal: 0, p: 0, c: 0, f: 0 }, total = { cal: 0, p: 0, c: 0, f: 0 };
  var current = null, auto = !reduce, busy = false;

  function paint(v) {
    $('calN').textContent = fmt(v.cal);
    $('mP').textContent = fmt(v.p); $('mC').textContent = fmt(v.c); $('mF').textContent = fmt(v.f);
  }
  function bars() {
    $('bP').style.width = Math.min(100, total.p / GOAL.p * 100) + '%';
    $('bC').style.width = Math.min(100, total.c / GOAL.c * 100) + '%';
    $('bF').style.width = Math.min(100, total.f / GOAL.f * 100) + '%';
  }
  // Count the numbers up with a little overshoot, like a dial settling.
  var raf = 0;
  function rollTo() {
    cancelAnimationFrame(raf);
    if (reduce) { shown = Object.assign({}, total); paint(shown); return; }
    var from = Object.assign({}, shown), t0 = performance.now(), D = 750;
    var ease = function (x) { var c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
    (function step(now) {
      var x = Math.min(1, (now - t0) / D), e = ease(x);
      ['cal', 'p', 'c', 'f'].forEach(function (k) { shown[k] = from[k] + (total[k] - from[k]) * e; });
      paint(shown);
      if (x < 1) raf = requestAnimationFrame(step); else { shown = Object.assign({}, total); paint(shown); }
    })(t0);
  }

  function suggest() {
    current = parse(input.value);
    if (current) {
      $('sName').textContent = current.name;
      $('sSub').textContent = current.sub + ' · P ' + fmt(current.p) + ' · C ' + fmt(current.c) + ' · F ' + fmt(current.f);
      $('sCal').textContent = fmt(current.cal);
      sug.classList.add('on');
    } else {
      sug.classList.remove('on');
    }
    $('hint').style.visibility = input.value && !current ? 'hidden' : '';
  }

  function burst(x, y) {
    if (reduce) return;
    var ring = document.createElement('span'); ring.className = 'ring';
    ring.style.left = x + 'px'; ring.style.top = y + 'px';
    document.body.appendChild(ring); setTimeout(function () { ring.remove(); }, 600);
    var colors = ['#E4572E', '#F3B440', '#3F5A47', '#C44A3A', '#F3B440'];
    for (var i = 0; i < 16; i++) {
      var s = document.createElement('span'); s.className = 'spark';
      s.style.background = colors[i % colors.length];
      s.style.left = x - 5 + 'px'; s.style.top = y - 5 + 'px';
      var size = 6 + Math.random() * 7; s.style.width = s.style.height = size + 'px';
      if (i % 3 === 0) s.style.borderRadius = '2px';
      document.body.appendChild(s);
      var a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 70;
      s.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: 'translate(' + Math.cos(a) * d + 'px,' + (Math.sin(a) * d - 20) + 'px) scale(.9)', opacity: 1, offset: .55 },
        { transform: 'translate(' + Math.cos(a) * d * 1.15 + 'px,' + (Math.sin(a) * d + 30) + 'px) scale(.3)', opacity: 0 }
      ], { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = (function (el) { return function () { el.remove(); }; })(s);
    }
  }
  function flyUp(text) {
    if (reduce) return;
    var r = $('calN').getBoundingClientRect();
    var f = document.createElement('span'); f.className = 'fly'; f.textContent = text;
    f.style.left = r.left - 10 + 'px'; f.style.top = r.top - 16 + 'px';
    document.body.appendChild(f); setTimeout(function () { f.remove(); }, 950);
  }

  function retrigger(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

  async function log() {
    if (!current || busy) return;
    busy = true;
    var item = current;
    btn.classList.add('hit');
    var r = btn.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2);
    tock(); buzz(18);
    await wait(110);
    btn.classList.remove('hit');

    if (empty.parentNode) empty.remove();
    var li = document.createElement('li'); li.className = 'new';
    var a = document.createElement('span'); a.textContent = item.name;
    var sm = document.createElement('small'); sm.textContent = item.sub; a.appendChild(sm);
    var b = document.createElement('span'); b.textContent = fmt(item.cal);
    li.append(a, b);
    rows.insertBefore(li, rows.firstChild);
    while (rows.children.length > 4) rows.lastChild.remove();
    setTimeout(function () { li.classList.remove('new'); }, 1500);

    ['cal', 'p', 'c', 'f'].forEach(function (k) { total[k] += item[k]; });
    rollTo(); bars();
    retrigger(card, 'thump'); retrigger($('cal'), 'bump');
    flyUp('+' + fmt(item.cal));

    input.value = ''; current = null; sug.classList.remove('on');
    $('hint').style.visibility = '';
    busy = false;
  }

  input.addEventListener('input', suggest);
  $('form').addEventListener('submit', function (e) { e.preventDefault(); log(); });
  btn.addEventListener('click', function () { stopAuto(); log(); });
  document.querySelectorAll('[data-try]').forEach(function (b) {
    b.addEventListener('click', function () { stopAuto(); input.value = b.getAttribute('data-try'); suggest(); input.focus(); });
  });
  $('reset').addEventListener('click', function () {
    stopAuto();
    total = { cal: 0, p: 0, c: 0, f: 0 }; rollTo(); bars();
    rows.innerHTML = ''; rows.appendChild(empty);
    input.value = ''; suggest(); input.focus();
  });
  // When someone takes over mid-demo, clear the half-written line so theirs starts fresh.
  function stopAuto() {
    if (!auto) return;
    auto = false;
    if (!busy) { input.value = ''; suggest(); }
    input.placeholder = 'Your turn. Write what you ate…';
  }
  // Tapping Log mid-demo logs what's shown; tapping anywhere else hands the card over.
  card.addEventListener('pointerdown', function (e) { if (e.target === btn) auto = false; else stopAuto(); });
  input.addEventListener('focus', stopAuto);

  // Log a few lines on its own so the card shows what it does, then hand it over.
  async function demo() {
    var lines = ['2 eggs', '1 cup oatmeal', 'a banana'];
    await wait(900);
    for (var i = 0; i < lines.length; i++) {
      if (!auto) return;
      for (var k = 1; k <= lines[i].length; k++) {
        if (!auto) return;
        input.value = lines[i].slice(0, k); suggest(); await wait(70 + Math.random() * 50);
      }
      await wait(900);
      if (!auto) return;
      await log();
      await wait(1100);
    }
    if (auto) { input.placeholder = 'Your turn. Write what you ate…'; }
  }
  if (auto) demo();

  // ───────── the amount ruler ─────────
  var ruler = $('ruler'), strip = $('strip');
  var SP = 11, MAX = 500, MIN = 1, CH = { cal: 165, p: 31, f: 3.6 };
  var val = 150, lastTick = 150, frag = document.createDocumentFragment();
  for (var g = 0; g <= MAX; g++) {
    var t = document.createElement('i'); t.style.left = g * SP + 'px';
    if (g % 10 === 0) {
      t.className = 'maj';
      var lab = document.createElement('span'); lab.textContent = g; lab.style.left = g * SP + 'px'; frag.appendChild(lab);
    }
    frag.appendChild(t);
  }
  strip.appendChild(frag);
  function showRuler() {
    strip.style.transform = 'translateX(' + (-val * SP) + 'px)';
    var n = Math.round(val);
    $('rAmt').textContent = n;
    $('rCal').textContent = fmt(CH.cal * n / 100);
    $('rP').textContent = fmt(CH.p * n / 100);
    $('rF').textContent = fmt(CH.f * n / 100);
    ruler.setAttribute('aria-valuenow', n);
    if (n !== lastTick) { tick(n % 10 === 0); if (n % 10 === 0) buzz(6); lastTick = n; }
  }
  function setVal(v) { val = Math.max(MIN, Math.min(MAX, v)); showRuler(); }
  showRuler();

  var dragX = null, dragVal = 0, vel = 0, lastX = 0, lastT = 0, coast = 0, moved = false;
  ruler.addEventListener('pointerdown', function (e) {
    cancelAnimationFrame(coast);
    dragX = e.clientX; dragVal = val; lastX = e.clientX; lastT = performance.now(); vel = 0; moved = false;
    ruler.setPointerCapture(e.pointerId);
  });
  ruler.addEventListener('pointermove', function (e) {
    if (dragX == null) return;
    var now = performance.now(), dt = Math.max(1, now - lastT);
    vel = 0.8 * vel + 0.2 * ((lastX - e.clientX) / SP / dt * 16);
    lastX = e.clientX; lastT = now;
    if (Math.abs(e.clientX - dragX) > 4) moved = true;
    setVal(dragVal + (dragX - e.clientX) / SP);
  });
  function release() {
    if (dragX == null) return;
    dragX = null;
    if (reduce) { setVal(Math.round(val)); return; }
    // Coast with the finger's speed, then settle on a tick.
    (function glide() {
      vel *= 0.93;
      if (Math.abs(vel) < 0.05 || val <= MIN || val >= MAX) { settle(); return; }
      setVal(val + vel);
      coast = requestAnimationFrame(glide);
    })();
  }
  function settle() {
    var target = Math.round(val), from = val, t0 = performance.now();
    (function s(now) {
      var x = Math.min(1, (now - t0) / 160);
      setVal(from + (target - from) * (1 - Math.pow(1 - x, 3)));
      if (x < 1) coast = requestAnimationFrame(s);
    })(t0);
  }
  ruler.addEventListener('pointerup', release);
  ruler.addEventListener('pointercancel', release);
  ruler.addEventListener('keydown', function (e) {
    var step = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { setVal(Math.round(val) + step); e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { setVal(Math.round(val) - step); e.preventDefault(); }
  });
  // Tapping either side nudges it a tick, as in the app.
  ruler.addEventListener('click', function (e) {
    if (moved) return;
    var r = ruler.getBoundingClientRect(), mid = r.left + r.width / 2;
    if (Math.abs(e.clientX - mid) > 40) setVal(Math.round(val) + (e.clientX > mid ? 1 : -1));
  });

  // ───────── a tap you can feel ─────────
  var feels = 0, feelCard = document.querySelector('.m-feel');
  var lines = ['Satisfying, right?', 'Once more.', 'It never gets old.', 'That one was good.', 'Okay, now do it with real food.'];
  $('feel').addEventListener('click', function (e) {
    feels++;
    retrigger(feelCard, 'buzz');
    var r = e.currentTarget.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2);
    tock(); buzz(18);
    $('feelCount').textContent = lines[Math.min(feels - 1, lines.length - 1)];
  });
})();
