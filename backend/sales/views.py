from django.utils.timezone import now
from django.db.models import Sum, Count
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Invoice

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def invoice_report(request):
    today = now().date()
    month = today.month
    year = today.year

    today_invoices = Invoice.objects.filter(invoice_date__date=today)
    month_invoices = Invoice.objects.filter(invoice_date__year=year, invoice_date__month=month)

    data = {
        "today_total": today_invoices.aggregate(total=Sum("grand_total"))["total"] or 0,
        "today_count": today_invoices.count(),
        "month_total": month_invoices.aggregate(total=Sum("grand_total"))["total"] or 0,
        "month_count": month_invoices.count(),
    }
    return Response(data)
