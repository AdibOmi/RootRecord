# Python — Q&A Bank

Legend: 🟢 Beginner · 🟡 Intermediate · 🔴 Advanced

## Definitions & concepts

**Q:** 🟢 What are Python's main built-in types?

**A:** `int`, `float`, `bool`, `str`, `bytes`, `list`, `tuple`, `dict`, `set`, `frozenset`, `None`. Lists/dicts/sets are mutable; numbers/strings/tuples/bytes are immutable.

**Q:** 🟢 Mutable vs immutable?

**A:** Mutable objects can change in place (lists, dicts); immutable ones can't (strings, tuples). Two names pointing to one mutable object see each other's changes.

**Q:** 🟢 List vs tuple?

**A:** Lists are mutable and for homogeneous sequences; tuples are immutable, hashable (usable as dict keys) and often used for fixed records — services return `(user, tokens)` (`auth_service.py:43`).

**Q:** 🟢 What is `None`?

**A:** The singleton representing absence of a value; compare with `is None` (`deps.py:30`).

**Q:** 🟢 `==` vs `is`?

**A:** `==` compares values (`__eq__`); `is` compares identity (same object). Use `is` for `None`.

**Q:** 🟢 What are f-strings?

**A:** Formatted string literals `f"P-{n:05d}"` with inline expressions and format specs (`patient_service.py:88`).

**Q:** 🟢 What does slicing `s[:n]` do?

**A:** Returns a new sequence from the start up to index `n` (exclusive); used to cap lengths (`prescription_service.py:78`).

**Q:** 🟢 What is a list comprehension?

**A:** `[expr for x in items if cond]` — builds a list concisely (`config.py:48`).

**Q:** 🟢 What is a dict comprehension?

**A:** `{k: v for k, v in pairs}` (`prescription_service.py:104`).

**Q:** 🟢 What is unpacking?

**A:** Assigning sequence items to names: `user, tokens = authenticate(...)` (`auth.py:47`); `for patient, count, last, nxt in rows` (`patients.py:30`).

**Q:** 🟢 What are `*args` and `**kwargs`?

**A:** Collect extra positional args into a tuple and keyword args into a dict: `require_roles(*roles)` (`deps.py:38`), `_make(role, **kwargs)` (`conftest.py:78`).

**Q:** 🟢 What does `**d` do in a call?

**A:** Unpacks a dict into keyword arguments: `PatientListItem(**out.model_dump(), visit_count=…)` (`patients.py:25`).

**Q:** 🟢 What are keyword-only arguments?

**A:** Parameters after a bare `*` must be passed by name: `def list_users(db, params, *, q=None, …)` (`user_service.py:21-28`).

**Q:** 🟢 What is `if __name__ == "__main__":` for?

**A:** Runs code only when the file is executed directly, not when imported (`cli.py:32-33`).

**Q:** 🟢 Module vs package?

**A:** A module is a `.py` file; a package is a directory of modules (usually with `__init__.py`) importable as `app.services`.

**Q:** 🟢 What does `python -m app.cli` do?

**A:** Runs the module `app.cli` as a script with the current directory on `sys.path` (`entrypoint.sh:4`).

**Q:** 🟢 What is a virtual environment?

**A:** An isolated Python installation per project (`python -m venv .venv`) so dependencies don't conflict; ignored by git (`.gitignore:5`).

**Q:** 🟢 What is `pip`?

**A:** Python's package installer; `pip install -r requirements.txt` installs listed packages (`Dockerfile:10`).

**Q:** 🟢 What are truthy/falsy values in Python?

**A:** Falsy: `None`, `False`, `0`, `0.0`, `''`, `[]`, `{}`, `set()`, `range(0)`; everything else truthy.

**Q:** 🟢 What does `or` return?

**A:** The first truthy operand or the last one: `db.scalar(...) or 0` turns `None` into `0` (`user_service.py:38`).

