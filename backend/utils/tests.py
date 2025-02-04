from django.test import TestCase, override_settings
from django.urls import reverse
from unittest.mock import patch
from .views import KhataNumbersView  # Import the view being tested
from land_value.data_manager import all_manager  # Import the DataManager class

class KhataNumbersAPITest(TestCase):
    @patch('land_value.data_manager.all_manager.textual_data_manager.get_khata_from_village')  # Mock the DataManager method
    def test_get_khata_numbers_success(self, mock_get_khata_from_village):
        """
        Test successful response when valid parameters are provided.
        """
        # Mock the return value of get_khata_from_village
        mock_get_khata_from_village.return_value = ['123', '456', '789']

        # Define query parameters
        params = {
            'district': 'jalgaon',
            'taluka_name': 'parola',
            'village_name': 'mohadi',
        }

        # Make a GET request to the API endpoint
        url = reverse('khata_numbers')  # Use the name of the URL pattern
        response = self.client.get(url, params)

        # Validate the response
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'khata_numbers': ['123', '456', '789']})

    def test_get_khata_numbers_missing_parameters(self):
        """
        Test error response when required parameters are missing.
        """
        # Make a GET request with missing parameters
        url = reverse('khata_numbers')
        response = self.client.get(url)

        # Validate the response
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {'error': 'Missing required parameters: district, taluka_name, village_name'})

    @patch('land_value.data_manager.all_manager.textual_data_manager.get_khata_from_village')
    def test_get_khata_numbers_empty_result(self, mock_get_khata_from_village):
        """
        Test response when no khata numbers are found.
        """
        # Mock the return value of get_khata_from_village to be an empty list
        mock_get_khata_from_village.return_value = []

        # Define query parameters
        params = {
            'district': 'example_district',
            'taluka_name': 'example_taluka',
            'village_name': 'example_village',
        }

        # Make a GET request to the API endpoint
        url = reverse('khata_numbers')
        response = self.client.get(url, params)

        # Validate the response
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'khata_numbers': []})

    @patch('land_value.data_manager.all_manager.textual_data_manager.get_khata_from_village')
    def test_get_khata_numbers_exception(self, mock_get_khata_from_village):
        """
        Test error response when an exception occurs.
        """
        # Mock the get_khata_from_village method to raise an exception
        mock_get_khata_from_village.side_effect = Exception("Database error")

        # Define query parameters
        params = {
            'district': 'example_district',
            'taluka_name': 'example_taluka',
            'village_name': 'example_village',
        }

        # Make a GET request to the API endpoint
        url = reverse('khata_numbers')
        response = self.client.get(url, params)

        # Validate the response
        self.assertEqual(response.status_code, 500)
        self.assertIn('error', response.json())