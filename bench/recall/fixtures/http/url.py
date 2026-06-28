def build_url(base, params):
    q = "&".join(f"{k}={v}" for k, v in params.items())
    return base + "?" + q

def join_path(base, path):
    return base + "/" + path
