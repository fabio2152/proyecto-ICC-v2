# Backend FastAPI — imagen de producción
FROM python:3.11-slim

WORKDIR /app

# Dependencias (se cachean si requirements.txt no cambia)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Código de la app
COPY . .

# Carpeta de datos (montada como volumen en docker-compose para persistir la BD)
RUN mkdir -p /app/data

# En el primer arranque, si no existe la BD, la crea y la puebla con datos demo.
# El lifespan de FastAPI se encarga de tablas + usuarios core en cada arranque.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
