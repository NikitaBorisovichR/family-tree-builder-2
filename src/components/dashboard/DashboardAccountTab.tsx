import React, { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AUTH_API_URL = 'https://functions.poehali.dev/dc0b8bbb-f7c0-468e-b1e1-97e5c421718f';

interface UserData {
  email: string;
  display_name: string;
  avatar_url?: string;
  user_id?: number;
}

export default function DashboardAccountTab() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<'success' | 'error' | null>(null);
  const [registeredAt, setRegisteredAt] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('user_data');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as UserData;
        setUserData(parsed);
        setDisplayName(parsed.display_name || '');
      } catch (_e) { /* ignore */ }
    }
    // Дата регистрации может быть в session
    const token = localStorage.getItem('session_token');
    if (token) {
      fetch(`${AUTH_API_URL}?action=verify`, {
        headers: { 'X-Session-Token': token }
      })
        .then(r => r.json())
        .then(data => {
          if (data.email) {
            const updated = { ...data };
            setUserData(updated);
            setDisplayName(data.display_name || '');
            localStorage.setItem('user_data', JSON.stringify(updated));
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleSave = async () => {
    if (!displayName.trim()) return;
    setIsSaving(true);
    setSaveResult(null);
    try {
      const token = localStorage.getItem('session_token');
      const res = await fetch(`${AUTH_API_URL}?action=update_profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Token': token || '' },
        body: JSON.stringify({ display_name: displayName.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        const updated = { ...userData, display_name: data.display_name } as UserData;
        setUserData(updated);
        localStorage.setItem('user_data', JSON.stringify(updated));
        setSaveResult('success');
        setIsEditing(false);
        setTimeout(() => setSaveResult(null), 3000);
      } else {
        setSaveResult('error');
      }
    } catch {
      setSaveResult('error');
    }
    setIsSaving(false);
  };

  if (!userData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Icon name="Loader2" size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  const initials = (userData.display_name || userData.email || '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Аватар и имя */}
      <Card className="p-8">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {userData.avatar_url
              ? <img src={userData.avatar_url} className="w-20 h-20 rounded-full object-cover" alt="" />
              : <span className="text-2xl font-bold text-primary">{initials}</span>
            }
          </div>
          <div>
            <h2 className="text-xl font-bold">{userData.display_name}</h2>
            <p className="text-sm text-muted-foreground">{userData.email}</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Имя */}
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Имя</Label>
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Введите имя"
                  className="flex-1"
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  autoFocus
                />
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Icon name="Loader2" size={16} className="animate-spin" /> : 'Сохранить'}
                </Button>
                <Button variant="outline" onClick={() => { setIsEditing(false); setDisplayName(userData.display_name || ''); }}>
                  Отмена
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                <span className="text-sm">{userData.display_name || '—'}</span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Icon name="Pencil" size={13} /> Изменить
                </button>
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Email</Label>
            <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg">
              <Icon name="Mail" size={15} className="text-muted-foreground" />
              <span className="text-sm">{userData.email}</span>
              <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Только чтение</span>
            </div>
          </div>

          {saveResult === 'success' && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm">
              <Icon name="CheckCircle2" size={16} />
              Имя успешно обновлено
            </div>
          )}
          {saveResult === 'error' && (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm">
              <Icon name="AlertCircle" size={16} />
              Не удалось сохранить. Попробуйте снова.
            </div>
          )}
        </div>
      </Card>

      {/* Безопасность */}
      <Card className="p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Icon name="Shield" size={18} className="text-primary" />
          Безопасность
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium">Пароль</p>
              <p className="text-xs text-muted-foreground">Последнее изменение неизвестно</p>
            </div>
            <span className="text-xs text-muted-foreground">••••••••</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium">Сессия</p>
              <p className="text-xs text-muted-foreground">Активна на этом устройстве</p>
            </div>
            <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
              <Icon name="CheckCircle2" size={14} /> Активна
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}