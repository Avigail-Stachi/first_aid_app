import React, { useState } from 'react';
import ChatWindow from './components/ChatWindow';
import MessageInput from './components/MessageInput';
import './App.css';

function App() {
  const [inputMsg, setInputMsg] = useState('');
  const [messages, setMessages] = useState([]);

  //לשמור את ההיסטוריה של ההודעות במערך
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendRequest = async () => {
    if (!inputMsg.trim()) return;

    // הוספת הודעת המשתמש
    const userMessage = { text: inputMsg, fromUser: true };
    setMessages(prev => [...prev, userMessage]);
    setHistory(prev => [...prev, userMessage.text]);
    
    try {
      setIsLoading(true);
      // שולחים את כל ההיסטוריה כולל ההודעה החדשה
      console.log("API URL:", process.env.REACT_APP_API_URL);
      const res = await fetch(`${process.env.REACT_APP_API_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          history: [...history, inputMsg]  // שולחים את כל ההיסטוריה + ההודעה הנוכחית
        })
      });
      const data = await res.json();
      const answer = data?.result || 'Error: No result received';

      // הוספת תשובת השרת להודעות וגם להיסטוריה
      setMessages(prev => [...prev, { text: answer, fromUser: false }]);
      setHistory(prev => [...prev, answer]);
    } catch (error) {
      setMessages(prev => [...prev, { text: 'Error contacting server', fromUser: false }]);
    }
    setIsLoading(false);
    setInputMsg('');
  };

  // כפתור לאיפוס הצ'אט (היסטוריה והודעות)
  const newChat = () => {
    setMessages([]);
    setHistory([]);
    setInputMsg('');
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
      <h1>ResQPal Chat</h1>
      <ChatWindow messages={messages} />
      <MessageInput inputMsg={inputMsg} setInputMsg={setInputMsg} onSend={sendRequest}  disabled={isLoading} />
      <button onClick={newChat} style={{marginTop: '1rem'}}>New Chat</button>
    </div>
  );
}

export default App;
