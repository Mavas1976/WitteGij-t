// --- Witte Gij'ten Music Website Logic ---

// Track data representing the 8 CD songs in the root folder
const tracks = [
  { file: "01 CarnaCabana kroegenmix.mp3.mpeg", title: "01. CarnaCabana Kroegenmix" },
  { file: "02 Hij is gek Hor.mp3.mpeg", title: "02. Hij is gek Hor!" },
  { file: "03 House gek Hor.mp3.mpeg", title: "03. House gek Hor!" },
  { file: "04 Als ik jou wil.....mp3.mpeg", title: "04. Als ik jou wil..." },
  { file: "05 Als jou wil House Mix.mp3.mpeg", title: "05. Als jou wil (House Mix)" },
  { file: "06 Ziek zwak en Misselijk.mp3.mpeg", title: "06. Ziek Zwak en Misselijk" },
  { file: "07 Zen er nog wa Wittegijten hier!!.mp3.mpeg", title: "07. Zen er nog wa Wittegijten hier!!" },
  { file: "08 CarbaCabana No Vocals.mp3.mpeg", title: "08. CarnaCabana (No Vocals)" }
];

// State variables
let currentTrackIndex = -1;
let isPlaying = false;
let audioCtx = null;
let analyser = null;
let source = null;
let visualizerInitialized = false;
let leutLevel = 0;
let leutSpeedTimeout = null;

// DOM Elements
const audio = new Audio();
audio.crossOrigin = "anonymous";

const cdDisc = document.getElementById("cd-disc");
const tonearm = document.getElementById("tonearm");
const playerStatus = document.getElementById("player-status");
const currentTrackTitle = document.getElementById("current-track-title");
const currentTrackDetails = document.getElementById("current-track-details");
const timeCurrent = document.getElementById("time-current");
const timeTotal = document.getElementById("time-total");
const progressBar = document.getElementById("progress-bar");
const volumeSlider = document.getElementById("volume-slider");
const volumeIcon = document.getElementById("volume-icon");

const btnPlay = document.getElementById("btn-play");
const playIcon = document.getElementById("play-icon");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const btnDownloadActive = document.getElementById("btn-download-active");
const btnDownloadAll = document.getElementById("btn-download-all");

const playlistContainer = document.getElementById("playlist-container");

const mascotTrigger = document.getElementById("mascot-trigger");
const leutmeterBar = document.getElementById("leutmeter-bar");
const leutPercentage = document.getElementById("leut-percentage");
const btnLeut = document.getElementById("btn-leut");
const btnConfetti = document.getElementById("btn-confetti");

// --- INITIALIZATION ---

document.addEventListener("DOMContentLoaded", () => {
  renderPlaylist();
  loadLeutLevel();
  setupAudioListeners();
  setupControlListeners();
  setupMascotAndSoundboard();
  setupCarousel();
  resizeVisualizer();
});

// Render the playlist rows
function renderPlaylist() {
  playlistContainer.innerHTML = "";
  tracks.forEach((track, index) => {
    const row = document.createElement("div");
    row.className = "track-row";
    row.dataset.index = index;
    
    row.innerHTML = `
      <div class="track-index">${String(index + 1).padStart(2, '0')}</div>
      <div class="track-title" title="${track.title}">${track.title}</div>
      <div class="track-actions">
        <button class="track-btn btn-play-row" title="Speel nummer af">
          <i class="fas fa-play"></i>
        </button>
        <button class="track-btn btn-download-row" title="Download dit nummer">
          <i class="fas fa-download"></i>
        </button>
      </div>
    `;
    
    // Play row on click (unless clicking action buttons specifically)
    row.addEventListener("click", (e) => {
      if (e.target.closest(".track-btn")) return;
      playTrack(index);
    });
    
    // Play button specifically
    row.querySelector(".btn-play-row").addEventListener("click", () => {
      if (currentTrackIndex === index) {
        togglePlay();
      } else {
        playTrack(index);
      }
    });
    
    // Download button specifically
    row.querySelector(".btn-download-row").addEventListener("click", () => {
      downloadTrack(track.file);
    });
    
    playlistContainer.appendChild(row);
  });
}

// --- AUDIO LOGIC ---

function setupAudioListeners() {
  // Update timeline progress
  audio.addEventListener("timeupdate", () => {
    if (audio.duration) {
      const pct = (audio.currentTime / audio.duration) * 100;
      progressBar.value = pct;
      timeCurrent.textContent = formatTime(audio.currentTime);
    }
  });

  // Load track metadata (duration)
  audio.addEventListener("loadedmetadata", () => {
    timeTotal.textContent = formatTime(audio.duration);
    progressBar.value = 0;
  });

  // Track finished playing -> next track
  audio.addEventListener("ended", () => {
    if (currentTrackIndex < tracks.length - 1) {
      playTrack(currentTrackIndex + 1);
    } else {
      stopPlayback();
    }
  });

  // Handle source errors
  audio.addEventListener("error", (e) => {
    console.error("Audio playback error:", e);
    playerStatus.textContent = "FOUT";
    playerStatus.className = "badge status-badge";
  });
}

function initAudioContext() {
  if (audioCtx) return;
  
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64; // Chunky bars
    
    source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    
    visualizerInitialized = true;
    startVisualizerLoop();
  } catch (e) {
    console.warn("Could not initialize audio analyzer (standard for some policies):", e);
  }
}

// Play a specific track by index
function playTrack(index) {
  // Resume or init audio context (browser require user interaction)
  initAudioContext();
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  
  if (index < 0 || index >= tracks.length) return;
  
  // Highlight active row
  const rows = document.querySelectorAll(".track-row");
  rows.forEach(r => r.classList.remove("active"));
  if (rows[index]) {
    rows[index].classList.add("active");
    // Sync play/pause icons inside playlist
    rows.forEach((r, idx) => {
      const icon = r.querySelector(".btn-play-row i");
      if (idx === index) {
        icon.className = "fas fa-pause";
      } else {
        icon.className = "fas fa-play";
      }
    });
  }

  const track = tracks[index];
  currentTrackIndex = index;
  
  // Set audio source to the file in root folder
  audio.src = `./${track.file}`;
  audio.load();
  
  currentTrackTitle.textContent = track.title;
  currentTrackDetails.textContent = `MP3 File: ${track.file}`;
  
  audio.play()
    .then(() => {
      isPlaying = true;
      updateUIForPlayback(true);
      // Spawn small burst of confetti to celebrate
      spawnConfetti(window.innerWidth / 2, window.innerHeight / 2, 20);
    })
    .catch(err => {
      console.error("Playback failed:", err);
      updateUIForPlayback(false);
    });
}

// Toggle play/pause
function togglePlay() {
  if (currentTrackIndex === -1) {
    playTrack(0); // Start with first track
    return;
  }
  
  initAudioContext();
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  if (isPlaying) {
    audio.pause();
    isPlaying = false;
    updateUIForPlayback(false);
  } else {
    audio.play()
      .then(() => {
        isPlaying = true;
        updateUIForPlayback(true);
      })
      .catch(err => console.error("Play failed:", err));
  }
}

function stopPlayback() {
  audio.pause();
  audio.currentTime = 0;
  isPlaying = false;
  updateUIForPlayback(false);
}

// Update play buttons, status indicators, and turntable visuals
function updateUIForPlayback(playing) {
  if (playing) {
    playIcon.className = "fas fa-pause";
    cdDisc.classList.add("spinning");
    tonearm.classList.add("active");
    tonearm.classList.add("playing");
    playerStatus.textContent = "PLAYING";
    playerStatus.className = "badge status-badge playing";
    
    // Sync play icon in active row
    const activeRow = document.querySelector(`.track-row[data-index="${currentTrackIndex}"]`);
    if (activeRow) {
      const icon = activeRow.querySelector(".btn-play-row i");
      if (icon) icon.className = "fas fa-pause";
    }
  } else {
    playIcon.className = "fas fa-play";
    cdDisc.classList.remove("spinning");
    tonearm.classList.remove("playing");
    if (currentTrackIndex === -1) {
      tonearm.classList.remove("active");
      playerStatus.textContent = "STANDBY";
      playerStatus.className = "badge status-badge";
    } else {
      playerStatus.textContent = "PAUSED";
      playerStatus.className = "badge status-badge";
    }
    
    // Sync play icon in active row
    const activeRow = document.querySelector(`.track-row[data-index="${currentTrackIndex}"]`);
    if (activeRow) {
      const icon = activeRow.querySelector(".btn-play-row i");
      if (icon) icon.className = "fas fa-play";
    }
  }
}

