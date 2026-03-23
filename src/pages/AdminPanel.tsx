import React, { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { isAdmin } from '@/config/admins';

interface AdminPanelProps {
  onClose: () => void;
}

interface AnalyticsData {
  totalUsers: number;
  newUsers7d: number;
  activeToday: number;
  totalTrees: number;
  trees7d: number;
  totalPersons: number;
  persons7d: number;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    newUsers7d: 0,
    activeToday: 0,
    totalTrees: 0,
    trees7d: 0,
    totalPersons: 0,
    persons7d: 0,
  });

  useEffect(() => {
    // Проверяем права доступа
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (isAdmin(user.email)) {
          setIsAuthorized(true);
          loadAnalytics();
        } else {
          setIsAuthorized(false);
        }
      } catch (e) {
        setIsAuthorized(false);
      }
    } else {
      setIsAuthorized(false);
    }
    setIsLoading(false);
  }, []);

  const loadAnalytics = async () => {
    setAnalyticsError(false);
    try {
      const response = await fetch('https://functions.poehali.dev/d917b670-852b-45d7-a273-26bf2e464999');
      
      if (!response.ok) {
        setAnalyticsError(true);
        return;
      }
      
      const data = await response.json();
      
      if (data.error) {
        setAnalyticsError(true);
        return;
      }
      
      setAnalytics({
        totalUsers: data.total_users || 0,
        newUsers7d: data.new_users_7d || 0,
        activeToday: data.active_today || 0,
        totalTrees: data.total_trees || 0,
        trees7d: data.trees_7d || 0,
        totalPersons: data.total_persons || 0,
        persons7d: data.persons_7d || 0,
      });
    } catch (error) {
      setAnalyticsError(true);
    }
  };

  const refreshMetrics = async () => {
    setIsLoading(true);
    await loadAnalytics();
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-primary/5 to-background">
        <div className="text-center">
          <Icon name="Loader2" size={48} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Проверка доступа...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-red-50 to-background">
        <Card className="p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="ShieldX" size={32} className="text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Доступ запрещен</h2>
          <p className="text-muted-foreground mb-6">
            У вас нет прав для просмотра этой страницы. Только администраторы могут получить доступ к панели управления.
          </p>
          <Button onClick={onClose} variant="outline">
            Вернуться назад
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background">
      <div className="h-16 bg-white border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Icon name="Shield" size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Панель администратора</h1>
            <p className="text-xs text-muted-foreground">Управление и аналитика</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={refreshMetrics} variant="outline" size="sm">
            <Icon name="RefreshCw" size={16} className="mr-2" />
            Обновить
          </Button>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name="X" size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Ключевые метрики */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Всего пользователей</span>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icon name="Users" size={20} className="text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold">{analytics.totalUsers}</p>
            <p className="text-xs text-muted-foreground mt-1">+{analytics.newUsers7d} за 7 дней</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Активных сегодня</span>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Icon name="Activity" size={20} className="text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold">{analytics.activeToday}</p>
            <p className="text-xs text-muted-foreground mt-1">За последние 24 часа</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Деревьев создано</span>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Icon name="GitBranch" size={20} className="text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold">{analytics.totalTrees}</p>
            <p className="text-xs text-muted-foreground mt-1">+{analytics.trees7d} за 7 дней</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Персон добавлено</span>
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Icon name="UserPlus" size={20} className="text-amber-600" />
              </div>
            </div>
            <p className="text-3xl font-bold">{analytics.totalPersons}</p>
            <p className="text-xs text-muted-foreground mt-1">+{analytics.persons7d} за 7 дней</p>
          </Card>
        </div>

        {/* Баннер ошибки аналитики */}
        {analyticsError && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
            <Icon name="AlertTriangle" size={20} className="text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800">Не удалось загрузить данные аналитики</p>
              <p className="text-sm text-amber-700">Попробуйте обновить страницу или повторите попытку позже.</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto shrink-0" onClick={refreshMetrics}>
              Повторить
            </Button>
          </div>
        )}

        {/* Конверсия по тарифам */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Выбор тарифов</h3>
              <Icon name="TrendingUp" size={20} className="text-primary" />
            </div>
            <div className="space-y-4">
              {(() => {
                const total = analytics.plansSelected.start + analytics.plansSelected.premium_month + analytics.plansSelected.premium_half + analytics.plansSelected.premium_year;
                const pct = (val: number) => total > 0 ? Math.round((val / total) * 100) : 0;
                return (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Старт (бесплатно)</span>
                        <span className="text-sm font-semibold">{analytics.plansSelected.start}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${pct(analytics.plansSelected.start)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Премиум месяц</span>
                        <span className="text-sm font-semibold">{analytics.plansSelected.premium_month}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${pct(analytics.plansSelected.premium_month)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Премиум полгода</span>
                        <span className="text-sm font-semibold">{analytics.plansSelected.premium_half}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${pct(analytics.plansSelected.premium_half)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Премиум год</span>
                        <span className="text-sm font-semibold">{analytics.plansSelected.premium_year}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${pct(analytics.plansSelected.premium_year)}%` }} />
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Быстрые действия</h3>
              <Icon name="Zap" size={20} className="text-primary" />
            </div>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.open('https://metrika.yandex.ru/dashboard?id=101026698', '_blank')}
              >
                <Icon name="BarChart3" size={18} className="mr-3" />
                Открыть Яндекс.Метрику
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  const email = prompt('Введите email администратора для добавления:');
                  if (email) {
                    alert(`Добавьте "${email}" в файл src/config/admins.ts`);
                  }
                }}
              >
                <Icon name="UserPlus" size={18} className="mr-3" />
                Добавить администратора
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Icon name="Database" size={18} className="mr-3" />
                Управление базой данных
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Icon name="Settings" size={18} className="mr-3" />
                Настройки сайта
              </Button>
            </div>
          </Card>
        </div>

        {/* Системная информация */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Системная информация</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="Globe" size={16} className="text-primary" />
                <span className="text-sm font-semibold">Домен</span>
              </div>
              <p className="text-sm text-muted-foreground">семейныекорни.рф</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="CheckCircle2" size={16} className="text-green-600" />
                <span className="text-sm font-semibold">Статус</span>
              </div>
              <p className="text-sm text-green-600">Работает нормально</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="Clock" size={16} className="text-primary" />
                <span className="text-sm font-semibold">Версия</span>
              </div>
              <p className="text-sm text-muted-foreground">v1.0.0</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}