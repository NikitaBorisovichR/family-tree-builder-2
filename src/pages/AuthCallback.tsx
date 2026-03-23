import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { sendGoal, Goals } from '@/utils/analytics';

const AUTH_API_URL = 'https://functions.poehali.dev/dc0b8bbb-f7c0-468e-b1e1-97e5c421718f';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionToken = params.get('session_token');

    if (sessionToken) {
      localStorage.setItem('session_token', sessionToken);

      // Получаем данные пользователя по токену и сохраняем user_data
      fetch(`${AUTH_API_URL}?action=verify&session_token=${sessionToken}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.email) {
            localStorage.setItem('user_data', JSON.stringify({
              email: data.email,
              display_name: data.display_name,
              avatar_url: data.avatar_url,
              user_id: data.user_id
            }));
          }
        })
        .catch(() => { /* ignore, не блокируем навигацию */ })
        .finally(() => {
          sendGoal(Goals.LOGIN_SUCCESS);
          navigate('/');
        });
    } else {
      navigate('/');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Icon name="Check" size={32} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Авторизация успешна!</h2>
        <p className="text-muted-foreground">Перенаправляем вас...</p>
      </div>
    </div>
  );
}