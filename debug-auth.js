// Quick auth debug script
// Run this in browser console on the vault creation page

console.log('=== AUTH DEBUG START ===');

// Check if we're authenticated
(async () => {
  try {
    // Try to get current user
    const response = await fetch('/api/auth/user', {
      method: 'GET',
      credentials: 'include'
    });
    
    console.log('Auth check response:', response.status);
    
    if (response.ok) {
      const userData = await response.json();
      console.log('Current user:', userData);
    } else {
      const errorData = await response.text();
      console.error('Auth check failed:', errorData);
    }
    
    // Check cookies
    console.log('Document cookies:', document.cookie);
    
    // Check localStorage
    console.log('LocalStorage keys:', Object.keys(localStorage));
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('auth')) {
        console.log(`${key}:`, localStorage.getItem(key));
      }
    });
    
  } catch (error) {
    console.error('Auth debug error:', error);
  }
  
  console.log('=== AUTH DEBUG END ===');
})();