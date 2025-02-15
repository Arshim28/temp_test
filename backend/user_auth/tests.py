from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils.timezone import now
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from .models import OTPVerification, CustomUser
import uuid

User = get_user_model()

class UserAPITestCase(APITestCase):

    def setUp(self):
        """Set up test user and authenticate before running tests."""
        self.user_email = "test@example.com"
        self.user_password = "1234asdf"

        self.user = CustomUser.objects.create_user(
            email=self.user_email, password=self.user_password
        )

        login_url = reverse("user-login")
        login_data = {"user": {"email": self.user_email, "password": self.user_password}}
        response = self.client.post(login_url, login_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.access_token = response.data.get("token")

        # Ensure we have a valid token
        self.assertIsNotNone(self.access_token, "Token should not be None")

    def test_registration(self):
            """Tests the registration process."""

            verification_token = str(uuid.uuid4())

            otp_object = OTPVerification.objects.create(
                email="test@registration.com",
                is_verified=True,
                verification_token=verification_token,
                expires_at=timezone.now() + timezone.timedelta(minutes=10)
            )

            data = {
                "user": {
                    "email": "test@registration.com",
                    "password":"1234asdf",
                    "verification_token": verification_token,
                    "city": "Mumbai",
                    "district": "XYZ",
                    "state": "MH",
                    "postalCode": "400001",
                    "village": "SomeVillage",
                    "profile": {
                        "user_type":"Industry",
                        "login_as" : "Broker"
                    }
                }
            }


            url = reverse("user-registration")
            response = self.client.post(url, data, format="json")

            self.assertEqual(response.status_code, status.HTTP_201_CREATED)


    def test_login(self):
        """
        Test login functionality:
            - Sends login request with valid credentials
            - Verifies that a token is returned upon successful login
        """
        data = {"user": {"email": self.user_email, "password": self.user_password}}
        url = reverse("user-login")

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)

    def test_user_retrieve(self):
        """
        Test retrieving user details:
        - Ensures only authenticated users can access their profile
        - Uses proper authorization headers
        """
        url = reverse("user-detail")  # Replace with actual view name

        # Send request with Authorization header
        response = self.client.get(url, HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

        # Verify response status
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("email", response.data)  # Ensure email is returned
        self.assertEqual(response.data["email"], self.user_email)


    def test_request_and_verify_otp(self):
        data = {"email": "test@example.com"}
        response = self.client.post("/api/request-otp/", data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
