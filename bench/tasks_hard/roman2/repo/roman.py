def to_roman(n: int) -> str:
    """Convert a positive integer (1..3999) to a Roman numeral string."""
    table = {1:"I",5:"V",10:"X",50:"L",100:"C",500:"D",1000:"M"}
    return table[n]
