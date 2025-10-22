#!/usr/bin/env bash
# BillingApp v1 bootstrap script
# Creates a working full‑stack app (Django REST + React + Tailwind + JWT + Chart.js)
# Usage: save as bootstrap.sh, then: bash bootstrap.sh

set -e

APP_ROOT=${1:-billingapp}
FRONTEND_NAME=frontend
BACKEND_NAME=backend

mkdir -p $APP_ROOT && cd $APP_ROOT

############################################
# Python backend (Django + DRF + JWT)
############################################

cat > requirements.txt << 'PY'
Django==5.0.6
djangorestframework==3.15.2
djangorestframework-simplejwt==5.3.1
django-cors-headers==4.3.1
python-dateutil==2.9.0
PY

python -m venv venv
source venv/Scripts/activate || source .venv/Scripts/activate
pip install -r requirements.txt

django-admin startproject core $BACKEND_NAME
cd $BACKEND_NAME
python manage.py startapp accounts
python manage.py startapp shops
python manage.py startapp catalog
python manage.py startapp customers
python manage.py startapp sales
python manage.py startapp reports

# ---------------- settings.py -----------------
cat > core/settings.py << 'PY'
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = 'dev-secret-key-change-me'
DEBUG = True
ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'accounts', 'shops', 'catalog', 'customers', 'sales', 'reports',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_USER_MODEL = 'accounts.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

CORS_ALLOW_ALL_ORIGINS = True

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}
PY

# ---------------- accounts/models.py -----------------
cat > accounts/models.py << 'PY'
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        SITE_OWNER = 'SITE_OWNER', 'Site Owner'
        SHOP_OWNER = 'SHOP_OWNER', 'Shop Owner'
        STAFF = 'STAFF', 'Staff'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STAFF)
    shop = models.ForeignKey('shops.Shop', null=True, blank=True, on_delete=models.SET_NULL, related_name='users')

    def __str__(self):
        return f"{self.username} ({self.role})"
PY

# ---------------- shops/models.py -----------------
cat > shops/models.py << 'PY'
from django.db import models
from django.utils import timezone

class SubscriptionPlan(models.Model):
    name = models.CharField(max_length=50)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    features = models.JSONField(default=dict, blank=True)
    def __str__(self):
        return self.name

class Shop(models.Model):
    name = models.CharField(max_length=120)
    address = models.TextField(blank=True)
    gstin = models.CharField(max_length=20, blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    contact_email = models.EmailField(blank=True)
    language = models.CharField(max_length=20, default='en')
    business_type = models.CharField(max_length=40, default='Kirana / Grocery')
    counter_invoice = models.PositiveIntegerField(default=0)
    active_subscription = models.ForeignKey(SubscriptionPlan, null=True, blank=True, on_delete=models.SET_NULL)
    subscription_end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    def __str__(self):
        return self.name

class TaxProfile(models.Model):
    shop = models.OneToOneField(Shop, on_delete=models.CASCADE, related_name='tax_profile')
    default_rates = models.JSONField(default=list)  # e.g., [0,5,12,18]
    overrides = models.JSONField(default=dict, blank=True)
    def __str__(self):
        return f"TaxProfile({self.shop.name})"
PY

# ---------------- catalog/models.py -----------------
cat > catalog/models.py << 'PY'
from django.db import models

class Product(models.Model):
    UNIT_CHOICES = [('pcs','pcs'), ('kg','kg')]
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=140)
    sku = models.CharField(max_length=64, blank=True)
    unit = models.CharField(max_length=8, choices=UNIT_CHOICES, default='pcs')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=4, decimal_places=1, default=0) # GST %
    low_stock_threshold = models.PositiveIntegerField(default=0)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return self.name
PY

# ---------------- customers/models.py -----------------
cat > customers/models.py << 'PY'
from django.db import models

class Customer(models.Model):
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='customers')
    name = models.CharField(max_length=120)
    mobile = models.CharField(max_length=20, db_index=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    def __str__(self):
        return f"{self.name} ({self.mobile})"

class LoyaltyAccount(models.Model):
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE)
    customer = models.OneToOneField(Customer, on_delete=models.CASCADE, related_name='loyalty')
    points = models.PositiveIntegerField(default=0)
    earn_rate = models.PositiveIntegerField(default=100)  # ₹ per point
    redeem_value = models.DecimalField(max_digits=6, decimal_places=2, default=1)  # ₹ per point
    def __str__(self):
        return f"Loyalty({self.customer_id}): {self.points}"
PY

