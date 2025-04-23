import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './LocalAIChat.css';

const LocalAIChat = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOllamaAvailable, setIsOllamaAvailable] = useState(false);
  const messagesEndRef = useRef(null);

  // Check if Ollama is available
  useEffect(() => {
    const checkOllamaAvailability = async () => {
      try {
        // Remove withCredentials to avoid CORS issues
        const response = await axios.get('http://localhost:11434/api/tags', {
          withCredentials: false
        });
        setIsOllamaAvailable(true);
      } catch (error) {
        console.error('Ollama is not available:', error);
        setIsOllamaAvailable(false);
        setError('Ollama AI model is not available. Please make sure it is running on http://localhost:11434');
      }
    };

    checkOllamaAvailability();
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;
    
    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);
    setError(null);
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    try {
      // Remove withCredentials to avoid CORS issues
      const response = await axios.post('http://localhost:11434/api/generate', {
        model: 'deepseek-r1:1.5b',
        prompt: userMessage,
        stream: false
      }, {
        withCredentials: false
      });
      
      // Add AI response to chat
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
    } catch (error) {
      console.error('Error sending message to Ollama:', error);
      setError('Failed to get response from AI. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOllamaAvailable) {
    return (
      <div className="local-ai-chat-container">
        <div className="local-ai-chat-header">
          <h2>Chat with Local AI</h2>
        </div>
        <div className="local-ai-error">
          <p>{error}</p>
          <p className="mt-2 text-sm">Make sure Ollama is running and the deepseek-r1:1.5b model is installed.</p>
          <p className="mt-2 text-sm">If you're still having issues, try running Ollama with CORS enabled:</p>
          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
            OLLAMA_ORIGINS=http://localhost:4000 ollama serve
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="local-ai-chat-container">
      <div className="local-ai-chat-header">
        <h2>Chat with Local AI</h2>
      </div>
      
      <div className="local-ai-messages">
        {messages.length === 0 ? (
          <div className="local-ai-welcome">
            <p>Welcome to Local AI Chat!</p>
            <p className="text-sm mt-2">This feature uses the deepseek-r1:1.5b model running locally on your machine.</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div 
              key={index} 
              className={`message ${message.role === 'user' ? 'user-message' : 'ai-message'}`}
            >
              <div className="message-content">
                {message.content}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="message ai-message">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {error && (
        <div className="local-ai-error">
          <p>{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSendMessage} className="local-ai-input-form">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
          className="local-ai-input"
        />
        <button 
          type="submit" 
          disabled={isLoading || !inputMessage.trim()}
          className="local-ai-send-button"
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
};

export default LocalAIChat; 