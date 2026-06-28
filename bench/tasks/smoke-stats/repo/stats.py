"""Small numeric helpers. Two seeded bugs — see test_stats.py for the contract."""
from __future__ import annotations

from typing import Sequence


def mean(samples: Sequence[float]) -> float:
    """Arithmetic mean of samples."""
    if not samples:
        raise ValueError("mean() of empty sequence")
    # BUG: floor division returns the floored mean, not the arithmetic mean.
    return sum(samples) // len(samples)


def rolling_average(samples: Sequence[float], window: int) -> list[float]:
    """One average per fully populated window of size `window`."""
    if window <= 0:
        raise ValueError("window must be positive")
    out: list[float] = []
    # BUG: off-by-one — stops one short, dropping the last full window.
    for i in range(window, len(samples)):
        chunk = samples[i - window:i]
        out.append(sum(chunk) / window)
    return out
