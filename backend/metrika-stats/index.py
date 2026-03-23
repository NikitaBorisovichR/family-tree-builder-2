import json
import os
import psycopg2  # noqa: F401
from typing import Dict, Any
from datetime import datetime, timedelta


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Получение статистики из БД для админ-панели:
    пользователи, деревья, персоны, сессии за последние 7 дней
    """
    method: str = event.get('httpMethod', 'GET')

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

    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    date_7_days_ago = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
    date_today = datetime.now().strftime('%Y-%m-%d')
    date_24h_ago = (datetime.now() - timedelta(hours=24)).isoformat()

    # Всего пользователей
    cur.execute(f"SELECT COUNT(*) FROM {schema}.auth_users")
    total_users = cur.fetchone()[0]

    # Новых за 7 дней
    cur.execute(f"SELECT COUNT(*) FROM {schema}.auth_users WHERE created_at >= %s", (date_7_days_ago,))
    new_users_7d = cur.fetchone()[0]

    # Активных за 24 часа (по сессиям)
    cur.execute(f"SELECT COUNT(DISTINCT user_id) FROM {schema}.auth_sessions WHERE created_at >= %s", (date_24h_ago,))
    active_today = cur.fetchone()[0]

    # Всего деревьев
    cur.execute(f"SELECT COUNT(*) FROM {schema}.family_trees")
    total_trees = cur.fetchone()[0]

    # Деревьев за 7 дней
    cur.execute(f"SELECT COUNT(*) FROM {schema}.family_trees WHERE created_at >= %s", (date_7_days_ago,))
    trees_7d = cur.fetchone()[0]

    # Всего персон
    cur.execute(f"SELECT COUNT(*) FROM {schema}.persons")
    total_persons = cur.fetchone()[0]

    # Персон за 7 дней
    cur.execute(f"SELECT COUNT(*) FROM {schema}.persons WHERE created_at >= %s", (date_7_days_ago,))
    persons_7d = cur.fetchone()[0]

    cur.close()
    conn.close()

    result = {
        'total_users': total_users,
        'new_users_7d': new_users_7d,
        'active_today': active_today,
        'total_trees': total_trees,
        'trees_7d': trees_7d,
        'total_persons': total_persons,
        'persons_7d': persons_7d,
        'period': {
            'start': date_7_days_ago,
            'end': date_today
        },
        'timestamp': datetime.now().isoformat()
    }

    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(result)
    }