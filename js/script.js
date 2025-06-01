document.addEventListener('DOMContentLoaded', function() {
    const config = {
        stepsCount: 16,
        tracks: ['kick', 'snare', 'hihat', 'clap'],
        bpm: {
            min: 60,
            max: 180,
            default: 130
        }
    };

    const state = {
        sequence: {},
        currentStep: 0,
        isPlaying: false,
        interval: null
    };

    const elements = {
        bpmSlider: document.getElementById('bpm'),
        bpmValue: document.getElementById('bpmValue'),
        playButton: document.getElementById('play'),
        stopButton: document.getElementById('stop'),
        clearButton: document.getElementById('clear'),
        drumPads: document.querySelectorAll('.drum-pad')
    };

    const AudioC = window.AudioContext || window.webkitAudioContext;
    const audioC = new AudioC();
    
    elements.bpmSlider.min = config.bpm.min;
    elements.bpmSlider.max = config.bpm.max;
    elements.bpmSlider.value = config.bpm.default;
    elements.bpmValue.textContent = config.bpm.default;

    const sounds = {
        kick: Kick(),
        snare: Snare(),
        hihat: HiHat(),
        clap: Clap()
    };

    config.tracks.forEach(track => {
        state.sequence[track] = Array(config.stepsCount).fill(false);
        const stepsContainer = document.querySelector(`.steps[data-track="${track}"]`);
        
        for (let i = 0; i < config.stepsCount; i++) {
            const step = document.createElement('div');
            step.className = 'step';
            step.dataset.index = i;
            step.addEventListener('click', function() {
                toggleStep(track, i, this);
            });
            stepsContainer.appendChild(step);
        }
    });

    elements.bpmSlider.addEventListener('input', handleBpmChange);
    elements.playButton.addEventListener('click', startPlayback);
    elements.stopButton.addEventListener('click', stopPlayback);
    elements.clearButton.addEventListener('click', clearSequence);
    
    elements.drumPads.forEach(pad => {
        pad.addEventListener('mousedown', function() {
            this.classList.add('active');
            const sound = this.getAttribute('data-sound');
            playSound(sound);
        });
        
        pad.addEventListener('mouseup', function() {
            this.classList.remove('active');
        });
        
        pad.addEventListener('mouseleave', function() {
            this.classList.remove('active');
        });
    });

    function handleBpmChange() {
        elements.bpmValue.textContent = this.value;
        if (state.isPlaying) {
            restartSequencer();
        }
    }

    function startPlayback() {
        if (!state.isPlaying) {
            state.isPlaying = true;
            startSequencer();
        }
    }

    function stopPlayback() {
        state.isPlaying = false;
        clearInterval(state.interval);
        resetCurrentStep();
        state.currentStep = 0;
    }

    function clearSequence() {
        config.tracks.forEach(track => {
            state.sequence[track] = Array(config.stepsCount).fill(false);
            document.querySelectorAll(`.steps[data-track="${track}"] .step`).forEach(step => {
                step.classList.remove('active');
            });
        });
    }

    function toggleStep(track, index, element) {
        state.sequence[track][index] = !state.sequence[track][index];
        element.classList.toggle('active');
    }

    function startSequencer() {
        const bpm = parseInt(elements.bpmSlider.value);
        const stepDuration = 60000 / bpm / 4;
        
        processStep();
        
        state.interval = setInterval(processStep, stepDuration);
    }

    function restartSequencer() {
        clearInterval(state.interval);
        startSequencer();
    }

    function processStep() {
        resetCurrentStep();
        
        state.currentStep = (state.currentStep + 1) % config.stepsCount;
        
        document.querySelectorAll(`.steps .step[data-index="${state.currentStep}"]`).forEach(step => {
            step.classList.add('current');
        });
        
        config.tracks.forEach(track => {
            if (state.sequence[track][state.currentStep]) {
                playSound(track);
            }
        });
    }

    function resetCurrentStep() {
        document.querySelectorAll('.steps .step.current').forEach(step => {
            step.classList.remove('current');
        });
    }

    function playSound(sound) {
        if (sounds[sound] && sounds[sound].start) {
            sounds[sound].start();
        }
    }

    function Kick() {
        return {
            start: function() {
                const now = audioC.currentTime;
                const gain = audioC.createGain();
                const osc = audioC.createOscillator();
                const osc2 = audioC.createOscillator();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
                
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(50, now);
                
                gain.gain.setValueAtTime(1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                
                osc.connect(gain);
                osc2.connect(gain);
                gain.connect(audioC.destination);
                
                osc.start(now);
                osc2.start(now);
                osc.stop(now + 0.5);
                osc2.stop(now + 0.5);
            }
        };
    }

    function Snare() {
        return {
            start: function() {
                const now = audioC.currentTime;
                const noiseDuration = 0.2;
                const noiseBuffer = audioC.createBuffer(1, audioC.sampleRate * noiseDuration, audioC.sampleRate);
                const noiseOutput = noiseBuffer.getChannelData(0);
                
                for (let i = 0; i < noiseOutput.length; i++) {
                    noiseOutput[i] = Math.random() * 2 - 1;
                }
                
                const noise = audioC.createBufferSource();
                noise.buffer = noiseBuffer;
                
                const noiseFilter = audioC.createBiquadFilter();
                noiseFilter.type = 'highpass';
                noiseFilter.frequency.value = 1000;
                
                const noiseEnvelope = audioC.createGain();
                noiseEnvelope.gain.setValueAtTime(1, now);
                noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, now + noiseDuration);
                
                const osc = audioC.createOscillator();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(200, now);
                
                const oscEnvelope = audioC.createGain();
                oscEnvelope.gain.setValueAtTime(1, now);
                oscEnvelope.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                
                noise.connect(noiseFilter);
                noiseFilter.connect(noiseEnvelope);
                noiseEnvelope.connect(audioC.destination);
                
                osc.connect(oscEnvelope);
                oscEnvelope.connect(audioC.destination);
                
                noise.start(now);
                osc.start(now);
                noise.stop(now + noiseDuration);
                osc.stop(now + 0.1);
            }
        };
    }

    function HiHat() {
        return {
            start: function() {
                const now = audioC.currentTime;
                const gain = audioC.createGain();
                const bandpass = audioC.createBiquadFilter();
                bandpass.type = 'bandpass';
                bandpass.frequency.value = 10000;
                
                const highpass = audioC.createBiquadFilter();
                highpass.type = 'highpass';
                highpass.frequency.value = 7000;
                
                gain.gain.setValueAtTime(1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                
                const bufferSize = audioC.sampleRate * 0.1;
                const noiseBuffer = audioC.createBuffer(1, bufferSize, audioC.sampleRate);
                const output = noiseBuffer.getChannelData(0);
                
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = Math.random() * 2 - 1;
                }
                
                const noise = audioC.createBufferSource();
                noise.buffer = noiseBuffer;
                noise.connect(bandpass);
                bandpass.connect(highpass);
                highpass.connect(gain);
                gain.connect(audioC.destination);
                
                noise.start(now);
                noise.stop(now + 0.1);
            }
        };
    }

    function Clap() {
        return {
            start: function() {
                const now = audioC.currentTime;
                const bufferSize = audioC.sampleRate * 0.2;
                const noiseBuffer = audioC.createBuffer(1, bufferSize, audioC.sampleRate);
                const output = noiseBuffer.getChannelData(0);
                
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = Math.random() * 2 - 1;
                }
                
                const noise = audioC.createBufferSource();
                noise.buffer = noiseBuffer;
                
                const filter = audioC.createBiquadFilter();
                filter.type = 'highpass';
                filter.frequency.value = 2000;
                
                const gain = audioC.createGain();
                gain.gain.setValueAtTime(0, now);
                
                const peaks = 3;
                const peakTimes = [0, 0.02, 0.04];
                
                for (let i = 0; i < peaks; i++) {
                    gain.gain.setValueAtTime(1, now + peakTimes[i]);
                    gain.gain.exponentialRampToValueAtTime(0.1, now + peakTimes[i] + 0.05);
                }
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(audioC.destination);
                
                noise.start(now);
                noise.stop(now + 0.2);
            }
        };
    }
});