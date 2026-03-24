import json
import base64
import os
import uuid
import boto3


def handler(event: dict, context) -> dict:
    """Загрузка фотографии члена семьи в S3 и возврат CDN-ссылки."""
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    try:
        body = json.loads(event.get('body', '{}'))
        image_b64 = body.get('image')
        content_type = body.get('contentType', 'image/jpeg')
        node_id = body.get('nodeId', 'unknown')

        if not image_b64:
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'image required'})}

        image_data = base64.b64decode(image_b64)

        ext = 'jpg'
        if 'png' in content_type:
            ext = 'png'
        elif 'webp' in content_type:
            ext = 'webp'

        key = f'persons/{node_id}/{uuid.uuid4().hex}.{ext}'

        s3 = boto3.client(
            's3',
            endpoint_url='https://bucket.poehali.dev',
            aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
        )
        s3.put_object(Bucket='files', Key=key, Body=image_data, ContentType=content_type)

        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

        return {
            'statusCode': 200,
            'headers': cors,
            'body': json.dumps({'url': cdn_url})
        }

    except Exception as e:
        return {'statusCode': 500, 'headers': cors, 'body': json.dumps({'error': str(e)})}