**Q:** 🟢 What does `str.strip()` do?

**A:** Removes leading/trailing whitespace (or given characters: `.strip("-")`, `pdf_service.py:26`).

**Q:** 🟢 What is `str.removeprefix`?

**A:** Removes a prefix if present (3.9+): `msg.removeprefix("Value error, ")` (`errors.py:84`).

**Q:** 🟡 What are type hints?

**A:** Annotations like `def f(x: int) -> str`; ignored by the interpreter but used by type checkers and by Pydantic/FastAPI/SQLAlchemy at runtime.

**Q:** 🟡 What does `str | None` mean?

**A:** A union type (3.10+): either `str` or `None` — equivalent to `Optional[str]`.

**Q:** 🟡 What is `Literal`?

**A:** A type of exact values: `Literal["access", "refresh"]` (`security.py:14`).

**Q:** 🟡 What is `Annotated`?

**A:** Attaches metadata to a type: `Annotated[str, AfterValidator(normalize_bd_phone)]` (`validators.py:23`), `Annotated[Session, Depends(get_db)]` (`deps.py:18`).

**Q:** 🟡 What is a `TypeVar`/`Generic`?

**A:** Generic programming: `T = TypeVar("T")`, `class Page(BaseModel, Generic[T])` (`schemas/common.py:6, 13`). Python 3.12 also supports `class Page[T]:` syntax.

**Q:** 🟡 What is `Self`?

**A:** A type meaning "an instance of the current class" (3.11+), used as a validator's return type (`schemas/prescription.py:93`).

**Q:** 🟡 What is a decorator?

**A:** A callable that wraps a function/class: `@dec def f` = `f = dec(f)`. Examples: `@lru_cache`, `@dataclass`, `@router.get(...)` (`config.py:58`, `auth_service.py:26`).

**Q:** 🟡 How does a decorator with arguments work?

**A:** It's a factory: `@router.get("/x")` calls `router.get("/x")`, which returns the actual decorator.

**Q:** 🟡 Why use `functools.wraps` in decorators?

**A:** Copies the wrapped function's name, docstring and signature metadata to the wrapper (important for frameworks that inspect signatures, like FastAPI).

**Q:** 🟡 What does `@lru_cache` do?

**A:** Memoises a function's results by arguments; `get_settings()` is computed once (`config.py:58-60`).

**Q:** 🟡 What does `@property` do?

**A:** Turns a method into a computed attribute: `params.offset` (`schemas/common.py:31-33`).

**Q:** 🟡 `@staticmethod` vs `@classmethod`?

**A:** Static methods get no implicit argument; class methods get the class (`cls`). Pydantic field validators are classmethods (`config.py:45`).

**Q:** 🟡 What is a dataclass?

**A:** `@dataclass` generates `__init__`, `__repr__`, `__eq__` from annotated fields — `TokenPair` (`auth_service.py:26-32`).

**Q:** 🟡 What is a closure in Python?

**A:** An inner function capturing variables from the enclosing scope; `require_roles` returns `checker` remembering `roles` (`deps.py:38-46`).

**Q:** 🟡 What is `nonlocal`?

**A:** Declares that an inner function assigns to a variable of the enclosing function; the tests avoid it by mutating a dict (`conftest.py:76-79`).

**Q:** 🟡 What is a generator?

**A:** A function with `yield` producing values lazily; calling it returns an iterator. `get_db` yields a session (`core/db.py:12-14`).

**Q:** 🟡 Generator expression vs list comprehension?

**A:** `(x for x in xs)` is lazy (no list built); `[x for x in xs]` builds the list. `(_text(v, 500) for v in values)` is lazy inside a comprehension (`prescription_service.py:91`).

**Q:** 🟡 What is a context manager?

**A:** An object with `__enter__`/`__exit__` used with `with`, guaranteeing cleanup: sessions, files, images (`cli.py:12`, `prescription_service.py:59`).

