from django.urls import path, include
from .views import *
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)


urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),
    path('verify-otp/', OtpVerifyView.as_view(), name='verify-otp'),
    path('resend-otp/', ResendOtpView.as_view(), name='resend-otp'),
    path('select-subjects/', SelectSubjectsView.as_view(), name='select-subjects'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('verify-forgot-password-otp/', VerifyForgotPasswordOTPView.as_view(), name='verify-forgot-password-otp'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('update-profile/', UpdateProfileView.as_view(), name='update-profile'),
    path('check-user-status/', CheckUserStatusView.as_view(), name='check-user-status'),
    path('tasks/', TaskListCreateAPIView.as_view(), name='task-list-create'),
    path('tasks/<int:pk>/', TaskDetailAPIView.as_view(), name='task-detail'),
    path('tasks/<int:pk>/complete_pomodoro/', CompletePomodoroAPIView.as_view(), name='task-complete-pomodoro'),
    path('sessions/', PomodoroSessionListCreateAPIView.as_view(), name='session-list-create'),
    path('sessions/<int:pk>/', PomodoroSessionDetailAPIView.as_view(), name='session-detail'),
    path('sessions/<int:pk>/complete/', CompleteSessionAPIView.as_view(), name='session-complete'),
    path('settings/', PomodoroSettingsAPIView.as_view(), name='pomodoro-settings'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]