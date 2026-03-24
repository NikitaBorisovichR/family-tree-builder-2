import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingPage from '@/components/LandingPage';
import OnboardingFlow from '@/components/OnboardingFlow';
import { useOnboarding } from '@/hooks/useOnboarding';

export default function Index() {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'landing' | 'onboarding'>('landing');
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  useEffect(() => {
    const sessionToken = localStorage.getItem('session_token');
    const userData = localStorage.getItem('user_data');
    
    if (sessionToken && userData) {
      navigate('/tree');
    } else {
      setIsAuthChecked(true);
    }
  }, [navigate]);

  const {
    onboardingStep,
    formData,
    setFormData,
    handleOnboardingBack,
    handleOnboardingSkip,
    handleOnboardingNext
  } = useOnboarding(nodes, setNodes, setEdges, () => navigate('/tree'));

  const handleStart = () => setCurrentView('onboarding');
  const handleGoToDashboard = () => navigate('/dashboard');
  const handleGoToTree = () => navigate('/tree');

  if (!isAuthChecked) {
    return null;
  }

  if (currentView === 'landing') {
    return <LandingPage onStart={handleStart} onGoToDashboard={handleGoToDashboard} onGoToTree={handleGoToTree} />;
  }

  if (currentView === 'onboarding') {
    return (
      <OnboardingFlow
        step={onboardingStep}
        formData={formData}
        onFormDataChange={setFormData}
        onNext={handleOnboardingNext}
        onBack={handleOnboardingBack}
        onSkip={handleOnboardingSkip}
      />
    );
  }

  return null;
}