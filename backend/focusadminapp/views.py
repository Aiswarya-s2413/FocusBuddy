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
            # Try to blacklist refresh token if available
            refresh_token = request.COOKIES.get('admin_refresh')
            if refresh_token:
                try:
                    refresh = RefreshToken(refresh_token)
                    refresh.blacklist()
                    logger.info("Refresh token blacklisted successfully")
                except (InvalidToken, TokenError) as e:
                    logger.warning(f"Could not blacklist refresh token: {str(e)}")
                    pass
            
            response = Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
            
            # Delete cookies with EXACT same parameters used when setting them
            # The key is to match ALL parameters exactly
            # response.delete_cookie(
            #     'admin_access',
            #     path='/',
            #     domain=None,  # Must match the domain used when setting
            #     samesite='Lax'
            # )
            # response.delete_cookie(
            #     'admin_refresh',
            #     path='/',
            #     domain=None,  # Must match the domain used when setting
            #     samesite='Lax'
            # )
            
            # Alternative approach: Set cookies with past expiration date
            # This is more reliable for cookie deletion
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
@permission_classes([AllowAny])
class TestAdminJournalView(APIView):
    def get(self, request):
        try:
            # Step 1: Test basic response
            print("=== STEP 1: Basic response test ===")
            return Response({"message": "Basic response works"})
            
        except Exception as e:
            print(f"ERROR in Step 1: {str(e)}")
            print("TRACEBACK:")
            traceback.print_exc()
            return Response(
                {'error': f'Error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
@permission_classes([AllowAny])
class TestAdminJournalView2(APIView):
    def get(self, request):
        try:
            print("=== STEP 2: Testing model import ===")
            from userapp.models import Journal  
            print("=== STEP 3: Testing basic query ===")
            journals_count = Journal.objects.count()
            print(f"Found {journals_count} journals")
            
            return Response({
                "message": "Model import and basic query works",
                "count": journals_count
            })
            
        except Exception as e:
            print(f"ERROR in Step 2/3: {str(e)}")
            print("TRACEBACK:")
            traceback.print_exc()
            return Response(
                {'error': f'Error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
@permission_classes([AllowAny])
class TestAdminJournalView3(APIView):
    def get(self, request):
        try:
            print("=== STEP 4: Testing serializer ===")
            from userapp.models import Journal  # Replace with your app name
            from focusadminapp.serializers import JournalListSerializer  # Replace with your app name
            
            journals = Journal.objects.first()  # Get just one journal
            if journals.exists():
                journal = journals.first()
                print(f"Testing serializer with journal: {journal}")
                
                serializer = JournalListSerializer(journal)
                print(f"Serializer data: {serializer.data}")
                
                return Response({
                    "message": "Serializer works",
                    "data": serializer.data
                })
            else:
                return Response({
                    "message": "No journals found to test serializer"
                })
                
        except Exception as e:
            print(f"ERROR in Step 4: {str(e)}")
            print("TRACEBACK:")
            traceback.print_exc()
            return Response(
                {'error': f'Error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )