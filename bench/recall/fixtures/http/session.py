import time

def valid_token(stored, given):
    return stored == given

def is_active(session):
    return session.get("expires_at", 0) > time.time() or session.get("remember")
