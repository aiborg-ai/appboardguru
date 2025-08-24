// WebSocket utilities for real-time performance testing
import ws from 'k6/ws';
import { check } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom metrics for WebSocket performance
const wsConnectionTime = new Trend('websocket_connection_time');
const wsMessageLatency = new Trend('websocket_message_latency');
const wsConnectionSuccess = new Rate('websocket_connection_success');
const wsMessageSuccess = new Rate('websocket_message_success');
const wsReconnections = new Counter('websocket_reconnections');

// WebSocket message types for BoardGuru real-time features
export const messageTypes = {
  // Meeting-related messages
  MEETING_JOIN: 'meeting:join',
  MEETING_LEAVE: 'meeting:leave',
  MEETING_SPEAK: 'meeting:speak',
  MEETING_MUTE: 'meeting:mute',
  MEETING_UNMUTE: 'meeting:unmute',
  MEETING_RAISE_HAND: 'meeting:raise_hand',
  MEETING_LOWER_HAND: 'meeting:lower_hand',
  
  // Document collaboration
  DOC_EDIT: 'document:edit',
  DOC_CURSOR: 'document:cursor',
  DOC_SELECTION: 'document:selection',
  DOC_COMMENT: 'document:comment',
  DOC_ANNOTATION: 'document:annotation',
  
  // Voting and polling
  VOTE_CAST: 'vote:cast',
  POLL_CREATE: 'poll:create',
  POLL_RESPOND: 'poll:respond',
  
  // Notifications and presence
  PRESENCE_UPDATE: 'presence:update',
  NOTIFICATION_SEND: 'notification:send',
  NOTIFICATION_READ: 'notification:read',
  
  // Chat and messaging
  CHAT_MESSAGE: 'chat:message',
  CHAT_TYPING: 'chat:typing',
  CHAT_READ: 'chat:read',
  
  // System events
  HEARTBEAT: 'system:heartbeat',
  RECONNECT: 'system:reconnect',
  ERROR: 'system:error'
};

// Create WebSocket connection with authentication
export function connectWebSocket(baseUrl, authSession, options = {}) {
  const wsUrl = baseUrl.replace('http://', 'ws://').replace('https://', 'wss://');
  const connectionUrl = `${wsUrl}/api/websocket?token=${authSession.token}`;
  
  const params = {
    headers: {
      'Authorization': `Bearer ${authSession.token}`,
      'X-Organization-Id': authSession.user.organizationId || '',
    },
    ...options
  };

  const startTime = new Date();
  
  const response = ws.connect(connectionUrl, params, function (socket) {
    const connectionTime = new Date() - startTime;
    wsConnectionTime.add(connectionTime);
    wsConnectionSuccess.add(true);
    
    console.log(`WebSocket connected for user ${authSession.user.email} in ${connectionTime}ms`);
    
    socket.on('open', function () {
      // Send initial presence update
      const presenceMessage = {
        type: messageTypes.PRESENCE_UPDATE,
        payload: {
          userId: authSession.user.id,
          status: 'online',
          timestamp: new Date().toISOString()
        }
      };
      socket.send(JSON.stringify(presenceMessage));
    });
    
    socket.on('message', function (data) {
      const message = JSON.parse(data);
      const receivedTime = new Date();
      
      // Calculate latency if message has timestamp
      if (message.timestamp) {
        const latency = receivedTime - new Date(message.timestamp);
        wsMessageLatency.add(latency);
      }
      
      wsMessageSuccess.add(true);
      handleWebSocketMessage(socket, message, authSession);
    });
    
    socket.on('close', function () {
      console.log(`WebSocket closed for user ${authSession.user.email}`);
    });
    
    socket.on('error', function (e) {
      console.error(`WebSocket error for user ${authSession.user.email}:`, e.error());
      wsConnectionSuccess.add(false);
      wsMessageSuccess.add(false);
    });
    
    // Set up periodic activities
    if (options.enablePeriodicMessages !== false) {
      setupPeriodicActivities(socket, authSession);
    }
  });

  if (!response) {
    wsConnectionSuccess.add(false);
    console.error(`Failed to connect WebSocket for user ${authSession.user.email}`);
  }

  return response;
}

