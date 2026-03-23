"""
Business: Универсальная функция авторизации (регистрация, вход, проверка сессии, OAuth)
Args: event с httpMethod и path для определения действия
Returns: HTTP response с session_token или информацией о пользователе
"""

import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Dict, Any
import psycopg2
from urllib.parse import urlencode
import urllib.request

def hash_password(password: str) -> str:
    """Хеширование пароля с солью"""
    salt = secrets.token_hex(16)
    pwdhash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}${pwdhash.hex()}"

def verify_password(password: str, password_hash: str) -> bool:
    """Проверка пароля"""
    try:
        salt, pwdhash = password_hash.split('$')
        pwdhash_check = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
        return pwdhash == pwdhash_check.hex()
    except:
        return False

def generate_session_token() -> str:
    """Генерация сессионного токена"""
    return secrets.token_urlsafe(64)

def handle_register(body: Dict, database_url: str) -> Dict[str, Any]:
    """Регистрация по email"""
    email = body.get('email', '').strip().lower()
    password = body.get('password', '')
    display_name = body.get('display_name', '')
    
    if not email or not password:
        return {'statusCode': 400, 'body': json.dumps({'error': 'Email and password are required'})}
    
    if len(password) < 6:
        return {'statusCode': 400, 'body': json.dumps({'error': 'Password must be at least 6 characters'})}
    
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()
    
    cur.execute('SELECT id FROM auth_users WHERE email = %s', (email,))
    if cur.fetchone():
        cur.close()
        conn.close()
        return {'statusCode': 409, 'body': json.dumps({'error': 'User with this email already exists'})}
    
    password_hash = hash_password(password)
    cur.execute(
        'INSERT INTO auth_users (email, password_hash, display_name, email_verified) VALUES (%s, %s, %s, %s) RETURNING id',
        (email, password_hash, display_name or email.split('@')[0], False)
    )
    user_id = cur.fetchone()[0]
    
    session_token = generate_session_token()
    expires_at = datetime.utcnow() + timedelta(days=30)
    cur.execute(
        'INSERT INTO auth_sessions (user_id, session_token, expires_at) VALUES (%s, %s, %s)',
        (user_id, session_token, expires_at)
    )
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 201,
        'body': json.dumps({
            'user_id': user_id,
            'email': email,
            'display_name': display_name or email.split('@')[0],
            'session_token': session_token,
            'expires_at': expires_at.isoformat()
        })
    }

def handle_login(body: Dict, database_url: str) -> Dict[str, Any]:
    """Вход по email"""
    email = body.get('email', '').strip().lower()
    password = body.get('password', '')
    
    if not email or not password:
        return {'statusCode': 400, 'body': json.dumps({'error': 'Email and password are required'})}
    
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()
    
    cur.execute('SELECT id, password_hash, display_name, avatar_url FROM auth_users WHERE email = %s', (email,))
    user_data = cur.fetchone()
    
    if not user_data or not verify_password(password, user_data[1]):
        cur.close()
        conn.close()
        return {'statusCode': 401, 'body': json.dumps({'error': 'Invalid email or password'})}
    
    user_id, _, display_name, avatar_url = user_data
    
    session_token = generate_session_token()
    expires_at = datetime.utcnow() + timedelta(days=30)
    cur.execute(
        'INSERT INTO auth_sessions (user_id, session_token, expires_at) VALUES (%s, %s, %s)',
        (user_id, session_token, expires_at)
    )
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'user_id': user_id,
            'email': email,
            'display_name': display_name,
            'avatar_url': avatar_url,
            'session_token': session_token,
            'expires_at': expires_at.isoformat()
        })
    }

def handle_verify(session_token: str, database_url: str) -> Dict[str, Any]:
    """Проверка сессии"""
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()
    
    cur.execute('''
        SELECT s.user_id, s.expires_at, u.email, u.display_name, u.avatar_url
        FROM auth_sessions s
        JOIN auth_users u ON s.user_id = u.id
        WHERE s.session_token = %s
    ''', (session_token,))
    
    session_data = cur.fetchone()
    cur.close()
    conn.close()
    
    if not session_data:
        return {'statusCode': 401, 'body': json.dumps({'error': 'Invalid session token'})}
    
    user_id, expires_at, email, display_name, avatar_url = session_data
    
    if expires_at < datetime.utcnow():
        return {'statusCode': 401, 'body': json.dumps({'error': 'Session expired'})}
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'user_id': user_id,
            'email': email,
            'display_name': display_name,
            'avatar_url': avatar_url,
            'expires_at': expires_at.isoformat()
        })
    }

