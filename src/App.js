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

      setStream(mediaStream);

      addLog(`Stream active: ${mediaStream.id}`);

      

      mediaStream.getVideoTracks().forEach(track => {

          addLog(`Track: ${track.label} (${track.readyState})`);

          // Check actual settings

          const settings = track.getSettings();

          addLog(`Res: ${settings.width}x${settings.height}`);

      });



      // Explicitly wait a tick before setting srcObject to ensure ref is stable

      if (videoRef.current) {

        videoRef.current.srcObject = mediaStream;

        // Force play inside the promise chain

        try {

            await videoRef.current.play();

            addLog("Playback started successfully");

        } catch (playErr) {

            addLog(`Auto-play failed (requires interaction?): ${playErr.message}`);

        }

      }

      setHasPermission(true);

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



  // Initial Camera Start - Still try on mount, but provide UI fallback

  useEffect(() => {

    startCamera();

    return () => stopCamera();

  }, []);



  // Ensure video element gets the stream when it's rendered

  useEffect(() => {

    if (stream && videoRef.current && hasPermission) {

      videoRef.current.srcObject = stream;

      videoRef.current.play()

        .then(() => addLog("Video element playback started"))

        .catch(e => addLog(`Video play error: ${e.message}`));

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

      // Reset tap count if too slow (Increased to 3s for easier tapping on device)

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

      

      {/* Device Frame (The R1 Hardware Simulation) - GREEN VERSION */}

      <div className="relative w-[240px] h-[300px] bg-[#388E3C] flex flex-col overflow-hidden shadow-2xl">

        

        {/* Screen Area */}

        <div className="flex-1 flex flex-col p-2 relative z-10">

            

            {/* Top Status Bar */}

            <div className="flex justify-between items-center mb-1 text-black font-bold text-[8px] uppercase tracking-wider relative z-50">

                {/* Debug Trigger Area */}

                <div 

                    onClick={handleLogoTap}

                    className="flex items-center gap-1 text-[#D32F2F] cursor-pointer select-none active:opacity-50 p-2 -ml-2 -mt-2 z-50"

                >

                   <div className="w-1.5 h-1.5 bg-[#D32F2F] rounded-full animate-pulse"></div>

                   <span>R1-ANALOG</span>

                </div>

                <div className="flex items-center gap-1.5">

                    <button onClick={() => setFlash(!flash)} className="active:scale-90 transition-transform">

                        {flash ? <Zap size={12} fill="black" /> : <ZapOff size={12} className="opacity-50" />}

                    </button>

                    <span>BAT 42%</span>

                </div>

            </div>



            {/* Viewfinder Card */}

            <div className="flex-1 bg-black rounded-xl overflow-hidden relative border-2 border-black shadow-inner group">

                {/* Hardware Flash Overlay */}

                <div id="flash-overlay" className="absolute inset-0 bg-white opacity-0 z-50 pointer-events-none transition-opacity duration-75"></div>



                {/* Video Feed or Start Button */}

                {hasPermission ? (

                    <video 

                        ref={videoRef} 

                        autoPlay 

                        playsInline 

                        muted 

                        onClick={handleManualPlay}

                        onLoadedMetadata={handleManualPlay}

                        className={`w-full h-full object-cover transform transition-all duration-300 ${filters[filterIndex].class}`}

                    />

                ) : (

                    // RETRO PHYSICAL START BUTTON

                    <button 

                        onClick={() => startCamera(ENV_CONSTRAINTS)}

                        className="w-full h-full flex flex-col items-center justify-center bg-[#1a1a1a] cursor-pointer z-30 relative group"

                    >

                         <div className="w-20 h-20 bg-[#2a2a2a] rounded-xl border-b-4 border-r-4 border-black flex items-center justify-center active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1 transition-all shadow-xl">

                             <Power size={32} className="text-[#D32F2F] opacity-90 group-hover:opacity-100 group-hover:drop-shadow-[0_0_8px_rgba(211,47,47,0.6)]" />

                         </div>

                         <span className="text-[#444] font-black text-[10px] tracking-widest mt-4 group-hover:text-[#D32F2F] transition-colors">INITIALIZE</span>

                    </button>

                )}



                {/* Debug Overlay */}

                {debugMode && (

                    <div className="absolute inset-0 bg-black/80 z-[60] text-[#00ff00] font-mono text-[8px] p-2 overflow-hidden flex flex-col">

                        <div className="flex justify-between items-center border-b border-green-900 pb-1 mb-1">

                            <span className="font-bold flex gap-1 items-center"><Terminal size={8}/> DEBUG</span>

                            <button onClick={() => setDebugMode(false)}><X size={10} /></button>

                        </div>

                        <div className="flex-1 overflow-y-auto mb-1 break-all" ref={debugLogRef}>

                            {logs.map((log, i) => (

                                <div key={i} className="mb-0.5 opacity-80">{log}</div>

                            ))}

                        </div>

                        <div className="grid grid-cols-2 gap-1">

                            <button onClick={() => startCamera(ENV_CONSTRAINTS)} className="bg-green-900/50 p-1 rounded hover:bg-green-800 text-[6px] border border-green-700">Start (Env)</button>

                            <button onClick={() => startCamera({ video: { facingMode: 'user' } })} className="bg-green-900/50 p-1 rounded hover:bg-green-800 text-[6px] border border-green-700">Start (User)</button>

                            <button onClick={() => startCamera({ video: true })} className="bg-green-900/50 p-1 rounded hover:bg-green-800 text-[6px] border border-green-700">Start (Basic)</button>

                            <button onClick={listDevices} className="bg-green-900/50 p-1 rounded hover:bg-green-800 text-[6px] border border-green-700">List Devices</button>

                        </div>

                    </div>

                )}

                

                {/* Viewfinder HUD - Only show if debug is OFF and we have permission */}

                {!debugMode && hasPermission && (

                    <div className="absolute inset-0 pointer-events-none border border-white/10 m-2 rounded">

                        {/* Crosshair - Top Left */}

                        <div className="absolute top-2 left-2 w-3 h-3 border-l border-t border-white/50"></div>

                        {/* Crosshair - Bottom Right */}

                        <div className="absolute bottom-2 right-2 w-3 h-3 border-r border-b border-white/50"></div>

                        

                        {/* Filter Name - Bottom Left */}

                        <div className="absolute bottom-1 left-1 bg-black/50 backdrop-blur-md px-1.5 py-0.5 rounded text-white text-[8px] font-bold uppercase">

                            {filters[filterIndex].name}

                        </div>

                    </div>

                )}



                {/* Developing Animation Overlay - RED ACCENT */}

                {isDeveloping && (

                    <div className="absolute inset-0 bg-black flex items-center justify-center z-40">

                        <div className="text-[#D32F2F] font-black text-sm animate-bounce tracking-tighter">

                            DEVELOPING...

                        </div>

                    </div>

                )}

            </div>



            {/* Hidden Canvas for capture */}

            <canvas ref={canvasRef} className="hidden" />



            {/* Controls Area */}

            <div className="mt-2 grid grid-cols-4 gap-1.5 h-16">

                

                {/* Gallery / Info Box - NOW BLACK & RED */}

                <div 

                    onClick={() => setGalleryOpen(true)}

                    className="col-span-1 bg-black rounded-xl flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform border-b-2 border-gray-800 p-1"

                >

                    {photos.length > 0 ? (

                        <div className="relative w-6 h-6 rounded overflow-hidden border border-[#D32F2F]">

                            <img src={photos[0].url} className={`w-full h-full object-cover ${photos[0].filter.class}`} alt="thumb" />

                        </div>

                    ) : (

                        <ImageIcon size={16} className="text-[#D32F2F]" />

                    )}

                    <span className="text-[7px] font-bold mt-0.5 text-[#D32F2F]">GALLERY</span>

                </div>



                {/* Shutter Button - NOW BLACK & RED */}

                <div className="col-span-2 flex items-center justify-center">

                    <button 

                        onClick={takePhoto}

                        disabled={shotsLeft <= 0}

                        className={`

                            w-16 h-16 rounded-full border-4 border-black

                            flex items-center justify-center shadow-lg transition-all duration-100

                            ${shutterPressed ? 'scale-90 bg-black' : 'scale-100 bg-black'}

                            ${shotsLeft <= 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}

                        `}

                    >

                        {/* Red inner button */}

                        <div className={`w-14 h-14 rounded-full border-2 border-red-900 ${shutterPressed ? 'bg-red-900' : 'bg-[#D32F2F]'}`}></div>

                    </button>

                </div>



                {/* Film Counter / Settings - RED ACCENT */}

                <div className="col-span-1 bg-black rounded-xl flex flex-col items-center justify-center text-[#D32F2F] border-b-2 border-gray-800 p-1">

                    <span className="text-[7px] font-bold opacity-70">EXP</span>

                    <span className="text-xl font-black leading-none">{shotsLeft}</span>

                    <span className="text-[7px] opacity-70 mt-0.5">/24</span>

                </div>

            </div>



            {/* Filter Wheel Indicator */}

            <div className="mt-1 bg-black/10 rounded-lg p-1 flex items-center justify-between">

                <span className="text-[7px] font-bold text-black opacity-60">FILM STOCK</span>

                <div className="flex gap-1">

                    {filters.map((f, i) => (

                        <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === filterIndex ? 'bg-black' : 'bg-white'}`}></div>

                    ))}

                </div>

            </div>

        </div>

        

        {/* Rabbit Mascot / Branding */}

        <div className="absolute bottom-1 right-2 pointer-events-none opacity-20">

             <pre className="text-[6px] leading-[6px] font-bold text-black">

{` (\\_/)

 (•_•)

 / > 📷`}

             </pre>

        </div>

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
