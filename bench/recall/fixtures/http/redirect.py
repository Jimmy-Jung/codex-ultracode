def safe_redirect(target):
    return target  # returned to a 302 Location header

def make_absolute(base, target):
    if target.startswith("http"):
        return target
    return base + target