// Helper to format track seconds into 00:00 style
function formatTime(seconds) {
  if (isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// --- CONTROLS LISTENERS ---

function setupControlListeners() {
  btnPlay.addEventListener("click", togglePlay);
  
  btnPrev.addEventListener("click", () => {
    if (currentTrackIndex > 0) {
      playTrack(currentTrackIndex - 1);
    } else {
      playTrack(tracks.length - 1); // loop to end
    }
  });
  
  btnNext.addEventListener("click", () => {
    if (currentTrackIndex < tracks.length - 1) {
      playTrack(currentTrackIndex + 1);
    } else {
      playTrack(0); // loop to start
    }
  });

  // Timeline dragging
  progressBar.addEventListener("input", () => {
    if (audio.duration) {
      const newTime = (progressBar.value / 100) * audio.duration;
      audio.currentTime = newTime;
    }
  });

  // Volume slider
  volumeSlider.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    audio.volume = val;
    
    if (val === 0) {
      volumeIcon.className = "fas fa-volume-mute";
    } else if (val < 0.4) {
      volumeIcon.className = "fas fa-volume-off";
    } else if (val < 0.75) {
      volumeIcon.className = "fas fa-volume-down";
    } else {
      volumeIcon.className = "fas fa-volume-up";
    }
  });

  // Download active track
  btnDownloadActive.addEventListener("click", () => {
    if (currentTrackIndex !== -1) {
      downloadTrack(tracks[currentTrackIndex].file);
    } else {
      alert("Kies eerst een nummer om te downloaden!");
    }
  });

  // Download all files
  btnDownloadAll.addEventListener("click", () => {
    downloadAllTracks();
  });
  
  // Custom click CD to play/pause
  cdDisc.addEventListener("click", () => {
    togglePlay();
  });
}

// Download a track file locally
function downloadTrack(filename) {
  const link = document.createElement("a");
  link.href = `./${filename}`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Download all 8 tracks sequentially
function downloadAllTracks() {
  spawnConfetti(window.innerWidth / 2, window.innerHeight / 2, 40);
  tracks.forEach((track, idx) => {
    setTimeout(() => {
      downloadTrack(track.file);
    }, idx * 400); // 400ms spacing to prevent browser download lockups
  });
}

// --- VISUALIZER DRAWING ---

const visualizerCanvas = document.getElementById("visualizer-canvas");
const visCtx = visualizerCanvas.getContext("2d");

function resizeVisualizer() {
  visualizerCanvas.width = visualizerCanvas.parentElement.clientWidth;
  visualizerCanvas.height = visualizerCanvas.parentElement.clientHeight;
}
window.addEventListener("resize", resizeVisualizer);

function startVisualizerLoop() {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  function draw() {
    requestAnimationFrame(draw);
    if (!visualizerInitialized) return;
    
    analyser.getByteFrequencyData(dataArray);
    
    const width = visualizerCanvas.width;
    const height = visualizerCanvas.height;
    
    // Clear canvas
    visCtx.fillStyle = "rgba(18, 20, 26, 0.25)"; // slight opacity for trail animation
    visCtx.fillRect(0, 0, width, height);
    
    const barCount = bufferLength - 8; // skip high-frequencies
    const barWidth = (width / barCount);
    let barHeight;
    let x = 0;
    
    for (let i = 0; i < barCount; i++) {
      barHeight = (dataArray[i] / 255) * height * 0.95;
      
      // Color interpolation: Tilburg Green to Tilburg Orange
      const ratio = i / barCount;
      
      // HSL color transition
      const hue = 148 - (148 - 27) * ratio; // transition from 148 (green) to 27 (orange)
      visCtx.fillStyle = `hsl(${hue}, 100%, 45%)`;
      
      // Render chunky bar with round tops
      visCtx.fillRect(x + 2, height - barHeight, barWidth - 4, barHeight);
      
      // Render peak dots
      visCtx.fillStyle = `hsl(${hue}, 100%, 75%)`;
      visCtx.fillRect(x + 2, height - barHeight - 4, barWidth - 4, 3);
      
      x += barWidth;
    }
  }
  draw();
}

// --- INTERACTIVE CONFETTI SYSTEM ---

const confettiCanvas = document.getElementById("confetti-canvas");
const confCtx = confettiCanvas.getContext("2d");
let confettiParticles = [];

function resizeConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeConfetti);
resizeConfetti();

