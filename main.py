import requests as http_requests
import traceback
import re
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

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

def groq_chat(model, messages, max_tokens=512, temperature=0.7):
    """Call Groq API directly via HTTP requests instead of the SDK."""
    key = (os.environ.get("GROQ_API_KEY") or GROQ_API_KEY or "").strip()
    if not key:
        return None, "GROQ_API_KEY is missing"
    
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    
    resp = http_requests.post(GROQ_API_URL, json=payload, headers=headers, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    reply = data["choices"][0]["message"]["content"]
    # Clean up any thinking tags from model output (closed and unclosed)
    reply = re.sub(r'<think>.*?</think>', '', reply, flags=re.DOTALL).strip()
    reply = re.sub(r'<think>.*$', '', reply, flags=re.DOTALL).strip()
    return reply, None

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


# Models to try in order of preference
GROQ_MODELS = ["openai/gpt-oss-20b", "openai/gpt-oss-safeguard-20b", "qwen/qwen3.6-27b"]


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_message = data.get("message", "").strip()
    video_context = data.get("context", "")

    if not user_message:
        return jsonify({"reply": "Please send a message."}), 400

    key = os.environ.get("GROQ_API_KEY", GROQ_API_KEY)
    if not key:
        print("CHAT ERROR: GROQ_API_KEY is missing or empty")
        return jsonify({"reply": "AI is not configured. GROQ_API_KEY is missing."}), 500

    messages_payload = [
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
    ]

    last_error = None
    for model in GROQ_MODELS:
        try:
            print(f"CHAT: Trying model '{model}' ...")
            reply, err = groq_chat(model, messages_payload, max_tokens=512, temperature=0.7)
            if err:
                raise Exception(err)
            if reply:
                print(f"CHAT: Success with model '{model}'")
                return jsonify({"reply": reply}), 200
        except Exception as e:
            last_error = e
            print(f"CHAT ERROR with model '{model}' [{type(e).__name__}]: {e}")
            print(traceback.format_exc())
            continue

    err_msg = str(last_error) if last_error else "Unknown error"
    print(f"CHAT: All models failed. Last error: {err_msg}")
    return jsonify({"reply": f"AI is unavailable right now. Please try again. (Error: {err_msg})"}), 500


@app.route("/test-ai", methods=["GET"])
def test_ai():
    """Diagnostic endpoint to verify Groq AI is working."""
    key = os.environ.get("GROQ_API_KEY", GROQ_API_KEY)
    if not key:
        return jsonify({"status": "error", "message": "GROQ_API_KEY missing"}), 500

    results = {}
    for model in GROQ_MODELS:
        try:
            reply, err = groq_chat(model, [{"role": "user", "content": "Say hi in one word. Do not use think tags."}], max_tokens=100, temperature=0)
            if err:
                raise Exception(err)
            results[model] = {"status": "ok", "reply": reply}
        except Exception as e:
            results[model] = {"status": "error", "error": f"{type(e).__name__}: {e}"}

    all_ok = any(r["status"] == "ok" for r in results.values())
    return jsonify({"status": "ok" if all_ok else "all_failed", "models": results}), (200 if all_ok else 500)


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
        print("Fetch vlogs error:", e)
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
        print("Post vlog error:", e)
        return jsonify({"message": "Failed to post vlog", "error": str(e)}), 500

# ─── Movie Information & Details Endpoints (TMDB & Curated Data) ──────────

TMDB_API_KEY = (os.environ.get("TMDB_API_KEY") or "").strip()

CURATED_MOVIES = [
    {
        "id": 693134,
        "title": "Dune: Part Two",
        "tagline": "Long live the fighters.",
        "releaseDate": "2024-03-01",
        "year": "2024",
        "rating": 8.5,
        "voteCount": 5420,
        "runtime": "166 min",
        "genres": ["Sci-Fi", "Adventure", "Action"],
        "director": "Denis Villeneuve",
        "posterUrl": "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
        "backdropUrl": "https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s520b4q.jpg",
        "trailerUrl": "https://www.youtube.com/watch?v=Way9Dexny3w",
        "overview": "Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the known universe, he endeavors to prevent a terrible future only he can foresee.",
        "cast": [
            {
                "name": "Timothée Chalamet",
                "character": "Paul Atreides",
                "photoUrl": "https://image.tmdb.org/t/p/w185/BE2sdjpgsa2rNTFa66f7upkaOP.jpg"
            },
            {
                "name": "Zendaya",
                "character": "Chani",
                "photoUrl": "https://image.tmdb.org/t/p/w185/r3GMSL5io4N4a5bA7u7K7kZ9sK.jpg"
            },
            {
                "name": "Rebecca Ferguson",
                "character": "Lady Jessica",
                "photoUrl": "https://image.tmdb.org/t/p/w185/lJloTOheuQSirSLXNA3jhmsBhv5.jpg"
            },
            {
                "name": "Javier Bardem",
                "character": "Stilgar",
                "photoUrl": "https://image.tmdb.org/t/p/w185/gpmEbTj2wO0sCq2pXj051Z5t1o.jpg"
            },
            {
                "name": "Austin Butler",
                "character": "Feyd-Rautha Harkonnen",
                "photoUrl": "https://image.tmdb.org/t/p/w185/2gB1k4d2v6OqK0iS6P8j9i1b.jpg"
            },
            {
                "name": "Florence Pugh",
                "character": "Princess Irulan",
                "photoUrl": "https://image.tmdb.org/t/p/w185/fhZsnzD8249gO0P0fXj1f9d5p.jpg"
            }
        ]
    },
    {
        "id": 533535,
        "title": "Deadpool & Wolverine",
        "tagline": "Everyone deserves a happy ending.",
        "releaseDate": "2024-07-26",
        "year": "2024",
        "rating": 7.8,
        "voteCount": 4280,
        "runtime": "128 min",
        "genres": ["Action", "Comedy", "Sci-Fi"],
        "director": "Shawn Levy",
        "posterUrl": "https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
        "backdropUrl": "https://image.tmdb.org/t/p/original/yDHYTfaa9GP0aYqqoFy8GF935tC.jpg",
        "trailerUrl": "https://www.youtube.com/watch?v=73_1biulkYk",
        "overview": "A listless Wade Wilson toils away in civilian life with his days as the morally flexible mercenary Deadpool behind him. But when his homeworld faces an existential threat, Wade must reluctantly suit-up again with an even more reluctant Wolverine.",
        "cast": [
            {
                "name": "Ryan Reynolds",
                "character": "Wade Wilson / Deadpool",
                "photoUrl": "https://image.tmdb.org/t/p/w185/4SYTH5FdB0dAORV98Nwh32P0d48.jpg"
            },
            {
                "name": "Hugh Jackman",
                "character": "Logan / Wolverine",
                "photoUrl": "https://image.tmdb.org/t/p/w185/oXWj0hoUVioMGfLdQRJ0ijIScuK.jpg"
            },
            {
                "name": "Emma Corrin",
                "character": "Cassandra Nova",
                "photoUrl": "https://image.tmdb.org/t/p/w185/8d1f275lB3qM4PqJk2j9d7k3L.jpg"
            },
            {
                "name": "Matthew Macfadyen",
                "character": "Mr. Paradox",
                "photoUrl": "https://image.tmdb.org/t/p/w185/9QpGf04H8j6K4u9j5K7m2l1.jpg"
            },
            {
                "name": "Dafne Keen",
                "character": "Laura / X-23",
                "photoUrl": "https://image.tmdb.org/t/p/w185/8eK0o0d2e8K1p5l9K8j2m.jpg"
            },
            {
                "name": "Jon Favreau",
                "character": "Happy Hogan",
                "photoUrl": "https://image.tmdb.org/t/p/w185/8MtRRnEHaBSw8ZtdTXTB2Z4mF43.jpg"
            }
        ]
    },
    {
        "id": 872585,
        "title": "Oppenheimer",
        "tagline": "The world forever changes.",
        "releaseDate": "2023-07-21",
        "year": "2023",
        "rating": 8.9,
        "voteCount": 8950,
        "runtime": "180 min",
        "genres": ["Drama", "History", "Biography"],
        "director": "Christopher Nolan",
        "posterUrl": "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
        "backdropUrl": "https://image.tmdb.org/t/p/original/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg",
        "trailerUrl": "https://www.youtube.com/watch?v=uYPbbksJxIg",
        "overview": "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II, exploring the profound consequences, moral weight, and political fallout of scientific discovery.",
        "cast": [
            {
                "name": "Cillian Murphy",
                "character": "J. Robert Oppenheimer",
                "photoUrl": "https://image.tmdb.org/t/p/w185/3HQm1dK2GZ6O7p0l7N6k1.jpg"
            },
            {
                "name": "Emily Blunt",
                "character": "Katherine 'Kitty' Oppenheimer",
                "photoUrl": "https://image.tmdb.org/t/p/w185/nPJXaRMVUYSv6zb51Q5xveiW0tP.jpg"
            },
            {
                "name": "Matt Damon",
                "character": "Leslie Groves",
                "photoUrl": "https://image.tmdb.org/t/p/w185/elSlNg0Wqnix1AhFy5wHzz9q2.jpg"
            },
            {
                "name": "Robert Downey Jr.",
                "character": "Lewis Strauss",
                "photoUrl": "https://image.tmdb.org/t/p/w185/1YjdSym1jTG7xjHSI0yGGWEswQw.jpg"
            },
            {
                "name": "Florence Pugh",
                "character": "Jean Tatlock",
                "photoUrl": "https://image.tmdb.org/t/p/w185/fhZsnzD8249gO0P0fXj1f9d5p.jpg"
            },
            {
                "name": "Rami Malek",
                "character": "David Hill",
                "photoUrl": "https://image.tmdb.org/t/p/w185/74XqT22v31d2j1P0i.jpg"
            }
        ]
    },
    {
        "id": 569094,
        "title": "Spider-Man: Beyond the Spider-Verse",
        "tagline": "It's how you wear the mask that matters.",
        "releaseDate": "2025-06-15",
        "year": "2025",
        "rating": 8.8,
        "voteCount": 6700,
        "runtime": "142 min",
        "genres": ["Animation", "Action", "Sci-Fi"],
        "director": "Joaquim Dos Santos, Kemp Powers",
        "posterUrl": "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
        "backdropUrl": "https://image.tmdb.org/t/p/original/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg",
        "trailerUrl": "https://www.youtube.com/watch?v=cqGjhVJWtEg",
        "overview": "Miles Morales catapults across the Multiverse to finish what began, battling dangerous destinies and unexpected alliances across multiple dimensions to save the people he loves most.",
        "cast": [
            {
                "name": "Shameik Moore",
                "character": "Miles Morales / Spider-Man",
                "photoUrl": "https://image.tmdb.org/t/p/w185/v3zD4k4l0O2P3d5K6h7j8.jpg"
            },
            {
                "name": "Hailee Steinfeld",
                "character": "Gwen Stacy / Spider-Woman",
                "photoUrl": "https://image.tmdb.org/t/p/w185/q42V2p5K3K0K7l0K3P4K8.jpg"
            },
            {
                "name": "Oscar Isaac",
                "character": "Miguel O'Hara / Spider-Man 2099",
                "photoUrl": "https://image.tmdb.org/t/p/w185/h5J9n6d3M1k7P8q9L0k.jpg"
            },
            {
                "name": "Daniel Kaluuya",
                "character": "Hobie Brown / Spider-Punk",
                "photoUrl": "https://image.tmdb.org/t/p/w185/3rM1dK7L0P6O8j9K.jpg"
            },
            {
                "name": "Karan Soni",
                "character": "Pavitr Prabhakar",
                "photoUrl": "https://image.tmdb.org/t/p/w185/9rL1dK7P0O5j8K.jpg"
            },
            {
                "name": "Jason Schwartzman",
                "character": "The Spot",
                "photoUrl": "https://image.tmdb.org/t/p/w185/8dK1P0l9K8j2m.jpg"
            }
        ]
    },
    {
        "id": 558449,
        "title": "Gladiator II",
        "tagline": "What we do in life echoes in eternity.",
        "releaseDate": "2024-11-22",
        "year": "2024",
        "rating": 7.8,
        "voteCount": 3890,
        "runtime": "148 min",
        "genres": ["Action", "Drama", "History"],
        "director": "Ridley Scott",
        "posterUrl": "https://image.tmdb.org/t/p/w500/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg",
        "backdropUrl": "https://image.tmdb.org/t/p/original/euYIWhgKMdaUWPyLoAj0XYgyFMc.jpg",
        "trailerUrl": "https://www.youtube.com/watch?v=4rgYUipGJNo",
        "overview": "Years after witnessing the death of the revered hero Maximus at the hands of his uncle, Lucius must enter the Colosseum after his home is conquered by tyrannical emperors who rule Rome with an iron fist.",
        "cast": [
            {
                "name": "Paul Mescal",
                "character": "Lucius Verus",
                "photoUrl": "https://image.tmdb.org/t/p/w185/1p1v01M2P3d5K6h7j8.jpg"
            },
            {
                "name": "Pedro Pascal",
                "character": "General Marcus Acacius",
                "photoUrl": "https://image.tmdb.org/t/p/w185/6k1P0l9K8j2m.jpg"
            },
            {
                "name": "Denzel Washington",
                "character": "Macrinus",
                "photoUrl": "https://image.tmdb.org/t/p/w185/7k1P0l9K8j2m.jpg"
            },
            {
                "name": "Connie Nielsen",
                "character": "Lucilla",
                "photoUrl": "https://image.tmdb.org/t/p/w185/8k1P0l9K8j2m.jpg"
            },
            {
                "name": "Joseph Quinn",
                "character": "Emperor Geta",
                "photoUrl": "https://image.tmdb.org/t/p/w185/9k1P0l9K8j2m.jpg"
            }
        ]
    },
    {
        "id": 157336,
        "title": "Interstellar",
        "tagline": "Mankind was born on Earth. It was never meant to die here.",
        "releaseDate": "2014-11-07",
        "year": "2014",
        "rating": 8.7,
        "voteCount": 35200,
        "runtime": "169 min",
        "genres": ["Sci-Fi", "Adventure", "Drama"],
        "director": "Christopher Nolan",
        "posterUrl": "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
        "backdropUrl": "https://image.tmdb.org/t/p/original/rAiYTsqzbmu9WkSN1D4AHzU47tF.jpg",
        "trailerUrl": "https://www.youtube.com/watch?v=zSWdZVtXT7E",
        "overview": "When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft, along with a team of researchers, to find a new planet for humans.",
        "cast": [
            {
                "name": "Matthew McConaughey",
                "character": "Joseph Cooper",
                "photoUrl": "https://image.tmdb.org/t/p/w185/sY2mQUfa7TkmuZIC0TviZ1NDTeQ.jpg"
            },
            {
                "name": "Anne Hathaway",
                "character": "Dr. Amelia Brand",
                "photoUrl": "https://image.tmdb.org/t/p/w185/tLKit59zRIOqhIjKVFs0ueDmiLM.jpg"
            },
            {
                "name": "Jessica Chastain",
                "character": "Murphy Cooper",
                "photoUrl": "https://image.tmdb.org/t/p/w185/vO1N7p0L2K5P6h7.jpg"
            },
            {
                "name": "Michael Caine",
                "character": "Professor John Brand",
                "photoUrl": "https://image.tmdb.org/t/p/w185/bL1P0l9K8j2m.jpg"
            },
            {
                "name": "Matt Damon",
                "character": "Dr. Mann",
                "photoUrl": "https://image.tmdb.org/t/p/w185/elSlNg0Wqnix1AhFy5wHzz9q2.jpg"
            }
        ]
    },
    {
        "id": 945961,
        "title": "Alien: Romulus",
        "tagline": "In space, no one can hear you scream.",
        "releaseDate": "2024-08-16",
        "year": "2024",
        "rating": 7.5,
        "voteCount": 2650,
        "runtime": "119 min",
        "genres": ["Horror", "Sci-Fi", "Thriller"],
        "director": "Fede Álvarez",
        "posterUrl": "https://image.tmdb.org/t/p/w500/b33nnKl1GSFbao4l3fZDDqsMx0F.jpg",
        "backdropUrl": "https://image.tmdb.org/t/p/original/9SSEUrSqhljBMzRe4aBTh17rUaC.jpg",
        "trailerUrl": "https://www.youtube.com/watch?v=x0XDEhP4MQs",
        "overview": "While scavenging the deep ends of a derelict space station, a group of young space colonizers come face to face with the most terrifying life form in the universe.",
        "cast": [
            {
                "name": "Cailee Spaeny",
                "character": "Rain Carradine",
                "photoUrl": "https://image.tmdb.org/t/p/w185/1p1v01M2P3d5K6h7j8.jpg"
            },
            {
                "name": "David Jonsson",
                "character": "Andy",
                "photoUrl": "https://image.tmdb.org/t/p/w185/2p1v01M2P3d5K6h7j8.jpg"
            },
            {
                "name": "Archie Renaux",
                "character": "Tyler",
                "photoUrl": "https://image.tmdb.org/t/p/w185/3p1v01M2P3d5K6h7j8.jpg"
            },
            {
                "name": "Isabela Merced",
                "character": "Kay",
                "photoUrl": "https://image.tmdb.org/t/p/w185/4p1v01M2P3d5K6h7j8.jpg"
            }
        ]
    },
    {
        "id": 1022789,
        "title": "Inside Out 2",
        "tagline": "Make room for new emotions.",
        "releaseDate": "2024-06-14",
        "year": "2024",
        "rating": 7.9,
        "voteCount": 5120,
        "runtime": "96 min",
        "genres": ["Animation", "Comedy", "Family"],
        "director": "Kelsey Mann",
        "posterUrl": "https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg",
        "backdropUrl": "https://image.tmdb.org/t/p/original/p5ozvmdgsmbWe0H8umaqFdJwYmg.jpg",
        "trailerUrl": "https://www.youtube.com/watch?v=LEjhY15eCx0",
        "overview": "Teenager Riley's mind headquarters is undergoing a sudden demolition to make room for unexpected new Emotions, including Anxiety, Envy, Ennui, and Embarrassment!",
        "cast": [
            {
                "name": "Amy Poehler",
                "character": "Joy (voice)",
                "photoUrl": "https://image.tmdb.org/t/p/w185/k1P0l9K8j2m.jpg"
            },
            {
                "name": "Maya Hawke",
                "character": "Anxiety (voice)",
                "photoUrl": "https://image.tmdb.org/t/p/w185/l1P0l9K8j2m.jpg"
            },
            {
                "name": "Phyllis Smith",
                "character": "Sadness (voice)",
                "photoUrl": "https://image.tmdb.org/t/p/w185/m1P0l9K8j2m.jpg"
            },
            {
                "name": "Lewis Black",
                "character": "Anger (voice)",
                "photoUrl": "https://image.tmdb.org/t/p/w185/n1P0l9K8j2m.jpg"
            }
        ]
    },
    {
        "id": 889737,
        "title": "Joker: Folie à Deux",
        "tagline": "The world is a stage.",
        "releaseDate": "2024-10-04",
        "year": "2024",
        "rating": 7.2,
        "voteCount": 2180,
        "runtime": "138 min",
        "genres": ["Drama", "Crime", "Thriller"],
        "director": "Todd Phillips",
        "posterUrl": "https://image.tmdb.org/t/p/w500/if8QiqCI7WAGImKcJCfzp6VTyKA.jpg",
        "backdropUrl": "https://image.tmdb.org/t/p/original/tElnmtQ6yz1PjN1kePNt8yKI1vs.jpg",
        "trailerUrl": "https://www.youtube.com/watch?v=_OKAwz2NiOI",
        "overview": "Arthur Fleck is institutionalized at Arkham awaiting trial for his crimes as Joker. While struggling with his dual identity, Arthur not only stumbles upon true love, but also finds the music that's always been inside him.",
        "cast": [
            {
                "name": "Joaquin Phoenix",
                "character": "Arthur Fleck / Joker",
                "photoUrl": "https://image.tmdb.org/t/p/w185/nXMzvVFPLxSpvjQHeBhne7qd395.jpg"
            },
            {
                "name": "Lady Gaga",
                "character": "Harleen 'Lee' Quinzel",
                "photoUrl": "https://image.tmdb.org/t/p/w185/1p1v01M2P3d5K6h7j8.jpg"
            },
            {
                "name": "Brendan Gleeson",
                "character": "Jackie Sullivan",
                "photoUrl": "https://image.tmdb.org/t/p/w185/2p1v01M2P3d5K6h7j8.jpg"
            },
            {
                "name": "Catherine Keener",
                "character": "Maryanne Stewart",
                "photoUrl": "https://image.tmdb.org/t/p/w185/3p1v01M2P3d5K6h7j8.jpg"
            }
        ]
    }
]


TMDB_GENRE_MAP = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
    80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
    14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
    9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV Movie",
    53: "Thriller", 10752: "War", 37: "Western"
}

