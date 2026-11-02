"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  VideoPlayer,
  VideoPlayerContent,
  VideoPlayerControlBar,
  VideoPlayerPlayButton,
  VideoPlayerSeekBackwardButton,
  VideoPlayerSeekForwardButton,
  VideoPlayerTimeRange,
  VideoPlayerTimeDisplay,
  VideoPlayerMuteButton,
  VideoPlayerVolumeRange,
  VideoPlayerPipButton,
  VideoPlayerFullscreenButton,
  VideoPlayerLoadingIndicator,
} from "@/components/ui/shadcn-io/video-player";

export default function VideoModal({ isOpen, onClose, videoUrl }) {
  const videoRef = useRef(null);
  const [hasError, setHasError] = useState(false);

  const handleClose = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (!isOpen || !videoUrl) return;

    setHasError(false);
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    const playAttempt = video.play();
    if (playAttempt?.catch) {
      playAttempt.catch(() => {
        // Autoplay may be blocked; user can press play.
      });
    }
  }, [isOpen, videoUrl]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-5xl mx-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Demo video"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="absolute -top-12 right-0 text-white hover:bg-white/20 z-10"
          aria-label="Close video"
        >
          <X className="h-6 w-6" />
        </Button>

        <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10">
          {hasError ? (
            <div className="flex min-h-[400px] items-center justify-center bg-black p-8">
              <div className="text-center text-white">
                <div className="text-lg mb-2">Video failed to load</div>
                <div className="text-sm opacity-75 mb-4 break-all">{videoUrl}</div>
                <Button
                  onClick={() => window.open(videoUrl, "_blank", "noopener,noreferrer")}
                  className="bg-white text-black hover:bg-gray-200"
                >
                  Open Video in New Tab
                </Button>
              </div>
            </div>
          ) : (
            <VideoPlayer
              className="w-full"
              style={{
                "--media-background-color": "#000",
                "--media-primary-color": "#fff",
                "--media-secondary-color": "#111",
                "--media-text-color": "#fff",
                "--media-control-hover-background": "rgba(255,255,255,0.15)",
                "--media-range-track-background": "rgba(255,255,255,0.25)",
              }}
            >
              <VideoPlayerContent
                ref={videoRef}
                src={videoUrl}
                slot="media"
                className="w-full aspect-video max-h-[80vh] bg-black"
                playsInline
                preload="metadata"
                onError={() => setHasError(true)}
              />
              <VideoPlayerLoadingIndicator />
              <VideoPlayerControlBar className="bg-black/70">
                <VideoPlayerPlayButton />
                <VideoPlayerSeekBackwardButton seekOffset={10} />
                <VideoPlayerSeekForwardButton seekOffset={10} />
                <VideoPlayerTimeRange />
                <VideoPlayerTimeDisplay showDuration />
                <VideoPlayerMuteButton />
                <VideoPlayerVolumeRange />
                <VideoPlayerPipButton />
                <VideoPlayerFullscreenButton />
              </VideoPlayerControlBar>
            </VideoPlayer>
          )}
        </div>
      </div>
    </div>
  );
}
