def paginate(items, page, per_page):
    start = page * per_page
    end = start + per_page
    return items[start:end]

def total_pages(count, per_page):
    return count // per_page