def handle_oauth_yandex(query_params: Dict, context: Any, database_url: str) -> Dict[str, Any]:
    """OAuth через Яндекс"""
    client_id = os.environ.get('YANDEX_CLIENT_ID')
    client_secret = os.environ.get('YANDEX_CLIENT_SECRET')
    
    if not client_id or not client_secret:
        return {'statusCode': 500, 'body': json.dumps({'error': 'OAuth not configured'})}
    
    code = query_params.get('code')
    
    if not code:
        redirect_uri = f"https://functions.poehali.dev/{context.function_name}?provider=yandex"
        auth_url = f"https://oauth.yandex.ru/authorize?{urlencode({'response_type': 'code', 'client_id': client_id, 'redirect_uri': redirect_uri})}"
        return {'statusCode': 302, 'headers': {'Location': auth_url}, 'body': ''}
    
    redirect_uri = f"https://functions.poehali.dev/{context.function_name}?provider=yandex"
    token_data = urlencode({'grant_type': 'authorization_code', 'code': code, 'client_id': client_id, 'client_secret': client_secret}).encode()
    
    req = urllib.request.Request('https://oauth.yandex.ru/token', data=token_data, method='POST')
    req.add_header('Content-Type', 'application/x-www-form-urlencoded')
    
    with urllib.request.urlopen(req) as response:
        token_response = json.loads(response.read().decode())
    
    access_token = token_response.get('access_token')
    if not access_token:
        return {'statusCode': 400, 'body': json.dumps({'error': 'Failed to get access token'})}
    
    req = urllib.request.Request('https://login.yandex.ru/info?format=json')
    req.add_header('Authorization', f'OAuth {access_token}')
    
    with urllib.request.urlopen(req) as response:
        user_info = json.loads(response.read().decode())
    
    yandex_id = user_info.get('id')
    email = user_info.get('default_email')
    display_name = user_info.get('display_name') or user_info.get('real_name') or email.split('@')[0]
    avatar_url = f"https://avatars.yandex.net/get-yapic/{user_info.get('default_avatar_id')}/islands-200" if user_info.get('default_avatar_id') else None
    
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()
    
    cur.execute('SELECT user_id FROM auth_providers WHERE provider = %s AND provider_user_id = %s', ('yandex', yandex_id))
    provider_data = cur.fetchone()
    
    if provider_data:
        user_id = provider_data[0]
    else:
        cur.execute('SELECT id FROM auth_users WHERE email = %s', (email,))
        existing_user = cur.fetchone()
        
        if existing_user:
            user_id = existing_user[0]
        else:
            cur.execute(
                'INSERT INTO auth_users (email, display_name, avatar_url, email_verified) VALUES (%s, %s, %s, %s) RETURNING id',
                (email, display_name, avatar_url, True)
            )
            user_id = cur.fetchone()[0]
        
        cur.execute(
            'INSERT INTO auth_providers (user_id, provider, provider_user_id, provider_email, provider_data) VALUES (%s, %s, %s, %s, %s)',
            (user_id, 'yandex', yandex_id, email, json.dumps(user_info))
        )
    
    session_token = generate_session_token()
    expires_at = datetime.utcnow() + timedelta(days=30)
    cur.execute(
        'INSERT INTO auth_sessions (user_id, session_token, expires_at) VALUES (%s, %s, %s)',
        (user_id, session_token, expires_at)
    )
    
    conn.commit()
    cur.close()
    conn.close()
    
    frontend_url = f"{os.environ.get('FRONTEND_URL', 'http://localhost:5173')}/auth/callback?session_token={session_token}"
    return {'statusCode': 302, 'headers': {'Location': frontend_url}, 'body': ''}

