from groq import Groq
from telethon import TelegramClient
from telethon.sessions import StringSession
from dotenv import load_dotenv

load_dotenv()

import os
import asyncio

from flask import Flask, jsonify, request
from flask_cors import CORS


raw_api_id = os.environ.get("TELEGRAM_API_ID", "30656375")
try:
    TELEGRAM_API_ID = int(str(raw_api_id).strip())
except Exception:
    TELEGRAM_API_ID = 30656375

TELEGRAM_API_HASH = os.environ.get("TELEGRAM_API_HASH", "ae2a595d3188c7a52dbea0ed6fc0e06a")
TELEGRAM_SESSION_STRING = os.environ.get("TELEGRAM_SESSION_STRING")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

_groq_client = None

def get_groq_client():
    """Lazy-init Groq client so it always picks up the current env var."""
    global _groq_client
    key = os.environ.get("GROQ_API_KEY", GROQ_API_KEY)
    if _groq_client is None and key:
        _groq_client = Groq(api_key=key)
    return _groq_client

def get_telegram_client():
    if TELEGRAM_SESSION_STRING:
        return TelegramClient(StringSession(TELEGRAM_SESSION_STRING.strip()), TELEGRAM_API_ID, TELEGRAM_API_HASH)
    return TelegramClient("session_name", TELEGRAM_API_ID, TELEGRAM_API_HASH)

def run_async(coro):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        try:
            loop.close()
        except Exception:
            pass



app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_message = data.get("message", "").strip()
    video_context = data.get("context", "")

    if not user_message:
        return jsonify({"reply": "Please send a message."}), 400

    try:
        client = get_groq_client()
        if not client:
            return jsonify({"reply": "AI is not configured. GROQ_API_KEY is missing."}), 500

        response = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"You are a helpful AI assistant on DOOMverse, a video vlog platform. "
                        f"The user is currently watching: {video_context}. "
                        "Answer questions helpfully and concisely. Keep replies under 3 sentences unless more detail is needed."
                    ),
                },
                {
                    "role": "user",
                    "content": user_message,
                },
            ],
            max_tokens=512,
            temperature=0.7,
        )
        reply = response.choices[0].message.content
        # Clean up any thinking tags from model output
        import re
        reply = re.sub(r'<think>.*?</think>', '', reply, flags=re.DOTALL).strip()
        return jsonify({"reply": reply}), 200

    except Exception as e:
        print(f"Groq error [{type(e).__name__}]: {e}")
        return jsonify({"reply": "AI is unavailable right now. Please try again."}), 500


@app.route("/debug", methods=["GET"])
def debug_env():
    """Temporary endpoint to verify environment variables are loaded on Render."""
    groq_key = os.environ.get("GROQ_API_KEY", "")
    return jsonify({
        "groq_key_set": bool(groq_key),
        "groq_key_prefix": groq_key[:8] + "..." if len(groq_key) > 8 else "MISSING",
        "telegram_api_id": TELEGRAM_API_ID,
        "telegram_hash_set": bool(TELEGRAM_API_HASH),
        "session_string_set": bool(TELEGRAM_SESSION_STRING),
    })


async def get_user_vlogs(author_email):
    async with get_telegram_client() as client:
        dialogs = await client.get_dialogs()
        vlogs = []
        for dialog in dialogs:
            if dialog.name == "Database":
                async for message in client.iter_messages(dialog.id, limit=None):
                    if message.text and message.text.startswith("VLOG|"):
                        parts = message.text.split("|")
                        if len(parts) >= 5:
                            stored_author = parts[4].strip().lower()
                            if stored_author == author_email.strip().lower():
                                vlogs.append({
                                    "id": message.id,
                                    "title": parts[1].strip(),
                                    "videoUrl": parts[2].strip(),
                                    "description": parts[3].strip(),
                                    "author": parts[4].strip(),
                                    "date": str(message.date.strftime("%Y-%m-%d %H:%M")) if message.date else ""
                                })
                return vlogs
        return []


@app.route("/user-vlogs", methods=["GET"])
def fetch_user_vlogs():
    email = request.args.get("email", "").strip()
    if not email:
        return jsonify({"message": "Email is required."}), 400
    try:
        vlogs = run_async(get_user_vlogs(email))
        return jsonify({"vlogs": vlogs}), 200
    except Exception as e:
        return jsonify({"message": "Failed to fetch user vlogs", "error": str(e)}), 500


