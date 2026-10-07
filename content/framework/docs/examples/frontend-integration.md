# Frontend Integration Examples

Flaxon works with modern frontend frameworks through JSON APIs, browser-safe CORS
configuration, authentication, and WebSockets.

Supported Frontends:

- React
- Vue
- Angular
- Svelte
- Next.js

---

# 1. React Integration

## Backend

```python
from flaxon import Flaxon
from flaxon.middleware import CORSMiddleware

app = Flaxon("react-backend")

app.add_middleware(
    CORSMiddleware,
    allowed_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
)


@app.get("/api/products")
async def products():
    return [
        {
            "id": 1,
            "name": "Laptop",
            "price": 999
        }
    ]


@app.post("/api/orders")
async def create_order(request):
    data = await request.json()

    return {
        "success": True,
        "items": data["items"]
    }
```

## React Client

```javascript
const API = "http://localhost:8000/api";


export async function getProducts(){

    const response = await fetch(
        `${API}/products`
    );

    return response.json();
}
```

---

# 2. Vue Integration

## Backend

```python
from flaxon import Flaxon
from flaxon.middleware import CORSMiddleware


app = Flaxon("vue-backend")


app.add_middleware(
    CORSMiddleware,
    allowed_origins=[
        "http://localhost:5173"
    ]
)


@app.get("/api/tasks")
async def tasks():

    return [
        {
            "id":1,
            "title":"Learn Flaxon",
            "completed":False
        }
    ]
```

## Vue Client

```vue
<script setup>

import {ref,onMounted} from "vue"


const tasks = ref([])


onMounted(async()=>{

 const response =
 await fetch(
 "http://localhost:8000/api/tasks"
 )

 tasks.value =
 await response.json()

})

</script>


<template>

<h1>
Tasks
</h1>


<div v-for="task in tasks">

{{task.title}}

</div>

</template>
```

---

# 3. Angular Integration

## Backend

```python
from flaxon import Flaxon

app = Flaxon("angular-api")


@app.get("/api/posts")
async def posts():

    return [
        {
            "id":1,
            "title":"Hello Flaxon"
        }
    ]
```

## Angular Service

```typescript
@Injectable({
providedIn:"root"
})

export class ApiService{


private url =
"http://localhost:8000/api";


constructor(
private http:HttpClient
){}


getPosts(){

return this.http.get(
`${this.url}/posts`
)

}

}
```

---

# 4. Svelte Integration

## Backend

```python
from flaxon import Flaxon


app = Flaxon("svelte-api")


@app.get("/api/notes")
async def notes():

    return [
        {
            "id":1,
            "title":"My Note"
        }
    ]
```

## Svelte Client

```svelte
<script>

let notes=[];


async function load(){

const res =
await fetch(
"http://localhost:8000/api/notes"
);

notes =
await res.json();

}


load();

</script>


<h1>
Notes
</h1>


{#each notes as note}

<p>
{note.title}
</p>

{/each}
```

---

# 5. Next.js Integration

Flaxon works with Next.js using REST APIs, SSR, and dynamic routing.


## Backend

```python
from flaxon import Flaxon


app = Flaxon("next-backend")


@app.get("/api/blog/posts")
async def posts():

    return [
        {
            "id":1,
            "title":"Flaxon Blog",
            "slug":"flaxon"
        }
    ]
```

## Next.js API Client

```typescript
const API =
process.env.NEXT_PUBLIC_API_URL;


export async function getPosts(){

const res =
await fetch(
`${API}/blog/posts`
);

return res.json();

}
```

---

# Authentication Support

All frontend frameworks can use:

- JWT Authentication
- Sessions
- OAuth providers
- Role permissions
- CSRF protection


Example:

```python
@app.get("/api/profile")
async def profile(request):

    return {
        "user":
        request.user
    }
```

---

# WebSocket Support

Flaxon also supports realtime frontend applications.

Example:

```python
@app.websocket("/ws/chat")
async def chat(socket):

    await socket.accept()

async for message in socket.iter_json():

        await socket.send_json(
            {
                "message":message
            }
        )
```

Works with:

- React WebSocket hooks
- Vue composables
- Angular RxJS
- Svelte stores
- Next.js client components


---

# Summary

| Framework | Integration |
|-|-|
| React | REST API + WebSockets |
| Vue | REST API + CRUD |
| Angular | REST API + RxJS |
| Svelte | REST API + Reactive State |
| Next.js | REST API + SSR |

Flaxon can power modern frontend applications while keeping a Python-first backend architecture.
