from rest_framework.decorators import api_view
from rest_framework.response import Response
from catalog.models import Product

@api_view(["GET"])
def stock_report(request):
    products = Product.objects.filter(is_active=True)
    data = [
        {
            "id": p.id,
            "name": p.name,
            "quantity": p.quantity,
            "low_stock": p.quantity <= p.low_stock_threshold,
        }
        for p in products
    ]
    return Response(data)
