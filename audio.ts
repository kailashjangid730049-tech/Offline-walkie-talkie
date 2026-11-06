import {NativeModules} from 'react-native';
import LiveAudioStream from 'react-native-live-audio-stream';
import {Buffer} from 'buffer';

const {PcmPlayer} = NativeModules; // our Kotlin AudioTrack module (native/)
export const SAMPLE_RATE = 16000;

let inited = false;
let onChunk: ((b: Buffer) => void) | null = null;

function initMic() {
  if (inited) return;
  inited = true;
  LiveAudioStream.init({
    sampleRate: SAMPLE_RATE,
    channels: 1,
    bitsPerSample: 16,
    audioSource: 6, // VOICE_RECOGNITION
    bufferSize: 2048, // ~64 ms per chunk
    wavFile: 'walkie.wav',
  });
  LiveAudioStream.on('data', (b64: string) => {
    if (onChunk) onChunk(Buffer.from(b64, 'base64'));
  });
}

export function startMic(cb: (b: Buffer) => void) {
  initMic();
  onChunk = cb;
  LiveAudioStream.start();
}
export function stopMic() {
  onChunk = null;
  try { LiveAudioStream.stop(); } catch {}
}

export const startPlayer = () => PcmPlayer.start(SAMPLE_RATE);
export const play = (b64: string) => PcmPlayer.write(b64);
export const stopPlayer = () => PcmPlayer.stop();
