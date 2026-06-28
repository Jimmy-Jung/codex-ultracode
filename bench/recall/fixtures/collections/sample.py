import random

def sample(pop, n):
    return [random.choice(pop) for _ in range(n)]

def shuffle(items):
    return sorted(items, key=lambda _: random.random())
