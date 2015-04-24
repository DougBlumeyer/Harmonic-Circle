BASE_FREQ = 440; //in Hz
VOICE_COUNT = 5; //how dense the sound is
LOWEST_FREQ = BASE_FREQ / (Math.floor(VOICE_COUNT / 2) * 2);
BASE_VOL = 1;
HARMONIC_SERIES_OCTAVE = 8; //choose your own octave of the harmonic series

var curHarmonic = Math.pow(2, HARMONIC_SERIES_OCTAVE - 1);
var curDenominator = curHarmonic * 2;

BASE_DUR = 155 * curHarmonic; //in ms; 155 is arbitrary tempo adjustment
SUSTAIN = BASE_DUR / (curHarmonic * 4); //in ms; 4 is arbitrary note sustain adjustment
REST_TIME = BASE_DUR - SUSTAIN;

function initializeVoices() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  voices = [];
  for (i = 0; i < VOICE_COUNT; i++) {
    voices.push(initializeVoice());
    voices[i].freqNode.frequency.value = voiceFreq(i);
  };
};

function voiceFreq(i) {
  return LOWEST_FREQ * Math.pow(2, i) * curHarmonic / curDenominator;
};

function mapToPitchCircularAmplitudeCurve(gainNode, freq) {
  gainNode.gain.value = BASE_VOL *
    Math.pow(Math.E,
      Math.pow(
        mapFreqToUnitizedNormalCurve(freq) - 0.5,
        2
      ) / (-2 / Math.pow(VOICE_COUNT, 2))
    );
};

function mapFreqToUnitizedNormalCurve(freq) {
  return Math.log2(freq / LOWEST_FREQ) / VOICE_COUNT;
};

function mapToTempoCircularAmplitudeCurve(gainNode) {
  if (curHarmonic % 4 == 0) {
    var scalar = 1;
  } else if (curHarmonic % 2 == 0 && curHarmonic % 4 != 0) {
    var scalar = 1 - (((curHarmonic / curDenominator) - .5) * 1.5) // 1 -> .25
  } else {
    var scalar = .25 - (((curHarmonic / curDenominator) - .5) * .5) // .25 -> 0
  }
  gainNode.gain.value *= scalar;
};

function initializeVoice() {
  newVoice = {
    freqNode: audioCtx.createOscillator(),
    gainNode: audioCtx.createGain()
  };

  newVoice.freqNode.connect(newVoice.gainNode);
  newVoice.gainNode.connect(audioCtx.destination);
  newVoice.freqNode.type = 'square';
  newVoice.freqNode.start(0);

  return newVoice;
};

function popHighestVoice() {
  voices[VOICE_COUNT].gainNode.disconnect();
  voices.pop();
};

function playNotes() {
  for (i = 0; i < voices.length; i++) {
    mapToPitchCircularAmplitudeCurve(voices[i].gainNode, voices[i].freqNode.frequency.value);
    mapToTempoCircularAmplitudeCurve(voices[i].gainNode);
  }
  setTimeout(takeARest, SUSTAIN);
};

function takeARest() {
  curHarmonic += 1;
  if (curHarmonic > curDenominator) {
    wrapAroundOctave();
  }

  muteVoicesAndUpdateFreqsForNextNote();

  setTimeout(playNotes, restDuration(curHarmonic));
};

function restDuration(curHarmonic) {
  return (BASE_DUR / curHarmonic) - SUSTAIN;
};

function wrapAroundOctave() {
  curHarmonic = (curDenominator / 2) + 1;
  voices.unshift(initializeVoice());
  popHighestVoice();
};

function muteVoicesAndUpdateFreqsForNextNote() {
  for (i = 0; i < voices.length; i++) {
    voices[i].gainNode.gain.value = 0;
    voices[i].freqNode.frequency.value = voiceFreq(i);
  }
};

initializeVoices();
playNotes();
