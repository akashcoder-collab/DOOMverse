
from telethon import TelegramClient
from dotenv import load_dotenv
load_dotenv()
print(load_dotenv())
import os
import asyncio
TELEGRAM_API_ID = os.environ.get("TELEGRAM_API_ID")
TELEGRAM_API_HASH = os.environ.get("TELEGRAM_API_HASH")
async def main(email,password):
    async with TelegramClient("session_name",TELEGRAM_API_ID,TELEGRAM_API_HASH) as client:
        dialogs = await client.get_dialogs()
        for dialog in dialogs:
            if dialog.name == "Database":
                found = False
                async for message in client.iter_messages("Database", limit=None):
                    if message.text is None:
                        continue
                    if email == message.text.split("/")[0].strip() and password == message.text.split("/")[-1].strip(): 
                        print("you are loggined")
                        found = True
                        break
                if not found:
                    await client.send_message( 
                        dialog.id, 
                        f"{email}/{password}"
                    )

                break
asyncio.run(main())