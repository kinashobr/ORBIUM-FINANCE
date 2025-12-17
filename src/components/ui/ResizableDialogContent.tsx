import { useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DialogContent } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";

// Define DialogContentProps manually since it's not exported by shadcn/ui
interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  className?: string;
  children?: React.ReactNode;
  hideCloseButton?: boolean; // Added to support hiding the default close button
}

// Helper to load/save dimensions
const loadDimensions = (key: string, initial: number, min: number, max: number): number => {
  if (typeof window === 'undefined') return initial;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const value = parseInt(saved);
      return Math.min(max, Math.max(min, value));
    }
  } catch (e) {
    console.error(`Failed to load dimension for ${key}`, e);
  }
  return initial;
};

// Helper to load/save position
const loadPosition = (key: string, defaultValue: number): number => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const saved = localStorage.getItem(key);
    return saved ? parseInt(saved) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null;

interface ResizableDialogContentProps extends DialogContentProps {
  children: ReactNode;
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  storageKey: string;
}

export function ResizableDialogContent({
  children,
  initialWidth = 900,
  initialHeight = 600,
  minWidth = 700,
  minHeight = 500,
  maxWidth = 1600,
  maxHeight = 1000,
  storageKey,
  className,
  hideCloseButton,
  ...props
}: ResizableDialogContentProps) {
  
  const [width, setWidth] = useState(() => 
    loadDimensions(`${storageKey}_width`, initialWidth, minWidth, maxWidth)
  );
  const [height, setHeight] = useState(() => 
    loadDimensions(`${storageKey}_height`, initialHeight, minHeight, maxHeight)
  );
  
  // NEW: Position state (top/left relative to viewport)
  const [position, setPosition] = useState(() => ({
    x: loadPosition(`${storageKey}_x`, (window.innerWidth - width) / 2),
    y: loadPosition(`${storageKey}_y`, (window.innerHeight - height) / 2),
  }));
  
  const [isResizing, setIsResizing] = useState<ResizeDirection>(null);
  const [isDragging, setIsDragging] = useState(false); // NEW: For dragging the window
  
  const startX = useRef(0);
  const startY = useRef(0);
  const startWidth = useRef(0);
  const startHeight = useRef(0);
  const startPosition = useRef({ x: 0, y: 0 });
  const contentRef = useRef<HTMLDivElement>(null);

  // Save dimensions and position on change
  useEffect(() => {
    localStorage.setItem(`${storageKey}_width`, width.toString());
    localStorage.setItem(`${storageKey}_height`, height.toString());
    localStorage.setItem(`${storageKey}_x`, position.x.toString());
    localStorage.setItem(`${storageKey}_y`, position.y.toString());
  }, [width, height, position, storageKey]);
  
  // Center the window if it goes off-screen on mount/resize
  useEffect(() => {
    const handleResize = () => {
      const newX = Math.max(10, Math.min(position.x, window.innerWidth - width - 10));
      const newY = Math.max(10, Math.min(position.y, window.innerHeight - height - 10));
      
      if (newX !== position.x || newY !== position.y) {
        setPosition({ x: newX, y: newY });
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    
    return () => window.removeEventListener('resize', handleResize);
  }, [width, height]); // Depend on width/height to re-center if size changes

  // --- Resizing Logic ---

  const handleResizeMouseDown = (e: React.MouseEvent, direction: ResizeDirection) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(direction);
    startX.current = e.clientX;
    startY.current = e.clientY;
    startWidth.current = width;
    startHeight.current = height;
    startPosition.current = position;
  };

  const handleResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startX.current;
    const deltaY = e.clientY - startY.current;
    
    let newWidth = startWidth.current;
    let newHeight = startHeight.current;
    let newX = startPosition.current.x;
    let newY = startPosition.current.y;

    // Horizontal resizing
    if (isResizing.includes('e')) {
      newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth.current + deltaX));
    } else if (isResizing.includes('w')) {
      newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth.current - deltaX));
      if (newWidth > minWidth && newWidth < maxWidth) {
        newX = startPosition.current.x + deltaX;
      }
    }

    // Vertical resizing
    if (isResizing.includes('s')) {
      newHeight = Math.min(maxHeight, Math.max(minHeight, startHeight.current + deltaY));
    } else if (isResizing.includes('n')) {
      newHeight = Math.min(maxHeight, Math.max(minHeight, startHeight.current - deltaY));
      if (newHeight > minHeight && newHeight < maxHeight) {
        newY = startPosition.current.y + deltaY;
      }
    }
    
    // Ensure position updates only if size constraints allow
    if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth);
        setPosition(prev => ({ ...prev, x: newX }));
    }
    if (newHeight >= minHeight && newHeight <= maxHeight) {
        setHeight(newHeight);
        setPosition(prev => ({ ...prev, y: newY }));
    }
    
    // Update cursor style
    document.body.style.cursor = getCursorStyle(isResizing);
  }, [isResizing, minWidth, minHeight, maxWidth, maxHeight]);
  
  const getCursorStyle = (direction: ResizeDirection): string => {
    switch (direction) {
      case 'n':
      case 's': return 'ns-resize';
      case 'e':
      case 'w': return 'ew-resize';
      case 'ne':
      case 'sw': return 'nesw-resize';
      case 'nw':
      case 'se': return 'nwse-resize';
      default: return 'default';
    }
  };

  // --- Dragging Logic (Moving the window) ---
  
  const handleDragMouseDown = (e: React.MouseEvent) => {
    // Only allow dragging from the header
    if (contentRef.current && !contentRef.current.contains(e.target as Node)) return;
    
    // Prevent dragging if resizing is active
    if (isResizing) return;
    
    e.preventDefault();
    setIsDragging(true);
    startX.current = e.clientX;
    startY.current = e.clientY;
    startPosition.current = position;
  };
  
  const handleDragMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startX.current;
    const deltaY = e.clientY - startY.current;
    
    // Keep window within bounds (with a small margin)
    const newX = Math.max(10, Math.min(startPosition.current.x + deltaX, window.innerWidth - width - 10));
    const newY = Math.max(10, Math.min(startPosition.current.y + deltaY, window.innerHeight - height - 10));
    
    setPosition({ x: newX, y: newY });
    document.body.style.cursor = 'grabbing';
  }, [isDragging, width, height]);

  // --- Global Mouse Up Handler ---

  const handleMouseUp = useCallback(() => {
    setIsResizing(null);
    setIsDragging(false);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, []);

  useEffect(() => {
    if (isResizing || isDragging) {
      window.addEventListener('mousemove', isResizing ? handleResizeMouseMove : handleDragMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener('mousemove', handleResizeMouseMove);
      window.removeEventListener('mousemove', handleDragMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleResizeMouseMove);
      window.removeEventListener('mousemove', handleDragMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, isDragging, handleResizeMouseMove, handleDragMouseMove, handleMouseUp]);

  const style = {
    width: `${width}px`,
    height: `${height}px`,
    // Use fixed position and top/left for window-like behavior
    position: 'fixed' as 'fixed',
    top: `${position.y}px`,
    left: `${position.x}px`,
    maxWidth: 'none',
    maxHeight: 'none',
  };
  
  // Define os manipuladores de redimensionamento
  const resizeHandles: { direction: ResizeDirection; className: string }[] = [
    { direction: 'n', className: 'top-0 left-0 right-0 h-2 cursor-ns-resize' },
    { direction: 's', className: 'bottom-0 left-0 right-0 h-2 cursor-ns-resize' },
    { direction: 'e', className: 'top-0 bottom-0 right-0 w-2 cursor-ew-resize' },
    { direction: 'w', className: 'top-0 bottom-0 left-0 w-2 cursor-ew-resize' },
    { direction: 'ne', className: 'top-0 right-0 h-4 w-4 cursor-nesw-resize' },
    { direction: 'nw', className: 'top-0 left-0 h-4 w-4 cursor-nwse-resize' },
    { direction: 'se', className: 'bottom-0 right-0 h-4 w-4 cursor-nwse-resize' },
    { direction: 'sw', className: 'bottom-0 left-0 h-4 w-4 cursor-nesw-resize' },
  ];

  return (
    <DialogContent
      {...props}
      ref={contentRef}
      className={cn(
        "max-w-none max-h-none p-0 flex flex-col translate-x-0 translate-y-0", // Remove default translate
        isResizing || isDragging ? "transition-none" : "transition-all duration-300 ease-out",
        className
      )}
      style={style}
      hideCloseButton={hideCloseButton}
      // Adiciona o manipulador de arrasto ao DialogContent (será refinado para o header)
      onMouseDown={handleDragMouseDown}
    >
      {children}
      
      {/* Resize Handles */}
      {resizeHandles.map(({ direction, className }) => (
        <div
          key={direction}
          className={cn(
            "absolute z-[100] hover:bg-primary/20",
            className
          )}
          onMouseDown={(e) => handleResizeMouseDown(e, direction)}
        />
      ))}
    </DialogContent>
  );
}