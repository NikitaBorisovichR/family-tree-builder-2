import json
import os  # noqa
from typing import Dict, Any
from datetime import datetime, timedelta
import urllib.request
import urllib.error

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Получение статистики из Яндекс.Метрики для админ-панели
    Args: event - HTTP запрос с методом GET
          context - контекст функции
    Returns: JSON с метриками: визиты, посетители, конверсии по целям
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # CORS preflight
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    # Получаем токен из environment
    metrika_token = os.environ.get('YANDEX_METRIKA_TOKEN')
    if not metrika_token:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Metrika token not configured'})
        }
    
    counter_id = '101026698'
    
    # Получаем данные за последние 7 дней
    date_end = datetime.now().strftime('%Y-%m-%d')
    date_start = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
    
    try:
        # Запрос общей статистики
        stats_url = f'https://api-metrika.yandex.net/stat/v1/data?ids={counter_id}&metrics=ym:s:visits,ym:s:users,ym:s:pageviews&date1={date_start}&date2={date_end}&accuracy=full'
        
        stats_request = urllib.request.Request(
            stats_url,
            headers={'Authorization': f'OAuth {metrika_token}'}
        )
        
        with urllib.request.urlopen(stats_request) as response:
            stats_data = json.loads(response.read().decode())
        print(f"Metrika response: {json.dumps(stats_data)[:500]}")
        
        # Запрос данных по целям
        goals_url = f'https://api-metrika.yandex.net/stat/v1/data?ids={counter_id}&metrics=ym:s:goalReachesAny&dimensions=ym:s:goalID&date1={date_start}&date2={date_end}&accuracy=full'
        
        goals_request = urllib.request.Request(
            goals_url,
            headers={'Authorization': f'OAuth {metrika_token}'}
        )
        
        goals_data = {}
        try:
            with urllib.request.urlopen(goals_request) as response:
                goals_response = json.loads(response.read().decode())
                
                # Парсим данные по целям
                if 'data' in goals_response:
                    for item in goals_response['data']:
                        dimensions = item.get('dimensions', [])
                        metrics = item.get('metrics', [])
                        if dimensions and metrics:
                            goal_name = dimensions[0].get('name', '')
                            goal_reaches = metrics[0]
                            goals_data[goal_name] = goal_reaches
        except Exception as e:
            print(f"Error fetching goals: {e}")
        
        # Формируем ответ
        totals = stats_data.get('totals', [0, 0, 0])
        
        result = {
            'visits': totals[0],
            'users': totals[1],
            'pageviews': totals[2],
            'period': {
                'start': date_start,
                'end': date_end
            },
            'goals': goals_data,
            'timestamp': datetime.now().isoformat()
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps(result)
        }
        
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else 'Unknown error'
        return {
            'statusCode': e.code,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'error': 'Metrika API error',
                'details': error_body,
                'status_code': e.code
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }