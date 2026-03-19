#!/bin/bash

# One-liner script to setup SSH public key on VPS
# Copy and paste everything below into the VPS terminal

mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC1m6VG1dqPZ0rKLIQ0jHjb1buRBNJCH1XRHPIPZ62PCoQiIlvzlGwUS4GIklSm9AlosHQHsh07L0JLgZWx/ISg20vyGmq3TXeMSuw+pUE/McaAoFQBeXtUHaM/mchGFFf1ApHLAjkVEFl8/4cuyHDHPbw/bd7qiu8igIKilD/nVWP1AnX4apk8qho7W25vxL37q/q0qPakDtkX5N/BG+d1/YFYHdKkQQSYY1fVtrqn2Y5cxJV9J1NDjq+TToOg/KsPYea6DXyINBpaoOhqP+lzQhYW/BkLfaM33LUtcG3RnIWF+C8WgUPjYi8I77xKvxTYI7lLZKR7Z4JkAGEL4/wgY2mmAY5Z+I18vHQR2Z5cHeK6zIVxVkuyYu5ejqUbHgNGlmxFWTjZ0xlfkLfDZX9TtbNHb1rP2HlnKDbMTss3AX2Wcz4vWP6TIjl+1fjs/AvgsKvUiIalQgXz0AUgUf+s9JnW5Z/ujudImFO8vNmbh0d3VFEpvXAb993g855yWt80+FVTjNgL5TZBUUbn/JQjI/I2qaSt92JQAVAfY2vdqYYmuwmnvoNswm7WNM5aL3/Ukbg+HHsN918P/EFSwcFwqJZg0bL/CsMxeWcCnB7KQv9ugiDLEhpereFR1fbojwFVqkFxK+/xu5BQ8kadT1vpkVcBVQoTRXpibFrkNX9RlQ== workgrid@152.42.229.212' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo "✅ SSH Key Setup Complete!" && echo "" && echo "You can now exit and connect using:" && echo "ssh -i ~/.ssh/workgrid_vps root@152.42.229.212"
