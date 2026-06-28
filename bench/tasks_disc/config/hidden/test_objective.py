from cfg import parse_config
src="# comment\n\nhost = localhost \n url=http://x/?a=1&b=2\nempty=\n"
got=parse_config(src)
assert got=={"host":"localhost","url":"http://x/?a=1&b=2","empty":""}, got
print("objective OK")
