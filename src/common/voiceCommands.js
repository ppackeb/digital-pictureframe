
// ----------------------------------------------
// Recognition State
// ----------------------------------------------

const sherpa_onnx = require('sherpa-onnx-node');

let recognizer = null;
let stream = null;
let lastText = '';

let wakeActive = false;     
let intentTimer = null;     

// ----------------------------------------------
// Keywords + Intents
// ----------------------------------------------
const WAKEWORDS = ["PICTURE FRAME", "COMPUTER"];
const INTENT_WORDS = ["NEXT", "BACK", "PAUSE", "STOP", "RESUME", "PLAY", "SKIP", "LOCATION"];

// ----------------------------------------------
// Reset State
// ----------------------------------------------
function resetWakeIntent() {
  wakeActive = false;
  if (intentTimer) clearTimeout(intentTimer);
  intentTimer = null;  
  SetUIimageorData('#pulse-circle', true, null);   
  setTimeout(() =>{
    SetUIimageorData('#microphone', true, null);
  } , 1500);  
}

// ----------------------------------------------
// Wakeword Handler
// ----------------------------------------------
function handleWakeword() {
  wakeActive = true;    
  SetUIimageorData('#pulse-circle', false, null);
  if (intentTimer) clearTimeout(intentTimer);
  intentTimer = setTimeout(() => {    
    SetUIimageorData('#microphone', false, "./assets/images/mic-red.png");
    resetWakeIntent();
  }, 5000);
}

// ----------------------------------------------
// Intent Handler
// ----------------------------------------------
function handleIntent(intent) {  
  SetUIimageorData('#pulse-circle', true, null);   
  SetUIimageorData('#microphone', false, "./assets/images/mic-green.png");
  switch (intent) {
    case "NEXT":
    case "SKIP":
      document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'n'}));      
    break;
    case "BACK":
      document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'b'})); 
    break;
    case "PAUSE":
    case "STOP":
      document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'p'}));
    break;
    case "RESUME":
    case "PLAY":
      document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'p'}));
    break;
    case "LOCATION":
      document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'l'}));
    break;
  }
  resetWakeIntent();
}

// ----------------------------------------------
// Create Recognizer
// ----------------------------------------------
function createOnlineRecognizer() {  
  let config = null;  
  if (process.env.NODE_ENV === 'development') {  
    config = {
      'featConfig': {
        'sampleRate': 16000,
        'featureDim': 80,
      },
      'modelConfig': {
        'transducer': {
          'encoder':'./src/renderer/assets/sherpa/encoder-epoch-12-avg-2-chunk-16-left-64.onnx',
          'decoder':'./src/renderer/assets/sherpa/decoder-epoch-12-avg-2-chunk-16-left-64.onnx',
          'joiner':'./src/renderer/assets/sherpa/joiner-epoch-12-avg-2-chunk-16-left-64.onnx',
        },
        'tokens':'./src/renderer/assets/sherpa/tokens.txt',
        'numThreads': 2,
        'provider': 'cpu',
        'debug': 1,
      },
      'keywords': './src/renderer/assets/sherpa/keywords.txt',
      //'decodingMethod': 'modified_beam_search',
      'decodingMethod': 'greedy_search',
      'maxActivePaths': 4,
      'enableEndpoint': true,
      'rule1MinTrailingSilence': 2.4,
      'rule2MinTrailingSilence': 1.2,
      'rule3MinUtteranceLength': 20
    };
  }else{
    config = {
      'featConfig': {
        'sampleRate': 16000,
        'featureDim': 80,
      },
      'modelConfig': {
        'transducer': {
          'encoder': path.join(process.resourcesPath, "app.asar.unpacked/src/renderer/assets/sherpa/encoder-epoch-12-avg-2-chunk-16-left-64.onnx"),
          'decoder': path.join(process.resourcesPath, "app.asar.unpacked/src/renderer/assets/sherpa/decoder-epoch-12-avg-2-chunk-16-left-64.onnx"),
          'joiner': path.join(process.resourcesPath, "app.asar.unpacked/src/renderer/assets/sherpa/joiner-epoch-12-avg-2-chunk-16-left-64.onnx"),
        },
        'tokens':path.join(process.resourcesPath, "app.asar.unpacked/src/renderer/assets/sherpa/tokens.txt"),
        'numThreads': 2,
        'provider': 'cpu',
        'debug': 1,
      },
      'keywords': path.join(process.resourcesPath, "app.asar.unpacked/src/renderer/assets/sherpa/keywords.txt"),
      'decodingMethod': 'greedy_search',
      'maxActivePaths': 4,
      'enableEndpoint': true,
      'rule1MinTrailingSilence': 2.4,
      'rule2MinTrailingSilence': 1.2,
      'rule3MinUtteranceLength': 20
    };
  }
  return new sherpa_onnx.OnlineRecognizer(config);
}

// ----------------------------------------------
// AudioWorklet
// ----------------------------------------------
const AUDIO_WORKLET_PROCESSOR_CODE = `
class StreamProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input.length > 0 && input[0].length > 0) {
      this.port.postMessage(input[0]);
    }
    return true;
  }
}
registerProcessor('stream-processor', StreamProcessor);
`;

// ----------------------------------------------
// Start Detection
// ----------------------------------------------
async function startDetection() {

  let blobUrl;

  try {
    if (!recognizer) {
      recognizer = createOnlineRecognizer();
      stream = recognizer.createStream();
    }

    audioContext = new AudioContext({ sampleRate: 16000 });
    const blob = new Blob([AUDIO_WORKLET_PROCESSOR_CODE], { type: 'application/javascript' });
    blobUrl = URL.createObjectURL(blob);
    await audioContext.audioWorklet.addModule(blobUrl);

    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(mediaStream);
    const audioWorkletNode = new AudioWorkletNode(audioContext, 'stream-processor');

    audioWorkletNode.port.onmessage = (event) => {
      const audioData = event.data;

      stream.acceptWaveform({ sampleRate: 16000, samples: audioData });

      while (recognizer.isReady(stream)) {
        recognizer.decode(stream);
      }

      if (recognizer.isEndpoint(stream)) {
        const result = recognizer.getResult(stream);
        const text = result.text.trim().toUpperCase();

        if (text && text !== lastText) {
          lastText = text;              
          // ----------------------------------------------------
          // WAKEWORD MODE (wakeActive == false)
          // ----------------------------------------------------
          if (!wakeActive) {
            const wakeHit = WAKEWORDS.some(w => text.includes(w));
            if (wakeHit) {
              handleWakeword();
            }
            recognizer.reset(stream);
            return;
          }
          // ----------------------------------------------------
          // INTENT MODE (wakeActive == true)
          // ----------------------------------------------------
          const foundIntent = INTENT_WORDS.find(w => text.includes(w));
          if (foundIntent) {
            handleIntent(foundIntent);
          }
        }

        recognizer.reset(stream);
      }
    };
    source.connect(audioWorkletNode);
    audioWorkletNode.connect(audioContext.destination);      
  } catch (err) {    
    SetUIimageorData('#microphone', false, "./assets/images/mic-none.png");
    setTimeout(() =>{
      SetUIimageorData('#microphone', true, null);
    } , 5000);   
  } finally {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }
}