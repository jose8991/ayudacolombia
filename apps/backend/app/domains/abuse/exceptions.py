class RateLimitExceededError(Exception):
    def __init__(self, retry_after: int = 60) -> None:
        self.retry_after = retry_after
        super().__init__("rate limit exceeded")