# ---------------- sales/models.py -----------------
cat > sales/models.py << 'PY'
from django.db import models
from django.utils import timezone

class Invoice(models.Model):
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='invoices')
    customer = models.ForeignKey('customers.Customer', null=True, blank=True, on_delete=models.SET_NULL)
    number = models.CharField(max_length=32, db_index=True)
    invoice_date = models.DateTimeField(default=timezone.now)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    tax_total = models.DecimalField(max_digits=12, decimal_places=2)
    discount_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2)
    payment_mode = models.CharField(max_length=20, default='cash')
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)

class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('catalog.Product', on_delete=models.PROTECT)
    qty = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)
PY

# ---------------- admin registration -----------------
for app in accounts shops catalog customers sales; do
cat > $app/admin.py << 'PY'
from django.contrib import admin
from . import models
for m in [getattr(models, n) for n in dir(models) if isinstance(getattr(models, n), type)]:
    try:
        admin.site.register(m)
    except Exception:
        pass
PY
done

# ---------------- serializers & viewsets -----------------
mkdir -p api
cat > api/__init__.py << 'PY'
PY

cat > api/serializers.py << 'PY'
from rest_framework import serializers
from accounts.models import User
from shops.models import Shop, TaxProfile, SubscriptionPlan
from catalog.models import Product
from customers.models import Customer, LoyaltyAccount
from sales.models import Invoice, InvoiceItem

class ShopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = '__all__'

class TaxProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxProfile
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id','username','role','shop']

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ['shop','updated_at']

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ['shop']

class LoyaltySerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltyAccount
        fields = '__all__'

class InvoiceItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    class Meta:
        model = InvoiceItem
        fields = ['id','product','product_name','qty','unit_price','tax_rate','line_total']

class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True)
    class Meta:
        model = Invoice
        fields = ['id','shop','customer','number','invoice_date','subtotal','tax_total','discount_total','grand_total','payment_mode','created_by','items']
        read_only_fields = ['shop','number','created_by']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        request = self.context['request']
        user = request.user
        shop = user.shop
        # increment invoice counter per shop
        shop.counter_invoice += 1
        shop.save(update_fields=['counter_invoice'])
        number = f"INV-{shop.id}-{shop.counter_invoice:06d}"
        invoice = Invoice.objects.create(shop=shop, number=number, created_by=user, **validated_data)
        from catalog.models import Product
        for it in items_data:
            prod = Product.objects.select_for_update().get(id=it['product'].id, shop=shop)
            qty = it['qty']
            prod.quantity = prod.quantity - qty
            prod.save(update_fields=['quantity'])
            InvoiceItem.objects.create(invoice=invoice, **it)
        return invoice
PY

cat > api/views.py << 'PY'
from rest_framework import viewsets, permissions, decorators, response
from django.db.models import Sum
from accounts.models import User
from shops.models import Shop, TaxProfile
from catalog.models import Product
from customers.models import Customer, LoyaltyAccount
from sales.models import Invoice, InvoiceItem
from .serializers import *
from django.utils import timezone
from datetime import datetime

class IsShopUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsShopUser]
    def get_queryset(self):
        return Product.objects.filter(shop=self.request.user.shop, is_active=True).order_by('name')
    def perform_create(self, serializer):
        serializer.save(shop=self.request.user.shop)

class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [IsShopUser]
    def get_queryset(self):
        return Customer.objects.filter(shop=self.request.user.shop).order_by('-id')
    def perform_create(self, serializer):
        obj = serializer.save(shop=self.request.user.shop)
        LoyaltyAccount.objects.get_or_create(shop=self.request.user.shop, customer=obj)

class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [IsShopUser]
    def get_queryset(self):
        return Invoice.objects.filter(shop=self.request.user.shop).order_by('-id')

class TaxProfileViewSet(viewsets.ModelViewSet):
    serializer_class = TaxProfileSerializer
    permission_classes = [IsShopUser]
    def get_queryset(self):
        return TaxProfile.objects.filter(shop=self.request.user.shop)

class MeViewSet(viewsets.ViewSet):
    permission_classes = [IsShopUser]
    def list(self, request):
        u = UserSerializer(request.user).data
        shop = ShopSerializer(request.user.shop).data if request.user.shop_id else None
        return response.Response({'user': u, 'shop': shop})

