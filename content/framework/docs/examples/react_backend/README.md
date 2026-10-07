# Flaxon + React example

This example contains a Flaxon product API and a small Vite/React client.

Run the API from this directory:

```bash
flaxon run app:app --reload
```

In a second terminal, start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`). The backend allows that
origin through CORS and is expected at `http://127.0.0.1:8000`.
