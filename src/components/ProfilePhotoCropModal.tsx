import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  X,
  Move,
  AlertCircle,
  Eye,
  Camera
} from 'lucide-react';

export interface ProfilePhotoCropModalProps {
  isOpen: boolean;
  imageFile: File | null;
  onClose: () => void;
  onSaveCroppedImage: (croppedDataUrl: string) => Promise<void> | void;
}

export const ProfilePhotoCropModal: React.FC<ProfilePhotoCropModalProps> = ({
  isOpen,
  imageFile,
  onClose,
  onSaveCroppedImage,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialTouchDistance, setInitialTouchDistance] = useState<number | null>(null);
  const [touchStartZoom, setTouchStartZoom] = useState<number>(1);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cropSize = 260; // diameter in pixels of the circular crop frame

  // 1. Validate and load image file
  useEffect(() => {
    if (!isOpen || !imageFile) {
      setImageSrc(null);
      setNaturalDimensions(null);
      setErrorMessage(null);
      return;
    }

    setErrorMessage(null);

    // Validate MIME type
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimes.includes(imageFile.type)) {
      setErrorMessage('Please select a valid image file (JPEG, PNG, or WebP).');
      return;
    }

    // Validate File Size (Max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (imageFile.size > MAX_SIZE) {
      setErrorMessage('File size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    const img = new Image();
    img.src = objectUrl;

    img.onload = () => {
      // Validate minimum resolution
      if (img.naturalWidth < 100 || img.naturalHeight < 100) {
        setErrorMessage('Image resolution is too low (minimum 100 × 100 pixels required).');
        URL.revokeObjectURL(objectUrl);
        return;
      }
      setNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setImageSrc(objectUrl);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };

    img.onerror = () => {
      setErrorMessage('Failed to decode image. The file may be corrupted.');
      URL.revokeObjectURL(objectUrl);
    };

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [isOpen, imageFile]);

  // Calculate base display dimensions (covering the crop frame at zoom 1)
  const getBaseDimensions = useCallback(() => {
    if (!naturalDimensions) return { baseWidth: cropSize, baseHeight: cropSize };
    const { width, height } = naturalDimensions;
    const aspect = width / height;

    let baseWidth: number;
    let baseHeight: number;

    if (aspect >= 1) {
      // Landscape or square: match height to cropSize, scale width
      baseHeight = cropSize;
      baseWidth = cropSize * aspect;
    } else {
      // Portrait: match width to cropSize, scale height
      baseWidth = cropSize;
      baseHeight = cropSize / aspect;
    }

    return { baseWidth, baseHeight };
  }, [naturalDimensions, cropSize]);

  // Clamp translation offset to prevent empty space inside crop circle
  const clampOffset = useCallback((x: number, y: number, currentZoom: number) => {
    const { baseWidth, baseHeight } = getBaseDimensions();
    const renderedWidth = baseWidth * currentZoom;
    const renderedHeight = baseHeight * currentZoom;

    const maxOffsetX = (renderedWidth - cropSize) / 2;
    const maxOffsetY = (renderedHeight - cropSize) / 2;

    const clampedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, x));
    const clampedY = Math.max(-maxOffsetY, Math.min(maxOffsetY, y));

    return { x: clampedX, y: clampedY };
  }, [getBaseDimensions, cropSize]);

  // Re-clamp offset when zoom changes
  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.max(1, Math.min(3, newZoom));
    setZoom(clampedZoom);
    setOffset(prev => clampOffset(prev.x, prev.y, clampedZoom));
  };

  // Mouse Drag Events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const rawX = e.clientX - dragStart.x;
    const rawY = e.clientY - dragStart.y;
    setOffset(clampOffset(rawX, rawY, zoom));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Events (Drag & Pinch-to-Zoom)
  const getTouchDistance = (t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      setInitialTouchDistance(dist);
      setTouchStartZoom(zoom);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      const rawX = touch.clientX - dragStart.x;
      const rawY = touch.clientY - dragStart.y;
      setOffset(clampOffset(rawX, rawY, zoom));
    } else if (e.touches.length === 2 && initialTouchDistance !== null) {
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      const factor = dist / initialTouchDistance;
      const newZoom = touchStartZoom * factor;
      handleZoomChange(newZoom);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setInitialTouchDistance(null);
  };

  // Reset positioning and zoom
  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  // 2. Export 512x512 cropped canvas
  const generateCroppedCanvas = useCallback((): HTMLCanvasElement | null => {
    if (!imageRef.current || !naturalDimensions) return null;

    const img = imageRef.current;
    const { baseWidth, baseHeight } = getBaseDimensions();
    const renderedWidth = baseWidth * zoom;
    const renderedHeight = baseHeight * zoom;

    // Scale factor from natural image to rendered viewport
    const scale = renderedWidth / naturalDimensions.width;

    // Center of the circular frame in rendered space
    const centerRenderedX = renderedWidth / 2 - offset.x;
    const centerRenderedY = renderedHeight / 2 - offset.y;

    // Radius in natural pixels
    const radiusNatural = (cropSize / 2) / scale;
    const centerNaturalX = centerRenderedX / scale;
    const centerNaturalY = centerRenderedY / scale;

    const srcX = Math.max(0, centerNaturalX - radiusNatural);
    const srcY = Math.max(0, centerNaturalY - radiusNatural);
    const srcDiameter = radiusNatural * 2;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Enable high-quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      img,
      srcX,
      srcY,
      srcDiameter,
      srcDiameter,
      0,
      0,
      512,
      512
    );

    return canvas;
  }, [naturalDimensions, getBaseDimensions, zoom, offset, cropSize]);

  // Generate live circular preview thumbnail
  useEffect(() => {
    if (!isOpen || !imageSrc || !naturalDimensions) return;

    const timer = setTimeout(() => {
      const canvas = generateCroppedCanvas();
      if (canvas) {
        setLivePreviewUrl(canvas.toDataURL('image/webp', 0.85));
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, imageSrc, naturalDimensions, zoom, offset, generateCroppedCanvas]);

  // Save handler
  const handleSave = async () => {
    const canvas = generateCroppedCanvas();
    if (!canvas) {
      setErrorMessage('Could not generate cropped image.');
      return;
    }

    try {
      setIsSaving(true);
      // High-resolution JPEG or WebP data URL
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      await onSaveCroppedImage(croppedDataUrl);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save cropped photograph.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const { baseWidth, baseHeight } = getBaseDimensions();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-crop-title"
    >
      <div
        className="w-full max-w-lg bg-[#14171C] border border-[rgba(255,255,255,0.12)] rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/90 overflow-hidden flex flex-col my-auto text-[#F2F0EA]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between bg-[#111318]">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-[rgba(198,166,106,0.12)] border border-[rgba(198,166,106,0.30)] text-[#C6A66A]">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#92949A] block leading-tight">
                Profile Photo
              </span>
              <h2 id="photo-crop-title" className="text-sm sm:text-base font-bold text-[#F2F0EA]">
                Position, Zoom & Crop Avatar
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#92949A] hover:text-[#F2F0EA] hover:bg-[#191D23] transition cursor-pointer"
            aria-label="Close Crop Modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-900/50 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Image Viewport Container */}
          <div className="relative flex flex-col items-center select-none">
            <div
              ref={containerRef}
              style={{ width: cropSize, height: cropSize }}
              className="relative overflow-hidden rounded-full border-2 border-[#C6A66A] shadow-2xl shadow-black/80 cursor-grab active:cursor-grabbing touch-none bg-[#090A0C]"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {imageSrc ? (
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Crop Preview Target"
                  draggable={false}
                  style={{
                    width: baseWidth * zoom,
                    height: baseHeight * zoom,
                    transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
                    maxWidth: 'none',
                    maxHeight: 'none',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    marginTop: -(baseHeight * zoom) / 2,
                    marginLeft: -(baseWidth * zoom) / 2,
                    transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                  }}
                  className="pointer-events-none select-none"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-[#92949A]">
                  Loading preview...
                </div>
              )}

              {/* Center crosshair subtle reference */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20">
                <div className="w-full h-[1px] bg-white/40" />
                <div className="h-full w-[1px] bg-white/40 absolute" />
              </div>
            </div>

            {/* Instruction Cue */}
            <div className="mt-2.5 flex items-center space-x-1.5 text-[11px] text-[#C0BDB5] font-medium">
              <Move className="h-3 w-3 text-[#C6A66A]" />
              <span>Drag image to center your face inside the circle</span>
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="p-3.5 rounded-xl bg-[#191D23] border border-[rgba(255,255,255,0.08)] space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#F2F0EA]">
              <span className="flex items-center space-x-1 text-[11px] text-[#92949A]">
                <span>Zoom Level</span>
              </span>
              <span className="font-mono text-[#C6A66A] text-[11px]">
                {zoom.toFixed(2)}×
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => handleZoomChange(zoom - 0.1)}
                disabled={zoom <= 1}
                className="p-1.5 rounded-lg bg-[#14171C] border border-[rgba(255,255,255,0.1)] text-[#C0BDB5] hover:text-[#F2F0EA] disabled:opacity-40 transition cursor-pointer"
                aria-label="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>

              <input
                type="range"
                min="1"
                max="3"
                step="0.02"
                value={zoom}
                onChange={e => handleZoomChange(parseFloat(e.target.value))}
                className="flex-1 accent-[#C6A66A] cursor-pointer h-1.5 bg-[#0D1014] rounded-lg"
                aria-label="Adjust zoom slider"
              />

              <button
                type="button"
                onClick={() => handleZoomChange(zoom + 0.1)}
                disabled={zoom >= 3}
                className="p-1.5 rounded-lg bg-[#14171C] border border-[rgba(255,255,255,0.1)] text-[#C0BDB5] hover:text-[#F2F0EA] disabled:opacity-40 transition cursor-pointer"
                aria-label="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Live Output Preview vs Nav Bar */}
          <div className="p-3.5 rounded-xl bg-[#191D23] border border-[rgba(255,255,255,0.08)] flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#F2F0EA]">
                <Eye className="h-3.5 w-3.5 text-[#C6A66A]" />
                <span>Live Avatar Preview</span>
              </div>
              <p className="text-[10px] text-[#92949A]">
                Exact preview rendered in navigation and profile cards
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Header preview scale (36px) */}
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full border border-[rgba(198,166,106,0.35)] overflow-hidden bg-[#111318] shadow-xs">
                  {livePreviewUrl ? (
                    <img src={livePreviewUrl} alt="Nav Header Preview" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <span className="text-[9px] text-[#92949A] mt-0.5 font-mono">Header</span>
              </div>

              {/* Profile card preview scale (52px) */}
              <div className="flex flex-col items-center">
                <div className="w-13 h-13 rounded-full border-2 border-[rgba(198,166,106,0.45)] overflow-hidden bg-[#111318] shadow-sm">
                  {livePreviewUrl ? (
                    <img src={livePreviewUrl} alt="Profile Card Preview" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <span className="text-[9px] text-[#92949A] mt-0.5 font-mono">Profile</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 sm:p-5 border-t border-[rgba(255,255,255,0.08)] bg-[#111318] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-[#C0BDB5] hover:text-[#F2F0EA] hover:bg-[#191D23] border border-[rgba(255,255,255,0.1)] transition flex items-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#C0BDB5] hover:text-[#F2F0EA] hover:bg-[#191D23] transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !imageSrc}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#C6A66A] hover:bg-[#D9BB80] text-[#17130C] shadow-md shadow-black/40 transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <span>Exporting...</span>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Save Photo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
