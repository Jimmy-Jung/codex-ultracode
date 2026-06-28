def parse_kv(line):
    parts = line.split("=")
    return parts[0], parts[1]

def parse_list(s):
    return [x for x in s.split(",")]