def fetch_tmdb_movies(search_query="", genre=""):
    """Fetch live movies from TMDB API if key is available, else return filtered curated list."""
    api_key = (os.environ.get("TMDB_API_KEY") or TMDB_API_KEY).strip()
    
    if api_key:
        try:
            if search_query:
                url = f"https://api.themoviedb.org/3/search/movie?api_key={api_key}&query={http_requests.utils.quote(search_query)}&language=en-US&page=1&include_adult=false"
            else:
                url = f"https://api.themoviedb.org/3/trending/movie/week?api_key={api_key}&language=en-US"
            
            resp = http_requests.get(url, timeout=8)
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("results", [])
                formatted = []
                for m in results[:20]:
                    poster = f"https://image.tmdb.org/t/p/w500{m.get('poster_path')}" if m.get('poster_path') else "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=80"
                    backdrop = f"https://image.tmdb.org/t/p/original{m.get('backdrop_path')}" if m.get('backdrop_path') else poster
                    release = m.get("release_date", "")
                    year = release.split("-")[0] if release else "2024"
                    
                    # Map genre IDs
                    genres_list = [TMDB_GENRE_MAP.get(gid) for gid in m.get("genre_ids", []) if TMDB_GENRE_MAP.get(gid)]
                    if not genres_list:
                        genres_list = ["Trending"]

                    # If genre filter active, check match
                    if genre and genre.lower() != "all":
                        if not any(genre.lower() in g.lower() for g in genres_list):
                            continue

                    formatted.append({
                        "id": m.get("id"),
                        "title": m.get("title") or m.get("original_title"),
                        "tagline": m.get("tagline", ""),
                        "releaseDate": release,
                        "year": year,
                        "rating": round(m.get("vote_average", 0), 1),
                        "voteCount": m.get("vote_count", 0),
                        "runtime": "N/A",
                        "genres": genres_list,
                        "director": "Various",
                        "posterUrl": poster,
                        "backdropUrl": backdrop,
                        "trailerUrl": f"https://www.youtube.com/results?search_query={http_requests.utils.quote((m.get('title') or '') + ' official trailer')}",
                        "overview": m.get("overview") or "No synopsis available.",
                        "cast": []
                    })
                if formatted:
                    return formatted
        except Exception as e:
            print(f"TMDB API fetch error: {e}")

    # Curated fallback
    filtered = CURATED_MOVIES
    if search_query:
        q = search_query.lower()
        filtered = [
            m for m in filtered 
            if q in m["title"].lower() 
            or q in m["overview"].lower() 
            or any(q in actor["name"].lower() for actor in m.get("cast", []))
            or any(q in g.lower() for g in m.get("genres", []))
        ]
    if genre and genre.lower() != "all":
        g_lower = genre.lower()
        filtered = [m for m in filtered if any(g_lower in g.lower() for g in m.get("genres", []))]
    return filtered


