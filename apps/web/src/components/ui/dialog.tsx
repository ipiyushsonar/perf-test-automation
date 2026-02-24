"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface DialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
}

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div
                className="fixed inset-0 bg-black/80 animate-in fade-in-0"
                onClick={() => onOpenChange?.(false)}
            />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                {children}
            </div>
        </div>
    );
};

const DialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { onClose?: () => void }>(
    ({ className, children, onClose, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "relative z-50 w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg animate-in fade-in-0 zoom-in-95",
                    className
                )}
                onClick={(e) => e.stopPropagation()}
                {...props}
            >
                {children}
                {onClose && (
                    <button
                        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </button>
                )}
            </div>
        );
    }
);
DialogContent.displayName = "DialogContent";

const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
    className,
    ...props
}) => (
    <div
        className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
        {...props}
    />
);

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h2
            ref={ref}
            className={cn("text-lg font-semibold leading-none tracking-tight", className)}
            {...props}
        />
    )
);
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => (
        <p
            ref={ref}
            className={cn("text-sm text-muted-foreground", className)}
            {...props}
        />
    )
);
DialogDescription.displayName = "DialogDescription";

const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
    className,
    ...props
}) => (
    <div
        className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4", className)}
        {...props}
    />
);

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter };
