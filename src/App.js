import React, { useState, useEffect, useRef } from 'react';
import { Camera, Zap, ZapOff, Image as ImageIcon, RotateCcw, X, Aperture, Share, Terminal, RefreshCw, Power } from 'lucide-react';

const RabbitCamera = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [stream, setStream] = useState(null);
  const [flash, setFlash] = useState(false);
  const [shotsLeft, setShotsLeft] = useState(24);
  const [filterIndex, setFilterIndex] = useState(0);
  const [isDeveloping, setIsDeveloping] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [shutterPressed, setShutterPressed] = useState(false);

  // Debug State
  const [debugMode, setDebugMode] = useState(false);
  const [logs, setLogs] = useState([]);
  const [tapCount, setTapCount] = useState(0);

  // Swipe state for initialize gesture
  const [swipeStartY, setSwipeStartY] = useState(null);
  const [swipeProgress, setSwipeProgress] = useState(0);

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

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imgUrl = canvas.toDataURL('image/jpeg');
    const newPhoto = {
      id: Date.now(),
      url: imgUrl,
      filter: filters[filterIndex],
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

  const handleShare = async (e, photo) => {
    e.stopPropagation();
    try {
      const blob = dataURItoBlob(photo.url);
      const file = new File([blob], `r1-analog-${photo.id}.jpg`, { type: 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Rabbit R1 Analog Photo',
          text: `Shot on R1 Analog using ${photo.filter.name} film.`
        });
      } else {
        const link = document.createElement('a');
        link.href = photo.url;
        link.download = `r1-analog-${photo.id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.log('Sharing failed', error);
      const link = document.createElement('a');
      link.href = photo.url;
      link.download = `r1-analog-${photo.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const reloadFilm = () => {
    setShotsLeft(24);
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
            {/* Gallery button */}
            <div onClick={() => setGalleryOpen(true)} className="w-12 h-12 bg-black/50 backdrop-blur rounded-lg flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform border border-white/10">
              {photos.length > 0 ? (
                <div className="relative w-6 h-6 rounded overflow-hidden border border-[#D32F2F]">
                  <img src={photos[0].url} className={`w-full h-full object-cover ${photos[0].filter.class}`} alt="thumb" />
                </div>
              ) : (
                <ImageIcon size={16} className="text-white/70" />
              )}
              <span className="text-[6px] font-bold mt-0.5 text-white/50">{photos.length}</span>
            </div>

            {/* Shutter Button */}
            <button
              onClick={takePhoto}
              disabled={shotsLeft <= 0}
              className={`w-16 h-16 rounded-full border-4 border-white/30 flex items-center justify-center transition-all duration-100 ${shutterPressed ? 'scale-90' : 'scale-100'} ${shotsLeft <= 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className={`w-12 h-12 rounded-full ${shutterPressed ? 'bg-red-900' : 'bg-[#D32F2F]'}`}></div>
            </button>

            {/* Exposure counter */}
            <div className="w-12 h-12 bg-black/50 backdrop-blur rounded-lg flex flex-col items-center justify-center border border-white/10">
              <span className="text-lg font-black text-[#D32F2F] leading-none">{shotsLeft}</span>
              <span className="text-[6px] text-white/50 font-bold">LEFT</span>
            </div>
          </div>
        </div>

        {/* Hidden Canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Gallery Overlay */}
      {galleryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 backdrop-blur-sm">
          <div className="bg-[#f0f0f0] w-full max-w-[240px] h-[280px] rounded-2xl overflow-hidden flex flex-col relative shadow-2xl">
            <div className="p-2 bg-white border-b flex justify-between items-center">
              <h2 className="font-bold text-sm tracking-tight">CAMERA ROLL</h2>
              <button onClick={() => setGalleryOpen(false)} className="p-1 bg-gray-100 rounded-full hover:bg-gray-200">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {photos.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                  <ImageIcon size={32} />
                  <p className="text-xs">No photos yet.</p>
                </div>
              ) : (
                photos.map((photo) => (
                  <div key={photo.id} className="bg-white p-2 rounded-lg shadow-sm border border-gray-200">
                    <div className="aspect-[4/3] bg-gray-100 rounded overflow-hidden mb-1">
                      <img src={photo.url} alt="capture" className={`w-full h-full object-cover ${photo.filter.class}`} />
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">{photo.filter.label}</div>
                        <div className="text-[8px] font-mono text-gray-400">{photo.date}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleShare(e, photo)}
                          className="p-1 bg-gray-100 rounded hover:bg-gray-200 active:scale-95 transition-transform"
                        >
                          <Share size={10} className="text-black" />
                        </button>
                        <div className="text-[8px] font-bold text-[#D32F2F]">R1-CAM</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {shotsLeft < 24 && (
              <div className="p-2 bg-white border-t">
                <button
                  onClick={reloadFilm}
                  className="w-full py-2 bg-black text-white rounded-lg font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform text-xs"
                >
                  <RotateCcw size={12} />
                  RELOAD FILM
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RabbitCamera;
