/**
 * Cloudinary image optimization utility
 */

interface OptimizationOptions {
    width?: number;
    height?: number;
    quality?: string | number;
    format?: string;
    crop?: string;
    gravity?: string;
}

/**
 * Appends Cloudinary transformation parameters to a URL.
 * Example: https://res.cloudinary.com/demo/image/upload/sample.jpg 
 * becomes https://res.cloudinary.com/demo/image/upload/w_400,c_fill,q_auto,f_auto/sample.jpg
 */
export function getOptimizedImageUrl(url: string | null | undefined, options: OptimizationOptions = {}) {
    if (!url) return "";

    let isCloudinary = false;
    try {
        const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
        const parsed = new URL(url, base);
        isCloudinary = parsed.hostname === "cloudinary.com" || parsed.hostname.endsWith(".cloudinary.com");
    } catch {
        isCloudinary = false;
    }

    if (!isCloudinary) return url;

    const {
        width,
        height,
        quality = "auto",
        format = "auto",
        crop = "fill",
        gravity = "auto"
    } = options;

    const transformations = [
        `q_${quality}`,
        `f_${format}`,
        `c_${crop}`,
        `g_${gravity}`,
        width ? `w_${width}` : null,
        height ? `h_${height}` : null,
    ].filter(Boolean).join(",");

    // Find the /upload/ part and insert transformations after it
    const uploadPart = "/upload/";
    const index = url.indexOf(uploadPart);
    if (index === -1) return url;

    const before = url.substring(0, index + uploadPart.length);
    const after = url.substring(index + uploadPart.length);

    return `${before}${transformations}/${after}`;
}
