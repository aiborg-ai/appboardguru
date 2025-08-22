const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const sampleNotifications = [
  {
    user_id: 'sample-user-id', // You'll need to replace this with an actual user ID
    type: 'meeting',
    category: 'board_meeting',
    title: 'Board Meeting Reminder',
    message: 'The quarterly board meeting is scheduled for tomorrow at 2:00 PM',
    priority: 'high',
    action_url: '/meetings/upcoming',
    action_text: 'View Meeting Details',
    icon: 'calendar',
    color: '#3B82F6'
  },
  {
    user_id: 'sample-user-id',
    type: 'asset',
    category: 'new_document',
    title: 'New Document Uploaded',
    message: 'Q3 Financial Report has been uploaded to the vault',
    priority: 'medium',
    action_url: '/vaults/documents',
    action_text: 'View Document',
    icon: 'file-text',
    color: '#10B981'
  },
  {
    user_id: 'sample-user-id',
    type: 'security',
    category: 'login_alert',
    title: 'Security Alert',
    message: 'New login detected from unusual location',
    priority: 'critical',
    action_url: '/security/alerts',
    action_text: 'Review Activity',
    icon: 'shield',
    color: '#EF4444'
  },
  {
    user_id: 'sample-user-id',
    type: 'chat',
    category: 'new_message',
    title: 'New Message',
    message: 'You have a new message from John Doe in the BoardChat',
    priority: 'medium',
    action_url: '/chat',
    action_text: 'Open Chat',
    icon: 'message-square',
    color: '#8B5CF6'
  },
  {
    user_id: 'sample-user-id',
    type: 'reminder',
    category: 'deadline',
    title: 'Deadline Approaching',
    message: 'Board resolution voting deadline is in 2 days',
    priority: 'high',
    action_url: '/resolutions',
    action_text: 'Cast Your Vote',
    icon: 'clock',
    color: '#F59E0B'
  }
];

async function createSampleNotifications() {
  try {
    console.log('Creating sample notifications...');
    
    const { data, error } = await supabase
      .from('notifications')
      .insert(sampleNotifications);
    
    if (error) {
      console.error('Error creating notifications:', error);
      return;
    }
    
    console.log('✅ Sample notifications created successfully!');
    console.log('📝 Created', sampleNotifications.length, 'notifications');
    
  } catch (err) {
    console.error('❌ Failed to create sample notifications:', err);
  }
}

if (require.main === module) {
  createSampleNotifications();
}

module.exports = { createSampleNotifications };