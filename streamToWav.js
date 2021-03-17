const writeUTFBytes = (view, offset, string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

const flattenArray = (channelBuffer, recordingLength) => {
  const result = new Float32Array(recordingLength);
  let offset = 0;
  for (let i = 0; i < channelBuffer.length; i++) {
    const buffer = channelBuffer[i];
    result.set(buffer, offset);
    offset += buffer.length;
  }
  return result;
};


 navigator.getUserMedia(
  { audio: true },
  (stream) => {
    const audioCtx = new AudioContext({
      sampleRate: 16000,
    });
    
    const streamNode = audioCtx.createMediaStreamSource(localStream);
    const recorder = audioCtx.createScriptProcessor(16384, 1, 1);
    
    let recordingLength = 0;
    const arrayBuffer = [];
    
    recorder.addEventListener("audioprocess", (event) => {
      const inputBuffer = event.inputBuffer.getChannelData(0);
      arrayBuffer.push(new Float32Array(inputBuffer));
      recordingLength += 16384;
      const flatBuffer = flattenArray(arrayBuffer, recordingLength);
      const buffer = new ArrayBuffer(44 + flatBuffer.length * 2);
      const view = new DataView(buffer);
      
      // RIFF chunk descriptor
      writeUTFBytes(view, 0, "RIFF");
      view.setUint32(4, 44 + flatBuffer.length * 2, true);
      writeUTFBytes(view, 8, "WAVE");
      
      // FMT sub-chunk
      writeUTFBytes(view, 12, "fmt ");
      view.setUint32(16, 16, true); // chunkSize
      view.setUint16(20, 1, true); // wFormatTag
      view.setUint16(22, 1, true); // wChannels: mono (1 channels)
      view.setUint32(24, 16000, true); // dwSamplesPerSec
      view.setUint32(28, 16000 * 4, true); // dwAvgBytesPerSec
      view.setUint16(32, 4, true); // wBlockAlign
      view.setUint16(34, 16, true); // wBitsPerSample
      
      // data sub-chunk
      writeUTFBytes(view, 36, "data");
      view.setUint32(40, flatBuffer.length * 2, true);
      
      // write the PCM samples
      const index = 44;
      const volume = 1;
      for (let i = 0; i < flatBuffer.length; i++) {
        view.setInt16(index, flatBuffer[i] * (0x7fff * volume), true);
        index += 2;
      }
      
      const blob = new Blob([view], { type: "audio/wav" });
      
      // play audio
      //   const url = window.URL.createObjectURL(blob);
      //   const audio = new Audio(url);
      //   audio.play();
      
      // file download
      const file = new File([blob], "audio.wav");
      const fileURL = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = fileURL;
      a.download = `audio_${+new Date()}.wav`;
      a.style.display = "none";
      a.click();
    });
  },
  (error) => {
    console.error(error);
  }
);
