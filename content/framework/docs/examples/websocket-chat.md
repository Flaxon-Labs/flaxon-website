
# WebSocket Chat Example

This example demonstrates a real-time chat application using WebSockets with room support.

## Application Code

```python
# app.py

from datetime import datetime
from urllib.parse import parse_qs

from flaxon import Flaxon, WebSocket, WebSocketDisconnect


app = Flaxon("chat-app", debug=True)


# In-memory storage
rooms: dict[str, list[str]] = {}
users: dict[str, dict] = {}
message_history: dict[str, list] = {}

MAX_MESSAGES_PER_ROOM = 100


@app.websocket("/ws/chat/<room_id>")
async def chat(socket: WebSocket, room_id: str):

    # Parse username from query string
    query = socket.scope.get("query_string", b"")
    
    if isinstance(query, bytes):
        query = query.decode()

    params = parse_qs(query)

    username = params.get(
        "user",
        ["Anonymous"]
    )[0]

    user_id = f"{username}-{id(socket)}"


    await socket.accept()


    # Create room
    if room_id not in rooms:
        rooms[room_id] = []
        message_history[room_id] = []


    rooms[room_id].append(user_id)

    users[user_id] = {
        "username": username,
        "room": room_id,
        "socket": socket,
    }


    # Notify room
    await socket.broadcast_json(
        room_id,
        {
            "type": "system",
            "event": "user_joined",
            "user": username,
            "timestamp": datetime.now().isoformat(),
        },
    )


    # Send history
    await socket.send_json(
        {
            "type": "history",
            "messages": message_history[room_id][-MAX_MESSAGES_PER_ROOM:],
        }
    )


    try:

        async for message in socket.iter_json():

            message_type = message.get("type")


            if message_type == "message":

                msg = {
                    "type": "message",
                    "user": username,
                    "content": message.get(
                        "content",
                        ""
                    ),
                    "timestamp": datetime.now().isoformat(),
                }


                message_history[room_id].append(msg)


                # Limit history
                message_history[room_id] = (
                    message_history[room_id]
                    [-MAX_MESSAGES_PER_ROOM:]
                )


                await socket.broadcast_json(
                    room_id,
                    msg
                )


            elif message_type == "typing":

                await socket.broadcast_json(
                    room_id,
                    {
                        "type": "typing",
                        "user": username,
                        "is_typing": message.get(
                            "is_typing",
                            False
                        ),
                    },
                )


            elif message_type == "ping":

                await socket.send_json(
                    {
                        "type": "pong",
                        "timestamp": datetime.now().isoformat(),
                    }
                )


    except WebSocketDisconnect:
        pass


    finally:

        users.pop(
            user_id,
            None
        )


        if room_id in rooms:

            rooms[room_id].remove(
                user_id
            )


            if not rooms[room_id]:
                del rooms[room_id]


        await socket.broadcast_json(
            room_id,
            {
                "type": "system",
                "event": "user_left",
                "user": username,
            },
        )


@app.get("/rooms")
async def list_rooms():

    return {
        "rooms": [
            {
                "name": room_id,
                "users": len(room_users),
                "messages": len(
                    message_history.get(
                        room_id,
                        []
                    )
                ),
            }
            for room_id, room_users in rooms.items()
        ]
    }


@app.get("/rooms/<room_id>/messages")
async def get_messages(room_id: str):

    return {
        "messages": message_history.get(
            room_id,
            []
        )
    }


@app.get("/rooms/<room_id>/users")
async def get_users(room_id: str):

    room_users = rooms.get(
        room_id,
        []
    )


    return {
        "users": [
            users[user_id]["username"]
            for user_id in room_users
            if user_id in users
        ]
    }
````

---

## Running the Application

```bash
# Install dependencies
pip install "flaxon[standard]"

# Run server
flaxon run app:app --reload
```

---

# HTML Client Example

```html
<!-- index.html -->

<!doctype html>

<html>

<head>

<title>Flaxon Chat</title>

<style>

body {
    font-family: system-ui;
    max-width: 800px;
    margin:auto;
    padding:20px;
}

#messages {
    height:400px;
    overflow-y:auto;
    border:1px solid #ccc;
    padding:10px;
}

.message {
    margin-bottom:8px;
}

.system {
    color:#666;
    font-style:italic;
}

.username {
    font-weight:bold;
}

</style>

</head>


<body>


<h1>
Chat Room:
<span id="room">
general
</span>
</h1>


<div id="messages"></div>


<input id="message-input"
placeholder="Type message...">


<button id="send-btn">
Send
</button>



<script>

const room = "general";

const username =
    prompt("Username:")
    || "Anonymous";


const socket =
    new WebSocket(
        `ws://localhost:8000/ws/chat/${room}?user=${encodeURIComponent(username)}`
    );


const messages =
    document.getElementById(
        "messages"
    );


const input =
    document.getElementById(
        "message-input"
    );


document
.getElementById("send-btn")
.onclick = () => {

    const content =
        input.value.trim();


    if(content){

        socket.send(
            JSON.stringify({
                type:"message",
                content
            })
        );


        input.value="";
    }

};



socket.onmessage = event => {


    const data =
        JSON.parse(
            event.data
        );


    const div =
        document.createElement(
            "div"
        );


    div.className =
        "message";


    if(data.type==="message"){

        div.textContent =
            `${data.user}: ${data.content}`;

    }


    else if(data.type==="system"){

        div.textContent =
            `🔔 ${data.event}: ${data.user || ""}`;

        div.className =
            "message system";
    }


    messages.appendChild(div);

    messages.scrollTop =
        messages.scrollHeight;

};


input.onkeydown = event => {

    if(event.key==="Enter"){

        document
        .getElementById("send-btn")
        .click();

    }

};

</script>


</body>

</html>
```

---

## Production Notes

For production deployments:

* Replace in-memory rooms with Redis.
* Use authentication middleware.
* Use `wss://` behind HTTPS.
* Add rate limiting.
* Store messages in PostgreSQL.
* Use Redis Pub/Sub for multiple server instances.
