import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { isAdmin } from '@/config/admins';

const API_URL = 'https://functions.poehali.dev/d917b670-852b-45d7-a273-26bf2e464999';

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

interface Tree {
  id: number;
  title: string;
  created_at: string | null;
  updated_at: string | null;
  persons_count: number;
}

interface User {
  id: number;
  email: string;
  display_name: string;
  created_at: string | null;
  email_verified: boolean;
  trees_count: number;
  persons_count: number;
  last_activity: string | null;
  trees: Tree[];
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function UserRow({ user, onViewTree }: { user: User; onViewTree: (treeId: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-muted/40 transition-colors text-left"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">{user.display_name[0]?.toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{user.display_name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0 ml-3">
          <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
            <Icon name="GitBranch" size={12} />
            {user.trees_count}
          </span>
          <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
            <Icon name="Users" size={12} />
            {user.persons_count}
          </span>
          <span className="text-xs text-muted-foreground hidden md:block">{formatDate(user.created_at)}</span>
          {user.email_verified
            ? <Icon name="CheckCircle2" size={14} className="text-green-500" />
            : <Icon name="Clock" size={14} className="text-amber-400" />
          }
          <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={16} className="text-muted-foreground" />
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 bg-muted/20 border-t border-border">
          <div className="flex flex-wrap gap-4 mb-3 text-xs text-muted-foreground">
            <span>Зарегистрирован: <b>{formatDate(user.created_at)}</b></span>
            <span>Последняя активность: <b>{formatDate(user.last_activity)}</b></span>
            <span>Email подтверждён: <b>{user.email_verified ? 'Да' : 'Нет'}</b></span>
          </div>

          {user.trees.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Деревьев нет</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground mb-1">Деревья ({user.trees.length}):</p>
              {user.trees.map(tree => (
                <div key={tree.id} className="flex items-center justify-between bg-white border border-border rounded px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon name="GitBranch" size={14} className="text-purple-500 shrink-0" />
                    <span className="text-sm truncate">{tree.title}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Icon name="Users" size={12} />
                      {tree.persons_count} персон
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {formatDate(tree.updated_at)}
                    </span>
                    <button
                      onClick={() => onViewTree(tree.id)}
                      className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                    >
                      <Icon name="Eye" size={13} /> Открыть
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0, newUsers7d: 0, activeToday: 0,
    totalTrees: 0, trees7d: 0, totalPersons: 0, persons7d: 0,
  });

  useEffect(() => {
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
      } catch {
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
      const response = await fetch(`${API_URL}?view=stats`);
      if (!response.ok) { setAnalyticsError(true); return; }
      const data = await response.json();
      if (data.error) { setAnalyticsError(true); return; }
      setAnalytics({
        totalUsers: data.total_users || 0,
        newUsers7d: data.new_users_7d || 0,
        activeToday: data.active_today || 0,
        totalTrees: data.total_trees || 0,
        trees7d: data.trees_7d || 0,
        totalPersons: data.total_persons || 0,
        persons7d: data.persons_7d || 0,
      });
    } catch {
      setAnalyticsError(true);
    }
  };

  const loadUsers = async () => {
    if (users.length > 0) { setUsersOpen(v => !v); return; }
    setUsersLoading(true);
    setUsersOpen(true);
    try {
      const response = await fetch(`${API_URL}?view=users`);
      const data = await response.json();
      setUsers(data.users || []);
    } catch {
      setUsers([]);
    }
    setUsersLoading(false);
  };

  const refreshAll = async () => {
    setIsLoading(true);
    setUsers([]);
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
            У вас нет прав для просмотра этой страницы.
          </p>
          <Button onClick={onClose} variant="outline">Вернуться назад</Button>
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
          <Button onClick={refreshAll} variant="outline" size="sm">
            <Icon name="RefreshCw" size={16} className="mr-2" />
            Обновить
          </Button>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* Ключевые метрики */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Пользователей</span>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icon name="Users" size={16} className="text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold">{analytics.totalUsers}</p>
            <p className="text-xs text-muted-foreground mt-1">+{analytics.newUsers7d} за 7 дней</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Активных сегодня</span>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Icon name="Activity" size={16} className="text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold">{analytics.activeToday}</p>
            <p className="text-xs text-muted-foreground mt-1">За 24 часа</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Деревьев</span>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Icon name="GitBranch" size={16} className="text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold">{analytics.totalTrees}</p>
            <p className="text-xs text-muted-foreground mt-1">+{analytics.trees7d} за 7 дней</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Персон</span>
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <Icon name="UserPlus" size={16} className="text-amber-600" />
              </div>
            </div>
            <p className="text-3xl font-bold">{analytics.totalPersons}</p>
            <p className="text-xs text-muted-foreground mt-1">+{analytics.persons7d} за 7 дней</p>
          </Card>
        </div>

        {/* Ошибка */}
        {analyticsError && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
            <Icon name="AlertTriangle" size={20} className="text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">Не удалось загрузить данные. Попробуйте обновить.</p>
            <Button variant="outline" size="sm" className="ml-auto shrink-0" onClick={refreshAll}>Повторить</Button>
          </div>
        )}

        {/* Список пользователей — сворачиваемый */}
        <Card className="overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors"
            onClick={loadUsers}
          >
            <div className="flex items-center gap-3">
              <Icon name="Users" size={20} className="text-primary" />
              <div className="text-left">
                <p className="font-bold text-sm">Пользователи</p>
                <p className="text-xs text-muted-foreground">Подробная информация по каждому</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                {analytics.totalUsers}
              </span>
              {usersLoading
                ? <Icon name="Loader2" size={16} className="animate-spin text-muted-foreground" />
                : <Icon name={usersOpen ? 'ChevronUp' : 'ChevronDown'} size={16} className="text-muted-foreground" />
              }
            </div>
          </button>

          {usersOpen && !usersLoading && (
            <div className="border-t border-border p-4 space-y-2">
              {users.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-4">Нет пользователей</p>
                : users.map(user => (
                  <UserRow
                    key={user.id}
                    user={user}
                    onViewTree={(treeId) => navigate(`/tree?tree_id=${treeId}&readonly=true`)}
                  />
                ))
              }
            </div>
          )}
        </Card>

        {/* Системная информация */}
        <Card className="p-5">
          <h3 className="text-sm font-bold mb-3">Системная информация</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Icon name="Globe" size={14} className="text-primary" />
                <span className="text-xs font-semibold">Домен</span>
              </div>
              <p className="text-xs text-muted-foreground">skorni.ru</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Icon name="CheckCircle2" size={14} className="text-green-600" />
                <span className="text-xs font-semibold">Статус</span>
              </div>
              <p className="text-xs text-green-600">Работает нормально</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Icon name="Clock" size={14} className="text-primary" />
                <span className="text-xs font-semibold">Обновлено</span>
              </div>
              <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString('ru-RU')}</p>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}