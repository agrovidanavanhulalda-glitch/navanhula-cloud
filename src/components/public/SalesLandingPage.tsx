import React from 'react';
import HeroSection from '@/components/public/landing/HeroSection';
import ProblemSection from '@/components/public/landing/ProblemSection';
import SolutionSection from '@/components/public/landing/SolutionSection';
import DemoSection from '@/components/public/landing/DemoSection';
import OfferSection from '@/components/public/landing/OfferSection';
import FinalCTASection from '@/components/public/landing/FinalCTASection';
import WhatsAppFloat from '@/components/public/landing/WhatsAppFloat';

const SalesLandingPage: React.FC = () => (
  <div id="top" className="relative z-0 min-h-screen overflow-hidden bg-[#F5F7FA] font-sans">
    <HeroSection />
    <ProblemSection />
    <SolutionSection />
    <DemoSection />
    <OfferSection />
    <FinalCTASection />
    <WhatsAppFloat />
  </div>
);

export default SalesLandingPage;