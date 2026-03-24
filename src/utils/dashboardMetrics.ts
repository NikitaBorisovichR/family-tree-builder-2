import { FamilyNode, Edge } from '@/components/TreeCanvas';
import { Stats, Achievement, RecentActivity } from '@/data/dashboardMockData';

export function calculateStats(nodes: FamilyNode[]): Stats {
  const totalPeople = nodes.length;
  
  const photosAdded = nodes.filter(node => node.bio && node.bio.includes('фото')).length;
  
  const storiesWritten = nodes.filter(node => 
    (node.bio && node.bio.length > 50) || 
    (node.historyContext && node.historyContext.length > 50)
  ).length;
  
  const documentsUploaded = 0;
  
  const generations = calculateGenerations(nodes);
  
  const filledFields = nodes.reduce((acc, node) => {
    let filled = 0;
    const total = 11;
    
    if (node.firstName) filled++;
    if (node.lastName) filled++;
    if (node.middleName) filled++;
    if (node.birthDate) filled++;
    if (node.birthPlace) filled++;
    if (node.deathDate || node.isAlive) filled++;
    if (node.deathPlace || node.isAlive) filled++;
    if (node.occupation) filled++;
    if (node.bio) filled++;
    if (node.historyContext) filled++;
    if (node.gender) filled++;
    
    return acc + (filled / total);
  }, 0);
  
  const completionPercentage = totalPeople > 0 
    ? Math.round((filledFields / totalPeople) * 100) 
    : 0;

  const weeklyChanges = calculateWeeklyChanges(nodes);

  return {
    totalPeople,
    generations,
    photosAdded,
    storiesWritten,
    documentsUploaded,
    completionPercentage,
    ...weeklyChanges
  };
}

function calculateWeeklyChanges(nodes: FamilyNode[]): {
  weeklyPeopleChange: number;
  weeklyPhotosChange: number;
  weeklyStoriesChange: number;
} {
  const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  
  const savedStats = localStorage.getItem('familyTree_weeklyStats');
  let previousStats = { people: 0, photos: 0, stories: 0, timestamp: 0 };
  
  if (savedStats) {
    try {
      previousStats = JSON.parse(savedStats);
    } catch (e) {
      console.error('Error parsing weekly stats', e);
    }
  }
  
  if (previousStats.timestamp < weekAgo || previousStats.timestamp === 0) {
    const currentStats = {
      people: nodes.length,
      photos: nodes.filter(node => node.bio && node.bio.includes('фото')).length,
      stories: nodes.filter(node => 
        (node.bio && node.bio.length > 50) || 
        (node.historyContext && node.historyContext.length > 50)
      ).length,
      timestamp: Date.now()
    };
    
    localStorage.setItem('familyTree_weeklyStats', JSON.stringify(currentStats));
    
    return {
      weeklyPeopleChange: nodes.length - previousStats.people,
      weeklyPhotosChange: currentStats.photos - previousStats.photos,
      weeklyStoriesChange: currentStats.stories - previousStats.stories
    };
  }
  
  const currentPhotos = nodes.filter(node => node.bio && node.bio.includes('фото')).length;
  const currentStories = nodes.filter(node => 
    (node.bio && node.bio.length > 50) || 
    (node.historyContext && node.historyContext.length > 50)
  ).length;
  
  return {
    weeklyPeopleChange: nodes.length - previousStats.people,
    weeklyPhotosChange: currentPhotos - previousStats.photos,
    weeklyStoriesChange: currentStories - previousStats.stories
  };
}

function calculateGenerations(nodes: FamilyNode[]): number {
  if (nodes.length === 0) return 0;
  
  const birthYears = nodes
    .map(node => {
      const year = parseInt(node.birthDate);
      return isNaN(year) ? null : year;
    })
    .filter((year): year is number => year !== null)
    .sort((a, b) => a - b);
  
  if (birthYears.length === 0) return 1;
  
  const yearSpan = birthYears[birthYears.length - 1] - birthYears[0];
  const avgGenerationSpan = 25;
  
  return Math.max(1, Math.ceil(yearSpan / avgGenerationSpan) + 1);
}

