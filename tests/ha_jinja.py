"""A small stand-in for Home Assistant's template engine (Jinja2 + the HA filters these templates use),
to check the rendered automations evaluate as expected without a real HA."""
import datetime
import re

import jinja2


def env(today):
    e = jinja2.Environment(extensions=["jinja2.ext.loopcontrols"])
    e.filters["regex_replace"] = lambda s, find="", replace="": re.sub(find, replace, s)
    e.filters["regex_findall"] = lambda s, find="": re.findall(find, s)
    e.tests["search"] = lambda s, find: re.search(find, s) is not None
    e.tests["match"] = lambda s, find: re.match(find, s) is not None
    e.filters["unique"] = lambda seq, case_sensitive=True: list(dict.fromkeys(seq)) if case_sensitive else \
        [x for i, x in enumerate(seq) if x.lower() not in [y.lower() for y in list(seq)[:i]]]
    e.globals["timedelta"] = datetime.timedelta
    e.globals["now"] = lambda: datetime.datetime.combine(today, datetime.time(12))

    def strptime(value, fmt, default=jinja2.Undefined):
        try:
            return datetime.datetime.strptime(value, fmt)
        except ValueError:
            if default is jinja2.Undefined:
                raise
            return default
    e.globals["strptime"] = strptime
    e.filters["string"] = str
    return e


def render(template, today, **variables):
    return env(today).from_string(template).render(**variables).strip()