def fetch_tmdb_movie_details(movie_id):
    """Fetch movie details and full cast from TMDB or curated dataset."""
    api_key = (os.environ.get("TMDB_API_KEY") or TMDB_API_KEY).strip()
    
    # Check curated first
    for m in CURATED_MOVIES:
        if str(m["id"]) == str(movie_id):
            return m

    if api_key:
        try:
            url = f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={api_key}&append_to_response=credits,videos&language=en-US"
            resp = http_requests.get(url, timeout=8)
            if resp.status_code == 200:
                m = resp.json()
                poster = f"https://image.tmdb.org/t/p/w500{m.get('poster_path')}" if m.get('poster_path') else ""
                backdrop = f"https://image.tmdb.org/t/p/original{m.get('backdrop_path')}" if m.get('backdrop_path') else poster
                release = m.get("release_date", "")
                year = release.split("-")[0] if release else "N/A"
                
                # Cast
                cast_list = []
                credits = m.get("credits", {})
                for c in credits.get("cast", [])[:10]:
                    photo = f"https://image.tmdb.org/t/p/w185{c.get('profile_path')}" if c.get('profile_path') else "https://via.placeholder.com/185x278?text=No+Photo"
                    cast_list.append({
                        "name": c.get("name"),
                        "character": c.get("character", "Actor"),
                        "photoUrl": photo
                    })
                
                # Director
                director = "Unknown"
                for crew in credits.get("crew", []):
                    if crew.get("job") == "Director":
                        director = crew.get("name")
                        break
                
                # Trailer
                trailer_url = f"https://www.youtube.com/results?search_query={http_requests.utils.quote(m.get('title', '') + ' official trailer')}"
                for v in m.get("videos", {}).get("results", []):
                    if v.get("site") == "YouTube" and v.get("type") in ["Trailer", "Teaser"]:
                        trailer_url = f"https://www.youtube.com/watch?v={v.get('key')}"
                        break
                
                return {
                    "id": m.get("id"),
                    "title": m.get("title"),
                    "tagline": m.get("tagline", ""),
                    "releaseDate": release,
                    "year": year,
                    "rating": round(m.get("vote_average", 0), 1),
                    "voteCount": m.get("vote_count", 0),
                    "runtime": f"{m.get('runtime', 0)} min" if m.get('runtime') else "N/A",
                    "genres": [g["name"] for g in m.get("genres", [])],
                    "director": director,
                    "posterUrl": poster,
                    "backdropUrl": backdrop,
                    "trailerUrl": trailer_url,
                    "overview": m.get("overview", "No synopsis provided."),
                    "cast": cast_list
                }
        except Exception as e:
            print(f"Error fetching movie details from TMDB: {e}")
            
    return None


@app.route("/movies/trending", methods=["GET"])
def get_trending_movies():
    q = request.args.get("q", "").strip()
    genre = request.args.get("genre", "").strip()
    movies = fetch_tmdb_movies(search_query=q, genre=genre)
    return jsonify({"movies": movies, "count": len(movies)}), 200


@app.route("/movies/<int:movie_id>", methods=["GET"])
def get_movie_details(movie_id):
    details = fetch_tmdb_movie_details(movie_id)
    if details:
        return jsonify({"movie": details}), 200
    return jsonify({"message": "Movie not found"}), 404


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )