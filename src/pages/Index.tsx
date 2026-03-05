import React, { useEffect } from 'react';
import SalesLandingPage from '@/components/public/SalesLandingPage';

const Index = () => {
  useEffect(() => {
    document.title = 'NAVANHULA POS | Controle total do seu negócio';
  }, []);

  return <SalesLandingPage />;
};

export default Index;
