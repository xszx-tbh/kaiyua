/* =========================================================
   蔚蓝档案风格 · 点击特效 + 拖动拖尾（可开关）
   ========================================================= */
window.__FX_LOADED__ = true;

(function () {
  'use strict';

  if (window.__BA_CLICK_FX_INSTALLED__) return;
  window.__BA_CLICK_FX_INSTALLED__ = true;

  var EFFECT_SCALE = 0.7;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(a, b) { return a + Math.random() * (b - a); }

  function smoothstep(a, b, x) {
    var t = clamp((x - a) / ((b - a) || 1), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function sampleKey(keys, t) {
    if (!keys || !keys.length) return 0;
    t = clamp(t, 0, 1);
    if (t <= keys[0][0]) return keys[0][1];
    for (var i = 1; i < keys.length; i++) {
      var a = keys[i - 1], b = keys[i];
      if (t <= b[0]) {
        var span = b[0] - a[0];
        var k = span > 0 ? (t - a[0]) / span : 1;
        return a[1] + (b[1] - a[1]) * k;
      }
    }
    return keys[keys.length - 1][1];
  }

  function sampleSmooth(keys, t) {
    if (!keys || !keys.length) return 0;
    t = clamp(t, 0, 1);
    if (t <= keys[0][0]) return keys[0][1];
    for (var i = 1; i < keys.length; i++) {
      var a = keys[i - 1], b = keys[i];
      if (t <= b[0]) {
        var span = b[0] - a[0];
        var k = span > 0 ? (t - a[0]) / span : 1;
        var s = k * k * (3 - 2 * k);
        return a[1] + (b[1] - a[1]) * s;
      }
    }
    return keys[keys.length - 1][1];
  }

  function sampleHermite(keys, t) {
    if (!keys || !keys.length) return 0;
    t = clamp(t, 0, 1);
    if (t <= keys[0][0]) return keys[0][1];
    for (var i = 1; i < keys.length; i++) {
      var a = keys[i - 1], b = keys[i];
      if (t <= b[0]) {
        var span = b[0] - a[0];
        var k = span > 0 ? (t - a[0]) / span : 1;
        var k2 = k * k, k3 = k2 * k;
        var m0 = (a[3] == null ? 0 : a[3]) * span;
        var m1 = (b[2] == null ? 0 : b[2]) * span;
        var h00 =  2 * k3 - 3 * k2 + 1;
        var h10 =      k3 - 2 * k2 + k;
        var h01 = -2 * k3 + 3 * k2;
        var h11 =      k3 -     k2;
        return h00 * a[1] + h10 * m0 + h01 * b[1] + h11 * m1;
      }
    }
    return keys[keys.length - 1][1];
  }

  function sampleColor(keys, t, out) {
    out = out || [0, 0, 0];
    t = clamp(t, 0, 1);
    if (!keys || !keys.length) { out[0]=out[1]=out[2]=0; return out; }
    if (t <= keys[0][0]) {
      var c0 = keys[0][1];
      out[0]=c0[0]; out[1]=c0[1]; out[2]=c0[2];
      return out;
    }
    for (var i = 1; i < keys.length; i++) {
      var a = keys[i - 1], b = keys[i];
      if (t <= b[0]) {
        var span = b[0] - a[0];
        var k = span > 0 ? (t - a[0]) / span : 1;
        out[0] = a[1][0] + (b[1][0] - a[1][0]) * k;
        out[1] = a[1][1] + (b[1][1] - a[1][1]) * k;
        out[2] = a[1][2] + (b[1][2] - a[1][2]) * k;
        return out;
      }
    }
    var c = keys[keys.length - 1][1];
    out[0]=c[0]; out[1]=c[1]; out[2]=c[2];
    return out;
  }

  function ringCoverage(a) {
    var v = 0.5
      + 0.28 * Math.sin(a * 1.0  + 0.61)
      + 0.17 * Math.sin(a * 2.3  + 1.42)
      + 0.10 * Math.sin(a * 5.1  + 2.83)
      + 0.05 * Math.sin(a * 11.7 + 4.15);
    return clamp(v, 0, 1);
  }

  function ringAngularVelocity(blend, t, R) {
    var minV = sampleSmooth(R.angVelMinKeys, t);
    var maxV = sampleSmooth(R.angVelMaxKeys, t);
    return lerp(minV, maxV, blend) * R.angVelMul * R.rotDir;
  }

  function parseRGB(str) {
    if (!str) return null;
    var m = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
    if (!m) return null;
    return {
      r: +m[1], g: +m[2], b: +m[3],
      a: m[4] !== undefined ? parseFloat(m[4]) : 1
    };
  }

  function detectBgLuma() {
    var el = document.body;
    while (el) {
      var cs;
      try { cs = getComputedStyle(el); } catch (e) { break; }
      var c = parseRGB(cs.backgroundColor);
      if (c && c.a > 0.5) {
        return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
      }
      el = el.parentElement;
    }
    try {
      var htmlC = parseRGB(getComputedStyle(document.documentElement).backgroundColor);
      if (htmlC && htmlC.a > 0.5) {
        return (0.2126 * htmlC.r + 0.7152 * htmlC.g + 0.0722 * htmlC.b) / 255;
      }
    } catch (e) {}
    return -1;
  }

  var UNIT = 540;
  var DE   = UNIT * 0.3078824;
  var TAU  = Math.PI * 2;

  var RING_MULTI_PROBABILITY = 0.30;

  var FX = {
    disk: {
      lifetime: 240,
      radius: UNIT * 0.12,
      colorKeys: [
        [0.0,        [255, 255, 255]],
        [0.1205921,  [117, 166, 255]]
      ],
      alphaKeys: [
        [0,          1],
        [0.1088273,  1],
        [1,          0]
      ],
      sizeKeys: [
        [0,           0.32583582, 2.4004734,  2.4004734],
        [0.21392822,  0.7159773,  0.9115745,  0.9115745],
        [1,           1,          0,          0]
      ]
    },
    rings: {
      count: 2,
      lifetime: 600,
      radiusMin: UNIT * 0.12 * 1.0636684,
      radiusMax: UNIT * 0.14 * 1.0636684,
      bandRatio: 0.0598573766034603,
      angVelMul: 11.170107,
      rotDir: -1,
      angVelMinKeys: [[0.14903903, 1],          [1, 0.45561826]],
      angVelMaxKeys: [[0.15865384, 0.79881656], [1, -0.06509134]],
      colorKeys: [
        [0.1117723,  [255, 255, 255]],
        [0.5000076,  [75.78, 166.59, 255]],
        [1,          [75.78, 166.59, 255]]
      ],
      sizeKeys: [
        [0.007209778, 0.42050898, 2.4004734, 2.4004734],
        [0.21392822,  0.7159773,  0.9115745, 0.9115745],
        [1,           1,          0,         0]
      ],
      dissolveKeys: [
        [0,   1, 0,          0],
        [0.2, 0, 0,          2.4249368],
        [1,   1, 0.27735636, 0.27735636]
      ],
      segCount: 72
    },
    shards: {
      clickCount: 4,
      clickLifetimeMin: 600,
      clickLifetimeMax: 700,
      clickRadius:   DE * 0.30,
      clickSpeedMin: DE * 0.30,
      clickSpeedMax: DE * 0.40,
      trailLifetimeMin: 200,
      trailLifetimeMax: 400,
      trailRadius:   DE * 0.15,
      trailSpeedMin: DE * 0.20,
      trailSpeedMax: DE * 0.30,
      sizeMin: DE * 0.10,
      sizeMax: DE * 0.20,
      sizeKeys: [
        [0,           0, 0,          0],
        [0.15445095,  1, 0,          0],
        [1,           0, -2.1621501, -2.1621501]
      ],
      colorKeys: [
        [0,          [255, 255, 255]],
        [0.1823606,  [255, 255, 255]],
        [0.282353,   [95.02, 197.2, 255]],
        [0.4617685,  [95,   197,   255]],
        [0.6617685,  [90,   186,   241]],
        [0.8264744,  [95,   197,   255]],
        [1,          [95,   197,   255]]
      ],
      alphaKeys: [
        [0,          1],
        [0.2882429,  1],
        [0.3647059,  0],
        [0.4705882,  1],
        [0.5735256,  0],
        [0.6676432,  1],
        [0.7558862,  0],
        [0.8529488,  1],
        [1,          1]
      ],
      trailSpacing: UNIT / 12,
      maxCount: 50
    },
    trail: {
      lifetime: 320,
      width: UNIT * 0.006,
      minVertexDist: UNIT * 0.008,
      gradient: [
        [0,           [0, 0,     0]],
        [0.5794156,   [0, 24.19, 72]],
        [0.97941558,  [0, 99.6,  255]],
        [1,           [0, 99.6,  255]]
      ],
      coverageKeys: [
        [0,          0.05],
        [0.10,       0.35],
        [0.40,       0.75],
        [0.75,       0.95],
        [1,          1]
      ]
    }
  };

  var forced = (typeof window.__BA_CLICK_FX_THEME__ === 'string')
    ? window.__BA_CLICK_FX_THEME__.toLowerCase()
    : null;

  var bgLuma = forced ? (forced === 'light' ? 1 : 0) : detectBgLuma();
  var IS_LIGHT = (bgLuma < 0) ? true : (bgLuma > 0.45);

  function toLightColor(c) {
    var r = c[0], g = c[1], b = c[2];
    var maxC = Math.max(r, g, b);
    var minC = Math.min(r, g, b);
    var sat = maxC <= 0 ? 0 : (maxC - minC) / maxC;

    if (sat < 0.30) {
      var t = maxC / 255;
      return [
        Math.round(90  + t * 60),
        Math.round(150 + t * 50),
        Math.round(230 + t * 25)
      ];
    }

    var targetMax = 230 + sat * 25;
    var ratio = targetMax / Math.max(maxC, 1);
    return [
      Math.round(clamp(r * ratio, 90, 255)),
      Math.round(clamp(g * ratio, 130, 255)),
      Math.round(clamp(b * ratio, 200, 255))
    ];
  }

  function transformColors(fx, fn) {
    if (fx.disk && fx.disk.colorKeys) {
      fx.disk.colorKeys.forEach(function (k) { k[1] = fn(k[1]); });
    }
    if (fx.rings && fx.rings.colorKeys) {
      fx.rings.colorKeys.forEach(function (k) { k[1] = fn(k[1]); });
    }
    if (fx.shards && fx.shards.colorKeys) {
      fx.shards.colorKeys.forEach(function (k) { k[1] = fn(k[1]); });
    }
    if (fx.trail && fx.trail.gradient) {
      fx.trail.gradient.forEach(function (k) { k[1] = fn(k[1]); });
    }
  }

  var colorsInitialized = false;
  function ensureColors() {
    if (colorsInitialized) return;
    colorsInitialized = true;
    if (IS_LIGHT) transformColors(FX, toLightColor);
  }

  function boostAlpha(a) {
    a = clamp(a, 0, 1);
    if (!IS_LIGHT) return a;
    return Math.pow(a, 0.68);
  }

  var _enabled = false;
  var _canvas = null;
  var _ctx = null;
  var _rafId = 0;
  var _listeners = [];
  var _resizeObserver = null;

  var _W = 0, _H = 0, _dpr = 1, _baseScale = 1;

  var _waves = [];
  var _shards = [];
  var _trail = null;
  var _isDragging = false;
  var _lastTrailX = -1, _lastTrailY = -1, _trailDistanceAcc = 0;

  function getScale() { return _baseScale * EFFECT_SCALE; }

  function mount() {
    if (_canvas) return;
    if (!document.body) return;

    _canvas = document.createElement('canvas');
    _canvas.id = '__ba_click_fx_canvas__';
    _canvas.setAttribute('aria-hidden', 'true');
    _ctx = _canvas.getContext('2d', { alpha: true });

    var st = _canvas.style;
    st.setProperty('position', 'fixed', 'important');
    st.setProperty('left', '0', 'important');
    st.setProperty('top', '0', 'important');
    st.setProperty('right', '0', 'important');
    st.setProperty('bottom', '0', 'important');
    st.setProperty('width', 'auto', 'important');
    st.setProperty('height', 'auto', 'important');
    st.setProperty('margin', '0', 'important');
    st.setProperty('padding', '0', 'important');
    st.setProperty('border', '0', 'important');
    st.setProperty('pointer-events', 'none', 'important');
    st.setProperty('z-index', '2147483647', 'important');
    st.setProperty('mix-blend-mode', 'normal', 'important');
    st.setProperty('background', 'transparent', 'important');
    st.setProperty('transform', 'none', 'important');
    st.setProperty('opacity', '1', 'important');
    st.setProperty('visibility', 'visible', 'important');
    st.setProperty('display', 'block', 'important');
    st.setProperty('max-width', 'none', 'important');
    st.setProperty('max-height', 'none', 'important');
    st.setProperty('min-width', '0', 'important');
    st.setProperty('min-height', '0', 'important');

    document.documentElement.appendChild(_canvas);
    resize();
  }

  function unmount() {
    if (_canvas && _canvas.parentNode) {
      _canvas.parentNode.removeChild(_canvas);
    }
    _canvas = null;
    _ctx = null;
  }

  function resize() {
    if (!_canvas) return;
    _dpr = Math.min(window.devicePixelRatio || 1, 2);
    var de = document.documentElement;
    _W = de.clientWidth  || window.innerWidth  || 1;
    _H = de.clientHeight || window.innerHeight || 1;
    _baseScale = _H / 1080;
    _canvas.width  = Math.round(_W * _dpr);
    _canvas.height = Math.round(_H * _dpr);
    _canvas.style.setProperty('width',  _W + 'px', 'important');
    _canvas.style.setProperty('height', _H + 'px', 'important');
  }

  function Wave(x, y, now) {
    this.x = x; this.y = y;
    this.born = now; this.age = 0;
    this.rings = [];

    var layerCount = Math.random() < RING_MULTI_PROBABILITY ? 2 : 1;

    for (var i = 0; i < layerCount; i++) {
      var blend = Math.random();
      this.rings.push({
        x: x, y: y,
        radius: rand(FX.rings.radiusMin, FX.rings.radiusMax),
        rotation: Math.random() * TAU,
        angularBlend: blend,
        angularVelocity: ringAngularVelocity(blend, 0, FX.rings)
      });
    }
  }
  Wave.prototype.update = function (now) {
    var prev = this.age;
    this.age = now - this.born;
    var dt = Math.max(0, this.age - prev) / 1000;
    var total = FX.rings.lifetime;
    for (var i = 0; i < this.rings.length; i++) {
      var r = this.rings[i];
      var t = clamp((prev / total + this.age / total) * 0.5, 0, 1);
      r.angularVelocity = ringAngularVelocity(r.angularBlend, t, FX.rings);
      r.rotation += r.angularVelocity * dt;
    }
  };
  Wave.prototype.isDead = function () {
    var life = FX.disk.lifetime;
    if (this.rings.length) life = Math.max(life, FX.rings.lifetime);
    return this.age >= life;
  };

  function Shard(x, y, angle, kind, scale, now) {
    var S = FX.shards;
    var isClick = kind === 'click';
    var radius = (isClick ? S.clickRadius : S.trailRadius) * scale;
    var speed  = rand(
      (isClick ? S.clickSpeedMin : S.trailSpeedMin),
      (isClick ? S.clickSpeedMax : S.trailSpeedMax)
    ) * scale;
    var life = rand(
      (isClick ? S.clickLifetimeMin : S.trailLifetimeMin),
      (isClick ? S.clickLifetimeMax : S.trailLifetimeMax)
    );
    this.x = x + Math.cos(angle) * radius;
    this.y = y + Math.sin(angle) * radius;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotation = Math.random() * TAU;
    this.rotSpeed = rand(-3, 3);
    this.size = rand(S.sizeMin, S.sizeMax) * scale;
    this.lifetime = life;
    this.age = 0;
    this.born = now;
  }
  Shard.prototype.update = function (now) {
    var dt = Math.max(0, (now - this.born - this.age)) / 1000;
    this.age = now - this.born;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotSpeed * dt;
  };
  Shard.prototype.isDead = function () {
    return this.age >= this.lifetime;
  };

  function Trail() { this.points = []; }
  Trail.prototype.add = function (x, y, now, scale) {
    var minD = FX.trail.minVertexDist * scale;
    if (this.points.length) {
      var last = this.points[this.points.length - 1];
      if (Math.hypot(x - last.x, y - last.y) < minD) return;
    }
    this.points.push({ x: x, y: y, born: now });
    if (this.points.length > 200) this.points.shift();
  };
  Trail.prototype.update = function (now) {
    var cutoff = now - FX.trail.lifetime;
    while (this.points.length && this.points[0].born < cutoff) this.points.shift();
  };

  function drawTrail(scale, now) {
    if (!_trail) return;
    var pts = _trail.points;
    var N = pts.length;
    if (N < 2) return;
    var ctx = _ctx;

    var cum = new Float64Array(N);
    for (var i = 1; i < N; i++) {
      cum[i] = cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
    var total = cum[N - 1];
    if (total <= 0) return;

    var T = FX.trail;
    var baseW = T.width * scale;

    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    var colBuf = [0, 0, 0];

    for (var j = 1; j < N; j++) {
      var p0 = pts[j - 1], p1 = pts[j];
      if (cum[j] - cum[j - 1] <= 0.001) continue;

      var prog = (cum[j - 1] + cum[j]) * 0.5 / total;
      var cov = sampleKey(T.coverageKeys, prog);
      if (cov <= 0.01) continue;

      var ageFade = 1 - clamp((now - p1.born) / T.lifetime, 0, 1);
      sampleColor(T.gradient, prog, colBuf);

      var alpha = boostAlpha(cov * ageFade);

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = 'rgb(' + (colBuf[0] | 0) + ',' + (colBuf[1] | 0) + ',' + (colBuf[2] | 0) + ')';
      ctx.lineWidth = baseW * (0.55 + 0.45 * prog);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawDisk(wave, scale) {
    var D = FX.disk;
    var t = clamp(wave.age / D.lifetime, 0, 1);
    if (t >= 1) return;
    var ctx = _ctx;

    var radius = D.radius * scale * sampleHermite(D.sizeKeys, t);
    if (radius <= 0.3) return;

    var alpha = boostAlpha(sampleKey(D.alphaKeys, t));
    if (alpha <= 0.01) return;

    var col = sampleColor(D.colorKeys, t);
    var r1 = col[0] | 0, g1 = col[1] | 0, b1 = col[2] | 0;

    var grad = ctx.createRadialGradient(wave.x, wave.y, 0, wave.x, wave.y, radius);

    if (IS_LIGHT) {
      grad.addColorStop(0,    'rgba(' + r1 + ',' + g1 + ',' + b1 + ',' + alpha + ')');
      grad.addColorStop(0.55, 'rgba(' + r1 + ',' + g1 + ',' + b1 + ',' + (alpha * 0.75) + ')');
      grad.addColorStop(0.85, 'rgba(' + r1 + ',' + g1 + ',' + b1 + ',' + (alpha * 0.30) + ')');
      grad.addColorStop(1,    'rgba(' + r1 + ',' + g1 + ',' + b1 + ',0)');
    } else {
      grad.addColorStop(0,    'rgba(255,255,255,' + alpha + ')');
      grad.addColorStop(0.45, 'rgba(' + (Math.min(255, r1 + 60) | 0) + ',' + (Math.min(255, g1 + 30) | 0) + ',255,' + (alpha * 0.9) + ')');
      grad.addColorStop(0.78, 'rgba(' + r1 + ',' + g1 + ',' + b1 + ',' + (alpha * 0.5) + ')');
      grad.addColorStop(1,    'rgba(' + r1 + ',' + g1 + ',' + b1 + ',0)');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, radius, 0, TAU);
    ctx.fill();
  }

  function drawRings(wave, scale) {
    var R = FX.rings;
    var t = clamp(wave.age / R.lifetime, 0, 1);
    if (t >= 1) return;
    var ctx = _ctx;

    var sizeMul   = sampleHermite(R.sizeKeys, t);
    var threshold = sampleHermite(R.dissolveKeys, t);
    if (threshold >= 0.999) return;

    var col = sampleColor(R.colorKeys, t);
    var R0 = col[0] | 0, G0 = col[1] | 0, B0 = col[2] | 0;

    var N = R.segCount;
    var step = TAU / N;

    for (var k = 0; k < wave.rings.length; k++) {
      var ring = wave.rings[k];
      var outerR = ring.radius * scale * sizeMul;
      if (outerR <= 0.5) continue;

      var bandW = outerR * R.bandRatio;
      var midR  = outerR - bandW * 0.5;
      if (bandW <= 0.1) continue;

      ctx.save();
      ctx.translate(ring.x, ring.y);
      ctx.rotate(ring.rotation);
      ctx.lineWidth = bandW;
      ctx.lineCap   = 'butt';

      for (var i = 0; i < N; i++) {
        var mid = (i + 0.5) * step;
        var cov = ringCoverage(mid);
        var vis = threshold <= 0.001
          ? 1
          : smoothstep(threshold - 0.04, threshold + 0.04, cov);
        if (vis <= 0.02) continue;

        vis = boostAlpha(vis);

        var a0 = i * step;
        var a1 = a0 + step * 1.05;
        ctx.strokeStyle = 'rgba(' + R0 + ',' + G0 + ',' + B0 + ',' + vis + ')';
        ctx.beginPath();
        ctx.arc(0, 0, midR, a0, a1);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawShard(shard, scale) {
    var S = FX.shards;
    var t = clamp(shard.age / shard.lifetime, 0, 1);
    if (t >= 1) return;
    var ctx = _ctx;

    var size = shard.size * sampleHermite(S.sizeKeys, t);
    if (size <= 0.4) return;

    var alpha = boostAlpha(sampleKey(S.alphaKeys, t));
    if (alpha <= 0.02) return;

    var col = sampleColor(S.colorKeys, t);

    ctx.save();
    ctx.translate(shard.x, shard.y);
    ctx.rotate(shard.rotation);

    var h = size * 0.5, w = size * 0.43;
    ctx.beginPath();
    ctx.moveTo(0, -h);
    ctx.lineTo(w, h);
    ctx.lineTo(-w, h);
    ctx.closePath();
    ctx.fillStyle = 'rgba(' + (col[0] | 0) + ',' + (col[1] | 0) + ',' + (col[2] | 0) + ',' + alpha + ')';
    ctx.fill();
    ctx.restore();
  }

  function frame(now) {
    if (!_enabled || !_ctx) return;

    _ctx.setTransform(_dpr, 0, 0, _dpr, 0, 0);
    _ctx.clearRect(0, 0, _W, _H);

    _ctx.globalCompositeOperation = IS_LIGHT ? 'source-over' : 'lighter';

    var scale = getScale();

    if (_trail) _trail.update(now);
    drawTrail(scale, now);

    for (var i = _waves.length - 1; i >= 0; i--) {
      var w = _waves[i];
      w.update(now);
      if (w.isDead()) { _waves.splice(i, 1); continue; }
      drawDisk(w, scale);
      drawRings(w, scale);
    }

    for (var j = _shards.length - 1; j >= 0; j--) {
      var s = _shards[j];
      s.update(now);
      if (s.isDead()) { _shards.splice(j, 1); continue; }
      drawShard(s, scale);
    }

    _ctx.globalCompositeOperation = 'source-over';
    _ctx.globalAlpha = 1;

    _rafId = requestAnimationFrame(frame);
  }

  function spawnClick(x, y, now, scale) {
    _waves.push(new Wave(x, y, now));
    for (var i = 0; i < FX.shards.clickCount; i++) {
      _shards.push(new Shard(x, y, Math.random() * TAU, 'click', scale, now));
    }
  }

  function spawnTrailShards(x0, y0, x1, y1, now, scale) {
    var S = FX.shards;
    var spacing = S.trailSpacing * scale;
    var dx = x1 - x0, dy = y1 - y0;
    var dist = Math.hypot(dx, dy);
    if (dist <= 0.001) return;

    var d = spacing - _trailDistanceAcc;
    while (d <= dist) {
      var k = d / dist;
      _shards.push(new Shard(
        x0 + dx * k,
        y0 + dy * k,
        Math.random() * TAU,
        'trail',
        scale,
        now
      ));
      var cap = S.maxCount * 4;
      if (_shards.length > cap) _shards.splice(0, _shards.length - cap);
      d += spacing;
    }
    _trailDistanceAcc = (_trailDistanceAcc + dist) % spacing;
  }

  function onDown(x, y) {
    if (!_enabled) return;
    var now = performance.now();
    var scale = getScale();
    _isDragging = true;
    _lastTrailX = x;
    _lastTrailY = y;
    _trailDistanceAcc = 0;
    if (_trail) _trail.add(x, y, now, scale);
    spawnClick(x, y, now, scale);
  }

  function onMove(x, y) {
    if (!_enabled || !_isDragging) return;
    var now = performance.now();
    var scale = getScale();
    if (_trail) _trail.add(x, y, now, scale);
    if (_lastTrailX >= 0) {
      spawnTrailShards(_lastTrailX, _lastTrailY, x, y, now, scale);
    }
    _lastTrailX = x;
    _lastTrailY = y;
  }

  function onUp() {
    _isDragging = false;
    _lastTrailX = -1;
    _lastTrailY = -1;
    _trailDistanceAcc = 0;
  }

  function bind(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    _listeners.push({ target: target, type: type, handler: handler, options: options });
  }

  function unbindAll() {
    for (var i = 0; i < _listeners.length; i++) {
      var L = _listeners[i];
      try { L.target.removeEventListener(L.type, L.handler, L.options); } catch (e) {}
    }
    _listeners = [];
  }

  function bindEvents() {
    if (window.TouchEvent) {
      bind(window, 'touchstart', function (e) {
        if (e.touches.length !== 1) return;
        var t = e.touches[0];
        onDown(t.clientX, t.clientY);
      }, { passive: true, capture: true });

      bind(window, 'touchmove', function (e) {
        if (e.touches.length !== 1) return;
        var t = e.touches[0];
        onMove(t.clientX, t.clientY);
      }, { passive: true, capture: true });

      bind(window, 'touchend', onUp, { passive: true, capture: true });
      bind(window, 'touchcancel', onUp, { passive: true, capture: true });
    }

    if (window.PointerEvent) {
      bind(window, 'pointerdown', function (e) {
        if (e.pointerType === 'touch') return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        onDown(e.clientX, e.clientY);
      }, { passive: true, capture: true });

      bind(window, 'pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        onMove(e.clientX, e.clientY);
      }, { passive: true, capture: true });

      bind(window, 'pointerup', function (e) {
        if (e.pointerType === 'touch') return;
        onUp();
      }, { passive: true, capture: true });

      bind(window, 'pointercancel', function (e) {
        if (e.pointerType === 'touch') return;
        onUp();
      }, { passive: true, capture: true });
    } else {
      bind(window, 'mousedown', function (e) {
        if (e.button !== 0) return;
        onDown(e.clientX, e.clientY);
      }, { passive: true, capture: true });
      bind(window, 'mousemove', function (e) {
        onMove(e.clientX, e.clientY);
      }, { passive: true, capture: true });
      bind(window, 'mouseup', onUp, { passive: true, capture: true });
    }

    bind(window, 'blur', onUp);

    bind(window, 'resize', resize);
    bind(window, 'orientationchange', function () { setTimeout(resize, 120); });

    if (window.ResizeObserver) {
      try {
        _resizeObserver = new ResizeObserver(function () { resize(); });
        _resizeObserver.observe(document.documentElement);
      } catch (e) { _resizeObserver = null; }
    }
  }

  function unbindEvents() {
    unbindAll();
    if (_resizeObserver) {
      try { _resizeObserver.disconnect(); } catch (e) {}
      _resizeObserver = null;
    }
  }

  function enable() {
    if (_enabled) return;
    _enabled = true;

    ensureColors();

    _waves = [];
    _shards = [];
    _trail = new Trail();
    _isDragging = false;
    _lastTrailX = -1;
    _lastTrailY = -1;
    _trailDistanceAcc = 0;

    mount();
    bindEvents();

    if (_rafId) cancelAnimationFrame(_rafId);
    _rafId = requestAnimationFrame(frame);
  }

  function disable() {
    if (!_enabled) return;
    _enabled = false;

    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = 0; }

    unbindEvents();
    unmount();

    _waves = [];
    _shards = [];
    _trail = null;
    _isDragging = false;
  }

  function isEnabled() { return _enabled; }

  window.__BA_CLICK_FX__ = {
    enable: enable,
    disable: disable,
    isEnabled: isEnabled
  };

  function boot() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
      return;
    }
    enable();
    if (typeof window.__BA_UPDATE_TOGGLE__ === 'function') {
      try { window.__BA_UPDATE_TOGGLE__(); } catch (e) {}
    }
  }
  boot();
})();

/* =========================================================
   左下角开关绑定
   ========================================================= */
(function () {
  'use strict';

  function sync() {
    var btn = document.getElementById('baFxToggle');
    if (!btn) return;
    var on = !!(window.__BA_CLICK_FX__ && window.__BA_CLICK_FX__.isEnabled());
    if (on) {
      btn.classList.add('on');
      btn.textContent = '特效：开';
    } else {
      btn.classList.remove('on');
      btn.textContent = '特效：关';
    }
  }

  window.__BA_UPDATE_TOGGLE__ = sync;

  function bind() {
    var btn = document.getElementById('baFxToggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (!window.__BA_CLICK_FX__) return;
      if (window.__BA_CLICK_FX__.isEnabled()) {
        window.__BA_CLICK_FX__.disable();
      } else {
        window.__BA_CLICK_FX__.enable();
      }
      sync();
    });
    sync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();