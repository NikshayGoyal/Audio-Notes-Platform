"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FastForward,
  Rewind,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";

interface WaveformPlayerProps {
  audioUrl: string;
  filename: string;
  onTimeUpdate?: (seconds: number) => void;
  seekToTime?: number | null;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function WaveformPlayer({
  audioUrl,
  filename,
  onTimeUpdate,
  seekToTime,
}: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let ws: WaveSurfer | null = null;
    try {
      ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: "#cbd5e1",
        progressColor: "#6366f1",
        cursorColor: "#4338ca",
        cursorWidth: 2,
        barWidth: 3,
        barGap: 2,
        barRadius: 3,
        height: 64,
        normalize: true,
        url: audioUrl,
      });

      wavesurferRef.current = ws;

      ws.on("ready", () => {
        setIsLoading(false);
        setDuration(ws?.getDuration() ?? 0);
      });

      ws.on("play", () => setIsPlaying(true));
      ws.on("pause", () => setIsPlaying(false));

      ws.on("timeupdate", (time) => {
        setCurrentTime(time);
        onTimeUpdate?.(time);
      });

      ws.on("error", (err) => {
        console.warn("WaveSurfer loading notice:", err);
        setIsLoading(false);
        setLoadError("Interactive visualizer unavailable. Falling back to native player.");
      });
    } catch {
      setIsLoading(false);
      setLoadError("Could not initialize waveform.");
    }

    return () => {
      ws?.destroy();
      wavesurferRef.current = null;
    };
  }, [audioUrl, onTimeUpdate]);

  useEffect(() => {
    if (seekToTime !== undefined && seekToTime !== null && wavesurferRef.current) {
      try {
        wavesurferRef.current.setTime(seekToTime);
        if (!wavesurferRef.current.isPlaying()) {
          void wavesurferRef.current.play();
        }
      } catch (err) {
        console.warn("WaveSurfer seek notice:", err);
      }
    }
  }, [seekToTime]);

  // Keyboard shortcut: Spacebar to toggle play/pause
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        skip(-5);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        skip(5);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const togglePlay = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  const skip = (seconds: number) => {
    if (!wavesurferRef.current) return;
    const current = wavesurferRef.current.getCurrentTime();
    const dur = wavesurferRef.current.getDuration();
    const target = Math.max(0, Math.min(dur, current + seconds));
    wavesurferRef.current.setTime(target);
  };

  const changeSpeed = (rate: number) => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setPlaybackRate(rate);
      setPlaybackRate(rate);
    }
  };

  const toggleMute = () => {
    if (wavesurferRef.current) {
      const nextMuted = !isMuted;
      wavesurferRef.current.setVolume(nextMuted ? 0 : volume);
      setIsMuted(nextMuted);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(newVol);
      setVolume(newVol);
      if (newVol > 0 && isMuted) setIsMuted(false);
    }
  };

  return (
    <div className="waveform-player-card my-5 p-5 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse" />
          <span className="font-semibold text-slate-800 tracking-wide uppercase text-[11px]">
            Audio Waveform Studio
          </span>
        </div>
        <span className="text-slate-500 font-mono text-[11px] truncate max-w-[200px]">
          {filename}
        </span>
      </div>

      {/* Waveform Canvas Area */}
      <div className="relative py-4 my-1">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-xs gap-2 text-xs font-medium text-slate-600">
            <Loader2 className="animate-spin text-indigo-600" size={18} />
            <span>Rendering acoustic waveform…</span>
          </div>
        )}

        {loadError ? (
          <div className="py-2">
            <p className="text-xs text-amber-600 mb-2">{loadError}</p>
            <audio controls src={audioUrl} className="w-full" preload="metadata" />
          </div>
        ) : (
          <div ref={containerRef} className="cursor-pointer transition hover:opacity-90" />
        )}
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Playback & Skips */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => skip(-5)}
            className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
            title="Rewind 5s (←)"
            aria-label="Rewind 5 seconds"
          >
            <Rewind size={18} />
          </button>

          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="flex items-center justify-center h-11 w-11 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition active:scale-95 cursor-pointer disabled:opacity-50"
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            aria-label={isPlaying ? "Pause audio" : "Play audio"}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
          </button>

          <button
            onClick={() => skip(5)}
            className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
            title="Fast forward 5s (→)"
            aria-label="Fast forward 5 seconds"
          >
            <FastForward size={18} />
          </button>

          {/* Time Display */}
          <div className="ml-2 font-mono text-xs font-semibold text-slate-700 tracking-tight">
            <span>{formatTime(currentTime)}</span>
            <span className="text-slate-400 mx-1">/</span>
            <span className="text-slate-500">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Speed & Volume Tools */}
        <div className="flex items-center gap-4">
          {/* Playback Speed Switcher */}
          <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-xs font-medium text-slate-600">
            {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => changeSpeed(rate)}
                className={`px-2 py-1 rounded-md transition cursor-pointer ${
                  playbackRate === rate
                    ? "bg-white text-indigo-600 shadow-2xs font-semibold"
                    : "hover:text-slate-900"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-1.5 text-slate-600">
            <button
              onClick={toggleMute}
              className="p-1.5 hover:text-indigo-600 rounded-md transition cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
              aria-label={isMuted ? "Unmute audio" : "Mute audio"}
            >
              {isMuted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-16 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              aria-label="Volume slider"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