class ConfettiParticle {
  constructor(x, y, dx, dy) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 8 + 6;
    this.dx = dx || (Math.random() - 0.5) * 8;
    this.dy = dy || (Math.random() * -12 - 6);
    this.gravity = 0.22;
    this.opacity = 1;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = (Math.random() - 0.5) * 12;
    
    // Kruikenstad Green, Kruikenstad Orange, White, and Gold
    const colors = [
      "hsl(148, 100%, 30%)", 
      "hsl(27, 100%, 50%)", 
      "#ffffff", 
      "#ffd700"
    ];
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }

  update() {
    this.x += this.dx;
    this.y += this.dy;
    this.dy += this.gravity;
    this.rotation += this.rotationSpeed;
    if (this.y > confettiCanvas.height) {
      this.opacity = 0;
    }
  }

  draw() {
    confCtx.save();
    confCtx.translate(this.x, this.y);
    confCtx.rotate((this.rotation * Math.PI) / 180);
    confCtx.globalAlpha = this.opacity;
    confCtx.fillStyle = this.color;
    
    if (Math.random() > 0.5) {
      confCtx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    } else {
      confCtx.beginPath();
      confCtx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      confCtx.fill();
    }
    
    confCtx.restore();
  }
}

function spawnConfetti(x, y, count = 25) {
  for (let i = 0; i < count; i++) {
    confettiParticles.push(new ConfettiParticle(x, y));
  }
}

function triggerStageBlast() {
  const w = confettiCanvas.width;
  const h = confettiCanvas.height;
  
  // Blast from bottom-left corner
  for (let i = 0; i < 40; i++) {
    confettiParticles.push(new ConfettiParticle(
      0, 
      h, 
      Math.random() * 12 + 6, 
      Math.random() * -18 - 12
    ));
  }
  
  // Blast from bottom-right corner
  for (let i = 0; i < 40; i++) {
    confettiParticles.push(new ConfettiParticle(
      w, 
      h, 
      Math.random() * -12 - 6, 
      Math.random() * -18 - 12
    ));
  }
}

function updateConfetti() {
  confCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiParticles = confettiParticles.filter(p => p.opacity > 0);
  confettiParticles.forEach(p => {
    p.update();
    p.draw();
  });
  requestAnimationFrame(updateConfetti);
}
requestAnimationFrame(updateConfetti);

// --- MASCOT, LEUTMETER & SOUNDBOARD ---

function setupMascotAndSoundboard() {
  // Mascot triggers confetti + Synth Goat sound
  mascotTrigger.addEventListener("click", () => {
    // Shake animation
    mascotTrigger.classList.add("shake-ani");
    setTimeout(() => mascotTrigger.classList.remove("shake-ani"), 500);
    
    // Blast confetti at the mascot
    const rect = mascotTrigger.getBoundingClientRect();
    spawnConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 35);
    
    // Play goat voice
    playSynthesizedSound("goat-1");
    increaseLeut(15);
  });

  // Confetti Button
  btnConfetti.addEventListener("click", () => {
    triggerStageBlast();
    increaseLeut(5);
  });

  // Leut Button
  btnLeut.addEventListener("click", () => {
    increaseLeut(20);
    triggerStageBlast();
  });

  // Soundboard Buttons
  document.querySelectorAll(".sound-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const soundType = e.target.dataset.sound;
      playSynthesizedSound(soundType);
      
      // Small local confetti spray
      const rect = e.target.getBoundingClientRect();
      spawnConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 10);
      increaseLeut(8);
    });
  });
}

