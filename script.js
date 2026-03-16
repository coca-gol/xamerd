let isPrompt;

let musicFiles = [];
let playingList = [];
let currentIndex = -1;
let deactiveSong = null;
let isRepeat = false;
let isPlaying = false;

// cut - audio
let areData = null; // ary buf data
let codData = null; // decode data
let currentCutId = null;
let isPreview = false;
let isDecode = false;

let asCounter = 0;

let toastNotif;
let toastMessage;
let toastEnabled = true;

let audioPlayer;
let cutAudioPlayer;
document.addEventListener('DOMContentLoaded', async () => {

    audioPlayer = document.querySelector('#audioPlayer');
    cutAudioPlayer = document.querySelector('#cutAudioPlayer');
    toastNotif = document.querySelector('#toastNotif');
    toastMessage = document.querySelector(".toast-message");

    // music file
    const addFileBtn = document.querySelector('#addFileBtn');
    const fileInput = document.querySelector('#fileInput');
    const folderInput = document.querySelector('#folderInput');

    // music list
    const musicList = document.querySelector('#music-list');
    const musicBtn = document.querySelector('#musicBtn');
    const artistBtn = document.querySelector('#artistBtn');
    const albumBtn = document.querySelector('#albumBtn');
    const genreBtn = document.querySelector('#genreBtn');

    const searchInput = document.querySelector('#searchInput');
    const clearSearchBtn = document.querySelector('#clearSearchBtn');

    // music player
    const progressRange = document.querySelector('#progress-range');
    const progressBorder = document.querySelector('#progress-border');

    const playPauseBtn = document.querySelector('#playPauseBtn');
    const prevBtn = document.querySelector('#prevBtn');
    const nextBtn = document.querySelector('#nextBtn');
    const repeatBtn = document.querySelector('#repeatBtn');
    const currentTimes = document.querySelector('#currentTimes');
    const currentDurations = document.querySelector('#currentDurations');
    const playerMusic = document.querySelector('#player-control-item');

    const eqToggleBtn = document.querySelector('#eqToggleBtn');
    const eqStatus = document.querySelector('#eq-status');

    // FADE VOL
    const fadeInSlider = document.querySelector('#fadeIn');
    const fadeOutSlider = document.querySelector('#fadeOut');
    const fadeInValue = document.querySelector('#fadeInValue');
    const fadeOutValue = document.querySelector('#fadeOutValue');

    // CUT- AUDIO
    const audioBtn = document.querySelector('#audioBtn');
    const audioProgres = document.querySelector('#audioProgres');
    const currentPG = document.querySelector('#currentPG');
    const durationPG = document.querySelector('#durationPG');

    const startSlider = document.querySelector('#startSlider');
    const endSlider = document.querySelector('#endSlider');
    const formatTimesBtn = document.querySelector('#format-times-options');
    const cutStartTimes = document.querySelector('#cutStartTimes');
    const cutEndTimes = document.querySelector('#cutEndTimes');
    const duresult = document.querySelectorAll('.duration-of-selection-results');

    const listEdit = document.querySelector('#pre-list-edit');
    const preEdit = document.querySelector('#preview-editting');
    const getOutEdit = document.querySelector('#get-output-edit');
    const resetEditBtn = document.querySelector('#resetEditBtn');

    const apcx = document.querySelectorAll('.albumArtPreview');
    const albumArtInput = document.querySelector('#albumArtInput');
    const extrackAudioBtn = document.querySelector('#extrackAudioBtn');
    const confirmBox = document.querySelector('#sampleRateConfirm');
    const rateButtons = document.querySelectorAll('.rate-btn');
    const downloadCutAudioLink = document.querySelector('#downloadCutAudioLink');

    const installer = document.querySelector('#installPrompt');
    document.querySelector('#installNowBtn')?.addEventListener('click', async () => {
        if (!isPrompt) return;
        installer.classList.remove('show');
        isPrompt.prompt();
        const {
            outcome
        } = await isPrompt.userChoice;
        if (outcome === 'accepted');
        isPrompt = null;
    });

    document.querySelector('#installLaterBtn')?.addEventListener('click',
        () => {
            installer.classList.remove('show');
            setTimeout(() => installer.classList.add('hidden'), 1000);
        });

    window.addEventListener('beforeinstallprompt',
        (e) => {
            e.preventDefault();
            isPrompt = e;
   
            setTimeout(() => {
                installer.classList.remove('hidden');
                installer.classList.add('show');
            }, 7200);
        });

    // DEFAULT ON
    function showToast(message,
        bg = "#fff",
        duration = 1000) {
        if (!toastEnabled) {
            console.log("[TOAST DISABLED]");
            return;
        }

        if (!toastNotif || !toastMessage) {
            console.warn("Toast elements not found.");
            return;
        }

        toastMessage.textContent = message;

        toastMessage.style.background = bg;

        toastNotif.classList.add("show");

        setTimeout(() => {
            toastNotif.classList.remove("show");
        }, duration);
    }
    window.showToast = showToast;

    document.querySelector('#modeMessageBtn').addEventListener('click', () => {
        toastEnabled = !toastEnabled; modeMessageBtn.innerHTML = toastEnabled ? `<i class="fas fa-bell"></i>&nbsp;message`: `<i class="fas fa-bell-slash"></i>&nbsp;message`;
    });

    // eq safety
    let eqEnabled = false;

    let subEQ = 0;
    let m3EQ = 0;
    let m10EQ = 0;
    let h30EQ = 0;
    let h50EQ = 0;
    let h80EQ = 0;
    let h90EQ = 0;
    let bassEQ = 0;
    let bassBoostEQ = 0;
    let reverbEQ = 0;
    let virtualizerEQ = 0;
    let playbackEQ = 1;

    function biquad(ctx,
        type,
        freq,
        Q = 0,
        gain = 0) {
        const f = ctx.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        f.Q.value = Q;
        f.gain.value = gain;
        return f;
    }

    function reverbImpulse(ctx,
        duration = 2) {
        const rate = ctx.sampleRate;
        const length = rate * duration;
        const impulse = ctx.createBuffer(2,
            length,
            rate);
        for (let c = 0; c < 2; c++) {
            const channel = impulse.getChannelData(c);
            for (let i = 0; i < length; i++) {
                channel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2); // 2-(3)
            }
        }
        return impulse;
    }

    function createCompressor(ctx) {
        const m = ctx.createDynamicsCompressor();
        m.threshold.value = -5;
        m.knee.value = 20;
        m.ratio.value = 2;
        m.attack.value = 0.002;
        m.release.value = 0.04;
        return m;
    }

    function createLimiter(ctx) {
        const r = ctx.createDynamicsCompressor();
        r.threshold.value = -5;
        r.knee.value = 20;
        r.ratio.value = 9;
        r.attack.value = 0.003;
        r.release.value = 0.05;
        return r;
    }

    // CLASS CORE
    class equalizer {
        constructor() {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.main = this.audioCtx.createMediaElementSource(audioPlayer);

            this.cut = this.audioCtx.createMediaElementSource(cutAudioPlayer);

            this.s1 = biquad(this.audioCtx, 'lowshelf', 60);

            this.m3 = biquad(this.audioCtx, "peaking", 320, 1.2);
            this.m1 = biquad(this.audioCtx, "peaking", 1000, 1.2);

            this.h3 = biquad(this.audioCtx, "highshelf",
                3000);
            this.h5 = biquad(this.audioCtx, "highshelf",
                5000);
            this.h8 = biquad(this.audioCtx, "highshelf",
                8000);
            this.h9 = biquad(this.audioCtx, "highshelf",
                9000);

            this.b1 = biquad(this.audioCtx, "highpass",
                90);
            this.b2 = biquad(this.audioCtx, "peaking",
                70, 0.5);
            this.b3 = biquad(this.audioCtx, "lowpass",
                100);
            this.b4 = this.audioCtx.createGain();

            this.ba = biquad(this.audioCtx, "highpass",
                110);
            this.bb = biquad(this.audioCtx, "peaking",
                92,
                0.2);
            this.bc = biquad(this.audioCtx, "lowpass",
                140);
            this.bg = this.audioCtx.createGain();

            // OUTPUT LANE
            this.de = this.audioCtx.createDelay(5);
            this.de.delayTime.value = 0;
            this.df = this.audioCtx.createGain();
            this.df.gain.value = 0;
            this.dx = this.audioCtx.createGain();
            this.dx.gain.value = 0;

            this.vL = this.audioCtx.createGain();
            this.vR = this.audioCtx.createGain();
            this.vx = this.audioCtx.createGain();
            this.vx.gain.value = 0;
            this.sp = this.audioCtx.createChannelMerger(2);

            this.re = this.audioCtx.createConvolver();
            this.re.buffer = reverbImpulse(this.audioCtx, 2.5);
            this.rx = this.audioCtx.createGain();
            this.rx.gain.value = 0;

            this.vo = this.audioCtx.createGain();
            // use to (sub, bass)
            this.comp = createCompressor(this.audioCtx);
            // use to (bassBoost)
            this.limiter = createLimiter(this.audioCtx);

            this.merger = this.audioCtx.createGain();

            this.connect();
            this.bypass();
        }

        setSub(val) {
            this.s1.gain.value = subEQ = val;
        }

        setM3(val) {
            this.m3.gain.value = m3EQ = val;
        }

        setM10(val) {
            this.m1.gain.value = m10EQ = val;
        }

        setH30(val) {
            this.h3.gain.value = h30EQ = val;
        }

        setH50(val) {
            this.h5.gain.value = h50EQ = val;
        }

        setH80(val) {
            this.h8.gain.value = h80EQ = val;
        }

        setH90(val) {
            this.h9.gain.value = h90EQ = val;
        }

        setBass(val) {
            this.b2.gain.value = val * 10;
            this.b4.gain.value = val;
            bassEQ = val;
        }

        setBassBoost(val) {
            this.bb.gain.value = val * 10;
            this.bg.gain.value = val;
            // suspended out sub
            this.vo.gain.value = 1 - (val * 0.2); // suspended out sub
            bassBoostEQ = val;
        }

        setReverb(val) {
            this.rx.gain.value = reverbEQ = val;
        }

        // setEcho(val) {}
        setVirtualizer(val) {
            clearTimeout(this._echoUpdateTimer);

            this._last = val;

            this._echoUpdateTimer = setTimeout(() => {
                const smoothVal = this._last;
                // Smooth transition
                const now = this.audioCtx.currentTime;

                // Delay Time
                this.de.delayTime.cancelScheduledValues(now);
                this.de.delayTime.linearRampToValueAtTime(0.002 + smoothVal * 0.05, now + 0.05);

                // Feedback gain
                this.df.gain.cancelScheduledValues(now);
                this.df.gain.linearRampToValueAtTime(Math.min(0.05, 0.5 + smoothVal), now + 0.05);

                // Wet mix
                this.dx.gain.cancelScheduledValues(now);
                this.dx.gain.linearRampToValueAtTime(smoothVal, now + 0.5);
            }, 15);

            // Tetap unity gain
            this.vL.gain.value = 1;
            this.vR.gain.value = 1;
            this.vx.gain.value = val * 0.5;

            virtualizerEQ = val;
        }

        setPlayback(val) {
            try {
                let rate = eqEnabled ? val: 1;
                const pitch = !eqEnabled;

                [audioPlayer,
                    cutAudioPlayer].forEach(player => {
                        player.preservesPitch = pitch;
                        player.mozPreservesPitch = pitch;
                        player.webkitPreservesPitch = pitch;
                        player.playbackRate = rate;
                    });

                playbackEQ = rate;
            } catch (e) {
                console.warn("Tidak bisa set playbackRate", e);
            }
        }

        connect() {
            [this.main,
                this.cut].forEach(source => {
                    try {
                        source.disconnect();
                        eqEnabled = true;

                        source.connect(this.s1).connect(this.m3).connect(this.m1).connect(this.h3).connect(this.h5).connect(this.h8).connect(this.h9).connect(this.vo);

                        // BASS ENHANCER
                        source.connect(this.b1).connect(this.b2).connect(this.b3).connect(this.b4).connect(this.limiter);


                        // BASS BOOSTER
                        source.connect(this.ba).connect(this.bb).connect(this.bc).connect(this.bg).connect(this.limiter);

                        this.limiter.connect(this.merger);

                        // VIRTUALIZER
                        this.vo.connect(this.de).connect(this.df).connect(this.de).connect(this.dx).connect(this.merger);

                        this.vo.connect(this.vL).connect(this.vx);

                        this.vo.connect(this.vR).connect(this.vx);

                        this.vx.connect(this.sp).connect(this.merger);

                        // REVERB
                        this.vo.connect(this.re).connect(this.rx).connect(this.merger);

                        // FINAL
                        this.vo.connect(this.comp).connect(this.merger);

                        this.merger.connect(this.audioCtx.destination);

                    } catch (e) {
                        console.error("connection", e);
                        source.disconnect();
                        eqEnabled = false;

                        source.connect(this.audioCtx.destination);
                    }
                });
        }

        bypass() {
            [this.main,
                this.cut].forEach(source => {
                    try {
                        source.disconnect();
                        eqEnabled = false;

                        source.connect(this.audioCtx.destination);
                    } catch (e) {}
                });
        }
    }

    const myEQ = new equalizer();

    // Resume context
    document.addEventListener('click', async () => {
        if (myEQ.audioCtx.state === 'suspended') {
            await myEQ.audioCtx.resume();
        }},
        {
            once: true
        });

    // SLIDERS OBJECT
    const sliders = {
        sub: document.querySelector('#sub'),
        m3: document.querySelector('#m3'),
        m10: document.querySelector('#m10'),
        h30: document.querySelector('#h30'),
        h50: document.querySelector('#h50'),
        h80: document.querySelector('#h80'),
        h90: document.querySelector('#h90'),
        bass: document.querySelector('#bass'),
        bassBoost: document.querySelector('#bassBoost'),
        reverb: document.querySelector('#reverb'),
        virtualizer: document.querySelector('#virtualizer'),
        playback: document.querySelector('#playback')
    };

    const values = {
        sub: document.querySelector('#subValue'),
        m3: document.querySelector('#m3Value'),
        m10: document.querySelector('#m10Value'),
        h30: document.querySelector('#h30Value'),
        h50: document.querySelector('#h50Value'),
        h80: document.querySelector('#h80Value'),
        h90: document.querySelector('#h90Value'),
        bass: document.querySelector('#bassValue'),
        bassBoost: document.querySelector('#bassBoostValue'),
        reverb: document.querySelector('#reverbValue'),
        virtualizer: document.querySelector('#virtualizerValue'),
        playback: document.querySelector('#playbackValue')
    };

    // EVENT SLIDERS
    const eventEQ = {
        sub: val => myEQ.setSub(val),
        m3: val => myEQ.setM3(val),
        m10: val => myEQ.setM10(val),
        h30: val => myEQ.setH30(val),
        h50: val => myEQ.setH50(val),
        h80: val => myEQ.setH80(val),
        h90: val => myEQ.setH90(val),
        bass: val => myEQ.setBass(val),
        bassBoost: val => myEQ.setBassBoost(val),
        //  echo: val => myEQ.setEcho(val),
        reverb: val => myEQ.setReverb(val),
        virtualizer: val => myEQ.setVirtualizer(val),
        playback: val => myEQ.setPlayback(val)
    };

    /* SLIDER UI */
    function upEqRange(id) {
        const s = sliders[id];
        let v = values[id];
        if (!s || !v) return;

        let min = s.min ? parseFloat(s.min): 0;
        let max = s.max ? parseFloat(s.max): 100;
        let val = ((s.value - min) / (max - min)) * 100;

        v.textContent = parseFloat(s.value).toFixed(2);

        // apply state?
        s.style.background = eqEnabled
        ? `linear-gradient(
        90deg,
        var(--eq-gradient-start) 0%,
        var(--eq-gradient-end) ${val}%,
        #000 ${val}%,
        #000 100%
        )`: `linear-gradient(
        90deg,
        #fff 0%,
        #fff ${val}%,
        #000 ${val}%,
        #000 100%
        )`;

    }

    /* SLIDER INIT */
    Object.keys(sliders).forEach(id => {
        const s = sliders[id];
        let v = values[id];
        if (!s || !v) return;

        let lastVal = parseFloat(s.value);
        upEqRange(id);

        s.addEventListener("input", () => {
            let newVal = parseFloat(s.value);
            upEqRange(id);

            v.style.color = newVal > lastVal ? "#fff000": "";

            lastVal = newVal;
            eventEQ[id]?.(newVal);
        });

        s.addEventListener("touchend", () => {
            v.style.color = "";
        });
    });

    /* APPLY SLIDER VALUE */
    function setEqRange() {
        Object.keys(eventEQ).forEach(id => {
            if (sliders[id]) {
                let v = parseFloat(sliders[id].value);
                eventEQ[id]?.(v);
                upEqRange(id);
            }
        });
    }

    /* EQ TOGGLE EVENT */
    eqToggleBtn.addEventListener('click',
        async () => {
            if (!eqEnabled) {
                await myEQ.connect();
            } else {
                await myEQ.bypass();
            }
            setEqRange();

            eqToggleBtn.innerHTML = eqEnabled
            ? `<i class="fas fa-toggle-on"></i>&nbsp; ON`: `<i class="fas fa-toggle-off"></i>&nbsp; OFF`;

            eqStatus.textContent = eqEnabled
            ? 'CONNECT': 'BYPASS';
        });

    // RESET
    function readEQ(key = null) {
        const n = 0.0;
        const v = {
            sub: n,
            m3: n,
            m10: n,
            h30: n,
            h50: n,
            h80: n,
            h90: n,
            bass: n,
            bassBoost: n,
            //   echo: 0.0,
            reverb: n,
            virtualizer: n,
            playback: 1.0
        };

        // helper reset satu slider
        const apply = async (a) => {
            const s = sliders[a];
            if (!s) return;

            s.value = v[a];
            upEqRange(a);

            // mapping ke method EQ
            const map = {
                sub: "setSub",
                m3: "setM3",
                m10: "setM10",
                h30: "setH30",
                h50: "setH50",
                h80: "setH80",
                h90: "setH90",
                bass: "setBass",
                bassBoost: "setBassBoost",
                //   echo: "setEcho",
                reverb: "setReverb",
                virtualizer: "setVirtualizer",
                playback: "setPlayback"
            };

            let fn = map[a];
            if (fn && myEQ[fn]) await myEQ[fn](v[a]);
        };
        // id?
        if (key) {
            apply(key);
        }
        // all
        else {
            Object.keys(v).forEach(apply);

            updateRangeFade();
        }
    }

    values.sub.addEventListener('click',
        () => readEQ('sub'));

    values.m3.addEventListener('click',
        () => readEQ('m3'));

    values.m10.addEventListener('click',
        () => readEQ('m10'));

    values.h30.addEventListener('click',
        () => readEQ('h30'));

    values.h50.addEventListener('click',
        () => readEQ('h50'));

    values.h80.addEventListener('click',
        () => readEQ('h80'));

    values.h90.addEventListener('click',
        () => readEQ('h90'));

    values.bass.addEventListener('click',
        () => readEQ('bass'));

    values.bassBoost.addEventListener('click',
        () => readEQ('bassBoost'));

    values.reverb.addEventListener('click',
        () => readEQ('reverb'));

    values.virtualizer.addEventListener('click',
        () => readEQ('virtualizer'));

    values.playback.addEventListener('click',
        () => readEQ('playback'));

    document.querySelector('#resetEqBtn').addEventListener('click',
        () => readEQ());

    // HELPER FORMAT
    function formatTime(seconds) {
        const date = new Date(null);
        date.setSeconds(seconds);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remaining = Math.floor(seconds % 60);
        if (hours > 0) {
            return `${hours}:${minutes < 10 ? '0': ''}${minutes}:${remaining < 10 ? '0': ''}${remaining}`;
        }
        return `${minutes}:${remaining < 10 ? '0': ''}${remaining}`;
    }

    function formatDate(createdAt) {
        const d = new Date(createdAt);
        const w = '2-digit';
        return d.toLocaleString('id-ID', {
            day: w,
            month: w,
            year: 'numeric',
            hour: w,
            minute: w
        });
    }

    function formatBytes(bytes) {
        if (bytes === 0) return "0 B";
        const fm = ["B",
            "KB",
            "MB",
            "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + " " + fm[i];
    }


    // state event
    const cutNums = {
        // float
        start: 0,
        end: 0,
        // math
        dur: 0,
        // fade val
        fin: 0,
        out: 0
    };

    function updateRangeFade(progress) {
        if (!progress) {
            [fadeInSlider,
                fadeOutSlider,
                fadeInValue,
                fadeOutValue].forEach(e => {
                    e.value = 0;
                    e.textContent = '0.0s';
                    e.style.background = '';
                });
            cutNums.fin = 0;
            cutNums.out = 0;
            return;
        }

        let val = progress.value;
        let pre = parseFloat(val).toFixed(1);
        const p = (val / 30) * 100;

        if (progress === fadeInSlider) {
            fadeInValue.textContent = pre + 's';
            cutNums.fin = +val;
        }

        if (progress === fadeOutSlider) {
            fadeOutValue.textContent = pre + 's';
            cutNums.out = +val;
        }

        progress.style.background = `linear-gradient(90deg, #39ff14 ${p}%, #000 ${p}%)`;
    }

    fadeInSlider.addEventListener('input',
        () => updateRangeFade(fadeInSlider));

    fadeOutSlider.addEventListener('input',
        () => updateRangeFade(fadeOutSlider));

    function applyFadeEffect(player, times, dur) {
        if (!eqEnabled) return;

        let gain = 1;

        if (cutNums.fin > 0 && times < cutNums.fin) {
            gain = times / cutNums.fin;
        }
        if (cutNums.out > 0 && times > dur - cutNums.out) {
            gain = Math.min(gain, (dur - times) / cutNums.out);
        }
        player.volume = Math.max(0, Math.min(1, gain));
    }

    async function playNextTrack() {
        if (playingList.length === 0) return;

        if (isRepeat) return;

        let nextIndex = (currentIndex + 1) % playingList.length;

        await loadTrack?.(nextIndex);
    }

    async function playPrevTrack() {
        if (playingList.length === 0) return;

        if (isRepeat) return;

        const prevIndex = (currentIndex - 1 + playingList.length) % playingList.length;
        await loadTrack?.(prevIndex);
    }

    // UPDATE PROGRESS AUDIO PLAYER
    function renderProgressUI(time, dur) {
        if (!dur || isNaN(dur)) return;

        const p = (time / dur) * 100;
        const gradient = `linear-gradient(to right,
        #fff000 ${p}%,
        #111 ${p}%)`;

        [progressRange,
            progressBorder].forEach(e => {
                e.value = time;
                e.style.background = gradient;
            });

        currentTimes.textContent = formatTime(time);
        currentDurations.textContent = formatTime(dur);
    }

    const fa_play = '<i class="fas fa-play"></i>';
    const fa_pause = '<i class="fas fa-pause"></i>';

    /************* AUDIO EVENTS *************/
    if (audioPlayer) {
        audioPlayer.addEventListener("loadedmetadata", () => {
            const d = audioPlayer.duration;
            [progressRange, progressBorder].forEach(e => {
                e.min = 0;
                e.max = d;
            });

            if (eqEnabled) {
                audioPlayer.volume = 0;
            }

            renderProgressUI(0, d);
        });

        audioPlayer.addEventListener("timeupdate",
            () => {
                const t = audioPlayer.currentTime;
                const d = audioPlayer.duration;
                if (!d || isNaN(d)) return;

                if (eqEnabled) {
                    applyFadeEffect(audioPlayer, t, d);
                }

                renderProgressUI(t, d);
            });

        audioPlayer.addEventListener("play",
            () => {
                isPlaying = true;
                playPauseBtn.innerHTML = fa_pause;

                if (eqEnabled) {
                    myEQ.setPlayback(playbackEQ);
                }

                if (isPreview) {
                    cutAudioPlayer?.pause();
                }
            });

        audioPlayer.addEventListener("pause",
            () => {
                isPlaying = false;
                playPauseBtn.innerHTML = fa_play;
            });

        audioPlayer.addEventListener("ended",
            () => {
                isPlaying = false;
                const d = audioPlayer.duration;
                renderProgressUI(d, d);
                playNextTrack();
            });

        /************* DRAG SEEK *************/
        progressRange.addEventListener("input",
            () => {
                if (isNaN(audioPlayer.duration)) return;
                const t = +progressRange.value;
                audioPlayer.currentTime = t;
                audioPlayer.muted = true;
            });

        progressRange.addEventListener("touchend",
            () => {
                if (isNaN(audioPlayer.duration)) return;
                const t = +progressRange.value;

                const d = audioPlayer.duration;

                audioPlayer.muted = false;

                renderProgressUI(t, d);
            });
    }

    let animId = null;
    let isRunning = false;
    let tmr = 0;
    let dir = 1;
    function visualizer(action = "start",
        mode = "wave") {

        const canvas = document.querySelector('#canvas-visualizer');
        const ctx = canvas.getContext("2d");

        const gap = 12;
        function draw() {
            if (!isRunning) return;

            const hg = canvas.height;
            const v = 0.5;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < gap; i++) {

                const index = dir === v ? gap - 1 - i: i;
                let h;

                if (mode === "wave") {
                    h = (Math.sin(tmr + index * v) * v + v) * hg;
                } else if (mode === "pulse") {
                    h = Math.abs(Math.sin(tmr + index)) * hg;
                } else {
                    h = Math.random() * hg * 0.8;
                }

                const x = i * (gap * 2) + 10;
                const y = canvas.height - h;

                ctx.fillStyle = "#00ffcc";
                ctx.fillRect(x, y, gap, h);
            }

            tmr += 0.06;
            if (tmr > Math.PI * 2) {
                tmr = 0;
                dir *= -1;
            }

            animId = requestAnimationFrame(draw);
        }
        // CONTROL
        if (action === "start") {
            if (isRunning) return;
            isRunning = true;
            draw();
        }

        if (action === "stop") {
            isRunning = false;
            cancelAnimationFrame(animId);
            animId = null;
        }
    }

    // update slider audio
    function updateRangePreview() {
        if (!audioProgres && cutAudioPlayer || isNaN(cutAudioPlayer.duration)) {
            return;
        }
        let d = cutAudioPlayer.duration;
        let start = cutNums.start || 0;
        let end = cutNums.end || d;
        let progress = +audioProgres.value || 0;

        const a = 100;
        const s = (start / d) * a;
        const e = (end / d) * a;
        const c = (progress / d) * a;

        // Gradient untuk tiga zona:
        audioProgres.style.background = `
        linear-gradient(to right,
        #111 ${s}%,
        #fff ${s}%,
        #fff ${c}%,
        #111 ${c}%,
        #111 ${e}%,
        #111 ${e}%)
        `;
    }

    async function oneDecoded() {
        // data null?
        if (!areData) throw "No audio source";

        // ready?
        if (codData) return;

        // decode null =>
        if (!isDecode) try {
            isDecode = true;
            const x = new AudioContext();
            console.warn('mencoba decode...');
            codData = await x.decodeAudioData(areData.slice(0));
        } catch {
            isDecode = false;
        } finally {
            if (codData) {
                isDecode = false;
                console.log('selesai decode');
            }
        }
    }

    if (cutAudioPlayer) {
        cutAudioPlayer.addEventListener('loadedmetadata', () => {
            if (eqEnabled) {
                cutAudioPlayer.volume = 0;
            }
            updateRangePreview();
        });

        cutAudioPlayer.addEventListener('timeupdate',
            () => {
                if (isNaN(cutAudioPlayer.duration)) return;
                let t = cutAudioPlayer.currentTime;
                audioProgres.value = t;

                const startGain = t - cutNums.start;

                const endGain = cutNums.end - cutNums.start;

                if (eqEnabled) {
                    applyFadeEffect(cutAudioPlayer, startGain, endGain);
                }

                updateRangePreview();

            });

        cutAudioPlayer.addEventListener('play',
            () => {
                isPreview = true;
                audioBtn.innerHTML = fa_pause;
                visualizer('start', 'wave');

                if (eqEnabled) {
                    myEQ.setPlayback(playbackEQ);
                }

                if (isPlaying) {
                    audioPlayer?.pause();
                }

                if (!codData) {
                    oneDecoded();
                }
            });

        cutAudioPlayer.addEventListener('pause',
            () => {
                isPreview = false;
                audioBtn.innerHTML = fa_play;

                if (eqEnabled && cutAudioPlayer.fadeInterval) clearInterval(cutAudioPlayer.fadeInterval);

                if (isRunning) {
                    visualizer('stop');
                }
            });

        // EVENT PLAY (PREVIEW)
        audioBtn.addEventListener('click',
            () => {
                if (isNaN(cutAudioPlayer.duration)) return;
                if (!isPreview) {
                    cutAudioPlayer.play();
                } else {
                    cutAudioPlayer.pause();
                }
            });

        document.querySelector('#startPreviewBtn').addEventListener('click',
            () => {
                if (isNaN(cutAudioPlayer.duration)) return;

                cutAudioPlayer.currentTime = +startSlider.value;
                cutAudioPlayer.play();
            });

        // Event geser slider audio
        audioProgres.addEventListener("input",
            () => {
                if (isNaN(cutAudioPlayer.duration)) return;

                const pro = +audioProgres.value;

                if (pro < cutNums.start) {
                    audioProgres.value = cutNums.start;
                    return;
                }
                if (pro > cutNums.end) {
                    audioProgres.value = cutNums.end;
                    return;
                }

                cutAudioPlayer.currentTime = pro;
                updateRangePreview();

            });
    }

    const dualTrack = document.querySelector('.dual-slider-track');
    function applyHighlight() {
        let s = document.createElement('style');
        s.textContent = `
        .dual-slider-track::after {
        left: var(--highlight-left, 0%);
        width: var(--highlight, 0%);
        }`;
        document.head.appendChild(s);
    }

    function updateRangeTrim() {
        // update slider select
        let start = +startSlider.value;
        let end = +endSlider.value;

        cutStartTimes.textContent = formatTime(start);
        cutEndTimes.textContent = formatTime(end);

        // save untuk next event
        cutNums.start = start;
        cutNums.end = end;
        cutNums.dur = Math.max(0,
            end - start);

        duresult.forEach(e =>
            e.textContent = formatTime(end - start));

        // apply ui
        let min = +startSlider.min;
        let max = +startSlider.max;
        let minVal = Math.min(cutNums.start,
            cutNums.end);
        let maxVal = Math.max(cutNums.start,
            cutNums.end);
        const startPE = ((minVal - min) / (max - min)) * 100;
        const endPE = ((maxVal - min) / (max - min)) * 100;

        const set = (post = '',
            percent = ``) => {
            dualTrack.style.setProperty(post,
                percent);
        };

        set('--start',
            `${startPE}%`);
        set('--end',
            `${endPE}%`);

        set('--left',
            `${startPE}%`);
        set('--width',
            `${endPE - startPE}%`);

        // update posisi highlight
        set('--left',
            `${startPE}%`);
        set('--width',
            `${endPE - startPE}%`);
        set('--highlight',
            `${endPE - startPE}%`);

        // update pseudo element
        set('--highlight-left',
            `${startPE}%`);

        updateRangePreview();
    }

    endSlider.addEventListener('input',
        () => {
            // isPreview? block
            if (isPreview) {
                updateRangeTrim();
                return;
            }

            let end = +endSlider.value;

            // fixed di start
            if (end <= cutNums.start) {
                endSlider.value = cutNums.start;
                return;
            }

            audioProgres.value = end;

            currentPG.textContent = formatTime(end);

            updateRangeTrim();
        });

    startSlider.addEventListener('input',
        () => {
            let start = +startSlider.value;

            // fixed di end
            if (start >= cutNums.end) {
                startSlider.value = cutNums.end;
                return;
            }

            if (cutAudioPlayer.currentTime < start) {
                cutAudioPlayer.currentTime = start;
                audioProgres.value = start;
            }

            currentPG.textContent = formatTime(start);

            updateRangeTrim();
        });

    let timeStep = 1;
    function adjustStart(delta) {
        let step = delta * timeStep; // ikut format
        let newStart = cutNums.start + step;
        if (newStart < 0) newStart = 0;
        if (newStart >= cutNums.end) {
            newStart = cutNums.start - timeStep; // jaga jarak minimal
        }
        startSlider.value = newStart.toFixed(2);

        if (cutAudioPlayer.currentTime < cutNums.start) {
            cutAudioPlayer.currentTime = newStart;
            audioProgres.value = newStart;
        }

        if (!isPreview) {
            currentPG.textContent = formatTime(cutNums.start);
        }

        updateRangeTrim();
    }

    function adjustEnd(delta) {
        let step = delta * timeStep;
        let max = +endSlider.max || 0;
        let newEnd = cutNums.end + step;
        if (newEnd > max) newEnd = max;
        if (newEnd <= cutNums.start) {
            newEnd = cutNums.end + timeStep;
        }
        endSlider.value = newEnd.toFixed(2);

        updateRangeTrim();
    }

    const dtn = {
        startMin: document.querySelector('#startMinusBtn'),
        startPlus: document.querySelector('#startPlusBtn'),
        endMin: document.querySelector('#endMinusBtn'),
        endPlus: document.querySelector('#endPlusBtn')
    };

    // Event tombol FORMAT
    dtn.startMin.addEventListener("click",
        () => adjustStart(-1));
    dtn.startPlus.addEventListener("click",
        () => adjustStart(1));
    dtn.endMin.addEventListener("click",
        () => adjustEnd(-1));
    dtn.endPlus.addEventListener("click",
        () => adjustEnd(1));

    let isStep = false;
    formatTimesBtn.addEventListener('click', () => {
        if (timeStep === 1) isStep = false;

        isStep = !isStep;
        timeStep = isStep ? 5: 1;

        formatTimesBtn.textContent = isStep ? `${timeStep}s`: `${timeStep}s`;
    });

    let isProcessing = false;
    function isEdit(process = false) {
        document.querySelectorAll(".load-add-spinner")
        .forEach(el => el.classList.remove("active"));

        const open = document.querySelector("#openSetupBtn i").classList;
        const xt = document.querySelector("#extrackAudioBtn i").classList;

        const lock = "fa-lock";
        const pen = "fa-pen";
        const cut = "fa-cut";

        open.remove(lock,
            pen);
        xt.remove(lock,
            cut);

        open.add(process ? pen: lock);
        xt.add(process ? cut: lock);

        preEdit.classList.toggle("active",
            process);

        isProcessing = false;
    }

    // GLOBAL RESET ACTIVITY EDIT
    const inputIds = {
        name: document.querySelector('#fileNameInput'),
        title: document.querySelector('#titleNameInput'),
        artist: document.querySelector('#artistNameInput'),
        album: document.querySelector('#albumNameInput'),
        albumArtist: document.querySelector('#albumArtistInput'),
        genre: document.querySelector('#genreInput'),
        composer: document.querySelector('#composerInput'),
        publisher: document.querySelector('#publisherInput'),
        trackNo: document.querySelector('#trackNumberInput'),
        totalTrack: document.querySelector('#totalTrackInput'),
        discNo: document.querySelector('#discNumberInput'),
        totalDisc: document.querySelector('#totalDiscInput'),
        key: document.querySelector('#keyInput'),
        bpm: document.querySelector('#bpmInput'),
        year: document.querySelector('#yearInput'),
        sourceUrl: document.querySelector('#sourceUrlInput'),
        comment: document.querySelector('#commentInput'),
        lyrics: document.querySelector('#lyricsInput'),
        // UI
        preTitle: document.querySelector('#preTitle'),
        preArtist: document.querySelector('#preArtist')
    };

    let durent = [durationPG,
        cutEndTimes];

    function generateUniqueId() {
        asCounter++;
        return asCounter;
    }

    function failCover() {
        apcx.forEach(e => {
            e.src = '';
            e.style.visibility = 'hidden';
        });

        if (albumArtInput) {
            albumArtInput.value = '';
            const dt = new DataTransfer();
            albumArtInput.files = dt.files;
        }
        return;
    }

    async function resetActivityEdit() {
        try {
            isProcessing = false;
            isPreview = false;
            cutAudioPlayer.pause();
            cutAudioPlayer.currentTime = 0;
            audioBtn.innerHTML = fa_play;

            const s = cutAudioPlayer.src;
            if (s && s.startsWith('blob:')) {
                URL.revokeObjectURL(s);

                cutAudioPlayer.src = '';
                cutAudioPlayer.dataset.cutId = '';
                delete cutAudioPlayer.dataset.cutId;
                console.log("[EDIT] Blob URL revoked.");
            }
        } catch (e) {
            console.warn("[EDIT] gagal membersihkan cutAudioPlayer:", e);
        } finally {
            areData = null;
            codData = null;
            currentCutId = null;
            asCounter = 0;

            timeStep = 1;
            formatTimesBtn.textContent = timeStep + 's';

            startSlider.value = endSlider.value = audioProgres.value = 0;

            startSlider.max = endSlider.max = audioProgres.max = 0;

            audioProgres.style.background = '';

            durent.forEach(e => e.textContent = formatTime(0));

            duresult.forEach(e =>
                e.textContent = formatTime(0));

            // tags
            Object.keys(inputIds).forEach(key => {
                inputIds[key].value = '';
                inputIds[key].textContent = '';
            });

            localStorage.removeItem("dataBase");
            localStorage.clear();

            updateRangeTrim();

            failCover();
        }
    }

    async function injectTags(track) {
        try {
            // ID3____
            inputIds.preTitle.textContent = track.title || track.name || "unknown";

            inputIds.preArtist.textContent = track.artist || "unknown artist";

            Object.keys(track).forEach(k => {
                if (inputIds[k]) inputIds[k].value = track[k] || "";
            });

            const set = (file,
                url) => {
                const dt = new DataTransfer();
                dt.items.add(file);
                albumArtInput.files = dt.files;

                apcx.forEach(e => {
                    e.src = url;
                    e.style.visibility = 'visible';
                });
            };

            let thumb = track.thumbnailUrl || track.thumbnailUrl || "";

            // CASE 0: AUTO FIX typo "mage"
            if (thumb.startsWith("data:mage/")) {
                thumb = thumb.replace("data:mage/", "data:image/");
            }

            // CASE 1.DataURL TANPA MIME (data:;base64)
            if (thumb.startsWith("data:;base64")) {
                console.warn("Fixing DataURL tanpa MIME, JPEG");

                const base64 = thumb.split(",")[1] || "";
                const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
                const blob = new Blob([bytes], {
                    type: "image/jpeg"
                });

                const file = new File([blob], "cover.jpg", {
                    type: "image/jpeg"
                });

                const obj = URL.createObjectURL(blob);

                set(file, obj);
            }

            // CASE 2. Normal data:image/*
            if (thumb.startsWith("data:image/")) {
                const res = await fetch(thumb);
                const blob = await res.blob();

                const mime = blob.type || "image/jpeg";
                const ext = mime.split("/")[1] || "jpeg";

                const file = new File([blob], `cover.${ext}`, {
                    type: mime
                });

                set(file, thumb);
            }
            // CASE 3. URL biasa
            let res;
            try {
                res = await fetch(thumb, {
                    mode: "cors"
                });
                if (!res.ok) failCover();
            } catch (e) {
                return failCover();
            }

            let blob = await res.blob();

            // CASE 4.blob tanpa MIME > paksa jpg
            if (!blob.type || blob.type.trim() === "") {
                console.warn("Blob tanpa MIME cvt JPEG");
                blob = new Blob([await blob.arrayBuffer()], {
                    type: "image/jpeg"
                });
            }

            const ext = blob.type.split("/")[1] || "jpeg";
            const file = new File([blob], `cover.${ext}`, {
                type: blob.type
            });

            const objURL = URL.createObjectURL(blob);

            set(file, objURL);

            // CASE 4.Tolak SVG
            if (thumb.includes("data:image/svg+xml")) {
                albumArtInput.value = '';
                const emptyTransfer = new DataTransfer();
                albumArtInput.files = emptyTransfer.files;
                console.log("✓ Album art telah direset ke default.");
            }

        } catch (err) {

            console.warn("[EDIT] COVER ERROR", err);
            failCover();
        }

        localStorage.setItem("dataBase", track.id);

    }

    // INJECT METADATA
    async function injectData(track) {
        await resetActivityEdit();
        try {
            isProcessing = true;

            // PREPARING AUDIO___
            const blob = new Blob([track.fileData], {
                type: track.type || "audio/mpeg"
            });

            const obj = URL.createObjectURL(blob);

            // STATE: TRANSFER DECODE
            areData = await blob.arrayBuffer();

            // PLAYER LOAD
            cutAudioPlayer.src = obj;
            cutAudioPlayer.preload = "metadata";
            cutAudioPlayer.load();

            // safty double click
            currentCutId = track.id;

            visualizer('start', 'wave');

            // Ambil durasi
            cutAudioPlayer.onloadedmetadata = () => {
                const d = cutAudioPlayer.duration;
                if (d >= 540) {
                    isEdit(false);
                    resetActivityEdit();
                    showToast('maximum duration limit is around 9 minutes');
                    return;
                }

                startSlider.max = endSlider.max = audioProgres.max = d;

                endSlider.value = d;

                startSlider.value = audioProgres.value = 0;

                durent.forEach(e => e.textContent = formatTime(d));

                applyHighlight();

                updateRangeTrim();
            };

            // timeupdate
            cutAudioPlayer.ontimeupdate = () => {
                const c = cutAudioPlayer.currentTime;

                if (c >= +endSlider.value) {
                    cutAudioPlayer.pause();
                    cutAudioPlayer.currentTime = +startSlider.value;
                }

                audioProgres.value = c;
                currentPG.textContent = formatTime(c);
            };
            visualizer('stop');
            
            await injectTags(track);

            isEdit(true);

        } catch (e) {
            console.error("[EDIT] Gagal masuk mode Edit:", e);
            resetActivityEdit();
            isEdit(false);
            showToast(e, "yellow");
        }
    }

    // RESET DURASI & PROGRESS
    document.querySelector('#resetRowProgress').addEventListener('click',
        async (event) => {
            event.stopPropagation();

            cutAudioPlayer.pause();
            cutAudioPlayer.currentTime = 0;

            timeStep = 1;
            formatTimesBtn.textContent = timeStep + 's';

            const d = cutAudioPlayer.duration;

            endSlider.value = d;

            endSlider.max = startSlider.max = audioProgres.max = d;

            audioProgres.value = startSlider.value = 0;

            currentPG.textContent = cutStartTimes.textContent = formatTime(0);

            durent.forEach(e => e.textContent = formatTime(d));

            duresult.forEach(e => e.textContent = formatTime(d));

            updateRangeTrim();

            showToast('✓ Return duration');
        });

    // RESET INPUT METADATA ID3
    document.querySelector('#resetInputBtn').addEventListener('click',
        (event) => {
            event.stopPropagation();

            Object.keys(inputIds).forEach(key => {
                inputIds[key].value = '';
            });

            inputIds.preTitle.textContent = 'unknown';
            inputIds.preArtist.textContent = 'unknown artist';

            showToast('✓ Clearing input');
        });

    // RESET INPUT METADATA IMG
    document.querySelector('#deleteCoverBtn').addEventListener('click',
        (event) => {
            event.stopPropagation();
            failCover();
        });

    resetEditBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (isDecode) return showToast('almost decode...');

        if (isProcessing) {
            document.querySelectorAll(".load-add-spinner").forEach(e => e.classList.remove('active'));
        }

        resetActivityEdit();
        isEdit(false);
    });

    async function setDominant(imgUrl) {
        if (!imgUrl) return;

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imgUrl;

        await img.decode().catch(() => null);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);

        const art = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let r = 0,
        g = 0,
        b = 0,
        count = 0;

        for (let i = 0; i < art.length; i += 40) {
            r += art[i];
            g += art[i + 1];
            b += art[i + 2];
            count++;
        }

        if (count === 0) return;
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);

        const paint = `rgb(${r}, ${g}, ${b})`;
        // Hitung luminance untuk warna teks
        let light = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        let text = light > 0.5 ? "#000": "#fff";

        document.querySelectorAll(".active-dominan-color").forEach(e => {
            e.style.transition = "background 1s ease";
            e.style.background = `${paint}`;
            e.querySelectorAll("*").forEach(txt => (txt.style.color = text));
        });
    }

    function resetPopup() {
        ['#popAlbum',
            '#popAlbumArtist',
            '#popGenre',
            '#popComposer',
            '#popPublisher'
        ].forEach(id =>
            document.querySelector(id).textContent = ': unknown');

        ['#popTrackNumber',
            '#popTotalTrack',
            '#popDiscNumber',
            '#popTotalDisc',
            '#popKey',
            '#popBpm',
            '#popYear',
            '#popFileSize',
            '#popFileFormat'
        ].forEach(id =>
            document.querySelector(id).textContent = ': -');

        ['#popSourceUrl',
            '#popComment',
            '#popLyrics']
        .forEach(id => document.querySelector(id).textContent = ': Not found');

        document.querySelectorAll('.popTitle,.popArtist')
        .forEach(e => e.textContent = 'unknown');

        document.querySelectorAll(".all-cover-art").forEach(e => {
            e.innerHTML = `${svgn}`;
            e.style.backgroundImage = '';
        });

        document.querySelectorAll(".active-dominan-color").forEach(e => {
            e.style.transition = "background 1s ease";
            e.style.background = "#fff";
            e.querySelectorAll("*").forEach(txt => (txt.style.color = "#000"));
        });
    }

    function popupTrackInfo(track, img) {
        if (!track || playingList.length === 0) return resetPopup();

        const set = (id, val = '') => {
            document.querySelector(id).textContent = ' : ' + val;
        };

        // title & artist (NodeList)
        document.querySelectorAll('.popTitle')
        .forEach(e => e.textContent = track.title || 'unknown');
        document.querySelectorAll('.popArtist')
        .forEach(e => e.textContent = track.artist || 'unknown');

        // mapping auto
        Object.entries({
            popAlbum: track.album,
            popAlbumArtist: track.albumArtist,
            popGenre: track.genre,
            popComposer: track.composer,
            popPublisher: track.publisher,
            popTrackNumber: track.trackNo,
            popTotalTrack: track.totalTrack,
            popDiscNumber: track.discNo,
            popTotalDisc: track.totalDisc,
            popKey: track.key,
            popBpm: track.bpm,
            popYear: track.year,
            popSourceUrl: track.sourceUrl,
            popComment: track.comment,
            popLyrics: track.lyrics,
            popFileSize: formatBytes(track.size),
            popFileFormat: (track.name || track.title || '').split('.').pop()?.toUpperCase() || ''
        }).forEach(([id, val]) => set('#' + id, val));

        document.querySelectorAll(".all-cover-art").forEach(e => {
            e.innerHTML = '';
            e.style.backgroundImage = `url('${img}')`;
        });

        setDominant(img);
    }

    // CLEAR PLAYER UI
    function resetPlayerUI() {
        playingList = [];
        isPlaying = false;
        deactiveSong = null;
        currentIndex = -1;

        [progressRange,
            progressBorder].forEach(e => {
                e.value = 0;
                e.max = 0;
                e.style.background = '';
            });

        [currentTimes,
            currentDurations].forEach(e => e.textContent = formatTime(0));

        if (audioPlayer.src && audioPlayer.src.startsWith('blob:')) {
            URL.revokeObjectURL(audioPlayer.src);
            audioPlayer.src = '';
            audioPlayer.currentTime = 0;
            audioPlayer.pause();

            playPauseBtn.innerHTML = fa_play;
        }

        if (deactiveSong) {

            if ('clearAppBadge' in navigator &&
                navigator.clearAppBadge());
        }

        resetPopup();
    }

    let dbInstance = null;
    function openIndexedDB() {
        if (dbInstance) return Promise.resolve(dbInstance);
        return new Promise((resolve, reject) => {
            const req = indexedDB.open('metadate', 4);
            req.onupgradeneeded = e => {
                const db = e.target.result;
                // AUDIO - VIDEO
                if (!db.objectStoreNames.contains("audioFiles")) {
                    const audio = db.createObjectStore("audioFiles", {
                        keyPath: "id"
                    });
                    audio.createIndex("name", "name", {
                        unique: false
                    });
                }

                if (!db.objectStoreNames.contains("videoFiles")) {
                    const video = db.createObjectStore("videoFiles", {
                        keyPath: "id", autoIncrement: true
                    });
                    video.createIndex("createdAt", "createdAt", {
                        unique: false
                    });
                    video.createIndex("name", "name", {
                        unique: false
                    });
                }
            };

            req.onsuccess = e => {
                dbInstance = e.target.result;
                resolve(dbInstance);
            };

            req.onerror = e => reject(e.target.error);
        });
    }

    // ID PEMUTARAN USE_OF (loadTrack)
    async function getMusikDariDB(id) {
        const db = await openIndexedDB();
        const tx = db.transaction(['audioFiles'],
            'readonly');
        const store = tx.objectStore('audioFiles');
        const req = store.get(id);

        return new Promise((resolve, reject) => {
            req.onsuccess = (event) => {
                const filed = event.target.result;
                if (filed) {
                    resolve(filed);
                } else {
                    console.log('Musik dengan ID tidak ditemukan.');
                    resolve(null);
                }
            };
            req.onerror = async (event) => {
                console.error('Gagal mengambil musik:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // EKSTRAKSI
    function parseTrackInfo(fileName) {
        const cleaned = fileName.replace(/\.(mp3|wav|aac|ogg|m4a|flac)$/i,
            '');
        const parts = cleaned.split(' - ');
        let artist = 'Artis Tidak Diketahui';
        let title = cleaned;
        if (parts.length > 1) {
            artist = parts[0].trim();
            title = parts.slice(1).join(' - ').trim();
        }
        return {
            title,
            artist
        };
    }

    const svgn = `<svg viewBox="-24 -24 72.00 72.00" xmlns="http://www.w3.org/2000/svg" fill="#ffffff"><g stroke-width="0"><rect x="-24" y="-24" width="72.00" height="72.00" rx="0" fill="#222" strokewidth="0"></rect></g> <path fill="none" d="M0 0H24V24H0z"></path> <path d="M12 19c.828 0 1.5.672 1.5 1.5S12.828 22 12 22s-1.5-.672-1.5-1.5.672-1.5 1.5-1.5zm0-17c3.314 0 6 2.686 6 6 0 2.165-.753 3.29-2.674 4.923C13.399 14.56 13 15.297 13 17h-2c0-2.474.787-3.695 3.031-5.601C15.548 10.11 16 9.434 16 8c0-2.21-1.79-4-4-4S8 5.79 8 8v1H6V8c0-3.314 2.686-6 6-6z"></path></svg>
    `;

    // DEFAULT THUMB - FALLBACK
    const DEFAULT_THUMBNAILS = {
        'fallback': 'data:image/svg+xml;utf8,' + encodeURIComponent(svgn.trim())
    };

    // BY TITLE
    function getThumbByTitle(title) {
        const as = title.toLowerCase();
        for (const key in DEFAULT_THUMBNAILS) {
            if (key === 'fallback') continue;
            if (as.includes(key)) {
                return DEFAULT_THUMBNAILS[key];
            }
        }
        return DEFAULT_THUMBNAILS['fallback'];
    }

    let loadToken = 0;
    async function loadTrack(index) {
        const token = ++loadToken; // cegah race
        const trackMetadata = playingList[index];
        if (!trackMetadata || !trackMetadata.id) {
            console.error("Track metadata invalid");
            return resetPlayerUI();
        }

        let blob = null;

        try {
            const items = await getMusikDariDB(trackMetadata.id);

            if (token !== loadToken) return; // load lama dibatalkan

            if (!items || !items.fileData) {
                showToast(`file music ${trackMetadata.name} missing. Rescan required`, "yellow", 7200);
                await deleteSongUnified(trackMetadata.id, trackMetadata.title); // DB invalid = wipe OK
                return;
            }

            blob = items.fileData;

            if (audioPlayer.src?.startsWith("blob:")) {
                URL.revokeObjectURL(audioPlayer.src);
            }

            const url = URL.createObjectURL(blob);

            currentIndex = index; // update setelah valid
            audioPlayer.src = url;
            await audioPlayer.play().catch(()=> {});

        } catch (err) {
            console.error("[LOAD TRACK ERROR]", err);
            // hanya wipe kalau DB gagal
            if (err?.name === "InvalidStateError" ||
                err?.name === "DataError" ||
                err?.name === "NotFoundError") {
                return await clearAllMusic?.();
            }

            showToast(`error loading ${trackMetadata.name}`, "yellow", 7200);
            resetPlayerUI();

        } finally {
            if (audioPlayer.src) {

                let title = trackMetadata.title || parseTrackInfo(trackMetadata.name);
                let artist = trackMetadata.artist || parseTrackInfo(trackMetadata.name);
                let img = trackMetadata.thumbnailUrl;
                if (!img || img.trim() === '') {
                    img = getThumbByTitle(title);
                }
                // use of delete active song
                deactiveSong = trackMetadata.id;

                popupTrackInfo(trackMetadata, img);
                // media Session______
                if ("mediaSession" in navigator) {
                    navigator.mediaSession.metadata = new MediaMetadata({
                        title: title || "Unknown",
                        artist: artist || "Unknown Artist",

                        artwork: [{
                            src: img, sizes: "96x96", type: "image/jpg"
                        },
                            {
                                src: img, sizes: "128x128", type: "image/jpg"
                            },
                            {
                                src: img, sizes: "192x192", type: "image/jpg"
                            },
                            {
                                src: img, sizes: "256x256", type: "image/jpg"
                            },
                            {
                                src: img, sizes: "384x384", type: "image/jpg"
                            },
                            {
                                src: img, sizes: "512x512", type: "image/jpg"
                            },
                        ]
                    });

                    // handler
                    navigator.mediaSession.setActionHandler("play", () =>
                        audioPlayer.play());

                    navigator.mediaSession.setActionHandler("pause", () => audioPlayer.pause());

                    navigator.mediaSession.setActionHandler('seekbackward', (event) => {
                        audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime + (event.seekOffset || -10));
                    });

                    navigator.mediaSession.setActionHandler('seekforward', (event) => {
                        audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + (event.seekOffset || 10));
                    });

                    navigator.mediaSession.setActionHandler("previoustrack", playPrevTrack);
                    navigator.mediaSession.setActionHandler("nexttrack", playNextTrack);
                } else {
                    if ('clearAppBadge' in navigator && navigator.clearAppBadge());
                }

                if ("setAppBadge" in navigator && navigator.setAppBadge(1));

                // last list ?? last track
                audioPlayer.onended = () => {
                    blob = null;
                    console.warn('[PLAYING] last blob:', blob);
                };
            }
        }
    }

    playPauseBtn.addEventListener('click', () => {
        if (playingList.length === 0) return;

        isPlaying = !isPlaying ? audioPlayer.play(): audioPlayer.pause();

        if ('clearAppBadge' in navigator &&
            navigator.clearAppBadge());
    });

    nextBtn.addEventListener('click',
        playNextTrack);

    prevBtn.addEventListener('click',
        playPrevTrack);

    repeatBtn.addEventListener('click',
        () => {
            // toggle state
            isRepeat = !isRepeat;
            audioPlayer.loop = isRepeat;

            if (isRepeat) {
                repeatBtn.classList.add('active');
            } else {
                repeatBtn.classList.remove('active');
                isRepeat = false;
            }
        });

    const musicMessage = `<ol class="empty-message">
    <li class="flow-step">
    <i class="fas fa-folder-open"></i>
    <label>
    <span>Click Add</span>
    <span>add audio files to the page</span></label>
    </li>

    <li class="flow-step">
    <i class="fas fa-play"></i>
    <label class="label-flow">
    <span>Click a list item</span>
    <span>Play the audio as usual</span></label>
    </li>

    <li class="flow-step">
    <i class="fas fa-pen"></i>
    <label class="label-flow">
    <span>Click Edit</span>
    <span>Select the track you want to edit</span>
    </label>
    </li>

    <li class="flow-step">
    <i class="fas fa-cut"></i>
    <label class="label-flow">
    <span>Create New Audio File</span>
    <span>Start the editing process and wait until it’s complete</span></label>
    </li>
    </ol>
    <div class="article-info">© 2024 - 2025</div>`;

    function updateStateId(list,
        track) {
        let isDen = false;
        let role;
        let startX = 0;

        const sd = 'show-delete';

        list.addEventListener('touchstart',
            (e) => {
                startX = e.touches[0].clientX;
            });

        list.addEventListener('touchmove',
            (e) => {
                const dfx = e.touches[0].clientX - startX;
                if (Math.abs(dfx) > window.innerWidth * 0.5) {
                    isDen = !isDen;
                    list.classList.toggle(sd, isDen);
                    startX = e.touches[0].clientX;
                }
            });

        const hideBtn = () => {
            if (isDen) {
                isDen = false;
                list.classList.remove(sd);
                help.classList.remove(sd);
            }
        };

        const handle = () => {
            clearTimeout(role);
            role = setTimeout(hideBtn, 0);
        };

        window.addEventListener('scroll',
            handle,
            {
                passive: true
            });

        list.querySelector('.delete-btn').addEventListener('click',
            async (e) => {
                e.stopPropagation();
                await deleteSongUnified?.(track.id, track.title);
            });

        helpDeleteBtn?.addEventListener('click',
            () => {
                isDen = !isDen;
                musicList.querySelectorAll('.music-item').forEach(e => e.classList.toggle(sd, isDen));

                helpDeleteBtn.classList.toggle(sd, isDen);
            });
    }

    /******* RENDER MUSIC ******/
    function renderMusic(musicList, list) {
        musicList.innerHTML = '';

        if (!list || list.length === 0) {
            musicList.innerHTML = musicMessage;
            return;
        }
        list.forEach(track => {
            const listItem = document.createElement('li');
            listItem.classList.add('music-item');
            listItem.dataset.fileId = track.id;

            const title = track.title || 'Unknown';
            const artist = track.artist || 'Unknown';
            const img = track.thumbnailUrl?.trim() || '';
            const has = img !== '';
            const thumbnail = has
            ? `<div class="thumbnail" style="background-image: url('${img}');"></div>`: `<div class="thumbnail">${svgn}</div>`;

            listItem.innerHTML = `
            <div class="track-inner">
            <button class="delete-btn"><i class="fas fa-times"></i></button>
            ${thumbnail}
            </div>
            <div class="track-info">
            <span class="track-title">${title}</span>
            <span class ="track-artist">${artist}</span>
            </div>
            <div class="add-cut-audio-btn"><i class="fas fa-pen"></i>
            <div class="load-add-spinner"></div></div>
            `;
            // Klik utama untuk play track
            listItem.addEventListener('click',
                async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    playingList = list;
                    const index = playingList.findIndex(item => item.id === track.id);

                    if (!track.fileData && index === -1) {
                        showToast('The song cannot be found in the current list. Please rescan the folder!', "yellow");
                        await clearAllMusic?.();
                        return;
                    }
                    await loadTrack(index);
                });

            listItem.querySelector(".add-cut-audio-btn").addEventListener('click',
                async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isProcessing) return;
                    if (currentCutId === track.id) {
                        console.warn(`[CUT+] ${track.name} sudah ditambahkan`);
                        return;
                    }

                    if (track.fileData) {
                        // proses...
                        listItem.querySelector(".load-add-spinner").classList.add('active');
                        await injectData(track);
                    }
                });

            musicList.appendChild(listItem);
            // Gesture hapus
            updateStateId(listItem,
                track);
        });
    }

    function groupBy(list, key) {
        return list.reduce((acc,
            item) => {
            const value = item[key] || 'Unknown';
            if (!acc[value]) acc[value] = [];
            acc[value].push(item);
            return acc;
        },
            {});
    }

    function renderByCategory(category) {
        musicList.innerHTML = '';
        if (!musicFiles || musicFiles.length === 0) {
            musicList.innerHTML = musicMessage;
            return;
        }
        [musicBtn,
            artistBtn,
            albumBtn,
            genreBtn].forEach(e => e.classList.remove('active'));

        const btn = `#${category}Btn`;
        document.querySelector(btn).classList.add('active');

        // Jika normal
        if (category === 'music') {
            renderMusic(musicList, musicFiles);
            return;
        }

        // group by kategori
        const grouped = groupBy(musicFiles, category);

        Object.entries(grouped).forEach(([key, group]) => {
            // label kategori
            const header = document.createElement('div');
            header.className = 'category-name';
            header.textContent = `${category.toUpperCase()} : ${key}`;
            musicList.appendChild(header);

            // Render setiap grup
            const sublist = document.createElement('ul');
            renderMusic(sublist, group);
            musicList.appendChild(sublist);
        });
    }

    musicBtn.addEventListener('click',
        () => renderByCategory('music'));
    artistBtn.addEventListener('click',
        () => renderByCategory('artist'));
    albumBtn.addEventListener('click',
        () => renderByCategory('album'));
    genreBtn.addEventListener('click',
        () => renderByCategory('genre'));

    function debounce(fn,
        delay = 250) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args),
                delay);
        };
    }

    function setSearchUI(hasInput) {
        const btn = [repeatBtn,
            opqBtn,
            filterBtn];

        btn.forEach(e => e.style.display = hasInput ? "none": "flex");

        clearSearchBtn.style.display = hasInput ? "flex": "none";
    }

    function runSearch(term = "") {
        const searchTerm = term.trim().toLowerCase();
        const hasInput = searchTerm.length > 0;

        setSearchUI(hasInput);

        if (!hasInput) {
            renderMusic(musicList, musicFiles);
            return;
        }

        const listFil = musicFiles.filter(track => {
            const info = parseTrackInfo(track.name);
            return (
                info.title.toLowerCase().includes(searchTerm) ||
                info.artist.toLowerCase().includes(searchTerm)
            );
        });

        renderMusic(musicList, listFil);
    }

    // versi debounce untuk input ketikan
    const handleSearch = debounce(() => runSearch(searchInput.value), 250);

    searchInput.addEventListener("input", handleSearch);

    searchInput.addEventListener("focus", () => {
        setSearchUI(!!searchInput.value.trim());
    });

    clearSearchBtn.addEventListener("click", () => {
        searchInput.value = "";
        setSearchUI(false);
        renderMusic(musicList, musicFiles);
    });

    function setLoadEl(state = false,
        percent, stageText = '') {
        // progress ring
        const radius = 54;
        const circum = 2 * Math.PI * radius;
        const offset = circum - (percent / 100) * circum;
        percent = Math.max(0,
            Math.min(100,
                Number(percent) || 0));

        const load = document.querySelector('#encodeLoading').classList;
        const wrapper = document.querySelector('#circle-wrapper').classList;
        const enSP = document.querySelector('#encodeSpin').classList;
        const enBR = document.querySelector('#encodeBarss');
        const enPR = document.querySelector('#encodePercent');
        const enSG = document.querySelector('#encodeStage');

        const body = document.body;

        const set = (fil, pe, txt, hide = '') => {
            state ? load.remove('hidden'): load.add('hidden');

            enSP.add('active');

            enBR.style.strokeDashoffset = fil ?? '';
            enSG.textContent = txt ?? '';
            enPR.textContent = pe + '%' ?? '0 %';
            body.style.overflow = hide ?? '';

            if (pe > 0) {
                enSP.remove('active');
                wrapper.add('active');
            }

            if (!state) {
                wrapper.remove('active');
                enSP.remove('active');
            }
        };

        state ? set(offset, percent, stageText, 'hidden'): set();
    }

    // cek clear media
    const dbCount = {
        music: 0,
        video: 0
    };

    function updateDateAudio(count) {
        const total = musicFiles.reduce((sum, file) => sum + (file.size || 0),
            0);
        const readable = formatBytes(total);

        document.querySelector('#countMusic1').textContent = count;

        document.querySelector('#countMusic2').textContent = `${count} song`;

        document.querySelector('#dataSaveDb').textContent = readable;

        dbCount.music = count;

        console.log(`[MEMORI] Total data tersimpan: ${count} song - ${readable} ✓`);
    }

    // GENERATE ID USE MUSIC
    function generateFileId(file) {
        return `${file.name}-${file.lastModified}-${file.size}`;
    }
    function extractNumbers(raw) {
        if (!raw && raw !== 0) return {
            number: "",
            total: ""
        };
        // ambil string dari berbagai kemungkinan struktur
        let val = "";
        // case: object dengan .data atau .text
        try {
            if (typeof raw === "object") {
                if ("data" in raw && raw.data) val = String(raw.data);
                else if ("text" in raw && raw.text) val = String(raw.text);
                else if (Array.isArray(raw) && raw.length) val = String(raw[0]);
                else val = JSON.stringify(raw);
            } else {
                // primitif (string/number)
                val = String(raw);
            }
        } catch (e) {
            val = String(raw);
        }
        val = val.trim();

        // bersihkan surround brackets atau label: mis. "track: 5/12" atau "(5/12)"
        val = val.replace(/^\(|\)$/g, "").replace(/^(track|trk|tp|tp\.)\s*[:\-]?/i, "").trim();

        // slash -> split ??
        if (val.includes("/")) {
            const parts = val.split("/").map(p => p.trim());
            const num = parts[0].replace(/^0+/, "") || "";
            const el = parts[1] ? parts[1].replace(/^0+/, ""): "";
            return {
                number: num,
                total: el
            };
        }
        // format "5 of 12" ??
        const ofMatch = val.match(/(\d+)\s*(?:of|\/)\s*(\d+)/i);
        if (ofMatch) {
            return {
                number: ofMatch[1].replace(/^0+/, ""),
                total: ofMatch[2].replace(/^0+/, "")
            };
        }
        // hanya angka ??
        const onlyNum = val.match(/^\d+$/);
        if (onlyNum) return {
            number: onlyNum[0].replace(/^0+/, ""),
            total: ""
        };
        // fallback: kosongkan
        return {
            number: "",
            total: ""
        };
    }

    // RESOLVER METADATA
    function cleanMetadata(item) {
        const id = item.id || generateFileId(item.name || title);
        const name = item.name || "";
        const title = item.title || "";
        const artist = item.artist || "";
        const album = item.album || "";
        const albumArtist = item.albumArtist || "";
        const genre = item.genre || "";
        const composer = item.composer || "";
        const publisher = item.publisher || "";
        const sourceUrl = item.sourceUrl || "";
        const comment = item.comment || "";
        const lyrics = item.lyrics || "";

        const numTrack = item.track || "";
        const {
            number: numTrackNo,
            total: numTotalTrack
        } = extractNumbers(numTrack);
        const trackNo = item.trackNo || numTrackNo || "";
        const totalTrack = item.totalTrack || numTotalTrack || "";

        const numDisc = item.disc || "";
        const {
            number: numDiscNo,
            total: numTotalDisc
        } = extractNumbers(numDisc);
        const discNo = item.discNo || numDiscNo || "";
        const totalDisc = item.totalDisc || numTotalDisc || "";

        const key = item.key || "";
        const bpm = item.bpm || "";
        const year = item.year || "";
        const duration = item.duration || 0;
        const size = item.size || 0;
        const format = item.format || "audio/mpeg";
        const type = item.type || "audio";
        const thumbnailUrl = item.thumbnailUrl || getThumbByTitle(title);
        const fileData = item.fileData || null;

        return {
            id,
            name,
            title,
            artist,
            album,
            albumArtist,
            genre,
            composer,
            publisher,
            sourceUrl,
            comment,
            lyrics,
            trackNo,
            totalTrack,
            discNo,
            totalDisc,
            key,
            bpm,
            year,
            duration,
            size,
            format,
            type,
            thumbnailUrl,
            fileData
        };
    }

    // parameter default
    async function simpanMusikKeDB(
        id,
        name,
        title,
        artist,
        album,
        albumArtist,
        genre,
        composer,
        publisher,
        sourceUrl,
        comment,
        lyrics,
        trackNo,
        totalTrack,
        discNo,
        totalDisc,
        key,
        bpm,
        year,
        duration,
        size,
        type = 'audio',
        thumbnailUrl,
        fileData
    ) {
        const db = await openIndexedDB();
        const tx = db.transaction(['audioFiles'], 'readwrite');
        const store = tx.objectStore('audioFiles');

        const date = {
            id: id,
            name: name,
            title: title,
            artist: artist,
            album: album,
            albumArtist: albumArtist,
            genre: genre,
            composer: composer,
            publisher: publisher,
            sourceUrl: sourceUrl,
            comment: comment,
            lyrics: lyrics,
            trackNo: trackNo,
            totalTrack: totalTrack,
            discNo: discNo,
            totalDisc: totalDisc,
            key: key,
            bpm: bpm,
            year: year,
            duration: duration || 0,
            size: fileData.size,
            timestamp: new Date(),
            format: fileData.type || 'audio/mpeg',
            type: type,
            thumbnailUrl: thumbnailUrl,
            fileData: fileData
        };

        return new Promise((resolve, reject) => {
            const req = store.put(date);
            req.onsuccess = () => {
                resolve();
            };
            req.onerror = (event) => {
                console.error(`[×] Gagal menyimpan/memperbarui media (${type}) di IndexedDB:`, event.target.error);
                reject(event.target.error);
            };
        });
    }

    // proses file
    async function processFile(file) {
        const id = generateFileId(file);
        const exn = file.name.split('.').pop().toLowerCase();

        const supportedExt = ['mp3',
            'wav',
            'ogg',
            'flac',
            'aac',
            'm4a'];

        if (!supportedExt.includes(exn)) {
            return null; // bukan audio
        }
        // Metadata awal
        let item = {
            id,
            name: file.name,
            title: file.name.split('.').slice(0, -1).join('.'),
            artist: '',
            album: '',
            albumArtist: '',
            genre: '',
            composer: '',
            publisher: '',
            sourceUrl: '',
            comment: '',
            lyrics: '',
            trackNo: '',
            totalTrack: '',
            discNo: '',
            totalDisc: '',
            key: '',
            bpm: '',
            year: '',
            duration: 0,
            size: file.size,
            format: file.type.split('/')[1] || 'audio/mpeg',
            type: 'audio',
            thumbnailUrl: '',
            fileData: file
        };
        try {
            const tag = await new Promise((resolve, reject) => {
                jsmediatags.read(file, {
                    onSuccess: resolve, onError: reject
                });
            });

            if (tag && tag.tags) {
                const tags = tag.tags;
                // console.log("✓ Semua metadata terdeteksi:", tags); // cek tag

                // metadata umum
                item.title = tags.title || item.title;
                item.artist = tags.artist || item.artist;
                item.album = tags.album || item.album;
                item.albumArtist = (tags.TPE2 && tags.TPE2.data) || tags.albumArtist || item.albumArtist;
                item.genre = (tags.TCON && tags.TCON.data) || tags.genre || item.genre;
                item.composer = (tags.TCOM && tags.TCOM.data) || tags.composer || item.composer;
                item.publisher = (tags.TPUB && tags.TPUB.data) || tags.publisher || item.publisher;

                if (tags.WOAS) {
                    item.sourceUrl = tags.WOAS.data || tags.WOAS;
                }
                if (tags.COMM) {
                    const c = tags.COMM.data || {};
                    item.comment =
                    c.text || c.description || "";
                }

                if (tags.lyrics) {
                    item.lyrics = tags.lyrics.lyrics || tags.lyrics;
                } else if (tags.USLT) {
                    item.lyrics = tags.USLT.data || tags.USLT;
                }

                // TRACK
                if (tags.TRCK) {
                    const {
                        number,
                        total
                    } = extractNumbers(tags.TRCK.data ?? tags.TRCK);
                    item.trackNo = number;
                    item.totalTrack = total;
                }
                // DISC
                if (tags.TPOS) {
                    const {
                        number,
                        total
                    } = extractNumbers(tags.TPOS.data ?? tags.TPOS);
                    item.discNo = number;
                    item.totalDisc = total;
                }
                // coba ulang
                if (!item.trackNo && tags.track) {
                    const f = extractNumbers(tags.track);
                    item.trackNo = f.number;
                    item.totalTrack = f.total;
                }
                if (!item.discNo && tags.disc) {
                    const f = extractNumbers(tags.disc);
                    item.discNo = f.number;
                    item.totalDisc = f.total;
                }

                item.key = (tags.TKEY && tags.TKEY.data) || tags.key || item.key;

                item.bpm = (tags.TBPM && tags.TBPM.data) || tags.bpm || item.bpm;

                item.year = tags.year || item.year;

                // cover
                if (tags.picture) {
                    const base64 = btoa(
                        new Uint8Array(tags.picture.data)
                        .reduce((data, byte) => data + String.fromCharCode(byte), '')
                    );
                    item.thumbnailUrl = `data:${tags.picture.format};base64,${base64}`;
                }
            }
        } catch (error) {
            console.warn(`[×] Gagal membaca tag untuk file ${file.name}:`, error.type, error.info);

            item.thumbnailUrl = getThumbByTitle(item.title || file.name);
        }

        // final clean
        const n = await cleanMetadata(item);
        try {
            await simpanMusikKeDB(
                n.id,
                n.name,
                n.title,
                n.artist,
                n.album,
                n.albumArtist,
                n.genre,
                n.composer,
                n.publisher,
                n.sourceUrl,
                n.comment,
                n.lyrics,
                n.trackNo,
                n.totalTrack,
                n.discNo,
                n.totalDisc,
                n.key,
                n.bpm,
                n.year,
                n.duration,
                n.size,
                n.type,
                n.thumbnailUrl,
                file // dataBlob
            );
            return n;
        } catch (e) {
            console.error(`Gagal simpan ${file.name}:`, e);
            return null;
        }
    }

    // LOAD MUISC
    async function loadAudioData() {
        musicFiles = [];
        const db = await openIndexedDB();
        const tx = db.transaction(['audioFiles'], 'readonly');
        const store = tx.objectStore('audioFiles');
        const req = store.getAll();

        return new Promise((resolve,
            reject) => {
            req.onsuccess = async () => {
                const date = req.result;
                const Filed = [];

                date.forEach(item => {
                    if (item.type === 'audio') {
                        // clean metadata
                        const clean = cleanMetadata(item);
                        Filed.push(clean);
                    }
                });

                musicFiles = Filed;

                renderMusic(musicList,
                    musicFiles);

                updateDateAudio(musicFiles.length);
                resolve();
            };

            req.onerror = (event) => {
                console.error('[Db] Gagal mengambil semua media dari IndexedDB:',
                    event.target.error);
                reject(event.target.error);
            };
        });
    }

    async function parseMusic(files) {
        setLoadEl(true, 0, 'rendering audio...');
        try {
            const pushFiles = [];
            let pushCount = 0;

            for (const file of files) {
                const result = await processFile(file);
                if (result) {
                    pushFiles.push(result);
                }
                pushCount++;

                const p = Math.round((pushCount / files.length) * 100);
                setLoadEl(true, p, 'rendering audio...');
            }
            // Jika tidak ada file valid diam
            if (pushFiles.length === 0) {
                event.target.value = '';
                return;
            }

            // Cek duplikat
            const existing = new Set(musicFiles.map(f => f.id));

            const unique = pushFiles.filter(newFile => !existing.has(newFile.id));

            const cek = pushFiles.length - unique.length;

            // umpan balik duplilat file ?
            if (cek > 0) {
                showToast(`${cek} duplicate file(s) skipped. Maybe they already exist?`);
                return;
            }

            // Tambahkan hanya yang baru
            if (unique.length > 0) {
                musicFiles.push(...unique);
                await loadAudioData();
            }
        } catch (error) {
            setLoadEl(false);
            files.target = '';
            console.error('Terjadi kesalahan saat memproses file:', error);
            showToast('An error occurred while processing the audio file. Please try again', "yellow");
        } finally {
            // Reset input
            setLoadEl(false);
            files.target = '';
        }
    }

    let isFileMode = false;

    // tombol ADD → pilih input sesuai mode
    addFileBtn.addEventListener("click", (e) => {
        e.stopPropagation();

        if (isFileMode) {
            folderInput.value = "";
            folderInput.click();
        } else {
            fileInput.value = "";
            fileInput.click();
        }
    });

    // FILE
    fileInput.addEventListener("change",
        (event) => {
            const files = event.target.files;
            if (!files || files.length === 0) return;
            parseMusic(files);
        });

    // FOLDER
    folderInput.addEventListener("change",
        (event) => {
            const files = event.target.files;
            if (!files || files.length === 0) return;
            parseMusic(files);
        });

    // toggle mode
    changeInputBtn.addEventListener("click",
        (event) => {
            event.stopPropagation();

            isFileMode = !isFileMode;

            const i = addFileBtn.querySelector("i").classList;

            const open = "fa-folder-open";
            const close = "fa-folder-closed";

            i.remove(open, close);
            i.add(isFileMode ? close: open);

            changeInputBtn.innerHTML = isFileMode
            ? '<i class="fas fa-folder-closed"></i> Input / Multiple': '<i class="fas fa-folder-open"></i> Input / File';
        });

    async function deleteSongUnified(id,
        title) {
        if (!id) {
            console.error('[DELETE] ID lagu tidak valid');
            showToast('Invalid song ID. Failed to delete!', "yellow");
            return;
        }
        try {
            // Akses hapus dari IndexedDB
            const db = await openIndexedDB();
            const tx = db.transaction(['audioFiles'], 'readwrite');
            const store = tx.objectStore('audioFiles');

            await new Promise((resolve, reject) => {
                const req = store.delete(id);
                req.onsuccess = () => {
                    resolve();
                };
                req.onerror = (event) => {
                    console.error("[DELETE] Gagal menghapus lagu dari IndexedDB:", event.target.error);
                    reject(event.target.error);
                };
            });

            // Cek lagu sedang diputar?
            if (deactiveSong === id) {
                console.warn(title, 'sedang diputar, player dibersihkan');
                resetPlayerUI();
            }

            // Cek lagu di mode edit?
            if (currentCutId === id) {
                isEdit(false)
                resetActivityEdit();
            }

            // Hapus dari daftar di memori
            musicFiles = musicFiles.filter(track => track.id !== id);
            playingList = playingList.filter(track => track.id !== id);

            // update
            renderMusic(musicList, musicFiles);
            updateDateAudio(musicFiles.length);

        } catch (error) {
            console.error("[DELETE] Gagal menghapus lagu:", error);
            showToast('An error occurred while deleting the song', "yellow");
        }
    }

    async function clearAllMusic() {
        console.warn("[DB] CLEAR ALL MUSIC");
        // reset state memori
        musicFiles = [];
        await resetPlayerUI();
        await resetActivityEdit();

        try {
            const db = await openIndexedDB();
            const tx = db.transaction(['audioFiles'], 'readwrite');
            const store = tx.objectStore('audioFiles');

            store.clear();

            await new Promise((resolve, reject) => {
                tx.oncomplete = resolve;
                tx.onerror = e => reject(e.target.error);
                tx.onabort = e => reject(e.target.error);
            });

            await renderMusic(musicList, musicFiles);
            await updateDateAudio(0);

            console.log("[DB] CLEAR SUCCESS");

        } catch (err) {
            console.error("[DB] CLEAR FAILED", err);

            await renderMusic(musicList, musicFiles);
            await updateDateAudio(0);
        }
    }

    document.querySelector('#removeDateMp3').addEventListener('click',
        (e) => {
            e.stopPropagation();
            clearAllMusic();
        });

    // CHECK LIB ENCODER
    function isLameAvailable() {
        return (typeof lamejs !== "undefined" &&
            lamejs && typeof lamejs.Mp3Encoder === "function");
    }

    /******************** FULL OFFLINE CLONE (dynamic, 1:1) (st.new) ********************/
    'use strict';
    (function () {

        let eBite = 64;

        function finalize(outBlob, outFile) {
            setLoadEl(false);

            const url = URL.createObjectURL(outBlob);
            downloadCutAudioLink.href = url;
            downloadCutAudioLink.download = outFile;
            downloadCutAudioLink.click();

            setTimeout(() => {
                URL.revokeObjectURL(url);

                delete downloadCutAudioLink.href;
                delete downloadCutAudioLink.download;
                asCounter = 0;
            }, 1000);

            showToast('succeed ✓');
        }

        async function writerTags(mp3Blob) {
            // GET ID3
            const name = inputIds.name.value.trim() || "";
            const title = inputIds.title.value.trim() || "";
            const artist = inputIds.artist.value.trim() || "";
            const album = inputIds.album.value.trim() || "";
            const albumArtist = inputIds.albumArtist.value.trim() || "";
            const genre = inputIds.genre.value.trim() || "";
            const composer = inputIds.composer.value.trim() || "";
            const publisher = inputIds.publisher.value.trim() || "";
            const trackNumber = inputIds.trackNo.value.trim() || "";
            const totalTrack = inputIds.totalTrack.value.trim() || "";
            const discNumber = inputIds.discNo.value.trim() || "";
            const totalDisc = inputIds.totalDisc.value.trim() || "";
            const key = inputIds.key.value.trim() || "";
            const bpm = inputIds.bpm.value.trim() || "";
            const year = inputIds.year.value.trim() || "";
            const sourceUrl = inputIds.sourceUrl.value.trim() || "";
            const comment = inputIds.comment.value.trim() || "";
            const lyrics = inputIds.lyrics.value.trim() || "";

            const nameExt = name + `_XDA-${generateUniqueId()}.mp3`;

            // READ MP3 BUFFER
            const mp3Buffer = await mp3Blob.arrayBuffer();

            const writer = new ID3Writer(mp3Buffer);

            const trackFormatted = trackNumber && totalTrack ? `${trackNumber}/${totalTrack}`: trackNumber;

            const discFormatted = discNumber && totalDisc ? `${discNumber}/${totalDisc}`: discNumber;

            if (title) writer.setFrame("TIT2", title);
            if (artist) writer.setFrame("TPE1", [artist]);
            if (album) writer.setFrame("TALB", album);
            if (albumArtist) writer.setFrame("TPE2", [albumArtist]);
            if (genre) writer.setFrame("TCON", [genre]);
            if (composer) writer.setFrame("TCOM", [composer]);
            if (publisher) writer.setFrame("TPUB", [publisher]);
            if (trackFormatted) writer.setFrame("TRCK", trackFormatted);
            if (discFormatted) writer.setFrame("TPOS", discFormatted);
            if (key) writer.setFrame("TKEY", key);
            if (bpm) writer.setFrame("TBPM", Number(bpm));
            if (year) writer.setFrame("TYER", year);
            if (sourceUrl) {
                writer.setFrame("WOAS", sourceUrl);
            }

            if (comment) {
                writer.setFrame("COMM", {
                    language: "eng",
                    description: comment,
                    text: comment
                });
            }

            if (lyrics) {
                writer.setFrame("USLT", {
                    description: "",
                    lyrics: lyrics
                });
            }

            if (albumArtInput.files.length > 0) {
                const albumArtFile = albumArtInput.files[0];
                const imageBuffer = await albumArtFile.arrayBuffer();

                writer.setFrame("APIC", {
                    type: 3,
                    data: imageBuffer,
                    description: "Cover Art",
                    mime: albumArtFile.type
                });
            }

            // FINAL TAG
            writer.addTag();

            const blob = writer.getBlob();

            // DOWNLOAD
            finalize(blob, nameExt);
        }

        function floatTo16BitPCM(f32) {
            const len = f32.length;
            const out = new Int16Array(len);

            for (let i = 0; i < len; i++) {
                let s = f32[i];
                if (s > 1) s = 1;
                else if (s < -1) s = -1;

                out[i] = s < 0 ? s * 32768: s * 32767;
            }

            return out;
        }

        async function cloneStart(tx) {
            const red = await tx.startRendering();

            const numChannels = red.numberOfChannels;
            const sampleRate = red.sampleRate;

            const ch0 = red.getChannelData(0);
            const ch1 = numChannels > 1 ? red.getChannelData(1): null;

            const encoder = new lamejs.Mp3Encoder(
                numChannels,
                sampleRate,
                eBite
            );

            const blockSize = 1152 * 2; // MP3 optimal frame multiple
            const total = ch0.length;
            const mp3Data = [];

            let lastYield = 0;

            for (let i = 0; i < total; i += blockSize) {

                const end = Math.min(i + blockSize, total);

                const leftChunk = floatTo16BitPCM(ch0.subarray(i, end));

                const rightChunk = ch1
                ? floatTo16BitPCM(ch1.subarray(i, end)): null;

                const buf = encoder.encodeBuffer(leftChunk, rightChunk);

                if (buf.length) mp3Data.push(buf);

                // Yield UI tiap 40ms
                const now = performance.now();
                if (now - lastYield > 40) {
                    lastYield = now;

                    const percent = Math.round((i / total) * 100);
                    setLoadEl(true, percent, "convert to mp3...");

                    await new Promise(r => setTimeout(r, 0));
                }
            }

            const endBuf = encoder.flush();
            if (endBuf.length) mp3Data.push(endBuf);

            const mp3Blob = new Blob(mp3Data, {
                type: "audio/mp3"
            });

            writerTags(mp3Blob);
        }

        const isEnsure = {
            group: false,
            rate: false,
            duration: false
        };

        async function renderFullClone() {
            const sample = codData.sampleRate;
            const numb = codData.numberOfChannels;

            // by global state
            const start = cutNums.start ?? +startSlider.value;

            const end = cutNums.end ?? +endSlider.value;

            // angka bersih
            const duration = cutNums.dur ?? Math.max(0, end - start);

            const result = duration / playbackEQ;

            const outFrames = Math.ceil(result * sample);

            const tx = new OfflineAudioContext(
                numb,
                outFrames,
                sample
            );

            const source = tx.createBufferSource();
            source.buffer = codData;
            source.playbackRate.value = playbackEQ;

            /* EQ OFF = BYPASS TOTAL */
            if (isEnsure.group && isEnsure.rate) {

                source.connect(tx.destination);
                // TRIM LANGSUNG DI SOURCE
                source.start(0, start, duration);

                await cloneStart(tx);
                return;
            }

            /* EQ ON = FULL MIRROR */
            if (!isEnsure.group && !isEnsure.rate) {
                /* SUB */
                const s1 = biquad(tx, "lowshelf", 60, 0, subEQ);

                /* NOISE */
                const m3 = biquad(tx, "peaking", 320, 1.2, m3EQ);
                const m1 = biquad(tx, "peaking", 1000, 1.2, m10EQ);

                const h3 = biquad(tx, "highshelf", 3000, 0, h30EQ);
                const h5 = biquad(tx, "highshelf", 5000, 0, h50EQ);
                const h8 = biquad(tx, "highshelf", 8000, 0, h80EQ);
                const h9 = biquad(tx, "highshelf", 9000, 0, h90EQ);

                /* BASS */
                const b1 = biquad(tx, "highpass", 90);
                const b2 = biquad(tx, "peaking", 70, 0.5, bassEQ * 10);
                const b3 = biquad(tx, "lowpass", 100);
                const b4 = tx.createGain();
                b4.gain.value = bassEQ;

                /* BASS BOSTER */
                const ba = biquad(tx, "highpass", 110);
                const bb = biquad(tx, "peaking", 92, 0.2, bassBoostEQ * 10);
                const bc = biquad(tx, "lowpass", 140);
                const bg = tx.createGain();
                bg.gain.value = bassBoostEQ;

                /* FX-VIRTUALIZER */
                const de = tx.createDelay(5);
                de.delayTime.value = 0.002 + virtualizerEQ * 0.05;

                const df = tx.createGain();
                df.gain.value = Math.min(0.05, 0.5 + virtualizerEQ);

                const dg = tx.createGain();
                dg.gain.value = virtualizerEQ;

                const vL = tx.createGain();
                vL.gain.value = 1;
                const vR = tx.createGain();
                vR.gain.value = 1;
                const vx = tx.createGain();
                vx.gain.value = virtualizerEQ * 0.5;
                const sp = tx.createChannelSplitter(2);

                /* FX-REVERB */
                const rb = tx.createConvolver();
                rb.buffer = reverbImpulse(tx, 2.5);
                const rx = tx.createGain();
                rx.gain.value = reverbEQ;

                /* FINAL */
                const vo = tx.createGain();
                vo.gain.value = 1 - bassBoostEQ * 0.2;

                const cp = createCompressor(tx);

                const lt = createLimiter(tx);

                const mg = tx.createGain();

                /* FADE */
                const fin = cutNums.fin ?? +fadeInSlider.value;
                const fade = tx.createGain();
                fade.gain.value = 1;
                fade.gain.setValueAtTime(0, 0);
                fade.gain.linearRampToValueAtTime(1, fin);

                const out = cutNums.out ?? +fadeOutSlider.value;

                if (out > 0) {
                    const t = result - out;
                    fade.gain.setValueAtTime(1, t);
                    fade.gain.linearRampToValueAtTime(0, result);
                }

                /* ROUTING */
                source.connect(s1).connect(m3).connect(m1).connect(h3).connect(h5).connect(h8).connect(h9).connect(vo);

                source.connect(b1).connect(b2).connect(b3).connect(b4).connect(lt);

                source.connect(ba).connect(bb).connect(bc).connect(bg).connect(lt);

                lt.connect(mg);

                vo.connect(de).connect(df).connect(de).connect(dg).connect(mg);

                vo.connect(vL).connect(vx);
                vo.connect(vR).connect(vx);
                vx.connect(sp).connect(mg);

                vo.connect(rb).connect(rx).connect(mg);

                vo.connect(cp).connect(mg);

                mg.connect(fade).connect(tx.destination);

                // TRIM LANGSUNG DI SOURCE
                source.start(0, start, duration);

                await cloneStart(tx);
            }
        }

        function ensureExport() {
            if (isEnsure.duration && (!eqEnabled || (isEnsure.group && isEnsure.rate))) {

                const mp3Blob = new Blob([areData], {
                    type: "audio/mp3"
                });
                console.log('skip clone');

                writerTags(mp3Blob);
                return;
            }

            if (isRunning) visualizer('stop');

            console.warn('clone');
            renderFullClone();
        }

        async function ensureDecoded() {
            if (codData) {
                ensureExport();
                return;
            }
            const x = new AudioContext();
            codData = await x.decodeAudioData(areData.slice(0));

            ensureExport();
        }

        function setAppend(state = false) {
            const text = [inputIds.preTitle,
                inputIds.preArtist];

            const set = (color = '', btn = '') => {
                text.forEach(e => e.style.color = color);
                duresult.forEach(e => e.style.color = color);
                resetEditBtn.style.display = btn;
            };

            if (state) {
                getOutEdit.appendChild(preEdit);
                set('#000', 'none')
            } else {
                set('', 'flex')
                listEdit.appendChild(preEdit);
            }
        }

        function ensureExt(calc) {
            setAppend(true);
            let times = formatTime(calc);
            let duration = formatTime(cutAudioPlayer.duration);

            const ensureEQ = [subEQ,
                m3EQ,
                m10EQ,
                h30EQ,
                h50EQ,
                h80EQ,
                h90EQ,
                bassEQ,
                bassBoostEQ,
                virtualizerEQ,
                cutNums.fin,
                cutNums.out];

            const Q = ensureEQ.every(e => e === 0);

            const R = playbackEQ === 1;

            const D = times === duration;

            const btn = document.querySelector('#audio-rate-group');

            if (D && (!eqEnabled || (Q && R))) {
                btn.classList.add('hidden');
                isEnsure.group = Q;
                isEnsure.rate = R;
                isEnsure.duration = D;
                return;
            }
            btn.classList.remove('hidden');
            isEnsure.group = false;
            isEnsure.rate = false;
            isEnsure.duration = false;
        }

        function confrimClone(state = false) {
            setAppend(false);
            confirmBox.classList.add('hidden');

            if (state) {
                setLoadEl(true, 0, 'rendering audio...');
                // START_DEECODE
                ensureDecoded();
            } else {
                document.body.style.overflow = '';
            }
        }
        // NEXT___
        document.querySelector('#okRate').addEventListener('click',
            async (e) => {
                e.stopPropagation();
                if (isDecode) return;

                if (!toastEnabled) {
                    confrimClone(true);
                    return;
                }

                if (!confirm("the encoding process can take quite a long time!")) return;
                confrimClone(true);
            });

        // CANCEL__
        document.querySelector('#cancelRate').addEventListener('click',
            (e) => {
                e.stopPropagation();
                confrimClone(false)
            });

        // ACTION__
        extrackAudioBtn.addEventListener('click',
            async () => {
                if (!isLameAvailable()) {
                    showToast('sorry, it looks like the library is not available at this time.', '', 7200);
                    setLoadEl(false);
                    return;
                }

                if (!areData) {
                    showToast('No audio loaded');
                    return;
                }

                let calc = cutNums.end - cutNums.start;

                if (cutNums.dur === 0 ?? calc === 0) {
                    showToast('no duration obtained, please double check.');
                    return;
                }
                ensureExt(calc);

                confirmBox.classList.remove('hidden');
            });

        // SL_BIRATE
        rateButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                rateButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                eBite = parseInt(btn.dataset.rate, 10);

            });
        });

        albumArtInput.addEventListener('change',
            (event) => {
                const file = event.target.files[0];

                apcx.forEach(e => {
                    if (file) {
                        const url = URL.createObjectURL(file);

                        e.src = url;
                        e.style.visibility = 'visible';
                        // img dimuat, bebaskan URL
                        e.onload = () => {
                            URL.revokeObjectURL(url);
                        };
                    } else {
                        e.src = '';
                        e.style.visibility = 'hidden';
                    }
                });
            });

        // update output preview
        inputIds.title.addEventListener('input',
            () => {
                const title = inputIds.title.value.trim();

                inputIds.preTitle.textContent = title || "";
            });

        inputIds.artist.addEventListener('input',
            () => {
                const artist = inputIds.artist.value.trim();

                inputIds.preArtist.textContent = artist || "";
            });
    }());

    'use strict';
    (function() {
        // Render gallery
        let activeCardId = null;
        let activeVideoId = null;
        let activeVideoURL = null;
        let videoPlayer = null;

        const addVideoBtn = document.querySelector('#addVideoBtn');
        const addVideoInput = document.querySelector('#addVideoInput');

        const openVideoBtn = document.querySelector('#openVideoBtn');
        const openMusicBtn = document.querySelector('#openMusicBtn');
        const openConvertBtn = document.querySelector('#openConvertBtn');

        const convertPageEl = document.querySelector('#convertPageEl');
        const videoPageEl = document.querySelector('#videoPageEl');
        const videoGallery = document.querySelector('#videoGallery');

        const playerSection = document.querySelector('#video-player-section');

        // popup info veo
        const itemInfoVideo = document.querySelector('#itemInfoVideo');
        const videoIdBtn = document.querySelector('#deleteVideoIdBtn');

        const rateVideo = document.querySelectorAll(".rate-veo");

        // parent to return controls
        const currentTimeVd = document.querySelector('#currentTimeVd');
        const durationVd = document.querySelector('#durationVd');

        const downloadVeoLink = document.querySelector('#downloadVeoLink');
        const emptyVideo = document.querySelector('#message-video');

        const veoIn = {
            img: document.querySelector('#itemVideoImg'),
            name: document.querySelector('#itemVideoName'),
            format: document.querySelector('#itemVideoFormat'),
            duration: document.querySelector('#itemVideoDuration'),
            created: document.querySelector('#itemVideoCreated'),
            size: document.querySelector('#itemVideoSize')
        };

        // Thumbnail generator
        async function generateThumbnailFromBlob(blob,
            seekTime = 0) {
            return new Promise((resolve) => {
                const veo = document.createElement('video');
                veo.preload = 'metadata';
                veo.muted = true;
                veo.src = URL.createObjectURL(blob);
                veo.style.position = 'fixed';
                veo.style.left = '-9999px';
                document.body.appendChild(veo);

                const cleanup = () => {
                    try {
                        URL.revokeObjectURL(veo.src);
                    } catch (e) {}
                    try {
                        document.body.removeChild(veo);
                    } catch (e) {}
                };

                veo.addEventListener('loadedmetadata',
                    function onMeta() {
                        veo.removeEventListener('loadedmetadata', onMeta);
                        // choose a safe time
                        const tms = Math.min(seekTime, Math.max(0, veo.duration - 0.5));
                        veo.currentTime = tms;
                        // when seeked, draw to canvas
                        veo.addEventListener('seeked', function onSeeked() {
                            veo.removeEventListener('seeked', onSeeked);
                            try {
                                const canvas = document.createElement('canvas');
                                const w = Math.min(360, veo.videoWidth || 360);
                                const h = Math.round((w * (veo.videoHeight || 360)) / (veo.videoWidth || 360));
                                canvas.width = w;
                                canvas.height = h;
                                const ctx = canvas.getContext('2d');
                                ctx.drawImage(veo, 0, 0, canvas.width, canvas.height);
                                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                                cleanup();
                                resolve(dataUrl);
                            } catch (err) {
                                cleanup();
                                resolve(null);
                            }
                        }, {
                            once: true
                        });

                        // fallback timeout
                        setTimeout(() => {
                            try {
                                cleanup();
                                resolve(null);
                            } catch (e) {
                                resolve(null);
                            }
                        }, 3600);
                    });

                // metadata load fail fallback
                setTimeout(() => {
                    cleanup();
                    resolve(null);
                },
                    7200);
            });
        }

        async function getVideoFromDB(id) {
            const db = await openIndexedDB();
            return new Promise((resolve,
                reject) => {
                const tx = db.transaction("videoFiles",
                    "readonly");
                const store = tx.objectStore("videoFiles");
                const req = store.get(Number(id));

                req.onsuccess = () => resolve(req.result || null);
                req.onerror = e => reject(e.target.error);
            });
        }

        function setBtnState(card,
            playing) {
            const btn = card.querySelector(".playVideoBtn");
            if (!btn) return;

            btn.innerHTML = playing
            ? fa_pause: fa_play;
        }

        function showVideo(card, show) {
            const video = card.querySelector(".video-item");
            const cover = card.querySelector(".video-cover");

            if (!video || !cover) return;

            video.style.opacity = show ? "1": "0";
            cover.style.opacity = show ? "0": "1";
            video.classList.toggle("playing", show);
        }

        let onTimeUpdateRef = null;
        function unbindControls() {
            if (videoPlayer && onTimeUpdateRef) {
                videoPlayer.removeEventListener('timeupdate', onTimeUpdateRef);
            }
            // reset UI time saja
            currentTimeVd.textContent = "00:00";
            durationVd.textContent = "00:00";

            onTimeUpdateRef = null;
        }

        function deactivateActive() {
            if (!videoPlayer) return;
            // pause video lama
            try {
                videoPlayer.pause();
            } catch {}

            // reset tombol card lama
            if (activeVideoId) {
                setBtnState(activeVideoId, false);
                showVideo(activeVideoId, false);
            }
            // revoke URL
            if (activeVideoURL) {
                URL.revokeObjectURL(activeVideoURL);
                activeVideoURL = null;
            }
            // unbind controls
            unbindControls();

            // reset state
            videoPlayer = null;
            activeCardId = null;
            activeVideoId = null;
        }

        function bindControlsToActiveVideo() {
            unbindControls();
            if (!videoPlayer) return;

            // set dur 1× saat metadata siap
            videoPlayer.onloadedmetadata = () => {
                if (isFinite(videoPlayer.duration)) {
                    durationVd.textContent =
                    formatTime(videoPlayer.duration);
                }
            };

            // update current time realtime
            onTimeUpdateRef = () => {
                if (!isFinite(videoPlayer.duration)) return;

                currentTimeVd.textContent =
                formatTime(videoPlayer.currentTime);
            };

            videoPlayer.addEventListener(
                "timeupdate", onTimeUpdateRef);

            // ended
            videoPlayer.onended = () => {
                deactivateActive();
            };
        }

        function cekPlaying() {
            if (isPlaying) audioPlayer?.pause();
            if (isPreview) cutAudioPlayer?.pause();
        }

        async function activateCard(id) {
            const card =
            videoGallery.querySelector(`.video-card[data-id="${id}"]`);
            if (!card) return;

            const video = card.querySelector(".video-item");
            const cover = card.querySelector(".video-cover");

            // TOGGLE SAME CARD
            if (activeCardId === id && videoPlayer) {
                if (videoPlayer.paused) {
                    await videoPlayer.play();
                    setBtnState(card, true);
                } else {
                    videoPlayer.pause();
                    setBtnState(card, false);
                }
                return;
            }

            // OFF OLD
            deactivateActive();

            // SAFTY PLAY
            cekPlaying();

            // GET NEW
            const item = await getVideoFromDB(id);
            if (!item?.blob) return;

            const url = URL.createObjectURL(item.blob);
            activeVideoURL = url;

            video.src = url;
            video.muted = false;

            // set active refs
            activeCardId = id;
            activeVideoId = card;
            videoPlayer = video;

            // transfer
            const wrapper = card.querySelector(".inCardControlsWrapper");
            if (wrapper && playerSection) {
                wrapper.appendChild(playerSection);
            }

            // bind controls
            bindControlsToActiveVideo();

            // play
            try {
                await video.play();

                showVideo(card, true);
                setBtnState(card, true);

                if (cover) cover.style.opacity = "0";

            } catch {
                showVideo(card, false);
                setBtnState(card, false);

                if (cover) cover.style.opacity = "1";
            }
        }

        async function addConvertedMP3ToMusicDB(fileName, blob) {
            const file = new File([blob],
                fileName,
                {
                    type: "audio/mp3"
                });

            const processed = await processFile(file);
            if (!processed) return;

            if (!musicFiles.some(f => f.id === processed.id)) {
                musicFiles.push(processed);
                await loadAudioData();
            }
            console.log("✔ MP3 tersimpan (cover embedded)");
        }

        /// OUTPUT UI
        let veoConvertURL = null;
        async function showOutputUI(blob) {
            if (veoConvertURL) {
                URL.revokeObjectURL(veoConvertURL);
            }

            veoConvertURL = URL.createObjectURL(blob);

            const name = `AT VIDEO - ${veoIn.name.textContent.trim()}`;

            const ext = `${name}_${generateUniqueId()}.mp3`;

            try {
                if (downloadVeoLink) {
                    downloadVeoLink.href = veoConvertURL;
                    downloadVeoLink.download = ext;
                    downloadVeoLink.click();
                }

                await setLoadEl(false);

                await addConvertedMP3ToMusicDB(ext, blob);

            } finally {
                downloadVeoLink.href = '';
                downloadVeoLink.download = '';
            }
        }

        let vBite = 128;
        async function encodeToMp3(videoBitrate, buffer, onProgress) {

            const channels = buffer.numberOfChannels;
            const sampleRate = buffer.sampleRate;

            const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, vBite);

            const mp3Data = [];

            const samplesL = buffer.getChannelData(0);
            const samplesR = channels === 2 ? buffer.getChannelData(1): null;

            const blockSize = 1152;
            const total = Math.ceil(samplesL.length / blockSize);

            const to16Bit = (input) => {
                const out = new Int16Array(input.length);
                for (let i = 0; i < input.length; i++) {
                    let s = Math.max(-1, Math.min(1, input[i]));
                    out[i] = s < 0 ? s * 0x8000: s * 0x7fff;
                }
                return out;
            };

            for (let i = 0; i < total; i++) {
                const start = i * blockSize;

                const left = to16Bit(samplesL.subarray(start, start + blockSize));
                const right = samplesR
                ? to16Bit(samplesR.subarray(start, start + blockSize)): null;

                const buf = mp3encoder.encodeBuffer(left, right);
                if (buf.length) mp3Data.push(buf);

                // PROGRESS
                const percent = 0 + ((i + 1) / total) * 100; // 70–95%
                onProgress?.(percent);

                // YIELD (smooth UI)
                if (i % 10 === 0) {
                    await new Promise(r => setTimeout(r));
                }
            }

            const end = mp3encoder.flush();
            if (end.length) mp3Data.push(end);

            return new Blob(mp3Data, {
                type: "audio/mp3"
            });
        }

        async function embedThumbToMP3(mp3Blob,
            coverDataURL) {
            const mp3Bt = new Uint8Array(await mp3Blob.arrayBuffer());

            // skip kalau sudah ada ID3
            if (
                mp3Bt[0] === 0x49 &&
                mp3Bt[1] === 0x44 &&
                mp3Bt[2] === 0x33
            ) {
                return mp3Blob;
            }

            const base64 = coverDataURL.split(",")[1];
            const imageBt = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

            const mime = coverDataURL.includes("png")
            ? "image/png": "image/jpeg";

            const mimeBt = new TextEncoder().encode(mime);

            // APIC body
            const apicBody = [
                ...mimeBt,
                0x00,
                0x03,
                0x00,
                ...imageBt
            ];

            const size = apicBody.length;

            const apicFrame = new Uint8Array([
                0x41, 0x50, 0x49, 0x43,
                (size >> 24) & 0xff,
                (size >> 16) & 0xff,
                (size >> 8) & 0xff,
                size & 0xff,
                0x00, 0x00,
                ...apicBody
            ]);

            const tagSize = apicFrame.length;

            const id3Header = new Uint8Array([
                0x49, 0x44, 0x33,
                0x03, 0x00,
                0x00,
                (tagSize >> 21) & 0x7f,
                (tagSize >> 14) & 0x7f,
                (tagSize >> 7) & 0x7f,
                tagSize & 0x7f
            ]);

            return new Blob([
                id3Header,
                apicFrame,
                mp3Bt
            ], {
                type: "audio/mp3"
            });
        }

        async function convertVideoToMpeg(item, videoBitrate) {
            try {
                const stored = await getVideoFromDB(item.id);
                if (!stored?.blob) throw new Error("Video tidak ditemukan");

                setLoadEl(true, 0, 'rendering video...');

                const arrayBuffer = await stored.blob.arrayBuffer();

                const ctx = new AudioContext();
                const decoded = await ctx.decodeAudioData(arrayBuffer);

                const offlineCtx = new OfflineAudioContext(
                    decoded.numberOfChannels,
                    decoded.length,
                    decoded.sampleRate
                );

                const src = offlineCtx.createBufferSource();
                src.buffer = decoded;
                src.connect(offlineCtx.destination);
                src.start();

                const buffer = await offlineCtx.startRendering();

                const mp3Blob = await encodeToMp3(videoBitrate, buffer, (percent) => setLoadEl(true, Math.floor(percent), 'video to mp3...'));

                const cover = await generateThumbnailFromBlob(stored.blob, 0);

                const finalMp3 = await embedThumbToMP3(mp3Blob, cover);

                showOutputUI(finalMp3);

            } catch (err) {
                await setLoadEl(false);
                console.error(err);
                showToast(err.message, 'yellow', 7200);
            }
        }

        function blankThumbnailDataURL() {
            const cnv = document.createElement('canvas');
            cnv.width = 320; cnv.height = 180;
            const ctx = cnv.getContext('2d');
            ctx.fillStyle = '#222'; ctx.fillRect(0,
                0,
                cnv.width,
                cnv.height);
            ctx.fillStyle = '#888'; ctx.font = '18px sans-serif';
            ctx.textAlign = 'center'; ctx.fillText('No preview',
                cnv.width/2,
                cnv.height/2 + 6);
            return cnv.toDataURL('image/jpeg');
        }

        function updatePopupVeo(item) {
            videoIdBtn.dataset.id = item.id;

            let fm = '00:00:00';
            if (typeof item.duration === 'number' && !isNaN(item.duration)) {
                fm = new Date(item.duration * 1000).toISOString()
                .substring(11, 19);
            }
            let format = 'Not found';
            if (item.name) {
                const src = item.name;
                const ext = src.match(/\.(\w+)$/);
                if (ext && ext[1]) {
                    format = ext[1].toUpperCase();
                }
            }

            veoIn.img.src = item.thumbnail || blankThumbnailDataURL();

            veoIn.name.textContent = item.name;

            veoIn.format.textContent = format;

            veoIn.duration.textContent = fm;

            veoIn.created.textContent = formatDate(item.createdAt);

            veoIn.size.textContent = formatBytes(item.size);

            videoGallery.style.opacity = 0.2;
            itemInfoVideo.classList.add('active');
        }

        rateVideo.forEach(btn => {
            btn.addEventListener('click', async () => {
                vBite = parseInt(btn.dataset.rate, 10);

                const id = videoIdBtn.dataset.id;
                if (!id) return;

                if (!isLameAvailable()) {
                    showToast('Hello, Im sorry! it looks like the library is not available at this time.', 7200); return;
                }

                if (!toastEnabled) {
                    const item = await getVideoFromDB(id);
                    if (item) convertVideoToMpeg(item);
                    return;
                }

                if (!confirm("the encoding process can take quite a long time!")) return;

                const item = await getVideoFromDB(id);
                if (item) convertVideoToMpeg(item);

                console.log('video bitrate:', vBite, 'kbps');
            });
        });

        document.querySelector('#closeInfoVideoBtn').addEventListener('click',
            (e) => {
                e.stopPropagation();
                itemInfoVideo.classList.remove('active');
                videoGallery.style.opacity = 1;
            });

        async function getAllVideosFromDB() {
            const db = await openIndexedDB();

            return new Promise((resolve,
                reject) => {
                const tx = db.transaction("videoFiles",
                    "readonly");
                const store = tx.objectStore("videoFiles");
                const req = store.getAll();

                req.onsuccess = () => resolve(req.result || []);
                req.onerror = e => reject(e.target.error);
            });
        }

        const videoMessage = `<div id="message-video">
        <li class="flow-step">
        <i class="fas fa-plus"></i>
        <label>
        <span>To add video</span></label>
        </li>
        <li class="flow-step">
        <i class="fas fa-play"></i>
        <label class="label-flow">
        <span>Play the video as usual</span></label>
        </li>
        <li class="flow-step">
        <i class="fas fa-image"></i>
        <label class="label-flow">
        <span>Click on the profile on the top right to view information, delete the video you uploaded / take audio</span>
        </label>
        </li>
        <li class="flow-step">
        <i class="fas fa-cut"></i>
        <label class="label-flow">
        <span>To capture audio,  Wait until the process is complete, the audio will go to the music page and be downloaded on the device</span></label>
        </li>
        </div>`;

        async function renderVideo() {
            const items = await getAllVideosFromDB();
            items.sort((a,
                b) => (b.createdAt || 0) - (a.createdAt || 0));
            videoGallery.innerHTML = '';

            if (!items.length) {
                videoGallery.innerHTML = videoMessage;
                return;
            }

            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'video-card';
                card.dataset.id = item.id;

                // cover
                const cover = document.createElement('div');
                cover.className = 'video-cover';
                const thumb = document.createElement('img');
                thumb.className = 'video-thumb';
                thumb.src = item.thumbnail || blankThumbnailDataURL();

                // hidden video element
                const video = document.createElement('video');
                video.className = 'video-item';
                video.controls = false;
                video.playsInline = true;
                video.preload = 'metadata';
                video.muted = true;

                const play = document.createElement('button');
                play.className = 'playVideoBtn';
                play.innerHTML = fa_play;

                const img = document.createElement('img');
                img.className = 'video-cover-profil';
                img.src = item.thumbnail || blankThumbnailDataURL();

                const player = document.createElement('div');
                player.className = 'inCardControlsWrapper';

                card.appendChild(cover);
                cover.appendChild(thumb);

                card.appendChild(video);
                card.appendChild(play);
                card.appendChild(img);
                card.appendChild(player);

                card.addEventListener('click', (e) => {
                    e.stopPropagation();
                    activateCard(item.id);
                });

                img.addEventListener('click', (e) => {
                    e.stopPropagation();
                    updatePopupVeo(item);
                });

                videoGallery.appendChild(card);
            });
        }

        async function updateDateVideoFiles() {
            const items = await getAllVideosFromDB();
            // total video
            const count = items.length;
            // total size
            const total = items.reduce((acc, item) => acc + (item.size || 0),
                0);

            // update DOM
            document.querySelector('#countVideoEl').textContent = `${count} video`;

            dbCount.video = count;

            document.querySelector('#countSizeVideoEl').textContent = formatBytes(total);
        }

        async function addVideoToDB(item) {
            const db = await openIndexedDB();

            return new Promise((resolve, reject) => {
                const tx = db.transaction("videoFiles", "readwrite");
                const store = tx.objectStore("videoFiles");

                const req = store.put(item);

                req.onsuccess = async () => {
                    console.log(`[DEBUG] video "${item.name}" saved.`);
                    resolve(req.result); // id
                    await renderVideo();
                    await updateDateVideoFiles();
                };

                req.onerror = e => {
                    console.error("IndexedDB save video error:", e.target.error);
                    reject(e.target.error);
                };
            });
        }
        async function isDuplicateVideo(name) {
            const db = await openIndexedDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction("videoFiles", "readonly");
                const idx = tx.objectStore("videoFiles").index("name");
                const req = idx.get(name);

                req.onsuccess = () => resolve(!!req.result);
                req.onerror = e => reject(e.target.error);
            });
        }
        // Read file with progress
        function readFileWithProgress(file, onProgress) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = () => reject(reader.error);
                reader.onabort = () => reject(new Error('aborted'));
                reader.onprogress = (ev) => {
                    if (ev.lengthComputable && onProgress) {
                        onProgress((ev.loaded / ev.total) * 100);
                    }
                };
                reader.onload = () => {
                    onProgress && onProgress(100);
                    resolve(reader.result);
                };
                reader.readAsArrayBuffer(file);
            });
        }

        function getVideoDuration(blob) {
            return new Promise(resolve => {
                const video = document.createElement("video");
                video.preload = "metadata";
                video.src = URL.createObjectURL(blob);
                video.onloadedmetadata = () => {
                    const duration = video.duration;
                    URL.revokeObjectURL(video.src);
                    resolve(duration);
                };
                video.onerror = () => resolve(0);
            });
        }

        function parseVideoAdd() {
            addVideoInput.addEventListener("change",
                async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    addVideoInput.value = "";

                    if (await isDuplicateVideo(file.name)) {
                        showToast(`File "${file.name}" already available!`);
                        return;
                    }

                    setLoadEl(true);

                    try {
                        const arrayBuffer = await readFileWithProgress(
                            file,
                            percent => setLoadEl(true, Math.floor(percent), "rendering video...")
                        );

                        const blob = new Blob([arrayBuffer], {
                            type: file.type || "video/mp4"
                        });

                        const duration = await getVideoDuration(blob);

                        let thumb = await generateThumbnailFromBlob(blob, 0);
                        if (!thumb) thumb = blankThumbnailDataURL();

                        const videoData = {
                            name: file.name,
                            size: file.size,
                            type: file.type,
                            duration,
                            blob,
                            thumbnail: thumb,
                            createdAt: Date.now()
                        };

                        const id = await addVideoToDB(videoData);

                        console.log("[DEBUG] video saved id:", id);

                        await setLoadEl(false);
                    } catch (err) {
                        await setLoadEl(false);
                        console.error("Add video error:", err);
                        alert(err);
                    }
                });
        }

        if (addVideoBtn && addVideoInput) {
            addVideoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                addVideoInput.click();
            });
            parseVideoAdd();
        }

        async function deleteVideoFromDB(id) {
            const db = await openIndexedDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('videoFiles', 'readwrite');
                const store = tx.objectStore('videoFiles');
                const req = store.delete(Number(id));

                req.onsuccess = () => resolve();
                req.onerror = (e) => reject(e.target.error);
            });
        }

        videoIdBtn.addEventListener('click',
            async (e) => {
                e.stopPropagation();

                const id = videoIdBtn.dataset.id;
                if (!id) return;

                await deleteVideoFromDB(id);
                await renderVideo();
                await updateDateVideoFiles();
                await deactivateActive();
                itemInfoVideo.classList.remove('active');
                videoGallery.style.opacity = 1;
            });

        async function clearAllVideo() {
            const db = await openIndexedDB();

            return new Promise((resolve, reject) => {
                const tx = db.transaction("videoFiles", "readwrite");
                const store = tx.objectStore("videoFiles");
                const req = store.clear();

                req.onsuccess = async () => {
                    console.log("[✓] Semua video berhasil dihapus");

                    await renderVideo();
                    await updateDateVideoFiles();
                    await deactivateActive();

                    veoConvertURL = null;

                    document.querySelectorAll('.video-cover, .video-cover-profil').forEach(e => e.src = '');

                    resolve(true);
                };

                req.onerror = e => {
                    console.error("[×] Gagal hapus semua video:", e.target.error);
                    reject(e.target.error);
                };
            });
        }

        document.querySelector('#removeDateMp4').addEventListener('click',
            async (e) => {
                e.stopPropagation();
                await clearAllVideo();
            });

        // Logika Hapus semua file data DB
        document.querySelector('#clearPlaylistBtn').addEventListener('click',
            async () => {
                if (dbCount.video === 0 && dbCount.music === 0) {
                    showToast('No data saved');
                    return;
                }
                if (!confirm("Delete all saved data ?")) return;
                await clearAllMusic();
                await clearAllVideo();
                showToast("✓ Succeed");
            });

        function resetPageFitur() {
            // pages
            [videoPageEl,
                convertPageEl]
            .forEach(page => page?.classList.remove('active'));

            // buttons
            [openMusicBtn,
                openVideoBtn,
                openConvertBtn]
            .forEach(btn => btn?.classList.remove('active'));

            // player UI
            [playerMusic, addVideoBtn].forEach(e => e.classList.add('hidden'));
            
            openConvertBtn.style.display = 'flex';
            if (videoPlayer) deactivateActive();
        }

        async function activPageMode(btn, page) {
            await resetPageFitur();
            switch (page) {
                case videoPageEl:
                    openConvertBtn.style.display = 'none';
                    addVideoBtn.classList.remove("hidden");
                    break;
                case convertPageEl:
                    openConvertBtn.style.display = 'flex';
                    break;
                default:
                    playerMusic.classList.remove('hidden');
                    break;
            }
            if (btn) btn.classList.add('active');

            if (page) page.classList.add('active');
        }

        openConvertBtn.addEventListener('click',
            () => activPageMode(openConvertBtn, convertPageEl));

        openVideoBtn.addEventListener('click',
            () => activPageMode(openVideoBtn, videoPageEl));

        openMusicBtn.addEventListener('click',
            () => activPageMode(openMusicBtn));

        window.addEventListener("DOMContentLoaded", async () => {
            try {
                await openIndexedDB();
            } finally {
                await loadAudioData();
                await resetPlayerUI();
                await renderVideo();
                await updateDateVideoFiles();
            }});
    }());

    /*
  if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("sw.js")
      .then(() => console.log("service Worker terdaftar"))
      .catch(err => console.error("gagal daftar SW:", err));
    } */


}); //AKHIR DARI document.addEventListener('DOMContentLoaded')