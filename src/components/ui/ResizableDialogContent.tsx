import * as React from "react";
import { DialogContent, DialogContentProps, DialogOverlay, DialogPortal, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

// Define the props interface based on usage
interface ResizableDialogContentProps extends DialogContentProps {
  storageKey: string;
  initialWidth: number;
  initialHeight: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  hideCloseButton?: boolean;
  children: React.ReactNode; // Explicitly define children
}

export function ResizableDialogContent({
  className,
  children,
  storageKey,
  initialWidth,
  initialHeight,
  minWidth = 400,
  maxWidth = 1200,
  minHeight = 300,
  maxHeight = 900,
  hideCloseButton = false,
  ...props
}: ResizableDialogContentProps) {
  const [width, setWidth] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem(`${storageKey}_width`);
      return savedWidth ? Math.min(maxWidth, Math.max(minWidth, parseInt(savedWidth))) : initialWidth;
    }
    return initialWidth;
  });
  const [height, setHeight] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const savedHeight = localStorage.getItem(`${storageKey}_height`);
      return savedHeight ? Math.min(maxHeight, Math.max(minHeight, parseInt(savedHeight))) : initialHeight;
    }
    return initialHeight;
  });
  const [isResizing, setIsResizing] = React.useState(false);
  const startX = React.useRef(0);
  const startY = React.useRef(0);
  const startWidth = React.useRef(0);
  const startHeight = React.useRef(0);

  const handleSaveDimensions = React.useCallback(() => {
    localStorage.setItem(`${storageKey}_width`, width.toString());
    localStorage.setItem(`${storageKey}_height`, height.toString());
  }, [storageKey, width, height]);

  const handleMouseDown = (e: React.MouseEvent, direction: 'right' | 'bottom' | 'corner') => {
    e.preventDefault();
    setIsResizing(true);
    startX.current = e.clientX;
    startY.current = e.clientY;
    startWidth.current = width;
    startHeight.current = height;
    document.body.style.userSelect = 'none';
    
    if (direction === 'right') document.body.style.cursor = 'col-resize';
    if (direction === 'bottom') document.body.style.cursor = 'row-resize';
    if (direction === 'corner') document.body.style.cursor = 'nwse-resize';
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startX.current;
    const deltaY = e.clientY - startY.current;
    
    let newWidth = startWidth.current;
    let newHeight = startHeight.current;

    if (document.body.style.cursor === 'col-resize' || document.body.style.cursor === 'nwse-resize') {
      newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth.current + deltaX));
    }
    
    if (document.body.style.cursor === 'row-resize' || document.body.style.cursor === 'nwse-resize') {
      newHeight = Math.min(maxHeight, Math.max(minHeight, startHeight.current + deltaY));
    }

    setWidth(newWidth);
    setHeight(newHeight);
  }, [isResizing, minWidth, maxWidth, minHeight, maxHeight]);

  const handleMouseUp = React.useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
    handleSaveDimensions();
  }, [handleSaveDimensions]);

  React.useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogContent
        {...props}
        className={cn(
          "fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg md:w-full",
          "flex flex-col", // Ensure content is a flex container for height control
          isResizing && "transition-none",
          className
        )}
        style={{ width: `${width}px`, height: `${height}px` }}
        onPointerDownOutside={() => {
          if (isResizing) return;
          props.onOpenChange?.(false);
        }}
      >
        {children}
        
        {/* Resizer Handles */}
        <div
          className="absolute right-0 top-0 h-full w-2 cursor-col-resize z-50"
          onMouseDown={(e) => handleMouseDown(e, 'right')}
          title="Redimensionar largura"
        />
        <div
          className="absolute bottom-0 left-0 w-full h-2 cursor-row-resize z-50"
          onMouseDown={(e) => handleMouseDown(e, 'bottom')}
          title="Redimensionar altura"
        />
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-50"
          onMouseDown={(e) => handleMouseDown(e, 'corner')}
          title="Redimensionar"
        />

        {!hideCloseButton && (
          <DialogClose
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-50"
            onClick={() => props.onOpenChange?.(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        )}
      </DialogContent>
    </DialogPortal>
  );
}