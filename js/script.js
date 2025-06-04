document.addEventListener('DOMContentLoaded', function() {
    const config = {
        stepsCount: 16,
        tracks: ['kick', 'snare', 'hihat', 'clap', 'tom', 'cymbal', 'shaker'],
        bpm: {
            min: 60,
            max: 180,
            default: 130
        }
    }; 

    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', function() {
        document.body.dataset.theme = document.body.dataset.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', document.body.dataset.theme);
    });

    const loader = document.createElement('div');
    loader.id = 'loader';
    loader.innerHTML = `
        <div class="loader-content">
            <img src="data/icon.png" alt="Loading" class="loader-image">
            <div class="loader-text">Загрузка Drumpad...</div>
        </div>
    `;
    document.body.appendChild(loader);

    setTimeout(() => {
        loader.style.display = 'none';
        document.body.style.overflow = 'auto';
    }, 2000);

    const state = {
        sequence: {},
        currentStep: 0,
        isPlaying: false,
        interval: null,
        volume: 0.7
    };

    function handleResize() {
        const html = document.documentElement;
        if (window.innerWidth < 600) {
            html.style.fontSize = '14px';
        } else {
            html.style.fontSize = '16px';
        }
    }

    window.addEventListener('resize', handleResize);
    handleResize();

    const elements = {
        bpmSlider: document.getElementById('bpm'),
        bpmValue: document.getElementById('bpmValue'),
        playButton: document.getElementById('play'),
        stopButton: document.getElementById('stop'),
        clearButton: document.getElementById('clear'),
        drumPads: document.querySelectorAll('.drum-pad'),
        saveButton: document.getElementById('save'),
        volumeSlider: document.createElement('input'),
        recordButton: document.getElementById('record')
    };
    

    elements.volumeSlider = document.getElementById('volume');

    let audioRecorder = {
        audioContext: null,
        recorder: null,
        audioBuffers: [],
        isRecording: false,
        startTime: 0,
        recordingLength: 0,
        recordNode: null
    };

    const AudioC = window.AudioContext || window.webkitAudioContext;
    const audioC = new AudioC();
    const masterGain = audioC.createGain();
    masterGain.gain.value = state.volume;
    masterGain.connect(audioC.destination);
    
    elements.bpmSlider.min = config.bpm.min;
    elements.bpmSlider.max = config.bpm.max;
    elements.bpmSlider.value = config.bpm.default;
    elements.bpmValue.textContent = config.bpm.default;

    const sounds = {
        kick: Kick(),
        snare: Snare(),
        hihat: HiHat(),
        clap: Clap(),
        tom: Tom(),
        cymbal: Cymbal(),
        shaker: Shaker()
    };

    config.tracks.forEach(track => {
        state.sequence[track] = Array(config.stepsCount).fill(false);
        const stepsContainer = document.querySelector(`.steps[data-track="${track}"]`);
        
        if (!stepsContainer) {
            const sequencer = document.querySelector('.sequencer');
            const newTrack = document.createElement('div');
            newTrack.className = 'track';
            newTrack.innerHTML = `
                <div class="track-name">${track}</div>
                <div class="steps" data-track="${track}"></div>
            `;
            sequencer.appendChild(newTrack);
            
            for (let i = 0; i < config.stepsCount; i++) {
                const step = document.createElement('div');
                step.className = 'step';
                step.dataset.index = i;
                
                if ((i + 1) % 4 === 0 && i !== config.stepsCount - 1) {
                    step.classList.add('bar-marker');
                }
                
                step.addEventListener('click', function() {
                    toggleStep(track, i, this);
                });
                newTrack.querySelector('.steps').appendChild(step);
            }
        } else {
            for (let i = 0; i < config.stepsCount; i++) {
                const step = document.createElement('div');
                step.className = 'step';
                step.dataset.index = i;
                
                if ((i + 1) % 4 === 0 && i !== config.stepsCount - 1) {
                    step.classList.add('bar-marker');
                }
                
                step.addEventListener('click', function() {
                    toggleStep(track, i, this);
                });
                stepsContainer.appendChild(step);
            }
        }
    });
    
    elements.bpmSlider.addEventListener('input', handleBpmChange);
    elements.playButton.addEventListener('click', startPlayback);
    elements.stopButton.addEventListener('click', stopPlayback);
    elements.clearButton.addEventListener('click', clearSequence);
    elements.volumeSlider.addEventListener('input', handleVolumeChange);
    elements.saveButton.addEventListener('click', exportMP3);
    elements.recordButton.addEventListener('click', toggleRecording);
    

    
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

    function handleVolumeChange() {
        state.volume = parseFloat(this.value);
        masterGain.gain.value = state.volume;
    }

    function startPlayback() {
        if (!state.isPlaying) {
            state.isPlaying = true;
            state.currentStep = -1;
            startSequencer();
        }
    }

    function stopPlayback() {
        state.isPlaying = false;
        clearInterval(state.interval);
        resetCurrentStep();
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

    function Tom() {
        return {
            start: function() {
                const now = audioC.currentTime;
                const osc = audioC.createOscillator();
                const gain = audioC.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
                
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                
                osc.connect(gain);
                gain.connect(masterGain);
                
                osc.start(now);
                osc.stop(now + 0.4);
            }
        };
    }

    function Cymbal() {
        return {
            start: function() {
                const now = audioC.currentTime;
                const bufferSize = audioC.sampleRate * 0.5;
                const noiseBuffer = audioC.createBuffer(1, bufferSize, audioC.sampleRate);
                const output = noiseBuffer.getChannelData(0);
                
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = Math.random() * 2 - 1;
                }
                
                const noise = audioC.createBufferSource();
                noise.buffer = noiseBuffer;
                
                const filter = audioC.createBiquadFilter();
                filter.type = 'highpass';
                filter.frequency.value = 5000;
                
                const gain = audioC.createGain();
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(masterGain);
                
                noise.start(now);
                noise.stop(now + 0.5);
            }
        };
    }

    function Shaker() {
        return {
            start: function() {
                const now = audioC.currentTime;
                const bufferSize = audioC.sampleRate * 0.3;
                const noiseBuffer = audioC.createBuffer(1, bufferSize, audioC.sampleRate);
                const output = noiseBuffer.getChannelData(0);
                
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = Math.random() * 2 - 1;
                }
                
                const noise = audioC.createBufferSource();
                noise.buffer = noiseBuffer;
                
                const filter = audioC.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = 2000;
                
                const gain = audioC.createGain();
                gain.gain.setValueAtTime(0.8, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(masterGain);
                
                noise.start(now);
                noise.stop(now + 0.3);
            }
        };
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
                
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                
                osc.connect(gain);
                osc2.connect(gain);
                gain.connect(masterGain);
                
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
                noiseEnvelope.gain.setValueAtTime(0.3, now);
                noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, now + noiseDuration);
                
                const osc = audioC.createOscillator();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(200, now);
                
                const oscEnvelope = audioC.createGain();
                oscEnvelope.gain.setValueAtTime(1, now);
                oscEnvelope.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                
                noise.connect(noiseFilter);
                noiseFilter.connect(noiseEnvelope);
                noiseEnvelope.connect(masterGain);
                
                osc.connect(oscEnvelope);
                oscEnvelope.connect(masterGain);
                
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
                
                gain.gain.setValueAtTime(0.5, now);
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
                gain.connect(masterGain);
                
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
                    gain.gain.setValueAtTime(0.3, now + peakTimes[i]);
                    gain.gain.exponentialRampToValueAtTime(0.1, now + peakTimes[i] + 0.05);
                }
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(masterGain);
                
                noise.start(now);
                noise.stop(now + 0.2);
            }
        };
    }

    function toggleRecording() {
        if (audioRecorder.isRecording) {
            stopRecording();
            stopPlayback();
            elements.recordButton.textContent = 'Запись';
            elements.recordButton.style.backgroundColor = '';
        } else {
            startRecording();
            startPlayback();
            elements.recordButton.textContent = 'Стоп';
            elements.recordButton.style.backgroundColor = '#ff0000';
    }
    }

    function startRecording() {
        audioRecorder.audioBuffers = [];
        audioRecorder.isRecording = true;
        audioRecorder.startTime = audioC.currentTime;
        audioRecorder.recordingLength = 0;

        audioRecorder.recordNode = audioC.createScriptProcessor(4096, 1, 1);
        audioRecorder.recordNode.onaudioprocess = function(e) {
            if (!audioRecorder.isRecording) return;

            const channelData = e.inputBuffer.getChannelData(0);
            const buffer = new Float32Array(channelData.length);
            for (let i = 0; i < channelData.length; i++) {
                buffer[i] = channelData[i];
            }
            audioRecorder.audioBuffers.push(buffer);
            audioRecorder.recordingLength += buffer.length;
        };

        masterGain.connect(audioRecorder.recordNode);
        audioRecorder.recordNode.connect(audioC.destination);
    }

    function stopRecording() {
        audioRecorder.isRecording = false;
        if (audioRecorder.recordNode) {
            audioRecorder.recordNode.disconnect();
        }
        exportMP3();
    }

    function startRecording() {
        audioRecorder.audioBuffers = [];
        audioRecorder.isRecording = true;
        audioRecorder.startTime = audioC.currentTime;
        audioRecorder.recordingLength = 0;
    
    const recordNode = audioC.createScriptProcessor(4096, 1, 1);
    recordNode.onaudioprocess = function(e) {
            if (!audioRecorder.isRecording){
                return;
            }
        
            const channelData = e.inputBuffer.getChannelData(0);
            const buffer = new Float32Array(channelData.length);
            for (let i = 0; i < channelData.length; i++) {
                buffer[i] = channelData[i];
            }
            audioRecorder.audioBuffers.push(buffer);
            audioRecorder.recordingLength += buffer.length;
        };
    
        masterGain.connect(recordNode);
        recordNode.connect(audioC.destination);
        audioRecorder.recorder = recordNode;
    }

    function stopRecording() {
        audioRecorder.isRecording = false;
        if (audioRecorder.recorder) {
            audioRecorder.recorder.disconnect();
        } if (audioRecorder.audioBuffers && audioRecorder.audioBuffers.length > 0) {
            exportMP3();
        }
    }

    function exportMP3() {
        if (!audioRecorder.audioBuffers || audioRecorder.audioBuffers.length === 0) {
            return;
        }

        const sampleRate = audioC.sampleRate;
        const mergedBuffer = mergeBuffers(audioRecorder.audioBuffers, audioRecorder.recordingLength);
        const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 48000);
        const samples = new Int16Array(mergedBuffer.length);
    
        for (let i = 0; i < mergedBuffer.length; i++) {
        samples[i] = mergedBuffer[i] * 32767;
        }
    
        const blockSize = 1152;
        const mp3Data = [];
    
        for (let i = 0; i < samples.length; i += blockSize) {
            const chunk = samples.subarray(i, i + blockSize);
            const mp3buf = mp3encoder.encodeBuffer(chunk);
            if (mp3buf.length > 0) {
                mp3Data.push(mp3buf);
            }
        }

        const mp3buf = mp3encoder.flush();
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }
    
        const blob = new Blob(mp3Data, { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'drumpad-beat.mp3';
        a.click();
        URL.revokeObjectURL(url);
    }

    function mergeBuffers(buffers, length) {
        const result = new Float32Array(length);
        let offset = 0;
    
        for (let i = 0; i < buffers.length; i++) {
            result.set(buffers[i], offset);
            offset += buffers[i].length;
        }

        return result;
    }

    function mergeBuffers(buffers, length) {
        const result = new Float32Array(length);
        let offset = 0;
    
        for (let i = 0; i < buffers.length; i++) {
            result.set(buffers[i], offset);
            offset += buffers[i].length;
        }

        return result;
    }
});