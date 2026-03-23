import React, { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

interface AuthModalProps {
  isOpen: boolean;
  mode: 'login' | 'register';
  onClose: () => void;
  onSuccess: (sessionToken: string, userData: Record<string, unknown>) => void;
  onSwitchMode: () => void;
}

const AUTH_API_URL = 'https://functions.poehali.dev/dc0b8bbb-f7c0-468e-b1e1-97e5c421718f';

export default function AuthModal({ isOpen, mode, onClose, onSuccess, onSwitchMode }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const action = mode === 'login' ? 'login' : 'register';
      const body = mode === 'register' 
        ? { email, password, display_name: displayName }
        : { email, password };

      const response = await fetch(`${AUTH_API_URL}?action=${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Ошибка авторизации');
        setLoading(false);
        return;
      }

      localStorage.setItem('session_token', data.session_token);
      localStorage.setItem('user_data', JSON.stringify(data));
      localStorage.setItem('last_activity', Date.now().toString());
      onSuccess(data.session_token, data);
    } catch (err) {
      setError('Ошибка соединения с сервером');
      setLoading(false);
    }
  };

  const handleOAuth = (provider: 'yandex' | 'vk') => {
    window.location.href = `${AUTH_API_URL}?provider=${provider}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name="X" size={20} />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {mode === 'login' ? 'Вход' : 'Регистрация'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {mode === 'login' 
              ? 'Войдите, чтобы продолжить работу с древом' 
              : 'Создайте аккаунт, чтобы сохранить ваше древо'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <Icon name="AlertCircle" size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
          {mode === 'register' && (
            <div>
              <Label htmlFor="displayName">Ваше имя</Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Иван Иванов"
                className="mt-1"
              />
            </div>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              required
              minLength={6}
              className="mt-1"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                Загрузка...
              </>
            ) : (
              mode === 'login' ? 'Войти' : 'Зарегистрироваться'
            )}
          </Button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-muted-foreground">Или</span>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center"
            onClick={() => handleOAuth('yandex')}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm3.089 17.165h-2.445l-2.406-7.38h-.031l.002 7.38H8.166V6.835h3.375c2.034 0 3.195.88 3.195 2.488 0 1.418-.87 2.19-1.92 2.463l2.273 5.379zm-2.857-9.219h-.798v2.337h.798c.78 0 1.226-.386 1.226-1.169 0-.782-.446-1.168-1.226-1.168z"/>
            </svg>
            Яндекс ID
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full justify-center"
            onClick={() => handleOAuth('vk')}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.78 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z"/>
            </svg>
            VK ID
          </Button>
        </div>

        <div className="text-center text-sm">
          <button
            type="button"
            onClick={onSwitchMode}
            className="text-primary hover:underline"
          >
            {mode === 'login' 
              ? 'Нет аккаунта? Зарегистрируйтесь' 
              : 'Уже есть аккаунт? Войдите'}
          </button>
        </div>
      </Card>
    </div>
  );
}