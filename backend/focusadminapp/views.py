from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.contrib.auth import logout
from .serializers import *
from userapp.models import *
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.authentication import JWTAuthentication
import logging
from rest_framework.permissions import AllowAny
from rest_framework.decorators import permission_classes
from django.utils import timezone
from userapp.authentication import AdminCookieJWTAuthentication
from django.db.models import Sum
from django.http import JsonResponse
import traceback
import sys
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from datetime import datetime, timedelta


logger = logging.getLogger(__name__)


@permission_classes([AllowAny])
class AdminLoginView(APIView):
    def post(self, request):
        logger.info("Entered AdminLoginView.post")
        logger.info(f"Admin login attempt for email: {request.data.get('email', 'unknown')}")
        
        serializer = AdminLoginSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            try:
                data = serializer.validated_data
                user = data["user"]
                
                # Generate fresh tokens
                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)
                refresh_token = str(refresh)
                
                # Update last login
                user.last_login = timezone.now()
                user.save(update_fields=['last_login'])
                
                response = Response({
                    "message": "Login successful", 
                    "user": {
                        "id": user.id,
                        "email": user.email,
                        "name": getattr(user, 'name', user.email),  # Use email as fallback instead of username
                        "is_staff": user.is_staff,
                        "is_superuser": user.is_superuser,
                    }
                }, status=status.HTTP_200_OK)
                
                # Set cookies with proper expiration times
                response.set_cookie(
                    "admin_access",
                    access_token,
                    max_age=60 * 15,  # 15 minutes
                    httponly=True,
                    secure=False,  # Set to True in production with HTTPS
                    samesite="Lax",
                    path="/",
                    domain=None  
                )
                response.set_cookie(
                    "admin_refresh",
                    refresh_token,
                    max_age=60 * 60 * 24 * 7,  # 7 days
                    httponly=True,
                    secure=False,  # Set to True in production with HTTPS
                    samesite="Lax",
                    path="/",
                    domain=None  
                )
                
                logger.info(f"Admin login successful for user: {user.email}")
                return response
                
            except Exception as e:
                logger.error(f"Error during login process: {str(e)}", exc_info=True)
                return Response({
                    "error": "Login failed",
                    "detail": "An error occurred during authentication"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        logger.warning(f"Admin login validation failed: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AdminLogoutView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    def post(self, request):
        logger.info("Entered AdminLogoutView.post")
        try:
        
            
            response = Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
            
            response.set_cookie(
                'admin_access',
                '',
                max_age=0,
                expires='Thu, 01 Jan 1970 00:00:00 GMT',
                httponly=True,
                secure=False,
                samesite='Lax',
                path='/',
                domain=None
            )
            response.set_cookie(
                'admin_refresh',
                '',
                max_age=0,
                expires='Thu, 01 Jan 1970 00:00:00 GMT',
                httponly=True,
                secure=False,
                samesite='Lax',
                path='/',
                domain=None
            )
            
            # Try to logout if user is authenticated
            if hasattr(request, 'user') and request.user.is_authenticated:
                logout(request)
                
            logger.info("Admin logout successful")
            return response
            
        except Exception as e:
            logger.error(f"Error during logout: {str(e)}", exc_info=True)
            # Still try to delete cookies even if there's an error
            response = Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
            
            # Use the set_cookie approach for more reliable deletion
            response.set_cookie(
                'admin_access',
                '',
                max_age=0,
                expires='Thu, 01 Jan 1970 00:00:00 GMT',
                httponly=True,
                secure=False,
                samesite='Lax',
                path='/',
                domain=None
            )
            response.set_cookie(
                'admin_refresh',
                '',
                max_age=0,
                expires='Thu, 01 Jan 1970 00:00:00 GMT',
                httponly=True,
                secure=False,
                samesite='Lax',
                path='/',
                domain=None
            )
            
            return response

class AdminCheckAuthView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]  
    
    def get(self, request):
        logger.info("Entered AdminCheckAuthView.get")
        try:
            # Get token from cookies
            access_token = request.COOKIES.get('admin_access')
            
            if not access_token:
                return Response(
                    {"error": "Authentication credentials were not provided."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            try:
                # Validate token
                token = AccessToken(access_token)
                # Get user from token
                user_id = token.get('user_id')
                if user_id:
                    try:
                        from django.contrib.auth import get_user_model
                        User = get_user_model()
                        user = User.objects.get(id=user_id)
                        
                        # Check if user is admin
                        if not (user.is_staff or user.is_superuser):
                            return Response(
                                {"error": "Admin access required."},
                                status=status.HTTP_403_FORBIDDEN
                            )
                        
                        return Response({
                            "message": "Authentication successful",
                            "user": {
                                "id": user.id,
                                "email": user.email,
                                "name": getattr(user, 'name', user.username),
                                "is_staff": user.is_staff,
                                "is_superuser": user.is_superuser,
                            }
                        }, status=status.HTTP_200_OK)
                    except User.DoesNotExist:
                        return Response(
                            {"error": "User not found."},
                            status=status.HTTP_401_UNAUTHORIZED
                        )
                else:
                    return Response(
                        {"error": "Invalid token payload."},
                        status=status.HTTP_401_UNAUTHORIZED
                    )
                    
            except (InvalidToken, TokenError) as e:
                logger.warning(f"Token validation failed in check auth: {str(e)}")
                return Response(
                    {"error": "Invalid or expired token."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        except Exception as e:
            logger.error(f"Error checking authentication: {str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred while checking authentication"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AdminRefreshTokenView(APIView):
    def post(self, request):
        logger.info("Entered AdminRefreshTokenView.post")
        # Get refresh token from admin_refresh cookie
        refresh_token = request.COOKIES.get('admin_refresh')
        
        if not refresh_token:
            return Response(
                {'error': 'Refresh token not found'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            # Validate and refresh the token
            refresh = RefreshToken(refresh_token)
            access_token = str(refresh.access_token)
            
            # Create response with new access token
            response = Response({
                'message': 'Token refreshed successfully'
            })
            
            
            response.set_cookie(
                'admin_access',
                access_token,
                max_age=60 * 15,  # 15 minutes
                httponly=True,
                secure=True,  
                samesite='Lax'
            )
            
            logger.info("AdminRefreshTokenView.post successful")
            return response
            
        except TokenError as e:
            logger.error(f"Token refresh failed: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Invalid refresh token'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            logger.error(f"Unexpected error during token refresh: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Token refresh failed'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UserListView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        logger.info("Entered UserListView.get")
        try:
            # Get search query, pagination parameters, and mentor filter
            search_query = request.query_params.get('search', '')
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 10))
            mentor_filter = request.query_params.get('mentor_only', '').lower() == 'true'
            
            # Filter users based on search query
            if search_query:
                users = User.objects.filter(
                    email__icontains=search_query
                ) | User.objects.filter(
                    name__icontains=search_query
                )
            else:
                users = User.objects.all()
            
            # Apply mentor filter if requested
            if mentor_filter:
                users = users.filter(is_mentor=True)
            
            # Calculate pagination
            total_users = users.count()
            total_pages = (total_users + page_size - 1) // page_size
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            
            # Get paginated users
            paginated_users = users[start_index:end_index]
            
            # Serialize the data
            serializer = UserListSerializer(paginated_users, many=True)
            
            logger.info("UserListView.get successful")
            return Response({
                "users": serializer.data,
                "pagination": {
                    "total_users": total_users,
                    "total_pages": total_pages,
                    "current_page": page,
                    "page_size": page_size,
                    "has_next": page < total_pages,
                    "has_previous": page > 1
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error listing users: {str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred while listing users"},
                status=status.HTTP_400_BAD_REQUEST
            )

class UserEditView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def put(self, request, user_id):
        logger.info("Entered UserEditView.put")
        try:
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response(
                    {"error": "User not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            serializer = UserEditSerializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                logger.info("UserEditView.put successful")
                return Response({
                    "message": "User updated successfully",
                    "user": serializer.data
                }, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Error updating user: {str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred while updating user"},
                status=status.HTTP_400_BAD_REQUEST
            )

class UserBlockView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, user_id):
        logger.info("Entered UserBlockView.post")
        try:
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response(
                    {"error": "User not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Toggle is_active status
            user.is_active = not user.is_active
            user.save()

            action = "blocked" if not user.is_active else "unblocked"
            logger.info(f"User {user.email} blocked/unblocked by {request.user.email}")
            return Response({
                "message": f"User {action} successfully",
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "is_active": user.is_active
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error blocking/unblocking user: {str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred while blocking/unblocking user"},
                status=status.HTTP_400_BAD_REQUEST
            )


class AdminJournalListView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        logger.info("Entered AdminJournalListView.get")
        try:
            # Get query parameters
            search_query = request.query_params.get('search', '')
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 10))

            # Filter journals based on search
            if search_query:
                journals = Journal.objects.filter(
                    Q(user__name__icontains=search_query) |
                    Q(mood__icontains=search_query)
                ).select_related('user').order_by('-created_at')
            else:
                journals = Journal.objects.all().select_related('user').order_by('-created_at')

            # Manual pagination calculation
            total_journals = journals.count()
            total_pages = (total_journals + page_size - 1) // page_size
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            paginated_journals = journals[start_index:end_index]

            # Serialize
            serializer = JournalListSerializer(paginated_journals, many=True)

            logger.info("AdminJournalListView.get successful")
            return Response({
                "journals": serializer.data,
                "pagination": {
                    "total_journals": total_journals,
                    "total_pages": total_pages,
                    "current_page": page,
                    "page_size": page_size,
                    "has_next": page < total_pages,
                    "has_previous": page > 1
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error listing journals: {str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred while listing journals"},
                status=status.HTTP_400_BAD_REQUEST
            )


class AdminJournalDetailView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request, journal_id):
        logger.info("Entered AdminJournalDetailView.get")
        try:
            journal = Journal.objects.select_related('user').get(pk=journal_id)
            serializer = JournalDetailSerializer(journal)
            print(serializer.data)
            logger.info("AdminJournalDetailView.get successful")
            return Response(serializer.data)
        except Journal.DoesNotExist:
            return Response(
                {'error': 'Journal not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error in AdminJournalDetailView.get: {str(e)}", exc_info=True)
            return Response(
                {'error': 'An error occurred while fetching the journal'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AdminBlockJournalView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def post(self, request, journal_id):
        logger.info("Entered AdminBlockJournalView.post")
        try:
            journal = Journal.objects.get(pk=journal_id)
            # Toggle the is_blocked status
            journal.is_blocked = not journal.is_blocked
            journal.save()
            
            action = "blocked" if journal.is_blocked else "unblocked"
            logger.info(f"Journal {journal_id} blocked/unblocked by {request.user.email}")
            return Response({
                'message': f'Journal successfully {action}',
                'is_blocked': journal.is_blocked
            })
        except Journal.DoesNotExist:
            return Response(
                {'error': 'Journal not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error in AdminBlockJournalView.post: {str(e)}", exc_info=True)
            return Response(
                {'error': 'An error occurred while updating the journal'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
class MentorApprovalListView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        """List mentors with filtering, search and pagination"""
        logger.info("Entered MentorApprovalListView.get")
        try:
            # Get query parameters
            search_query = request.query_params.get('search', '')
            status_filter = request.query_params.get('status', 'pending')
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 10))
            
            # Base queryset
            queryset = Mentor.objects.select_related('user', 'approved_by').all()
            
            # Filter by approval status
            if status_filter and status_filter != 'all':
                queryset = queryset.filter(approval_status=status_filter)
            
            # Search functionality
            if search_query:
                queryset = queryset.filter(
                    Q(user__name__icontains=search_query) |
                    Q(user__email__icontains=search_query)
                )
            
            # Order by submission date (latest first)
            queryset = queryset.order_by('-submitted_at', '-created_at')
            
            # Manual pagination calculation
            total_mentors = queryset.count()
            total_pages = (total_mentors + page_size - 1) // page_size
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            paginated_mentors = queryset[start_index:end_index]
            
            # Serialize the data
            serializer = MentorApprovalSerializer(paginated_mentors, many=True)
            
            logger.info("MentorApprovalListView.get successful")
            return Response({
                'mentors': serializer.data,
                'pagination': {
                    'total_mentors': total_mentors,
                    'total_pages': total_pages,
                    'current_page': page,
                    'page_size': page_size,
                    'has_next': page < total_pages,
                    'has_previous': page > 1,
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error listing mentors: {str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred while listing mentors"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class MentorDetailView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, mentor_id):
        """Get detailed mentor information"""
        logger.info("Entered MentorDetailView.get")
        try:
            try:
                mentor = Mentor.objects.select_related('user', 'approved_by').get(id=mentor_id)
            except Mentor.DoesNotExist:
                return Response(
                    {'error': 'Mentor not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            serializer = MentorDetailSerializer(mentor)
            logger.info("MentorDetailView.get successful")
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting mentor detail: {str(e)}", exc_info=True)
            return Response(
                {'error': 'An error occurred while fetching mentor details'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ApproveMentorView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, mentor_id):
        """Approve a mentor application"""
        logger.info("Entered ApproveMentorView.post")
        try:
            try:
                mentor = Mentor.objects.select_related('user').get(id=mentor_id)
            except Mentor.DoesNotExist:
                return Response(
                    {'error': 'Mentor not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            if mentor.approval_status == 'approved':
                return Response(
                    {'error': 'Mentor is already approved'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update mentor status
            mentor.approval_status = 'approved'
            mentor.is_approved = True
            mentor.approved_at = timezone.now()
            mentor.approved_by = request.user
            mentor.save()
            
            # Update user mentor status if not already set
            if not mentor.user.is_mentor:
                mentor.user.is_mentor = True
                mentor.user.save()
            
            # Create or update approval request record
            approval_request, created = MentorApprovalRequest.objects.get_or_create(
                mentor=mentor,
                defaults={
                    'status': 'approved',
                    'processed_by': request.user,
                    'processed_at': timezone.now(),
                }
            )
            
            if not created:
                approval_request.status = 'approved'
                approval_request.processed_by = request.user
                approval_request.processed_at = timezone.now()
                approval_request.save()
            
            logger.info(f"Mentor approved: {mentor.user.name} by {request.user.email}")
            logger.info("ApproveMentorView.post successful")
            return Response({
                'message': f'Mentor application for {mentor.user.name} has been approved successfully',
                'mentor_id': mentor.id,
                'status': 'approved'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error approving mentor: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Failed to approve mentor: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
class RejectMentorView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, mentor_id):
        """Reject a mentor application"""
        logger.info("Entered RejectMentorView.post")
        try:
            # Validate mentor_id
            if not mentor_id or not str(mentor_id).isdigit():
                return Response(
                    {'error': 'Invalid mentor ID'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get mentor
            try:
                mentor = Mentor.objects.select_related('user').get(id=mentor_id)
            except Mentor.DoesNotExist:
                logger.warning(f"Mentor with ID {mentor_id} not found")
                return Response(
                    {'error': 'Mentor not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check current status
            if mentor.approval_status == 'rejected':
                return Response(
                    {'error': 'Mentor application is already rejected'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if mentor.approval_status == 'approved':
                return Response(
                    {'error': 'Cannot reject an already approved mentor'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get rejection reason from request
            rejection_reason = ""
            if hasattr(request, 'data') and request.data:
                rejection_reason = request.data.get('rejection_reason', '')
            
            # Validate rejection reason
            if not rejection_reason or len(rejection_reason.strip()) < 10:
                return Response(
                    {'error': 'Rejection reason must be at least 10 characters long'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Clean the rejection reason
            rejection_reason = rejection_reason.strip()[:500]  # Limit to 500 chars
            
            # Update mentor status
            mentor.approval_status = 'rejected'
            mentor.rejection_reason = rejection_reason
            mentor.is_approved = False
            mentor.approved_at = timezone.now()
            mentor.approved_by = request.user
            
            # Save mentor
            try:
                mentor.save()
            except Exception as save_error:
                logger.error(f"Error saving mentor rejection: {str(save_error)}", exc_info=True)
                return Response(
                    {'error': 'Failed to save rejection status'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Update user status
            try:
                if mentor.user.is_mentor:
                    mentor.user.is_mentor = False
                    mentor.user.save()
            except Exception as user_error:
                logger.warning(f"Error updating user mentor status: {str(user_error)}")
                # Don't fail the whole operation for this
            
            # Handle approval request record
            try:
                approval_request, created = MentorApprovalRequest.objects.get_or_create(
                    mentor=mentor,
                    defaults={
                        'status': 'rejected',
                        'processed_by': request.user,
                        'processed_at': timezone.now(),
                        'rejection_reason': rejection_reason,
                    }
                )
                
                if not created:
                    approval_request.status = 'rejected'
                    approval_request.processed_by = request.user
                    approval_request.processed_at = timezone.now()
                    approval_request.rejection_reason = rejection_reason
                    approval_request.save()
            except Exception as approval_error:
                logger.warning(f"Error handling approval request: {str(approval_error)}")
                # Don't fail the main operation
            
            # Log successful rejection
            logger.info(f"Mentor rejected: {mentor.user.name} (ID: {mentor.id}) by {request.user.email}")
            logger.info("RejectMentorView.post successful")
            # Return success response
            return Response({
                'message': f'Mentor application for {mentor.user.name} has been rejected successfully',
                'mentor_id': mentor.id,
                'status': 'rejected',
                'rejection_reason': rejection_reason,
                'processed_at': mentor.approved_at.isoformat() if mentor.approved_at else None
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Unexpected error rejecting mentor {mentor_id}: {str(e)}", exc_info=True)
            return Response(
                {'error': 'An unexpected error occurred while rejecting the mentor application'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MentorApprovalStatsView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        """Get statistics for mentor approvals"""
        logger.info("Entered MentorApprovalStatsView.get")
        try:
            stats = {
                'total_mentors': Mentor.objects.count(),
                'pending_approvals': Mentor.objects.filter(approval_status='pending').count(),
                'approved_mentors': Mentor.objects.filter(approval_status='approved').count(),
                'rejected_mentors': Mentor.objects.filter(approval_status='rejected').count(),
            }
            
            logger.info("MentorApprovalStatsView.get successful")
            return Response(stats, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting mentor stats: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Failed to get stats: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AdminWalletView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        logger.info("Entered AdminWalletView.get")
        try:
            # Pagination parameters
            page = request.GET.get('page', 1)
            page_size = request.GET.get('page_size', 10)

            try:
                page_size = max(5, min(50, int(page_size)))
            except (ValueError, TypeError):
                page_size = 10

            # Get all earnings (platform's revenue source)
            all_earnings = MentorEarnings.objects.all().select_related(
                'mentor', 'mentor__user', 'session', 'session__student'
            ).prefetch_related('session__subjects')

            # Wallet summary for admin (platform commissions)
            wallet_summary = self.calculate_admin_wallet_summary(all_earnings)

            # Pagination
            earnings_queryset = all_earnings.order_by('-created_at')
            paginator = Paginator(earnings_queryset, page_size)

            try:
                earnings_page = paginator.page(page)
            except PageNotAnInteger:
                earnings_page = paginator.page(1)
            except EmptyPage:
                earnings_page = paginator.page(paginator.num_pages)

            # Serialize paginated earnings
            earnings_serializer = AdminEarningsSerializer(earnings_page, many=True)

            pagination_info = {
                'current_page': earnings_page.number,
                'total_pages': paginator.num_pages,
                'total_items': paginator.count,
                'page_size': page_size,
                'has_next': earnings_page.has_next(),
                'has_previous': earnings_page.has_previous(),
                'next_page': earnings_page.next_page_number() if earnings_page.has_next() else None,
                'previous_page': earnings_page.previous_page_number() if earnings_page.has_previous() else None,
            }

            data = {
                'wallet_summary': wallet_summary,
                'earnings': earnings_serializer.data,
                'earnings_count': paginator.count,
                'pagination': pagination_info
            }

            logger.info("AdminWalletView.get successful")
            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error in AdminWalletView.get: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Failed to fetch admin wallet data: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def calculate_admin_wallet_summary(self, earnings):
        now = timezone.now()
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Platform's total commission earnings
        total_platform_commission = earnings.aggregate(
            total=Sum('platform_commission')
        )['total'] or Decimal('0.00')

        # Available balance (could be same as total or minus any admin payouts if applicable)
        available_balance = total_platform_commission

        # Pending commissions (if you track admin payout status) for future use
        pending_commissions = earnings.filter(
            payout_status__in=['pending', 'processing']
        ).aggregate(
            total=Sum('platform_commission')
        )['total'] or Decimal('0.00')

        # This month's commission
        this_month_commission = earnings.filter(
            created_at__gte=current_month_start
        ).aggregate(
            total=Sum('platform_commission')
        )['total'] or Decimal('0.00')

        # Additional stats for admin
        total_sessions = MentorSession.objects.count()
        total_mentors = Mentor.objects.count()
        total_students = earnings.values('session__student').distinct().count()

        return {
            'total_platform_commission': total_platform_commission,
            'available_balance': available_balance,
            'pending_commissions': pending_commissions,
            'total_sessions': total_sessions,
            'this_month_commission': this_month_commission,
            'total_mentors': total_mentors,
            'total_students': total_students
        }

class AdminFocusBuddySessionListView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        """List all focus buddy sessions with search, filter, and pagination"""
        logger.info("Entered AdminFocusBuddySessionListView.get")
        try:
            # Get query parameters
            search_query = request.query_params.get('search', '')
            status_filter = request.query_params.get('status', 'all')
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 10))
            
            # Validate page_size
            page_size = max(5, min(50, page_size))
            
            # Base queryset
            queryset = FocusBuddySession.objects.select_related('creator_id').all()
            
            # Apply status filter
            if status_filter and status_filter != 'all':
                queryset = queryset.filter(status=status_filter)
            
            # Apply search filter
            if search_query:
                from django.db.models import Q
                queryset = queryset.filter(
                    Q(title__icontains=search_query) |
                    Q(creator_id__name__icontains=search_query) |
                    Q(creator_id__email__icontains=search_query) |
                    Q(session_type__icontains=search_query)
                )
            
            # Order by creation date (newest first)
            queryset = queryset.order_by('-created_at')
            
            # Manual pagination
            total_sessions = queryset.count()
            total_pages = (total_sessions + page_size - 1) // page_size
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            paginated_sessions = queryset[start_index:end_index]
            
            # Serialize the sessions
            serializer = FocusBuddySessionSerializer(paginated_sessions, many=True)
            
            logger.info("AdminFocusBuddySessionListView.get successful")
            return Response({
                'sessions': serializer.data,
                'pagination': {
                    'total_sessions': total_sessions,
                    'total_pages': total_pages,
                    'current_page': page,
                    'page_size': page_size,
                    'has_next': page < total_pages,
                    'has_previous': page > 1
                }
            }, status=status.HTTP_200_OK)
            
        except ValueError as e:
            logger.error(f"Invalid parameter in focus sessions list: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Invalid pagination parameters'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error listing focus buddy sessions: {str(e)}", exc_info=True)
            return Response(
                {'error': 'An error occurred while listing focus buddy sessions'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AdminFocusBuddySessionDetailView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, session_id):
        """Get detailed information about a specific focus buddy session"""
        logger.info("Entered AdminFocusBuddySessionDetailView.get")
        try:
            try:
                session = FocusBuddySession.objects.select_related('creator_id').get(id=session_id)
            except FocusBuddySession.DoesNotExist:
                return Response(
                    {'error': 'Focus buddy session not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            serializer = FocusBuddySessionDetailSerializer(session)
            logger.info("AdminFocusBuddySessionDetailView.get successful")
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting focus buddy session detail: {str(e)}", exc_info=True)
            return Response(
                {'error': 'An error occurred while fetching session details'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AdminFocusBuddySessionStatsView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        """Get statistics for focus buddy sessions"""
        logger.info("Entered AdminFocusBuddySessionStatsView.get")
        try:
            from django.utils import timezone
            from datetime import timedelta
            
            now = timezone.now()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            week_start = today_start - timedelta(days=7)
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            # Basic counts
            total_sessions = FocusBuddySession.objects.count()
            active_sessions = FocusBuddySession.objects.filter(status='active').count()
            completed_sessions = FocusBuddySession.objects.filter(status='completed').count()
            cancelled_sessions = FocusBuddySession.objects.filter(status='cancelled').count()
            expired_sessions = FocusBuddySession.objects.filter(status='expired').count()
            
            # Time-based stats
            today_sessions = FocusBuddySession.objects.filter(created_at__gte=today_start).count()
            week_sessions = FocusBuddySession.objects.filter(created_at__gte=week_start).count()
            month_sessions = FocusBuddySession.objects.filter(created_at__gte=month_start).count()
            
            # Session type breakdown
            session_types = FocusBuddySession.objects.values('session_type').annotate(
                count=models.Count('id')
            ).order_by('-count')
            
            # Duration breakdown
            duration_stats = FocusBuddySession.objects.values('duration_minutes').annotate(
                count=models.Count('id')
            ).order_by('duration_minutes')
            
            # Most active creators (top 5)
            top_creators = FocusBuddySession.objects.values(
                'creator_id__name',
                'creator_id__email'
            ).annotate(
                session_count=models.Count('id')
            ).order_by('-session_count')[:5]
            
            stats = {
                'overview': {
                    'total_sessions': total_sessions,
                    'active_sessions': active_sessions,
                    'completed_sessions': completed_sessions,
                    'cancelled_sessions': cancelled_sessions,
                    'expired_sessions': expired_sessions
                },
                'time_based': {
                    'today_sessions': today_sessions,
                    'week_sessions': week_sessions,
                    'month_sessions': month_sessions
                },
                'breakdown': {
                    'by_type': list(session_types),
                    'by_duration': list(duration_stats)
                },
                'top_creators': list(top_creators)
            }
            
            logger.info("AdminFocusBuddySessionStatsView.get successful")
            return Response(stats, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting focus buddy session stats: {str(e)}", exc_info=True)
            return Response(
                {'error': 'An error occurred while fetching session statistics'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AdminEndFocusBuddySessionView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, session_id):
        """Admin action to end a focus buddy session"""
        logger.info("Entered AdminEndFocusBuddySessionView.post")
        try:
            try:
                session = FocusBuddySession.objects.get(id=session_id)
            except FocusBuddySession.DoesNotExist:
                return Response(
                    {'error': 'Focus buddy session not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            if session.status != 'active':
                return Response(
                    {'error': f'Session is already {session.status}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get reason for ending session
            reason = request.data.get('reason', 'admin_ended')
            if reason not in ['completed', 'cancelled', 'expired', 'admin_ended']:
                reason = 'admin_ended'
            
            # End the session
            session.end_session(reason=reason)
            
            logger.info(f"Focus buddy session {session_id} ended by admin {request.user.email}, reason: {reason}")
            logger.info("AdminEndFocusBuddySessionView.post successful")
            return Response({
                'message': f'Focus buddy session ended successfully',
                'session_id': session.id,
                'status': session.status,
                'ended_at': session.ended_at
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error ending focus buddy session: {str(e)}", exc_info=True)
            return Response(
                {'error': 'An error occurred while ending the session'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AdminDashboardView(APIView):
    """
    Main admin dashboard view that provides all the data needed for the dashboard
    """
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        logger.info("Entered AdminDashboardView.get")
        try:
            # Get key metrics
            metrics = self.get_key_metrics()
            
            # Get usage data
            usage_data = self.get_usage_data(request.GET.get('period', 'daily'))
            
            # Get recent activities
            recent_activities = self.get_recent_activities()
            
            # Combine all data
            dashboard_data = {
                'metrics': metrics,
                'usage_data': usage_data,
                'recent_activities': recent_activities
            }
            
            serializer = AdminDashboardSerializer(dashboard_data)
            logger.info("AdminDashboardView.get successful")
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in AdminDashboardView.get: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Failed to fetch dashboard data: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get_key_metrics(self):
        """Get key platform metrics"""
        return {
            'registered_users': User.objects.count(),
            'approved_mentors': Mentor.objects.filter(is_approved=True).count(),
            'total_focus_sessions': FocusBuddySession.objects.count(),
            'total_mentor_sessions': MentorSession.objects.count(),
            'pending_mentor_approvals': MentorApprovalRequest.objects.filter(status='pending').count()
        }

    def get_usage_data(self, period='daily'):
        """Get usage statistics for charts"""
        now = timezone.now()
        
        if period == 'daily':
            # Get last 7 days
            data = []
            for i in range(6, -1, -1):
                date = now - timedelta(days=i)
                day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
                day_end = day_start + timedelta(days=1)
                
                # Count sessions for this day
                focus_sessions = FocusBuddySession.objects.filter(
                    created_at__range=[day_start, day_end]
                ).count()
                
                mentor_sessions = MentorSession.objects.filter(
                    created_at__range=[day_start, day_end]
                ).count()
                
                # Calculate total hours (approximate)
                total_hours = (focus_sessions * 0.5) + (mentor_sessions * 1.0)  # Rough estimate
                
                data.append({
                    'day': date.strftime('%a'),
                    'sessions': focus_sessions + mentor_sessions,
                    'hours': total_hours
                })
        
        elif period == 'weekly':
            # Get last 4 weeks
            data = []
            for i in range(3, -1, -1):
                week_start = now - timedelta(weeks=i+1)
                week_end = week_start + timedelta(weeks=1)
                
                focus_sessions = FocusBuddySession.objects.filter(
                    created_at__range=[week_start, week_end]
                ).count()
                
                mentor_sessions = MentorSession.objects.filter(
                    created_at__range=[week_start, week_end]
                ).count()
                
                total_hours = (focus_sessions * 0.5) + (mentor_sessions * 1.0)
                
                data.append({
                    'week': f'Week {4-i}',
                    'sessions': focus_sessions + mentor_sessions,
                    'hours': total_hours
                })
        
        return {
            'period': period,
            'data': data
        }

    def get_recent_activities(self):
        """Get recent platform activities"""
        activities = []
        now = timezone.now()
        
        # Get recent registrations
        recent_users = User.objects.filter(
            date_joined__gte=now - timedelta(hours=24)
        ).order_by('-date_joined')[:3]
        
        for user in recent_users:
            time_ago = self.get_time_ago(user.date_joined)
            activities.append({
                'id': user.id,
                'user': user.email,
                'action': 'New registration',
                'time': time_ago,
                'type': 'signup'
            })
        
        # Get recent mentor sessions
        recent_sessions = MentorSession.objects.filter(
            created_at__gte=now - timedelta(hours=24)
        ).select_related('student', 'mentor__user').order_by('-created_at')[:3]
        
        for session in recent_sessions:
            time_ago = self.get_time_ago(session.created_at)
            activities.append({
                'id': session.id,
                'user': session.student.email,
                'action': f'Booked session with {session.mentor.user.name}',
                'time': time_ago,
                'type': 'session'
            })
        
        # Get recent focus sessions
        recent_focus = FocusBuddySession.objects.filter(
            created_at__gte=now - timedelta(hours=24)
        ).select_related('creator_id').order_by('-created_at')[:3]
        
        for session in recent_focus:
            time_ago = self.get_time_ago(session.created_at)
            activities.append({
                'id': session.id,
                'user': session.creator_id.email,
                'action': 'Started a focus session',
                'time': time_ago,
                'type': 'session'
            })
        
        # Get recent journal entries
        recent_journals = Journal.objects.filter(
            created_at__gte=now - timedelta(hours=24)
        ).select_related('user').order_by('-created_at')[:2]
        
        for journal in recent_journals:
            time_ago = self.get_time_ago(journal.created_at)
            activities.append({
                'id': journal.id,
                'user': journal.user.email,
                'action': 'Created a journal entry',
                'time': time_ago,
                'type': 'journal'
            })
        
        # Sort all activities by time and return top 7
        activities.sort(key=lambda x: x['time'])
        return activities[:7]

    def get_time_ago(self, timestamp):
        """Convert timestamp to human readable time ago"""
        now = timezone.now()
        diff = now - timestamp
        
        if diff.days > 0:
            return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            return "Just now"


class AdminUsageGraphView(APIView):
    """
    Separate view for usage graph data with more detailed control
    """
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        logger.info("Entered AdminUsageGraphView.get")
        period = request.GET.get('period', 'daily')
        
        try:
            dashboard_view = AdminDashboardView()
            usage_data = dashboard_view.get_usage_data(period)
            
            serializer = UsageDataSerializer(usage_data)
            logger.info("AdminUsageGraphView.get successful")
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in AdminUsageGraphView.get: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Failed to fetch usage data: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminRecentActivityView(APIView):
    """
    Separate view for recent activity feed
    """
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        logger.info("Entered AdminRecentActivityView.get")
        try:
            dashboard_view = AdminDashboardView()
            activities = dashboard_view.get_recent_activities()
            
            serializer = RecentActivitySerializer(activities, many=True)
            logger.info("AdminRecentActivityView.get successful")
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in AdminRecentActivityView.get: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Failed to fetch recent activities: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminMetricsView(APIView):
    """
    View for key platform metrics
    """
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        logger.info("Entered AdminMetricsView.get")
        try:
            dashboard_view = AdminDashboardView()
            metrics = dashboard_view.get_key_metrics()
            
            serializer = AdminMetricsSerializer(metrics)
            logger.info("AdminMetricsView.get successful")
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in AdminMetricsView.get: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Failed to fetch metrics: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminUserListView(APIView):
    """
    View for detailed user list with activity data
    """
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        logger.info("Entered AdminUserListView.get")
        try:
            users = User.objects.annotate(
                total_focus_sessions=Count('focus_participations'),
                total_mentor_sessions=Count('student_sessions'),
                total_tasks=Count('tasks'),
                total_journal_entries=Count('journals')
            ).order_by('-date_joined')
            
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 20))
            
            start = (page - 1) * page_size
            end = start + page_size
            
            paginated_users = users[start:end]
            
            serializer = UserActivitySerializer(paginated_users, many=True)
            
            logger.info("AdminUserListView.get successful")
            return Response({
                'users': serializer.data,
                'total_count': users.count(),
                'page': page,
                'page_size': page_size,
                'total_pages': (users.count() + page_size - 1) // page_size
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in AdminUserListView.get: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Failed to fetch users: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )



class AdminPlatformStatsView(APIView):
    """
    View for detailed platform statistics
    """
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        logger.info("Entered AdminPlatformStatsView.get")
        try:
            now = timezone.now()
            today = now.date()
            week_ago = now - timedelta(days=7)
            month_ago = now - timedelta(days=30)
            
            # User statistics
            total_users = User.objects.count()
            active_users_today = User.objects.filter(
                last_login__date=today
            ).count()
            active_users_week = User.objects.filter(
                last_login__gte=week_ago
            ).count()
            active_users_month = User.objects.filter(
                last_login__gte=month_ago
            ).count()
            
            # Mentor statistics
            total_mentors = Mentor.objects.count()
            active_mentors = Mentor.objects.filter(
                is_approved=True, is_available=True
            ).count()
            pending_mentors = Mentor.objects.filter(
                approval_status='pending'
            ).count()
            
            # Session statistics
            total_sessions = MentorSession.objects.count()
            completed_sessions = MentorSession.objects.filter(
                status='completed'
            ).count()
            cancelled_sessions = MentorSession.objects.filter(
                status='cancelled'
            ).count()
            
            # Focus session statistics
            total_focus_sessions = FocusBuddySession.objects.count()
            active_focus_sessions = FocusBuddySession.objects.filter(
                status='active'
            ).count()
            
            # Task statistics
            total_tasks = Task.objects.count()
            completed_tasks = Task.objects.filter(is_completed=True).count()
            
            # Journal statistics
            total_journal_entries = Journal.objects.count()
            journal_entries_today = Journal.objects.filter(
                created_at__date=today
            ).count()
            
            # Rating statistics
            avg_session_rating = MentorSession.objects.filter(
                student_rating__isnull=False
            ).aggregate(Avg('student_rating'))['student_rating__avg'] or 0
            
            # Revenue statistics
            total_revenue = SessionPayment.objects.filter(
                status='completed'
            ).aggregate(Sum('amount'))['amount__sum'] or 0
            
            stats = {
                'total_users': total_users,
                'active_users_today': active_users_today,
                'active_users_week': active_users_week,
                'active_users_month': active_users_month,
                'total_mentors': total_mentors,
                'active_mentors': active_mentors,
                'pending_mentors': pending_mentors,
                'total_sessions': total_sessions,
                'completed_sessions': completed_sessions,
                'cancelled_sessions': cancelled_sessions,
                'total_focus_sessions': total_focus_sessions,
                'active_focus_sessions': active_focus_sessions,
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'total_journal_entries': total_journal_entries,
                'journal_entries_today': journal_entries_today,
                'avg_session_rating': round(avg_session_rating, 2),
                'total_revenue': total_revenue
            }
            
            serializer = PlatformStatsSerializer(stats)
            logger.info("AdminPlatformStatsView.get successful")
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in AdminPlatformStatsView.get: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Failed to fetch platform stats: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class MentorReportListAPIView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        logger.info("Entered MentorReportListAPIView.get")
        try:
            reports = MentorReport.objects.select_related('mentor__user', 'reporter', 'session').all()
            serializer = MentorReportListSerializer(reports, many=True)
            logger.info("MentorReportListAPIView.get successful")
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error in MentorReportListAPIView.get: {str(e)}", exc_info=True)
            return Response({"error": "Failed to fetch mentor reports"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

