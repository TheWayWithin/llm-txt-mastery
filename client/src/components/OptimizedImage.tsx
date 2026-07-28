// Auto-generated image optimization helper
import React from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  sizes?: string;
  // Set to true for small logos/icons that don't have responsive sizes
  singleSize?: boolean;
  // Intrinsic dimensions: lets the browser reserve the box via aspect-ratio
  // before the file arrives, preventing layout shift (LTM-ISS-13)
  width?: number;
  height?: number;
}

// Small logos and icons that don't have responsive sizes
const SINGLE_SIZE_IMAGES = [
  'logo-primary',
  'tier-free',
  'tier-coffee',
  'tier-growth',
  'tier-scale',
];

export function OptimizedImage({
  src,
  alt,
  className = '',
  loading = 'lazy',
  sizes = '100vw',
  singleSize,
  width,
  height,
}: OptimizedImageProps) {
  // Extract base name and extension
  const filename =
    src
      .split('/')
      .pop()
      ?.replace(/\.png$/, '') || '';
  const basename = src.replace(/\.png$/, '').replace('/images/', '/images/optimized/');

  // Auto-detect if this is a single-size image
  const isSingleSize =
    singleSize !== undefined ? singleSize : SINGLE_SIZE_IMAGES.includes(filename);

  // For single-size images (logos, small icons)
  if (isSingleSize) {
    return (
      <picture>
        <source type="image/avif" srcSet={`${basename}.avif`} />
        <source type="image/webp" srcSet={`${basename}.webp`} />
        <img
          src={src}
          alt={alt}
          className={className}
          loading={loading}
          width={width}
          height={height}
        />
      </picture>
    );
  }

  // For responsive images (hero, features, etc.)
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
        width={width}
        height={height}
      />
    </picture>
  );
}
