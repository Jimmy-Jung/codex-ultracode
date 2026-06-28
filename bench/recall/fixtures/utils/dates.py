from datetime import datetime

def is_expired(expiry_iso):
    return datetime.fromisoformat(expiry_iso) < datetime.now()

def days_between(a_iso, b_iso):
    a = datetime.fromisoformat(a_iso)
    b = datetime.fromisoformat(b_iso)
    return (b - a).days
