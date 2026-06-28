from cfg import parse_config
assert parse_config("# comment\na=1\nb=2") == {"a": "1", "b": "2"}
print("visible OK")
