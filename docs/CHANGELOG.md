# Changelog - WorkGrid Discord Clone

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-02-23

### 🔒 Security

#### Added
- JWT tokens now have 7-day expiration
- Username uniqueness validation (3-30 characters, alphanumeric + underscore)
- Email format validation
- Password minimum length enforcement (6 characters)

#### Fixed
- Fixed user status race condition when multiple tabs are open

### 🐛 Bug Fixes

#### Backend
- Fixed JWT token expiration issue (BUG-001)
- Fixed username uniqueness check (BUG-002)
- Fixed user status race condition with multiple tabs (BUG-006)
- Improved socket connection tracking with Set-based connection counting

#### Frontend
- Fixed typing indicator timeout not being assigned (BUG-007)
- Fixed memory leak in useSocket hook (BUG-008)
- Fixed avatar error infinite loop (BUG-009)
- Cleaned up console.log statements

### 🚀 Features

#### Authentication
- User registration with email and username
- JWT-based authentication
- Password hashing with bcrypt

#### Server Management
- Create and join servers
- Server icons and customization
- Invite links

#### Channels
- Text and voice channels
- Channel categories with expand/collapse
- Channel reordering within categories

#### Messaging
- Real-time messaging with Socket.IO
- Message editing and deletion
- Reactions with emojis
- File attachments
- Reply to messages
- Typing indicators

#### Roles & Permissions
- Discord-like permission system
- Role hierarchy (owner > admin > moderator > member)
- Channel-specific permissions

#### Friends & DMs
- Friend requests (send, accept, reject)
- Block/unblock users
- Direct messaging
- Unread message badges

#### Mobile Support
- Responsive design for mobile devices
- Bottom navigation bar
- Drawer components for sidebars
- Touch-friendly UI

### 📱 Mobile Responsive

- Added mobile bottom navigation
- Server/channel/member drawers
- Responsive padding and font sizes
- Touch targets minimum 44px

### 🛠️ Technical

- React 19 + TypeScript + Vite
- Tailwind CSS with custom Discord theme
- Socket.IO for real-time communication
- SQLite database
- shadcn/ui components

## Known Issues

### Critical (Open)
- No rate limiting on API endpoints (brute force risk)
- Socket events lack authorization checks for channel membership
- CORS allows all origins

### Medium Priority
- No input sanitization (XSS risk)
- Socket typing events have no rate limiting
- No file size validation on client
- Auto-scroll too aggressive in chat

### Low Priority
- Console logs in production code
- Inconsistent error formats
- No edit time limit for messages

---

## Testing Checklist Status

### ✅ Working Features
- [x] User registration with validation
- [x] User login/logout
- [x] Create/join servers
- [x] Create channels (text & voice)
- [x] Send/receive messages
- [x] Message editing and deletion
- [x] Emoji reactions
- [x] File uploads
- [x] Typing indicators
- [x] Friend requests
- [x] Direct messaging
- [x] Channel categories
- [x] Mobile responsive layout

### ⏳ Pending Improvements
- [ ] Rate limiting
- [ ] Better error handling UI
- [ ] Message search
- [ ] Voice chat