# ─── Chat History via Telegram ───────────────────────────────────────────────

async def save_chat_to_telegram(email, vlog_id, user_msg, ai_reply):
    async with get_telegram_client() as client:
        dialogs = await client.get_dialogs()
        for dialog in dialogs:
            if dialog.name == "AI":
                timestamp = __import__("datetime").datetime.utcnow().strftime("%Y-%m-%d %H:%M")
                # Sanitize pipe characters to avoid parsing issues
                user_msg_clean = user_msg.replace("|", " ")
                ai_reply_clean = ai_reply.replace("|", " ")
                record = f"CHAT|{email}|{vlog_id}|{user_msg_clean}|{ai_reply_clean}|{timestamp}"
                await client.send_message(dialog.id, record)
                return True
        return False


async def load_chat_from_telegram(email, vlog_id):
    async with get_telegram_client() as client:
        dialogs = await client.get_dialogs()
        history = []
        for dialog in dialogs:
            if dialog.name == "AI":
                async for message in client.iter_messages(dialog.id, limit=None):
                    if message.text and message.text.startswith("CHAT|"):
                        parts = message.text.split("|")
                        if len(parts) >= 6:
                            stored_email = parts[1].strip().lower()
                            stored_vlog  = parts[2].strip()
                            if stored_email == email.strip().lower() and stored_vlog == str(vlog_id):
                                history.append({
                                    "user": parts[3].strip(),
                                    "ai":   parts[4].strip(),
                                    "date": parts[5].strip(),
                                })
                # Messages are newest-first; reverse to get chronological order
                history.reverse()
                return history
        return []


@app.route("/save-chat", methods=["POST"])
def save_chat():
    data       = request.get_json(silent=True) or {}
    email      = data.get("email", "").strip()
    vlog_id    = str(data.get("vlogId", "")).strip()
    user_msg   = data.get("userMessage", "").strip()
    ai_reply   = data.get("aiReply", "").strip()

    if not all([email, vlog_id, user_msg, ai_reply]):
        return jsonify({"message": "Missing required fields."}), 400

    try:
        run_async(save_chat_to_telegram(email, vlog_id, user_msg, ai_reply))
        return jsonify({"message": "Chat saved to Telegram."}), 200
    except Exception as e:
        print("Save chat error:", e)
        return jsonify({"message": "Failed to save chat.", "error": str(e)}), 500


@app.route("/load-chat", methods=["GET"])
def load_chat():
    email   = request.args.get("email",  "").strip()
    vlog_id = request.args.get("vlogId", "").strip()

    if not email or not vlog_id:
        return jsonify({"message": "email and vlogId are required."}), 400

    try:
        history = run_async(load_chat_from_telegram(email, vlog_id))
        return jsonify({"history": history}), 200
    except Exception as e:
        print("Load chat error:", e)
        return jsonify({"message": "Failed to load chat.", "error": str(e)}), 500


# ─── Edit Vlog in Telegram ───────────────────────────────────────────────────

async def edit_vlog_in_telegram(message_id, title, video_url, description, author):
    async with get_telegram_client() as client:
        dialogs = await client.get_dialogs()
        for dialog in dialogs:
            if dialog.name == "Database":
                # Get the specific message by ID
                msg = await client.get_messages(dialog.id, ids=message_id)
                if msg:
                    new_text = f"VLOG|{title}|{video_url}|{description}|{author}"
                    await msg.edit(new_text)
                    return True
        return False


@app.route("/vlogs/edit", methods=["PUT"])
def edit_vlog():
    data = request.get_json(silent=True) or {}
    msg_id      = data.get("id")
    title       = data.get("title", "").strip()
    video_url   = data.get("videoUrl", "").strip()
    description = data.get("description", "").strip()
    author      = data.get("author", "").strip()

    if not all([msg_id, title, video_url, author]):
        return jsonify({"message": "Missing required fields."}), 400

    try:
        result = run_async(edit_vlog_in_telegram(int(msg_id), title, video_url, description, author))
        if result:
            return jsonify({"message": "Vlog updated successfully."}), 200
        else:
            return jsonify({"message": "Vlog not found."}), 404
    except Exception as e:
        print("Edit vlog error:", e)
        return jsonify({"message": "Failed to edit vlog.", "error": str(e)}), 500


