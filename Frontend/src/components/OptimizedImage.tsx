import { m, HTMLMotionProps } from "framer-motion";
import { getOptimizedImageUrl } from "#src/lib/image-utils";
import { cn } from "#src/lib/utils";
import { User, ImageOff } from "lucide-react";
import { useState, useEffect } from "react";

interface OptimizedImageProps extends HTMLMotionProps<"img"> {
    width?: number;
    height?: number;
    quality?: string | number;
    crop?: string;
    gravity?: string;
}

/**
 * Reusable image component with automatic Cloudinary optimization.
 * Supports framer-motion props for animations.
 * Falls back to standard img behavior for non-Cloudinary URLs.
 */
export function OptimizedImage({
    src,
    width,
    height,
    quality,
    crop,
    gravity,
    alt,
    className,
    ...props
}: OptimizedImageProps) {
    const [error, setError] = useState(false);

    // Reset error when src changes
    useEffect(() => {
        setError(false);
    }, [src]);

    const optimizedSrc = src ? getOptimizedImageUrl(src, { width, height, quality, crop, gravity }) : src;

    let isCloudinary = false;
    if (src) {
        try {
            const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
            const parsed = new URL(src, base);
            isCloudinary = parsed.hostname === "cloudinary.com" || parsed.hostname.endsWith(".cloudinary.com");
        } catch {
            isCloudinary = false;
        }
    }

    let srcSet: string | undefined = undefined;
    if (src && isCloudinary && width) {
        const src1x = optimizedSrc;
        const src2x = getOptimizedImageUrl(src, {
            width: width * 2,
            height: height ? height * 2 : undefined,
            quality,
            crop,
            gravity
        });
        srcSet = `${src1x} 1x, ${src2x} 2x`;
    }

    if (error || !src) {
        const IsAvatar = alt?.toLowerCase().includes("avatar") || alt?.toLowerCase().includes("portrait") || alt?.toLowerCase().includes("author");
        const Icon = IsAvatar ? User : ImageOff;
        
        return (
            <div 
                className={cn(
                    "bg-secondary/20 flex items-center justify-center shrink-0", 
                    className
                )}
                {...(props as Record<string, unknown>)}
            >
                <Icon className="w-1/3 h-1/3 text-muted-foreground/40" />
            </div>
        );
    }

    return (
        <m.img
            src={optimizedSrc}
            srcSet={srcSet}
            alt={alt}
            loading="lazy"
            onError={() => setError(true)}
            className={cn("bg-secondary/20 flex shrink-0", className)}
            {...props}
        />
    );
}
