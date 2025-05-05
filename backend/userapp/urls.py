from django.urls import path
from .views import (
    SignupView, LoginView, OtpVerifyView, SelectSubjectsView,
    ForgotPasswordView, VerifyForgotPasswordOTPView, ResetPasswordView,
    LogoutView, UpdateProfileView
)

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),
    path('verify-otp/', OtpVerifyView.as_view(), name='verify-otp'),
    path('select-subjects/', SelectSubjectsView.as_view(), name='select-subjects'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('verify-forgot-password-otp/', VerifyForgotPasswordOTPView.as_view(), name='verify-forgot-password-otp'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('update-profile/', UpdateProfileView.as_view(), name='update-profile'),
]