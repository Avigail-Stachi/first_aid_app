// להציג כל פעם הודעה אחת או של המשתמש או של השרת
// צבעים שונים ורווחים בין ההודעות

import React from 'react';

function MessageBubble({ text, fromUser }) {
  const style = {
    background: fromUser ? '#d1e7dd' : '#f8d7da', //ירוק למשתמש ואדום לשרת
    padding: '0.5rem 1rem',
    margin: '0.5rem 0',
    borderRadius: '1rem',
    maxWidth: '70%',
    alignSelf: fromUser ? 'flex-end' : 'flex-start' //ימין ושמאל
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: fromUser ? 'flex-end' : 'flex-start' }}>
      <div style={style}>
        {text}
      </div>
    </div>
  );
}

export default MessageBubble;