**Q:** 🟡 How do you write a context manager with a generator?

**A:** `@contextlib.contextmanager def cm(): setup; try: yield x finally: cleanup`.

**Q:** 🟡 What is `contextlib.nullcontext`?

**A:** A context manager that does nothing and returns its argument — used in tests to wrap an existing session (`test_prescriptions.py:61`).

**Q:** 🟡 How do custom exceptions work?

**A:** Subclass `Exception` (or a base): `class AppError(Exception)` with subclasses `NotFound`, `Conflict`… (`errors.py:14-51`).

**Q:** 🟡 What does `raise X from e` do?

**A:** Chains exceptions — `X.__cause__ = e` — showing both in tracebacks (`prescription_service.py:66-68`).

**Q:** 🟡 What's `try/except/else/finally`?

**A:** `else` runs if no exception; `finally` always runs.

**Q:** 🟡 What is `StrEnum`?

**A:** An Enum whose members are also `str` (3.11+), so `UserRole.ADMIN == "admin"` and JSON serialisation is natural (`models/user.py:11`).

**Q:** 🟡 What does `zip(a, b, strict=True)` do?

**A:** Pairs items and raises if lengths differ (3.10+) (`prescription_service.py:199`).

**Q:** 🟡 What does `sorted(x, key=…)` do and is it stable?

**A:** Returns a new sorted list using the key function; Python's sort is stable, so equal keys keep their order (`patient_service.py:179`).

**Q:** 🟡 What does `dict.setdefault(k, v)` do?

**A:** Returns `d[k]`, inserting `v` first if missing (`patient_service.py:145`).

**Q:** 🟡 What is `pathlib.Path`?

**A:** Object-oriented paths: `root / "prescriptions" / name`, `.read_bytes()`, `.write_bytes()`, `.unlink(missing_ok=True)`, `.mkdir(parents=True, exist_ok=True)` (`prescription_service.py:200-202`).

**Q:** 🟡 What does `assert` do and when shouldn't you rely on it?

**A:** Raises `AssertionError` if false; stripped with `python -O`, so never use for validating input (`prescription_service.py:315` documents an invariant).

**Q:** 🟡 What is `__all__`?

**A:** The list of names exported by `from module import *` (`models/__init__.py:7-16`).

**Q:** 🟡 What causes circular imports and how do you fix them?

**A:** Two modules importing each other at top level; fix by moving shared code, importing modules instead of names, or importing inside functions (`patient_service.py:124-125`).

**Q:** 🟡 What is `re.compile` for?

**A:** Pre-compiles a regex for reuse (`validators.py:8`).

**Q:** 🟡 `re.match` vs `re.search` vs `re.fullmatch`?

**A:** `match` anchors at the start, `search` anywhere, `fullmatch` the whole string. The phone regex uses `^…$` with `match` (`validators.py:8, 18`).

**Q:** 🔴 What is the GIL?

**A:** CPython's Global Interpreter Lock lets only one thread execute Python bytecode at a time; threads still help for I/O-bound work (GIL released while waiting). CPU-bound parallelism needs processes (3.13 adds an experimental free-threaded build).

**Q:** 🔴 Threading vs multiprocessing vs asyncio?

**A:** Threads: concurrent I/O within the GIL; multiprocessing: true CPU parallelism with separate memory; asyncio: single-threaded cooperative concurrency for many I/O waits.

**Q:** 🔴 How does `async`/`await` work in Python?

**A:** `async def` defines a coroutine; `await` yields control to the event loop until an awaitable completes, letting other coroutines run. Blocking calls inside coroutines stall everything.

**Q:** 🔴 Why is this backend synchronous?

**A:** SQLAlchemy is used synchronously and the Gemini SDK call is sync; FastAPI runs `def` endpoints in a thread pool, which is correct for blocking code.

**Q:** 🔴 How does Python manage memory?

**A:** Reference counting frees objects when count hits zero; a cyclic garbage collector reclaims reference cycles.

