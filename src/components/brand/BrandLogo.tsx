import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import navanhulaLogo from '@/assets/navanhula-cloud-logo.png';

interface BrandLogoProps {
  /** Width in pixels. Default 48. */
  width?: number;
  /** Height in pixels. If not provided, will match width (square) or be auto for the img. */
  height?: number;
  className?: string;
  /** Show subtle gold glow behind the mark. */
  glow?: boolean;
  alt?: string;
  priority?: boolean;
}

/**
 * Official NAVANHULA CLOUD logo with graceful fallback.
 * If the image fails to load, renders a deep-blue rounded tile with a gold "N".
 */
const BrandLogo: React.FC<BrandLogoProps> = ({
  width = 48,
  height,
  className,
  glow = false,
  alt = 'NAVANHULA CLOUD',
  priority = false,
}) => {
  const [failed, setFailed] = useState(false);
  
  // Use a timestamp to force cache-busting if needed, 
  // though Vite usually handles this with hashes.
  const logoUrl = `${navanhulaLogo}?v=1.0.1`;
  
  const actualHeight = height || width;
  const containerStyle = { 
    width: width, 
    height: height || 'auto',
    minHeight: height ? undefined : width * 0.4 // Minimum height for horizontal layout
  };

  return (
    <div
      className={cn('relative inline-flex items-center justify-center flex-shrink-0 select-none transition-all duration-300', className)}
      style={containerStyle}
    >
      {glow && (
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 rounded-full blur-xl opacity-70"
          style={{ background: 'radial-gradient(circle, hsl(var(--gold) / 0.55), transparent 70%)' }}
        />
      )}

      {!failed ? (
        <img
          src={logoUrl}
          alt={alt}
          width={width}
          height={height || undefined}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
          style={{ filter: glow ? 'drop-shadow(0 6px 18px hsl(var(--gold) / 0.35))' : undefined }}
        />
      ) : (
        <div
          aria-label={alt}
          role="img"
          className="h-full w-full rounded-xl flex items-center justify-center text-gold font-black"
          style={{
            background: 'var(--gradient-premium, linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7)))',
            fontSize: Math.round(width * 0.4),
            lineHeight: 1,
          }}
        >
          N
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
