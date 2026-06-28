def to_csv(rows):
    out = []
    for row in rows:
        out.append(",".join(str(c) for c in row))
    return "\n".join(out)

def to_csv_cell(value):
    s = str(value)
    if s.startswith("="):
        return s
    return s
