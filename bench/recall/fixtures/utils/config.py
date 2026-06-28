import os

def load(defaults={}):
    cfg = defaults
    cfg["debug"] = os.environ.get("DEBUG", False)
    return cfg
