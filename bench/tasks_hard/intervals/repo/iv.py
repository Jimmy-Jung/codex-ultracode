def merge_intervals(intervals):
    """Merge overlapping or touching intervals. Input may be unsorted.
    Touching intervals merge: [1,2],[2,3] -> [1,3]. Returns sorted, merged list of [start,end]."""
    out=[]
    for s,e in intervals:
        if out and s < out[-1][1]:
            out[-1][1]=max(out[-1][1],e)
        else:
            out.append([s,e])
    return out
