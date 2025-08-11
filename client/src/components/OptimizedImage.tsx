// Optimized image component with responsive images and modern formats
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
  // Extract filename from the original path
  const filename = src.split('/').pop()?.replace('.png', '') || '';
  const basePath = '/images/optimized/' + filename;
  
  // Check if this image has optimized versions
  const hasOptimized = ['hero-illustration', 'how-it-works', 'logo-primary'].includes(filename);
  
  if (!hasOptimized) {
    // For non-optimized images, use the original
    return <img src={src} alt={alt} className={className} loading={loading} />;
  }
  
  // Special handling for logo (only one size)
  if (filename === 'logo-primary') {
    return (
      <picture>
        <source type="image/avif" srcSet={`${basePath}.avif`} />
        <source type="image/webp" srcSet={`${basePath}.webp`} />
        <img src={src} alt={alt} className={className} loading={loading} />
      </picture>
    );
  }
  
  return (
    <picture>
      {/* AVIF for modern browsers */}
      <source
        type="image/avif"
        srcSet={`
          ${basePath}-sm.avif 400w,
          ${basePath}-md.avif 800w,
          ${basePath}.avif 1200w
        `}
        sizes={sizes}
      />
      
      {/* WebP for good browser support */}
      <source
        type="image/webp"
        srcSet={`
          ${basePath}-sm.webp 400w,
          ${basePath}-md.webp 800w,
          ${basePath}.webp 1200w
        `}
        sizes={sizes}
      />
      
      {/* PNG fallback - use optimized versions */}
      <img
        src={src} // Original path as ultimate fallback
        srcSet={`
          ${basePath}-sm.png 400w,
          ${basePath}-md.png 800w,
          ${basePath}.png 1200w
        `}
        sizes={sizes}
        alt={alt}
        className={className}
        loading={loading}
      />
    </picture>
  );
}