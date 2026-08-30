FROM python:3.14-slim
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -e .
ENV FLAXON_ENV=production
CMD ["flaxon", "run", "app:app", "--host", "0.0.0.0", "--port", "8000"]
