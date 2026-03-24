import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import HomePage from '@/components/HomePage';
import PricingPage from '@/components/PricingPage';
import DemoPage from '@/components/DemoPage';
import AuthModal from '@/components/AuthModal';

interface LandingPageProps {
  onStart: () => void;
  onGoToDashboard: () => void;
  onGoToTree: () => void;
}

export default function LandingPage({ onStart, onGoToDashboard, onGoToTree }: LandingPageProps) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = React.useState<'home' | 'pricing' | 'demo'>('home');
  const [authModalOpen, setAuthModalOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<'login' | 'register'>('login');
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [userData, setUserData] = React.useState<Record<string, unknown> | null>(null);
  const [hasExistingTree, setHasExistingTree] = React.useState(false);

  React.useEffect(() => {
    const sessionToken = localStorage.getItem('session_token');
    const storedUserData = localStorage.getItem('user_data');
    const savedNodes = localStorage.getItem('familyTree_nodes');
    
    if (sessionToken && storedUserData) {
      try {
        const parsed = JSON.parse(storedUserData);
        if (parsed && parsed.email) {
          setIsAuthenticated(true);
          setUserData(parsed);
          
          if (savedNodes) {
            try {
              const nodes = JSON.parse(savedNodes);
              setHasExistingTree(nodes.length > 1);
            } catch (e) {
              console.error('Error parsing nodes', e);
            }
          }
        }
      } catch (e) {
        console.error('Error parsing user data', e);
      }
    }
  }, []);

  const handleAuthSuccess = () => {
    setAuthModalOpen(false);
    const storedUserData = localStorage.getItem('user_data');
    if (storedUserData) {
      try {
        const parsed = JSON.parse(storedUserData);
        setIsAuthenticated(true);
        setUserData(parsed);
      } catch (e) {
        console.error('Error parsing user data', e);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background overflow-y-auto">
      {currentPage !== 'demo' && (
        <header className="fixed w-full bg-white/90 backdrop-blur-lg z-50 border-b border-border/50 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 text-primary font-bold text-2xl">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Icon name="Share2" className="text-white" size={20} />
            </div>
            <span className="hidden sm:inline bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Семейные корни
            </span>
          </div>
          <div className="hidden md:flex gap-8 text-sm font-medium text-muted-foreground">
            <button onClick={() => setCurrentPage('home')} className={`hover:text-primary transition-all ${currentPage === 'home' ? 'text-primary font-semibold' : ''}`}>
              Главная
            </button>
            <button onClick={isAuthenticated && hasExistingTree ? onGoToTree : onStart} className="hover:text-primary transition-all">
              Древо
            </button>
            <button onClick={() => setCurrentPage('pricing')} className={`hover:text-primary transition-all ${currentPage === 'pricing' ? 'text-primary font-semibold' : ''}`}>
              Тарифы
            </button>
            <button onClick={() => navigate('/tutorial')} className="hover:text-primary transition-all">
              Обучение
            </button>
            <button onClick={() => navigate('/archive')} className="hover:text-primary transition-all">
              Архивы
            </button>
            <button onClick={() => navigate('/support')} className="hover:text-primary transition-all">
              Поддержка
            </button>
          </div>
          <div className="flex gap-3 items-center">
            {isAuthenticated ? (
              <>
                <Button 
                  onClick={onGoToDashboard}
                  variant="outline"
                  className="border-primary/30 hover:border-primary hover:bg-primary/5"
                >
                  <Icon name="LayoutDashboard" size={16} className="mr-2" />
                  Личный кабинет
                </Button>
                <button
                  onClick={onGoToDashboard}
                  className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm cursor-pointer hover:bg-primary/20 transition-colors"
                  title="Открыть профиль"
                >
                  {userData?.display_name?.[0]?.toUpperCase() || userData?.email?.[0]?.toUpperCase() || 'U'}
                </button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => { setAuthMode('login'); setAuthModalOpen(true); }} 
                  className="border-primary/30 hover:border-primary hover:bg-primary/5"
                >
                  Войти
                </Button>
                <Button 
                  onClick={() => { setAuthMode('register'); setAuthModalOpen(true); }} 
                  className="shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
                >
                  Зарегистрироваться
                </Button>
              </>
            )}
          </div>
          </div>
        </header>
      )}

      {currentPage === 'home' && <HomePage onStart={onStart} onDemo={() => setCurrentPage('demo')} />}
      {currentPage === 'pricing' && <PricingPage onStart={onStart} />}
      {currentPage === 'demo' && <DemoPage onClose={() => setCurrentPage('home')} />}

      <AuthModal
        isOpen={authModalOpen}
        mode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        onSwitchMode={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
      />
    </div>
  );
}