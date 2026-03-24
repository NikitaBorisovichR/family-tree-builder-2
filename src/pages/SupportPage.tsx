import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SupportPage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const faqCategories = [
    {
      id: 'getting-started',
      title: 'Начало работы',
      icon: 'Rocket',
      questions: [
        {
          q: 'Как зарегистрироваться в системе?',
          a: 'Нажмите кнопку "Начать" на главной странице и войдите через Яндекс ID. Никаких дополнительных регистраций не требуется.'
        },
        {
          q: 'Как создать первое древо?',
          a: 'После входа заполните базовую информацию о себе. Затем используйте кнопки "+" возле вашего узла, чтобы добавить родителей, супругов или детей.'
        },
        {
          q: 'Можно ли создать несколько древ?',
          a: 'Да, вы можете создавать неограниченное количество древ для разных ветвей семьи. Переключаться между ними можно в Личном кабинете.'
        }
      ]
    },
    {
      id: 'editing',
      title: 'Редактирование',
      icon: 'Edit',
      questions: [
        {
          q: 'Как добавить фотографию?',
          a: 'Кликните на узел персоны, в правой панели нажмите "Загрузить фото" и выберите изображение с компьютера.'
        },
        {
          q: 'Как изменить данные персоны?',
          a: 'Выберите узел на древе, и в правой панели вы сможете редактировать все поля: имя, даты, место рождения и другие данные.'
        },
        {
          q: 'Можно ли удалить персону?',
          a: 'Да, выберите узел и нажмите кнопку "Удалить" в нижней части правой панели или клавишу Delete на клавиатуре.'
        }
      ]
    },
    {
      id: 'navigation',
      title: 'Навигация',
      icon: 'Move',
      questions: [
        {
          q: 'Как перемещаться по древу?',
          a: 'Зажмите левую кнопку мыши и перетаскивайте холст. Используйте колесико мыши для масштабирования.'
        },
        {
          q: 'Как найти конкретную персону?',
          a: 'Используйте масштабирование и перемещение. В будущих версиях появится функция поиска.'
        },
        {
          q: 'Можно ли изменить расположение узлов?',
          a: 'Узлы автоматически располагаются согласно иерархии. Вы можете перетаскивать отдельные узлы для тонкой настройки.'
        }
      ]
    },
    {
      id: 'saving',
      title: 'Сохранение данных',
      icon: 'Save',
      questions: [
        {
          q: 'Как сохранить древо?',
          a: 'Нажмите кнопку "Сохранить" в верхней панели или используйте Ctrl+S (Cmd+S на Mac). Данные сохраняются в облаке.'
        },
        {
          q: 'Есть ли автосохранение?',
          a: 'Да, система автоматически сохраняет изменения, но мы рекомендуем периодически нажимать "Сохранить" вручную.'
        },
        {
          q: 'Как сделать резервную копию?',
          a: 'Используйте кнопку экспорта (иконка скачивания) в верхней панели. Древо сохранится в формате JSON на ваш компьютер.'
        }
      ]
    },
    {
      id: 'technical',
      title: 'Технические вопросы',
      icon: 'Settings',
      questions: [
        {
          q: 'На каких устройствах работает платформа?',
          a: 'Платформа работает в любом современном браузере на компьютере, планшете или смартфоне. Рекомендуем Chrome, Firefox или Safari.'
        },
        {
          q: 'Где хранятся мои данные?',
          a: 'Все данные надежно хранятся в облаке на защищенных серверах. Доступ к ним имеете только вы.'
        },
        {
          q: 'Что делать если возникла ошибка?',
          a: 'Попробуйте обновить страницу (F5). Если проблема сохраняется, свяжитесь с поддержкой через форму ниже.'
        }
      ]
    }
  ];

  const contactMethods = [
    {
      icon: 'MessageCircle',
      title: 'Telegram',
      description: 'Быстрый ответ в течение часа',
      link: 'https://t.me/+QgiLIa1gFRY4Y2Iy',
      label: 'Написать в Telegram'
    },
    {
      icon: 'Mail',
      title: 'Email',
      description: 'Ответ в течение 24 часов',
      link: 'mailto:nikitasadovsky@yandex.ru',
      label: 'Написать на email'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background">
      <div className="h-16 bg-white border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <Icon name="ArrowLeft" size={20} />
          </button>
          <div className="font-bold text-primary flex items-center gap-2">
            <Icon name="HelpCircle" /> Поддержка
          </div>
        </div>
        <Button onClick={() => navigate('/tree')} variant="outline">
          <Icon name="TreePine" size={16} className="mr-2" />
          Перейти к древу
        </Button>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Центр поддержки</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ответы на часто задаваемые вопросы и способы связи с нами
          </p>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Часто задаваемые вопросы</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {faqCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id === selectedCategory ? null : category.id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedCategory === category.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Icon name={category.icon} size={20} className="text-primary" />
                  </div>
                  <span className="font-semibold text-foreground">{category.title}</span>
                </div>
              </button>
            ))}
          </div>

          {selectedCategory && (
            <Card className="p-6">
              {faqCategories
                .find((c) => c.id === selectedCategory)
                ?.questions.map((item, index) => (
                  <div key={index} className={`${index !== 0 ? 'pt-6 mt-6 border-t border-border' : ''}`}>
                    <h3 className="text-lg font-bold text-foreground mb-2 flex items-start gap-2">
                      <Icon name="HelpCircle" size={20} className="text-primary mt-0.5 shrink-0" />
                      {item.q}
                    </h3>
                    <p className="text-muted-foreground ml-7">{item.a}</p>
                  </div>
                ))}
            </Card>
          )}
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Связаться с поддержкой</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {contactMethods.map((method, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Icon name={method.icon} size={24} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground mb-1">{method.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{method.description}</p>
                    <Button onClick={() => window.open(method.link, '_blank')} variant="outline" size="sm">
                      {method.label}
                      <Icon name="ExternalLink" size={14} className="ml-2" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <Card className="p-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <Icon name="Sparkles" size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">Не нашли ответ?</h3>
              <p className="text-muted-foreground mb-4">
                Мы постоянно улучшаем платформу и документацию. Если у вас есть вопрос, на который нет ответа, 
                напишите нам — мы обязательно поможем и добавим информацию в раздел FAQ.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => window.open('https://t.me/+QgiLIa1gFRY4Y2Iy', '_blank')}>
                  <Icon name="MessageCircle" size={16} className="mr-2" />
                  Написать в Telegram
                </Button>
                <Button onClick={() => navigate('/tutorial')} variant="outline">
                  <Icon name="GraduationCap" size={16} className="mr-2" />
                  Смотреть обучение
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}