export function calculateAchievements(nodes: FamilyNode[], stats: Stats): Achievement[] {
  const achievements: Achievement[] = [
    {
      id: 'first-person',
      title: 'Первый шаг',
      description: 'Добавьте первого человека в древо',
      icon: 'User',
      progress: nodes.length > 0 ? 1 : 0,
      maxProgress: 1,
      unlocked: nodes.length > 0,
      reward: '+50 XP'
    },
    {
      id: 'family-of-10',
      title: 'Большая семья',
      description: 'Добавьте 10 членов семьи',
      icon: 'Users',
      progress: stats.totalPeople,
      maxProgress: 10,
      unlocked: stats.totalPeople >= 10,
      reward: '+100 XP'
    },
    {
      id: 'photographer',
      title: 'Фотограф',
      description: 'Загрузите 20 фотографий',
      icon: 'Camera',
      progress: stats.photosAdded,
      maxProgress: 20,
      unlocked: stats.photosAdded >= 20,
      reward: '+150 XP'
    },
    {
      id: 'storyteller',
      title: 'Хранитель историй',
      description: 'Напишите 10 семейных историй',
      icon: 'BookOpen',
      progress: stats.storiesWritten,
      maxProgress: 10,
      unlocked: stats.storiesWritten >= 10,
      reward: '+200 XP'
    },
    {
      id: 'archivist',
      title: 'Архивариус',
      description: 'Загрузите 15 документов',
      icon: 'FileText',
      progress: stats.documentsUploaded,
      maxProgress: 15,
      unlocked: stats.documentsUploaded >= 15,
      reward: '+250 XP'
    },
    {
      id: 'century',
      title: 'Век истории',
      description: 'Охватите 100 лет семейной истории',
      icon: 'Calendar',
      progress: calculateYearSpan(nodes),
      maxProgress: 100,
      unlocked: calculateYearSpan(nodes) >= 100,
      reward: '+300 XP'
    },
    {
      id: 'dynasty',
      title: 'Династия',
      description: 'Заполните 7 поколений',
      icon: 'Crown',
      progress: stats.generations,
      maxProgress: 7,
      unlocked: stats.generations >= 7,
      reward: '+500 XP'
    },
    {
      id: 'researcher',
      title: 'Исследователь',
      description: 'Добавьте информацию из архивов',
      icon: 'Search',
      progress: nodes.filter(n => n.historyContext && n.historyContext.length > 100).length,
      maxProgress: 5,
      unlocked: nodes.filter(n => n.historyContext && n.historyContext.length > 100).length >= 5,
      reward: '+350 XP'
    }
  ];

  return achievements;
}

function calculateYearSpan(nodes: FamilyNode[]): number {
  const birthYears = nodes
    .map(node => {
      const year = parseInt(node.birthDate);
      return isNaN(year) ? null : year;
    })
    .filter((year): year is number => year !== null);
  
  if (birthYears.length === 0) return 0;
  
  const minYear = Math.min(...birthYears);
  const maxYear = Math.max(...birthYears);
  
  return maxYear - minYear;
}

export function calculateLevel(achievements: Achievement[]): { level: number; currentXP: number; nextLevelXP: number } {
  const totalXP = achievements
    .filter(a => a.unlocked)
    .reduce((sum, a) => {
      const xp = parseInt(a.reward.replace(/[^0-9]/g, ''));
      return sum + xp;
    }, 0);
  
  const level = Math.floor(totalXP / 200) + 1;
  const currentXP = totalXP % 200;
  const nextLevelXP = 200;
  
  return { level, currentXP, nextLevelXP };
}

