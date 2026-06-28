def get_header(headers, name):
    return headers.get(name)

def parse_cookie(raw):
    out = {}
    for part in raw.split(";"):
        k, v = part.split("=")
        out[k.strip()] = v
    return out
