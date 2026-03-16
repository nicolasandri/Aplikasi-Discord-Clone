const fs = require('fs');
const path = '/opt/workgrid/app/src/components/DMChatArea.tsx';

let content = fs.readFileSync(path, 'utf8');

// Cari dan ganti fungsi formatTime
const oldFunction = `function formatTime(timestamp: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  // Format: 11:28:30 PM
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = (hours % 12 || 12).toString().padStart(2, '0');
  return \`\${displayHours}:\${minutes}:\${seconds} \${ampm}\`;
}`;

const newFunction = `function formatTime(timestamp: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  // Format 24-jam dengan timezone Asia/Jakarta (WIB)
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta'
  });
}`;

if (content.includes(oldFunction)) {
  content = content.replace(oldFunction, newFunction);
  fs.writeFileSync(path, content);
  console.log('✅ formatTime function updated successfully!');
} else {
  console.log('❌ Old function pattern not found, trying alternative...');
  // Try to find and replace any formatTime function
  const regex = /function formatTime\(timestamp: string\): string \{[\s\S]*?^\}/m;
  if (regex.test(content)) {
    content = content.replace(regex, newFunction);
    fs.writeFileSync(path, content);
    console.log('✅ formatTime function replaced with regex!');
  } else {
    console.log('❌ Could not find formatTime function');
  }
}
