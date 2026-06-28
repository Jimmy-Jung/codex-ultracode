from n2w import number_to_words
c={0:"zero",4:"four",11:"eleven",15:"fifteen",20:"twenty",21:"twenty one",
   40:"forty",99:"ninety nine",100:"one hundred",256:"two hundred fifty six",
   305:"three hundred five",999:"nine hundred ninety nine"}
for n,w in c.items():
    g=number_to_words(n); assert g==w,f"number_to_words({n})={g!r}!={w!r}"
print("objective OK")
