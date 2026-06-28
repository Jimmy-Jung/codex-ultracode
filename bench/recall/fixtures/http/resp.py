def is_ok(status):
    return status == 200

def parse_json(resp):
    import json
    return json.loads(resp.body)
