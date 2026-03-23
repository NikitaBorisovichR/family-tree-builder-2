'''
Business: List all family trees for a user
Args: event - dict with httpMethod, queryStringParameters (user_email)
      context - object with request_id
Returns: HTTP response with array of trees
'''
import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Email',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    params = event.get('queryStringParameters', {}) or {}
    user_email = params.get('user_email') or event.get('headers', {}).get('X-User-Email')
    
    if not user_email:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'user_email is required'})
        }
    
    database_url = os.environ.get('DATABASE_URL')
    
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute(
        """SELECT ft.id, ft.title, ft.description, ft.created_at, ft.updated_at,
        (SELECT COUNT(*) FROM "t_p57451291_family_tree_builder_".persons WHERE tree_id = ft.id) as persons_count
        FROM "t_p57451291_family_tree_builder_".family_trees ft
        LEFT JOIN "t_p57451291_family_tree_builder_".users u ON ft.user_id = u.id
        LEFT JOIN "t_p57451291_family_tree_builder_".auth_users au ON ft.auth_user_id = au.id
        WHERE u.email = %s OR au.email = %s
        ORDER BY ft.updated_at DESC""",
        (user_email, user_email)
    )
    
    trees = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    trees_list = []
    for tree in trees:
        trees_list.append({
            'id': tree['id'],
            'title': tree['title'],
            'description': tree['description'],
            'persons_count': tree['persons_count'],
            'created_at': tree['created_at'].isoformat() if tree['created_at'] else None,
            'updated_at': tree['updated_at'].isoformat() if tree['updated_at'] else None
        })
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'isBase64Encoded': False,
        'body': json.dumps({
            'trees': trees_list,
            'count': len(trees_list)
        })
    }