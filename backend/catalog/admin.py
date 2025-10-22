from django.contrib import admin
from . import models
for m in [getattr(models, n) for n in dir(models) if isinstance(getattr(models, n), type)]:
    try:
        admin.site.register(m)
    except Exception:
        pass