function formatTimeAgo(timestamp: number): string {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин. назад`;
  if (hours < 24) return `${hours} ч. назад`;
  if (days === 1) return '1 день назад';
  if (days < 30) return `${days} дн. назад`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 месяц назад';
  if (months < 12) return `${months} мес. назад`;
  return `${Math.floor(months / 12)} г. назад`;
}

export function getRecentActivity(nodes: FamilyNode[]): RecentActivity[] {
  type EventItem = { timestamp: number; activity: RecentActivity };
  const events: EventItem[] = [];

  nodes.forEach((node) => {
    const name = `${node.firstName} ${node.lastName}`.trim();
    if (!name) return;

    if (node.createdAt) {
      events.push({
        timestamp: node.createdAt,
        activity: {
          action: 'Добавлен член семьи',
          person: name,
          time: formatTimeAgo(node.createdAt),
          icon: 'UserPlus'
        }
      });
    }

    if (node.updatedAt && node.updatedAt !== node.createdAt) {
      if (node.bio && node.bio.length > 50) {
        events.push({
          timestamp: node.updatedAt,
          activity: {
            action: 'Написана история',
            person: name,
            time: formatTimeAgo(node.updatedAt),
            icon: 'BookOpen'
          }
        });
      } else {
        events.push({
          timestamp: node.updatedAt,
          activity: {
            action: 'Обновлён профиль',
            person: name,
            time: formatTimeAgo(node.updatedAt),
            icon: 'Pencil'
          }
        });
      }
    }
  });

  const sorted = events
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 4)
    .map((e) => e.activity);

  while (sorted.length < 4) {
    sorted.push({
      action: 'Нет активности',
      person: 'Добавьте новых членов семьи',
      time: '',
      icon: 'Clock'
    });
  }

  return sorted;
}

export function getProfileCompleteness(nodes: FamilyNode[]): {
  complete: number;
  partial: number;
  minimal: number;
} {
  let complete = 0;
  let partial = 0;
  let minimal = 0;
  
  nodes.forEach(node => {
    let filledCount = 0;
    const totalFields = 11;
    
    if (node.firstName) filledCount++;
    if (node.lastName) filledCount++;
    if (node.middleName) filledCount++;
    if (node.birthDate) filledCount++;
    if (node.birthPlace) filledCount++;
    if (node.deathDate || node.isAlive) filledCount++;
    if (node.deathPlace || node.isAlive) filledCount++;
    if (node.occupation) filledCount++;
    if (node.bio) filledCount++;
    if (node.historyContext) filledCount++;
    if (node.gender) filledCount++;
    
    const percentage = (filledCount / totalFields) * 100;
    
    if (percentage >= 70) complete++;
    else if (percentage >= 40) partial++;
    else minimal++;
  });
  
  return { complete, partial, minimal };
}

export function getGenerationDistribution(nodes: FamilyNode[]): Array<{
  generation: string;
  count: number;
  color: string;
}> {
  const currentYear = new Date().getFullYear();
  const generations = [
    { generation: 'Я и мои дети', minAge: 0, maxAge: 40, color: 'from-blue-400 to-blue-600', count: 0 },
    { generation: 'Родители', minAge: 41, maxAge: 65, color: 'from-green-400 to-green-600', count: 0 },
    { generation: 'Бабушки и дедушки', minAge: 66, maxAge: 90, color: 'from-purple-400 to-purple-600', count: 0 },
    { generation: 'Прабабушки и прадедушки', minAge: 91, maxAge: 120, color: 'from-amber-400 to-amber-600', count: 0 },
    { generation: 'Более дальние предки', minAge: 121, maxAge: 999, color: 'from-pink-400 to-pink-600', count: 0 }
  ];
  
  nodes.forEach(node => {
    const birthYear = parseInt(node.birthDate);
    if (!isNaN(birthYear)) {
      const age = currentYear - birthYear;
      
      for (const gen of generations) {
        if (age >= gen.minAge && age <= gen.maxAge) {
          gen.count++;
          break;
        }
      }
    }
  });
  
  return generations.map(({ generation, color, count }) => ({
    generation,
    count,
    color
  }));
}

export function getTimeSpan(nodes: FamilyNode[]): { years: number; startYear: number; endYear: number } {
  const birthYears = nodes
    .map(node => {
      const year = parseInt(node.birthDate);
      return isNaN(year) ? null : year;
    })
    .filter((year): year is number => year !== null);
  
  if (birthYears.length === 0) {
    return { years: 0, startYear: 0, endYear: 0 };
  }
  
  const startYear = Math.min(...birthYears);
  const endYear = Math.max(...birthYears);
  const years = endYear - startYear;
  
  return { years, startYear, endYear };
}