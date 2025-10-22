from rest_framework import generics, permissions, response, status
from .serializers import ShopRegistrationSerializer


class ShopRegistrationView(generics.CreateAPIView):
    serializer_class = ShopRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        return response.Response(
            {
                "message": "Shop registered successfully",
                "shop": result["shop"].name,
                "owner": result["owner"].username,
                "shopkeeper": result["shopkeeper"].username if result["shopkeeper"] else None,
            },
            status=status.HTTP_201_CREATED,
        )
