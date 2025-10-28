from pathlib import Path
from datetime import timedelta
import environ

# =======================================
# Environment Setup
# =======================================
BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()
environ.Env.read_env()  # Reads from .env file

# =======================================
# Security & Debug
# =======================================
SECRET_KEY = 'dev-secret-key-change-me'
DEBUG = True
ALLOWED_HOSTS = ['*']

# =======================================
# Applications
# =======================================
INSTALLED_APPS = [
    # Django Core
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third Party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',

    # Local Apps
    'api',
    'accounts',
    'shops',
    'catalog',
    'customers',
    'sales',
    'reports',
]

# =======================================
# Middleware
# =======================================
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'api.middleware.SubscriptionMiddleware',
]

# =======================================
# URL / WSGI
# =======================================
ROOT_URLCONF = 'core.urls'
WSGI_APPLICATION = 'core.wsgi.application'

# =======================================
# Templates
# =======================================
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

# =======================================
# Database
# =======================================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# =======================================
# Authentication
# =======================================
AUTH_USER_MODEL = 'accounts.User'
AUTHENTICATION_BACKENDS = [
    'accounts.backends.EmailBackend',  # Your new email backend
    'django.contrib.auth.backends.ModelBackend', # The default backend
]

# =======================================
# REST Framework & JWT
# =======================================
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.AnonRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "user": "1000/day",
        "anon": "100/day",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# =======================================
# Razorpay
# =======================================
RAZORPAY_KEY_ID = env("RAZORPAY_KEY_ID", default="")
RAZORPAY_KEY_SECRET = env("RAZORPAY_KEY_SECRET", default="")

# =======================================
# CORS & CSRF
# =======================================
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    env("FRONTEND_URL", default="http://localhost:5173"),
]
CSRF_TRUSTED_ORIGINS = [
    env("FRONTEND_URL", default="http://localhost:5173"),
    "http://127.0.0.1:5173",
]

# =======================================
# Security Headers
# =======================================
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"

# =======================================
# Static & Media
# =======================================
STATIC_URL = "/static/"
MEDIA_URL = "/media/"

# =======================================
# Localization
# =======================================
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# =======================================
# Email (Development Only)
# =======================================
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
