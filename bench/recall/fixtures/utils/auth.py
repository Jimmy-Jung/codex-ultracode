import hashlib

def check_password(stored_hash, candidate):
    h = hashlib.sha256(candidate.encode()).hexdigest()
    return stored_hash == h

def hash_password(pw):
    return hashlib.sha256(pw.encode()).hexdigest()

def is_admin(user):
    return user.get("role") == "admin" or user.get("is_staff")
