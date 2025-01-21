from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .views import report_gen
from terra_utils import *
from land_value.data_manager import *  

class ReportGenTestCase(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.User = get_user_model()
        self.user = self.User.objects.create_user(
            email='test@example.com',
            password='password',
            name='Test User'
        )

    def test_report_gen(self):
        request = self.factory.get(
            '/report-gen/', 
            data={
                'state': 'maharashtra',
                'district': 'jalgaon',
                'taluka': 'parola',
                'village': 'mohadi',
                'survey_no': '167'
            }
        )

        force_authenticate(request, user=self.user)

        response = report_gen(request)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(isinstance(response, Response))
        print(response.data)  # Optional: Debugging
