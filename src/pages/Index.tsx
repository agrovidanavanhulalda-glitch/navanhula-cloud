import React, { useEffect } from 'react';
import SalesLandingPage from '@/components/public/SalesLandingPage';

const Index = () => {
  useEffect(() => {
    document.title = 'NAVANHULA POS | Controle sua empresa';
  }, []);

  return <SalesLandingPage />;
};

export default Index;
