import React from 'react';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

interface FeatureGuardProps {
  feature: string;
  companyId?: string | null;
  storeId?: string | null;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const FeatureGuard: React.FC<FeatureGuardProps> = ({
  feature, companyId, storeId, fallback = null, children,
}) => {
  const { enabled, isLoading } = useFeatureFlag(feature, companyId, storeId);
  if (isLoading) return null;
  if (!enabled) return <>{fallback}</>;
  return <>{children}</>;
};
