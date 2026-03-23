'''
Business: Save family tree to database
Args: event - dict with httpMethod, body (tree_id, user_email, nodes, edges, title)
      context - object with request_id
Returns: HTTP response with saved tree_id
'''
import json
import os
from typing import Dict, Any, List
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Email',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    body_data = json.loads(event.get('body', '{}'))
    user_email = body_data.get('user_email') or event.get('headers', {}).get('X-User-Email')
    
    if not user_email:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'user_email is required'})
        }
    
    tree_id = body_data.get('tree_id')
    nodes: List[Dict] = body_data.get('nodes', [])
    edges: List[Dict] = body_data.get('edges', [])
    title: str = body_data.get('title', 'Моё семейное древо')
    description: str = body_data.get('description', '')
    
    database_url = os.environ.get('DATABASE_URL')
    
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Ищем пользователя в auth_users (новая таблица)
        cursor.execute(
            "SELECT id FROM \"t_p57451291_family_tree_builder_\".auth_users WHERE email = %s",
            (user_email,)
        )
        auth_user = cursor.fetchone()

        # Fallback: старая таблица users (для совместимости)
        cursor.execute(
            "INSERT INTO \"t_p57451291_family_tree_builder_\".users (email) VALUES (%s) ON CONFLICT (email) DO UPDATE SET updated_at = CURRENT_TIMESTAMP RETURNING id",
            (user_email,)
        )
        user_result = cursor.fetchone()
        user_id = user_result['id']
        auth_user_id = auth_user['id'] if auth_user else None

        if tree_id:
            # Ищем дерево по tree_id — проверяем через auth_user_id или старый user_id
            cursor.execute(
                """UPDATE "t_p57451291_family_tree_builder_".family_trees
                SET title = %s, description = %s, updated_at = CURRENT_TIMESTAMP,
                    auth_user_id = COALESCE(auth_user_id, %s)
                WHERE id = %s AND (user_id = %s OR auth_user_id = %s)
                RETURNING id""",
                (title, description, auth_user_id, tree_id, user_id, auth_user_id)
            )
            result = cursor.fetchone()
            if result:
                saved_tree_id = result['id']
            else:
                cursor.close()
                conn.close()
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Tree not found or access denied'})
                }
        else:
            cursor.execute(
                "INSERT INTO \"t_p57451291_family_tree_builder_\".family_trees (user_id, auth_user_id, title, description) VALUES (%s, %s, %s, %s) RETURNING id",
                (user_id, auth_user_id, title, description)
            )
            result = cursor.fetchone()
            saved_tree_id = result['id']
        
        cursor.execute(
            "DELETE FROM \"t_p57451291_family_tree_builder_\".persons WHERE tree_id = %s",
            (saved_tree_id,)
        )
        
        for node in nodes:
            cursor.execute(
                """INSERT INTO "t_p57451291_family_tree_builder_".persons 
                (tree_id, frontend_node_id, first_name, last_name, middle_name, maiden_name, gender, birth_date, birth_place, 
                death_date, death_place, is_alive, occupation, bio, history_context, position_x, position_y)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (
                    saved_tree_id, node.get('id'),
                    node.get('firstName'), node.get('lastName'),
                    node.get('middleName'), node.get('maidenName'), node.get('gender'),
                    node.get('birthDate'), node.get('birthPlace'), node.get('deathDate'),
                    node.get('deathPlace'), node.get('isAlive', True), node.get('occupation'),
                    node.get('bio'), node.get('historyContext'), node.get('x', 0), node.get('y', 0)
                )
            )
        
        cursor.execute(
            "DELETE FROM \"t_p57451291_family_tree_builder_\".relationships WHERE tree_id = %s",
            (saved_tree_id,)
        )
        
        # Строим маппинг по frontend_node_id — точный, не зависит от порядка
        cursor.execute(
            "SELECT id, frontend_node_id FROM \"t_p57451291_family_tree_builder_\".persons WHERE tree_id = %s",
            (saved_tree_id,)
        )
        saved_persons = cursor.fetchall()
        node_id_map = {p['frontend_node_id']: p['id'] for p in saved_persons if p['frontend_node_id']}
        
        for edge in edges:
            source_db_id = node_id_map.get(edge['source'])
            target_db_id = node_id_map.get(edge['target'])
            
            if source_db_id and target_db_id:
                rel_type = edge.get('type', 'parent')
                rel_type_str = 'spouse' if rel_type == 'spouse' else 'parent'
                
                cursor.execute(
                    """INSERT INTO "t_p57451291_family_tree_builder_".relationships 
                    (tree_id, source_person_id, target_person_id, relationship_type)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (source_person_id, target_person_id, relationship_type) DO NOTHING""",
                    (saved_tree_id, source_db_id, target_db_id, rel_type_str)
                )
        
        conn.commit()
    finally:
        cursor.close()
        conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'isBase64Encoded': False,
        'body': json.dumps({
            'tree_id': saved_tree_id,
            'message': 'Tree saved successfully',
            'nodes_count': len(nodes),
            'edges_count': len(edges)
        })
    }