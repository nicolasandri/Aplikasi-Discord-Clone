import re

with open('/opt/workgrid/app/src/components/ChatArea.tsx', 'r') as f:
    content = f.read()

# Add import for BotMessage
if "import { BotMessage } from './BotMessage';" not in content:
    content = content.replace(
        "import { PermissionBot } from './PermissionBot';",
        "import { PermissionBot } from './PermissionBot';\nimport { BotMessage } from './BotMessage';"
    )
    print('✅ Import added')

# Find the system message check and add bot message check before it
old_check = '''                    // Render welcome message for system messages
                    if (message.isSystem || message.type === 'system') {
                      return (
                        <WelcomeMessage
                          key={message.id}
                          message={message}
                          onWave={() => handleReaction(message.id, '👋')}
                        />
                      );
                    }'''

new_check = '''                    // Render bot messages (permission bot)
                    if (message.user_id === 'system' || message.is_bot) {
                      try {
                        const parsed = JSON.parse(message.content);
                        if (parsed.embed) {
                          return (
                            <div key={message.id} className="px-4 py-2">
                              <BotMessage content={message.content} />
                            </div>
                          );
                        }
                      } catch {
                        // Not a bot embed message, render normally
                      }
                    }

                    // Render welcome message for system messages
                    if (message.isSystem || message.type === 'system') {
                      return (
                        <WelcomeMessage
                          key={message.id}
                          message={message}
                          onWave={() => handleReaction(message.id, '👋')}
                        />
                      );
                    }'''

if old_check in content:
    content = content.replace(old_check, new_check)
    with open('/opt/workgrid/app/src/components/ChatArea.tsx', 'w') as f:
        f.write(content)
    print('✅ Bot message render added!')
else:
    print('❌ Pattern not found')