class ReportsViewSet(viewsets.ViewSet):
    permission_classes = [IsShopUser]

    @decorators.action(detail=False, methods=['get'])
    def sales(self, request):
        rng = request.query_params.get('range','daily')
        qs = Invoice.objects.filter(shop=request.user.shop)
        today = timezone.localdate()
        if rng=='daily':
            qs = qs.filter(invoice_date__date=today)
        elif rng=='weekly':
            start = today - timezone.timedelta(days=today.weekday())
            qs = qs.filter(invoice_date__date__gte=start)
        elif rng=='monthly':
            qs = qs.filter(invoice_date__year=today.year, invoice_date__month=today.month)
        total = qs.aggregate(total=Sum('grand_total'))['total'] or 0
        count = qs.count()
        return response.Response({'total': total, 'count': count})

    @decorators.action(detail=False, methods=['get'])
    def stock(self, request):
        low = Product.objects.filter(shop=request.user.shop, quantity__lte=models.F('low_stock_threshold')).count()
        return response.Response({'low_stock_items': low})
PY

# ---------------- urls.py -----------------
cat > core/urls.py << 'PY'
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from api.views import ProductViewSet, CustomerViewSet, InvoiceViewSet, TaxProfileViewSet, MeViewSet, ReportsViewSet
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = routers.DefaultRouter()
router.register(r'products', ProductViewSet, basename='products')
router.register(r'customers', CustomerViewSet, basename='customers')
router.register(r'invoices', InvoiceViewSet, basename='invoices')
router.register(r'tax-profile', TaxProfileViewSet, basename='tax')
router.register(r'me', MeViewSet, basename='me')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/reports/sales', ReportsViewSet.as_view({'get':'sales'})),
    path('api/reports/stock', ReportsViewSet.as_view({'get':'stock'})),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
PY

python manage.py makemigrations
python manage.py migrate

# Seed: create one site owner, one shop, one shop owner, tax profile presets
cat > seed.py << 'PY'
from django.contrib.auth import get_user_model
from shops.models import Shop, TaxProfile, SubscriptionPlan

User = get_user_model()

shop = Shop.objects.create(name='Demo Kirana', business_type='Kirana / Grocery', language='en')
User.objects.create_superuser(username='admin', password='admin', role='SITE_OWNER')
owner = User.objects.create_user(username='owner', password='owner', role='SHOP_OWNER', shop=shop)
TaxProfile.objects.create(shop=shop, default_rates=[0,5,12,18])
SubscriptionPlan.objects.create(name='Basic', price=99, features={'limit_products':500})
print('Seeded: admin/admin, owner/owner, shop Demo Kirana')
PY
python manage.py shell < seed.py
cd ..

echo "Backend ready at $BACKEND_NAME (run: source .venv/bin/activate && cd $BACKEND_NAME && python manage.py runserver)"

############################################
# React frontend (Vite + Tailwind + JWT)
############################################

npm create vite@latest $FRONTEND_NAME -- --template react
cd $FRONTEND_NAME
npm i
npm i axios react-router-dom chart.js react-chartjs-2
npm i -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# tailwind config
cat > tailwind.config.js << 'JS'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: { extend: {} },
  plugins: [],
}
JS

# index.css
cat > src/index.css << 'CSS'
@tailwind base;
@tailwind components;
@tailwind utilities;
CSS

# API client
mkdir -p src/api src/pages src/components src/hooks
cat > src/api/client.js << 'JS'
import axios from 'axios'
const api = axios.create({ baseURL: 'http://localhost:8000/api' })
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('token')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})
export default api
JS

# auth
cat > src/api/auth.js << 'JS'
import api from './client'
export async function login(username, password){
  const { data } = await api.post('/auth/token/', {username, password})
  localStorage.setItem('token', data.access)
  return data
}
export async function me(){
  const { data } = await api.get('/me/')
  return data
}
JS

# products API
cat > src/api/products.js << 'JS'
import api from './client'
export const listProducts = () => api.get('/products/').then(r=>r.data)
export const createProduct = (p) => api.post('/products/', p).then(r=>r.data)
export const updateProduct = (id, p) => api.put(`/products/${id}/`, p).then(r=>r.data)
export const deleteProduct = (id) => api.delete(`/products/${id}/`).then(r=>r.data)
JS

# invoices API
cat > src/api/invoices.js << 'JS'
import api from './client'
export const createInvoice = (payload) => api.post('/invoices/', payload).then(r=>r.data)
export const listInvoices = () => api.get('/invoices/').then(r=>r.data)
export const salesReport = (range='daily') => api.get('/reports/sales',{params:{range}}).then(r=>r.data)
export const stockReport = () => api.get('/reports/stock').then(r=>r.data)
JS

