/**
 * Clean up DOM locks often left behind by UI components (like Radix Dialog) 
 * especially when parent components re-render during animations.
 */
export const releaseBodyLocks = () => {
  if (typeof document === 'undefined') return;
  
  const body = document.body;
  
  // Restore basic interaction
  body.style.removeProperty('pointer-events');
  body.style.removeProperty('overflow');
  
  // Remove Radix specific locks
  body.removeAttribute('data-scroll-locked');
  
  // Force pointer-events back to auto just in case removeProperty fails or 
  // it was set by a higher-specificity CSS rule during animation.
  if (body.style.pointerEvents === 'none') {
    body.style.pointerEvents = 'auto';
  }
};

/**
 * Executes a function and guarantees a body lock cleanup after completion.
 */
export const withCleanup = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } finally {
    // Run cleanup immediately and then on the next frame to be absolutely sure
    releaseBodyLocks();
    requestAnimationFrame(releaseBodyLocks);
  }
};
