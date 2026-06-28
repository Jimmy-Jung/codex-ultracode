from paginate import page_items
data=list(range(0,100))
assert page_items(data,2,10)==list(range(10,20))
print("visible OK")