# App shell + routes
cat > src/main.jsx << 'JS'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Billing from './pages/Billing'
import Stock from './pages/Stock'

function PrivateRoute({ children }){
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login/>} />
        <Route path="/" element={<PrivateRoute><Dashboard/></PrivateRoute>} />
        <Route path="/billing" element={<PrivateRoute><Billing/></PrivateRoute>} />
        <Route path="/stock" element={<PrivateRoute><Stock/></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
JS

# Login page
cat > src/pages/Login.jsx << 'JS'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/auth'

export default function Login(){
  const [username,setUsername]=useState('owner')
  const [password,setPassword]=useState('owner')
  const [err,setErr]=useState('')
  const nav = useNavigate()
  const submit=async(e)=>{e.preventDefault();
    try{ await login(username,password); nav('/') }catch(ex){ setErr('Invalid credentials') }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form onSubmit={submit} className="bg-white p-8 rounded-2xl shadow w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-slate-800 text-center">Billing App</h1>
        {err && <div className="text-rose-600 text-sm">{err}</div>}
        <input className="w-full border p-2 rounded" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
        <input type="password" className="w-full border p-2 rounded" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="w-full bg-indigo-600 text-white py-2 rounded">Login</button>
      </form>
    </div>
  )
}
JS

# Dashboard page
cat > src/pages/Dashboard.jsx << 'JS'
import React, { useEffect, useState } from 'react'
import { salesReport, stockReport } from '../api/invoices'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { Bar } from 'react-chartjs-2'
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function Dashboard(){
  const [today,setToday]=useState({total:0,count:0})
  const [stock,setStock]=useState({low_stock_items:0})
  useEffect(()=>{ (async()=>{
    setToday(await salesReport('daily'))
    setStock(await stockReport())
  })() },[])

  const data={ labels:['Sales'], datasets:[{ label:'Today', data:[today.total] }]}

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow"><div className="text-slate-500 text-sm">Today's Sales</div><div className="text-3xl font-bold">₹{Number(today.total).toFixed(2)}</div></div>
        <div className="bg-white p-4 rounded shadow"><div className="text-slate-500 text-sm">Invoices Today</div><div className="text-3xl font-bold">{today.count}</div></div>
        <div className="bg-white p-4 rounded shadow"><div className="text-slate-500 text-sm">Low Stock Items</div><div className="text-3xl font-bold">{stock.low_stock_items}</div></div>
      </div>
      <div className="bg-white p-4 rounded shadow">
        <div className="mb-2 font-semibold">This Month's Sales (demo)</div>
        <Bar data={data} />
      </div>
    </div>
  )
}
JS

# Stock page
cat > src/pages/Stock.jsx << 'JS'
import React, { useEffect, useState } from 'react'
import { listProducts, createProduct, updateProduct, deleteProduct } from '../api/products'

