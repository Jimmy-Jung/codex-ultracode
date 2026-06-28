def dedup(items):
    out = []
    for x in items:
        if x not in out:
            out.append(x)
    return out

def unique_keys(pairs):
    return dict(pairs)
