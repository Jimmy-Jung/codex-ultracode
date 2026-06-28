def top_n(items, n, key):
    return sorted(items, key=key, reverse=True)[:n]
