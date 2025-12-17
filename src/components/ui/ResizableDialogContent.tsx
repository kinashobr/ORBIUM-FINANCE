import { forwardRef, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

interface ResizableDialogContentProps extends DialogPrimitive.DialogContentProps {
  children: ReactNode;
  initialWidth: number;
  initialHeight: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  storageKey: string;
  hideCloseButton?: boolean;
}

const ResizableDialogContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ResizableDialogContentProps
>(
  (
    {
      className,
      children,
      initialWidth,
      initialHeight,
      minWidth = 400,
      minHeight = 300,
      maxWidth = 1600,
      maxHeight = 1000,
      storageKey,
      hideCloseButton = false,
      ...props
    },
    ref
  ) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState(() => {
      if (typeof window !== 'undefined') {
        const savedSize = localStorage.getItem(storageKey);
        if (savedSize) {
          const { width, height } = JSON.parse(savedSize);
          return {
            width: Math.min(maxWidth, Math.max(minWidth, width)),
            height: Math.min(maxHeight, Math.max(minHeight, height)),
          };
        }
      }
      return { width: initialWidth, height: initialHeight };
    });
    
    const [isResizing, setIsResizing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const startPos = useRef({ x: 0, y: 0 });
    const startSize = useRef({ width: 0, height: 0 });
    const startMouse = useRef({ x: 0, y: 0 });

    // Load position from storage
    useEffect(() => {
        const savedPosition = localStorage.getItem(`${storageKey}_pos`);
        if (savedPosition) {
            setPosition(JSON.parse(savedPosition));
        }
    }, [storageKey]);

    // Save size and position on change
    useEffect(() => {
      localStorage.setItem(storageKey, JSON.stringify(size));
      localStorage.setItem(`${storageKey}_pos`, JSON.stringify(position));
    }, [size, position, storageKey]);

    // --- Resizing Logic ---
    const handleResizeMouseDown = useCallback((e: React.MouseEvent, direction: 'right' | 'bottom' | 'corner') => {
      e.preventDefault();
      setIsResizing(direction);
      startMouse.current = { x: e.clientX, y: e.clientY };
      startSize.current = size;
    }, [size]);

    const handleResizeMouseMove = useCallback((e: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startMouse.current.x;
      const deltaY = e.clientY - startMouse.current.y;

      let newWidth = startSize.current.width;
      let newHeight = startSize.current.height;

      if (isResizing === 'right' || isResizing === 'corner') {
        newWidth = Math.min(maxWidth, Math.max(minWidth, startSize.current.width + deltaX));
      }
      if (isResizing === 'bottom' || isResizing === 'corner') {
        newHeight = Math.min(maxHeight, Math.max(minHeight, startSize.current.height + deltaY));
      }

      setSize({ width: newWidth, height: newHeight });
    }, [isResizing, minWidth, minHeight, maxWidth, maxHeight]);

    const handleResizeMouseUp = useCallback(() => {
      setIsResizing(false);
    }, []);
    
    // --- Dragging Logic ---
    const handleDragMouseDown = useCallback((e: React.MouseEvent) => {
        // Only allow dragging from the header area
        if ((e.target as HTMLElement).closest('.dialog-header-drag-area')) {
            e.preventDefault();
            setIsDragging(true);
            startMouse.current = { x: e.clientX, y: e.clientY };
            startPos.current = position;
        }
    }, [position]);

    const handleDragMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startMouse.current.x;
        const deltaY = e.clientY - startMouse.current.y;
        
        setPosition({
            x: startPos.current.x + deltaX,
            y: startPos.current.y + deltaY,
        });
    }, [isDragging]);

    const handleDragMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Global listeners for resizing and dragging
    useEffect(() => {
      if (isResizing || isDragging) {
        window.addEventListener('mousemove', isResizing ? handleResizeMouseMove : handleDragMouseMove);
        window.addEventListener('mouseup', isResizing ? handleResizeMouseUp : handleDragMouseUp);
        document.body.style.cursor = isResizing ? 'se-resize' : 'grabbing';
        document.body.style.userSelect = 'none';
      } else {
        window.removeEventListener('mousemove', handleResizeMouseMove);
        window.removeEventListener('mouseup', handleResizeMouseUp);
        window.removeEventListener('mousemove', handleDragMouseMove);
        window.removeEventListener('mouseup', handleDragMouseUp);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }

      return () => {
        window.removeEventListener('mousemove', handleResizeMouseMove);
        window.removeEventListener('mouseup', handleResizeMouseUp);
        window.removeEventListener('mousemove', handleDragMouseMove);
        window.removeEventListener('mouseup', handleDragMouseUp);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      };
    }, [isResizing, isDragging, handleResizeMouseMove, handleResizeMouseUp, handleDragMouseMove, handleDragMouseUp]);

    return (
      <DialogPrimitive.Content
        ref={contentRef}
        {...props}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg md:w-full",
          "max-w-none", // Override max-width
          isResizing && "transition-none",
          className
        )}
        style={{
          width: `${size.width}px`,
          height: `${size.height}px`,
          transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
          // Ensure the dialog is positioned correctly when opened
          top: '50%',
          left: '50%',
        }}
        // Add drag handler to the header area
        onMouseDown={handleDragMouseDown}
      >
        {/* Resizer Handles */}
        <div
          className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize z-50"
          onMouseDown={(e) => handleResizeMouseDown(e, 'corner')}
        />
        <div
          className="absolute bottom-0 left-0 right-4 h-2 cursor-s-resize z-50"
          onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
        />
        <div
          className="absolute top-0 bottom-4 right-0 w-2 cursor-e-resize z-50"
          onMouseDown={(e) => handleResizeMouseDown(e, 'right')}
        />

        {children}
        
        {!hideCloseButton && (
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    );
  }
);
ResizableDialogContent.displayName = "ResizableDialogContent";

export { ResizableDialogContent };