**Q:** 🔴 What's the LEGB rule?

**A:** Name lookup order: Local, Enclosing, Global, Built-in.

**Q:** 🔴 What are descriptors?

**A:** Objects defining `__get__`/`__set__`; they power `property`, methods, and SQLAlchemy's instrumented attributes (`Mapped` columns).

**Q:** 🔴 What is a metaclass?

**A:** The class of a class, controlling class creation; frameworks like Pydantic and SQLAlchemy's declarative base use them to process annotations.

**Q:** 🔴 What is MRO?

**A:** Method Resolution Order (C3 linearisation) for multiple inheritance — why `class User(UUIDPk, Timestamps, Base)` collects mixin columns (`models/user.py:17`).

**Q:** 🔴 What does `PYTHONUNBUFFERED=1` do?

**A:** Disables output buffering so logs appear immediately in Docker (`Dockerfile:4`).

**Q:** 🔴 What does `PYTHONDONTWRITEBYTECODE=1` do?

**A:** Stops creating `.pyc` files (`Dockerfile:3`).

## Predict the output / find the bug

**Q:** 🟡 Predict: `def f(x=[]): x.append(1); return x` called twice.

**A:** `[1]` then `[1, 1]` — the default list is created once. Use `None` and create inside, or `default_factory` (`schemas/prescription.py:86`).

**Q:** 🟡 Predict: `a = [1, 2]; b = a; b.append(3); print(a)`

**A:** `[1, 2, 3]` — same list object.

**Q:** 🟡 Predict: `[x * 2 for x in range(5) if x % 2]`

**A:** `[2, 6]`.

**Q:** 🟡 Predict: `funcs = [lambda: i for i in range(3)]; [f() for f in funcs]`

**A:** `[2, 2, 2]` — late binding of `i`. Fix with `lambda i=i: i`.

**Q:** 🟢 Predict: `"0" or "x"`, `"" or "x"`, `0 or None`

**A:** `"0"`, `"x"`, `None`.

**Q:** 🟡 Predict: `{"a": 1} | {"a": 2, "b": 3}`

**A:** `{"a": 2, "b": 3}` (dict union, 3.9+).

**Q:** 🟡 Bug: `except:` catching everything.

**A:** Bare except also catches `KeyboardInterrupt`/`SystemExit`; catch specific exceptions (`errors.py`, `prescription_service.py:65`).

**Q:** 🟡 Predict: `sorted([("b", 2), ("a", 2), ("c", 1)], key=lambda m: -m[1])`

**A:** `[("b", 2), ("a", 2), ("c", 1)]` — stable sort keeps `b` before `a`.

**Q:** 🟡 Predict: `"P-" + f"{42:05d}"`

**A:** `"P-00042"`.

**Q:** 🟡 Bug: `if user.role in ("admin")` 

**A:** `("admin")` is a string, so `in` checks substrings (`"min" in "admin"` is True). Use a tuple `("admin",)` or a set.

**Q:** 🔴 Predict: `x = 1; def f(): print(x); x = 2; f()`

**A:** `UnboundLocalError` — assignment makes `x` local for the whole function.

**Q:** 🟡 Predict: `date.fromisoformat("2026-02-30")`

**A:** `ValueError` — which `_date` catches and returns `None` (`prescription_service.py:81-85`).

**Q:** 🟡 Predict: `list(zip([1, 2], ["a"]))` and with `strict=True`

**A:** `[(1, 'a')]`; with `strict=True` → `ValueError`.

**Q:** 🟡 Bug: `if not value: return None` for an age of 0

**A:** `0` is falsy, so a valid zero is treated as missing. Check `is None`.

**Q:** 🔴 Predict: `print(1 if [] else 2, 1 if [0] else 2)`

**A:** `2 1` — empty list falsy, non-empty truthy.

## Scenarios

**Q:** 🟡 You must convert untrusted JSON fields into safe values. Approach?

