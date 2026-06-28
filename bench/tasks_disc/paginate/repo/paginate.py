def page_items(items, page, per_page):
    """Return the slice of `items` for 1-indexed `page` with `per_page` items each."""
    start = page * per_page
    return items[start:start + per_page]
