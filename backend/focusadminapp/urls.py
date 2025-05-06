from django.urls import path
from .views import (
    AdminLoginView,
    AdminLogoutView,
    UserListView,
    UserEditView,
    UserBlockView,
    AdminCheckAuthView,
    AdminRefreshTokenView
)

urlpatterns = [
    path('login/', AdminLoginView.as_view(), name='admin-login'),
    path('logout/', AdminLogoutView.as_view(), name='admin-logout'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:user_id>/edit/', UserEditView.as_view(), name='user-edit'),
    path('users/<int:user_id>/block/', UserBlockView.as_view(), name='user-block'),
    path('check-auth/', AdminCheckAuthView.as_view(), name='admin-check-auth'),
    path('refresh/', AdminRefreshTokenView.as_view(), name='admin-refresh'),
]
