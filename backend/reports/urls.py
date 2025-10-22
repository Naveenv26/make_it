from django.urls import path
from .views import stock_report

urlpatterns = [
    path("stock/", stock_report, name="stock_report"),
]