// Handle different types of WebSocket messages
function handleWebSocketMessage(socket, message, authSession) {
  switch (message.type) {
    case messageTypes.HEARTBEAT:
      // Respond to heartbeat
      socket.send(JSON.stringify({
        type: messageTypes.HEARTBEAT,
        payload: { timestamp: new Date().toISOString() }
      }));
      break;
      
    case messageTypes.MEETING_JOIN:
      // Acknowledge meeting join
      socket.send(JSON.stringify({
        type: messageTypes.PRESENCE_UPDATE,
        payload: {
          userId: authSession.user.id,
          meetingId: message.payload.meetingId,
          status: 'in_meeting',
          timestamp: new Date().toISOString()
        }
      }));
      break;
      
    case messageTypes.DOC_EDIT:
      // Simulate collaborative editing response
      if (Math.random() < 0.3) { // 30% chance to respond with edit
        socket.send(JSON.stringify({
          type: messageTypes.DOC_EDIT,
          payload: {
            documentId: message.payload.documentId,
            userId: authSession.user.id,
            operation: generateRandomDocumentOperation(),
            timestamp: new Date().toISOString()
          }
        }));
      }
      break;
      
    case messageTypes.VOTE_CAST:
      // Handle voting notifications
      break;
      
    case messageTypes.NOTIFICATION_SEND:
      // Mark notification as received
      socket.send(JSON.stringify({
        type: messageTypes.NOTIFICATION_READ,
        payload: {
          notificationId: message.payload.id,
          userId: authSession.user.id,
          timestamp: new Date().toISOString()
        }
      }));
      break;
      
    default:
      // Handle unknown message types
      console.log(`Received unknown message type: ${message.type}`);
  }
}

// Set up periodic WebSocket activities to simulate realistic usage
function setupPeriodicActivities(socket, authSession) {
  const activities = [
    // Send heartbeat every 30 seconds
    {
      interval: 30000,
      action: () => {
        socket.send(JSON.stringify({
          type: messageTypes.HEARTBEAT,
          payload: { timestamp: new Date().toISOString() }
        }));
      }
    },
    
    // Update presence every 2 minutes
    {
      interval: 120000,
      action: () => {
        socket.send(JSON.stringify({
          type: messageTypes.PRESENCE_UPDATE,
          payload: {
            userId: authSession.user.id,
            status: ['online', 'away', 'busy'][Math.floor(Math.random() * 3)],
            timestamp: new Date().toISOString()
          }
        }));
      }
    },
    
    // Simulate typing in chat occasionally
    {
      interval: 45000,
      action: () => {
        if (Math.random() < 0.2) { // 20% chance
          socket.send(JSON.stringify({
            type: messageTypes.CHAT_TYPING,
            payload: {
              userId: authSession.user.id,
              timestamp: new Date().toISOString()
            }
          }));
        }
      }
    }
  ];
  
  // Set up all periodic activities
  activities.forEach(activity => {
    setInterval(activity.action, activity.interval);
  });
}

