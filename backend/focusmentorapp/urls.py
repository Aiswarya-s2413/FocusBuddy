from django.urls import path
from .views import *

urlpatterns = [
    path('signup/', MentorSignupView.as_view(), name='mentor-signup'),
    path('login/', MentorLoginView.as_view(), name='mentor-login'),
    path('logout/', MentorLogoutView.as_view(), name='mentor-logout'),
    path('check-auth/', MentorCheckAuthView.as_view(), name='mentor-check-auth'),
    path('refresh/', MentorRefreshTokenView.as_view(), name='mentor-refresh'),
    path('verify-otp/', MentorOtpVerifyView.as_view(), name='mentor-verify-otp'),
    path('select-subjects/', MentorSelectSubjectsView.as_view(), name='mentor-select-subjects'),
    path('forgot-password/', MentorForgotPasswordView.as_view(), name='mentor-forgot-password'),
    path('verify-forgot-password-otp/', MentorVerifyForgotPasswordOTPView.as_view(), name='mentor-verify-forgot-password-otp'),
    path('reset-password/', MentorResetPasswordView.as_view(), name='mentor-reset-password'),
    path('profile-upload/', MentorProfileUploadView.as_view(), name='mentor-profile-upload'),
    path('resend-otp/', MentorResendOtpView.as_view(), name='mentor-resend-otp'),
] 