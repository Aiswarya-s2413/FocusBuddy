from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.contrib.auth import logout
from .serializers import AdminLoginSerializer, UserListSerializer, UserEditSerializer
from userapp.models import User
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.authentication import JWTAuthentication
import logging
from rest_framework.permissions import AllowAny
from rest_framework.decorators import permission_classes

logger = logging.getLogger(__name__)

class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        # Get the token from cookies
        access_token = request.COOKIES.get('admin_access')
        if not access_token:
            return None

        try:
            # Validate the token
            validated_token = self.get_validated_token(access_token)
            return self.get_user(validated_token), validated_token
        except (InvalidToken, TokenError) as e:
            return None

@permission_classes([AllowAny])
class AdminLoginView(APIView):
    def post(self, request):
        serializer = AdminLoginSerializer(data=request.data)
        if not serializer.is_valid():
            print(serializer.errors)
        if serializer.is_valid():
            data = serializer.validated_data
            response = Response({"message": "Login successful", "user": data["user"]}, status=status.HTTP_200_OK)
            response.set_cookie(
                "admin_access", data["access"], httponly=True, 
                secure=False, samesite="Lax", path="/"
            )
            response.set_cookie(
                "admin_refresh", data["refresh"], httponly=True, 
                secure=False, samesite="Lax", path="/"
            )
            return response
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AdminLogoutView(APIView):
    def post(self, request):
        try:
            response = Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
            
            # Delete both cookies with ALL the same parameters used when setting them
            response.delete_cookie(
                'admin_access', 
                path='/', 
                samesite='Lax',
                httponly=True,  # This matches the setting parameter
                secure=False    # This matches the setting parameter
            )
            response.delete_cookie(
                'admin_refresh', 
                path='/', 
                samesite='Lax',
                httponly=True,  # This matches the setting parameter
                secure=False    # This matches the setting parameter
            )
            
            # Try to logout if user is authenticated
            if request.user.is_authenticated:
                logout(request)
                
            return response
        except Exception as e:
            logger.error(f"Error during logout: {str(e)}")
            # Still try to delete cookies even if there's an error
            response = Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
            
            # Use the same parameters here too
            response.delete_cookie(
                'admin_access', 
                path='/', 
                samesite='Lax',
                httponly=True,
                secure=False
            )
            response.delete_cookie(
                'admin_refresh', 
                path='/', 
                samesite='Lax',
                httponly=True,
                secure=False
            )
            
            return response
class UserListView(APIView):
    authentication_classes = [CookieJWTAuthentication]
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
    authentication_classes = [CookieJWTAuthentication]
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
    authentication_classes = [CookieJWTAuthentication]
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

class AdminCheckAuthView(APIView):
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
                AccessToken(access_token)
                # If token is valid, return success response
                return Response({
                    "message": "Authentication successful",
                    "user": {
                        "email": request.user.email if hasattr(request.user, 'email') else None,
                        "name": request.user.name if hasattr(request.user, 'name') else None
                    }
                }, status=status.HTTP_200_OK)
            except (InvalidToken, TokenError) as e:
                return Response(
                    {"error": "Invalid or expired token."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        except Exception as e:
            logger.error(f"Error checking authentication: {str(e)}")
            return Response(
                {"error": "An error occurred while checking authentication"},
                status=status.HTTP_400_BAD_REQUEST
            )

class AdminRefreshTokenView(APIView):
    def post(self, request):
        try:
            # Get refresh token from cookies
            refresh_token = request.COOKIES.get('admin_refresh')
            
            if not refresh_token:
                return Response(
                    {"error": "Refresh token not provided."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            try:
                # Validate refresh token
                refresh = RefreshToken(refresh_token)
                # Generate new access token
                access_token = str(refresh.access_token)
                
                response = Response({
                    "message": "Token refreshed successfully"
                }, status=status.HTTP_200_OK)
                
                # Set new access token in cookie
                response.set_cookie(
                    "admin_access", access_token, httponly=True, 
                    secure=False, samesite="Lax", path="/"
                )
                
                return response
            except (InvalidToken, TokenError) as e:
                return Response(
                    {"error": "Invalid or expired refresh token."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        except Exception as e:
            logger.error(f"Error refreshing token: {str(e)}")
            return Response(
                {"error": "An error occurred while refreshing token"},
                status=status.HTTP_400_BAD_REQUEST
            )

class AdminJournalListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        # Get query parameters for search and pagination
        search_query = request.query_params.get('search', '')
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        
        # Perform search if query is provided
        if search_query:
            journals = Journal.objects.filter(
                Q(user__username__icontains=search_query) | 
                Q(mood__icontains=search_query)
            ).select_related('user')
        else:
            journals = Journal.objects.all().select_related('user')
        
        # Paginate the results
        paginator = Paginator(journals, page_size)
        current_page = paginator.page(page)
        
        # Serialize the paginated data
        serializer = JournalListSerializer(current_page.object_list, many=True)
        
        # Prepare pagination info
        pagination_data = {
            'total_journals': paginator.count,
            'total_pages': paginator.num_pages,
            'current_page': page,
            'page_size': page_size,
            'has_next': current_page.has_next(),
            'has_previous': current_page.has_previous()
        }
        
        return Response({
            'journals': serializer.data,
            'pagination': pagination_data
        })

class AdminJournalDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request, journal_id):
        try:
            journal = Journal.objects.select_related('user').get(pk=journal_id)
            serializer = JournalDetailSerializer(journal)
            return Response(serializer.data)
        except Journal.DoesNotExist:
            return Response(
                {'error': 'Journal not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

class AdminBlockJournalView(APIView):
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