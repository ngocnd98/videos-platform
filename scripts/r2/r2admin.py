"""Minimal SigV4 client for R2 bucket sub-resources (cors, lifecycle). Usage: r2admin.py GET|PUT <subresource> [body.xml]"""
import base64, datetime, hashlib, hmac, os, sys, urllib.request, urllib.error
from urllib.parse import urlparse

method, sub = sys.argv[1], sys.argv[2]
body = open(sys.argv[3], 'rb').read() if len(sys.argv) > 3 else b''
endpoint, bucket = os.environ['R2_ENDPOINT'], os.environ['R2_BUCKET']
ak, sk = os.environ['R2_ACCESS_KEY_ID'], os.environ['R2_SECRET_ACCESS_KEY']
host = urlparse(endpoint).netloc
now = datetime.datetime.now(datetime.timezone.utc)
amz_date, day = now.strftime('%Y%m%dT%H%M%SZ'), now.strftime('%Y%m%d')
payload = hashlib.sha256(body).hexdigest()
headers = {'host': host, 'x-amz-content-sha256': payload, 'x-amz-date': amz_date}
if body:
    headers['content-md5'] = base64.b64encode(hashlib.md5(body).digest()).decode()
    headers['content-type'] = 'application/xml'
signed = ';'.join(sorted(headers))
canonical = '\n'.join([method, f'/{bucket}', f'{sub}=', ''.join(f'{k}:{headers[k]}\n' for k in sorted(headers)), signed, payload])
scope = f'{day}/auto/s3/aws4_request'
to_sign = '\n'.join(['AWS4-HMAC-SHA256', amz_date, scope, hashlib.sha256(canonical.encode()).hexdigest()])
key = ('AWS4' + sk).encode()
for part in (day, 'auto', 's3', 'aws4_request'):
    key = hmac.new(key, part.encode(), hashlib.sha256).digest()
sig = hmac.new(key, to_sign.encode(), hashlib.sha256).hexdigest()
headers['authorization'] = f'AWS4-HMAC-SHA256 Credential={ak}/{scope}, SignedHeaders={signed}, Signature={sig}'
req = urllib.request.Request(f'{endpoint}/{bucket}?{sub}=', data=body or None, method=method, headers={k: v for k, v in headers.items() if k != 'host'})
try:
    with urllib.request.urlopen(req, timeout=20) as r:
        print(r.status, r.read().decode()[:1500])
except urllib.error.HTTPError as e:
    print(e.code, e.read().decode()[:600])
