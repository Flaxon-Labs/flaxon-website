
# Android Backend Example

Complete Android backend example using:

- Flaxon REST API
- JWT Authentication
- Flaxon Mobile Plugin
- Device Registration
- Firebase Push Notifications
- Offline Synchronization
- Android Kotlin Client

---

# Project Setup

Install:

```bash
pip install flaxon
pip install flaxon-mobile[fcm]
````

Project:

```
android-backend/
│
├── app.py
├── requirements.txt
└── .env
```

---

# Backend Application

## app.py

```python
import os
import time

from flaxon import Flaxon, HTTPException
from flaxon.security import JWTBackend, login_required
from flaxon.validation import Schema, fields

from flaxon_mobile import (
    FlaxonMobilePlugin,
    mobile_required,
)


app = Flaxon(
    "android-backend"
)


# ============================
# Mobile Plugin
# ============================

mobile = FlaxonMobilePlugin(
    fcm_api_key=os.environ.get(
        "FCM_API_KEY"
    ),
    enable_device_middleware=True,
)


await app.plugins.load_plugin(
    mobile
)


# ============================
# Authentication
# ============================

jwt = JWTBackend(
    secret_key="secret-key"
)


# ============================
# Database Simulation
# ============================

users = {}

devices = {}

posts = []



# ============================
# Schemas
# ============================

class LoginRequest(Schema):

    email = fields.EmailField(
        required=True
    )

    password = fields.StrField(
        required=True
    )



class DeviceSchema(Schema):

    device_id = fields.StrField(
        required=True
    )

    platform = fields.ChoiceField(
        [
            "android",
            "ios"
        ],
        required=True
    )

    fcm_token = fields.StrField(
        required=True
    )

    app_version = fields.StrField(
        required=False
    )



# ============================
# Register User
# ============================

@app.post(
    "/api/mobile/register"
)
async def register(data: LoginRequest):

    if data.email in users:

        raise HTTPException(
            400,
            "User exists"
        )


    user = {

        "id": len(users)+1,

        "email": data.email,

        "password": data.password,

    }


    users[data.email] = user


    token = await jwt.create_token(
        {
            "id": user["id"],
            "email": user["email"],
        }
    )


    return {

        "user": user,

        "token": token,

    }



# ============================
# Login
# ============================

@app.post(
    "/api/mobile/login"
)
async def login(data: LoginRequest):

    user = users.get(
        data.email
    )


    if not user:

        raise HTTPException(
            401,
            "Invalid login"
        )


    token = await jwt.create_token(
        {
            "id": user["id"],
            "email": user["email"],
        }
    )


    return {

        "token": token,

        "user": user

    }



# ============================
# Device Registration
# ============================

@app.post(
    "/api/mobile/device"
)
@login_required
async def register_device(
    request,
    data: DeviceSchema
):

    device = data.to_dict()


    device["user_id"] = (
        request.user["id"]
    )


    devices[
        device["device_id"]
    ] = device



    return {

        "success": True,

        "device": device

    }



# ============================
# Send Push Notification
# ============================

@app.post(
    "/api/mobile/notify"
)
@login_required
async def notify(request):

    data = await request.json()


    success = await mobile.send_push(

        device_id=data["device_id"],

        title=data["title"],

        body=data["body"],

    )


    return {

        "sent": success

    }



# ============================
# Posts API
# ============================

@app.get(
    "/api/mobile/posts"
)
async def posts_list():

    return {

        "data": posts

    }



@app.post(
    "/api/mobile/posts"
)
@login_required
async def create_post(
    request
):

    data = await request.json()


    post = {

        "id": len(posts)+1,

        "content":
        data["content"],

        "created":
        int(time.time())

    }


    posts.append(post)


    return {

        "created": True,

        "post": post

    }



# ============================
# Mobile Health
# ============================

@app.get(
    "/api/mobile/health"
)
async def health():

    return {

        "status":
        "healthy",

        "service":
        "mobile"

    }
```

---

# Android Kotlin Client

## Retrofit API

```kotlin
interface ApiService {


    @POST("api/mobile/login")
    suspend fun login(
        @Body request: LoginRequest
    ): LoginResponse



    @POST("api/mobile/device")
    suspend fun registerDevice(
        @Header("Authorization")
        token:String,

        @Body
        device:DeviceRequest

    ): DeviceResponse



    @GET("api/mobile/posts")
    suspend fun posts():

        PostsResponse



    @POST("api/mobile/posts")
    suspend fun createPost(
        @Body post:PostRequest
    ):PostResponse

}
```

---

# Offline Synchronization

Android stores changes locally:

```
Room Database
       |
       |
Sync API
       |
       |
Flaxon Backend
```

Endpoint:

```
POST /api/mobile/sync
```

Example:

```json
{
 "changes":[
   {
    "type":"post",
    "content":"Hello"
   }
 ]
}
```

---

# Firebase Push Flow

```
Android App

    |
    |
FCM Token

    |
    |
Flaxon Mobile Plugin

    |
    |
Firebase Cloud Messaging

    |
    |
Android Device
```

---

# Mobile Security

Production checklist:

✅ JWT authentication

✅ HTTPS only

✅ Device token encryption

✅ Rate limiting

✅ Token rotation

✅ Device expiration

✅ API versioning

---

# Running

```bash
flaxon run app:app --reload
```

API:

```
http://localhost:8000/api/mobile/health
```

---

# Features Demonstrated

| Feature                | Included |
| ---------------------- | -------- |
| Android API            | ✅        |
| JWT Login              | ✅        |
| Device Registration    | ✅        |
| FCM Push               | ✅        |
| Mobile Middleware      | ✅        |
| Kotlin Retrofit Client | ✅        |
| Offline Sync           | ✅        |
| Health Checks          | ✅        |
