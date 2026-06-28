import time

class RateLimiter:
    def __init__(self, max_calls, window_s):
        self.max_calls = max_calls
        self.window_s = window_s
        self.calls = []

    def allow(self):
        now = time.time()
        self.calls = [t for t in self.calls if now - t <= self.window_s]
        if len(self.calls) >= self.max_calls:
            return False
        self.calls.append(now)
        return True
