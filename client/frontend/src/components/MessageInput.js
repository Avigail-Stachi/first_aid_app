//להציג טקסט וכפתור שליחה
//לשלוח לשרת כשנלחץ שלח או אנטר

import React from 'react';

function MessageInput({ inputMsg, setInputMsg, onSend,disabled }) {
    const handleKeyDown=(e)=>{
        if (e.key === 'Enter'&&!e.shiftKey) {
            e.preventDefault(); // Prevent the default action of the Enter key
            if (inputMsg.trim() !== '' && /[a-zA-Z0-9]/.test(inputMsg)) {
                onSend();
              }         
    }
    }   
    return (
    <div style={{ marginTop: '1rem' }}>
      <textarea 
        type="text" 
        value={inputMsg} 
        onChange={(e) => setInputMsg(e.target.value)} 
        onKeyDown={handleKeyDown}
        placeholder="Describe the emergency..."
        style={{ width: '70%', padding: '0.5rem' }}
      />
<button onClick={onSend} disabled={disabled} style={{ padding: '0.5rem 1rem', marginLeft: '1rem' }}>Send</button>
</div>
  );
}

export default MessageInput;
