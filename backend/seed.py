from django.contrib.auth import get_user_model
from shops.models import Shop, TaxProfile, SubscriptionPlan

User = get_user_model()

shop = Shop.objects.create(name='Demo Kirana', business_type='Kirana / Grocery', language='en')
User.objects.create_superuser(username='admin', password='admin', role='SITE_OWNER')
owner = User.objects.create_user(username='owner', password='owner', role='SHOP_OWNER', shop=shop)
TaxProfile.objects.create(shop=shop, default_rates=[0,5,12,18])
SubscriptionPlan.objects.create(name='Basic', price=99, features={'limit_products':500})
print('Seeded: admin/admin, owner/owner, shop Demo Kirana')
