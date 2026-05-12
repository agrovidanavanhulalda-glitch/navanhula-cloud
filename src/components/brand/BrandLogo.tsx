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
 * If the image fails to load, renders a deep-blue rounded tile with 'NAVANHULA CLOUD' text.
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
  
  const logoUrl = `${navanhulaLogo}?v=1.0.1`;
  
  const containerStyle = { 
    width: width, 
    height: height || 'auto',
    minHeight: height ? undefined : width * 0.3
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
          className="rounded-lg flex flex-col items-center justify-center text-white font-black shadow-inner px-2 text-center leading-tight overflow-hidden"
          style={{
            width: '100%',
            height: height || (width * 0.35),
            background: '#1e3a5f',
            fontSize: Math.max(8, Math.round(width * 0.08)),
          }}
        >
          <span style={{ fontSize: '1.2em' }}>NAVANHULA</span>
          <span style={{ color: '#F4B400' }}>CLOUD</span>
        </div>
      )}
    </div>
  );
};

export default BrandLogo;