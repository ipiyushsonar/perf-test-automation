"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

interface SelectProps {
    value?: string;
    onValueChange?: (value: string) => void;
    placeholder?: string;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
}

interface SelectItemProps {
    value: string;
    children: React.ReactNode;
    className?: string;
}

const Select: React.FC<SelectProps> = ({
    value,
    onValueChange,
    placeholder,
    children,
    className,
    disabled,
}) => {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    // Get display label from children
    const items = React.Children.toArray(children) as React.ReactElement[];
    const selectedItem = items.find(
        (item) => (item.props as { value?: string })?.value === value
    );
    const displayLabel = selectedItem
        ? (selectedItem.props as { children?: React.ReactNode }).children
        : placeholder || "Select...";

    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={ref} className={cn("relative", className)}>
            <button
                type="button"
                disabled={disabled}
                className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    !value && "text-muted-foreground"
                )}
                onClick={() => setOpen(!open)}
            >
                <span className="truncate">{displayLabel}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
            </button>
            {open && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95">
                    {items.map((item) => {
                        const itemProps = item.props as { value: string; children?: React.ReactNode };
                        return (
                            <div
                                key={itemProps.value}
                                className={cn(
                                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                    itemProps.value === value && "bg-accent text-accent-foreground"
                                )}
                                onClick={() => {
                                    onValueChange?.(itemProps.value);
                                    setOpen(false);
                                }}
                            >
                                {itemProps.children}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const SelectItem: React.FC<SelectItemProps> = ({ children }) => {
    return <>{children}</>;
};

export { Select, SelectItem };
