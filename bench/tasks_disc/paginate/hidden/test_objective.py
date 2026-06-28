from paginate import page_items
data=list(range(0,25))
assert page_items(data,1,10)==list(range(0,10)),"page1"
assert page_items(data,2,10)==list(range(10,20)),"page2"
assert page_items(data,3,10)==list(range(20,25)),"last partial"
assert page_items(data,4,10)==[],"out of range"
print("objective OK")
