"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Pause, Play, RotateCcw, Check, Volume2, AlertCircle } from "lucide-react";

interface AudioRecorderProps {
  onRecordingComplete: (file: File) => void;
  onCancel?: () => void;
}

export function AudioRecorder({ onRecordingComplete, onCancel }: AudioRecorderProps) {
  const [status, setStatus] = useState<"idle" | "recording" | "paused" | "stopped">("idle");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [volumes, setVolumes] = useState<number[]>([12, 18, 10, 24, 15, 30, 16, 22]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  function cleanup() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (animFrameRef.current) window.cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }
  }

  async function startRecording() {
    setError(null);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Pick best supported container
      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/webm";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "";
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setStatus("stopped");
      };

      // Set up AudioContext for volume animation
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 32;
        source.connect(analyser);
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateBars = () => {
          if (recorder.state === "recording") {
            analyser.getByteFrequencyData(dataArray);
            const bars: number[] = [];
            for (let i = 0; i < 8; i++) {
              const val = dataArray[i] ?? 0;
              bars.push(Math.max(8, Math.min(48, Math.round((val / 255) * 48))));
            }
            setVolumes(bars);
          }
          animFrameRef.current = requestAnimationFrame(updateBars);
        };
        updateBars();
      } catch {}

      recorder.start(250);
      setStatus("recording");
      setDuration(0);

      timerRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Microphone access was denied. Please allow microphone permissions in your browser."
          : "Could not access microphone.",
      );
    }
  }

  function pauseRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setStatus("paused");
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
  }

  function resumeRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setStatus("recording");
      timerRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    }
  }

  function resetRecording() {
    cleanup();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    setDuration(0);
    setStatus("idle");
    setError(null);
  }

  function handleUseRecording() {
    if (!audioBlob) return;
    const ext = audioBlob.type.includes("mp4") ? ".m4a" : audioBlob.type.includes("ogg") ? ".ogg" : ".webm";
    const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `voice_memo_${dateStr}${ext}`;
    const file = new File([audioBlob], filename, { type: audioBlob.type || "audio/webm" });
    onRecordingComplete(file);
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="audio-recorder-container">
      {error && (
        <div className="recorder-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {status === "idle" && (
        <div className="recorder-idle-view">
          <div className="recorder-mic-halo">
            <button
              type="button"
              onClick={() => void startRecording()}
              className="recorder-mic-btn"
              title="Start voice recording"
            >
              <Mic size={26} />
            </button>
          </div>
          <strong>Click to record audio</strong>
          <small>Speak directly into your microphone for an instant voice note</small>
        </div>
      )}

      {(status === "recording" || status === "paused") && (
        <div className="recorder-active-view">
          <div className="recorder-meter-wrap">
            <span className={`recorder-live-indicator ${status === "paused" ? "paused" : ""}`} />
            <span className="recorder-timer">{formatTime(duration)}</span>
            <div className="recorder-wave-bars">
              {volumes.map((h, i) => (
                <span
                  key={i}
                  className="recorder-bar"
                  style={{ height: `${status === "paused" ? 8 : h}px` }}
                />
              ))}
            </div>
          </div>

          <div className="recorder-controls-row">
            {status === "recording" ? (
              <button
                type="button"
                onClick={pauseRecording}
                className="recorder-action-btn secondary"
                title="Pause recording"
              >
                <Pause size={15} /> Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={resumeRecording}
                className="recorder-action-btn secondary"
                title="Resume recording"
              >
                <Play size={15} /> Resume
              </button>
            )}

            <button
              type="button"
              onClick={stopRecording}
              className="recorder-action-btn stop"
              title="Finish recording"
            >
              <Check size={16} /> Done
            </button>

            <button
              type="button"
              onClick={resetRecording}
              className="recorder-action-btn discard"
              title="Discard and restart"
            >
              <RotateCcw size={15} /> Discard
            </button>
          </div>
        </div>
      )}

      {status === "stopped" && audioUrl && (
        <div className="recorder-stopped-view">
          <div className="recorder-preview-header">
            <Volume2 size={18} className="text-violet" />
            <strong>Voice Memo Ready ({formatTime(duration)})</strong>
          </div>

          <audio src={audioUrl} controls className="recorder-audio-preview" />

          <div className="recorder-decision-buttons">
            <button
              type="button"
              onClick={handleUseRecording}
              className="recorder-action-btn primary"
            >
              <Check size={16} /> Use this recording
            </button>

            <button
              type="button"
              onClick={resetRecording}
              className="recorder-action-btn discard"
            >
              <RotateCcw size={14} /> Re-record
            </button>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="recorder-action-btn secondary"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
