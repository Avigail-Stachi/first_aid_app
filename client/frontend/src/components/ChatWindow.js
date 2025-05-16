
import React from 'react';
import MessageBubble from './MessageBubble';

function ChatWindow({ messages }) {
  return (
    //overflowY: 'auto' – מאפשר גלילה
    <div style={{ border: '1px solid #ccc', padding: '1rem', height: '300px', overflowY: 'auto' }}>
      {messages.map((msg, idx) => ( //להציג כל הודעה לבועה
        <MessageBubble key={idx} text={msg.text} fromUser={msg.fromUser} />
      ))}
    </div>
  );
}

export default ChatWindow;
