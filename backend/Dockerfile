FROM python:3.10.12

WORKDIR /app

RUN apt update && apt install -y libpq-dev gcc

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . . 
EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
