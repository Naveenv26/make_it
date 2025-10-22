from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import models
from .models import Product
from .serializers import ProductSerializer

class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer

    def get_queryset(self):
        return Product.objects.filter(is_active=True)  # ✅ only active products


# 📊 Stock Report Endpoint
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def product_report(request):
    low_stock = Product.objects.filter(quantity__lte=models.F("low_stock_threshold")).count()
    out_stock = Product.objects.filter(quantity__lte=0).count()
    total_products = Product.objects.count()

    data = {
        "low_count": low_stock,
        "out_count": out_stock,
        "total_products": total_products,
    }
    return Response(data)
