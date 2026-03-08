/**
 * Test script untuk channel access control
 * Usage: node test-channel-access.js <user_id> <server_id>
 */

const API_URL = 'http://localhost:3001/api';

// Test users and their expected access
const TEST_CASES = [
  {
    name: 'WorkGrid GM',
    userId: '4e0bd272-0fee-4fe4-92ba-615fd90bb757',
    serverId: '14ee678c-3db9-46e3-b68b-4a636a896c28',
    expectedChannels: ['Operasional'], // Only this channel should be visible
    description: 'User with CS role - should only see Operasional channel'
  }
];

async function getUserToken(userId) {
  // Note: In production we'd need actual login, but for testing
  // we'll query the database directly
  const { dbGet } = require('./server/database.js');
  const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
  return user;
}

async function testChannelAccess() {
  const { dbAll, dbGet, roleChannelAccessDB } = require('./server/database.js');
  
  console.log('=== Channel Access Control Test ===\n');
  
  for (const testCase of TEST_CASES) {
    console.log(`\n--- Testing: ${testCase.name} ---`);
    console.log(`Description: ${testCase.description}`);
    console.log(`User ID: ${testCase.userId}`);
    console.log(`Server ID: ${testCase.serverId}`);
    
    // 1. Get user roles
    const memberRoles = await dbAll(
      `SELECT mr.role_id, sr.name as role_name 
       FROM member_roles mr
       JOIN server_roles sr ON mr.role_id = sr.id
       WHERE mr.user_id = ? AND mr.server_id = ?`,
      [testCase.userId, testCase.serverId]
    );
    
    const member = await dbGet(
      'SELECT role, role_id FROM server_members WHERE user_id = ? AND server_id = ?',
      [testCase.userId, testCase.serverId]
    );
    
    console.log('\nUser Roles:');
    console.log('  - Legacy role:', member?.role || 'none');
    console.log('  - Server member role_id:', member?.role_id || 'none');
    memberRoles.forEach(r => console.log(`  - ${r.role_name} (${r.role_id})`));
    
    // 2. Get all channels
    const channels = await dbAll(
      'SELECT * FROM channels WHERE server_id = ? ORDER BY position',
      [testCase.serverId]
    );
    
    console.log('\nAll Channels in Server:');
    channels.forEach(c => console.log(`  - ${c.name} (${c.id})`));
    
    // 3. Get channel access for each role
    const roleIds = [
      ...memberRoles.map(r => r.role_id),
      ...(member?.role_id ? [member.role_id] : [])
    ];
    const uniqueRoleIds = [...new Set(roleIds)];
    
    console.log('\nChannel Access by Role:');
    for (const roleId of uniqueRoleIds) {
      const access = await roleChannelAccessDB.getRoleChannelAccess(roleId);
      console.log(`\n  Role ${roleId}:`);
      access.forEach(a => {
        console.log(`    - ${a.channel_name}: ${a.is_allowed ? 'ALLOWED' : 'DENIED'}`);
      });
    }
    
    // 4. Simulate the filtering logic
    console.log('\n--- Filtered Result (Simulating Backend Logic) ---');
    
    // Check if owner
    const server = await dbGet('SELECT * FROM servers WHERE id = ?', [testCase.serverId]);
    if (server?.owner_id === testCase.userId) {
      console.log('User is OWNER - all channels visible');
      continue;
    }
    
    // Check legacy role
    if (['admin', 'owner', 'moderator'].includes(member?.role)) {
      console.log(`User has legacy role '${member.role}' - all channels visible`);
      continue;
    }
    
    // Filter by role access
    const accessibleChannels = [];
    for (const channel of channels) {
      let hasAccess = false;
      for (const roleId of uniqueRoleIds) {
        const access = await roleChannelAccessDB.hasChannelAccess(roleId, channel.id);
        if (access) {
          hasAccess = true;
          break;
        }
      }
      if (hasAccess) {
        accessibleChannels.push(channel.name);
        console.log(`  ✓ ${channel.name} - ACCESS GRANTED`);
      } else {
        console.log(`  ✗ ${channel.name} - ACCESS DENIED`);
      }
    }
    
    console.log('\nExpected channels:', testCase.expectedChannels);
    console.log('Actual accessible:', accessibleChannels);
    
    const match = JSON.stringify(accessibleChannels.sort()) === JSON.stringify(testCase.expectedChannels.sort());
    console.log(`\nTest Result: ${match ? '✓ PASSED' : '✗ FAILED'}`);
  }
  
  process.exit(0);
}

testChannelAccess().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
