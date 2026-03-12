import React from 'react';
import HeroSection from '@/components/public/landing/HeroSection';
import BenefitsSection from '@/components/public/landing/BenefitsSection';
import HowItWorksSection from '@/components/public/landing/HowItWorksSection';
import FeaturesSection from '@/components/public/landing/FeaturesSection';
import DemoSection from '@/components/public/landing/DemoSection';
import PricingSection from '@/components/public/landing/PricingSection';
import TestimonialsSection from '@/components/public/landing/TestimonialsSection';
import FAQSection from '@/components/public/landing/FAQSection';
import FinalCTASection from '@/components/public/landing/FinalCTASection';

const SalesLandingPage: React.FC = () => (
  <div id="top" className="relative overflow-hidden">
    <HeroSection />
    <BenefitsSection />
    <HowItWorksSection />
    <FeaturesSection />
    <DemoSection />
    <PricingSection />
    <TestimonialsSection />
    <FAQSection />
    <FinalCTASection />
  </div>
);

export default SalesLandingPage;
