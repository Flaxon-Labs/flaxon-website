# Large Application Example

This example demonstrates a production-style Flaxon application structure using:

- Routers
- Services
- Repositories
- Models
- Schemas
- Middleware
- JWT Authentication
- Configuration management

---

## Project Structure

```
myapp/
│
├── app.py
├── config.py
│
├── models/
│   └── user.py
│
├── schemas/
│   └── user.py
│
├── services/
│   └── user_service.py
│
├── repositories/
│   └── user_repository.py
│
├── routes/
│   ├── __init__.py
│   ├── users.py
│   └── auth.py
│
├── middleware/
│   └── auth.py
│
└── utils/
    └── db.py
```

---

# Application Code

## app.py

```python
from flaxon import Flaxon
from flaxon.middleware import (
    RequestIDMiddleware,
    SecurityHeadersMiddleware,
    CORSMiddleware,
)
from flaxon.security import (
    JWTBackend,
    AuthenticationMiddleware,
)

from config import Config
from routes import users, auth
from middleware.auth import AuthMiddleware


app = Flaxon(
    "myapp",
    debug=Config.DEBUG,
)


# Configuration
app.config.update(Config.to_dict())


# Middleware
app.add_middleware(RequestIDMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allowed_origins=Config.ALLOWED_ORIGINS,
    allow_credentials=True,
)

app.add_middleware(AuthMiddleware)


# Authentication
jwt_backend = JWTBackend(
    secret_key=Config.SECRET_KEY
)

app.add_middleware(
    AuthenticationMiddleware,
    backend=jwt_backend,
)


# Routes
app.include_router(auth.router)
app.include_router(users.router)


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "version": "1.0.0",
    }


@app.get("/")
async def home():
    return {
        "message": "Welcome to MyApp API",
        "version": "1.0.0",
    }
```

---

# config.py

```python
import os
from typing import Any


class Config:

    DEBUG = (
        os.environ.get(
            "DEBUG",
            "false"
        ).lower()
        == "true"
    )

    SECRET_KEY = os.environ.get(
        "SECRET_KEY",
        "change-me",
    )

    DATABASE_URL = os.environ.get(
        "DATABASE_URL",
        "sqlite:///app.db",
    )

    ALLOWED_ORIGINS = os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:3000",
    ).split(",")


    JWT_EXPIRATION = int(
        os.environ.get(
            "JWT_EXPIRATION",
            3600,
        )
    )


    @classmethod
    def to_dict(cls) -> dict[str, Any]:
        return {
            "DEBUG": cls.DEBUG,
            "SECRET_KEY": cls.SECRET_KEY,
            "DATABASE_URL": cls.DATABASE_URL,
            "ALLOWED_ORIGINS": cls.ALLOWED_ORIGINS,
            "JWT_EXPIRATION": cls.JWT_EXPIRATION,
        }
```

---

# repositories/user_repository.py

```python
from typing import Optional

from models.user import User


class UserRepository:

    def __init__(self, db):
        self.db = db


    async def get_by_id(
        self,
        user_id: int
    ) -> Optional[User]:

        row = await self.db.fetch_one(
            "SELECT * FROM users WHERE id=$1",
            user_id,
        )

        return (
            User.from_dict(row)
            if row else None
        )


    async def get_by_email(
        self,
        email: str
    ) -> Optional[User]:

        row = await self.db.fetch_one(
            "SELECT * FROM users WHERE email=$1",
            email,
        )

        return (
            User.from_dict(row)
            if row else None
        )


    async def create(
        self,
        user: User
    ) -> User:

        row = await self.db.fetch_one(
            """
            INSERT INTO users
            (name,email,hashed_password)
            VALUES ($1,$2,$3)
            RETURNING *
            """,
            user.name,
            user.email,
            user.hashed_password,
        )

        return User.from_dict(row)


    async def delete(
        self,
        user_id: int
    ):

        await self.db.execute(
            "DELETE FROM users WHERE id=$1",
            user_id,
        )

        return True
```

---

# services/user_service.py

```python
from typing import Optional

from repositories.user_repository import UserRepository
from models.user import User

from flaxon.security import (
    hash_password,
    verify_password,
)


class UserService:

    def __init__(
        self,
        repo: UserRepository
    ):
        self.repo = repo


    async def create_user(
        self,
        name,
        email,
        password,
    ):

        existing = await self.repo.get_by_email(email)

        if existing:
            raise ValueError(
                "Email already registered"
            )


        user = User(
            name=name,
            email=email,
            hashed_password=
                hash_password(password),
        )


        return await self.repo.create(user)



    async def authenticate(
        self,
        email,
        password,
    ) -> Optional[User]:

        user = await self.repo.get_by_email(email)

        if not user:
            return None


        if not verify_password(
            password,
            user.hashed_password,
        ):
            return None


        return user
```

---

# Running the Application

Install dependencies:

```bash
pip install flaxon[standard,dev]
```

Set environment variables:

### Linux / macOS

```bash
export SECRET_KEY=my-secret-key
export DATABASE_URL=postgresql://user:password@localhost/myapp
```

### Windows PowerShell

```powershell
$env:SECRET_KEY="my-secret-key"
$env:DATABASE_URL="postgresql://user:password@localhost/myapp"
```

Run:

```bash
flaxon run app:app --reload
```

---

## Production Improvements

For production applications add:

- Database migrations
- PostgreSQL connection pooling
- Redis caching
- Background workers
- Rate limiting
- Logging
- Monitoring
- Automated tests
- Docker deployment