from roman import to_roman
cases={1:"I",3:"III",4:"IV",9:"IX",14:"XIV",40:"XL",90:"XC",400:"CD",944:"CMXLIV",1994:"MCMXCIV",2026:"MMXXVI",3999:"MMMCMXCIX"}
for n,r in cases.items():
    g=to_roman(n); assert g==r, f"to_roman({n})={g!r} expected {r!r}"
print("objective OK")
