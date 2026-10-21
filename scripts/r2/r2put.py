"""PUT one object to R2 with SigV4. Usage: r2put.py <key> <file> <content-type>"""
import datetime, hashlib, hmac, os, sys, urllib.request
from urllib.parse import quote, urlparse

key, path, ctype = sys.argv[1:4]
body = open(path, 'rb').read()
endpoint, bucket = os.environ['R2_ENDPOINT'], os.environ['R2_BUCKET']
ak, sk = os.environ['R2_ACCESS_KEY_ID'], os.environ['R2_SECRET_ACCESS_KEY']
now = datetime.datetime.now(datetime.timezone.utc)
amz, day = now.strftime('%Y%m%dT%H%M%SZ'), now.strftime('%Y%m%d')
h = {'content-type': ctype, 'host': urlparse(endpoint).netloc, 'x-amz-content-sha256': hashlib.sha256(body).hexdigest(), 'x-amz-date': amz}
signed = ';'.join(sorted(h))
uri = '/' + bucket + '/' + quote(key)
canon = '\n'.join(['PUT', uri, '', ''.join(f'{k}:{h[k]}\n' for k in sorted(h)), signed, h['x-amz-content-sha256']])
scope = f'{day}/auto/s3/aws4_request'
sts = '\n'.join(['AWS4-HMAC-SHA256', amz, scope, hashlib.sha256(canon.encode()).hexdigest()])
k = ('AWS4' + sk).encode()
for p in (day, 'auto', 's3', 'aws4_request'):
    k = hmac.new(k, p.encode(), hashlib.sha256).digest()
h['authorization'] = f'AWS4-HMAC-SHA256 Credential={ak}/{scope}, SignedHeaders={signed}, Signature={hmac.new(k, sts.encode(), hashlib.sha256).hexdigest()}'
req = urllib.request.Request(endpoint + uri, data=body, method='PUT', headers={a: b for a, b in h.items() if a != 'host'})
with urllib.request.urlopen(req, timeout=60) as r:
    print(key, r.status, len(body), 'bytes')
