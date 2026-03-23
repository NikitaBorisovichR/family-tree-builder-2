import json
import os
import psycopg2  # noqa: F401
from typing import Dict, Any
from datetime import datetime, timedelta


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Статистика и детали пользователей из БД для админ-панели.
    GET /?view=stats — общая статистика
    GET /?view=users — детальный список пользователей с деревьями
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

    params = event.get('queryStringParameters') or {}
    view = params.get('view', 'stats')

    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    }

    if view == 'users':
        # auth_users — основная таблица пользователей
        # family_trees привязаны к таблице users (старая), JOIN через email
        cur.execute(f"""
            SELECT
                au.id,
                au.email,
                au.display_name,
                au.created_at,
                au.email_verified,
                COUNT(DISTINCT ft.id) AS trees_count,
                COUNT(DISTINCT p.id) AS persons_count,
                MAX(ft.updated_at) AS last_activity
            FROM {schema}.auth_users au
            LEFT JOIN {schema}.users u ON u.email = au.email
            LEFT JOIN {schema}.family_trees ft ON ft.user_id = u.id
            LEFT JOIN {schema}.persons p ON p.tree_id = ft.id
            GROUP BY au.id, au.email, au.display_name, au.created_at, au.email_verified
            ORDER BY au.created_at DESC
        """)
        users_rows = cur.fetchall()

        users = []
        for row in users_rows:
            email = row[1]
            cur.execute(f"""
                SELECT ft.id, ft.title, ft.created_at, ft.updated_at, COUNT(p.id) AS persons_count
                FROM {schema}.family_trees ft
                JOIN {schema}.users u ON ft.user_id = u.id
                LEFT JOIN {schema}.persons p ON p.tree_id = ft.id
                WHERE u.email = %s
                GROUP BY ft.id, ft.title, ft.created_at, ft.updated_at
                ORDER BY ft.updated_at DESC
            """, (email,))
            trees = [
                {
                    'id': t[0],
                    'title': t[1] or 'Без названия',
                    'created_at': t[2].isoformat() if t[2] else None,
                    'updated_at': t[3].isoformat() if t[3] else None,
                    'persons_count': t[4]
                }
                for t in cur.fetchall()
            ]
            users.append({
                'id': row[0],
                'email': row[1],
                'display_name': row[2] or row[1].split('@')[0],
                'created_at': row[3].isoformat() if row[3] else None,
                'email_verified': row[4],
                'trees_count': row[5],
                'persons_count': row[6],
                'last_activity': row[7].isoformat() if row[7] else None,
                'trees': trees
            })

        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'users': users, 'total': len(users)})}

    # view == 'stats' (default)
    date_7_days_ago = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
    date_today = datetime.now().strftime('%Y-%m-%d')
    date_24h_ago = (datetime.now() - timedelta(hours=24)).isoformat()

    cur.execute(f"SELECT COUNT(*) FROM {schema}.auth_users")
    total_users = cur.fetchone()[0]

    cur.execute(f"SELECT COUNT(*) FROM {schema}.auth_users WHERE created_at >= %s", (date_7_days_ago,))
    new_users_7d = cur.fetchone()[0]

    cur.execute(f"SELECT COUNT(DISTINCT user_id) FROM {schema}.auth_sessions WHERE created_at >= %s", (date_24h_ago,))
    active_today = cur.fetchone()[0]

    cur.execute(f"SELECT COUNT(*) FROM {schema}.family_trees")
    total_trees = cur.fetchone()[0]

    cur.execute(f"SELECT COUNT(*) FROM {schema}.family_trees WHERE created_at >= %s", (date_7_days_ago,))
    trees_7d = cur.fetchone()[0]

    cur.execute(f"SELECT COUNT(*) FROM {schema}.persons")
    total_persons = cur.fetchone()[0]

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
        'period': {'start': date_7_days_ago, 'end': date_today},
        'timestamp': datetime.now().isoformat()
    }

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps(result)}