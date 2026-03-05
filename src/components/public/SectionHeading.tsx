import React from 'react';
import { cn } from '@/lib/utils';

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  className?: string;
};

const SectionHeading: React.FC<SectionHeadingProps> = ({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
}) => {
  return (
    <div className={cn('space-y-4', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">{eyebrow}</p> : null}
      <h2 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">{title}</h2>
      {description ? <p className="text-lg leading-8 text-muted-foreground">{description}</p> : null}
    </div>
  );
};

export default SectionHeading;
