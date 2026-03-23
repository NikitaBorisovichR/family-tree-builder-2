'''
Business: Load family tree from database
Args: event - dict with httpMethod, queryStringParameters (tree_id, user_email)
      context - object with request_id
Returns: HTTP response with tree data (nodes, edges, title)
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
    tree_id = params.get('tree_id')
    user_email = params.get('user_email') or event.get('headers', {}).get('X-User-Email')
    
    if not tree_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'tree_id is required'})
        }
    
    database_url = os.environ.get('DATABASE_URL')
    
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    if user_email:
        cursor.execute(
            """SELECT ft.id, ft.title, ft.description, ft.created_at, ft.updated_at
            FROM "t_p57451291_family_tree_builder_".family_trees ft
            JOIN "t_p57451291_family_tree_builder_".users u ON ft.user_id = u.id
            WHERE ft.id = %s AND u.email = %s""",
            (tree_id, user_email)
        )
    else:
        cursor.execute(
            """SELECT id, title, description, created_at, updated_at
            FROM "t_p57451291_family_tree_builder_".family_trees
            WHERE id = %s""",
            (tree_id,)
        )
    
    tree = cursor.fetchone()
    
    if not tree:
        cursor.close()
        conn.close()
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Tree not found or access denied'})
        }
    
    cursor.execute(
        """SELECT id, frontend_node_id, first_name, last_name, middle_name, maiden_name, gender, 
        birth_date, birth_place, death_date, death_place, is_alive, occupation, 
        bio, history_context, position_x, position_y
        FROM "t_p57451291_family_tree_builder_".persons
        WHERE tree_id = %s
        ORDER BY id""",
        (tree_id,)
    )
    persons = cursor.fetchall()
    
    cursor.execute(
        """SELECT r.id, r.relationship_type,
        p_src.frontend_node_id as source_node_id,
        p_tgt.frontend_node_id as target_node_id
        FROM "t_p57451291_family_tree_builder_".relationships r
        JOIN "t_p57451291_family_tree_builder_".persons p_src ON r.source_person_id = p_src.id
        JOIN "t_p57451291_family_tree_builder_".persons p_tgt ON r.target_person_id = p_tgt.id
        WHERE r.tree_id = %s""",
        (tree_id,)
    )
    relationships = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    nodes = []
    for person in persons:
        node_id = person['frontend_node_id'] or str(person['id'])
        nodes.append({
            'id': node_id,
            'x': float(person['position_x']) if person['position_x'] else 0,
            'y': float(person['position_y']) if person['position_y'] else 0,
            'firstName': person['first_name'] or '',
            'lastName': person['last_name'] or '',
            'middleName': person['middle_name'] or '',
            'maidenName': person['maiden_name'] or '',
            'gender': person['gender'] or 'male',
            'birthDate': person['birth_date'] or '',
            'birthPlace': person['birth_place'] or '',
            'deathDate': person['death_date'] or '',
            'deathPlace': person['death_place'] or '',
            'isAlive': person['is_alive'] if person['is_alive'] is not None else True,
            'occupation': person['occupation'] or '',
            'relation': '',
            'bio': person['bio'] or '',
            'historyContext': person['history_context'] or ''
        })
    
    edges = []
    for rel in relationships:
        if not rel['source_node_id'] or not rel['target_node_id']:
            continue
        edge_type = 'spouse' if rel['relationship_type'] == 'spouse' else None
        edges.append({
            'id': f"e-{rel['id']}",
            'source': rel['source_node_id'],
            'target': rel['target_node_id'],
            **(({'type': edge_type}) if edge_type else {})
        })
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'isBase64Encoded': False,
        'body': json.dumps({
            'tree_id': tree['id'],
            'title': tree['title'],
            'description': tree['description'],
            'nodes': nodes,
            'edges': edges,
            'created_at': tree['created_at'].isoformat() if tree['created_at'] else None,
            'updated_at': tree['updated_at'].isoformat() if tree['updated_at'] else None
        })
    }