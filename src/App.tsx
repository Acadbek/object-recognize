import './styles/App.css';
import { useRef, useEffect, useState } from 'react';
import {
  ObjectDetector,
  FilesetResolver,
  Detection
} from "@mediapipe/tasks-vision";
import { drawRect } from './utils/drawRect';

declare global {
  interface Window {
    Telegram: any;
  }
}

const App = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [fps, setFps] = useState(0);
  const objectDetectorRef = useRef<ObjectDetector | null>(null);
  const requestRef = useRef<number>();
  const lastDetectionsRef = useRef<Detection[]>([]);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  const CAMERA_URL = "/animals.mp4";

  // OPTIMIZATSIYA: Har 3-kadrda deteksiya (30fps -> 10fps detection)
  const DETECTION_INTERVAL = 3;

  const initializeModel = async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm"
      );

      const objectDetector = await ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          // OPTIMIZATSIYA 1: Yengil model
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/1/efficientdet_lite0.tflite",
          // OPTIMIZATSIYA 2: CPU rejimi (Telegram'da GPU ishlamasligi mumkin)
          delegate: "CPU",
        },
        // OPTIMIZATSIYA 3: Yuqoriroq threshold - kamroq deteksiya
        scoreThreshold: 0.4,
        // OPTIMIZATSIYA 4: Max results cheklash
        maxResults: 5,
        runningMode: "VIDEO",
      });

      objectDetectorRef.current = objectDetector;
      setModelLoaded(true);
      console.log("✅ Model yuklandi (Lite0, CPU mode)");
    } catch (error) {
      console.error("❌ Model yuklashda xato:", error);
    }
  };

  const predictVideo = () => {
    frameCountRef.current++;

    if (
      objectDetectorRef.current &&
      videoRef.current &&
      canvasRef.current &&
      !videoRef.current.paused &&
      !videoRef.current.ended
    ) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        requestRef.current = requestAnimationFrame(predictVideo);
        return;
      }

      // Canvas o'lchamini bir marta o'rnatish
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // OPTIMIZATSIYA: Har N-kadrda deteksiya
      if (frameCountRef.current % DETECTION_INTERVAL === 0) {
        const startTimeMs = performance.now();

        const rawDetections = objectDetectorRef.current.detectForVideo(
          video,
          startTimeMs
        ).detections;

        // OPTIMIZATSIYA: Kamroq interpolatsiya
        const finalDetections = smoothResults(rawDetections, 0.3);

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawRect(finalDetections, ctx);
        }

        // FPS hisoblash
        updateFPS();
      } else {
        // Deteksiya bo'lmagan kadrlarda eski natijalarni chizish
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawRect(lastDetectionsRef.current, ctx);
        }
      }
    }

    requestRef.current = requestAnimationFrame(predictVideo);
  };

  // OPTIMIZATSIYA: Soddalashtirilgan smoothing
  const smoothResults = (newDetections: Detection[], alpha: number = 0.3): Detection[] => {
    if (lastDetectionsRef.current.length === 0) {
      lastDetectionsRef.current = newDetections;
      return newDetections;
    }

    const smoothedDetections: Detection[] = [];
    const prevDetections = lastDetectionsRef.current;
    const DISTANCE_THRESHOLD = 150;

    for (const newDet of newDetections) {
      if (!newDet.boundingBox) continue;

      let matched = false;

      // Eng yaqin oldingi deteksiyani topish
      for (const prev of prevDetections) {
        if (!prev.boundingBox) continue;

        // Kategoriya bir xilmi?
        if (prev.categories[0]?.categoryName !== newDet.categories[0]?.categoryName) {
          continue;
        }

        // Masofa hisoblash
        const dx = prev.boundingBox.originX - newDet.boundingBox.originX;
        const dy = prev.boundingBox.originY - newDet.boundingBox.originY;
        const distanceSq = dx * dx + dy * dy;

        if (distanceSq < DISTANCE_THRESHOLD * DISTANCE_THRESHOLD) {
          // Interpolatsiya
          const box = {
            originX: prev.boundingBox.originX + (newDet.boundingBox.originX - prev.boundingBox.originX) * alpha,
            originY: prev.boundingBox.originY + (newDet.boundingBox.originY - prev.boundingBox.originY) * alpha,
            width: prev.boundingBox.width + (newDet.boundingBox.width - prev.boundingBox.width) * alpha,
            height: prev.boundingBox.height + (newDet.boundingBox.height - prev.boundingBox.height) * alpha,
            angle: 0,
          };
          smoothedDetections.push({ ...newDet, boundingBox: box });
          matched = true;
          break;
        }
      }

      // Agar mos kelmasa, yangi deteksiya qo'shish
      if (!matched) {
        smoothedDetections.push(newDet);
      }
    }

    lastDetectionsRef.current = smoothedDetections;
    return smoothedDetections;
  };

  const updateFPS = () => {
    const now = performance.now();
    const delta = now - lastTimeRef.current;

    if (delta > 1000) {
      const currentFps = Math.round((frameCountRef.current * 1000) / delta);
      setFps(currentFps);
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }
  };

  useEffect(() => {
    if (modelLoaded && videoRef.current && !videoRef.current.paused) {
      console.log("🎬 Deteksiya boshlandi");
      predictVideo();
    }
  }, [modelLoaded]);

  useEffect(() => {
    // Telegram WebApp integratsiyasi
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      window.Telegram.WebApp.enableClosingConfirmation();
      console.log("📱 Telegram WebApp tayyor");
    }

    initializeModel();

    // Video autoplay
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.defaultMuted = true;

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => console.log("▶️ Video boshlandi"))
          .catch((error) => {
            console.warn("⚠️ Autoplay bloklandi:", error);
            video.muted = true;
            video.play().catch(console.error);
          });
      }
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (objectDetectorRef.current) {
        objectDetectorRef.current.close();
      }
    };
  }, []);

  return (
    <div className="wrapper">
      <div className="container" style={{ position: 'relative', width: '100%', maxWidth: '100vw' }}>
        <video
          ref={videoRef}
          className="my-video"
          src={CAMERA_URL}
          autoPlay
          loop
          muted
          playsInline
          crossOrigin="anonymous"
          onPlay={() => {
            if (modelLoaded && !requestRef.current) {
              predictVideo();
            }
          }}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            maxHeight: '80vh',
            objectFit: 'contain'
          }}
        />

        <canvas
          ref={canvasRef}
          className="object-detection"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 10,
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
          }}
        />

        {!modelLoaded && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            background: 'rgba(0,0,0,0.8)',
            padding: '15px 25px',
            borderRadius: '10px',
            zIndex: 20,
            fontSize: '16px',
            fontWeight: 'bold'
          }}>
            AI yuklanmoqda...
          </div>
        )}

        {/* FPS ko'rsatkich */}
        {modelLoaded && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            color: 'white',
            background: 'rgba(0,0,0,0.7)',
            padding: '5px 10px',
            borderRadius: '5px',
            zIndex: 20,
            fontSize: '12px',
            fontFamily: 'monospace'
          }}>
            FPS: {fps}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
