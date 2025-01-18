# Terra Backend

## Prerequisites

1. Python 3.8+
2. pip (Python package installer)
3. Virtual Environment (optional but recommended)

## Setup Instructions

### Step 1: Clone the Repository

Clone the repository to your local machine:

```bash
git clone https://github.com/terrastack-tech/terraview-django
cd terraview-django/backend
```

### Step 2: Set Up Virtual Environment (Recommended)

Create and activate a virtual environment:

```bash
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
```

### Step 3: Install Dependencies

Install the required Python packages:

```bash
pip install -r requirements.txt
```

### Step 4: Apply Migrations

Run database migrations to set up the schema:

```bash
python manage.py migrate
```

### Step 5: Create a Superuser

Create an admin user to access the Django admin panel:

```bash
python manage.py createsuperuser
```

### Step 6: Run the Server

Start the development server:

```bash
python manage.py runserver
```

Access the application at [http://127.0.0.1:8000](http://127.0.0.1:8000).

## Project Structure

- **base/**: Contains project-level configurations, settings, and WSGI/ASGI entry points.
- **user_auth/**: Handles user authentication, including custom backends, serializers, and views.
- **utils/**: Utility functions, models, and signals shared across the project.
- **requirements.txt**: Lists all the Python dependencies for the project.
