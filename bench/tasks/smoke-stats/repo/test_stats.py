"""Zero-dependency self-checking test. Exit 0 = all pass."""
from stats import mean, rolling_average


def main() -> None:
    assert mean([1, 2]) == 1.5, "mean must be arithmetic, not floored"
    assert mean([1, 2, 3, 4]) == 2.5

    # samples=[1,2,3], window=2 -> [1.5, 2.5] (N-W+1 = 2 windows)
    assert rolling_average([1, 2, 3], 2) == [1.5, 2.5], "must include last full window"
    assert rolling_average([2, 4, 6, 8], 2) == [3.0, 5.0, 7.0]

    try:
        rolling_average([1, 2, 3], 0)
    except ValueError:
        pass
    else:
        raise AssertionError("window<=0 must raise ValueError")

    print("ALL PASS")


if __name__ == "__main__":
    main()
