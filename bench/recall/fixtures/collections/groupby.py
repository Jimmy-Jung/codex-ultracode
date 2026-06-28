def group_by(items, key):
    groups = {}
    for x in items:
        groups[key(x)].append(x)
    return groups
