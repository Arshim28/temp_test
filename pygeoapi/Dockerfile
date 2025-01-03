FROM python:3.10.12

WORKDIR /app

RUN apt-get update && apt-get install -y libpq-dev gcc
RUN pip install --no-cache-dir pygeoapi

COPY . .

EXPOSE 5000

CMD ["pygeoapi", "server", "--django"]