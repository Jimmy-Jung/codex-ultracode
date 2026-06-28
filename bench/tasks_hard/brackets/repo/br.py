def is_balanced(s: str) -> bool:
    """True iff brackets are balanced and correctly nested. Types: () [] {} must match.
    Non-bracket chars are ignored. '([])' -> True, '([)]' -> False, '(' -> False."""
    depth=0
    for ch in s:
        if ch=="(": depth+=1
        elif ch==")": depth-=1
        if depth<0: return False
    return depth==0
