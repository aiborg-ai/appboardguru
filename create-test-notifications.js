const { createClient } = require('@supabase/supabase-js');

// You'll need to get these from your .env.local file
const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'your-supabase-url';
const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] || process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Sample user ID - you'll need to replace this with an actual user ID from your auth.users table
const SAMPLE_USER_ID = '00000000-0000-0000-0000-000000000000'; // Placeholder

const sampleNotifications = [
  {
    user_id: SAMPLE_USER_ID,
    type: 'meeting',
    category: 'board_meeting',
    title: 'Board Meeting Reminder',
    message: 'The quarterly board meeting is scheduled for tomorrow at 2:00 PM',
    priority: 'high',
    status: 'unread',
    action_url: '/meetings/upcoming',
    action_text: 'View Meeting Details',
    icon: 'calendar',
    color: '#3B82F6'
  },
  {
    user_id: SAMPLE_USER_ID,
    type: 'asset',
    category: 'new_document',
    title: 'New Document Uploaded',
    message: 'Q3 Financial Report has been uploaded to the vault',
    priority: 'medium',
    status: 'unread',
    action_url: '/vaults/documents',
    action_text: 'View Document',
    icon: 'file-text',
    color: '#10B981'
  },
  {
    user_id: SAMPLE_USER_ID,
    type: 'security',
    category: 'login_alert',
    title: 'Security Alert',
    message: 'New login detected from unusual location',
    priority: 'critical',
    status: 'unread',
    action_url: '/security/alerts',
    action_text: 'Review Activity',
    icon: 'shield',
    color: '#EF4444'
  },
  {
    user_id: SAMPLE_USER_ID,
    type: 'chat',
    category: 'new_message',
    title: 'New Message',
    message: 'You have a new message from John Doe in the BoardChat',
    priority: 'medium',
    status: 'read',
    action_url: '/chat',
    action_text: 'Open Chat',
    icon: 'message-square',
    color: '#8B5CF6'
  },
  {
    user_id: SAMPLE_USER_ID,
    type: 'reminder',
    category: 'deadline',
    title: 'Deadline Approaching',
    message: 'Board resolution voting deadline is in 2 days',
    priority: 'high',
    status: 'unread',
    action_url: '/resolutions',
    action_text: 'Cast Your Vote',
    icon: 'clock',
    color: '#F59E0B'
  },
  {
    user_id: SAMPLE_USER_ID,
    type: 'system',
    category: 'maintenance',
    title: 'System Maintenance',
    message: 'Scheduled maintenance will occur on Sunday at 2 AM UTC',
    priority: 'low',
    status: 'unread',
    action_url: null,
    action_text: null,
    icon: 'settings',
    color: '#6B7280'
  }
];

async function createTestNotifications() {
  try {
    console.log('🔧 Creating test notifications...');
    
    // First, let's check if we have any users in the system
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    let actualUserId = SAMPLE_USER_ID;
    
    if (userError) {
      console.log('⚠️  Could not fetch users, using placeholder user ID');
      console.log('   If you have actual users, replace SAMPLE_USER_ID in the script');
    } else if (users && users.users && users.users.length > 0) {
      actualUserId = users.users[0].id;
      console.log(`✅ Found user: ${actualUserId}`);
    } else {
      console.log('⚠️  No users found, using placeholder user ID');
      console.log('   You may need to sign up a user first');
    }
    
    // Update all notifications with the actual user ID
    const notificationsToInsert = sampleNotifications.map(notification => ({
      ...notification,
      user_id: actualUserId
    }));
    
    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationsToInsert)
      .select();
    
    if (error) {
      console.error('❌ Error creating notifications:', error);
      return;
    }
    
    console.log('✅ Successfully created', data.length, 'test notifications!');
    console.log('\n📊 Notification Summary:');
    
    const summary = data.reduce((acc, notification) => {
      acc[notification.type] = (acc[notification.type] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(summary).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} notification${count !== 1 ? 's' : ''}`);
    });
    
    const unreadCount = data.filter(n => n.status === 'unread').length;
    console.log(`\n🔔 ${unreadCount} unread notifications created`);
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Go to http://localhost:3006/dashboard');
    console.log('2. Click the "Board Hub" button (bottom-right)');
    console.log('3. Click the "Alerts" tab to see your notifications!');
    console.log('4. Notice the notification count badges on the tabs');
    
  } catch (err) {
    console.error('❌ Failed to create test notifications:', err);
  }
}

// Check if we can connect to Supabase first
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      console.log('\n💡 Troubleshooting:');
      console.log('1. Make sure your .env.local file has the correct Supabase credentials');
      console.log('2. Verify that the notifications table was created successfully');
      console.log('3. Check that your Supabase project is running');
      return false;
    }
    
    console.log('✅ Database connection successful!');
    return true;
  } catch (err) {
    console.error('❌ Connection test failed:', err.message);
    return false;
  }
}

if (require.main === module) {
  testConnection().then(success => {
    if (success) {
      createTestNotifications();
    }
  });
}

module.exports = { createTestNotifications };