**A:** Type-check each value, trim, cap lengths, parse dates with try/except, drop invalid list items — like `_text`, `_date`, `_strings`, `_medications` (`prescription_service.py:74-107`).

**Q:** 🟡 How would you make configuration easy to override in tests?

**A:** Put it behind a function (`get_settings()` with `lru_cache`, clear the cache or monkeypatch), or inject via dependencies.

**Q:** 🟡 How would you make a module-level function swappable in tests?

**A:** Call it through a module attribute and monkeypatch that attribute — `prescription_service.new_session` and `extraction_service.extract` (`test_prescriptions.py:61, 77`).

**Q:** 🟡 You have two modules that need each other. What do you do?

**A:** Extract shared code, import the module (not names) at top, or import inside the function that needs it.

**Q:** 🔴 How would you speed up CPU-heavy image processing for many uploads?

**A:** Use a process pool or a task queue worker, since Pillow work holds the GIL for parts of processing; or offload to the client (already resizing in the browser).

**Q:** 🟡 How do you ensure files are always closed?

**A:** Use `with` blocks or `pathlib` helpers (`read_bytes`, `write_bytes`) that open and close internally.

**Q:** 🟡 How do you pin dependencies reproducibly?

**A:** Use a lock tool (`uv lock`, `pip-compile`, Poetry) and install from the lock in Docker/CI.

## Write-it-quickly tasks

**Q:** 🟡 Write a decorator that logs execution time.

**A:**
```python
import functools, time
def timed(fn):
    @functools.wraps(fn)
    def wrapper(*a, **kw):
        t = time.perf_counter()
        try: return fn(*a, **kw)
        finally: print(fn.__name__, time.perf_counter() - t)
    return wrapper
```

**Q:** 🟡 Normalise a Bangladeshi phone number.

**A:** Strip separators, remove `+`, convert `880…` → `0…`, validate `^01[3-9]\d{8}$`, return `"+88" + digits` (`validators.py:11-20`).

**Q:** 🟡 Flatten a list of lists.

**A:** `[x for sub in lists for x in sub]` (`patient_service.py:128`).

**Q:** 🟡 Count words in a string.

**A:** `from collections import Counter; Counter(text.split())`.

**Q:** 🟡 Write a generator yielding chunks of size n.

**A:** `def chunks(xs, n): for i in range(0, len(xs), n): yield xs[i:i+n]` (or `itertools.batched` in 3.12).

**Q:** 🟡 Group matches by id collecting reasons.

**A:** `found.setdefault(p.id, (p, []))[1].append(reason)` (`patient_service.py:143-145`).

**Q:** 🟡 Parse "a, b, ,c" into `['a', 'b', 'c']`.

**A:** `[o.strip() for o in s.split(",") if o.strip()]` (`config.py:48`).

**Q:** 🔴 Write a simple retry decorator with exponential backoff.

**A:**
```python
def retry(times=3, base=0.2, exc=(Exception,)):
    def deco(fn):
        @functools.wraps(fn)
        def w(*a, **k):
            for i in range(times):
                try: return fn(*a, **k)
                except exc:
                    if i == times - 1: raise
                    time.sleep(base * 2 ** i)
        return w
    return deco
```

**Q:** 🟡 Write a dataclass for a token pair.

**A:** `@dataclass class TokenPair: access_token: str; access_expires: datetime; refresh_token: str; refresh_expires: datetime; refresh_jti: uuid.UUID` (`auth_service.py:26-32`).

## Real interview questions

**Q:** 🟡 What is duck typing?

**A:** Using objects by their behaviour (methods/attributes) rather than their type — "if it quacks…". Protocols (`typing.Protocol`) formalise it for type checkers.

**Q:** 🟡 What's the difference between `deepcopy` and `copy`?

**A:** `copy` is shallow (nested objects shared); `deepcopy` recursively copies.

