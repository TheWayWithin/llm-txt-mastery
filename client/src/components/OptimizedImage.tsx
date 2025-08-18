// Auto-generated image optimization helper
import React from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  sizes?: string;
}

export function OptimizedImage({ 
  src, 
  alt, 
  className = '', 
  loading = 'lazy',
  sizes = '100vw' 
}: OptimizedImageProps) {
  // Extract base name and extension
  const basename = src.replace(/\.png$/, '').replace('/images/', '/images/optimized/');
  
  return (
    <picture>
      {/* AVIF for modern browsers */}
      <source
        type="image/avif"
        srcSet={`
          ${basename}-sm.avif 400w,
          ${basename}-md.avif 800w,
          ${basename}.avif 1200w
        `}
        sizes={sizes}
      />
      
      {/* WebP for good browser support */}
      <source
        type="image/webp"
        srcSet={`
          ${basename}-sm.webp 400w,
          ${basename}-md.webp 800w,
          ${basename}.webp 1200w
        `}
        sizes={sizes}
      />
      
      {/* PNG fallback */}
      <img
        src={src}
        srcSet={`
          ${basename}-sm.png 400w,
          ${basename}-md.png 800w,
          ${basename}.png 1200w
        `}
        sizes={sizes}
        alt={alt}
        className={className}
        loading={loading}
      />
    </picture>
  );
}
