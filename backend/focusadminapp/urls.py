from django.urls import path
from .views import *

urlpatterns = [
    path('login/', AdminLoginView.as_view(), name='admin-login'),
    path('logout/', AdminLogoutView.as_view(), name='admin-logout'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:user_id>/edit/', UserEditView.as_view(), name='user-edit'),
    path('users/<int:user_id>/block/', UserBlockView.as_view(), name='user-block'),
    path('check-auth/', AdminCheckAuthView.as_view(), name='admin-check-auth'),
    path('refresh-token/', AdminRefreshTokenView.as_view(), name='admin-refresh'),
    path('journals/', AdminJournalListView.as_view(), name='admin-journal-list'),
    path('journals/<int:journal_id>/', AdminJournalDetailView.as_view(), name='admin-journal-detail'),
    path('journals/<int:journal_id>/block/', AdminBlockJournalView.as_view(), name='admin-journal-block'),
    path('mentors/', MentorApprovalListView.as_view(), name='mentor-approval-list'),
    path('mentors/<int:mentor_id>/', MentorDetailView.as_view(), name='mentor-detail'),
    path('mentors/<int:mentor_id>/approve/', ApproveMentorView.as_view(), name='approve-mentor'),
    path('mentors/<int:mentor_id>/reject/', RejectMentorView.as_view(), name='reject-mentor'),
    path('mentors/stats/', MentorApprovalStatsView.as_view(), name='mentor-approval-stats'),
    path('wallet/', AdminWalletView.as_view(), name='admin-wallet'),
    
]
