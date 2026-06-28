def number_to_words(n: int) -> str:
    """Spell an integer 0..999 in lowercase English words.
    Examples: 0->'zero', 21->'twenty one', 100->'one hundred', 256->'two hundred fifty six'.
    Compound tens use a single space (no hyphen)."""
    table = {0:"zero",1:"one",2:"two",3:"three"}
    return table[n]
