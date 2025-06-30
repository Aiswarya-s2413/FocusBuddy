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

from rest_framework import status
from django.http import JsonResponse
import traceback
import sys



logger = logging.getLogger(__name__)


@permission_classes([AllowAny])
class AdminLoginView(APIView):
    def post(self, request):
        
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
                logger.error(f"Error during login process: {str(e)}")
                return Response({
                    "error": "Login failed",
                    "detail": "An error occurred during authentication"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        logger.warning(f"Admin login validation failed: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AdminLogoutView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    def post(self, request):
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
            logger.error(f"Error during logout: {str(e)}")
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
            logger.error(f"Error checking authentication: {str(e)}")
            return Response(
                {"error": "An error occurred while checking authentication"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AdminRefreshTokenView(APIView):
    def post(self, request):
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
            
            # Set the new access token in cookie
            response.set_cookie(
                'admin_access',
                access_token,
                max_age=60 * 15,  # 15 minutes
                httponly=True,
                secure=True,  # Set to False if not using HTTPS in development
                samesite='Lax'
            )
            
            return response
            
        except TokenError as e:
            logger.error(f"Token refresh failed: {str(e)}")
            return Response(
                {'error': 'Invalid refresh token'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            logger.error(f"Unexpected error during token refresh: {str(e)}")
            return Response(
                {'error': 'Token refresh failed'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UserListView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        try:
            # Get search query and pagination parameters
            search_query = request.query_params.get('search', '')
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 10))
            
            # Filter users based on search query
            if search_query:
                users = User.objects.filter(
                    email__icontains=search_query
                ) | User.objects.filter(
                    name__icontains=search_query
                )
            else:
                users = User.objects.all()
            
            # Calculate pagination
            total_users = users.count()
            total_pages = (total_users + page_size - 1) // page_size
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            
            # Get paginated users
            paginated_users = users[start_index:end_index]
            
            # Serialize the data
            serializer = UserListSerializer(paginated_users, many=True)
            
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
            logger.error(f"Error listing users: {str(e)}")
            return Response(
                {"error": "An error occurred while listing users"},
                status=status.HTTP_400_BAD_REQUEST
            )

class UserEditView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def put(self, request, user_id):
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
                return Response({
                    "message": "User updated successfully",
                    "user": serializer.data
                }, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Error updating user: {str(e)}")
            return Response(
                {"error": "An error occurred while updating user"},
                status=status.HTTP_400_BAD_REQUEST
            )

class UserBlockView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, user_id):
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
            return Response({
                "message": f"User {action} successfully",
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "is_active": user.is_active
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error blocking/unblocking user: {str(e)}")
            return Response(
                {"error": "An error occurred while blocking/unblocking user"},
                status=status.HTTP_400_BAD_REQUEST
            )


class AdminJournalListView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
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
            logger.error(f"Error listing journals: {str(e)}")
            return Response(
                {"error": "An error occurred while listing journals"},
                status=status.HTTP_400_BAD_REQUEST
            )


class AdminJournalDetailView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request, journal_id):
        try:
            journal = Journal.objects.select_related('user').get(pk=journal_id)
            serializer = JournalDetailSerializer(journal)
            print(serializer.data)
            return Response(serializer.data)
        except Journal.DoesNotExist:
            return Response(
                {'error': 'Journal not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': 'An error occurred while fetching the journal'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AdminBlockJournalView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def post(self, request, journal_id):
        try:
            journal = Journal.objects.get(pk=journal_id)
            # Toggle the is_blocked status
            journal.is_blocked = not journal.is_blocked
            journal.save()
            
            action = "blocked" if journal.is_blocked else "unblocked"
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
            return Response(
                {'error': 'An error occurred while updating the journal'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
class MentorApprovalListView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        """List mentors with filtering, search and pagination"""
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
            logger.error(f"Error listing mentors: {str(e)}")
            return Response(
                {"error": "An error occurred while listing mentors"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class MentorDetailView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, mentor_id):
        """Get detailed mentor information"""
        try:
            try:
                mentor = Mentor.objects.select_related('user', 'approved_by').get(id=mentor_id)
            except Mentor.DoesNotExist:
                return Response(
                    {'error': 'Mentor not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            serializer = MentorDetailSerializer(mentor)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting mentor detail: {str(e)}")
            return Response(
                {'error': 'An error occurred while fetching mentor details'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ApproveMentorView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, mentor_id):
        """Approve a mentor application"""
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
            return Response({
                'message': f'Mentor application for {mentor.user.name} has been approved successfully',
                'mentor_id': mentor.id,
                'status': 'approved'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error approving mentor: {str(e)}")
            return Response(
                {'error': f'Failed to approve mentor: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
class RejectMentorView(APIView):
    authentication_classes = [AdminCookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, mentor_id):
        """Reject a mentor application"""
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
                logger.error(f"Error saving mentor rejection: {str(save_error)}")
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
        try:
            stats = {
                'total_mentors': Mentor.objects.count(),
                'pending_approvals': Mentor.objects.filter(approval_status='pending').count(),
                'approved_mentors': Mentor.objects.filter(approval_status='approved').count(),
                'rejected_mentors': Mentor.objects.filter(approval_status='rejected').count(),
            }
            
            return Response(stats, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting mentor stats: {str(e)}")
            return Response(
                {'error': f'Failed to get stats: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )