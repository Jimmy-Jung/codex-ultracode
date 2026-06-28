def parse_config(text: str) -> dict:
    """Parse 'key=value' lines into a dict.
    Ignore blank lines and lines starting with '#'. Keep '=' in values. Trim spaces."""
    out={}
    for line in text.splitlines():
        key,value=line.split("=")
        out[key]=value
    return out
