import React, { useState, useEffect, useRef } from 'react';
import { Zap, ZapOff, X, Terminal, Power } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const RabbitCamera = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [stream, setStream] = useState(null);
  const [flash, setFlash] = useState(false);
  const [shotsLeft, setShotsLeft] = useState(5);
  const [filterIndex, setFilterIndex] = useState(0);
  const [isDeveloping, setIsDeveloping] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [shutterPressed, setShutterPressed] = useState(false);

  // Debug State
  const [debugMode, setDebugMode] = useState(false);
  const [logs, setLogs] = useState([]);
  const [tapCount, setTapCount] = useState(0);

  // Swipe state for initialize gesture
  const [swipeStartY, setSwipeStartY] = useState(null);
  const [swipeProgress, setSwipeProgress] = useState(0);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [albumUrl, setAlbumUrl] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const debugLogRef = useRef(null);

  const filters = [
    { name: 'STD', class: 'brightness-105 contrast-110 saturate-100', label: 'Standard' },
    { name: 'BW', class: 'grayscale contrast-125 brightness-90 sepia-[.2]', label: 'Tri-X 400' },
    { name: 'VIVID', class: 'saturate-150 contrast-110 hue-rotate-[-10deg]', label: 'ColorPlus' },
    { name: 'WARM', class: 'sepia-[.4] contrast-100 brightness-105 saturate-100', label: 'Gold 200' },
  ];

  // Custom Logger
  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString().split(' ')[0];
    setLogs(prev => [`[${time}] ${msg}`, ...prev]);
    console.log(msg);
  };

  // Camera Management
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        addLog(`Stopped track: ${track.label}`);
      });
      setStream(null);
    }
  };

  // The "Env" constraints that were confirmed to work
  const ENV_CONSTRAINTS = {
    video: {
      facingMode: 'environment',
      width: { ideal: 240 },
      height: { ideal: 240 }
    }
  };

  const startCamera = async (constraints = ENV_CONSTRAINTS) => {
    stopCamera();
    addLog(`Req constraints: ${JSON.stringify(constraints)}`);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      addLog("Error: navigator.mediaDevices not supported");
      setHasPermission(false);
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      addLog(`Stream active: ${mediaStream.id}`);

      mediaStream.getVideoTracks().forEach(track => {
        addLog(`Track: ${track.label} (${track.readyState})`);
        const settings = track.getSettings();
        addLog(`Res: ${settings.width}x${settings.height}`);
      });

      setHasPermission(true);
      setStream(mediaStream);
    } catch (err) {
      addLog(`Error: ${err.name} - ${err.message}`);
      console.error("Camera error", err);
      setHasPermission(false);
    }
  };

  const listDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      addLog(`Found ${videoInputs.length} cameras:`);
      videoInputs.forEach(d => addLog(`- ${d.label || 'Unlabeled'} (ID: ${d.deviceId.slice(0,5)}...)`));
    } catch (err) {
      addLog(`Enum error: ${err.message}`);
    }
  };

  // Initial Camera Start
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Ensure video element gets the stream when it's rendered
  useEffect(() => {
    if (stream && videoRef.current && hasPermission) {
      const timer = setTimeout(() => {
        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
          videoRef.current.play()
            .then(() => addLog("Video element playback started"))
            .catch(e => addLog(`Video play error: ${e.message}`));
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [stream, hasPermission]);

  // Auto-scroll debug log
  useEffect(() => {
    if (debugLogRef.current && debugMode) {
      debugLogRef.current.scrollTop = 0;
    }
  }, [logs, debugMode]);

  // Debug Toggle Logic
  const handleLogoTap = () => {
    setTapCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 5) {
        setDebugMode(prevMode => !prevMode);
        addLog("Debug Mode Toggled");
        return 0;
      }
      return newCount;
    });
    setTimeout(() => setTapCount(0), 3000);
  };

  // Manual Play Trigger
  const handleManualPlay = () => {
    if (videoRef.current) {
      addLog("Attempting manual play...");
      videoRef.current.play()
        .then(() => addLog("Manual play success"))
        .catch(e => addLog(`Manual play fail: ${e.message}`));
    }
  };

  // Swipe up to initialize camera
  const SWIPE_THRESHOLD = 60;

  const handleSwipeStart = (e) => {
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    setSwipeStartY(y);
    setSwipeProgress(0);
  };

  const handleSwipeMove = (e) => {
    if (swipeStartY === null) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const delta = swipeStartY - y;
    const progress = Math.min(Math.max(delta / SWIPE_THRESHOLD, 0), 1);
    setSwipeProgress(progress);
  };

  const handleSwipeEnd = () => {
    if (swipeProgress >= 1) {
      startCamera(ENV_CONSTRAINTS);
    }
    setSwipeStartY(null);
    setSwipeProgress(0);
  };

  // Rabbit R1 Scroll Wheel Integration
  useEffect(() => {
    const handleScrollUp = (event) => {
      event.preventDefault();
      setFilterIndex(prev => (prev + 1) % filters.length);
    };

    const handleScrollDown = (event) => {
      event.preventDefault();
      setFilterIndex(prev => (prev - 1 + filters.length) % filters.length);
    };

    window.addEventListener('scrollUp', handleScrollUp, { passive: false, capture: true });
    window.addEventListener('scrollDown', handleScrollDown, { passive: false, capture: true });
    document.addEventListener('scrollUp', handleScrollUp, { passive: false, capture: true });
    document.addEventListener('scrollDown', handleScrollDown, { passive: false, capture: true });

    return () => {
      window.removeEventListener('scrollUp', handleScrollUp, { capture: true });
      window.removeEventListener('scrollDown', handleScrollDown, { capture: true });
      document.removeEventListener('scrollUp', handleScrollUp, { capture: true });
      document.removeEventListener('scrollDown', handleScrollDown, { capture: true });
    };
  }, [filters.length]);

  // Shutter Action
  const takePhoto = () => {
    if (shotsLeft <= 0 || isDeveloping) return;

    setShutterPressed(true);
    setTimeout(() => setShutterPressed(false), 200);

    const flashEl = document.getElementById('flash-overlay');
    if (flash && flashEl) {
      flashEl.style.opacity = '1';
      setTimeout(() => flashEl.style.opacity = '0', 100);
    }

    setIsDeveloping(true);

    setTimeout(() => {
      captureImage();
      setShotsLeft(prev => prev - 1);
      setIsDeveloping(false);
    }, 800);
  };

  // Convert filter class names to canvas filter string
  const getCanvasFilter = (filterObj) => {
    const filterClass = filterObj.class;
    let canvasFilter = '';

    // Parse Tailwind classes to CSS filter values
    if (filterClass.includes('grayscale')) canvasFilter += 'grayscale(100%) ';
    if (filterClass.includes('sepia-[.4]')) canvasFilter += 'sepia(40%) ';
    if (filterClass.includes('sepia-[.2]')) canvasFilter += 'sepia(20%) ';

    const brightnessMatch = filterClass.match(/brightness-(\d+)/);
    if (brightnessMatch) canvasFilter += `brightness(${parseInt(brightnessMatch[1]) / 100}) `;

    const contrastMatch = filterClass.match(/contrast-(\d+)/);
    if (contrastMatch) canvasFilter += `contrast(${parseInt(contrastMatch[1]) / 100}) `;

    const saturateMatch = filterClass.match(/saturate-(\d+)/);
    if (saturateMatch) canvasFilter += `saturate(${parseInt(saturateMatch[1]) / 100}) `;

    const hueMatch = filterClass.match(/hue-rotate-\[(-?\d+)deg\]/);
    if (hueMatch) canvasFilter += `hue-rotate(${hueMatch[1]}deg) `;

    return canvasFilter.trim() || 'none';
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Use full video resolution
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Apply filter to canvas context
    const currentFilter = filters[filterIndex];
    context.filter = getCanvasFilter(currentFilter);

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Reset filter
    context.filter = 'none';

    const imgUrl = canvas.toDataURL('image/jpeg', 0.92);
    const newPhoto = {
      id: Date.now(),
      url: imgUrl,
      filter: currentFilter,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setPhotos(prev => [newPhoto, ...prev]);
  };

  // Helper to convert Data URL to Blob for sharing
  const dataURItoBlob = (dataURI) => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  // ImgBB API - reliable free image hosting
  const IMGBB_API_KEY = '44ab2a4f5ce754d839bea66374e498a1';

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const handleUploadGallery = async () => {
    if (photos.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setAlbumUrl(null);

    try {
      const uploadedUrls = [];
      const totalPhotos = photos.length;

      // Upload each photo to ImgBB
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        addLog(`Uploading photo ${i + 1}/${totalPhotos}...`);

        const base64Data = photo.url.split(',')[1];

        const formData = new FormData();
        formData.append('key', IMGBB_API_KEY);
        formData.append('image', base64Data);
        formData.append('name', `r1-analog-${photo.id}`);

        const response = await fetch('https://api.imgbb.com/1/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error?.message || 'Upload failed');
        }

        uploadedUrls.push(data.data.url);
        setUploadProgress(((i + 1) / totalPhotos) * 100);

        // Small delay between uploads
        if (i < photos.length - 1) {
          await delay(500);
        }
      }

      // ImgBB doesn't have albums, so we'll show the first image
      // All URLs are logged for debug mode
      setAlbumUrl(uploadedUrls[0]);
      addLog(`Upload complete: ${uploadedUrls.length} photos`);
      uploadedUrls.forEach((url, i) => addLog(`Photo ${i + 1}: ${url}`));

    } catch (error) {
      console.error('Upload failed:', error);
      addLog(`Upload error: ${error.message}`);
      setUploadError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const reloadFilm = () => {
    setShotsLeft(5);
    setPhotos([]);
  };

  return (
    <div className="flex justify-center items-center w-full h-screen bg-neutral-900 font-mono overflow-hidden">
      {/* Device Frame - R1 viewport is 240x300 (320 minus 20px system bar) */}
      <div className="relative w-[240px] h-[300px] bg-black overflow-hidden shadow-2xl">
        {/* Full-screen Viewfinder */}
        <div className="absolute inset-0 bg-black">
          {/* Hardware Flash Overlay */}
          <div id="flash-overlay" className="absolute inset-0 bg-white opacity-0 z-50 pointer-events-none transition-opacity duration-75"></div>

          {/* Video Feed or Swipe to Start */}
          {hasPermission ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onClick={handleManualPlay}
              onLoadedMetadata={handleManualPlay}
              className={`w-full h-full object-cover ${filters[filterIndex].class}`}
            />
          ) : (
            <div
              onTouchStart={handleSwipeStart}
              onTouchMove={handleSwipeMove}
              onTouchEnd={handleSwipeEnd}
              onMouseDown={handleSwipeStart}
              onMouseMove={swipeStartY !== null ? handleSwipeMove : undefined}
              onMouseUp={handleSwipeEnd}
              onMouseLeave={handleSwipeEnd}
              className="w-full h-full flex flex-col items-center justify-center bg-[#1a1a1a] cursor-pointer select-none"
            >
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#2a2a2a]">
                <div className="h-full bg-[#D32F2F] transition-all duration-75" style={{ width: `${swipeProgress * 100}%` }} />
              </div>
              <div className="flex flex-col items-center transition-transform duration-75" style={{ transform: `translateY(${-swipeProgress * 20}px)` }}>
                <Power size={32} className="text-[#D32F2F] transition-all duration-75" style={{ opacity: 0.5 + swipeProgress * 0.5 }} />
                <div className="mt-3 flex flex-col items-center">
                  <div className="text-[#D32F2F] animate-bounce">
                    <svg width="20" height="12" viewBox="0 0 20 12" fill="currentColor">
                      <path d="M10 0L20 12H0L10 0Z" />
                    </svg>
                  </div>
                  <span className="text-[#666] font-black text-[9px] tracking-widest mt-2">SWIPE UP</span>
                </div>
              </div>
            </div>
          )}

          {/* Debug Overlay */}
          {debugMode && (
            <div className="absolute inset-0 bg-black/90 z-[60] text-[#00ff00] font-mono text-[8px] p-2 overflow-hidden flex flex-col">
              <div className="flex justify-between items-center border-b border-green-900 pb-1 mb-1">
                <span className="font-bold flex gap-1 items-center"><Terminal size={8}/> DEBUG</span>
                <button onClick={() => setDebugMode(false)}><X size={10} /></button>
              </div>
              <div className="flex-1 overflow-y-auto mb-1 break-all" ref={debugLogRef}>
                {logs.map((log, i) => (<div key={i} className="mb-0.5 opacity-80">{log}</div>))}
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button onClick={() => startCamera(ENV_CONSTRAINTS)} className="bg-green-900/50 p-1 rounded hover:bg-green-800 text-[6px] border border-green-700">Start (Env)</button>
                <button onClick={() => startCamera({ video: { facingMode: 'user' } })} className="bg-green-900/50 p-1 rounded hover:bg-green-800 text-[6px] border border-green-700">Start (User)</button>
                <button onClick={() => startCamera({ video: true })} className="bg-green-900/50 p-1 rounded hover:bg-green-800 text-[6px] border border-green-700">Start (Basic)</button>
                <button onClick={listDevices} className="bg-green-900/50 p-1 rounded hover:bg-green-800 text-[6px] border border-green-700">List Devices</button>
              </div>
            </div>
          )}

          {/* Viewfinder HUD */}
          {!debugMode && hasPermission && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 border-white/40"></div>
              <div className="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 border-white/40"></div>
              <div className="absolute bottom-24 left-3 w-4 h-4 border-l-2 border-b-2 border-white/40"></div>
              <div className="absolute bottom-24 right-3 w-4 h-4 border-r-2 border-b-2 border-white/40"></div>
            </div>
          )}

          {/* Developing Animation */}
          {isDeveloping && (
            <div className="absolute inset-0 bg-black flex items-center justify-center z-40">
              <div className="text-[#D32F2F] font-black text-sm animate-bounce tracking-tighter">DEVELOPING...</div>
            </div>
          )}
        </div>

        {/* Top Status Bar - Overlaid */}
        <div className="absolute top-0 left-0 right-0 z-30 flex justify-between items-center p-2 bg-gradient-to-b from-black/70 to-transparent">
          <div onClick={handleLogoTap} className="flex items-center gap-1 text-[#D32F2F] cursor-pointer select-none active:opacity-50">
            <div className="w-1.5 h-1.5 bg-[#D32F2F] rounded-full animate-pulse"></div>
            <span className="text-[8px] font-bold tracking-wider">R1-ANALOG</span>
          </div>
          <div className="flex items-center gap-2 text-white text-[8px] font-bold">
            <button onClick={() => setFlash(!flash)} className="active:scale-90 transition-transform">
              {flash ? <Zap size={12} fill="white" className="text-white" /> : <ZapOff size={12} className="opacity-50" />}
            </button>
          </div>
        </div>

        {/* Bottom Controls - Overlaid on viewfinder */}
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/80 via-black/60 to-transparent pt-6 pb-2 px-2">
          {/* Filter indicator */}
          <div className="flex justify-center items-center gap-2 mb-2">
            <span className="text-[8px] font-bold text-white/60 uppercase">{filters[filterIndex].label}</span>
            <div className="flex gap-1">
              {filters.map((f, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === filterIndex ? 'bg-[#D32F2F]' : 'bg-white/30'}`}></div>
              ))}
            </div>
          </div>

          {/* Main controls row */}
          <div className="flex items-center justify-between">
            {/* Photos taken counter - tap to upload gallery */}
            <div
              onClick={photos.length > 0 ? handleUploadGallery : undefined}
              className={`w-12 h-12 bg-black/50 backdrop-blur rounded-lg flex flex-col items-center justify-center border border-white/10 ${photos.length > 0 ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
            >
              <span className={`text-lg font-black leading-none ${photos.length > 0 ? 'text-[#D32F2F]' : 'text-white/30'}`}>{photos.length}</span>
              <span className="text-[6px] text-white/50 font-bold">{photos.length > 0 ? 'UPLOAD' : 'PHOTOS'}</span>
            </div>

            {/* Shutter Button */}
            <button
              onClick={takePhoto}
              disabled={shotsLeft <= 0}
              className={`w-16 h-16 rounded-full border-4 border-white/30 flex items-center justify-center transition-all duration-100 ${shutterPressed ? 'scale-90' : 'scale-100'} ${shotsLeft <= 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className={`w-12 h-12 rounded-full ${shutterPressed ? 'bg-red-900' : 'bg-[#D32F2F]'}`}></div>
            </button>

            {/* Shots remaining counter */}
            <div className="w-12 h-12 bg-black/50 backdrop-blur rounded-lg flex flex-col items-center justify-center border border-white/10">
              <span className="text-lg font-black text-white/70 leading-none">{shotsLeft}</span>
              <span className="text-[6px] text-white/50 font-bold">LEFT</span>
            </div>
          </div>
        </div>

        {/* Hidden Canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Upload Progress Overlay */}
      {isUploading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4">
          <div className="w-full max-w-[200px] text-center">
            <div className="text-[#D32F2F] font-bold text-sm mb-4">UPLOADING</div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-[#D32F2F] transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="text-white/60 text-xs">{Math.round(uploadProgress)}%</div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {albumUrl && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 p-2">
          <div className="bg-white w-full max-w-[220px] rounded-2xl overflow-hidden flex flex-col items-center p-4">
            <div className="text-[#D32F2F] font-bold text-sm mb-3">SCAN TO VIEW</div>
            <div className="bg-white p-2 rounded-lg shadow-inner">
              <QRCodeSVG value={albumUrl} size={140} level="M" />
            </div>
            <div className="mt-3 text-[8px] text-gray-500 text-center break-all px-2">{albumUrl}</div>
            <button
              onClick={() => setAlbumUrl(null)}
              className="mt-4 w-full py-2 bg-black text-white rounded-lg font-bold text-xs active:scale-95 transition-transform"
            >
              DONE
            </button>
          </div>
        </div>
      )}

      {/* Upload Error Modal */}
      {uploadError && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 p-4">
          <div className="bg-white w-full max-w-[200px] rounded-2xl overflow-hidden flex flex-col items-center p-4">
            <div className="text-[#D32F2F] font-bold text-sm mb-2">UPLOAD FAILED</div>
            <div className="text-[10px] text-gray-600 text-center mb-4">{uploadError}</div>
            <button
              onClick={() => setUploadError(null)}
              className="w-full py-2 bg-black text-white rounded-lg font-bold text-xs active:scale-95 transition-transform"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RabbitCamera;
