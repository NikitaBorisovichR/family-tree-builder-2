import React from 'react';
import Icon from '@/components/ui/icon';
import { Card } from '@/components/ui/card';
import { Stats, RecentActivity } from '@/data/dashboardMockData';
import { FamilyNode, Edge } from '@/components/TreeCanvas';
import { getRecommendations } from '@/utils/dashboardRecommendations';
import { getProfileCompleteness } from '@/utils/dashboardMetrics';

interface DashboardOverviewTabProps {
  stats: Stats;
  recentActivity: RecentActivity[];
  nodes?: FamilyNode[];
  edges?: Edge[];
}

export default function DashboardOverviewTab({ stats, recentActivity, nodes = [], edges = [] }: DashboardOverviewTabProps) {
  const recommendations = getRecommendations(nodes, edges);
  const { complete, partial, minimal } = getProfileCompleteness(nodes);
  
  const weeklyPeopleChange = stats.weeklyPeopleChange || 0;
  const weeklyPhotosChange = stats.weeklyPhotosChange || 0;
  const weeklyStoriesChange = stats.weeklyStoriesChange || 0;
  
  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <Icon name="Users" size={24} className="text-blue-600" />
            {weeklyPeopleChange > 0 && (
              <span className="text-xs font-semibold text-blue-600 bg-blue-200 px-2 py-1 rounded-full">
                +{weeklyPeopleChange} за неделю
              </span>
            )}
          </div>
          <div className="text-3xl font-bold text-blue-900 mb-1">{stats.totalPeople}</div>
          <div className="text-sm text-blue-700">Членов семьи</div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
          <div className="flex items-center justify-between mb-2">
            <Icon name="GitBranch" size={24} className="text-green-600" />
          </div>
          <div className="text-3xl font-bold text-green-900 mb-1">{stats.generations}</div>
          <div className="text-sm text-green-700">Поколений</div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <Icon name="Camera" size={24} className="text-purple-600" />
            {weeklyPhotosChange > 0 && (
              <span className="text-xs font-semibold text-purple-600 bg-purple-200 px-2 py-1 rounded-full">
                +{weeklyPhotosChange} за неделю
              </span>
            )}
          </div>
          <div className="text-3xl font-bold text-purple-900 mb-1">{stats.photosAdded}</div>
          <div className="text-sm text-purple-700">Фотографий</div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <div className="flex items-center justify-between mb-2">
            <Icon name="BookOpen" size={24} className="text-amber-600" />
            {weeklyStoriesChange > 0 && (
              <span className="text-xs font-semibold text-amber-600 bg-amber-200 px-2 py-1 rounded-full">
                +{weeklyStoriesChange} за неделю
              </span>
            )}
          </div>
          <div className="text-3xl font-bold text-amber-900 mb-1">{stats.storiesWritten}</div>
          <div className="text-sm text-amber-700">Историй написано</div>
        </Card>
      </div>

      <Card className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-foreground mb-1">Прогресс заполнения древа</h3>
            <p className="text-muted-foreground">Заполните основную информацию о каждом члене семьи</p>
          </div>
          <div className="text-5xl font-bold text-primary">{stats.completionPercentage}%</div>
        </div>
        
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 relative"
            style={{ width: `${stats.completionPercentage}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <Icon name="Check" size={20} className="text-white" />
            </div>
            <div>
              <div className="font-semibold text-green-900">Заполнено</div>
              <div className="text-sm text-green-700">{complete} профилей</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
              <Icon name="AlertCircle" size={20} className="text-white" />
            </div>
            <div>
              <div className="font-semibold text-yellow-900">Частично</div>
              <div className="text-sm text-yellow-700">{partial} профилей</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
              <Icon name="Clock" size={20} className="text-white" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Не заполнено</div>
              <div className="text-sm text-gray-700">{minimal} профилей</div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Icon name="TrendingUp" size={20} className="text-primary" />
            Последняя активность
          </h3>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon name={activity.icon} size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground">{activity.action}</div>
                  <div className="text-sm text-muted-foreground truncate">{activity.person}</div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Icon name="Target" size={20} className="text-primary" />
            Рекомендации
          </h3>
          {recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div key={index} className="p-4 bg-white rounded-lg border border-primary/20 hover:border-primary/40 transition-all cursor-pointer">
                  <div className="flex items-start gap-3">
                    <Icon name={rec.icon} size={20} className="text-primary mt-0.5" />
                    <div>
                      <div className="font-semibold text-foreground mb-1">{rec.title}</div>
                      <div className="text-sm text-muted-foreground">{rec.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Icon name="CheckCircle2" size={48} className="text-green-500 mx-auto mb-4" />
              <div className="text-lg font-semibold text-foreground mb-2">Отличная работа!</div>
              <div className="text-sm text-muted-foreground">Все основные данные заполнены</div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}