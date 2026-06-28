def chunk(seq, size):
    out = []
    for i in range(0, len(seq), size):
        out.append(seq[i:i+size])
    return out

def take(seq, n):
    return seq[:n]
