import React from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface OnboardingFlowProps {
  step: number;
  formData: {
    firstName: string;
    lastName: string;
    gender: string;
    fatherName: string;
    motherName: string;
  };
  onFormDataChange: (data: Partial<OnboardingFlowProps['formData']>) => void;
  onNext: () => void;
  onBack?: () => void;
  onSkip?: () => void;
}

export default function OnboardingFlow({ step, formData, onFormDataChange, onNext, onBack, onSkip }: OnboardingFlowProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8 relative overflow-hidden">
        {step > 1 && (
          <button
            onClick={onBack}
            className="absolute top-4 left-4 text-muted-foreground hover:text-foreground transition-colors"
            title="Назад"
          >
            <Icon name="ArrowLeft" size={20} />
          </button>
        )}
        {onSkip && step < 3 && (
          <button
            onClick={onSkip}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            Пропустить
          </button>
        )}
        <div className="absolute top-0 left-0 w-full h-2 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${step * 33.3}%` }}
          ></div>
        </div>

        <div className="mb-8 mt-4 text-center">
          <h2 className="text-2xl font-bold text-foreground">
            {step === 1 && 'Давайте знакомиться!'}
            {step === 2 && 'Ваши родители'}
            {step === 3 && 'Готово!'}
          </h2>
        </div>

        <div className="space-y-4">
          {step === 1 && (
            <>
              <div>
                <Label>Ваше Имя</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => onFormDataChange({ ...formData, firstName: e.target.value })}
                  placeholder="Иван"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Ваша Фамилия</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => onFormDataChange({ ...formData, lastName: e.target.value })}
                  placeholder="Иванов"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => onFormDataChange({ ...formData, gender: 'male' })}
                  className={`flex-1 p-3 rounded-lg border transition-all ${
                    formData.gender === 'male'
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  Мужской
                </button>
                <button
                  onClick={() => onFormDataChange({ ...formData, gender: 'female' })}
                  className={`flex-1 p-3 rounded-lg border transition-all ${
                    formData.gender === 'female'
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  Женский
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <Label>Имя Отца</Label>
                <Input
                  value={formData.fatherName}
                  onChange={(e) => onFormDataChange({ ...formData, fatherName: e.target.value })}
                  placeholder="Петр"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Имя Матери</Label>
                <Input
                  value={formData.motherName}
                  onChange={(e) => onFormDataChange({ ...formData, motherName: e.target.value })}
                  placeholder="Мария"
                  className="mt-1"
                />
              </div>
            </>
          )}

          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="Users" className="text-primary" size={32} />
              </div>
              <p className="text-muted-foreground">
                Базовая информация собрана. Теперь перейдем к самому интересному — вашему древу!
              </p>
            </div>
          )}

          <Button 
            onClick={onNext} 
            className="w-full mt-6"
            disabled={step === 1 && (!formData.firstName || !formData.lastName)}
          >
            {step === 3 ? 'Перейти к древу' : 'Далее'} <Icon name="ChevronRight" size={16} />
          </Button>
        </div>
      </Card>
    </div>
  );
}