# ─── User Profile via Telegram ───────────────────────────────────────────────

async def get_profile_from_telegram(email):
    async with get_telegram_client() as client:
        dialogs = await client.get_dialogs()
        for dialog in dialogs:
            if dialog.name == "Database":
                async for message in client.iter_messages(dialog.id, limit=None):
                    if message.text and message.text.startswith("PROFILE|"):
                        parts = message.text.split("|")
                        if len(parts) >= 6:
                            stored_email = parts[1].strip().lower()
                            if stored_email == email.strip().lower():
                                return {
                                    "email": parts[1].strip(),
                                    "fullName": parts[2].strip(),
                                    "university": parts[3].strip(),
                                    "hobbies": parts[4].strip(),
                                    "bio": parts[5].strip(),
                                }
        return None

async def save_profile_to_telegram(email, full_name, university, hobbies, bio):
    async with get_telegram_client() as client:
        dialogs = await client.get_dialogs()
        for dialog in dialogs:
            if dialog.name == "Database":
                fn = full_name.replace("|", " ")
                un = university.replace("|", " ")
                hb = hobbies.replace("|", " ")
                bi = bio.replace("|", " ")
                record = f"PROFILE|{email}|{fn}|{un}|{hb}|{bi}"
                
                async for message in client.iter_messages(dialog.id, limit=None):
                    if message.text and message.text.startswith("PROFILE|"):
                        parts = message.text.split("|")
                        if len(parts) >= 6 and parts[1].strip().lower() == email.strip().lower():
                            await message.edit(record)
                            return True
                
                await client.send_message(dialog.id, record)
                return True
        return False

@app.route("/profile", methods=["GET"])
def fetch_profile():
    email = request.args.get("email", "").strip()
    if not email:
        return jsonify({"message": "Email is required."}), 400
    try:
        profile = run_async(get_profile_from_telegram(email))
        if not profile:
            username = email.split("@")[0]
            profile = {
                "email": email,
                "fullName": username.capitalize(),
                "university": "Not set yet",
                "hobbies": "Not set yet",
                "bio": "Welcome to my DOOMverse channel!",
            }
        return jsonify({"profile": profile}), 200
    except Exception as e:
        print("Fetch profile error:", e)
        return jsonify({"message": "Failed to fetch profile.", "error": str(e)}), 500

@app.route("/profile", methods=["POST", "PUT"])
def save_profile():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip()
    full_name = data.get("fullName", "").strip()
    university = data.get("university", "").strip()
    hobbies = data.get("hobbies", "").strip()
    bio = data.get("bio", "").strip()

    if not email:
        return jsonify({"message": "Email is required."}), 400

    try:
        run_async(save_profile_to_telegram(email, full_name, university, hobbies, bio))
        return jsonify({"message": "Profile saved successfully."}), 200
    except Exception as e:
        print("Save profile error:", e)
        return jsonify({"message": "Failed to save profile.", "error": str(e)}), 500


# ─── User Activity Tracking via Telegram ─────────────────────────────────────

async def get_activity_from_telegram(email):
    async with get_telegram_client() as client:
        dialogs = await client.get_dialogs()
        today_date = __import__("datetime").datetime.utcnow().strftime("%Y-%m-%d")
        for dialog in dialogs:
            if dialog.name == "Database":
                async for message in client.iter_messages(dialog.id, limit=None):
                    if message.text and message.text.startswith("ACTIVITY|"):
                        parts = message.text.split("|")
                        if len(parts) >= 4:
                            stored_email = parts[1].strip().lower()
                            if stored_email == email.strip().lower():
                                sec = int(parts[2].strip() or "0")
                                rec_date = parts[3].strip()
                                return {
                                    "email": parts[1].strip(),
                                    "secondsSpent": sec if rec_date == today_date else 0,
                                    "lastDate": rec_date,
                                    "isToday": rec_date == today_date
                                }
        return {"email": email, "secondsSpent": 0, "lastDate": today_date, "isToday": True}

