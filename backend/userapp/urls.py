from django.urls import path, include
from .views import *
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    # Authentication URLs
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
    
    # Task URLs
    path('tasks/', TaskListCreateAPIView.as_view(), name='task-list-create'),
    path('tasks/<int:pk>/', TaskDetailAPIView.as_view(), name='task-detail'),
    path('tasks/<int:pk>/complete_pomodoro/', CompletePomodoroAPIView.as_view(), name='task-complete-pomodoro'),
    
    # Pomodoro Session URLs
    path('sessions/', PomodoroSessionListCreateAPIView.as_view(), name='session-list-create'),
    path('sessions/create-order/', CreateOrderAPIView.as_view(), name='create-order'),
    path('sessions/confirm-booking/', ConfirmBookingAPIView.as_view(), name='confirm-booking'),
    path('sessions/<int:pk>/', PomodoroSessionDetailAPIView.as_view(), name='session-detail'),
    path('sessions/<int:pk>/complete/', CompleteSessionAPIView.as_view(), name='session-complete'),
    path('sessions/<int:session_id>/messages/', FocusSessionMessagesView.as_view(), name='session-messages'),
    
    # Settings
    path('settings/', PomodoroSettingsAPIView.as_view(), name='pomodoro-settings'),
    
    # JWT Token URLs
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Journal URLs
    path('journals/', JournalAPIView.as_view(), name='journals'),               
    path('journals/<int:journal_id>/', JournalAPIView.as_view(), name='user-journals'),
    path('moods/', MoodChoicesAPIView.as_view(), name='mood-choices'),
    
    # Mentor URLs
    path('mentors/', MentorListAPIView.as_view(), name='mentor-list'),
    path('mentors/<int:mentor_id>/', MentorDetailAPIView.as_view(), name='mentor-detail'),
    
    # User Session URLs - SPECIFIC PATTERNS FIRST
    path('list/', UserSessionsListAPIView.as_view(), name='user-sessions-list'),
    path('stats/', SessionStatsAPIView.as_view(), name='session-stats'),
    
    # Focus Buddy URLs 
    path('availability/', FocusBuddyAvailabilityView.as_view(), name='availability'),
    path('start-session/', StartFocusSessionView.as_view(), name='start-session'),
    path('current-session/', CurrentFocusSessionView.as_view(), name='current-session'),
    path('end-session/', EndFocusSessionView.as_view(), name='end-session'),
    path('cancel-session/', CancelFocusSessionView.as_view(), name='cancel-session'),
    path('match-response/', FocusSessionMatchResponseView.as_view(), name='match-response'),
    path('feedback/', FocusSessionFeedbackView.as_view(), name='session-feedback'),
    path('buddy-stats/', FocusBuddyStatsView.as_view(), name='user-stats'),
    path('history/', FocusSessionHistoryView.as_view(), name='session-history'),
    path('available-users/', AvailableUsersView.as_view(), name='available-users'),
    
    # Generic patterns with parameters 
    path('<int:pk>/', SessionDetailAPIView.as_view(), name='session-detail'),
    path('<int:pk>/cancel/', CancelSessionAPIView.as_view(), name='cancel-session'),
    path('<int:session_id>/payment/', SessionPaymentAPIView.as_view(), name='session-payment'),
    path('<int:session_id>/reviews/create/', CreateSessionReviewAPIView.as_view(), name='create-session-review'),
    path('<int:session_id>/reviews/', SessionReviewsListAPIView.as_view(), name='session-reviews-list'),
    path('<int:session_id>/messages/', SessionMessagesAPIView.as_view(), name='session-messages'),
]