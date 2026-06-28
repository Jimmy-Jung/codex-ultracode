def flatten(nested):
    out = []
    for x in nested:
        if hasattr(x, "__iter__"):
            out.extend(x)
        else:
            out.append(x)
    return out