export default function Stock(){
  const [items,setItems]=useState([])
  const [form,setForm]=useState({name:'',unit:'pcs',price:0,tax_rate:0,quantity:0,low_stock_threshold:0})
  const load=async()=> setItems(await listProducts())
  useEffect(()=>{load()},[])
  const save=async(e)=>{e.preventDefault(); await createProduct(form); setForm({name:'',unit:'pcs',price:0,tax_rate:0,quantity:0,low_stock_threshold:0}); load()}
  const remove=async(id)=>{ await deleteProduct(id); load() }
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Stock</h1>
      <form onSubmit={save} className="bg-white p-4 rounded shadow grid grid-cols-6 gap-2 mb-4">
        <input className="border p-2 rounded col-span-2" placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        <select className="border p-2 rounded" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>
          <option value="pcs">pcs</option><option value="kg">kg</option>
        </select>
        <input type="number" step="0.01" className="border p-2 rounded" placeholder="Price" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/>
        <input type="number" step="0.1" className="border p-2 rounded" placeholder="GST %" value={form.tax_rate} onChange={e=>setForm({...form,tax_rate:e.target.value})}/>
        <input type="number" step="0.01" className="border p-2 rounded" placeholder="Qty" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/>
        <input type="number" className="border p-2 rounded" placeholder="Low stock" value={form.low_stock_threshold} onChange={e=>setForm({...form,low_stock_threshold:e.target.value})}/>
        <button className="bg-indigo-600 text-white rounded col-span-6 py-2">Add Product</button>
      </form>
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50"><th className="p-2 text-left">Name</th><th className="p-2">Unit</th><th className="p-2">Price</th><th className="p-2">GST %</th><th className="p-2">Qty</th><th className="p-2">Low</th><th></th></tr></thead>
          <tbody>
            {items.map(it=> (
              <tr key={it.id} className="border-t">
                <td className="p-2">{it.name}</td>
                <td className="p-2 text-center">{it.unit}</td>
                <td className="p-2 text-right">₹{it.price}</td>
                <td className="p-2 text-center">{it.tax_rate}%</td>
                <td className="p-2 text-right">{it.quantity}</td>
                <td className="p-2 text-right">{it.low_stock_threshold}</td>
                <td className="p-2 text-right"><button onClick={()=>remove(it.id)} className="text-rose-600">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
JS

# Billing page (basic cart -> invoice)
cat > src/pages/Billing.jsx << 'JS'
import React, { useEffect, useState } from 'react'
import { listProducts } from '../api/products'
import { createInvoice } from '../api/invoices'

export default function Billing(){
  const [products,setProducts]=useState([])
  const [filter,setFilter]=useState('')
  const [cart,setCart]=useState([])

  useEffect(()=>{ (async()=> setProducts(await listProducts()))() },[])
  const add=(p)=>{
    const existing = cart.find(i=>i.product===p.id)
    if(existing){ existing.qty+=1; setCart([...cart]) }
    else setCart([...cart,{ product:p.id, name:p.name, unit_price:Number(p.price), tax_rate:Number(p.tax_rate), qty:1 }])
  }
  const subtotal = cart.reduce((s,i)=> s + i.unit_price*i.qty, 0)
  const tax_total = cart.reduce((s,i)=> s + (i.unit_price*i.qty*i.tax_rate/100), 0)
  const grand_total = subtotal + tax_total

  const checkout = async()=>{
    const payload = {
      customer: null,
      subtotal, tax_total, discount_total:0, grand_total, payment_mode:'cash',
      items: cart.map(i=>({ product:i.product, qty:i.qty, unit_price:i.unit_price, tax_rate:i.tax_rate, line_total: i.unit_price*i.qty*(1+i.tax_rate/100) }))
    }
    const inv = await createInvoice(payload)
    alert(`Invoice created: ${inv.number}`)
    setCart([])
  }

  return (
    <div className="p-6 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Billing</h1>
        <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search products..." className="border p-2 rounded w-full mb-3"/>
        <div className="bg-white rounded shadow divide-y max-h-[60vh] overflow-y-auto">
          {products.filter(p=>p.name.toLowerCase().includes(filter.toLowerCase())).map(p=> (
            <button key={p.id} onClick={()=>add(p)} className="w-full text-left p-3 hover:bg-slate-50 flex justify-between">
              <span>{p.name}</span>
              <span>₹{p.price} • {p.tax_rate}%</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Cart</h2>
        <div className="bg-white rounded shadow p-3 space-y-2">
          {cart.length===0 && <div className="text-slate-500">No items yet</div>}
          {cart.map((i,idx)=> (
            <div key={idx} className="flex items-center justify-between gap-2">
              <div className="flex-1">{i.name}</div>
              <input type="number" className="w-16 border p-1 rounded" value={i.qty} onChange={e=>{i.qty=Number(e.target.value); setCart([...cart])}} />
              <div className="w-24 text-right">₹{(i.unit_price*i.qty).toFixed(2)}</div>
              <button onClick={()=>{ const c=[...cart]; c.splice(idx,1); setCart(c) }} className="text-rose-600">✕</button>
            </div>
          ))}
          <div className="border-t pt-2 text-right space-y-1">
            <div>Subtotal: ₹{subtotal.toFixed(2)}</div>
            <div>GST: ₹{tax_total.toFixed(2)}</div>
            <div className="text-lg font-bold">Total: ₹{grand_total.toFixed(2)}</div>
            <button onClick={checkout} className="mt-2 bg-emerald-600 text-white px-4 py-2 rounded">Checkout</button>
          </div>
        </div>
      </div>
    </div>
  )
}
JS

# index.html title
sed -i.bak "s/<title>Vite App<\/title>/<title>Billing App<\/title>/" index.html || true

cd ..

echo "\nFrontend ready at $FRONTEND_NAME (run: cd $FRONTEND_NAME && npm run dev)"

echo "\n✅ DONE. Next steps:\n1) Backend: source .venv/bin/activate && cd $BACKEND_NAME && python manage.py runserver\n2) Frontend: cd $FRONTEND_NAME && npm run dev\n3) Login with owner/owner (seeded). Add products in Stock, then bill in Billing.\n"