def handle_oauth_vk(query_params: Dict, context: Any, database_url: str) -> Dict[str, Any]:
    """OAuth через VK"""
    client_id = os.environ.get('VK_CLIENT_ID')
    client_secret = os.environ.get('VK_CLIENT_SECRET')
    
    if not client_id or not client_secret:
        return {'statusCode': 500, 'body': json.dumps({'error': 'OAuth not configured'})}
    
    code = query_params.get('code')
    
    if not code:
        redirect_uri = f"https://functions.poehali.dev/{context.function_name}?provider=vk"
        auth_url = f"https://oauth.vk.com/authorize?{urlencode({'client_id': client_id, 'redirect_uri': redirect_uri, 'display': 'page', 'scope': 'email', 'response_type': 'code', 'v': '5.131'})}"
        return {'statusCode': 302, 'headers': {'Location': auth_url}, 'body': ''}
    
    redirect_uri = f"https://functions.poehali.dev/{context.function_name}?provider=vk"
    token_url = f"https://oauth.vk.com/access_token?{urlencode({'client_id': client_id, 'client_secret': client_secret, 'redirect_uri': redirect_uri, 'code': code})}"
    
    with urllib.request.urlopen(token_url) as response:
        token_response = json.loads(response.read().decode())
    
    access_token = token_response.get('access_token')
    vk_user_id = token_response.get('user_id')
    email = token_response.get('email')
    
    if not access_token or not vk_user_id:
        return {'statusCode': 400, 'body': json.dumps({'error': 'Failed to get access token'})}
    
    api_url = f"https://api.vk.com/method/users.get?{urlencode({'user_ids': vk_user_id, 'fields': 'photo_200', 'access_token': access_token, 'v': '5.131'})}"
    
    with urllib.request.urlopen(api_url) as response:
        api_response = json.loads(response.read().decode())
    
    if 'response' not in api_response or len(api_response['response']) == 0:
        return {'statusCode': 400, 'body': json.dumps({'error': 'Failed to get user info'})}
    
    user_info = api_response['response'][0]
    display_name = f"{user_info.get('first_name', '')} {user_info.get('last_name', '')}".strip()
    avatar_url = user_info.get('photo_200')
    
    if not email:
        email = f"vk{vk_user_id}@vk.com"
    
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()
    
    cur.execute('SELECT user_id FROM auth_providers WHERE provider = %s AND provider_user_id = %s', ('vk', str(vk_user_id)))
    provider_data = cur.fetchone()
    
    if provider_data:
        user_id = provider_data[0]
    else:
        cur.execute('SELECT id FROM auth_users WHERE email = %s', (email,))
        existing_user = cur.fetchone()
        
        if existing_user:
            user_id = existing_user[0]
        else:
            cur.execute(
                'INSERT INTO auth_users (email, display_name, avatar_url, email_verified) VALUES (%s, %s, %s, %s) RETURNING id',
                (email, display_name, avatar_url, True)
            )
            user_id = cur.fetchone()[0]
        
        cur.execute(
            'INSERT INTO auth_providers (user_id, provider, provider_user_id, provider_email, provider_data) VALUES (%s, %s, %s, %s, %s)',
            (user_id, 'vk', str(vk_user_id), email, json.dumps(user_info))
        )
    
    session_token = generate_session_token()
    expires_at = datetime.utcnow() + timedelta(days=30)
    cur.execute(
        'INSERT INTO auth_sessions (user_id, session_token, expires_at) VALUES (%s, %s, %s)',
        (user_id, session_token, expires_at)
    )
    
    conn.commit()
    cur.close()
    conn.close()
    
    frontend_url = f"{os.environ.get('FRONTEND_URL', 'http://localhost:5173')}/auth/callback?session_token={session_token}"
    return {'statusCode': 302, 'headers': {'Location': frontend_url}, 'body': ''}

def handle_update_profile(body: Dict, session_token: str, database_url: str) -> Dict[str, Any]:
    """Обновление имени пользователя"""
    display_name = body.get('display_name', '').strip()
    if not display_name:
        return {'statusCode': 400, 'body': json.dumps({'error': 'display_name is required'})}

    conn = psycopg2.connect(database_url)
    cur = conn.cursor()

    cur.execute('''
        SELECT s.user_id FROM auth_sessions s
        WHERE s.session_token = %s AND s.expires_at > %s
    ''', (session_token, datetime.utcnow()))
    row = cur.fetchone()
    if not row:
        cur.close(); conn.close()
        return {'statusCode': 401, 'body': json.dumps({'error': 'Invalid or expired session'})}

    user_id = row[0]
    cur.execute(
        'UPDATE auth_users SET display_name = %s, updated_at = %s WHERE id = %s',
        (display_name, datetime.utcnow(), user_id)
    )
    conn.commit()
    cur.execute('SELECT email, display_name, avatar_url FROM auth_users WHERE id = %s', (user_id,))
    u = cur.fetchone()
    cur.close(); conn.close()

    return {
        'statusCode': 200,
        'body': json.dumps({'email': u[0], 'display_name': u[1], 'avatar_url': u[2]})
    }


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    try:
        database_url = os.environ.get('DATABASE_URL')
        if not database_url:
            return {
                'statusCode': 500,
                'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Database not configured'})
            }
        
        query_params = event.get('queryStringParameters', {}) or {}
        action = query_params.get('action', '')
        provider = query_params.get('provider', '')
        
        # OAuth providers
        if provider == 'yandex':
            result = handle_oauth_yandex(query_params, context, database_url)
        elif provider == 'vk':
            result = handle_oauth_vk(query_params, context, database_url)
        # Email auth
        elif action == 'register' and method == 'POST':
            body = json.loads(event.get('body', '{}'))
            result = handle_register(body, database_url)
        elif action == 'login' and method == 'POST':
            body = json.loads(event.get('body', '{}'))
            result = handle_login(body, database_url)
        elif action == 'verify' and method == 'GET':
            headers = event.get('headers', {})
            session_token = headers.get('X-Session-Token') or headers.get('x-session-token')
            if not session_token:
                result = {'statusCode': 401, 'body': json.dumps({'error': 'Session token required'})}
            else:
                result = handle_verify(session_token, database_url)
        elif action == 'update_profile' and method == 'POST':
            headers = event.get('headers', {})
            session_token = headers.get('X-Session-Token') or headers.get('x-session-token')
            if not session_token:
                result = {'statusCode': 401, 'body': json.dumps({'error': 'Session token required'})}
            else:
                body = json.loads(event.get('body', '{}'))
                result = handle_update_profile(body, session_token, database_url)
        else:
            result = {'statusCode': 400, 'body': json.dumps({'error': 'Invalid action or method'})}
        
        if 'headers' not in result:
            result['headers'] = {}
        result['headers']['Access-Control-Allow-Origin'] = '*'
        result['headers']['Content-Type'] = 'application/json'
        
        return result
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'Server error: {str(e)}'})
        }