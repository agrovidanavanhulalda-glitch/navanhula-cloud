import React, { useEffect } from 'react';
import SalesLandingPage from '@/components/public/SalesLandingPage';

const Index = () => {
  useEffect(() => {
    document.title = 'NAVANHULA CLOUD | Sistema Empresarial';
  }, []);

  return <SalesLandingPage />;
};

export default Index;
