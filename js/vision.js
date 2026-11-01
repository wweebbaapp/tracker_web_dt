/* Tracker Web DT v6 — computer-vision helpers (no dependencies) */
(function () {
  'use strict';

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, Math.max(0, ms | 0)));
  }

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }

  function seek(video, t) {
    return new Promise(resolve => {
      const dur = isFinite(video.duration) ? video.duration : 0;
      const target = Math.max(0, Math.min(t, Math.max(0, dur - 0.0006)));
      if (Math.abs(video.currentTime - target) < 0.0008 && video.readyState >= 2) {
        resolve();
        return;
      }
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        video.removeEventListener('seeked', done);
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(done, 2500);
      video.addEventListener('seeked', done);
      try { video.currentTime = target; } catch (e) { done(); }
    });
  }

  function grayOf(ctx, w, h) {
    const data = ctx.getImageData(0, 0, w, h).data;
    const g = new Uint8ClampedArray(w * h);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      g[j] = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    }
    return g;
  }

  function diffEnergy(a, b) {
    const n = Math.min(a.length, b.length);
    let sum = 0;
    for (let i = 0; i < n; i++) sum += Math.abs(a[i] - b[i]);
    return sum / n;
  }

  function median(arr) {
    if (!arr.length) return 0;
    const s = arr.slice().sort((x, y) => x - y);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  function percentile(sorted, p) {
    if (!sorted.length) return 0;
    const i = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
    return sorted[i];
  }

  /**
   * Estimate the video frame rate using requestVideoFrameCallback on a hidden clone.
   * Returns a Promise<number|null>.
   */
  async function estimateFps(videoEl, timeoutMs) {
    if (!videoEl || !videoEl.duration) return null;
    const src = videoEl.currentSrc || videoEl.src;
    if (!src) return null;

    const clone = document.createElement('video');
    clone.muted = true;
    clone.playsInline = true;
    clone.preload = 'auto';
    clone.crossOrigin = 'anonymous';
    clone.src = src;

    try {
      await new Promise((resolve, reject) => {
        const ok = () => { cleanup(); resolve(); };
        const bad = () => { cleanup(); reject(new Error('metadata')); };
        const timer = setTimeout(bad, 6000);
        function cleanup() {
          clearTimeout(timer);
          clone.removeEventListener('loadedmetadata', ok);
          clone.removeEventListener('error', bad);
        }
        clone.addEventListener('loadedmetadata', ok);
        clone.addEventListener('error', bad);
        clone.load();
      });
    } catch (e) {
      clone.removeAttribute('src');
      clone.load();
      return null;
    }

    if (!clone.requestVideoFrameCallback) {
      clone.removeAttribute('src');
      clone.load();
      return null;
    }

    const dts = [];
    let firstPres = null, firstMedia = null, lastPres = null, lastMedia = null, lastT = null;
    let finished = false;

    const result = await new Promise(resolve => {
      const timeout = setTimeout(() => finish(null), timeoutMs || 3200);

      function finish(value) {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        clone.removeEventListener('ended', onEnded);
        try { clone.pause(); } catch (e) {}
        clone.removeAttribute('src');
        clone.load();
        resolve(value);
      }

      function onEnded() { finish(compute()); }

      function onFrame(now, meta) {
        if (finished) return;
        const t = meta.mediaTime;
        if (lastT != null && t > lastT) dts.push(t - lastT);
        lastT = t;
        if (firstPres == null) { firstPres = meta.presentedFrames; firstMedia = t; }
        lastPres = meta.presentedFrames;
        lastMedia = t;

        const wallMedia = firstMedia != null ? t - firstMedia : 0;
        if (dts.length >= 90 || wallMedia >= 2) { finish(compute()); return; }
        if (!clone.ended) clone.requestVideoFrameCallback(onFrame);
      }

      function compute() {
        let byFrames = null;
        if (firstPres != null && lastPres != null && lastMedia != null && firstMedia != null) {
          const dMedia = lastMedia - firstMedia;
          const dPres = lastPres - firstPres;
          if (dMedia > 0.08 && dPres > 0) byFrames = dPres / dMedia;
        }
        let clean = dts.filter(d => d > 0.0015 && d < 0.5);
        let byDts = null;
        if (clean.length >= 4) {
          let med = median(clean);
          const near = clean.filter(d => d > med * 0.6 && d < med * 1.6);
          if (near.length >= 3) med = median(near);
          byDts = 1 / med;
        }
        let fps = byDts != null ? byDts : byFrames;
        if (fps == null || !isFinite(fps) || fps < 4 || fps > 300) fps = byFrames;
        if (fps == null || !isFinite(fps) || fps < 4 || fps > 300) return null;
        return snapFps(fps);
      }

      clone.addEventListener('ended', onEnded);
      clone.playbackRate = 1;
      clone.play().then(() => {
        if (!finished) clone.requestVideoFrameCallback(onFrame);
      }).catch(() => finish(null));
    });

    return result;
  }

  function snapFps(fps) {
    const common = [8, 10, 12, 15, 20, 23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 72, 90, 100, 119.88, 120, 144, 240];
    let best = fps, bestD = Infinity;
    for (const c of common) {
      const d = Math.abs(c - fps) / c;
      if (d < bestD) { bestD = d; best = c; }
    }
    const out = bestD < 0.02 ? best : fps;
    return Math.round(out * 100) / 100;
  }

  /**
   * Analyse motion across the whole video by sampling low-res frames.
   * opts: { fps, samples }
   * Returns { ok, startTime, endTime, energies, times, base, peak, step }.
   */
  function medianBackground(grays, size) {
    const bg = new Uint8ClampedArray(size);
    const n = grays.length;
    const vals = new Uint8Array(n);
    for (let p = 0; p < size; p++) {
      for (let i = 0; i < n; i++) vals[i] = grays[i][p];
      vals.sort();
      bg[p] = vals[(n - 1) >> 1];
    }
    return bg;
  }

  function foregroundFraction(gray, bg, threshold) {
    let count = 0;
    const n = Math.min(gray.length, bg.length);
    for (let i = 0; i < n; i++) {
      if (Math.abs(gray[i] - bg[i]) > threshold) count++;
    }
    return n ? count / n : 0;
  }

  function smoothMax(arr, radius) {
    const out = new Float32Array(arr.length);
    for (let i = 0; i < arr.length; i++) {
      let m = 0;
      const a = Math.max(0, i - radius), b = Math.min(arr.length - 1, i + radius);
      for (let j = a; j <= b; j++) if (arr[j] > m) m = arr[j];
      out[i] = m;
    }
    return out;
  }

  /**
   * Analyse the video to find when the moving body appears and disappears.
   * The background is estimated as the per-pixel median; the foreground
   * fraction then gives the presence interval. Frame-difference motion is
   * used as a fallback when the camera is not fixed.
   * opts: { fps, samples }
   * Returns { ok, startTime, endTime, method, ... }.
   */
  /**
   * Estimate a background image from the frames before and after a motion
   * event. When both sides are available, each pixel is taken from the side
   * closer to the global intensity median, so an object that is present at
   * the start or remains at the end does not contaminate the background.
   */
  function backgroundFromSides(before, after, minSide, size) {
    const hasBefore = before.length >= minSide;
    const hasAfter = after.length >= minSide;
    if (!hasBefore && !hasAfter) return null;
    if (hasBefore && !hasAfter) return medianBackground(before, size);
    if (!hasBefore && hasAfter) return medianBackground(after, size);
    const pre = medianBackground(before, size);
    const post = medianBackground(after, size);
    const pool = new Uint8Array(pre.length + post.length);
    pool.set(pre);
    pool.set(post, pre.length);
    const globalMedian = median(pool);
    const out = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      out[i] = Math.abs(pre[i] - globalMedian) <= Math.abs(post[i] - globalMedian)
        ? pre[i] : post[i];
    }
    return out;
  }

  async function analyzeMotion(videoEl, opts, onProgress, isCancelled) {
    const fps = opts.fps > 0 ? opts.fps : 30;
    const duration = isFinite(videoEl.duration) ? videoEl.duration : 0;
    if (!(duration > 0)) return { ok: false };
    const totalFrames = Math.max(1, Math.round(duration * fps));
    const wantSamples = Math.max(24, opts.samples || 180);
    const step = Math.max(1, Math.floor(totalFrames / wantSamples));

    const frames = [];
    for (let f = 0; f < totalFrames; f += step) frames.push(f);
    if (frames[frames.length - 1] !== totalFrames - 1) frames.push(totalFrames - 1);

    const vw = videoEl.videoWidth || 1;
    const vh = videoEl.videoHeight || 1;
    const sw = 160;
    const sh = Math.max(2, Math.round(sw * vh / vw));
    const canvas = makeCanvas(sw, sh);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const grays = [];
    const times = [];
    const delayMs = Math.max(0, Number(opts.delayMs) || 0);
    for (let i = 0; i < frames.length; i++) {
      if (isCancelled && isCancelled()) return { ok: false, cancelled: true };
      await seek(videoEl, frames[i] / fps);
      ctx.drawImage(videoEl, 0, 0, sw, sh);
      grays.push(grayOf(ctx, sw, sh));
      times.push(frames[i] / fps);
      if (onProgress) onProgress(0.65 * (i + 1) / frames.length);
      if (delayMs) await sleep(delayMs);
    }

    if (grays.length < 3) return { ok: false };

    const energies = [];
    for (let i = 1; i < grays.length; i++) energies.push(diffEnergy(grays[i - 1], grays[i]));
    if (onProgress) onProgress(0.75);

    const sorted = energies.slice().sort((a, b) => a - b);
    const base = percentile(sorted, 0.2);
    const maxE = sorted[sorted.length - 1];
    const span = maxE - base;
    let motion = null;

    if (maxE >= 0.55 && span >= 0.22) {
      const hi = base + span * 0.38;
      const lo = base + span * 0.12;
      const groups = [];
      let cur = null;
      for (let i = 0; i < energies.length; i++) {
        if (energies[i] >= hi) {
          if (!cur) cur = { start: i, end: i, sum: 0 };
          cur.end = i;
          cur.sum += energies[i];
        } else if (cur) {
          groups.push(cur);
          cur = null;
        }
      }
      if (cur) groups.push(cur);

      if (groups.length) {
        const bestSum = Math.max.apply(null, groups.map(g => g.sum));
        const significant = groups.filter(g => g.sum >= bestSum * 0.08);
        let sIdx = Infinity, eIdx = -Infinity;
        for (const g of significant) {
          let s = g.start, e = g.end;
          while (s > 0 && energies[s - 1] >= lo) s--;
          while (e < energies.length - 1 && energies[e + 1] >= lo) e++;
          if (s < sIdx) sIdx = s;
          if (e > eIdx) eIdx = e;
        }
        if (isFinite(sIdx)) {
          const startTime = Math.max(0, times[sIdx] - step / fps);
          const endTime = Math.min(duration, times[eIdx + 1] + step / fps);
          if (endTime > startTime) {
            motion = { startTime, endTime, startSample: sIdx, endSample: eIdx };
          }
        }
      }
    }

    if (onProgress) onProgress(0.82);

    let presence = null;
    try {
      const bgGrays = { before: [], after: [] };
      if (motion) {
        for (let i = 0; i < grays.length; i++) {
          if (i < motion.startSample - 1) bgGrays.before.push(grays[i]);
          else if (i > motion.endSample + 1) bgGrays.after.push(grays[i]);
        }
      }
      const minSide = Math.max(4, grays.length * 0.06);
      const bg = backgroundFromSides(bgGrays.before, bgGrays.after, minSide, sw * sh) ||
        medianBackground(grays, sw * sh);
      let fg = grays.map(g => foregroundFraction(g, bg, 26));
      fg = Array.from(smoothMax(fg, 1));
      const sortedFg = fg.slice().sort((a, b) => a - b);
      const fBase = percentile(sortedFg, 0.1);
      const p90 = percentile(sortedFg, 0.9);
      const maxFg = sortedFg[sortedFg.length - 1];
      if (maxFg > 0.0012 && p90 > Math.max(0.0008, fBase + 0.0004)) {
        const thr = Math.max(0.0012, fBase * 2.2 + 0.0005, p90 * 0.18);
        let first = -1, last = -1;
        for (let i = 0; i < fg.length; i++) {
          if (fg[i] >= thr) { if (first < 0) first = i; last = i; }
        }
        if (first >= 0 && last > first) {
          const startTime = Math.max(0, times[first] - step / fps);
          const endTime = Math.min(duration, times[last] + step / fps);
          if (endTime > startTime) presence = { startTime, endTime };
        }
      }
    } catch (e) { presence = null; }

    if (onProgress) onProgress(0.95);

    if (!presence && !motion) {
      return { ok: false, reason: 'low-motion', energies, times, base, maxE, step };
    }

    let chosen = presence || motion;
    let method = presence ? 'presence' : 'motion';
    if (presence && motion) {
      const tol = 2 * step / fps + 0.05;
      if (presence.startTime > motion.startTime + tol ||
          presence.endTime < motion.endTime - tol) {
        chosen = motion; method = 'motion';
      }
    }

    if (onProgress) onProgress(1);
    return {
      ok: true,
      startTime: chosen.startTime,
      endTime: chosen.endTime,
      method,
      presence,
      motion,
      energies,
      times,
      base,
      maxE,
      step,
    };
  }

  /**
   * Snap a clicked point to the strongest nearby image gradient.
   */
  function snapToEdge(videoEl, x, y, radius) {
    const w = videoEl.videoWidth;
    const h = videoEl.videoHeight;
    if (!w || !h) return { x, y, snapped: false };
    const canvas = makeCanvas(w, h);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(videoEl, 0, 0, w, h);
    const gray = grayOf(ctx, w, h);

    const r = Math.max(2, Math.round(radius || 7));
    let best = { x: Math.round(x), y: Math.round(y), score: -1 };
    const cx = Math.round(x);
    const cy = Math.round(y);

    for (let yy = Math.max(1, cy - r); yy <= Math.min(h - 2, cy + r); yy++) {
      for (let xx = Math.max(1, cx - r); xx <= Math.min(w - 2, cx + r); xx++) {
        const at = yy * w + xx;
        const gx = gray[at + 1] - gray[at - 1];
        const gy = gray[at + w] - gray[at - w];
        const score = gx * gx + gy * gy;
        if (score > best.score) best = { x: xx, y: yy, score };
      }
    }
    if (best.score > 500) return { x: best.x, y: best.y, snapped: true };
    return { x, y, snapped: false };
  }

  function nccAt(gray, sw, sh, tmpl, tsize, cx, cy, step) {
    const half = (tsize - 1) / 2;
    const x0 = Math.round(cx) - half;
    const y0 = Math.round(cy) - half;
    if (x0 < 0 || y0 < 0 || x0 + tsize > sw || y0 + tsize > sh) return -1;
    let sumT = 0, sumW = 0, sumTT = 0, sumWW = 0, sumTW = 0, n = 0;
    for (let j = 0; j < tsize; j += step) {
      const gr = (y0 + j) * sw + x0;
      const tr = j * tsize;
      for (let i = 0; i < tsize; i += step) {
        const a = tmpl[tr + i], b = gray[gr + i];
        sumT += a; sumW += b; sumTT += a * a; sumWW += b * b; sumTW += a * b; n++;
      }
    }
    const varT = sumTT - sumT * sumT / n;
    const varW = sumWW - sumW * sumW / n;
    if (varT <= 0 || varW <= 0) return -1;
    return (sumTW - sumT * sumW / n) / Math.sqrt(varT * varW);
  }

  /**
   * Template-matching tracker seeded by one point.
   * opts: { fps, startFrame, endFrame, seed:{x,y}, maxWidth }
   * Returns { [frame]: {x,y} } in original video pixels.
   */
  async function autoTrack(videoEl, opts, onProgress, onPoint, isCancelled) {
    const vw = videoEl.videoWidth || 1;
    const vh = videoEl.videoHeight || 1;
    const maxW = opts.maxWidth || 560;
    const scale = Math.min(1, maxW / vw);
    const sw = Math.max(8, Math.round(vw * scale));
    const sh = Math.max(8, Math.round(vh * scale));
    const canvas = makeCanvas(sw, sh);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const tsize = 21;
    const half = (tsize - 1) / 2;
    const searchR = 40;
    const cmpStep = 2;

    const startFrame = opts.startFrame;
    const endFrame = opts.endFrame;
    const fps = opts.fps;

    await seek(videoEl, startFrame / fps);
    ctx.drawImage(videoEl, 0, 0, sw, sh);
    let gray = grayOf(ctx, sw, sh);

    const sx = opts.seed.x * scale;
    const sy = opts.seed.y * scale;
    const tx = Math.round(Math.max(half, Math.min(sw - 1 - half, sx)));
    const ty = Math.round(Math.max(half, Math.min(sh - 1 - half, sy)));

    const tmpl = new Uint8ClampedArray(tsize * tsize);
    for (let j = 0; j < tsize; j++) {
      for (let i = 0; i < tsize; i++) {
        tmpl[j * tsize + i] = gray[(ty - half + j) * sw + (tx - half + i)];
      }
    }

    const marks = {};
    let px = sx, py = sy;
    let pvx = 0, pvy = 0;
    const total = Math.max(1, endFrame - startFrame + 1);
    const delayMs = Math.max(0, Number(opts.delayMs) || 0);

    for (let f = startFrame; f <= endFrame; f++) {
      if (isCancelled && isCancelled()) break;
      await seek(videoEl, f / fps);
      ctx.drawImage(videoEl, 0, 0, sw, sh);
      gray = grayOf(ctx, sw, sh);

      const predX = px + pvx;
      const predY = py + pvy;
      let bestX = predX, bestY = predY, best = -2;

      for (let dy = -searchR; dy <= searchR; dy++) {
        for (let dx = -searchR; dx <= searchR; dx++) {
          const x = Math.round(predX + dx);
          const y = Math.round(predY + dy);
          if (x - half < 0 || y - half < 0 || x + half >= sw || y + half >= sh) continue;
          const score = nccAt(gray, sw, sh, tmpl, tsize, x, y, cmpStep);
          if (score > best) { best = score; bestX = x; bestY = y; }
        }
      }

      if (best <= -1) break;

      pvx = bestX - px;
      pvy = bestY - py;
      px = bestX;
      py = bestY;

      const pt = { x: px / scale, y: py / scale };
      marks[f] = pt;
      if (onPoint) onPoint(f, pt);
      if (onProgress) onProgress((f - startFrame + 1) / total);
      if (delayMs) await sleep(delayMs);
    }

    return marks;
  }

  window.Vision = {
    estimateFps,
    analyzeMotion,
    autoTrack,
    snapToEdge,
    seek,
    median,
  };
})();
