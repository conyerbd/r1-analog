import React, { useState, useEffect, useRef } from 'react';

import { Camera, Zap, ZapOff, Image as ImageIcon, RotateCcw, X, Aperture, Share, Download } from 'lucide-react';



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

  

  const videoRef = useRef(null);

  const canvasRef = useRef(null);



  const filters = [

    { name: 'STD', class: 'brightness-105 contrast-110 saturate-100', label: 'Standard' },

    { name: 'BW', class: 'grayscale contrast-125 brightness-90 sepia-[.2]', label: 'Tri-X 400' },

    { name: 'VIVID', class: 'saturate-150 contrast-110 hue-rotate-[-10deg]', label: 'ColorPlus' },

    { name: 'WARM', class: 'sepia-[.4] contrast-100 brightness-105 saturate-100', label: 'Gold 200' },

  ];



  // Camera Setup

  useEffect(() => {

    const startCamera = async () => {

      try {

        const mediaStream = await navigator.mediaDevices.getUserMedia({ 

          video: { facingMode: 'environment', width: { ideal: 240 }, height: { ideal: 240 } } 

        });

        setStream(mediaStream);

        if (videoRef.current) {

          videoRef.current.srcObject = mediaStream;

        }

        setHasPermission(true);

      } catch (err) {

        console.error("Camera access denied or unavailable", err);

        setHasPermission(false);

      }

    };

    startCamera();



    return () => {

      if (stream) {

        stream.getTracks().forEach(track => track.stop());

      }

    };

  }, []);



  // Rabbit R1 Scroll Wheel Integration for Filter Selection

  useEffect(() => {

    const handleScrollUp = (event) => {

      event.preventDefault();

      setFilterIndex(prev => (prev + 1) % filters.length);

    };



    const handleScrollDown = (event) => {

      event.preventDefault();

      setFilterIndex(prev => (prev - 1 + filters.length) % filters.length);

    };



    // Add R1 scroll wheel event listeners

    window.addEventListener('scrollUp', handleScrollUp, { passive: false, capture: true });

    window.addEventListener('scrollDown', handleScrollDown, { passive: false, capture: true });

    document.addEventListener('scrollUp', handleScrollUp, { passive: false, capture: true });

    document.addEventListener('scrollDown', handleScrollDown, { passive: false, capture: true });



    // Cleanup event listeners on component unmount

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



    // Flash effect

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

    }, 800); // Simulate mechanical lag

  };



  const captureImage = () => {

    if (!videoRef.current || !canvasRef.current) return;

    

    const video = videoRef.current;

    const canvas = canvasRef.current;

    const context = canvas.getContext('2d');



    // Set canvas dimensions to match video

    canvas.width = video.videoWidth;

    canvas.height = video.videoHeight;



    // Apply filters via context if needed, or just capture raw and apply CSS in gallery

    // For simplicity, we capture raw here and store the filter metadata

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



  // Share Functionality (Web Share API)

  const handleShare = async (e, photo) => {

    e.stopPropagation(); // Prevent bubbling if needed

    

    try {

      const blob = dataURItoBlob(photo.url);

      const file = new File([blob], `r1-analog-${photo.date.replace(/:/g, '-')}-${photo.filter.name}.jpg`, { type: 'image/jpeg' });

      

      // Check if Web Share API is available and supports files

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {

        await navigator.share({

          files: [file],

          title: 'Rabbit R1 Analog Photo',

          text: `Shot on R1 Analog using ${photo.filter.label} film.`

        });

      } else {

        // Fallback: Download

        downloadPhoto(photo);

      }

    } catch (error) {

      // User cancelled share or error occurred - fallback to download

      if (error.name !== 'AbortError') {

        console.log('Sharing failed, using download fallback:', error);

      }

      downloadPhoto(photo);

    }

  };



  // Download Functionality

  const downloadPhoto = (photo) => {

    const link = document.createElement('a');

    link.href = photo.url;

    link.download = `r1-analog-${photo.date.replace(/:/g, '-')}-${photo.filter.name}.jpg`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

  };



  // Reset Film

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

            <div className="flex justify-between items-center mb-1 text-black font-bold text-[8px] uppercase tracking-wider">

                <div className="flex items-center gap-1 text-[#D32F2F]">

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

            <div className="flex-1 bg-black rounded-xl overflow-hidden relative border-2 border-black shadow-inner">

                {/* Hardware Flash Overlay */}

                <div id="flash-overlay" className="absolute inset-0 bg-white opacity-0 z-50 pointer-events-none transition-opacity duration-75"></div>



                {/* Video Feed */}

                {hasPermission ? (

                    <video 

                        ref={videoRef} 

                        autoPlay 

                        playsInline 

                        muted 

                        className={`w-full h-full object-cover transform transition-all duration-300 ${filters[filterIndex].class}`}

                    />

                ) : (

                    <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500 bg-neutral-900 gap-2">

                        <Aperture className="animate-spin duration-[10s]" size={32} />

                        <span className="text-[8px] uppercase tracking-widest">Lens Cap On</span>

                    </div>

                )}

                

                {/* Viewfinder HUD */}

                <div className="absolute inset-0 pointer-events-none border border-white/10 m-2 rounded">

                    {/* Crosshair */}

                    <div className="absolute top-1/2 left-1/2 w-3 h-3 -ml-1.5 -mt-1.5 border-l border-t border-white/50"></div>

                    <div className="absolute top-1/2 left-1/2 w-3 h-3 -ml-1.5 -mt-1.5 border-r border-b border-white/50 rotate-180"></div>

                    

                    {/* Filter Name */}

                    <div className="absolute bottom-1 right-1 bg-black/50 backdrop-blur-md px-1.5 py-0.5 rounded text-white text-[8px] font-bold uppercase">

                        {filters[filterIndex].name}

                    </div>

                </div>



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

                                    <div className="flex items-center gap-1.5">

                                        <button 

                                            onClick={(e) => handleShare(e, photo)} 

                                            className="p-1 bg-[#D32F2F] rounded active:scale-95 transition-transform"

                                            title="Share photo"

                                        >

                                            <Share size={10} className="text-white" />

                                        </button>

                                        <button 

                                            onClick={(e) => { e.stopPropagation(); downloadPhoto(photo); }} 

                                            className="p-1 bg-black rounded active:scale-95 transition-transform"

                                            title="Download photo"

                                        >

                                            <Download size={10} className="text-white" />

                                        </button>

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
