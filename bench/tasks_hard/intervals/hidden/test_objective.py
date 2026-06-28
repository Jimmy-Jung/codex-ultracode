from iv import merge_intervals
assert merge_intervals([[1,3],[2,4]])==[[1,4]]
assert merge_intervals([[1,2],[2,3]])==[[1,3]], "touching must merge"
assert merge_intervals([[3,4],[1,2]])==[[1,2],[3,4]], "unsorted input"
assert merge_intervals([[1,10],[2,3]])==[[1,10]], "nested"
assert merge_intervals([[5,6]])==[[5,6]]
print("objective OK")