function increaseLeut(amount) {
  leutLevel = Math.min(leutLevel + amount, 100);
  updateLeutMeterUI();
  saveLeutLevel();
  
  if (leutLevel === 100) {
    // MAX PARTY MODE!
    triggerStageBlast();
    playSynthesizedSound("horn");
    
    // Sped-up "leut" track remix effect if audio is currently playing
    if (isPlaying) {
      audio.playbackRate = 1.18; // Speed up song
      cdDisc.classList.add("fast-spinning");
      playerStatus.textContent = "LEUT REMIX!";
      
      if (leutSpeedTimeout) clearTimeout(leutSpeedTimeout);
      
      leutSpeedTimeout = setTimeout(() => {
        audio.playbackRate = 1.0; // Restore speed
        cdDisc.classList.remove("fast-spinning");
        if (isPlaying) {
          playerStatus.textContent = "PLAYING";
        }
      }, 7000);
    }
    
    // Slow bleed down of the meter back to 0
    setTimeout(() => {
      let bleedInterval = setInterval(() => {
        leutLevel = Math.max(leutLevel - 5, 0);
        updateLeutMeterUI();
        saveLeutLevel();
        if (leutLevel === 0) clearInterval(bleedInterval);
      }, 100);
    }, 4000);
  }
}

function updateLeutMeterUI() {
  leutmeterBar.style.width = `${leutLevel}%`;
  leutPercentage.textContent = `${leutLevel}%`;
  
  if (leutLevel > 80) {
    leutmeterBar.style.background = "linear-gradient(90deg, var(--color-green-primary) 0%, var(--color-orange-glow) 100%)";
  } else {
    leutmeterBar.style.background = "linear-gradient(90deg, var(--color-green-primary) 0%, var(--color-orange-primary) 100%)";
  }
}

function saveLeutLevel() {
  localStorage.setItem("witte_gijten_leut", leutLevel);
}

function loadLeutLevel() {
  const saved = localStorage.getItem("witte_gijten_leut");
  if (saved !== null) {
    leutLevel = parseInt(saved, 10);
    updateLeutMeterUI();
  }
}

// --- WEB AUDIO API SYNTHESIZER ---
// Generates live sound effects dynamically without needing external assets

