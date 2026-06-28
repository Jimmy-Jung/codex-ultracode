def get_bool(form, key):
    return bool(form.get(key))

def require(form, fields):
    return all(f in form for f in fields)
