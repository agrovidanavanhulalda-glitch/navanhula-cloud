import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import navanhulaLogo from '@/assets/navanhula-cloud-logo.png';

interface BrandLogoProps {
  /** Rendered pixel size (square). Default 48. */
  size?: number;
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
  size = 48,
  className,
  glow = false,
  alt = 'NAVANHULA CLOUD',
  priority = false,
}) => {
  const [failed, setFailed] = useState(false);
  const dim = { width: size, height: size };

  return (
    <div
      className={cn('relative inline-flex items-center justify-center flex-shrink-0', className)}
      style={dim}
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
          src={navanhulaLogo}
          alt={alt}
          width={size}
          height={size}
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
            fontSize: Math.round(size * 0.55),
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