**Q:** 🟡 What's `__init__` vs `__new__`?

**A:** `__new__` creates the instance; `__init__` initialises it. You rarely override `__new__` (immutables, singletons).

**Q:** 🟡 What are dunder methods?

**A:** Special methods like `__eq__`, `__repr__`, `__enter__`, `__iter__` that integrate classes with language features.

**Q:** 🟡 How are dicts implemented and what's their complexity?

**A:** Hash tables with average O(1) lookup/insert/delete; insertion order preserved (3.7+) — relied on in `find_matches` for tie-breaking (`patient_service.py:178`).

**Q:** 🟡 What's the time complexity of `x in list` vs `x in set`?

**A:** O(n) vs average O(1).

**Q:** 🟡 What is PEP 8?

**A:** Python's style guide; tools like Ruff enforce it (`pyproject.toml:8-10`).

**Q:** 🟡 What are wheels?

**A:** Pre-built binary package distributions; `slim` Debian images can install wheels for Pillow/psycopg without compilers.

**Q:** 🟡 What's `requirements.txt` vs `pyproject.toml`?

**A:** A flat list of dependencies vs the standard project metadata/config file (PEP 621) — this repo uses requirements files for deps and pyproject for tool config.

**Q:** 🔴 How do you profile Python code?

**A:** `cProfile`/`pstats`, `py-spy` (sampling), `line_profiler`; for memory `tracemalloc`.

**Q:** 🟡 Why are type hints useful in this codebase beyond documentation?

**A:** FastAPI uses them to parse requests, Pydantic to validate, SQLAlchemy `Mapped[]` to define columns and nullability.

**Q:** 🟡 What is `lambda`?

**A:** An anonymous single-expression function: `key=lambda m: -len(m[1])` (`patient_service.py:179`).

**Q:** 🟡 Why does the code assign a lambda with `# noqa: E731`?

**A:** Lint rule E731 discourages assigning lambdas; here it's a deliberate, monkeypatchable module attribute (`prescription_service.py:147`).

**Q:** 🟢 What does `isinstance(value, str)` do?

**A:** Checks the runtime type (including subclasses) — guarding untrusted model output (`prescription_service.py:75`).

**Q:** 🟡 How do you read a file's bytes with pathlib?

**A:** `Path(p).read_bytes()` (`prescription_service.py:159`).

**Q:** 🟡 What does `datetime.now(UTC)` return?

**A:** A timezone-aware current UTC datetime (`core/time.py:10`).

**Q:** 🟡 What is `zoneinfo`?

**A:** The standard-library IANA time zone support (3.9+): `ZoneInfo("Asia/Dhaka")` (`core/time.py:6`).

**Q:** 🔴 Why prefer aware datetimes?

**A:** Naive datetimes have no zone; mixing them with aware ones raises errors and causes off-by-hours bugs. The DB uses `timestamptz`.

**Q:** 🟡 What's the purpose of `typing.Any`?

**A:** Opt-out of type checking for dynamic data like raw JSON (`dict[str, Any]` for `extracted`).

**Q:** 🟡 How do you run a function from the command line with arguments?

**A:** Parse `sys.argv` (as `cli.py:25-29` does) or use `argparse`, Click or Typer.

**Q:** 🟢 What does `sys.exit(1)` signal?

**A:** Failure to the shell; with `set -e` in the entrypoint, a non-zero exit stops startup.

**Q:** 🟡 What does `logging.getLogger("rootrecord.extraction")` create?

**A:** A named logger in a hierarchy (child of `rootrecord`) for filtering and configuration (`extraction_service.py:17`).

**Q:** 🟡 Why use `logger.warning("... %s", x)` instead of f-strings?

**A:** Lazy formatting — the string is built only if the message is emitted, and structured logging tools can group by template.

**Q:** 🟡 What does `logger.exception` do?

**A:** Logs at ERROR level including the current traceback (`errors.py:104`).
