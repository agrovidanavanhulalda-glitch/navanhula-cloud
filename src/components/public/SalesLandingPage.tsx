import React from 'react';
import HeroSection from '@/components/public/landing/HeroSection';
import SocialProofBar from '@/components/public/landing/SocialProofBar';
import BenefitsSection from '@/components/public/landing/BenefitsSection';
import HowItWorksSection from '@/components/public/landing/HowItWorksSection';
import FeaturesSection from '@/components/public/landing/FeaturesSection';
import LeadCaptureSection from '@/components/public/landing/LeadCaptureSection';
import DemoSection from '@/components/public/landing/DemoSection';
import PricingSection from '@/components/public/landing/PricingSection';
import TestimonialsSection from '@/components/public/landing/TestimonialsSection';
import FAQSection from '@/components/public/landing/FAQSection';
import FinalCTASection from '@/components/public/landing/FinalCTASection';
import WhatsAppFloat from '@/components/public/landing/WhatsAppFloat';

const SalesLandingPage: React.FC = () => (
  <div id="top" className="relative overflow-hidden">
    <HeroSection />
    <SocialProofBar />
    <BenefitsSection />
    <HowItWorksSection />
    <FeaturesSection />
    <LeadCaptureSection />
    <DemoSection />
    <PricingSection />
    <TestimonialsSection />
    <FAQSection />
    <FinalCTASection />
    <WhatsAppFloat />
  </div>
);

export default SalesLandingPage;
