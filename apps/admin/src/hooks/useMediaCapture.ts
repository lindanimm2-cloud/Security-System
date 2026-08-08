import { useCallback, useEffect, useRef, useState } from 'react';

export type CaptureMode = 'choose' | 'live' | 'preview';
export type PreviewType = 'photo' | 'video';

export function useMediaCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const previewUrlRef = useRef<string | null>(null);

  const [mode, setMode] = useState<CaptureMode>('choose');
  const [recording, setRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<PreviewType>('photo');
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [cameraError, setCameraError] = useState('');

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  const setPreview = useCallback(
    (file: File, type: PreviewType) => {
      revokePreviewUrl();
      const url = URL.createObjectURL(file);
      previewUrlRef.current = url;
      setPreviewFile(file);
      setPreviewUrl(url);
      setPreviewType(type);
      setMode('preview');
    },
    [revokePreviewUrl],
  );

  const stopRecorder = useCallback((discard = false) => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      recorderRef.current = null;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      recorder.onstop = () => {
        if (!discard && chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
          const file = new File([blob], `evidence-${Date.now()}.webm`, { type: blob.type });
          setPreview(file, 'video');
        }
        chunksRef.current = [];
        recorderRef.current = null;
        resolve();
      };
      try {
        recorder.stop();
      } catch {
        recorderRef.current = null;
        chunksRef.current = [];
        resolve();
      }
    });
  }, [setPreview]);

  const reset = useCallback(async () => {
    setRecording(false);
    await stopRecorder(true);
    stopStream();
    revokePreviewUrl();
    setPreviewUrl(null);
    setPreviewFile(null);
    setPreviewType('photo');
    setCameraError('');
    setMode('choose');
  }, [revokePreviewUrl, stopRecorder, stopStream]);

  const startLiveCamera = useCallback(async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setMode('live');
    } catch {
      setCameraError('Could not open camera. Use the buttons below to open your phone camera app.');
      setMode('choose');
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, { mimeType: getMimeType() });
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      if (chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const file = new File([blob], `evidence-${Date.now()}.webm`, { type: blob.type });
        chunksRef.current = [];
        recorderRef.current = null;
        setRecording(false);
        stopStream();
        setPreview(file, 'video');
      }
    };
    recorder.start();
    setRecording(true);
  }, [setPreview, stopStream]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  const cancelLive = useCallback(async () => {
    setRecording(false);
    await stopRecorder(true);
    stopStream();
    setMode('choose');
  }, [stopRecorder, stopStream]);

  const acceptNativeFile = useCallback(
    (file: File | null, type: PreviewType) => {
      if (!file) return false;
      stopStream();
      setPreview(file, type);
      return true;
    },
    [setPreview, stopStream],
  );

  const discardPreview = useCallback(async () => {
    await reset();
  }, [reset]);

  useEffect(() => () => {
    void stopRecorder(true);
    stopStream();
    revokePreviewUrl();
  }, [revokePreviewUrl, stopRecorder, stopStream]);

  return {
    videoRef,
    mode,
    recording,
    previewUrl,
    previewType,
    previewFile,
    cameraError,
    setMode,
    startLiveCamera,
    startRecording,
    stopRecording,
    cancelLive,
    acceptNativeFile,
    discardPreview,
    reset,
  };
}

function getMimeType() {
  if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
    return 'video/webm;codecs=vp9';
  }
  return 'video/webm';
}
