from django.urls import path
from .views import (
    MentorSignupView,
    MentorLoginView,
    MentorLogoutView,
    MentorProfileView,
    MentorCheckAuthView,
    MentorRefreshTokenView
)

urlpatterns = [
    path('signup/', MentorSignupView.as_view(), name='mentor-signup'),
    path('login/', MentorLoginView.as_view(), name='mentor-login'),
    path('logout/', MentorLogoutView.as_view(), name='mentor-logout'),
    path('profile/', MentorProfileView.as_view(), name='mentor-profile'),
    path('check-auth/', MentorCheckAuthView.as_view(), name='mentor-check-auth'),
    path('refresh/', MentorRefreshTokenView.as_view(), name='mentor-refresh'),
] 