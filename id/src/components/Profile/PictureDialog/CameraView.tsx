import { DialogTitle } from "@headlessui/react";
import { ArrowLeftCircleIcon, CameraIcon } from "@heroicons/react/24/solid";
import { Button } from "@noo/ui";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { View } from ".";

export type CameraViewProps = {
  navigate: (path: View) => void;
  onCapture: (file: File) => void;
};

export function CameraView({ navigate, onCapture }: CameraViewProps) {
  const t = useTranslations("profile.picture_dialog");
  const commonT = useTranslations("common");

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);

  // Initialize camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setLive(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setLive(false);
  }, []);

  // Take photo
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Match canvas to video dimensions with 1:1 aspect ratio
    const size = Math.min(video.videoWidth, video.videoHeight);
    const offsetX = (video.videoWidth - size) / 2;
    const offsetY = (video.videoHeight - size) / 2;

    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, offsetX, offsetY, size, size, 0, 0, size, size);

    canvasRef.current.toBlob((blob) => {
      if (!blob) return;

      const file = new File([blob], "camera-capture.png", {
        type: "image/png",
      });
      onCapture(file);
      stopCamera();
    });
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <>
      <DialogTitle className="text-2xl text-center">
        {t("camera.title")}
      </DialogTitle>

      <div className="my-12 mx-auto flex justify-center">
        <div className="relative aspect-square w-3xs bg-black rounded-xl overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex flex-col mb-4">
        <Button
          onClick={takePhoto}
          className="flex items-center gap-2"
          disabled={!live}
        >
          <CameraIcon className="size-5" />
          {t("camera.capture")}
        </Button>
      </div>

      <Button
        onClick={() => navigate("upload")}
        kind="secondary"
        className="w-full"
      >
        <ArrowLeftCircleIcon className="size-5" />
        {commonT("back")}
      </Button>
    </>
  );
}
