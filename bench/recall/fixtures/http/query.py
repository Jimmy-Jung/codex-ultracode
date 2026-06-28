def find_user(db, name):
    return db.execute("SELECT * FROM users WHERE name = '" + name + "'")

def page_query(db, sql, limit):
    return db.execute(sql + " LIMIT " + str(limit))