async def save_activity_to_telegram(email, seconds_spent):
    async with get_telegram_client() as client:
        dialogs = await client.get_dialogs()
        today_date = __import__("datetime").datetime.utcnow().strftime("%Y-%m-%d")
        for dialog in dialogs:
            if dialog.name == "Database":
                record = f"ACTIVITY|{email}|{seconds_spent}|{today_date}"
                
                async for message in client.iter_messages(dialog.id, limit=None):
                    if message.text and message.text.startswith("ACTIVITY|"):
                        parts = message.text.split("|")
                        if len(parts) >= 4 and parts[1].strip().lower() == email.strip().lower():
                            await message.edit(record)
                            return True
                
                await client.send_message(dialog.id, record)
                return True
        return False

@app.route("/activity", methods=["GET"])
def fetch_activity():
    email = request.args.get("email", "").strip()
    if not email:
        return jsonify({"message": "Email is required."}), 400
    try:
        activity = run_async(get_activity_from_telegram(email))
        return jsonify({"activity": activity}), 200
    except Exception as e:
        print("Fetch activity error:", e)
        return jsonify({"message": "Failed to fetch activity.", "error": str(e)}), 500

@app.route("/activity", methods=["POST"])
def save_activity():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip()
    seconds_spent = data.get("secondsSpent", 0)

    if not email:
        return jsonify({"message": "Email is required."}), 400

    try:
        run_async(save_activity_to_telegram(email, int(seconds_spent)))
        return jsonify({"message": "Activity updated."}), 200
    except Exception as e:
        print("Save activity error:", e)
        return jsonify({"message": "Failed to update activity.", "error": str(e)}), 500


# ─── Admin Dashboard Endpoints ───────────────────────────────────────────────

ADMIN_EMAILS = ["anz026771@gmail.com"]

async def get_all_users_from_telegram():
    async with get_telegram_client() as client:
        dialogs = await client.get_dialogs()
        today_date = __import__("datetime").datetime.utcnow().strftime("%Y-%m-%d")
        users_map = {}
        vlogs_count = {}
        activity_map = {}

        for dialog in dialogs:
            if dialog.name == "Database":
                async for message in client.iter_messages(dialog.id, limit=None):
                    text = message.text or ""
                    
                    if "/" in text and not text.startswith("VLOG|") and not text.startswith("CHAT|") and not text.startswith("PROFILE|") and not text.startswith("ACTIVITY|"):
                        parts = text.split("/")
                        if len(parts) >= 2:
                            em = parts[0].strip().lower()
                            if em not in users_map:
                                users_map[em] = {
                                    "email": parts[0].strip(),
                                    "date": str(message.date.strftime("%Y-%m-%d %H:%M")) if message.date else ""
                                }
                    
                    if text.startswith("VLOG|"):
                        parts = text.split("|")
                        if len(parts) >= 5:
                            author_em = parts[4].strip().lower()
                            vlogs_count[author_em] = vlogs_count.get(author_em, 0) + 1
                    
                    if text.startswith("ACTIVITY|"):
                        parts = text.split("|")
                        if len(parts) >= 4:
                            act_em = parts[1].strip().lower()
                            if act_em not in activity_map:
                                activity_map[act_em] = {
                                    "secondsSpent": int(parts[2].strip() or "0"),
                                    "lastDate": parts[3].strip(),
                                    "isToday": parts[3].strip() == today_date
                                }

        user_list = []
        for em, u_info in users_map.items():
            act = activity_map.get(em, {"secondsSpent": 0, "lastDate": "", "isToday": False})
            user_list.append({
                "email": u_info["email"],
                "registeredDate": u_info["date"],
                "totalVlogs": vlogs_count.get(em, 0),
                "secondsSpentToday": act["secondsSpent"] if act["isToday"] else 0,
                "isToday": act["isToday"],
            })
        
        return user_list

@app.route("/admin/users", methods=["GET"])
def fetch_admin_users():
    admin_email = request.args.get("email", "").strip().lower()
    if admin_email not in ADMIN_EMAILS:
        return jsonify({"message": "Access denied. Admin authorization required."}), 403

    try:
        users = run_async(get_all_users_from_telegram())
        return jsonify({"users": users}), 200
    except Exception as e:
        print("Fetch admin users error:", e)
        return jsonify({"message": "Failed to fetch admin users.", "error": str(e)}), 500