function playSynthesizedSound(type) {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  
  const now = audioCtx.currentTime;
  
  switch(type) {
    case "goat-1": {
      // Hilarious electronic synthesis of a goat "Meeeh!"
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const filter = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();
      
      osc1.type = "sawtooth";
      osc2.type = "triangle";
      
      osc1.frequency.setValueAtTime(175, now);
      osc2.frequency.setValueAtTime(178, now);
      
      // Nasal filter typical for goat sound
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(620, now);
      filter.Q.setValueAtTime(2.0, now);
      
      // Vibrato (the goat "bleat" vibration): pitch modulation
      const vibrato = audioCtx.createOscillator();
      const vibratoGain = audioCtx.createGain();
      vibrato.frequency.setValueAtTime(13, now); // 13 Hz vibration
      vibratoGain.gain.setValueAtTime(30, now); // vibrato depth
      
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc1.frequency);
      vibratoGain.connect(osc2.frequency);
      
      // Envelope
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.1);
      gain.gain.setValueAtTime(0.25, now + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
      
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      
      vibrato.start(now);
      osc1.start(now);
      osc2.start(now);
      
      vibrato.stop(now + 1.0);
      osc1.stop(now + 1.0);
      osc2.stop(now + 1.0);
      break;
    }
    
    case "cheers": {
      // Synthesis of clinking glasses / high ring
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(2300, now);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.45);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(now);
      osc.stop(now + 0.7);
      break;
    }
    
    case "alarm": {
      // Classic carnavals arcade alarm siren
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(280, now);
      
      // Pitch ramp up and down repetitively
      for (let i = 0; i < 5; i++) {
        osc.frequency.linearRampToValueAtTime(750, now + i * 0.18 + 0.09);
        osc.frequency.linearRampToValueAtTime(280, now + i * 0.18 + 0.18);
      }
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(now);
      osc.stop(now + 0.95);
      break;
    }
    
    case "synth-lead": {
      // Fat resonant house/carnival rave bass chord
      const notes = [130.81, 164.81, 196.00, 261.63]; // C chord
      notes.forEach((freq) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const lowpass = audioCtx.createBiquadFilter();
        
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now);
        
        lowpass.type = "lowpass";
        lowpass.frequency.setValueAtTime(1000, now);
        lowpass.frequency.exponentialRampToValueAtTime(150, now + 0.85);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        
        osc.connect(lowpass);
        lowpass.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(now);
        osc.stop(now + 0.95);
      });
      break;
    }
    
    case "beat": {
      // Synthesize a quick fat kick + snare sequence
      for (let i = 0; i < 4; i++) {
        const beatTime = now + i * 0.25;
        
        // Kick Drum
        const kickOsc = audioCtx.createOscillator();
        const kickGain = audioCtx.createGain();
        kickOsc.frequency.setValueAtTime(130, beatTime);
        kickOsc.frequency.exponentialRampToValueAtTime(0.01, beatTime + 0.12);
        
        kickGain.gain.setValueAtTime(0.25, beatTime);
        kickGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.12);
        
        kickOsc.connect(kickGain);
        kickGain.connect(audioCtx.destination);
        kickOsc.start(beatTime);
        kickOsc.stop(beatTime + 0.13);
        
        // Snare on 2 and 4
        if (i === 1 || i === 3) {
          const snareOsc = audioCtx.createOscillator();
          const snareGain = audioCtx.createGain();
          snareOsc.type = "triangle";
          snareOsc.frequency.setValueAtTime(220, beatTime);
          
          // White-noise simulation with square vibrato
          const mod = audioCtx.createOscillator();
          const modGain = audioCtx.createGain();
          mod.type = "square";
          mod.frequency.setValueAtTime(90, beatTime);
          modGain.gain.setValueAtTime(150, beatTime);
          
          mod.connect(modGain);
          modGain.connect(snareOsc.frequency);
          
          snareGain.gain.setValueAtTime(0.15, beatTime);
          snareGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.15);
          
          snareOsc.connect(snareGain);
          snareGain.connect(audioCtx.destination);
          
          mod.start(beatTime);
          snareOsc.start(beatTime);
          
          mod.stop(beatTime + 0.16);
          snareOsc.stop(beatTime + 0.16);
        }
      }
      break;
    }
    
    case "horn": {
      // Synthesized airhorn
      const freqs = [350, 390, 440];
      freqs.forEach(freq => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now);
        
        // Modulate frequency to make it sound like a raspy horn
        const tremolo = audioCtx.createOscillator();
        const tremoloGain = audioCtx.createGain();
        tremolo.frequency.setValueAtTime(14, now);
        tremoloGain.gain.setValueAtTime(10, now);
        tremolo.connect(tremoloGain);
        tremoloGain.connect(osc.frequency);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.05);
        gain.gain.setValueAtTime(0.06, now + 0.55);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        tremolo.start(now);
        osc.start(now);
        
        tremolo.stop(now + 0.75);
        osc.stop(now + 0.75);
      });
      break;
    }
  }
}

// --- CAROUSEL LOGIC ---
function setupCarousel() {
  const slides = document.querySelectorAll(".carousel-slide");
  const dots = document.querySelectorAll(".dot");
  const btnPrev = document.getElementById("carousel-prev");
  const btnNext = document.getElementById("carousel-next");
  
  if (!slides.length) return;
  
  let currentSlide = 0;
  
  function showSlide(index) {
    slides.forEach(s => s.classList.remove("active"));
    dots.forEach(d => d.classList.remove("active"));
    
    currentSlide = (index + slides.length) % slides.length;
    slides[currentSlide].classList.add("active");
    if (dots[currentSlide]) dots[currentSlide].classList.add("active");
  }
  
  btnPrev.addEventListener("click", () => showSlide(currentSlide - 1));
  btnNext.addEventListener("click", () => showSlide(currentSlide + 1));
  
  dots.forEach(dot => {
    dot.addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.slide, 10);
      showSlide(idx);
    });
  });
}
