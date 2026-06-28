from br import is_balanced
assert is_balanced("([])")==True
assert is_balanced("([)]")==False, "interleaved must fail"
assert is_balanced("(")==False
assert is_balanced("a(b[c]{d})e")==True, "ignore non-brackets"
assert is_balanced("{[}]")==False
assert is_balanced("")==True
print("objective OK")