@app.route("/", methods=["GET"])
def health_check():
    return jsonify({
        "message": "DOOMverse backend is running."
    })


async def telegram_login(email, password):

    async with get_telegram_client() as client:

        print("Telegram connected")

        dialogs = await client.get_dialogs()

        print("Number of dialogs:", len(dialogs))

        for dialog in dialogs:

            print("Dialog:", dialog.name, "| ID:", dialog.id)

            if dialog.name == "Database":

                print("Database chat found!")

                found = False

                async for message in client.iter_messages(
                    dialog.id,
                    limit=None
                ):

                    if message.text is None:
                        continue

                    print("Database message:", message.text)

                    parts = message.text.split("/")

                    if len(parts) < 2:
                        continue

                    stored_email = parts[0].strip()
                    stored_password = parts[-1].strip()

                    if (
                        email == stored_email
                        and password == stored_password
                    ):

                        print("Credentials already exist")
                        found = True
                        break

                if not found:

                    print("Credentials not found")
                    print("Creating:", email)

                    await client.send_message(
                        dialog.id,
                        f"{email}/{password}"
                    )

                    print("Credentials sent to Database")

                    return "id is created"

                return "you are loggined"

        print("Database chat was NOT found")

        return "Database not found"


@app.route("/login", methods=["POST"])
def login():

    data = request.get_json(silent=True) or {}

    email = data.get("email")
    password = data.get("password")

    if not email or not password:

        return jsonify({
            "message": "Email and password are required."
        }), 400

    try:

        result = run_async(
            telegram_login(email, password)
        )

        if result == "you are loggined":

            return jsonify({
                "message": "Login successful."
            }), 200

        elif result == "id is created":

            return jsonify({
                "message": "ID is created."
            }), 201

        else:

            return jsonify({
                "message": result
            }), 404

    except Exception as e:

        print("ERROR:", e)

        return jsonify({
            "message": "Unable to process request.",
            "error": str(e)
        }), 502

import json

# --- TELEGRAM VLOG FUNCTIONS ---
async def get_telegram_vlogs():
    async with get_telegram_client() as client:
        dialogs = await client.get_dialogs()
        vlogs = []

        for dialog in dialogs:
            if dialog.name == "Database":
                async for message in client.iter_messages(dialog.id, limit=None):
                    if message.text and message.text.startswith("VLOG|"):
                        parts = message.text.split("|")
                        if len(parts) >= 5:
                            vlogs.append({
                                "id": message.id,
                                "title": parts[1].strip(),
                                "videoUrl": parts[2].strip(),
                                "description": parts[3].strip(),
                                "author": parts[4].strip(),
                                "date": str(message.date.strftime("%Y-%m-%d %H:%M")) if message.date else ""
                            })
                return vlogs
        return []

async def add_telegram_vlog(title, video_url, description, author):
    async with get_telegram_client() as client:
        dialogs = await client.get_dialogs()
        for dialog in dialogs:
            if dialog.name == "Database":
                message_text = f"VLOG|{title}|{video_url}|{description}|{author}"
                await client.send_message(dialog.id, message_text)
                return True
        return False

# --- FLASK VLOG ROUTES ---
@app.route("/vlogs", methods=["GET"])
def fetch_vlogs():
    try:
        vlogs = run_async(get_telegram_vlogs())
        return jsonify({"vlogs": vlogs}), 200
    except Exception as e:
        return jsonify({"message": "Failed to fetch vlogs", "error": str(e)}), 500

@app.route("/vlogs", methods=["POST"])
def post_vlog():
    data = request.get_json(silent=True) or {}
    title = data.get("title")
    video_url = data.get("videoUrl")
    description = data.get("description", "")
    author = data.get("author", "Anonymous")

    if not title or not video_url:
        return jsonify({"message": "Title and Video URL are required."}), 400

    try:
        success = run_async(add_telegram_vlog(title, video_url, description, author))
        if success:
            return jsonify({"message": "Vlog posted to Telegram successfully!"}), 201
        return jsonify({"message": "Database chat not found."}), 404
    except Exception as e:
        return jsonify({"message": "Failed to post vlog", "error": str(e)}), 500


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )