with open('/opt/workgrid/server/server.js', 'r') as f:
    content = f.read()

# The GIF URL for welcome message
WAVE_GIF_URL = "https://media0.giphy.com/media/v1.Y2lkPTlkYjFmMTA2em13dmFobDRzNHRrdXQ5NzhybGp3MXZrZHM3N2V1eDJsZjYwY3B3ZSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/LPFNd1AJBoYcVUExmE/200_d.gif"

# Fix for register endpoint (group code registration)
old_register = '''              const welcomeMessage = await messageDB.create(
                welcomeChannel.id,
                user.id,
                `Selamat datang **${user.display_name || user.username}!** 👋 Semua member sekarang bisa berteman denganmu.`,
                null,
                null,
                true // isSystem = true
              );'''

new_register = f'''              const welcomeMessage = await messageDB.create(
                welcomeChannel.id,
                user.id,
                `Selamat datang **${{user.display_name || user.username}}!** 👋 Semua member sekarang bisa berteman denganmu.`,
                null,
                [{{ url: "{WAVE_GIF_URL}", type: "image/gif", name: "wave.gif" }}],
                true // isSystem = true
              );'''

content = content.replace(old_register, new_register)

# Fix for invite join endpoint
old_invite = '''        const welcomeMessage = await messageDB.create(
          welcomeChannel.id,
          userId,
          `Selamat datang **${user.display_name || user.username}!** 👋 Semua member sekarang bisa berteman denganmu.`,
          null,
          null,
          true // isSystem = true
        );'''

new_invite = f'''        const welcomeMessage = await messageDB.create(
          welcomeChannel.id,
          userId,
          `Selamat datang **${{user.display_name || user.username}}!** 👋 Semua member sekarang bisa berteman denganmu.`,
          null,
          [{{ url: "{WAVE_GIF_URL}", type: "image/gif", name: "wave.gif" }}],
          true // isSystem = true
        );'''

content = content.replace(old_invite, new_invite)

with open('/opt/workgrid/server/server.js', 'w') as f:
    f.write(content)

print('GIF added to welcome message!')
