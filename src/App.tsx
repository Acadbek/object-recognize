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
  const objectDetectorRef = useRef<ObjectDetector | null>(null);
  const requestRef = useRef<number>();
  const lastDetectionsRef = useRef<Detection[]>([]);

  const CAMERA_URL = "/farmer.mp4";

  const initializeModel = async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm"
      );

      const objectDetector = await ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite2/float32/1/efficientdet_lite2.tflite",
          delegate: "GPU",
        },
        scoreThreshold: 0.2,
        runningMode: "VIDEO",
      });

      objectDetectorRef.current = objectDetector;
      setModelLoaded(true);
    } catch (error) {
      console.error("error:", error);
    }
  };

  const predictVideo = () => {
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

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      let startTimeMs = performance.now();

      const rawDetections = objectDetectorRef.current.detectForVideo(
        video,
        startTimeMs
      ).detections;

      const finalDetections = smoothResults(rawDetections);


      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawRect(finalDetections, ctx);
      }
    }

    requestRef.current = requestAnimationFrame(predictVideo);
  };

  const smoothResults = (newDetections: Detection[]): Detection[] => {
    const smoothedDetections: Detection[] = [];
    const prevDetections = lastDetectionsRef.current;

    const alpha = 0.2;

    newDetections.forEach((newDet) => {
      if (!newDet.boundingBox) return;

      const match = prevDetections.find((prev) => {
        if (!prev.boundingBox) return false;
        const dx = prev.boundingBox.originX - newDet.boundingBox!.originX;
        const dy = prev.boundingBox.originY - newDet.boundingBox!.originY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance < 100 && prev.categories[0].categoryName === newDet.categories[0].categoryName;
      });

      if (match && match.boundingBox) {
        const box = {
          originX: match.boundingBox.originX + (newDet.boundingBox.originX - match.boundingBox.originX) * alpha,
          originY: match.boundingBox.originY + (newDet.boundingBox.originY - match.boundingBox.originY) * alpha,
          width: match.boundingBox.width + (newDet.boundingBox.width - match.boundingBox.width) * alpha,
          height: match.boundingBox.height + (newDet.boundingBox.height - match.boundingBox.height) * alpha,
          angle: match.boundingBox.angle ?? 0,
          // ---------------------------------
        };
        smoothedDetections.push({ ...newDet, boundingBox: box });
      } else {
        smoothedDetections.push(newDet);
      }
    });

    lastDetectionsRef.current = smoothedDetections;
    return smoothedDetections;
  };

  useEffect(() => {
    if (modelLoaded && videoRef.current) {
      console.log("Detection boshlandi...");
      predictVideo();
    }
  }, [modelLoaded]);

  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
    initializeModel();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="wrapper">
      <div className="container" style={{ position: 'relative', width: 'fit-content' }}>

        <video
          ref={videoRef}
          className="my-video"
          src={CAMERA_URL}
          autoPlay
          loop
          muted
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
            objectFit: 'cover'
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
            height: 'auto',
          }}
        />

        {!modelLoaded && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            color: 'white', background: 'rgba(0,0,0,0.7)', padding: '10px', borderRadius: '5px', zIndex: 20
          }}>
            Model yuklanmoqda...
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