// Simulate realistic meeting WebSocket behavior
export function simulateMeetingParticipant(socket, authSession, meetingId, duration = 300000) {
  const meetingActions = [
    // Join meeting
    () => {
      socket.send(JSON.stringify({
        type: messageTypes.MEETING_JOIN,
        payload: {
          meetingId: meetingId,
          userId: authSession.user.id,
          timestamp: new Date().toISOString()
        }
      }));
    },
    
    // Periodic speaking (unmute/mute)
    () => {
      if (Math.random() < 0.1) { // 10% chance to speak
        socket.send(JSON.stringify({
          type: messageTypes.MEETING_UNMUTE,
          payload: {
            meetingId: meetingId,
            userId: authSession.user.id,
            timestamp: new Date().toISOString()
          }
        }));
        
        // Mute again after 30 seconds
        setTimeout(() => {
          socket.send(JSON.stringify({
            type: messageTypes.MEETING_MUTE,
            payload: {
              meetingId: meetingId,
              userId: authSession.user.id,
              timestamp: new Date().toISOString()
            }
          }));
        }, 30000);
      }
    },
    
    // Raise hand occasionally
    () => {
      if (Math.random() < 0.05) { // 5% chance to raise hand
        socket.send(JSON.stringify({
          type: messageTypes.MEETING_RAISE_HAND,
          payload: {
            meetingId: meetingId,
            userId: authSession.user.id,
            timestamp: new Date().toISOString()
          }
        }));
      }
    }
  ];
  
  // Execute join immediately
  meetingActions[0]();
  
  // Set up periodic actions
  const actionInterval = setInterval(() => {
    const action = meetingActions[Math.floor(Math.random() * meetingActions.length)];
    action();
  }, 15000); // Every 15 seconds
  
  // Leave meeting after duration
  setTimeout(() => {
    clearInterval(actionInterval);
    socket.send(JSON.stringify({
      type: messageTypes.MEETING_LEAVE,
      payload: {
        meetingId: meetingId,
        userId: authSession.user.id,
        timestamp: new Date().toISOString()
      }
    }));
  }, duration);
}

// Simulate document collaboration
export function simulateDocumentCollaboration(socket, authSession, documentId, duration = 600000) {
  const collaborationActions = [
    // Send cursor updates
    () => {
      socket.send(JSON.stringify({
        type: messageTypes.DOC_CURSOR,
        payload: {
          documentId: documentId,
          userId: authSession.user.id,
          position: Math.floor(Math.random() * 1000),
          timestamp: new Date().toISOString()
        }
      }));
    },
    
    // Make document edits
    () => {
      if (Math.random() < 0.3) { // 30% chance to edit
        socket.send(JSON.stringify({
          type: messageTypes.DOC_EDIT,
          payload: {
            documentId: documentId,
            userId: authSession.user.id,
            operation: generateRandomDocumentOperation(),
            timestamp: new Date().toISOString()
          }
        }));
      }
    },
    
    // Add comments/annotations
    () => {
      if (Math.random() < 0.1) { // 10% chance to comment
        socket.send(JSON.stringify({
          type: messageTypes.DOC_COMMENT,
          payload: {
            documentId: documentId,
            userId: authSession.user.id,
            comment: generateRandomComment(),
            position: Math.floor(Math.random() * 1000),
            timestamp: new Date().toISOString()
          }
        }));
      }
    }
  ];
  
  // Set up periodic collaboration actions
  const actionInterval = setInterval(() => {
    const action = collaborationActions[Math.floor(Math.random() * collaborationActions.length)];
    action();
  }, 5000); // Every 5 seconds
  
  // Stop after duration
  setTimeout(() => {
    clearInterval(actionInterval);
  }, duration);
}

// Generate realistic document operations
function generateRandomDocumentOperation() {
  const operations = [
    { type: 'insert', text: 'Sample text insertion', position: Math.floor(Math.random() * 100) },
    { type: 'delete', length: Math.floor(Math.random() * 10) + 1, position: Math.floor(Math.random() * 100) },
    { type: 'replace', text: 'Replacement text', length: Math.floor(Math.random() * 5) + 1, position: Math.floor(Math.random() * 100) }
  ];
  
  return operations[Math.floor(Math.random() * operations.length)];
}

// Generate realistic comments
function generateRandomComment() {
  const comments = [
    'This needs clarification',
    'Looks good to me',
    'Please review this section',
    'Consider adding more details',
    'This is important for the board',
    'Need to discuss in the meeting',
    'Approved with minor changes',
    'Questions about implementation'
  ];
  
  return comments[Math.floor(Math.random() * comments.length)];
}

// Clean up WebSocket connections
export function cleanupWebSocket(socket) {
  if (socket) {
    socket.close();
  }
}