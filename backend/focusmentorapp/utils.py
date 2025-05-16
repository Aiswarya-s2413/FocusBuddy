from cloudinary.uploader import upload
from django.conf import settings
import logging
import os
import uuid
import json

logger = logging.getLogger(__name__)


class CloudinaryService:
    """Service class to handle Cloudinary image uploads"""
    
    @classmethod
    def upload_image(cls, image_file, folder='mentors'):
        """
        Upload an image to Cloudinary
        
        Args:
            image_file: The image file to upload
            folder: The Cloudinary folder to store the image in
            
        Returns:
            dict: Information about the uploaded image
        """
        try:
            if not image_file:
                return None
                
            # Generate a unique filename to prevent collisions
            filename = f"{uuid.uuid4()}{os.path.splitext(image_file.name)[1]}"
            
            # Upload to Cloudinary
            upload_result = upload(
                image_file,
                folder=folder,
                public_id=filename,
                overwrite=True,
                resource_type="image"
            )
            
            return {
                'public_id': upload_result.get('public_id'),
                'url': upload_result.get('secure_url'),
                'width': upload_result.get('width'),
                'height': upload_result.get('height')
            }
        except Exception as e:
            logger.error(f"Cloudinary upload error: {str(e)}")
            return None
            
    @classmethod
    def delete_image(cls, public_id):
        """
        Delete an image from Cloudinary
        
        Args:
            public_id: The public ID of the image to delete
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            if not public_id:
                return False
                
            from cloudinary.uploader import destroy
            destroy_result = destroy(public_id)
            
            return destroy_result.get('result') == 'ok'
        except Exception as e:
            logger.error(f"Cloudinary delete error: {str(e)}")
            return False



class ProfileDataConverter:
    """
    Utility class to handle conversion between frontend and backend profile data formats
    """
    
    @classmethod
    def frontend_to_backend(cls, frontend_data):
        """
        Convert frontend profile data format to backend format
        
        Args:
            frontend_data (dict): Profile data from frontend
            
        Returns:
            dict: Profile data in backend format
        """
        backend_data = {}
        
        # Map fields with different names or formats
        field_mapping = {
            'name': 'name',
            'title': 'title',
            'bio': 'bio',
            'subjects': 'subjects',
            'experience': 'experience',
            'hourlyRate': 'hourly_rate',
            'languages': 'languages',
            'expertiseLevel': 'expertise_level',
        }
        
        # Convert fields according to mapping
        for frontend_field, backend_field in field_mapping.items():
            if frontend_field in frontend_data:
                backend_data[backend_field] = frontend_data[frontend_field]
        
        # Handle specific conversions
        if 'expertiseLevel' in frontend_data:
            # Convert capitalized expertise level to lowercase
            backend_data['expertise_level'] = frontend_data['expertiseLevel'].lower()
        
        # Handle availability separately if needed
        availability_data = {}
        
        # Add languages to availability
        if 'languages' in frontend_data:
            languages = [lang.strip() for lang in frontend_data['languages'].split(',')]
            availability_data['languages'] = languages
            
        # Add professional title to availability
        if 'title' in frontend_data:
            availability_data['professional_title'] = frontend_data['title']
            
        if availability_data:
            backend_data['availability'] = availability_data
            
        return backend_data
    
    @classmethod
    def backend_to_frontend(cls, backend_data):
        """
        Convert backend profile data format to frontend format
        
        Args:
            backend_data (dict): Profile data from backend
            
        Returns:
            dict: Profile data in frontend format
        """
        frontend_data = {}
        
        # Map fields with different names or formats
        field_mapping = {
            'name': 'name',
            'bio': 'bio',
            'hourly_rate': 'hourlyRate',
            'expertise_level': 'expertiseLevel',
            'is_available': 'isAvailable',
            'email': 'email',
        }
        
        # Convert fields according to mapping
        for backend_field, frontend_field in field_mapping.items():
            if backend_field in backend_data:
                frontend_data[frontend_field] = backend_data[backend_field]
        
        # Handle specific conversions
        if 'expertise_level' in backend_data:
            # Convert lowercase expertise level to capitalized
            frontend_data['expertiseLevel'] = backend_data['expertise_level'].capitalize()
        
        # Get data from availability JSON
        availability = backend_data.get('availability', {})
        
        # Convert languages array to comma-separated string
        if 'languages' in availability:
            languages = availability['languages']
            if isinstance(languages, list):
                frontend_data['languages'] = ", ".join(languages)
            else:
                frontend_data['languages'] = str(languages)
        
        # Get professional title
        if 'professional_title' in availability:
            frontend_data['title'] = availability['professional_title']
        
        # Handle subjects
        if 'subjects' in backend_data:
            subjects = backend_data['subjects']
            if isinstance(subjects, list):
                # If it's an array of objects with name attribute
                if subjects and isinstance(subjects[0], dict) and 'name' in subjects[0]:
                    frontend_data['subjects'] = ", ".join([s['name'] for s in subjects])
                else:
                    frontend_data['subjects'] = ", ".join(subjects)
            else:
                frontend_data['subjects'] = str(subjects)
        
        # Handle experience
        if 'experience' in backend_data:
            experience = backend_data['experience']
            if isinstance(experience, int):
                frontend_data['experience'] = f"{experience}+ Years"
            else:
                frontend_data['experience'] = str(experience)
        
        # Add profile image URL
        if 'profile_image_url' in backend_data:
            frontend_data['imageUrl'] = backend_data['profile_image_url']
            
        return frontend_data