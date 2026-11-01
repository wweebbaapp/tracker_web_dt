/* Tracker Web DT v6 — video analysis, simulations, reference frames, energy and PDF reports */
(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const fmt = (v, d) => (v == null || !isFinite(v) ? '–' : v.toFixed(d == null ? 3 : d));
  const round2 = v => Math.round(v * 100) / 100;

  const PALETTE = ['#4ea1ff', '#ffcc4d', '#ff6b6b', '#3ddc97', '#c792ea', '#ff9f45', '#59d9e0', '#f06292'];
  const VARCOLORS = {
    x: '#4ea1ff', y: '#ffcc4d', vx: '#ff6b6b', vy: '#3ddc97', speed: '#c792ea',
    ke: '#ff9f45', pe: '#59d9e0', te: '#f06292',
  };
  const AUTOSAVE_KEY = 'trackerweb.dt.v6.autosave';
  const SIM_META = {
    mru: 'MRU', mrua: 'MRUA', fall: 'Caduta', projectile: 'Parabolico',
    circular: 'Circolare', harmonic: 'Armonico', custom: 'Personalizzato',
  };

  const S = {
    videoEl: null, canvas: null, ctx: null, stage: null,
    video: { loaded: false, width: 0, height: 0, duration: 0 },
    videoName: '',
    fps: 30,
    fpsManual: false,
    fpsDetected: null,
    totalFrames: 0,
    frame: 0,
    range: { start: 0, end: 0 },
    rangeSet: false,
    mode: 'track',
    calib: { p1: null, p2: null, length: null, scale: null },
    axes: { x: null, y: null, theta: 0 },
    particles: [],
    activeId: null,
    mass: 1,
    gravity: 9.81,
    showLabAxes: true,
    stSwap: false,
    interpolate: false,
    autoSlowdown: 90,
    simView: 'primary',
    simVideoSpeed: 1,
    moto: false,
    autoAdvance: true,
    playMode: 'all',
    playRate: 1,
    autoRangeDone: false,
    playing: false,
    seekTarget: null,
    drag: null,
    axesDrag: null,
    rangeDrag: null,
    showTrail: true,
    showAxes: true,
    showLabels: true,
    busy: false,
    cancel: false,
    objectURL: null,
    loadToken: 0,
    projectRangePending: false,
    recording: false,
    synth: null,
    synthLast: 0,
    synthAcc: 0,
  };

  let els = {};
  let toastTimer = null;
  let autosaveTimer = null;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    els = {
      stage: $('#stage'), video: $('#video'), canvas: $('#overlay'),
      seek: $('#seek'), timeLabel: $('#timeLabel'), fps: $('#fps'), fpsBadge: $('#fpsBadge'),
      play: $('#btnPlay'), dropHint: $('#dropHint'),
      rangeTrack: $('#rangeTrack'), rangeFill: $('#rangeFill'),
      rangeStartHandle: $('#rangeStartHandle'), rangeEndHandle: $('#rangeEndHandle'),
      transportRange: $('#transportRange'), transportRangeFill: $('#transportRangeFill'),
      transportRangeStart: $('#transportRangeStart'), transportRangeEnd: $('#transportRangeEnd'),
      transportRangeTimes: $('#transportRangeTimes'),
      rangeStart: $('#rangeStart'), rangeEnd: $('#rangeEnd'),
      rangeLabel: $('#rangeLabel'), rangeTimes: $('#rangeTimes'),
      autoRangeStatus: $('#autoRangeStatus'), stAxisMode: $('#stAxisMode'),
      btnConfirmRange: $('#btnConfirmRange'),
      calibStatus: $('#calibStatus'), calibPreset: $('#calibPreset'), chkSnap: $('#chkSnap'),
      axesStatus: $('#axesStatus'), axesX: $('#axesX'), axesY: $('#axesY'), axesAngle: $('#axesAngle'),
      particleList: $('#particleList'), dataName: $('#dataParticleName'),
      graphST: $('#graphST'), graphVT: $('#graphVT'), graphEN: $('#graphEN'),
      tableSTBody: $('#tableST tbody'), tableVTBody: $('#tableVT tbody'), tableENBody: $('#tableEN tbody'),
      analysisHint: $('#analysisHint'), energyHint: $('#energyHint'),
      mass: $('#mass'), gravity: $('#gravity'),
      toast: $('#toast'),
      modal: $('#modal'), modalTitle: $('#modalTitle'), modalDesc: $('#modalDesc'),
      modalInput: $('#modalInput'), modalOk: $('#modalOk'), modalCancel: $('#modalCancel'),
      busy: $('#busy'), busyTitle: $('#busyTitle'), busyFill: $('#busyFill'),
      busyPct: $('#busyPct'), busyCancel: $('#busyCancel'),
      btnMoto: $('#btnMoto'), chkAutoAdvance: $('#chkAutoAdvance'),
      frameSeconds: $('#frameSeconds'), timingInfo: $('#timingInfo'),
      rangeFrameLabel: $('#rangeFrameLabel'), btnRangePlay: $('#btnRangePlay'),
      simType: $('#simType'), simX0: $('#simX0'), simY0: $('#simY0'), simV0: $('#simV0'),
      simAngle: $('#simAngle'), simAccel: $('#simAccel'), simRadius: $('#simRadius'),
      simPeriod: $('#simPeriod'), simPhase: $('#simPhase'), simAmp: $('#simAmp'),
      simDuration: $('#simDuration'), simFps: $('#simFps'), simBody: $('#simBody'), simNoise: $('#simNoise'),
      simStatus: $('#simStatus'), simAccelLabel: $('#simAccelLabel'),
      simX0Label: $('#simX0Label'), simY0Label: $('#simY0Label'),
      simFrame: $('#simFrame'), simFrameVx: $('#simFrameVx'), simFrameVy: $('#simFrameVy'),
      simFrameAx: $('#simFrameAx'), simFrameAy: $('#simFrameAy'), simFrameW: $('#simFrameW'),
      simShowLab: $('#simShowLab'), btnSimVideo: $('#btnSimVideo'),
      simVx: $('#simVx'), simVy: $('#simVy'), simAx: $('#simAx'), simAy: $('#simAy'),
      sim2Type: $('#sim2Type'), sim2X0: $('#sim2X0'), sim2Y0: $('#sim2Y0'), sim2V0: $('#sim2V0'),
      sim2Angle: $('#sim2Angle'), sim2Accel: $('#sim2Accel'), sim2Radius: $('#sim2Radius'),
      sim2Period: $('#sim2Period'), sim2Phase: $('#sim2Phase'), sim2Amp: $('#sim2Amp'),
      sim2Vx: $('#sim2Vx'), sim2Vy: $('#sim2Vy'), sim2Ax: $('#sim2Ax'), sim2Ay: $('#sim2Ay'),
      sim2Body: $('#sim2Body'), sim2Noise: $('#sim2Noise'), sim2AccelLabel: $('#sim2AccelLabel'),
      sim2X0Label: $('#sim2X0Label'), sim2Y0Label: $('#sim2Y0Label'),
      simBody2On: $('#simBody2On'), simBody2Box: $('#simBody2Box'),
      simRef2On: $('#simRef2On'), simRef2Box: $('#simRef2Box'), simRef2Type: $('#simRef2Type'),
      simRef2Vx: $('#simRef2Vx'), simRef2Vy: $('#simRef2Vy'), simRef2Ax: $('#simRef2Ax'),
      simRef2Ay: $('#simRef2Ay'), simRef2W: $('#simRef2W'),
      playSpeed: $('#playSpeed'),
      simFrameRef: $('#simFrameRef'), sim2FrameRef: $('#sim2FrameRef'),
      simMass: $('#simMass'), simFx: $('#simFx'), simFy: $('#simFy'), simUseG: $('#simUseG'),
      sim2Mass: $('#sim2Mass'), sim2Fx: $('#sim2Fx'), sim2Fy: $('#sim2Fy'), sim2UseG: $('#sim2UseG'),
      autoSpeed: $('#autoSpeed'), btnInterpola: $('#btnInterpola'),
      btnResetST: $('#btnResetST'), btnResetVT: $('#btnResetVT'), btnResetEN: $('#btnResetEN'),
      simVideoSpeed: $('#simVideoSpeed'), simViewFrame: $('#simViewFrame'),

    };

    S.stage = els.stage;
    S.videoEl = els.video;
    S.canvas = els.canvas;
    S.ctx = els.canvas.getContext('2d');

    bindUI();
    bindVideo();
    bindStage();

    if (window.ResizeObserver) new ResizeObserver(layoutStage).observe($('.stage-wrap'));
    window.addEventListener('resize', layoutStage);
    window.addEventListener('orientationchange', () => setTimeout(layoutStage, 250));

    restoreAutosave();
    renderAll();

    const urlParam = new URLSearchParams(location.search).get('video');
    if (urlParam) {
      S.videoName = urlParam.split('/').pop() || urlParam;
      els.video.src = urlParam;
      els.video.load();
      toast('Caricamento video…');
    }
  }

  /* ------------------------------------------------------------------ UI */
  function bindUI() {
    $('#btnOpenVideo').addEventListener('click', () => $('#fileVideo').click());
    $('#btnOpenProject').addEventListener('click', () => $('#fileProject').click());
    $('#btnSaveProject').addEventListener('click', saveProject);
    $('#btnExport').addEventListener('click', () => exportAllCSV());
    $('#btnNew').addEventListener('click', newProject);
    $('#btnExportST').addEventListener('click', exportST);
    $('#btnExportVT').addEventListener('click', exportVT);
    $('#btnExportEN').addEventListener('click', exportEnergyCSV);
    $('#btnExportPDF').addEventListener('click', exportPDF);

    els.btnInterpola.addEventListener('click', () => {
      S.interpolate = !S.interpolate;
      updateInterpolaButton();
      updateAnalysis();
      scheduleAutosave();
    });
    els.btnResetST.addEventListener('click', () => resetTableEdits('st'));
    els.btnResetVT.addEventListener('click', () => resetTableEdits('vt'));
    els.btnResetEN.addEventListener('click', () => resetTableEdits('en'));
    bindEditableTables();

    $('#fileVideo').addEventListener('change', e => {
      const f = e.target.files && e.target.files[0];
      if (f) openVideoFile(f);
      e.target.value = '';
    });
    $('#fileProject').addEventListener('change', e => {
      const f = e.target.files && e.target.files[0];
      if (f) loadProjectFile(f);
      e.target.value = '';
    });

    els.play.addEventListener('click', togglePlay);
    $('#btnPrev').addEventListener('click', () => { pause(); setFrame(S.frame - 1, true); });
    $('#btnNext').addEventListener('click', () => { pause(); setFrame(S.frame + 1, true); });
    els.seek.addEventListener('input', () => { pause(); setFrame(Number(els.seek.value), true); });
    els.fps.addEventListener('change', onFpsManual);
    els.playSpeed.addEventListener('change', () => {
      const raw = Number(els.playSpeed.value);
      S.playRate = raw < 0 ? 1 / Math.abs(raw) : (raw > 0 ? raw : 1);
      applyPlaybackRate();
    });

    els.btnMoto.addEventListener('click', () => toggleMoto());
    $('#btnAutoTrack').addEventListener('click', runAutoTrack);
    els.chkAutoAdvance.addEventListener('change', () => {
      S.autoAdvance = els.chkAutoAdvance.checked;
      scheduleAutosave();
    });
    els.autoSpeed.addEventListener('change', () => {
      const v = Number(els.autoSpeed.value);
      S.autoSlowdown = isFinite(v) ? clamp(v, 0, 1000) : 90;
      scheduleAutosave();
    });

    $('#btnRangePrev').addEventListener('click', () => stepInRange(-1));
    $('#btnRangeNext').addEventListener('click', () => stepInRange(1));
    els.btnRangePlay.addEventListener('click', toggleRangePlay);

    els.simType.addEventListener('change', () => { updateSimFields(); syncMotionExtras(1); });
    els.sim2Type.addEventListener('change', () => { updateSimFields(); syncMotionExtras(2); });
    $('#btnSimGenerate').addEventListener('click', () => generateSimulation(false));
    $('#btnSimDemo').addEventListener('click', () => generateSimulation(true));
    els.simFrame.addEventListener('change', updateFrameFields);
    els.simRef2Type.addEventListener('change', updateFrameFields);
    els.simBody2On.addEventListener('change', () => {
      els.simBody2Box.classList.toggle('hidden', !els.simBody2On.checked);
    });
    els.simRef2On.addEventListener('change', () => {
      els.simRef2Box.classList.toggle('hidden', !els.simRef2On.checked);
      updateFrameFields();
    });
    els.simShowLab.addEventListener('change', () => {
      S.showLabAxes = els.simShowLab.checked;
      drawOverlay();
      scheduleAutosave();
    });
    els.btnSimVideo.addEventListener('click', recordSimVideo);
    els.simVideoSpeed.addEventListener('change', () => {
      const v = Number(els.simVideoSpeed.value);
      S.simVideoSpeed = isFinite(v) && v > 0 ? clamp(v, 0.1, 8) : 1;
      scheduleAutosave();
    });
    els.simViewFrame.addEventListener('change', () => {
      S.simView = els.simViewFrame.value;
      applySimulationView();
      scheduleAutosave();
    });
    updateSimFields();
    updateFrameFields();
    updateInterpolaButton();

    [els.mass, els.gravity].forEach(inp => {
      inp.addEventListener('change', onEnergyParams);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); onEnergyParams(); } });
    });

    $('#btnAddParticle').addEventListener('click', () => addParticle());
    els.particleList.addEventListener('click', onParticleListClick);

    $('#chkTrail').addEventListener('change', e => { S.showTrail = e.target.checked; drawOverlay(); });
    $('#chkAxes').addEventListener('change', e => { S.showAxes = e.target.checked; drawOverlay(); });
    $('#chkLabels').addEventListener('change', e => { S.showLabels = e.target.checked; drawOverlay(); });

    $$('.tab').forEach(tab => tab.addEventListener('click', () => {
      const name = tab.dataset.tab;
      if (name === 'track' || name === 'calib' || name === 'axes') setMode(name);
      else activateTab(name);
    }));

    $('#btnCalibReset').addEventListener('click', () => resetCalib(true));

    $('#btnAxesApply').addEventListener('click', applyAxesFields);
    $('#btnAxesPick').addEventListener('click', () => { setMode('axes'); toast('Clicca sul video per posizionare l\'origine, poi trascina per ruotare'); });
    $('#btnAxesAuto').addEventListener('click', autoAxes);
    [els.axesX, els.axesY, els.axesAngle].forEach(inp => inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); applyAxesFields(); }
    }));

    els.rangeTrack.addEventListener('pointerdown', onRangeDown);
    els.transportRange.addEventListener('pointerdown', onTransportRangeDown);
    els.rangeStart.addEventListener('change', () => setRange(Number(els.rangeStart.value), S.range.end, false));
    els.rangeEnd.addEventListener('change', () => setRange(S.range.start, Number(els.rangeEnd.value), false));
    $('#btnResetRange').addEventListener('click', () => setRange(0, Math.max(0, S.totalFrames - 1), false));
    $('#btnAutoRange').addEventListener('click', detectRange);
    els.btnConfirmRange.addEventListener('click', () => {
      if (S.range.end <= S.range.start) { toast('Intervallo non valido'); return; }
      setMode('calib');
    });
    els.stAxisMode.addEventListener('change', () => {
      S.stSwap = els.stAxisMode.value === 't-y';
      updateAnalysis();
      scheduleAutosave();
    });
    els.busyCancel.addEventListener('click', () => { S.cancel = true; });

    els.stage.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    els.canvas.addEventListener('contextmenu', e => e.preventDefault());

    document.addEventListener('keydown', onKeyDown);

    ['dragenter', 'dragover'].forEach(ev => els.stage.addEventListener(ev, e => {
      e.preventDefault(); els.stage.classList.add('dragover');
    }));
    ['dragleave', 'dragend', 'drop'].forEach(ev => els.stage.addEventListener(ev, e => {
      e.preventDefault(); els.stage.classList.remove('dragover');
    }));
    els.stage.addEventListener('drop', e => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) openVideoFile(f);
    });
  }

  function bindVideo() {
    const v = els.video;
    v.addEventListener('loadedmetadata', onLoadedMetadata);
    v.addEventListener('play', () => { S.playing = true; updatePlayButton(); rafLoop(); });
    v.addEventListener('pause', () => { S.playing = false; updatePlayButton(); });
    v.addEventListener('seeked', () => { if (!S.playing && !S.busy) syncFrameFromVideo(); });
    v.addEventListener('timeupdate', () => { if (!S.playing && !S.busy) syncFrameFromVideo(); });
    v.addEventListener('error', () => toast('Impossibile caricare il video'));
  }

  function bindStage() {
    // pointer bindings done in bindUI
  }

  function onKeyDown(e) {
    const t = e.target;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if (e.key === ' ') { e.preventDefault(); togglePlay(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); pause(); setFrame(S.frame - 1, true); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); pause(); setFrame(S.frame + 1, true); }
    else if (e.key === 'Escape') {
      if (S.busy) { S.cancel = true; return; }
      if (S.moto) toggleMoto(false);
      else setMode('track');
    }
  }

  /* ------------------------------------------------------------- video */
  function openVideoFile(file) {
    if (!file) return;
    if (/\.json$/i.test(file.name) || file.type === 'application/json') { loadProjectFile(file); return; }
    if (!/^video\//.test(file.type) && !/\.(mp4|webm|mov|m4v|ogv|avi|mkv)$/i.test(file.name)) {
      toast('Formato non supportato dal browser');
      return;
    }
    const wasSynth = !!(S.synth && S.synth.active);
    pause();
    S.synth = null;
    S.playing = false;
    S.seekTarget = null;
    S.fpsManual = false;
    S.autoRangeDone = false;
    els.fps.disabled = false;
    updatePlayButton();
    if (wasSynth) {
      S.particles = [];
      S.activeId = null;
      S.calib = { p1: null, p2: null, length: null, scale: null };
      S.axes = { x: null, y: null, theta: 0 };
      S.rangeSet = false;
      S.range = { start: 0, end: 0 };
    }
    if (S.objectURL) URL.revokeObjectURL(S.objectURL);
    S.objectURL = URL.createObjectURL(file);
    S.videoName = file.name;
    els.video.src = S.objectURL;
    els.video.load();
    toast('Caricamento video…');
  }

  function onLoadedMetadata() {
    const v = els.video;
    const token = ++S.loadToken;

    S.synth = null;
    S.playing = false;
    S.seekTarget = null;
    els.fps.disabled = false;
    S.video.width = v.videoWidth || 1;
    S.video.height = v.videoHeight || 1;
    S.video.duration = isFinite(v.duration) ? v.duration : 0;
    S.video.loaded = true;
    applyPlaybackRate();

    els.canvas.width = S.video.width;
    els.canvas.height = S.video.height;

    if (S.axes.x == null) {
      S.axes = { x: Math.round(S.video.width / 2), y: Math.round(S.video.height / 2), theta: S.axes.theta || 0 };
    }
    clampAxes();

    computeFrames();
    const maxF = Math.max(0, S.totalFrames - 1);
    if (S.projectRangePending) {
      S.projectRangePending = false;
      S.autoRangeDone = true;
      if (!S.rangeSet) {
        S.range = { start: 0, end: maxF };
      } else {
        S.range.start = clamp(S.range.start, 0, maxF);
        S.range.end = clamp(S.range.end, S.range.start, maxF);
      }
    } else {
      S.range = { start: 0, end: maxF };
      S.rangeSet = false;
      S.autoRangeDone = false;
    }

    els.seek.max = String(Math.max(0, S.totalFrames - 1));
    els.dropHint.classList.add('hidden');
    layoutStage();
    setFrame(Math.min(S.frame, S.range.end), true);
    updateRangeDom();
    syncAxesFields();
    renderAll();
    scheduleAutosave();

    detectFps(token);
  }

  async function detectFps(token) {
    if (!S.video.loaded) return;
    if (S.fpsManual || (S.synth && S.synth.active)) { maybeAutoDetectRange(token); return; }
    els.fpsBadge.textContent = 'rilevo…';
    let fps = null;
    try { fps = await Vision.estimateFps(els.video, 2300); } catch (e) { fps = null; }
    if (token !== S.loadToken) return;
    if (fps && isFinite(fps) && fps >= 4 && fps <= 300) {
      S.fpsDetected = fps;
      if (!S.fpsManual) {
        S.fps = fps;
        els.fps.value = String(round2(fps));
        els.fpsBadge.textContent = 'auto';
        computeFrames();
        if (!S.rangeSet) S.range = { start: 0, end: Math.max(0, S.totalFrames - 1) };
        else S.range.end = clamp(S.range.end, S.range.start, Math.max(0, S.totalFrames - 1));
        els.seek.max = String(Math.max(0, S.totalFrames - 1));
        updateRangeDom();
        setFrame(Math.min(S.frame, S.range.end), true);
        updateAnalysis();
        scheduleAutosave();
        toast('FPS rilevati: ' + round2(fps));
      }
    } else {
      els.fpsBadge.textContent = 'stimati';
      toast('FPS non rilevati: imposta il valore manualmente');
    }
    maybeAutoDetectRange(token);
  }

  function maybeAutoDetectRange(token) {
    if (token !== S.loadToken || S.autoRangeDone) return;
    S.autoRangeDone = true;
    if (!S.video.loaded || (S.synth && S.synth.active) || S.rangeSet) return;
    detectRange(true);
  }

  function onFpsManual() {
    if (S.synth && S.synth.active) {
      els.fps.value = String(round2(S.fps));
      toast('Nella simulazione gli FPS si impostano nel pannello Simula');
      return;
    }
    const v = parseFloat(els.fps.value);
    if (!isFinite(v) || v <= 0) { els.fps.value = String(S.fps); return; }
    S.fps = v;
    S.fpsManual = true;
    els.fpsBadge.textContent = 'manuale';
    const wasFull = S.rangeSet === false;
    computeFrames();
    if (wasFull) S.range = { start: 0, end: Math.max(0, S.totalFrames - 1) };
    else {
      S.range.start = clamp(S.range.start, 0, Math.max(0, S.totalFrames - 1));
      S.range.end = clamp(S.range.end, S.range.start, Math.max(0, S.totalFrames - 1));
    }
    els.seek.max = String(Math.max(0, S.totalFrames - 1));
    updateRangeDom();
    setFrame(clamp(S.frame, 0, Math.max(0, S.totalFrames - 1)), true);
    updateAnalysis();
    scheduleAutosave();
    if (!S.rangeSet) {
      S.autoRangeDone = false;
      maybeAutoDetectRange(S.loadToken);
    }
  }

  function computeFrames() {
    S.totalFrames = S.video.loaded ? Math.max(1, Math.round(S.video.duration * S.fps)) : 0;
    els.seek.max = String(Math.max(0, S.totalFrames - 1));
    S.frame = clamp(S.frame, 0, Math.max(0, S.totalFrames - 1));
  }

  function setFrame(i, seekVideo) {
    if (!S.video.loaded) return;
    S.frame = clamp(Math.round(i), 0, Math.max(0, S.totalFrames - 1));
    if (seekVideo && !(S.synth && S.synth.active)) {
      const t = clamp(S.frame / S.fps, 0, Math.max(0, S.video.duration - 0.0005));
      S.seekTarget = Math.abs(els.video.currentTime - t) > 0.5 / S.fps ? { frame: S.frame, time: t } : null;
      try { els.video.currentTime = t; } catch (e) { S.seekTarget = null; }
    }
    drawOverlay();
    updateTransport();
    highlightRows();
  }

  function syncFrameFromVideo() {
    if (!S.video.loaded) return;
    if (S.seekTarget) {
      if (Math.abs(els.video.currentTime - S.seekTarget.time) > 0.5 / S.fps) return;
      S.seekTarget = null;
    }
    const f = clamp(Math.round(els.video.currentTime * S.fps), 0, Math.max(0, S.totalFrames - 1));
    if (f !== S.frame) {
      S.frame = f;
      drawOverlay();
      updateTransport();
      highlightRows();
    }
  }

  function rafLoop() {
    if (!S.playing) return;
    syncFrameFromVideo();
    if (S.playMode === 'range' && S.frame >= S.range.end) {
      pause();
      setFrame(S.range.end, true);
      return;
    }
    requestAnimationFrame(rafLoop);
  }

  function applyPlaybackRate() {
    if (S.synth && S.synth.active) return;
    try { els.video.playbackRate = S.playRate; } catch (e) {}
  }

  function togglePlay() {
    if (!S.video.loaded) { toast('Apri un video o genera una simulazione'); return; }
    S.playMode = 'all';
    if (S.playing) { pause(); return; }
    if (S.synth && S.synth.active) {
      if (S.frame >= Math.max(0, S.totalFrames - 1)) setFrame(0, false);
      startSynthPlay();
      return;
    }
    applyPlaybackRate();
    if (S.frame >= Math.max(0, S.totalFrames - 1)) setFrame(0, true);
    els.video.play().catch(() => toast('Riproduzione non consentita'));
  }

  function toggleRangePlay() {
    if (!S.video.loaded) { toast('Apri un video o genera una simulazione'); return; }
    if (S.range.end <= S.range.start) { toast('Intervallo non valido'); return; }
    if (S.playing && S.playMode === 'range') { pause(); return; }
    pause();
    S.playMode = 'range';
    if (S.frame < S.range.start || S.frame >= S.range.end) setFrame(S.range.start, true);
    if (S.synth && S.synth.active) { startSynthPlay(); return; }
    applyPlaybackRate();
    els.video.play().catch(() => toast('Riproduzione non consentita'));
  }

  function stepInRange(dir) {
    if (!S.video.loaded) return;
    pause();
    let f = S.frame + dir;
    if (S.frame < S.range.start || S.frame > S.range.end) f = dir < 0 ? S.range.end : S.range.start;
    setFrame(clamp(f, S.range.start, S.range.end), true);
  }

  function startSynthPlay() {
    if (S.playing) return;
    S.playing = true;
    S.synthLast = 0;
    S.synthAcc = 0;
    updatePlayButton();
    requestAnimationFrame(synthTick);
  }

  function synthTick(ts) {
    if (!S.playing) return;
    if (!S.synth || !S.synth.active) { S.playing = false; updatePlayButton(); return; }
    if (!S.synthLast) S.synthLast = ts;
    S.synthAcc += (ts - S.synthLast) / 1000 * S.fps * S.playRate;
    S.synthLast = ts;
    const n = Math.floor(S.synthAcc);
    if (n > 0) {
      S.synthAcc -= n;
      const max = S.playMode === 'range'
        ? Math.min(S.range.end, Math.max(0, S.totalFrames - 1))
        : Math.max(0, S.totalFrames - 1);
      const f = S.frame + n;
      if (f >= max) {
        setFrame(max, false);
        pause();
        return;
      }
      setFrame(f, false);
    }
    requestAnimationFrame(synthTick);
  }

  function pause() {
    if (S.synth && S.synth.active) {
      if (S.playing) { S.playing = false; updatePlayButton(); }
      return;
    }
    if (!els.video.paused) els.video.pause();
  }

  function updateTransport() {
    if (!S.video.loaded) {
      els.timeLabel.textContent = '– / –';
      els.frameSeconds.textContent = '– s';
      els.seek.disabled = true;
      return;
    }
    els.seek.disabled = false;
    els.seek.value = String(S.frame);
    els.timeLabel.textContent = S.frame + ' / ' + Math.max(0, S.totalFrames - 1);
    const t = S.frame / S.fps;
    els.frameSeconds.textContent = 't ' + t.toFixed(2) + ' s · Δt ' + (1 / S.fps).toFixed(3) + ' s';
    els.rangeFrameLabel.textContent = 'Frame ' + S.frame + ' / ' + Math.max(0, S.totalFrames - 1) +
      ' · t ' + t.toFixed(2) + ' s';
  }

  function updatePlayButton() {
    const paused = (S.synth && S.synth.active) ? !S.playing : (!els.video || els.video.paused);
    els.play.textContent = paused ? '▶' : '❚❚';
    els.play.title = paused ? 'Play (spazio)' : 'Pausa (spazio)';
    if (els.btnRangePlay) {
      const rangePlaying = S.playing && S.playMode === 'range';
      els.btnRangePlay.textContent = rangePlaying ? '❚❚' : '▶';
      els.btnRangePlay.title = rangePlaying ? 'Pausa' : 'Riproduci solo l\'intervallo selezionato';
    }
  }

  function layoutStage() {
    const stage = els.stage;
    const wrap = stage.parentElement;
    if (!wrap) return;
    if (!S.video.loaded) { stage.style.width = ''; stage.style.height = ''; stage.style.minHeight = '240px'; return; }
    stage.style.minHeight = '0px';
    const transport = wrap.querySelector('.transport');
    const tH = transport ? transport.offsetHeight + 10 : 0;
    const rangeBar = wrap.querySelector('.transport-range');
    const rH = rangeBar ? rangeBar.offsetHeight : 0;
    const toolbar = wrap.querySelector('.toolbar');
    const tbH = toolbar ? toolbar.offsetHeight + 10 : 0;
    const availW = Math.max(40, wrap.clientWidth);
    const availH = Math.max(120, wrap.clientHeight - tH - rH - tbH);
    const ar = S.video.width / S.video.height;
    let w = availW, h = w / ar;
    if (h > availH) { h = availH; w = h * ar; }
    stage.style.width = Math.floor(w) + 'px';
    stage.style.height = Math.floor(h) + 'px';
  }

  /* ------------------------------------------------------------- modes */
  function setMode(mode) {
    S.mode = mode;
    els.stage.dataset.mode = mode;
    if (mode === 'track' || mode === 'calib' || mode === 'axes') activateTab(mode);
    if (mode === 'calib') {
      if (!S.calib.p1 && S.video.loaded) setFrame(S.range.start, true);
      toast('Calibra: clicca i due estremi del bordo (primo frame dell\'intervallo)');
    }
    if (mode === 'axes') { syncAxesFields(); toast('Assi: clicca per l\'origine, trascina per ruotare'); }
    if (mode === 'track' && S.video.loaded && (S.frame < S.range.start || S.frame > S.range.end)) {
      setFrame(S.range.start, true);
    }
  }

  function activateTab(name) {
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + name));
    if (name === 'analysis') updateAnalysis();
  }

  function updateInterpolaButton() {
    if (!els.btnInterpola) return;
    els.btnInterpola.classList.toggle('active', !!S.interpolate);
    els.btnInterpola.textContent = S.interpolate ? 'Interpolato' : 'Interpola';
    els.btnInterpola.title = S.interpolate
      ? 'Grafici interpolati: clicca per tornare a segmenti'
      : 'Rende i grafici più lisci e uniformi, utili per riconoscere il tipo di moto';
  }

  /* --------------------------------------------------------- range UI */
  function totalSpan() { return Math.max(1, S.totalFrames - 1); }

  function setRange(start, end, moveFrame) {
    if (!S.video.loaded) { S.range.start = start; S.range.end = end; return; }
    const maxF = Math.max(0, S.totalFrames - 1);
    let a = Math.round(clamp(start, 0, maxF));
    let b = Math.round(clamp(end, 0, maxF));
    if (a > b) { const t = a; a = b; b = t; }
    S.range.start = a;
    S.range.end = b;
    S.rangeSet = !(a === 0 && b === maxF);
    updateRangeDom();
    if (moveFrame !== false && (S.frame < a || S.frame > b)) setFrame(a, true);
    updateAnalysis();
    scheduleAutosave();
  }

  function updateRangeDom() {
    if (!S.video.loaded) {
      els.rangeLabel.textContent = '–';
      els.rangeTimes.textContent = '';
      els.rangeFrameLabel.textContent = 'Frame – / –';
      els.transportRangeTimes.textContent = '–';
      return;
    }
    const span = totalSpan();
    const a = S.range.start, b = S.range.end;
    const pa = (a / span) * 100;
    const pb = (b / span) * 100;
    els.rangeStartHandle.style.left = pa + '%';
    els.rangeEndHandle.style.left = pb + '%';
    els.rangeFill.style.left = pa + '%';
    els.rangeFill.style.width = Math.max(0, pb - pa) + '%';
    els.transportRangeStart.style.left = pa + '%';
    els.transportRangeEnd.style.left = pb + '%';
    els.transportRangeFill.style.left = pa + '%';
    els.transportRangeFill.style.width = Math.max(0, pb - pa) + '%';
    els.rangeStart.max = String(Math.max(0, S.totalFrames - 1));
    els.rangeEnd.max = String(Math.max(0, S.totalFrames - 1));
    els.rangeStart.value = String(a);
    els.rangeEnd.value = String(b);
    const ta = a / S.fps, tb = b / S.fps;
    els.rangeLabel.textContent = a + '–' + b;
    els.rangeTimes.textContent = '(' + ta.toFixed(2) + '–' + tb.toFixed(2) + ' s · ' + (b - a + 1) + ' frame)';
    els.rangeFrameLabel.textContent = 'Frame ' + S.frame + ' / ' + Math.max(0, S.totalFrames - 1) +
      ' · t ' + (S.frame / S.fps).toFixed(2) + ' s';
    els.transportRangeTimes.textContent = ta.toFixed(2) + '–' + tb.toFixed(2) + ' s';
  }

  function onRangeDown(e) {
    startRangeDrag(e, els.rangeTrack);
  }

  function onTransportRangeDown(e) {
    startRangeDrag(e, els.transportRange);
  }

  function startRangeDrag(e, track) {
    if (!S.video.loaded) return;
    e.preventDefault();
    const rect = track.getBoundingClientRect();
    const f = frameFromRangeX(e.clientX, rect);
    const ds = Math.abs(f - S.range.start);
    const de = Math.abs(f - S.range.end);
    S.rangeDrag = { handle: ds <= de ? 'start' : 'end', pointerId: e.pointerId, track };
    applyRangeDrag(e.clientX);
  }

  function frameFromRangeX(clientX, rect) {
    const frac = clamp((clientX - rect.left) / rect.width, 0, 1);
    return Math.round(frac * Math.max(0, S.totalFrames - 1));
  }

  function applyRangeDrag(clientX) {
    if (!S.rangeDrag) return;
    const rect = (S.rangeDrag.track || els.rangeTrack).getBoundingClientRect();
    const f = frameFromRangeX(clientX, rect);
    if (S.rangeDrag.handle === 'start') setRange(f, S.range.end, false);
    else setRange(S.range.start, f, false);
  }

  async function detectRange(silent) {
    if (!S.video.loaded) { if (!silent) toast('Apri prima un video'); return; }
    if (S.synth && S.synth.active) {
      if (!silent) toast('Nella simulazione i dati sono già esatti: usa l\'intervallo manuale');
      return;
    }
    if (S.busy) return;
    pause();
    S.cancel = false;
    showBusy(silent ? 'Rilevamento automatico dell\'intervallo…' : 'Rilevamento del movimento…');
    const res = await Vision.analyzeMotion(els.video, { fps: S.fps, samples: 180, delayMs: Math.round(S.autoSlowdown * 0.6) },
      p => setBusy(p), () => S.cancel);
    hideBusy();
    if (!res || !res.ok) {
      els.autoRangeStatus.textContent = res && res.cancelled
        ? 'Rilevamento annullato.'
        : 'Nessun movimento netto rilevato: seleziona l\'intervallo a mano.';
      if (!silent) toast(res && res.cancelled ? 'Annullato' : 'Nessun movimento netto');
      setFrame(S.frame, true);
      return;
    }
    const maxF = Math.max(0, S.totalFrames - 1);
    const startF = clamp(Math.floor(res.startTime * S.fps), 0, maxF);
    const endF = clamp(Math.ceil(res.endTime * S.fps), startF, maxF);
    setRange(startF, endF, false);
    setFrame(startF, true);
    const how = res.method === 'presence' ? 'apparizione/scomparsa del corpo' : 'movimento del corpo';
    els.autoRangeStatus.textContent = 'Rilevato (' + how + '): frame ' + startF + '–' + endF +
      ' (' + (startF / S.fps).toFixed(2) + '–' + (endF / S.fps).toFixed(2) + ' s). Puoi correggere i cursori.';
    toast('Intervallo rilevato: ' + (startF / S.fps).toFixed(2) + '–' + (endF / S.fps).toFixed(2) + ' s');
  }

  /* ------------------------------------------------------- calibration */
  function handleCalibClick(p) {
    let q = { x: p.x, y: p.y };
    if (els.chkSnap.checked && S.video.loaded && !(S.synth && S.synth.active)) {
      const snapped = Vision.snapToEdge(els.video, p.x, p.y, 8);
      if (snapped.snapped) q = { x: snapped.x, y: snapped.y };
    }
    const c = S.calib;
    if (!c.p1) {
      c.p1 = q; c.p2 = null; c.scale = null; c.length = null;
      toast('Ora clicca il secondo estremo del bordo');
    } else if (!c.p2) {
      if (Math.hypot(q.x - c.p1.x, q.y - c.p1.y) < 3) { toast('Punti troppo vicini'); return; }
      c.p2 = q;
      drawOverlay();
      updateCalibStatus();
      const preset = parseFloat(els.calibPreset.value);
      askNumber('Misura reale', 'Lunghezza del bordo selezionato in metri.', isFinite(preset) && preset > 0 ? preset : 1).then(v => {
        if (v == null || !(v > 0)) {
          S.calib.p2 = null;
          updateCalibStatus(); drawOverlay();
          return;
        }
        const d = Math.hypot(S.calib.p2.x - S.calib.p1.x, S.calib.p2.y - S.calib.p1.y);
        S.calib.length = v;
        S.calib.scale = v / d;
        updateCalibStatus();
        drawOverlay();
        updateAnalysis();
        scheduleAutosave();
        toast('Calibrazione completata');
      });
      return;
    } else {
      c.p1 = q; c.p2 = null; c.length = null; c.scale = null;
      toast('Nuovo bordo: clicca il secondo estremo');
    }
    updateCalibStatus();
    drawOverlay();
  }

  function resetCalib(showToast) {
    S.calib = { p1: null, p2: null, length: null, scale: null };
    updateCalibStatus();
    drawOverlay();
    updateAnalysis();
    scheduleAutosave();
    if (showToast) toast('Calibrazione reimpostata');
  }

  function updateCalibStatus() {
    const c = S.calib;
    const el = els.calibStatus;
    if (c.scale) {
      el.textContent = 'Calibrato · 1 m ≈ ' + (1 / c.scale).toFixed(1) + ' px · ' + c.length + ' m';
      el.style.color = 'var(--green)';
    } else if (c.p1) {
      el.textContent = 'Primo estremo impostato: clicca il secondo';
      el.style.color = '';
    } else {
      el.textContent = 'Non calibrato';
      el.style.color = '';
    }
  }

  /* ------------------------------------------------------------- axes */
  function clampAxes() {
    if (!S.video.loaded) return;
    S.axes.x = clamp(Math.round(S.axes.x == null ? S.video.width / 2 : S.axes.x), 0, S.video.width - 1);
    S.axes.y = clamp(Math.round(S.axes.y == null ? S.video.height / 2 : S.axes.y), 0, S.video.height - 1);
    if (!isFinite(S.axes.theta)) S.axes.theta = 0;
  }

  function syncAxesFields() {
    if (S.axes.x == null) {
      els.axesStatus.textContent = 'Origine non impostata';
      els.axesX.value = '';
      els.axesY.value = '';
      els.axesAngle.value = '';
      return;
    }
    els.axesX.value = String(Math.round(S.axes.x));
    els.axesY.value = String(Math.round(S.axes.y));
    els.axesAngle.value = (-S.axes.theta * 180 / Math.PI).toFixed(1);
    els.axesStatus.textContent = 'Origine (' + Math.round(S.axes.x) + ', ' + Math.round(S.axes.y) +
      ' px) · angolo ' + (-S.axes.theta * 180 / Math.PI).toFixed(1) + '°';
    els.axesStatus.style.color = '';
  }

  function applyAxesFields() {
    if (!S.video.loaded) { toast('Apri prima un video'); return; }
    const x = parseFloat(els.axesX.value);
    const y = parseFloat(els.axesY.value);
    const a = parseFloat(els.axesAngle.value);
    if (isFinite(x)) S.axes.x = x;
    if (isFinite(y)) S.axes.y = y;
    if (isFinite(a)) S.axes.theta = -a * Math.PI / 180;
    clampAxes();
    syncAxesFields();
    drawOverlay();
    updateAnalysis();
    scheduleAutosave();
    toast('Assi aggiornati');
  }

  function autoAxes() {
    const p = activeParticle();
    if (!p || !Object.keys(p.marks).length) { toast('Traccia prima il corpo'); return; }
    const frames = Object.keys(p.marks).map(Number)
      .filter(f => isFinite(f) && f >= S.range.start && f <= S.range.end)
      .sort((a, b) => a - b);
    if (frames.length < 2) { toast('Servono almeno due punti tracciati nell\'intervallo'); return; }

    const pts = frames.map(f => p.marks[f]);
    const head = pts.slice(0, Math.min(5, pts.length));
    const ox = head.reduce((s, q) => s + q.x, 0) / head.length;
    const oy = head.reduce((s, q) => s + q.y, 0) / head.length;

    const k = Math.max(1, Math.floor(pts.length / 3));
    const avg = arr => ({
      x: arr.reduce((s, q) => s + q.x, 0) / arr.length,
      y: arr.reduce((s, q) => s + q.y, 0) / arr.length,
    });
    const A = avg(pts.slice(0, k));
    const B = avg(pts.slice(-k));
    let angle = Math.atan2(B.y - A.y, B.x - A.x);
    if (!isFinite(angle) || Math.hypot(B.x - A.x, B.y - A.y) < 3) angle = S.axes.theta || 0;

    if (Math.abs(Math.sin(angle)) > 0.94) angle = 0;

    S.axes = { x: clamp(Math.round(ox), 0, S.video.width - 1), y: clamp(Math.round(oy), 0, S.video.height - 1), theta: angle };
    syncAxesFields();
    drawOverlay();
    updateAnalysis();
    scheduleAutosave();
    toast('Assi automatici: origine sul corpo, asse x sul moto');
  }

  /* -------------------------------------------------------- simulation */
  function simVal(el, def) {
    const v = parseFloat(String(el.value).replace(',', '.'));
    return isFinite(v) ? v : def;
  }

  function simShowMap(type) {
    const dynamic = type === 'mru' || type === 'mrua' || type === 'fall' ||
      type === 'projectile' || type === 'custom';
    return {
      x0: true, y0: true,
      v0: type === 'mru' || type === 'mrua' || type === 'fall' || type === 'projectile',
      angle: type === 'mru' || type === 'mrua' || type === 'projectile',
      vel: type === 'custom',
      accel: type === 'mrua',
      accxy: dynamic,
      force: dynamic,
      grav: dynamic,
      radius: type === 'circular',
      period: type === 'circular' || type === 'harmonic',
      phase: type === 'circular' || type === 'harmonic',
      amp: type === 'harmonic',
    };
  }

  function updateSimFields() {
    const t1 = els.simType.value;
    const t2 = els.sim2Type.value;
    const show1 = simShowMap(t1);
    const show2 = simShowMap(t2);
    $$('[data-sim]', $('#panel-simula')).forEach(l => {
      l.style.display = show1[l.dataset.sim] ? '' : 'none';
    });
    $$('[data-sim2]', $('#panel-simula')).forEach(l => {
      l.style.display = show2[l.dataset.sim2] ? '' : 'none';
    });
    els.simAccelLabel.textContent = (t1 === 'fall' || t1 === 'projectile') ? 'g (m/s²)' : 'a (m/s²)';
    els.sim2AccelLabel.textContent = (t2 === 'fall' || t2 === 'projectile') ? 'g (m/s²)' : 'a (m/s²)';
    els.simX0Label.textContent = t1 === 'circular' ? 'x centro (m)' : 'x₀ (m)';
    els.simY0Label.textContent = t1 === 'circular' ? 'y centro (m)' : 'y₀ (m)';
    els.sim2X0Label.textContent = t2 === 'circular' ? 'x centro (m)' : 'x₀ (m)';
    els.sim2Y0Label.textContent = t2 === 'circular' ? 'y centro (m)' : 'y₀ (m)';
  }

  function syncMotionExtras(which) {
    const typeEl = which === 2 ? els.sim2Type : els.simType;
    const gEl = which === 2 ? els.sim2UseG : els.simUseG;
    if (!typeEl) return;
    const d = simDefaults(typeEl.value);
    const pre = which === 2 ? 'sim2' : 'sim';
    const set = (suffix, value) => {
      const el = document.getElementById(pre + suffix);
      if (el) el.value = value;
    };
    set('Ax', d.ax);
    set('Ay', d.ay);
    set('Mass', d.mass);
    set('Fx', d.fx);
    set('Fy', d.fy);
    if (gEl) gEl.checked = !!d.useG;
  }

  function updateFrameFields() {
    const type = els.simFrame.value;
    const show = { v: type === 'moving', a: type === 'accel', w: type === 'rotating' };
    $$('[data-frame]', $('#panel-simula')).forEach(l => {
      l.style.display = show[l.dataset.frame] ? '' : 'none';
    });
    const rt = els.simRef2Type.value;
    const show2 = { v: rt === 'moving', a: rt === 'accel', w: rt === 'rotating' };
    $$('[data-ref2]', $('#panel-simula')).forEach(l => {
      l.style.display = show2[l.dataset.ref2] ? '' : 'none';
    });
    els.simShowLab.disabled = type === 'lab' && !els.simRef2On.checked;

    const secondaryOn = els.simRef2On.checked;
    [els.simFrameRef, els.sim2FrameRef].forEach(sel => {
      if (!sel) return;
      const opt = Array.from(sel.options).find(o => o.value === 'secondary');
      if (opt) opt.disabled = !secondaryOn;
      if (!secondaryOn && sel.value === 'secondary') sel.value = 'primary';
    });
  }

  function frameConfigFromUI() {
    const type = els.simFrame.value;
    if (type === 'moving') {
      return { type, vx: simVal(els.simFrameVx, 0), vy: simVal(els.simFrameVy, 0) };
    }
    if (type === 'accel') {
      return { type, ax: simVal(els.simFrameAx, 0), ay: simVal(els.simFrameAy, 0) };
    }
    if (type === 'rotating') {
      return { type, omega: simVal(els.simFrameW, 0) };
    }
    return { type: 'lab' };
  }

  function ref2ConfigFromUI(active) {
    if (!active) return null;
    const type = els.simRef2Type.value;
    if (type === 'moving') {
      return { type, vx: simVal(els.simRef2Vx, 0), vy: simVal(els.simRef2Vy, 0) };
    }
    if (type === 'accel') {
      return { type, ax: simVal(els.simRef2Ax, 0), ay: simVal(els.simRef2Ay, 0) };
    }
    if (type === 'rotating') {
      return { type, omega: simVal(els.simRef2W, 0) };
    }
    return { type: 'lab' };
  }

  const FRAME_LABELS = {
    lab: 'Laboratorio (inerziale)',
    moving: 'Inerziale in moto rettilineo uniforme',
    accel: 'Non inerziale accelerato',
    rotating: 'Non inerziale rotante',
  };

  function syncFrameControls(f) {
    f = f || { type: 'lab' };
    els.simFrame.value = f.type || 'lab';
    if (f.vx != null) els.simFrameVx.value = f.vx;
    if (f.vy != null) els.simFrameVy.value = f.vy;
    if (f.ax != null) els.simFrameAx.value = f.ax;
    if (f.ay != null) els.simFrameAy.value = f.ay;
    if (f.omega != null) els.simFrameW.value = f.omega;
    updateFrameFields();
  }

  function frameOrigin(t, f) {
    if (!f) return { x: 0, y: 0 };
    if (f.type === 'moving') return { x: f.vx * t, y: f.vy * t };
    if (f.type === 'accel') return { x: 0.5 * f.ax * t * t, y: 0.5 * f.ay * t * t };
    return { x: 0, y: 0 };
  }

  function frameAngle(t, f) {
    return f && f.type === 'rotating' ? f.omega * t : 0;
  }

  function labToFrame(q, t, f) {
    if (!f || f.type === 'lab') return { x: q.x, y: q.y };
    const o = frameOrigin(t, f);
    const phi = frameAngle(t, f);
    const c = Math.cos(phi), s = Math.sin(phi);
    const dx = q.x - o.x, dy = q.y - o.y;
    return { x: dx * c + dy * s, y: -dx * s + dy * c };
  }

  function frameToLab(q, t, f) {
    if (!f || f.type === 'lab') return { x: q.x, y: q.y };
    const o = frameOrigin(t, f);
    const phi = frameAngle(t, f);
    const c = Math.cos(phi), s = Math.sin(phi);
    return { x: q.x * c - q.y * s + o.x, y: q.x * s + q.y * c + o.y };
  }

  function simDefaults(type) {
    const base = {
      x0: 0, y0: 0, v0: 6, angle: 0, accel: 2, radius: 1, period: 2, phase: 0, amp: 1,
      vx: 5, vy: 0, ax: 0, ay: 0, mass: 1, fx: 0, fy: 0, useG: false,
      duration: 2, fps: 30, body: 10, noise: 0,
    };
    if (type === 'mru') return Object.assign(base, { v0: 6, angle: 0 });
    if (type === 'mrua') return Object.assign(base, { v0: 1, angle: 0, accel: 2 });
    if (type === 'fall') return Object.assign(base, { y0: 5, v0: 0, accel: 9.81, useG: true, duration: 1 });
    if (type === 'projectile') return Object.assign(base, { v0: 12, angle: 50, accel: 9.81, useG: true, duration: 2 });
    if (type === 'circular') return Object.assign(base, { radius: 1, period: 2, phase: 0 });
    if (type === 'harmonic') return Object.assign(base, { amp: 1, period: 2, phase: 0 });
    if (type === 'custom') return Object.assign(base, { vx: 5, vy: 2, ax: 0, ay: 0, useG: false });
    return base;
  }

  function applySimDefaults(type, which) {
    const d = simDefaults(type);
    const pre = which === 2 ? 'sim2' : 'sim';
    const set = (suffix, value) => {
      const el = document.getElementById(pre + suffix);
      if (el) el.value = value;
    };
    set('X0', which === 2 ? 0 : d.x0);
    set('Y0', which === 2 ? 1 : d.y0);
    set('V0', which === 2 ? 4 : d.v0);
    set('Angle', which === 2 ? 0 : d.angle);
    set('Accel', which === 2 ? 2 : d.accel);
    set('Radius', d.radius);
    set('Period', d.period);
    set('Phase', d.phase);
    set('Amp', d.amp);
    set('Vx', which === 2 ? 3 : d.vx);
    set('Vy', which === 2 ? 0 : d.vy);
    set('Ax', which === 2 ? 0 : d.ax);
    set('Ay', d.ay);
    set('Mass', d.mass);
    set('Fx', d.fx);
    set('Fy', d.fy);
    set('FrameRef', 'primary');
    const useG = document.getElementById(pre + 'UseG');
    if (useG) useG.checked = !!d.useG;
    set('Duration', d.duration);
    set('Fps', d.fps);
    if (which === 2) {
      set('Body', 10);
      set('Noise', 0);
    } else {
      set('Body', d.body);
      set('Noise', d.noise);
    }
  }

  function simPoints(type, p, n, fps) {
    const rad = p.angle * Math.PI / 180;
    const ph = p.phase * Math.PI / 180;
    const w = 2 * Math.PI / Math.max(0.05, Math.abs(p.period));
    const mass = Math.max(0.001, Math.abs(p.mass) || 1);
    const forceAx = (p.fx || 0) / mass;
    const forceAy = (p.fy || 0) / mass;
    const g = p.useG ? 9.81 : 0;
    const extraAx = (p.ax || 0) + forceAx;
    const extraAy = (p.ay || 0) + forceAy - g;
    const out = [];
    for (let f = 0; f < n; f++) {
      const t = f / fps;
      let x = 0, y = 0;
      if (type === 'mru') {
        x = p.x0 + p.v0 * Math.cos(rad) * t + 0.5 * extraAx * t * t;
        y = p.y0 + p.v0 * Math.sin(rad) * t + 0.5 * extraAy * t * t;
      } else if (type === 'mrua') {
        const ax = p.accel * Math.cos(rad), ay = p.accel * Math.sin(rad);
        x = p.x0 + p.v0 * Math.cos(rad) * t + 0.5 * (ax + extraAx) * t * t;
        y = p.y0 + p.v0 * Math.sin(rad) * t + 0.5 * (ay + extraAy) * t * t;
      } else if (type === 'fall') {
        x = p.x0 + 0.5 * extraAx * t * t;
        y = p.y0 + p.v0 * t + 0.5 * extraAy * t * t;
      } else if (type === 'projectile') {
        x = p.x0 + p.v0 * Math.cos(rad) * t + 0.5 * extraAx * t * t;
        y = p.y0 + p.v0 * Math.sin(rad) * t + 0.5 * extraAy * t * t;
      } else if (type === 'circular') {
        x = p.x0 + p.radius * Math.cos(w * t + ph);
        y = p.y0 + p.radius * Math.sin(w * t + ph);
      } else if (type === 'harmonic') {
        x = p.x0 + p.amp * Math.sin(w * t + ph);
        y = p.y0;
      } else if (type === 'custom') {
        x = p.x0 + p.vx * t + 0.5 * extraAx * t * t;
        y = p.y0 + p.vy * t + 0.5 * extraAy * t * t;
      }
      out.push({ x, y });
    }
    return out;
  }

  function readSimBody(which) {
    const pre = which === 2 ? 'sim2' : 'sim';
    const el = suffix => document.getElementById(pre + suffix);
    const type = el('Type').value;
    const params = {
      x0: simVal(el('X0'), 0), y0: simVal(el('Y0'), 0), v0: simVal(el('V0'), 0),
      angle: simVal(el('Angle'), 0), accel: simVal(el('Accel'), 2),
      radius: Math.abs(simVal(el('Radius'), 1)), period: Math.abs(simVal(el('Period'), 2)),
      phase: simVal(el('Phase'), 0), amp: Math.abs(simVal(el('Amp'), 1)),
      vx: simVal(el('Vx'), 0), vy: simVal(el('Vy'), 0),
      ax: simVal(el('Ax'), 0), ay: simVal(el('Ay'), 0),
      mass: Math.max(0.001, simVal(el('Mass'), 1)),
      fx: simVal(el('Fx'), 0), fy: simVal(el('Fy'), 0),
      useG: !!(el('UseG') && el('UseG').checked),
      duration: simVal(el('Duration') || els.simDuration, 2),
    };
    return {
      which, type, params,
      frame: (el('FrameRef') && el('FrameRef').value === 'secondary') ? 'secondary' : 'primary',
      bodyR: clamp(Math.round(simVal(el('Body'), 10)), 2, 48),
      noise: clamp(Math.abs(simVal(el('Noise'), 0)), 0, 50),
    };
  }

  function generateSimulation(useDemo) {
    const type = els.simType.value;
    const type2 = els.sim2Type.value;
    if (useDemo) {
      const scene = {
        duration: els.simDuration.value, fps: els.simFps.value,
        body: els.simBody.value, noise: els.simNoise.value,
        body2: els.sim2Body.value, noise2: els.sim2Noise.value,
      };
      applySimDefaults(type, 1);
      if (els.simBody2On.checked) applySimDefaults(type2, 2);
      els.simDuration.value = scene.duration;
      els.simFps.value = scene.fps;
      els.simBody.value = scene.body;
      els.simNoise.value = scene.noise;
      els.sim2Body.value = scene.body2;
      els.sim2Noise.value = scene.noise2;
      updateSimFields();
    }
    if (S.particles.length && !(S.synth && S.synth.active) &&
      !window.confirm('Sostituire i punti attuali con la simulazione?')) return;

    const fps = clamp(Math.round(simVal(els.simFps, 30)), 1, 240);
    const duration = clamp(simVal(els.simDuration, 2), 0.05, 120);
    let n = Math.max(2, Math.round(duration * fps) + 1);
    if (n > 3000) { n = 3000; toast('Durata limitata a ' + round2((n - 1) / fps) + ' s'); }

    const W = 960, H = 540, margin = 64;
    const frameCfg = frameConfigFromUI();
    const ref2 = ref2ConfigFromUI(els.simRef2On.checked);
    const bodies = [readSimBody(1)];
    if (els.simBody2On.checked) bodies.push(readSimBody(2));
    if (!ref2 && bodies.some(b => b.frame === 'secondary')) {
      toast('Attiva il secondo sistema di riferimento o assegna il corpo al sistema principale');
      return;
    }

    for (const b of bodies) {
      b.seed = (Math.random() * 0x7fffffff) | 0;
    }
    let view = S.simView || 'primary';
    if (view === 'secondary' && !ref2) {
      view = 'primary';
      S.simView = 'primary';
      if (els.simViewFrame) els.simViewFrame.value = 'primary';
    }
    const geo = simGeometry(bodies, fps, n, frameCfg, ref2, view, W, H, margin);
    const ppm = geo.ppm, ox = geo.ox, oy = geo.oy;
    const particles = simParticlesFromGeometry(geo, bodies, false);
    const calib = simCalibFromGeometry(geo);
    const primary = particles[0];

    pause();
    S.videoName = 'simulazione-' + type + (bodies.length > 1 ? '-2corpi' : '');
    setupSynthEnv({
      active: true, type, params: bodies[0].params, width: W, height: H,
      ppm, bodyR: bodies[0].bodyR, noise: bodies[0].noise, frames: n,
      frame: frameCfg, ref2, view,
      bodies: bodies.map(b => ({
        type: b.type, params: b.params, frame: b.frame, bodyR: b.bodyR, noise: b.noise,
        seed: b.seed,
      })),
    }, fps);

    S.totalFrames = n;
    S.frame = 0;
    S.range = { start: 0, end: n - 1 };
    S.rangeSet = false;
    S.projectRangePending = false;
    S.axes = { x: ox, y: oy, theta: 0 };
    S.calib = calib;
    S.particles = particles;
    S.activeId = primary.id;
    S.moto = false;
    els.btnMoto.classList.remove('active');
    els.btnMoto.textContent = 'Moto';

    els.seek.max = String(n - 1);
    updateRangeDom();
    syncAxesFields();
    updateCalibStatus();
    renderAll();
    setFrame(0, false);
    activateTab('analysis');
    const bodyFrames = bodies.map((b, i) => 'P' + (i + 1) + '→' + (b.frame === 'secondary' ? 'S2' : 'S1')).join(', ');
    els.simStatus.textContent = 'Generata: ' + n + ' frame, ' + round2(ppm) + ' px/m, ' +
      bodies.length + ' corpi (' + bodyFrames + ')' + (ref2 ? ' + 2° sistema di riferimento' : '') +
      (bodies.some(b => b.noise) ? ', con rumore' : ' (dati esatti)') + ' · ' +
      FRAME_LABELS[frameCfg.type] + '.';
    scheduleAutosave();
    toast('Simulazione pronta: ' + n + ' frame · ' + bodies.length + ' corpi');
  }

  function setupSynthEnv(cfg, fps) {
    fps = Number(fps) > 0 ? Number(fps) : 30;
    S.fps = fps;
    S.synth = {
      active: true,
      type: cfg.type || 'mru',
      params: cfg.params || {},
      width: Math.max(320, Number(cfg.width) || 960),
      height: Math.max(180, Number(cfg.height) || 540),
      ppm: Number(cfg.ppm) > 0 ? Number(cfg.ppm) : 100,
      bodyR: Number(cfg.bodyR) > 0 ? Number(cfg.bodyR) : 10,
      noise: Number(cfg.noise) || 0,
      frames: Math.max(2, Number(cfg.frames) || Math.round((Number(cfg.params && cfg.params.duration) || 2) * fps) + 1),
      frame: cfg.frame || { type: 'lab' },
      ref2: cfg.ref2 || null,
      view: cfg.view || 'primary',
      bodies: cfg.bodies || null,
    };
    S.video = {
      loaded: true,
      width: S.synth.width,
      height: S.synth.height,
      duration: S.synth.frames / fps,
    };
    S.fpsManual = true;
    S.fpsDetected = null;
    S.playing = false;
    els.fps.value = String(round2(fps));
    els.fps.disabled = true;
    els.fpsBadge.textContent = 'sim';
    els.canvas.width = S.synth.width;
    els.canvas.height = S.synth.height;
    els.dropHint.classList.add('hidden');
    try { els.video.pause(); } catch (e) {}
    els.video.removeAttribute('src');
    try { els.video.load(); } catch (e) {}
    if (!S.videoName) S.videoName = 'simulazione-' + S.synth.type;
    layoutStage();
  }

  function clearSyntheticEnv() {
    pause();
    S.synth = null;
    S.synthLast = 0;
    S.synthAcc = 0;
    S.playing = false;
    S.video = { loaded: false, width: 0, height: 0, duration: 0 };
    S.videoName = '';
    S.totalFrames = 0;
    S.frame = 0;
    S.range = { start: 0, end: 0 };
    S.rangeSet = false;
    S.projectRangePending = false;
    S.fpsManual = false;
    S.fps = 30;
    S.fpsDetected = null;
    els.fps.value = '30';
    els.fps.disabled = false;
    els.fpsBadge.textContent = 'auto…';
    els.canvas.width = 1;
    els.canvas.height = 1;
    if (S.ctx) S.ctx.clearRect(0, 0, 1, 1);
    els.seek.max = '0';
    els.seek.value = '0';
    els.seek.disabled = true;
    els.timeLabel.textContent = '– / –';
    els.dropHint.classList.remove('hidden');
    S.axes = { x: null, y: null, theta: 0 };
    try { els.video.pause(); } catch (e) {}
    els.video.removeAttribute('src');
    try { els.video.load(); } catch (e) {}
    updatePlayButton();
    layoutStage();
  }

  /* --------------------------------------------------------- particles */
  function activeParticle() { return S.particles.find(p => p.id === S.activeId) || null; }

  function addParticle() {
    const n = S.particles.length + 1;
    const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const p = { id, name: 'P' + n, color: PALETTE[(n - 1) % PALETTE.length], marks: {} };
    S.particles.push(p);
    S.activeId = id;
    renderParticleList();
    updateAnalysis();
    drawOverlay();
    scheduleAutosave();
    toast('Punto ' + p.name + ' aggiunto');
    return p;
  }

  function deleteParticle(id) {
    const idx = S.particles.findIndex(p => p.id === id);
    if (idx < 0) return;
    S.particles.splice(idx, 1);
    if (S.activeId === id) S.activeId = S.particles[0] ? S.particles[0].id : null;
    renderParticleList();
    updateAnalysis();
    drawOverlay();
    scheduleAutosave();
  }

  function onParticleListClick(e) {
    const item = e.target.closest('.particle-item');
    if (!item) return;
    if (e.target.closest('.del')) { deleteParticle(item.dataset.id); return; }
    S.activeId = item.dataset.id;
    renderParticleList();
    updateAnalysis();
    drawOverlay();
  }

  function renderParticleList() {
    const ul = els.particleList;
    ul.innerHTML = '';
    if (!S.particles.length) {
      const li = document.createElement('li');
      li.className = 'muted';
      li.textContent = 'Nessun punto. Aggiungine uno.';
      ul.appendChild(li);
      return;
    }
    for (const p of S.particles) {
      const li = document.createElement('li');
      li.className = 'particle-item' + (p.id === S.activeId ? ' active' : '');
      li.dataset.id = p.id;
      li.innerHTML =
        '<span class="dot" style="background:' + p.color + '"></span>' +
        '<span class="pname">' + p.name + '</span>' +
        '<span class="count">' + Object.keys(p.marks).length + ' frame</span>' +
        '<button class="del" title="Elimina" aria-label="Elimina">×</button>';
      ul.appendChild(li);
    }
  }

  function toggleMoto(force) {
    S.moto = force == null ? !S.moto : force;
    els.btnMoto.classList.toggle('active', S.moto);
    els.btnMoto.textContent = S.moto ? 'Stop' : 'Moto';
    if (S.moto) {
      setMode('track');
      if (!activeParticle()) addParticle();
      activateTab('track');
      if (S.frame < S.range.start || S.frame > S.range.end) setFrame(S.range.start, true);
      toast('Moto: clicca il corpo, il frame avanza da solo');
    }
  }

  async function runAutoTrack() {
    if (!S.video.loaded) { toast('Apri prima un video'); return; }
    if (S.synth && S.synth.active) {
      toast('Il tracciamento automatico è per i video: la simulazione ha già i punti');
      return;
    }
    if (S.busy) return;
    const part = activeParticle() || addParticle();
    let seedFrame = null, seed = null;
    for (let f = S.range.start; f <= S.range.end; f++) {
      if (part.marks[f]) { seedFrame = f; seed = part.marks[f]; break; }
    }
    if (!seed) {
      if (S.frame < S.range.start || S.frame > S.range.end) setFrame(S.range.start, true);
      toast('Sposta il cursore su un frame in cui il corpo è visibile, cliccalo, poi premi Auto traccia');
      return;
    }
    pause();
    S.cancel = false;
    showBusy('Tracciamento automatico…');
    const from = seedFrame;
    const marks = await Vision.autoTrack(els.video, {
      fps: S.fps, startFrame: from, endFrame: S.range.end, seed,
      delayMs: S.autoSlowdown,
    }, p => setBusy(p), (f, pt) => {
      part.marks[f] = pt;
      S.frame = f;
      drawOverlay();
      updateTransport();
      highlightRows();
    }, () => S.cancel);
    hideBusy();
    renderParticleList();
    updateAnalysis();
    setFrame(from, true);
    scheduleAutosave();
    toast(S.cancel ? 'Tracciamento annullato' : 'Tracciamento completato');
  }

  /* --------------------------------------------------------- pointer */
  function eventToVideo(e) {
    const rect = els.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * S.video.width;
    const y = (e.clientY - rect.top) / rect.height * S.video.height;
    return { x: clamp(x, 0, S.video.width), y: clamp(y, 0, S.video.height) };
  }

  function ppc() {
    const rect = els.canvas.getBoundingClientRect();
    return rect.width ? S.video.width / rect.width : 1;
  }

  function nearestMark(p, maxDist) {
    let best = null, bestD = maxDist;
    for (const part of S.particles) {
      const m = markPixel(part, S.frame);
      if (!m) continue;
      const d = Math.hypot(m.x - p.x, m.y - p.y);
      if (d <= bestD) { best = { particle: part, mark: m }; bestD = d; }
    }
    return best;
  }

  function onPointerDown(e) {
    if (!S.video.loaded || S.busy) return;
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    const p = eventToVideo(e);

    if (S.mode === 'calib') { handleCalibClick(p); return; }

    if (S.mode === 'axes') {
      const hasOrigin = S.axes.x != null && S.axes.y != null;
      const nearOrigin = hasOrigin && Math.hypot(p.x - S.axes.x, p.y - S.axes.y) <= 18 * ppc();
      let nearAxis = false;
      if (hasOrigin) {
        const c = Math.cos(S.axes.theta || 0), s = Math.sin(S.axes.theta || 0);
        const dx = p.x - S.axes.x, dy = p.y - S.axes.y;
        const distX = Math.abs(-dx * s + dy * c);
        const distY = Math.abs(dx * c + dy * s);
        nearAxis = distX <= 14 * ppc() || distY <= 14 * ppc();
      }
      if (!nearOrigin && !nearAxis) {
        S.axes.x = clamp(Math.round(p.x), 0, S.video.width - 1);
        S.axes.y = clamp(Math.round(p.y), 0, S.video.height - 1);
        syncAxesFields();
      }
      S.axesDrag = { pointerId: e.pointerId, ox: S.axes.x, oy: S.axes.y };
      drawOverlay();
      return;
    }

    let part = activeParticle();
    if (!part) part = addParticle();

    if (S.moto) {
      part.marks[S.frame] = { x: p.x, y: p.y };
      renderParticleList();
      drawOverlay();
      updateAnalysis();
      scheduleAutosave();
      if (S.frame < S.range.end) setFrame(S.frame + 1, true);
      else { toast('Fine intervallo'); toggleMoto(false); }
      return;
    }

    const hit = nearestMark(p, 16 * ppc());
    let added = false;
    if (hit) {
      S.activeId = hit.particle.id;
      S.drag = { id: hit.particle.id, pointerId: e.pointerId };
      renderParticleList();
    } else {
      part.marks[S.frame] = { x: p.x, y: p.y };
      added = true;
      renderParticleList();
    }
    drawOverlay();
    updateAnalysis();
    scheduleAutosave();
    if (added && S.autoAdvance) {
      if (S.frame < S.range.end) setFrame(S.frame + 1, true);
      else toast('Fine intervallo: punto salvato nell\'ultimo frame');
    }
  }

  function onPointerMove(e) {
    if (S.rangeDrag) { applyRangeDrag(e.clientX); return; }

    if (S.axesDrag) {
      const p = eventToVideo(e);
      const dx = p.x - S.axesDrag.ox;
      const dy = p.y - S.axesDrag.oy;
      if (Math.hypot(dx, dy) > 3) {
        S.axes.theta = Math.atan2(dy, dx);
        syncAxesFields();
        drawOverlay();
      }
      return;
    }

    if (!S.drag) return;
    if (e.pointerId != null && S.drag.pointerId != null && e.pointerId !== S.drag.pointerId) return;
    const part = S.particles.find(p => p.id === S.drag.id);
    if (!part) return;
    const p = eventToVideo(e);
    part.marks[S.frame] = { x: p.x, y: p.y };
    drawOverlay();
  }

  function onPointerUp(e) {
    if (S.rangeDrag) {
      S.rangeDrag = null;
      updateAnalysis();
      if (S.frame < S.range.start || S.frame > S.range.end) setFrame(S.range.start, true);
      scheduleAutosave();
      return;
    }
    if (S.axesDrag) {
      S.axesDrag = null;
      updateAnalysis();
      scheduleAutosave();
      return;
    }
    if (!S.drag) return;
    void e;
    S.drag = null;
    updateAnalysis();
    renderParticleList();
    scheduleAutosave();
  }

  /* ----------------------------------------------------------- series */
  function toWorld(px, py) {
    if (!S.calib.scale || S.axes.x == null) return null;
    const dx = px - S.axes.x;
    const dy = py - S.axes.y;
    const cos = Math.cos(S.axes.theta);
    const sin = Math.sin(S.axes.theta);
    const rx = dx * cos + dy * sin;
    const ry = -dx * sin + dy * cos;
    return { x: rx * S.calib.scale, y: -ry * S.calib.scale };
  }

  function worldToPixel(wx, wy) {
    if (!S.calib.scale || S.axes.x == null) return null;
    const rx = wx / S.calib.scale;
    const ry = -wy / S.calib.scale;
    const cos = Math.cos(S.axes.theta);
    const sin = Math.sin(S.axes.theta);
    const dx = rx * cos - ry * sin;
    const dy = rx * sin + ry * cos;
    return { x: S.axes.x + dx, y: S.axes.y + dy };
  }

  function currentViewCfg() {
    if (!(S.synth && S.synth.active)) return { type: 'lab' };
    const view = S.synth.view || 'primary';
    if (view === 'secondary' && S.synth.ref2) return S.synth.ref2;
    if (view === 'lab') return { type: 'lab' };
    return S.synth.frame || { type: 'lab' };
  }

  function simViewCfgFor(view, frameCfg, ref2) {
    if (view === 'secondary') return ref2 || { type: 'lab' };
    if (view === 'lab') return { type: 'lab' };
    return frameCfg || { type: 'lab' };
  }

  function simLocalPoints(body, fps, n) {
    if (Array.isArray(body.localPts) && body.localPts.length === n) return body.localPts;
    return simPoints(body.type, body.params, n, fps);
  }

  function simShownPoints(bodies, fps, n, frameCfg, ref2, view) {
    const viewCfg = simViewCfgFor(view, frameCfg, ref2);
    return bodies.map(body => {
      const local = simLocalPoints(body, fps, n);
      return local.map((q, f) => {
        const t = f / fps;
        const lab = body.frame === 'secondary'
          ? frameToLab(q, t, ref2)
          : frameToLab(q, t, frameCfg);
        return labToFrame(lab, t, viewCfg);
      });
    });
  }

  function simGeometry(bodies, fps, n, frameCfg, ref2, view, W, H, margin) {
    W = W || 960;
    H = H || 540;
    margin = margin || 64;
    const viewCfg = simViewCfgFor(view, frameCfg, ref2);
    const shown = simShownPoints(bodies, fps, n, frameCfg, ref2, view);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const pts of shown) {
      for (const q of pts) {
        if (q.x < minX) minX = q.x;
        if (q.x > maxX) maxX = q.x;
        if (q.y < minY) minY = q.y;
        if (q.y > maxY) maxY = q.y;
      }
    }
    if (!isFinite(minX)) { minX = maxX = minY = maxY = 0; }
    const exMinX = Math.min(0, minX), exMaxX = Math.max(0, maxX);
    const exMinY = Math.min(0, minY), exMaxY = Math.max(0, maxY);
    const spanX = exMaxX - exMinX, spanY = exMaxY - exMinY;

    let ppm;
    if (spanX < 1e-6 && spanY < 1e-6) ppm = 100;
    else if (spanX < 1e-6) ppm = (H - 2 * margin) / spanY;
    else if (spanY < 1e-6) ppm = (W - 2 * margin) / spanX;
    else ppm = Math.min((W - 2 * margin) / spanX, (H - 2 * margin) / spanY);
    if (!isFinite(ppm) || ppm <= 0) ppm = 100;

    let ox = spanX < 1e-6 ? W / 2 : margin - exMinX * ppm;
    let oy = spanY < 1e-6 ? H / 2 : H - margin + exMinY * ppm;
    ox = Math.round(clamp(ox, 0, W - 1));
    oy = Math.round(clamp(oy, 0, H - 1));

    return { shown, ppm, ox, oy, view, viewCfg, W, H, margin };
  }

  function mulberry32(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randnRng(rng) {
    let u = 0, v = 0;
    while (!u) u = rng();
    while (!v) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function simParticlesFromGeometry(geo, bodies, reuse) {
    const old = reuse ? S.particles : [];
    return bodies.map((b, i) => {
      const prev = old[i];
      const seed = b.seed == null ? ((i + 1) * 0x9e3779b9) : b.seed;
      const rng = mulberry32(seed);
      const noise = Math.max(0, Number(b.noise) || 0);
      const marks = {};
      geo.shown[i].forEach((q, f) => {
        const nx = noise ? randnRng(rng) * noise : 0;
        const ny = noise ? randnRng(rng) * noise : 0;
        marks[f] = { x: geo.ox + q.x * geo.ppm + nx, y: geo.oy - q.y * geo.ppm + ny };
      });
      return {
        id: prev && prev.id ? prev.id : 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: prev ? prev.name : 'P' + (i + 1),
        color: prev ? prev.color : PALETTE[i % PALETTE.length],
        marks,
        bodyR: b.bodyR,
        simType: b.type,
      };
    });
  }

  function simCalibFromGeometry(geo) {
    const barPx = Math.max(8, Math.min(geo.ppm, geo.W - 2 * geo.margin));
    return {
      p1: { x: geo.margin, y: geo.H - 26 },
      p2: { x: geo.margin + barPx, y: geo.H - 26 },
      length: Number((barPx / geo.ppm).toFixed(4)),
      scale: 1 / geo.ppm,
    };
  }

  function applySimulationView() {
    if (!(S.synth && S.synth.active)) return;
    const view = S.simView || 'primary';
    const bodies = S.synth.bodies || [];
    if (!bodies.length || !bodies.every(b => b && b.params && b.type)) {
      const current = S.synth.view || 'primary';
      S.simView = current;
      if (els.simViewFrame) els.simViewFrame.value = current;
      toast('Rigenera la simulazione per cambiare vista');
      return;
    }
    if (view === 'secondary' && !S.synth.ref2) {
      const current = S.synth.view === 'secondary' ? 'primary' : (S.synth.view || 'primary');
      toast('Questa simulazione non include il secondo sistema di riferimento');
      S.simView = current;
      if (els.simViewFrame) els.simViewFrame.value = current;
      return;
    }

    const n = Math.max(2, S.synth.frames || S.totalFrames);
    const f0 = S.frame;
    const geo = simGeometry(bodies, S.fps, n, S.synth.frame, S.synth.ref2, view,
      S.synth.width, S.synth.height);
    S.synth.view = view;
    S.synth.ppm = geo.ppm;
    S.axes = { x: geo.ox, y: geo.oy, theta: 0 };
    S.calib = simCalibFromGeometry(geo);
    const activeOld = S.activeId;
    const parts = simParticlesFromGeometry(geo, bodies, true);
    S.particles = parts;
    S.activeId = parts.some(p => p.id === activeOld) ? activeOld : (parts[0] ? parts[0].id : null);
    S.frame = clamp(f0, 0, Math.max(0, S.totalFrames - 1));

    renderParticleList();
    syncAxesFields();
    updateCalibStatus();
    updateRangeDom();
    setFrame(S.frame, false);
    updateAnalysis();
    scheduleAutosave();
    const label = view === 'secondary' ? 'secondo sistema (S2)'
      : view === 'lab' ? 'laboratorio (fisso)' : 'sistema principale (S1)';
    els.simStatus.textContent = 'Vista: ' + label + ' · ' + round2(geo.ppm) + ' px/m · ' +
      parts.length + ' corpo' + (parts.length > 1 ? 'i' : '');
    toast('Moto visualizzato nel ' + label);
  }

  function editedMark(p, f) {
    const e = p && p.edits && p.edits[f];
    if (!e || (e.x == null && e.y == null)) return null;
    const m = p.marks[f];
    let wx = e.x, wy = e.y;
    if (m && S.calib.scale) {
      const w = toWorld(m.x, m.y);
      if (w) {
        if (wx == null) wx = w.x;
        if (wy == null) wy = w.y;
      }
    }
    if (wx == null || wy == null) return null;
    return worldToPixel(wx, wy);
  }

  function markPixel(p, f) {
    const e = editedMark(p, f);
    return e || p.marks[f] || null;
  }

  function particleSeries(p) {
    if (!p) return [];
    const frames = Object.keys(p.marks)
      .map(Number)
      .filter(f => isFinite(f) && f >= S.range.start && f <= S.range.end)
      .sort((a, b) => a - b);
    const rows = frames.map(f => {
      const m = p.marks[f];
      const w = toWorld(m.x, m.y);
      const row = {
        f, t: f / S.fps, x: w ? w.x : null, y: w ? w.y : null,
        vx: null, vy: null, speed: null, ke: null, pe: null, te: null,
      };
      const ed = p.edits && p.edits[f];
      if (ed) {
        if (ed.x != null) row.x = ed.x;
        if (ed.y != null) row.y = ed.y;
      }
      return row;
    });
    for (let i = 0; i < rows.length; i++) {
      const cur = rows[i], prev = rows[i - 1], next = rows[i + 1];
      if (cur.x == null) continue;
      if (prev && next && prev.x != null && next.x != null && next.t !== prev.t) {
        cur.vx = (next.x - prev.x) / (next.t - prev.t);
        cur.vy = (next.y - prev.y) / (next.t - prev.t);
      } else if (next && next.x != null && next.t !== cur.t) {
        cur.vx = (next.x - cur.x) / (next.t - cur.t);
        cur.vy = (next.y - cur.y) / (next.t - cur.t);
      } else if (prev && prev.x != null && cur.t !== prev.t) {
        cur.vx = (cur.x - prev.x) / (cur.t - prev.t);
        cur.vy = (cur.y - prev.y) / (cur.t - prev.t);
      }
      cur.speed = (cur.vx != null && cur.vy != null) ? Math.hypot(cur.vx, cur.vy) : null;
      const ve = p.velEdits && p.velEdits[cur.f];
      if (ve) {
        if (ve.vx != null) cur.vx = ve.vx;
        if (ve.vy != null) cur.vy = ve.vy;
        if (cur.vx != null || cur.vy != null) cur.speed = Math.hypot(cur.vx || 0, cur.vy || 0);
      }
    }
    applyEnergies(rows, p);
    return rows;
  }

  function isHarmonicSynth() {
    return !!(S.synth && S.synth.active && S.synth.type === 'harmonic');
  }

  function applyEnergies(rows, p) {
    const m = S.mass > 0 ? S.mass : 0;
    const g = S.gravity;
    const synth = (S.synth && S.synth.active) ? S.synth : null;
    const frame = currentViewCfg();
    const harmonic = isHarmonicSynth();
    const period = harmonic ? Math.max(0.05, Math.abs(Number(synth.params.period) || 2)) : 0;
    const omegaS = harmonic ? 2 * Math.PI / period : 0;
    const x0 = harmonic ? (Number(synth.params.x0) || 0) : 0;
    const y0 = harmonic ? (Number(synth.params.y0) || 0) : 0;

    for (const r of rows) {
      if (r.x == null || r.y == null || r.speed == null) {
        r.ke = r.pe = r.te = null;
        continue;
      }
      r.ke = 0.5 * m * r.speed * r.speed;
      if (harmonic) {
        const eq = labToFrame({ x: x0, y: y0 }, r.t, frame);
        const phi = frameAngle(r.t, frame);
        const dx = r.x - eq.x, dy = r.y - eq.y;
        const dxLab = dx * Math.cos(phi) - dy * Math.sin(phi);
        r.pe = 0.5 * m * omegaS * omegaS * dxLab * dxLab;
      } else {
        const lab = frameToLab({ x: r.x, y: r.y }, r.t, frame);
        r.pe = m * g * lab.y;
      }
      r.te = r.ke + r.pe;
      const ee = p && p.enEdits && p.enEdits[r.f];
      if (ee) {
        if (ee.ke != null) r.ke = ee.ke;
        if (ee.pe != null) r.pe = ee.pe;
        if (r.ke != null && r.pe != null) r.te = r.ke + r.pe;
      }
    }
  }

  function energyModelLabel() {
    return isHarmonicSynth() ? 'elastica' : 'gravitazionale';
  }

  function energyHintText() {
    if (!S.calib.scale) return 'Calibra per ottenere valori di energia in joule.';
    let t = isHarmonicSynth()
      ? 'Potenziale elastica: PE = ½ k (x − x_eq)², con k = m ω². L\'energia totale è KE + PE.'
      : 'Potenziale gravitazionale: PE = m g h, con h = y nel sistema del laboratorio e zero sull\'asse x tracciato.';
    const view = currentViewCfg();
    if (S.synth && S.synth.active && (view.type === 'accel' || view.type === 'rotating')) {
      t += ' Sistema non inerziale: l\'energia meccanica può non conservarsi per le forze apparenti.';
    }
    return t;
  }

  function onEnergyParams() {
    const m = parseFloat(String(els.mass.value).replace(',', '.'));
    const g = parseFloat(String(els.gravity.value).replace(',', '.'));
    if (isFinite(m) && m > 0) S.mass = m;
    if (isFinite(g)) S.gravity = g;
    els.mass.value = String(round2(S.mass));
    els.gravity.value = String(round2(S.gravity));
    updateAnalysis();
    scheduleAutosave();
  }

  /* --------------------------------------------------------- editable data */
  function editCell(p, f, field, value, decimals, editable, table) {
    const bucket = table === 'vt' ? p.velEdits : table === 'en' ? p.enEdits : p.edits;
    const edited = !!(bucket && bucket[f] && bucket[f][field] != null);
    const cls = 'edit-cell' + (editable ? '' : ' read-only') + (edited ? ' edited' : '');
    const text = fmt(value, decimals);
    if (!editable) return '<td class="' + cls + '">' + text + '</td>';
    return '<td class="' + cls + '" contenteditable="true" spellcheck="false" inputmode="decimal" ' +
      'data-frame="' + f + '" data-field="' + field + '" data-table="' + table + '">' + text + '</td>';
  }

  function bindEditableTables() {
    const bodies = [els.tableSTBody, els.tableVTBody, els.tableENBody];
    for (const body of bodies) {
      if (!body) continue;
      body.addEventListener('focusin', e => {
        const cell = e.target.closest('.edit-cell[contenteditable="true"]');
        if (!cell) return;
        cell.dataset.original = cell.textContent;
        const range = document.createRange();
        range.selectNodeContents(cell);
        const sel = window.getSelection();
        if (sel) { sel.removeAllRanges(); sel.addRange(range); }
      });
      body.addEventListener('keydown', e => {
        const cell = e.target.closest('.edit-cell[contenteditable="true"]');
        if (!cell) return;
        if (e.key === 'Enter') { e.preventDefault(); cell.blur(); }
        else if (e.key === 'Escape') {
          e.preventDefault();
          if (cell.dataset.original != null) cell.textContent = cell.dataset.original;
          cell.blur();
        }
      });
      body.addEventListener('focusout', e => {
        const cell = e.target.closest('.edit-cell[contenteditable="true"]');
        if (cell) commitEditableCell(cell);
      });
    }
  }

  function commitEditableCell(cell) {
    const p = activeParticle();
    if (!p) return;
    const f = Number(cell.dataset.frame);
    const field = cell.dataset.field;
    const table = cell.dataset.table;
    const raw = String(cell.textContent).replace(',', '.').trim();
    const v = parseFloat(raw);
    if (!isFinite(f) || !field || !isFinite(v)) { updateAnalysis(); return; }
    if (table === 'st') {
      p.edits = p.edits || {};
      p.edits[f] = p.edits[f] || {};
      p.edits[f][field] = v;
    } else if (table === 'vt') {
      p.velEdits = p.velEdits || {};
      p.velEdits[f] = p.velEdits[f] || {};
      p.velEdits[f][field] = v;
    } else if (table === 'en') {
      p.enEdits = p.enEdits || {};
      p.enEdits[f] = p.enEdits[f] || {};
      p.enEdits[f][field] = v;
    } else return;
    updateAnalysis();
    drawOverlay();
    scheduleAutosave();
    toast('Valore aggiornato (frame ' + f + ')');
  }

  function resetTableEdits(which) {
    const p = activeParticle();
    if (!p) { toast('Nessun punto attivo'); return; }
    if (which === 'st') p.edits = {};
    else if (which === 'vt') p.velEdits = {};
    else if (which === 'en') p.enEdits = {};
    updateAnalysis();
    drawOverlay();
    scheduleAutosave();
    toast('Valori originali ripristinati');
  }

  function clearPositionEdit(p, f) {
    if (p && p.edits) delete p.edits[f];
  }

  /* --------------------------------------------------------- analysis */
  function updateAnalysis() {
    const p = activeParticle();
    els.dataName.textContent = p ? 'Punto attivo: ' + p.name : 'Nessun punto';
    const rows = particleSeries(p);
    if (S.video.loaded) {
      const ta = S.range.start / S.fps, tb = S.range.end / S.fps;
      els.timingInfo.textContent = 'FPS ' + round2(S.fps) + ' · 1 frame = ' + (1 / S.fps).toFixed(3) +
        ' s · intervallo ' + ta.toFixed(2) + '–' + tb.toFixed(2) + ' s (frame ' +
        S.range.start + '–' + S.range.end + ')';
    } else {
      els.timingInfo.textContent = 'Nessun video o simulazione caricati.';
    }

    if (!S.calib.scale) {
      els.analysisHint.textContent = 'Calibra il video (bordo + misura) per ottenere valori in metri.';
    } else if (!p) {
      els.analysisHint.textContent = 'Aggiungi un punto e traccialo per vedere i grafici.';
    } else if (!rows.length) {
      els.analysisHint.textContent = 'Nessun punto tracciato nell\'intervallo selezionato.';
    } else {
      els.analysisHint.textContent = 'Punto ' + p.name + ' · ' + rows.length + ' frame nell\'intervallo ' +
        S.range.start + '–' + S.range.end + '.';
    }

    let stHtml = '';
    let vtHtml = '';
    let enHtml = '';
    const canEditPos = !!(S.calib && S.calib.scale);
    for (const r of rows) {
      const cls = r.f === S.frame ? ' class="current"' : '';
      stHtml += '<tr data-frame="' + r.f + '"' + cls + '><td>' + r.f + '</td><td>' + r.t.toFixed(3) + '</td>' +
        editCell(p, r.f, 'x', r.x, 3, canEditPos && r.x != null, 'st') +
        editCell(p, r.f, 'y', r.y, 3, canEditPos && r.y != null, 'st') + '</tr>';
      vtHtml += '<tr data-frame="' + r.f + '"' + cls + '><td>' + r.f + '</td><td>' + r.t.toFixed(3) + '</td>' +
        editCell(p, r.f, 'vx', r.vx, 2, canEditPos && r.vx != null, 'vt') +
        editCell(p, r.f, 'vy', r.vy, 2, canEditPos && r.vy != null, 'vt') +
        '<td>' + fmt(r.speed, 2) + '</td></tr>';
      enHtml += '<tr data-frame="' + r.f + '"' + cls + '><td>' + r.f + '</td><td>' + r.t.toFixed(3) + '</td>' +
        editCell(p, r.f, 'ke', r.ke, 2, canEditPos && r.ke != null, 'en') +
        editCell(p, r.f, 'pe', r.pe, 2, canEditPos && r.pe != null, 'en') +
        '<td>' + fmt(r.te, 2) + '</td></tr>';
    }
    if (!rows.length) {
      const msg = '<tr><td colspan="4" class="muted">Nessun dato</td></tr>';
      els.tableSTBody.innerHTML = msg;
      els.tableVTBody.innerHTML = '<tr><td colspan="5" class="muted">Nessun dato</td></tr>';
      els.tableENBody.innerHTML = '<tr><td colspan="5" class="muted">Nessun dato</td></tr>';
    } else {
      els.tableSTBody.innerHTML = stHtml;
      els.tableVTBody.innerHTML = vtHtml;
      els.tableENBody.innerHTML = enHtml;
    }

    const tDomain = S.video.loaded ? [S.range.start / S.fps, S.range.end / S.fps] : null;

    drawChart(els.graphST, [
      { key: 'x', color: VARCOLORS.x, pts: rows.filter(r => r.x != null).map(r => ({ t: r.t, v: r.x })) },
      { key: 'y', color: VARCOLORS.y, pts: rows.filter(r => r.y != null).map(r => ({ t: r.t, v: r.y })) },
    ], { swap: S.stSwap, tDomain, yLabel: 'posizione (m)', interpolate: S.interpolate });

    drawChart(els.graphVT, [
      { key: 'vx', color: VARCOLORS.vx, pts: rows.filter(r => r.vx != null).map(r => ({ t: r.t, v: r.vx })) },
      { key: 'vy', color: VARCOLORS.vy, pts: rows.filter(r => r.vy != null).map(r => ({ t: r.t, v: r.vy })) },
      { key: '|v|', color: VARCOLORS.speed, pts: rows.filter(r => r.speed != null).map(r => ({ t: r.t, v: r.speed })) },
    ], { tDomain, yLabel: 'velocità (m/s)', interpolate: S.interpolate });

    drawChart(els.graphEN, [
      { key: 'KE', color: VARCOLORS.ke, pts: rows.filter(r => r.ke != null).map(r => ({ t: r.t, v: r.ke })) },
      { key: 'PE', color: VARCOLORS.pe, pts: rows.filter(r => r.pe != null).map(r => ({ t: r.t, v: r.pe })) },
      { key: 'E', color: VARCOLORS.te, pts: rows.filter(r => r.te != null).map(r => ({ t: r.t, v: r.te })) },
    ], { tDomain, yLabel: 'energia (J)', interpolate: S.interpolate });

    els.energyHint.textContent = energyHintText() + ' Modello: ' + energyModelLabel() + '.';
  }

  function highlightRows() {
    $$('#tableST tbody tr, #tableVT tbody tr, #tableEN tbody tr').forEach(tr => {
      tr.classList.toggle('current', Number(tr.dataset.frame) === S.frame);
    });
  }

  function smoothChartPoints(pts, radius) {
    if (pts.length < 5) return pts;
    const r = Math.max(1, radius || 2);
    return pts.map((p, i) => {
      let sum = 0, weight = 0;
      for (let j = -r; j <= r; j++) {
        const k = i + j;
        if (k < 0 || k >= pts.length) continue;
        const w = r + 1 - Math.abs(j);
        sum += pts[k].v * w;
        weight += w;
      }
      return { t: p.t, v: weight ? sum / weight : p.v };
    });
  }

  function drawChart(cv, series, opts) {
    if (!cv) return;
    const swap = !!(opts && opts.swap);
    const tDomain = opts && opts.tDomain;
    const yLabel = (opts && opts.yLabel) || 'valore';
    const interpolate = !!(opts && opts.interpolate);
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0b0e13';
    ctx.fillRect(0, 0, W, H);

    const clean = series.map(s => ({ key: s.key, color: s.color, pts: s.pts.filter(p => p.v != null && isFinite(p.v)) }))
      .filter(s => s.pts.length);
    const padL = 50, padR = 16, padT = 38, padB = 32;

    if (!clean.length) {
      ctx.fillStyle = '#7f8a9c';
      ctx.font = '13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Nessun dato nell\'intervallo', W / 2, H / 2);
      return;
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const s of clean) {
      for (const p of s.pts) {
        const xv = swap ? p.v : p.t;
        const yv = swap ? p.t : p.v;
        if (xv < minX) minX = xv;
        if (xv > maxX) maxX = xv;
        if (yv < minY) minY = yv;
        if (yv > maxY) maxY = yv;
      }
    }
    if (tDomain && isFinite(tDomain[0]) && isFinite(tDomain[1]) && tDomain[1] > tDomain[0]) {
      if (swap) { minY = tDomain[0]; maxY = tDomain[1]; }
      else { minX = tDomain[0]; maxX = tDomain[1]; }
    }
    if (minX === maxX) { minX -= 0.5; maxX += 0.5; }
    if (minY === maxY) { minY -= 1; maxY += 1; }
    const padX = swap ? (maxX - minX) * 0.04 : 0;
    const padY = swap ? 0 : (maxY - minY) * 0.08;
    minX -= padX; maxX += padX;
    minY -= padY; maxY += padY;

    const X = v => padL + (v - minX) / (maxX - minX) * (W - padL - padR);
    const Y = v => H - padB - (v - minY) / (maxY - minY) * (H - padT - padB);

    ctx.strokeStyle = '#1c2431';
    ctx.fillStyle = '#7f8a9c';
    ctx.lineWidth = 1;
    ctx.font = '11px system-ui, sans-serif';

    const nx = 5, ny = 4;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i <= nx; i++) {
      const v = minX + (maxX - minX) * i / nx;
      const x = X(v);
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, H - padB); ctx.stroke();
      ctx.fillText(v.toFixed(2), x, H - padB + 6);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let j = 0; j <= ny; j++) {
      const v = minY + (maxY - minY) * j / ny;
      const y = Y(v);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      ctx.fillText(v.toFixed(2), padL - 6, y);
    }

    if (minY < 0 && maxY > 0) {
      ctx.strokeStyle = '#3a475a';
      ctx.beginPath(); ctx.moveTo(padL, Y(0)); ctx.lineTo(W - padR, Y(0)); ctx.stroke();
    }
    ctx.strokeStyle = '#2a3342';
    ctx.strokeRect(padL, padT, W - padL - padR, H - padT - padB);

    for (const s of clean) {
      const raw = s.pts.slice().sort((a, b) => a.t - b.t);
      const pts = interpolate ? smoothChartPoints(raw, 2) : raw;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const xy = pts.map(p => [X(swap ? p.v : p.t), Y(swap ? p.t : p.v)]);
      if (interpolate && xy.length > 2) {
        ctx.moveTo(xy[0][0], xy[0][1]);
        for (let i = 0; i < xy.length - 1; i++) {
          const p0 = xy[i - 1] || xy[i];
          const p1 = xy[i];
          const p2 = xy[i + 1];
          const p3 = xy[i + 2] || p2;
          const c1x = p1[0] + (p2[0] - p0[0]) / 6;
          const c1y = p1[1] + (p2[1] - p0[1]) / 6;
          const c2x = p2[0] - (p3[0] - p1[0]) / 6;
          const c2y = p2[1] - (p3[1] - p1[1]) / 6;
          ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2[0], p2[1]);
        }
      } else {
        xy.forEach((q, i) => { if (i === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); });
      }
      ctx.stroke();
      ctx.fillStyle = s.color;
      for (let i = 0; i < pts.length; i++) {
        ctx.beginPath();
        ctx.arc(xy[i][0], xy[i][1], interpolate ? 1.6 : 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let lx = padL + 6;
    for (const s of clean) {
      ctx.fillStyle = s.color;
      ctx.fillRect(lx, padT - 26, 10, 10);
      ctx.fillStyle = '#c9d3e0';
      ctx.fillText(s.key, lx + 14, padT - 21);
      lx += 14 + ctx.measureText(s.key).width + 16;
    }

    ctx.fillStyle = '#7f8a9c';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(swap ? yLabel : 't (s)', W - padR, H - 4);
    ctx.save();
    ctx.translate(13, (padT + H - padB) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(swap ? 't (s)' : yLabel, 0, 0);
    ctx.restore();
  }

  /* ------------------------------------------------------------ drawing */
  function drawOverlay() {
    if (!S.video.loaded || !S.canvas.width) return;
    const ctx = S.ctx;
    const W = S.canvas.width, H = S.canvas.height;
    const k = ppc();
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (S.synth && S.synth.active) drawScene(ctx);
    if (S.showTrail) drawTrails(ctx, k);
    if (S.showAxes && S.axes.x != null) drawAxes(ctx, k);
    if (S.synth && S.synth.active && S.showLabAxes) drawLabAxes(ctx, k);
    if (S.synth && S.synth.active) drawSecondFrameAxes(ctx, k);
    drawCalib(ctx, k);
    drawMarks(ctx, k);
  }

  function niceStep(raw) {
    if (!isFinite(raw) || raw <= 0) return 1;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / pow;
    const mult = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return mult * pow;
  }

  function drawScene(ctx) {
    const W = S.canvas.width, H = S.canvas.height;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#101c26');
    grad.addColorStop(1, '#0a1016');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const ppm = S.synth.ppm;
    const ox = S.axes.x == null ? W / 2 : S.axes.x;
    const oy = S.axes.y == null ? H / 2 : S.axes.y;
    const step = niceStep(70 / ppm);

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(120,160,200,.10)';
    const wx0 = (0 - ox) / ppm, wx1 = (W - ox) / ppm;
    for (let x = Math.ceil(wx0 / step) * step; x <= wx1; x += step) {
      const px = ox + x * ppm;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
    }
    const wy0 = (oy - H) / ppm, wy1 = oy / ppm;
    for (let y = Math.ceil(wy0 / step) * step; y <= wy1; y += step) {
      const py = oy - y * ppm;
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke();
    }

    for (const p of S.particles) {
      const frames = Object.keys(p.marks).map(Number).filter(f => isFinite(f)).sort((a, b) => a - b);
      if (frames.length > 1) {
        ctx.strokeStyle = hexA(p.color, 0.26);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        frames.forEach((f, i) => {
          const m = markPixel(p, f);
          if (!m) return;
          if (i === 0) ctx.moveTo(m.x, m.y); else ctx.lineTo(m.x, m.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }
      const m = markPixel(p, S.frame);
      if (m) {
        const r = p.bodyR || S.synth.bodyR;
        ctx.fillStyle = 'rgba(0,0,0,.45)';
        ctx.beginPath();
        ctx.ellipse(m.x + r * 0.25, m.y + r * 0.62, r * 1.05, r * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath(); ctx.arc(m.x - r * 0.3, m.y - r * 0.3, r * 0.28, 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(205,225,245,.9)';
    ctx.font = '600 15px system-ui, sans-serif';
    const nBodies = S.particles.length || 1;
    ctx.fillText('SIM · ' + (SIM_META[S.synth.type] || 'moto') + (nBodies > 1 ? ' · ' + nBodies + ' corpi' : ''), 14, 12);
    ctx.fillStyle = 'rgba(150,175,195,.75)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(round2(ppm) + ' px/m · origine ' + Math.round(ox) + ', ' + Math.round(oy), 14, 34);
  }

  function drawTrails(ctx, k) {
    for (const p of S.particles) {
      const frames = Object.keys(p.marks).map(Number).filter(f => isFinite(f) && f <= S.frame).sort((a, b) => a - b);
      if (frames.length < 2) continue;
      ctx.beginPath();
      frames.forEach((f, i) => {
        const m = markPixel(p, f);
        if (!m) return;
        if (i === 0) ctx.moveTo(m.x, m.y); else ctx.lineTo(m.x, m.y);
      });
      ctx.strokeStyle = hexA(p.color, 0.45);
      ctx.lineWidth = 2 * k;
      ctx.stroke();
    }
  }

  function drawAxes(ctx, k) {
    const len = Math.max(S.canvas.width, S.canvas.height) * 1.5;
    const c = Math.cos(S.axes.theta), s = Math.sin(S.axes.theta);
    const ox = S.axes.x, oy = S.axes.y;

    ctx.lineWidth = 1.5 * k;
    ctx.strokeStyle = hexA('#3ddc97', 0.9);
    ctx.beginPath();
    ctx.moveTo(ox - c * len, oy - s * len);
    ctx.lineTo(ox + c * len, oy + s * len);
    ctx.stroke();

    ctx.strokeStyle = hexA('#ff6b6b', 0.75);
    ctx.beginPath();
    ctx.moveTo(ox + s * len, oy - c * len);
    ctx.lineTo(ox - s * len, oy + c * len);
    ctx.stroke();

    const fs = 12 * k;
    ctx.font = '600 ' + fs + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#3ddc97';
    ctx.fillText('+X', ox + c * 48 * k, oy + s * 48 * k);
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText('+Y', ox + s * 48 * k, oy - c * 48 * k);

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ox, oy, 3.5 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3ddc97';
    ctx.lineWidth = 1.5 * k;
    ctx.beginPath();
    ctx.arc(ox + c * 60 * k, oy + s * 60 * k, 5 * k, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawLabAxes(ctx, k) {
    const f = currentViewCfg();
    if (!f || f.type === 'lab') return;
    const W = S.canvas.width, H = S.canvas.height;
    const t = S.frame / S.fps;
    const o = labToFrame({ x: 0, y: 0 }, t, f);
    const ox = S.axes.x == null ? W / 2 : S.axes.x;
    const oy = S.axes.y == null ? H / 2 : S.axes.y;
    const ppm = S.synth.ppm;
    const px = ox + o.x * ppm;
    const py = oy - o.y * ppm;
    const phi = frameAngle(t, f);
    const dx = Math.cos(phi), dy = -Math.sin(phi);
    const ux = Math.sin(phi), uy = Math.cos(phi);
    const len = Math.max(W, H) * 0.7;
    const sx = (vx, vy) => [px + vx * len, py - vy * len];

    ctx.save();
    ctx.setLineDash([9 * k, 7 * k]);
    ctx.lineWidth = 1.4 * k;

    let a = sx(dx, dy), b = sx(-dx, -dy);
    ctx.strokeStyle = hexA('#7fd3ff', 0.8);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();

    a = sx(ux, uy); b = sx(-ux, -uy);
    ctx.strokeStyle = hexA('#ffb86b', 0.75);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = '600 ' + (11 * k) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#7fd3ff';
    ctx.fillText('X lab', px + dx * 52 * k, py - dy * 52 * k);
    ctx.fillStyle = '#ffb86b';
    ctx.fillText('Y lab', px + ux * 52 * k, py - uy * 52 * k);

    ctx.fillStyle = '#eaf4ff';
    ctx.beginPath();
    ctx.arc(px, py, 2.8 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSecondFrameAxes(ctx, k) {
    if (!S.synth || !S.synth.active || !S.synth.ref2) return;
    if ((S.synth.view || 'primary') === 'secondary') return;
    const ref2 = S.synth.ref2;
    const view = currentViewCfg();
    if (ref2.type === 'lab' && view.type === 'lab') return;
    const t = S.frame / S.fps;
    const o2 = frameOrigin(t, ref2);
    const q = labToFrame(o2, t, view);
    const W = S.canvas.width, H = S.canvas.height;
    const ox = S.axes.x == null ? W / 2 : S.axes.x;
    const oy = S.axes.y == null ? H / 2 : S.axes.y;
    const ppm = S.synth.ppm;
    const px = ox + q.x * ppm;
    const py = oy - q.y * ppm;
    const phi1 = frameAngle(t, view);
    const phi2 = frameAngle(t, ref2);
    const theta = phi2 - phi1;
    const c = Math.cos(theta), s = Math.sin(theta);
    const len = Math.max(W, H) * 0.9;

    ctx.save();
    ctx.setLineDash([5 * k, 5 * k]);
    ctx.lineWidth = 1.3 * k;

    ctx.strokeStyle = hexA('#ffa8f0', 0.85);
    ctx.beginPath();
    ctx.moveTo(px - c * len, py + s * len);
    ctx.lineTo(px + c * len, py - s * len);
    ctx.stroke();

    ctx.strokeStyle = hexA('#a8ffd0', 0.8);
    ctx.beginPath();
    ctx.moveTo(px + s * len, py + c * len);
    ctx.lineTo(px - s * len, py - c * len);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = '600 ' + (11 * k) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffa8f0';
    ctx.fillText('S2 X', px + c * 62 * k, py - s * 62 * k);
    ctx.fillStyle = '#a8ffd0';
    ctx.fillText('S2 Y', px + s * 62 * k, py + c * 62 * k);

    ctx.fillStyle = '#ffe9fb';
    ctx.beginPath();
    ctx.arc(px, py, 2.6 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCalib(ctx, k) {
    const c = S.calib;
    if (!c.p1) return;
    if (c.p2) {
      ctx.strokeStyle = '#ffcc4d';
      ctx.lineWidth = 2 * k;
      ctx.beginPath();
      ctx.moveTo(c.p1.x, c.p1.y);
      ctx.lineTo(c.p2.x, c.p2.y);
      ctx.stroke();
      if (c.length) {
        const mx = (c.p1.x + c.p2.x) / 2, my = (c.p1.y + c.p2.y) / 2;
        ctx.font = '600 ' + (12 * k) + 'px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.lineWidth = 3 * k;
        ctx.strokeStyle = 'rgba(0,0,0,.8)';
        ctx.strokeText(c.length + ' m', mx, my - 6 * k);
        ctx.fillStyle = '#ffcc4d';
        ctx.fillText(c.length + ' m', mx, my - 6 * k);
      }
    }
    circle(ctx, c.p1.x, c.p1.y, 5 * k, '#ffcc4d', 2 * k, '#000');
    if (c.p2) circle(ctx, c.p2.x, c.p2.y, 5 * k, '#ffcc4d', 2 * k, '#000');
  }

  function drawMarks(ctx, k) {
    const r = 7 * k;
    for (const p of S.particles) {
      const m = markPixel(p, S.frame);
      if (!m) continue;
      const active = p.id === S.activeId;
      circle(ctx, m.x, m.y, active ? r * 1.25 : r, p.color, 2 * k, '#000');
      if (active) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5 * k;
        ctx.beginPath();
        ctx.arc(m.x, m.y, r * 1.9, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (S.showLabels) {
        ctx.font = '600 ' + (12 * k) + 'px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.lineWidth = 3 * k;
        ctx.strokeStyle = 'rgba(0,0,0,.8)';
        ctx.strokeText(p.name, m.x + r * 1.6, m.y - r * 1.1);
        ctx.fillStyle = p.color;
        ctx.fillText(p.name, m.x + r * 1.6, m.y - r * 1.1);
      }
    }
  }

  function circle(ctx, x, y, r, fill, strokeW, strokeStyle) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (strokeW) { ctx.lineWidth = strokeW; ctx.strokeStyle = strokeStyle; ctx.stroke(); }
  }

  function hexA(hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  /* --------------------------------------------------------- recording */
  function recordMime() {
    const candidates = [
      'video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4',
      'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm',
    ];
    if (!window.MediaRecorder || typeof MediaRecorder.isTypeSupported !== 'function') return '';
    return candidates.find(t => MediaRecorder.isTypeSupported(t)) || '';
  }

  function drawRecordingFrame() {
    const ctx = S.ctx;
    const W = S.canvas.width, H = S.canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawScene(ctx);
    if (S.showLabAxes) drawLabAxes(ctx, 1);
    drawSecondFrameAxes(ctx, 1);

    const frame = currentViewCfg();
    ctx.save();
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(190,215,235,.8)';
    ctx.fillText('Vista: ' + (FRAME_LABELS[frame.type] || frame.type), 14, H - 16);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(220,235,250,.9)';
    ctx.fillText('t = ' + (S.frame / S.fps).toFixed(2) + ' s', W - 14, H - 16);
    ctx.restore();
  }

  function recordSimVideo() {
    if (!(S.synth && S.synth.active)) { toast('Genera prima una simulazione'); return; }
    if (S.recording) return;
    if (!els.canvas.captureStream || !window.MediaRecorder) {
      toast('Registrazione video non supportata in questo browser');
      return;
    }
    pause();
    const startF = clamp(Math.round(S.range.start), 0, Math.max(0, S.totalFrames - 1));
    const endF = clamp(Math.round(S.range.end), startF, Math.max(0, S.totalFrames - 1));
    const total = Math.max(1, endF - startF + 1);
    let stream, videoTrack = null, manualFrames = false;
    try {
      stream = els.canvas.captureStream(0);
      videoTrack = stream.getVideoTracks()[0] || null;
      manualFrames = !!(videoTrack && typeof videoTrack.requestFrame === 'function');
      if (!manualFrames) {
        stream.getTracks().forEach(t => t.stop());
        stream = els.canvas.captureStream(S.fps);
        videoTrack = stream.getVideoTracks()[0] || null;
      }
    } catch (e) {
      toast('Impossibile avviare la cattura del canvas');
      return;
    }
    const mime = recordMime();
    let rec;
    try {
      rec = mime
        ? new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8000000 })
        : new MediaRecorder(stream);
    } catch (e) {
      stream.getTracks().forEach(t => t.stop());
      toast('Impossibile creare il registratore video');
      return;
    }

    const chunks = [];
    const oldText = els.btnSimVideo.textContent;
    S.recording = true;
    els.btnSimVideo.disabled = true;
    els.btnSimVideo.textContent = 'Registrazione...';
    setFrame(startF, false);
    drawRecordingFrame();

    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onerror = () => {
      S.recording = false;
      els.btnSimVideo.disabled = false;
      els.btnSimVideo.textContent = oldText;
      stream.getTracks().forEach(t => t.stop());
      toast('Errore durante la registrazione');
    };
    rec.onstop = () => {
      S.recording = false;
      els.btnSimVideo.disabled = false;
      els.btnSimVideo.textContent = oldText;
      stream.getTracks().forEach(t => t.stop());
      if (!chunks.length) { toast('Registrazione vuota'); return; }
      const type = mime || 'video/webm';
      const ext = type.indexOf('mp4') >= 0 ? '.mp4' : '.webm';
      downloadBlob(new Blob(chunks, { type }), baseName() + '-simulazione' + ext);
      toast('Video simulato esportato');
    };

    try { rec.start(); } catch (e) {
      S.recording = false;
      els.btnSimVideo.disabled = false;
      els.btnSimVideo.textContent = oldText;
      stream.getTracks().forEach(t => t.stop());
      toast('Impossibile avviare la registrazione');
      return;
    }

    const t0 = performance.now();
    const videoSpeed = clamp(Number(S.simVideoSpeed) || 1, 0.1, 8);
    const frameMs = 1000 / (Math.max(1, S.fps) * videoSpeed);
    const totalMs = Math.max(1, frameMs * total);
    let lastCaptured = -1;
    const tick = now => {
      if (!S.recording) return;
      const idx = Math.min(total - 1, Math.floor((now - t0) / frameMs));
      const f = startF + idx;
      if (f !== S.frame) {
        S.frame = f;
        updateTransport();
        highlightRows();
      }
      if (!manualFrames || f !== lastCaptured) {
        drawRecordingFrame();
        if (manualFrames && videoTrack) videoTrack.requestFrame();
        lastCaptured = f;
      }
      if (idx < total - 1) {
        const pct = Math.round(clamp((now - t0) / totalMs, 0, 1) * 100);
        els.btnSimVideo.textContent = 'Registrazione ' + pct + '% · ' + videoSpeed + '×';
      }
      if (idx >= total - 1) {
        S.recording = false;
        setTimeout(() => {
          try { rec.stop(); } catch (e) {
            els.btnSimVideo.disabled = false;
            els.btnSimVideo.textContent = oldText;
          }
        }, Math.max(120, frameMs));
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------- CSV */
  function csvNum(v) { return v == null || !isFinite(v) ? '' : v.toFixed(6); }

  function download(text, filename, type) {
    downloadBlob(new Blob([text], { type: type || 'application/octet-stream' }), filename);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function baseName() { return S.videoName ? S.videoName.replace(/\.[^.]+$/, '') : 'tracker'; }

  function exportAllCSV() {
    if (!S.particles.length) { toast('Nessun punto da esportare'); return; }
    const lines = ['particella,frame,t,x_m,y_m,vx_mps,vy_mps,KE_J,PE_J,E_J'];
    for (const p of S.particles) {
      for (const r of particleSeries(p)) {
        lines.push([
          p.name, r.f, r.t.toFixed(6), csvNum(r.x), csvNum(r.y), csvNum(r.vx), csvNum(r.vy),
          csvNum(r.ke), csvNum(r.pe), csvNum(r.te),
        ].join(','));
      }
    }
    download(lines.join('\n'), baseName() + '-dati.csv', 'text/csv;charset=utf-8');
    toast('CSV esportato');
  }

  function exportST() {
    const p = activeParticle();
    const rows = particleSeries(p);
    if (!rows.length) { toast('Nessun dato'); return; }
    const lines = ['frame,t,x_m,y_m'];
    for (const r of rows) lines.push([r.f, r.t.toFixed(6), csvNum(r.x), csvNum(r.y)].join(','));
    download(lines.join('\n'), baseName() + '-spazio-tempo.csv', 'text/csv;charset=utf-8');
  }

  function exportVT() {
    const p = activeParticle();
    const rows = particleSeries(p);
    if (!rows.length) { toast('Nessun dato'); return; }
    const lines = ['frame,t,vx_mps,vy_mps,speed_mps'];
    for (const r of rows) lines.push([r.f, r.t.toFixed(6), csvNum(r.vx), csvNum(r.vy), csvNum(r.speed)].join(','));
    download(lines.join('\n'), baseName() + '-velocita-tempo.csv', 'text/csv;charset=utf-8');
  }

  function exportEnergyCSV() {
    const p = activeParticle();
    const rows = particleSeries(p);
    if (!rows.length) { toast('Nessun dato'); return; }
    const lines = ['frame,t,KE_J,PE_J,E_J'];
    for (const r of rows) lines.push([r.f, r.t.toFixed(6), csvNum(r.ke), csvNum(r.pe), csvNum(r.te)].join(','));
    download(lines.join('\n'), baseName() + '-energia.csv', 'text/csv;charset=utf-8');
  }

  /* ------------------------------------------------------------- PDF */
  function latin1Bytes(str) {
    const out = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff;
    return out;
  }

  function base64Bytes(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function pdfEscape(s) {
    return String(s).replace(/[\\()]/g, m => '\\' + m).replace(/[\r\n]+/g, ' ');
  }

  function pdfNum(v, d) {
    return v == null || !isFinite(v) ? '-' : v.toFixed(d);
  }

  function pdfWrap(s, max) {
    const words = String(s).split(/\s+/);
    const lines = [];
    let line = '';
    for (const w of words) {
      const next = line ? line + ' ' + w : w;
      if (next.length > max && line) { lines.push(line); line = w; }
      else line = next;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }

  function buildAnalysisPDF(p, rows) {
    const PW = 595.28, PH = 841.89, M = 40;
    const objects = [];
    const pagesData = [];
    let cur = null, curLabel = '';

    function reserve() { objects.push(null); return objects.length; }
    function setObj(id, head, stream) { objects[id - 1] = { head, stream: stream || null }; }
    function addImage(cv) {
      const b64 = cv.toDataURL('image/jpeg', 0.92).split(',')[1] || '';
      const data = base64Bytes(b64);
      const id = reserve();
      setObj(id, '<< /Type /XObject /Subtype /Image /Width ' + cv.width + ' /Height ' + cv.height +
        ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + data.length + ' >>', data);
      return { id, w: cv.width, h: cv.height };
    }
    function addCmd(s) { cur.push(s); }
    function tx(x, yTop, s, size, bold, color) {
      const c = color || [0.07, 0.09, 0.12];
      addCmd(c[0] + ' ' + c[1] + ' ' + c[2] + ' rg BT /' + (bold ? 'F2' : 'F1') + ' ' + (size || 9) +
        ' Tf 1 0 0 1 ' + x.toFixed(2) + ' ' + (PH - yTop).toFixed(2) + ' Tm (' + pdfEscape(s) + ') Tj ET');
    }
    function ln(x1, y1, x2, y2, width, color) {
      const c = color || [0.75, 0.78, 0.82];
      addCmd(c[0] + ' ' + c[1] + ' ' + c[2] + ' RG ' + (width || 0.5) + ' w ' +
        x1.toFixed(2) + ' ' + (PH - y1).toFixed(2) + ' m ' + x2.toFixed(2) + ' ' + (PH - y2).toFixed(2) + ' l S');
    }
    function rect(x, yTop, w, h, color) {
      const c = color || [0.95, 0.96, 0.97];
      addCmd(c[0] + ' ' + c[1] + ' ' + c[2] + ' rg ' + x.toFixed(2) + ' ' + (PH - yTop - h).toFixed(2) +
        ' ' + w.toFixed(2) + ' ' + h.toFixed(2) + ' re f');
    }
    function image(img, x, yTop, w, h) {
      addCmd('q ' + w.toFixed(2) + ' 0 0 ' + h.toFixed(2) + ' ' + x.toFixed(2) + ' ' +
        (PH - yTop - h).toFixed(2) + ' cm /Im' + img.slot + ' Do Q');
    }
    function startPage(label, withMeta) {
      cur = [];
      curLabel = label;
      const source = S.synth
        ? 'Simulazione: ' + (SIM_META[S.synth.type] || S.synth.type)
        : 'Video: ' + (S.videoName || 'non specificato');
      tx(M, 46, 'Tracker Web DT - Report di analisi', 17, true);
      tx(M, 63, 'Punto: ' + p.name + ' | ' + source, 8.5, false, [0.35, 0.4, 0.47]);
      ln(M, 74, PW - M, 74, 0.8, [0.8, 0.83, 0.87]);
      let y = 92;
      if (withMeta) {
        const frame = currentViewCfg();
        const model = isHarmonicSynth()
          ? 'PE elastica = 0.5 k (x - x_eq)^2, k = m omega^2'
          : 'PE gravitazionale = m g h, h = y nel laboratorio';
        const meta = [
          'Sistema di riferimento della vista: ' + (FRAME_LABELS[frame.type] || frame.type) +
            ((frame.type === 'accel' || frame.type === 'rotating') ? ' | sistema non inerziale' : ''),
          'Massa: ' + round2(S.mass) + ' kg | g: ' + round2(S.gravity) + ' m/s^2 | Modello: ' + model,
          'FPS: ' + round2(S.fps) + ' | Intervallo frame: ' + S.range.start + '-' + S.range.end +
            ' | Campioni: ' + rows.length,
          'Calibrazione: ' + (S.calib.length != null ? round2(S.calib.length) + ' m' : 'non disponibile') +
            (S.calib.scale ? ' | scala ' + Number(S.calib.scale).toFixed(5) + ' m/px' : ''),
          'Generato: ' + new Date().toLocaleString('it-IT'),
        ];
        for (const line of meta) {
          for (const part of pdfWrap(line, 112)) { tx(M, y, part, 8.5, false, [0.2, 0.24, 0.3]); y += 12; }
        }
        ln(M, y + 2, PW - M, y + 2, 0.5, [0.85, 0.87, 0.9]);
        y += 16;
      }
      return y;
    }
    function endPage() {
      pagesData.push({ cmds: cur, label: curLabel });
      cur = null;
    }

    const cat = reserve(), pages = reserve(), f1 = reserve(), f2 = reserve();
    setObj(cat, '<< /Type /Catalog /Pages ' + pages + ' 0 R >>');
    setObj(f1, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    setObj(f2, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const imgST = addImage(els.graphST); imgST.slot = 1;
    const imgVT = addImage(els.graphVT); imgVT.slot = 2;
    const imgEN = addImage(els.graphEN); imgEN.slot = 3;

    const sections = [
      {
        title: 'Grafico spazio-tempo', img: imgST,
        headers: ['Frame', 't (s)', 'x (m)', 'y (m)'],
        widths: [46, 70, 199, 200], align: ['l', 'r', 'r', 'r'],
        values: r => [r.f, r.t.toFixed(3), pdfNum(r.x, 3), pdfNum(r.y, 3)],
      },
      {
        title: 'Grafico velocita-tempo', img: imgVT,
        headers: ['Frame', 't (s)', 'vx (m/s)', 'vy (m/s)', '|v| (m/s)'],
        widths: [46, 70, 133, 133, 133], align: ['l', 'r', 'r', 'r', 'r'],
        values: r => [r.f, r.t.toFixed(3), pdfNum(r.vx, 2), pdfNum(r.vy, 2), pdfNum(r.speed, 2)],
      },
      {
        title: 'Grafico energia-tempo', img: imgEN,
        headers: ['Frame', 't (s)', 'KE (J)', 'PE (J)', 'E (J)'],
        widths: [46, 70, 133, 133, 133], align: ['l', 'r', 'r', 'r', 'r'],
        values: r => [r.f, r.t.toFixed(3), pdfNum(r.ke, 2), pdfNum(r.pe, 2), pdfNum(r.te, 2)],
      },
    ];

    for (let si = 0; si < sections.length; si++) {
      const sec = sections[si];
      let i = 0, pageNo = 0;
      while (i < rows.length || pageNo === 0) {
        const withMeta = si === 0 && pageNo === 0;
        let y = startPage(sec.title, withMeta);
        tx(M, y, sec.title + (pageNo > 0 ? ' (continua)' : ''), 12, true, [0.1, 0.2, 0.32]);
        y += 18;
        if (pageNo === 0) {
          const gw = PW - 2 * M;
          const gh = gw * sec.img.h / sec.img.w;
          image(sec.img, M, y, gw, gh);
          y += gh + 22;
        }
        const rowH = 12;
        const headerH = 15;
        tx(M, y + 9, 'Dati', 9.5, true, [0.1, 0.2, 0.32]);
        y += 14;
        rect(M, y, PW - 2 * M, headerH, [0.9, 0.93, 0.96]);
        let x = M;
        for (let c = 0; c < sec.headers.length; c++) {
          tx(x + 3, y + 10, sec.headers[c], 7.5, true, [0.12, 0.18, 0.26]);
          x += sec.widths[c];
        }
        y += headerH;
        const bottom = PH - M - 14;
        while (i < rows.length && y + rowH <= bottom) {
          const vals = sec.values(rows[i]);
          if (i % 2 === 1) rect(M, y, PW - 2 * M, rowH, [0.975, 0.98, 0.985]);
          x = M;
          for (let c = 0; c < vals.length; c++) {
            const textVal = String(vals[c]);
            const sz = 7.5;
            const txX = sec.align[c] === 'r'
              ? x + sec.widths[c] - 4 - textVal.length * sz * 0.52
              : x + 3;
            tx(txX, y + 9, textVal, sz, false, [0.15, 0.18, 0.22]);
            x += sec.widths[c];
          }
          ln(M, y + rowH, PW - M, y + rowH, 0.25, [0.88, 0.9, 0.93]);
          y += rowH;
          i++;
        }
        endPage();
        pageNo++;
      }
    }

    const contentIds = [], pageIds = [];
    const total = pagesData.length;
    for (let pi = 0; pi < total; pi++) {
      const pg = pagesData[pi];
      const footer = [
        [0.55, 0.58, 0.63],
        'Tracker Web DT | ' + pg.label + ' | pagina ' + (pi + 1) + ' di ' + total,
      ];
      cur = pg.cmds;
      tx(M, PH - 22, footer[1], 7.5, false, footer[0]);
      cur = null;
      const data = latin1Bytes(pg.cmds.join('\n'));
      const cid = reserve();
      setObj(cid, '<< /Length ' + data.length + ' >>', data);
      contentIds.push(cid);
    }
    for (let pi = 0; pi < total; pi++) {
      const cid = contentIds[pi];
      const pid = reserve();
      setObj(pid, '<< /Type /Page /Parent ' + pages + ' 0 R /MediaBox [0 0 ' + PW + ' ' + PH +
        '] /Resources << /Font << /F1 ' + f1 + ' 0 R /F2 ' + f2 + ' 0 R >> /XObject << /Im1 ' +
        imgST.id + ' 0 R /Im2 ' + imgVT.id + ' 0 R /Im3 ' + imgEN.id + ' 0 R >> >> /Contents ' +
        cid + ' 0 R >>');
      pageIds.push(pid);
    }
    setObj(pages, '<< /Type /Pages /Kids [' + pageIds.map(id => id + ' 0 R').join(' ') +
      '] /Count ' + pageIds.length + ' >>');

    const n = objects.length;
    const chunks = [];
    let len = 0;
    const push = b => {
      const bytes = typeof b === 'string' ? latin1Bytes(b) : b;
      chunks.push(bytes);
      len += bytes.length;
    };
    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    const offsets = [];
    for (let i = 1; i <= n; i++) {
      const obj = objects[i - 1];
      offsets[i] = len;
      push(i + ' 0 obj\n' + obj.head + '\n');
      if (obj.stream) {
        push('stream\n');
        push(obj.stream);
        push('\nendstream\n');
      }
      push('endobj\n');
    }
    const xref = len;
    push('xref\n0 ' + (n + 1) + '\n0000000000 65535 f \n');
    for (let i = 1; i <= n; i++) {
      push(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
    }
    push('trailer\n<< /Size ' + (n + 1) + ' /Root ' + cat + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF');
    const out = new Uint8Array(len);
    let pos = 0;
    for (const c of chunks) { out.set(c, pos); pos += c.length; }
    return out;
  }

  function exportPDF() {
    const p = activeParticle();
    const rows = particleSeries(p);
    if (!p || !rows.length) { toast('Nessun dato per il PDF'); return; }
    try {
      const pdf = buildAnalysisPDF(p, rows);
      downloadBlob(new Blob([pdf], { type: 'application/pdf' }), baseName() + '-analisi.pdf');
      toast('PDF esportato');
    } catch (e) {
      toast('Errore PDF: ' + (e && e.message ? e.message : 'esportazione fallita'));
    }
  }

  /* ---------------------------------------------------------- project */
  function projectData() {
    return {
      app: 'tracker-web-dt', version: 6,
      videoName: S.videoName,
      fps: S.fps,
      fpsManual: S.fpsManual,
      range: S.range,
      rangeSet: S.rangeSet,
      calib: S.calib,
      axes: S.axes,
      particles: S.particles,
      activeId: S.activeId,
      mass: S.mass,
      gravity: S.gravity,
      showLabAxes: S.showLabAxes,
      stSwap: !!S.stSwap,
      interpolate: !!S.interpolate,
      autoAdvance: S.autoAdvance,
      autoSlowdown: S.autoSlowdown,
      simView: S.simView,
      simVideoSpeed: S.simVideoSpeed,
      synth: S.synth ? {
        active: true, type: S.synth.type, params: S.synth.params,
        width: S.synth.width, height: S.synth.height, ppm: S.synth.ppm,
        bodyR: S.synth.bodyR, noise: S.synth.noise, frames: S.totalFrames,
        frame: S.synth.frame, ref2: S.synth.ref2 || null, view: S.synth.view || 'primary',
        bodies: S.synth.bodies || null,
      } : null,
    };
  }

  function saveProject() {
    download(JSON.stringify(projectData(), null, 2), baseName() + '.trackerweb.json', 'application/json');
    toast('Progetto salvato');
  }

  function loadProjectFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || !Array.isArray(data.particles)) throw new Error('bad');
        applyProject(data, false);
        toast('Progetto caricato');
      } catch (e) { toast('File di progetto non valido'); }
    };
    reader.onerror = () => toast('Errore di lettura del file');
    reader.readAsText(file);
  }

  function applyProject(data, silent) {
    const hadSynth = !!(S.synth && S.synth.active);
    const newSynth = !!(data.synth && data.synth.active);
    if (hadSynth && !newSynth) clearSyntheticEnv();

    S.fps = Number(data.fps) > 0 ? Number(data.fps) : 30;
    S.fpsManual = !!data.fpsManual;
    els.fps.value = String(round2(S.fps));
    els.fpsBadge.textContent = S.fpsManual ? 'manuale' : 'auto';
    S.range = data.range || { start: 0, end: 0 };
    S.rangeSet = !!data.rangeSet;
    S.calib = Object.assign({ p1: null, p2: null, length: null, scale: null }, data.calib || {});
    S.axes = Object.assign({ x: null, y: null, theta: 0 }, data.axes || {});
    S.particles = Array.isArray(data.particles) ? data.particles : [];
    S.activeId = data.activeId && S.particles.some(p => p.id === data.activeId)
      ? data.activeId : (S.particles[0] ? S.particles[0].id : null);
    S.mass = Number(data.mass) > 0 ? Number(data.mass) : 1;
    S.gravity = Number.isFinite(Number(data.gravity)) ? Number(data.gravity) : 9.81;
    S.showLabAxes = data.showLabAxes !== false;
    S.stSwap = !!data.stSwap;
    S.interpolate = !!data.interpolate;
    updateInterpolaButton();
    S.autoAdvance = data.autoAdvance !== false;
    els.chkAutoAdvance.checked = S.autoAdvance;
    if (isFinite(Number(data.autoSlowdown))) {
      S.autoSlowdown = clamp(Number(data.autoSlowdown), 0, 1000);
      const opt = Array.from(els.autoSpeed.options).find(o => Number(o.value) === S.autoSlowdown);
      if (opt) els.autoSpeed.value = String(S.autoSlowdown);
    }
    if (isFinite(Number(data.simVideoSpeed)) && Number(data.simVideoSpeed) > 0) {
      S.simVideoSpeed = clamp(Number(data.simVideoSpeed), 0.1, 8);
      const opt = Array.from(els.simVideoSpeed.options).find(o => Number(o.value) === S.simVideoSpeed);
      if (opt) els.simVideoSpeed.value = String(S.simVideoSpeed);
    }
    S.simView = data.simView || (data.synth && data.synth.view) || 'primary';
    if (els.simViewFrame) els.simViewFrame.value = S.simView;
    els.stAxisMode.value = S.stSwap ? 't-y' : 't-x';
    els.mass.value = String(round2(S.mass));
    els.gravity.value = String(round2(S.gravity));
    els.simShowLab.checked = S.showLabAxes;
    if (data.videoName) S.videoName = data.videoName;

    if (newSynth) {
      setupSynthEnv(data.synth, S.fps);
      S.synth.view = data.synth.view || S.simView || 'primary';
      S.simView = S.synth.view;
      els.simViewFrame.value = S.simView;
      syncFrameControls(data.synth.frame);
      const ref2 = data.synth.ref2 || null;
      els.simRef2On.checked = !!ref2;
      els.simRef2Box.classList.toggle('hidden', !ref2);
      if (ref2) {
        els.simRef2Type.value = ref2.type || 'moving';
        if (ref2.vx != null) els.simRef2Vx.value = ref2.vx;
        if (ref2.vy != null) els.simRef2Vy.value = ref2.vy;
        if (ref2.ax != null) els.simRef2Ax.value = ref2.ax;
        if (ref2.ay != null) els.simRef2Ay.value = ref2.ay;
        if (ref2.omega != null) els.simRef2W.value = ref2.omega;
      }
      const bodies = data.synth.bodies || [];
      els.simBody2On.checked = bodies.length > 1;
      els.simBody2Box.classList.toggle('hidden', bodies.length < 2);
      if (bodies.length > 0 && bodies[0].frame) {
        els.simFrameRef.value = bodies[0].frame === 'secondary' ? 'secondary' : 'primary';
      }
      if (bodies.length > 1) {
        els.sim2Type.value = bodies[1].type || 'mru';
        if (bodies[1].frame) {
          els.sim2FrameRef.value = bodies[1].frame === 'secondary' ? 'secondary' : 'primary';
        }
      }
      updateSimFields();
      updateFrameFields();
    } else if (S.synth && !newSynth) {
      S.synth = null;
    }

    computeFrames();
    if (S.video.loaded) {
      S.range.start = clamp(S.range.start, 0, Math.max(0, S.totalFrames - 1));
      S.range.end = clamp(S.range.end, S.range.start, Math.max(0, S.totalFrames - 1));
      clampAxes();
      S.projectRangePending = false;
    } else {
      S.projectRangePending = true;
    }
    updateRangeDom();
    syncAxesFields();
    updateCalibStatus();
    renderAll();
    if (!silent) scheduleAutosave();
  }

  function newProject() {
    if ((S.particles.length || S.calib.scale) && !window.confirm('Azzerare punti, calibrazione e assi?')) return;
    const hadSynth = !!(S.synth && S.synth.active);
    pause();
    clearTimeout(autosaveTimer);
    try { localStorage.removeItem(AUTOSAVE_KEY); } catch (e) {}
    if (hadSynth) clearSyntheticEnv();
    S.particles = [];
    S.activeId = null;
    S.calib = { p1: null, p2: null, length: null, scale: null };
    S.mass = 1;
    S.gravity = 9.81;
    els.mass.value = '1';
    els.gravity.value = '9.81';
    S.showLabAxes = true;
    els.simShowLab.checked = true;
    S.rangeSet = false;
    if (!hadSynth) {
      if (S.video.loaded) {
        S.axes = { x: Math.round(S.video.width / 2), y: Math.round(S.video.height / 2), theta: 0 };
        S.range = { start: 0, end: Math.max(0, S.totalFrames - 1) };
      }
    }
    renderAll();
    if (S.video.loaded) setFrame(S.range.start, true);
    toast('Nuovo progetto');
  }

  function scheduleAutosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(projectData())); } catch (e) {}
    }, 600);
  }

  function restoreAutosave() {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.particles) || !data.particles.length) return;
      applyProject(data, true);
      toast('Progetto precedente ripristinato');
    } catch (e) {}
  }

  /* -------------------------------------------------------- modal/busy */
  function askNumber(title, desc, def) {
    return new Promise(resolve => {
      els.modalTitle.textContent = title;
      els.modalDesc.textContent = desc || '';
      els.modalInput.value = def == null ? '' : String(def);
      els.modal.classList.remove('hidden');
      setTimeout(() => { els.modalInput.focus(); els.modalInput.select(); }, 30);

      function cleanup() {
        els.modal.classList.add('hidden');
        els.modalOk.removeEventListener('click', ok);
        els.modalCancel.removeEventListener('click', cancel);
        els.modalInput.removeEventListener('keydown', onKey);
      }
      function finish(v) { cleanup(); resolve(v); }
      function ok() {
        const raw = String(els.modalInput.value).replace(',', '.');
        const v = parseFloat(raw);
        finish(isFinite(v) ? v : null);
      }
      function cancel() { finish(null); }
      function onKey(e) {
        if (e.key === 'Enter') { e.preventDefault(); ok(); }
        else if (e.key === 'Escape') { cancel(); }
      }
      els.modalOk.addEventListener('click', ok);
      els.modalCancel.addEventListener('click', cancel);
      els.modalInput.addEventListener('keydown', onKey);
    });
  }

  function showBusy(title) {
    S.busy = true;
    els.busyTitle.textContent = title;
    setBusy(0);
    els.busy.classList.remove('hidden');
  }
  function setBusy(p) {
    const pct = Math.round(clamp(p, 0, 1) * 100);
    els.busyFill.style.width = pct + '%';
    els.busyPct.textContent = pct + '%';
  }
  function hideBusy() {
    S.busy = false;
    els.busy.classList.add('hidden');
  }

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2400);
  }

  /* --------------------------------------------------------- render all */
  function renderAll() {
    updateCalibStatus();
    syncAxesFields();
    renderParticleList();
    updateTransport();
    updatePlayButton();
    updateRangeDom();
    drawOverlay();
    updateAnalysis();
  }

  window.TrackerWeb = { state: S, updateAnalysis, drawOverlay };
})();
