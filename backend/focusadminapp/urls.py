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
    path('test1/', TestAdminJournalView.as_view(), name='test1'),
    path('test2/', TestAdminJournalView2.as_view(), name='test2'),
    path('test3/', TestAdminJournalView3.as_view(), name='test3'),
]
