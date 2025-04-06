import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const socket = io('http://localhost:5000');

function App() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [receiverUsername, setReceiverUsername] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState([]);
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showFileOptions, setShowFileOptions] = useState(false);
  const fileInputRef = useRef(null);
  
  // Animation states
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    setFadeIn(true);
    
    const storedUsername = localStorage.getItem('username');
    const storedToken = localStorage.getItem('token');
    
    if (storedUsername && storedToken) {
      setUsername(storedUsername);
      setLoggedIn(true);
      setShowLandingPage(false);
      fetchMessages(storedUsername);
    }
  }, []);

  const fetchMessages = async (username) => {
    try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:5000/api/messages/${username}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        setMessages(response.data);
        setLoading(false);
    } catch (error) {
        console.error("Error fetching messages:", error);
        setLoading(false);
    }
  };

  useEffect(() => {
    socket.on("receiveMessage", (message) => {
        if (message.senderUsername === username || message.receiverUsername === username) {
            setMessages((prev) => [...prev, message]);
            
            // Scroll to bottom of message container
            const messageContainer = document.getElementById('message-container');
            if (messageContainer) {
                setTimeout(() => {
                    messageContainer.scrollTop = messageContainer.scrollHeight;
                }, 100);
            }
        }
    });

    return () => socket.off("receiveMessage");
  }, [username]);

  const handleRegister = async () => {
    if (!username || !email || !password) {
      alert("Please fill in all fields");
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.post('http://localhost:5000/api/register', { username, email, password });
      setLoading(false);
      alert(response.data.message);
      setShowRegisterForm(false);
      setShowLoginForm(true);
    } catch (error) {
      setLoading(false);
      alert(error.response?.data?.error || 'Error registering user');
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please fill in all fields");
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.post('http://localhost:5000/api/login', { email, password });
      
      // Set token and username in localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('username', response.data.username);
      
      // Update state
      setUsername(response.data.username);
      setLoggedIn(true);
      setShowLandingPage(false);
      setShowLoginForm(false);
      fetchMessages(response.data.username);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error("Login error:", error);
      alert(error.response?.data?.error || 'Login failed');
    }
  };

  const handleTyping = () => {
    // Clear previous timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    setIsTyping(true);
    
    // Set timeout to stop "typing" indicator after 2 seconds
    const timeout = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
    
    setTypingTimeout(timeout);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setSelectedFile(null);
      setFilePreview(null);
      return;
    }

    // Check file size (e.g., limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size should be less than 10MB");
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      // For non-image files, set a generic preview
      setFilePreview(null);
    }
    
    // Reset the file input to allow selecting the same file again
    e.target.value = '';
    setShowFileOptions(false);
  };

  // Update your handleSendMessage function
const handleSendMessage = async () => {
  if (!username || !receiverUsername) {
    alert("❌ Please enter recipient username!");
    return;
  }

  if (!messageText && !selectedFile) {
    alert("❌ Please enter a message or select a file!");
    return;
  }

  try {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    // Check if the receiver exists - include authorization header
    const response = await axios.get(
      `http://localhost:5000/api/check-user/${receiverUsername}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (response.data.exists) {
      let messageData = {
        senderUsername: username,
        receiverUsername,
        messageText
      };

      // If there's a file, upload it first
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        // Remove these as they're not needed in the upload
        // formData.append('senderUsername', username);
        // formData.append('receiverUsername', receiverUsername);
        
        const uploadResponse = await axios.post(
          'http://localhost:5000/api/upload',
          formData,
          {
            headers: { 
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        // Add file information to message data
        messageData = {
          ...messageData,
          fileUrl: uploadResponse.data.fileUrl,
          fileName: uploadResponse.data.fileName,
          fileType: uploadResponse.data.fileType,
          fileSize: uploadResponse.data.fileSize
        };
      }

      // Send the message via socket
      socket.emit('sendMessage', messageData);
      
      // Reset states
      setMessageText('');
      setSelectedFile(null);
      setFilePreview(null);
      setIsTyping(false);
      
      // Scroll to bottom of message container
      const messageContainer = document.getElementById('message-container');
      if (messageContainer) {
        setTimeout(() => {
          messageContainer.scrollTop = messageContainer.scrollHeight;
        }, 100);
      }
    } else {
      alert("❌ Receiver username not found!");
    }
    setLoading(false);
  } catch (error) {
    setLoading(false);
    console.error("Error sending message:", error);
    alert(error.response?.data?.error || "Error sending message");
  }
};

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearLoginForm = () => {
    setEmail('');
    setPassword('');
  };
  
  const clearRegisterForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setUsername('');
    setLoggedIn(false);
    setMessages([]);
    setShowLandingPage(true);
  };
  
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else if (fileType.startsWith('video/')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    } else if (fileType.startsWith('audio/')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      );
    } else if (fileType === 'application/pdf') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    } else {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
  };

  const renderLandingPage = () => (
    <div className={`flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-6 transition-opacity duration-1000 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-0 left-0 w-16 h-16 bg-white opacity-10 rounded-full transform -translate-x-full animate-floating1"></div>
        <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-white opacity-10 rounded-full transform -translate-x-full animate-floating2"></div>
        <div className="absolute bottom-1/4 left-1/2 w-12 h-12 bg-white opacity-10 rounded-full transform -translate-x-full animate-floating3"></div>
      </div>
      
      <div className="text-center mb-8 relative z-10 transform transition-all duration-700 hover:scale-105">
        <h1 className="text-6xl font-extrabold mb-4">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-400">
            DuoChat
          </span>
        </h1>
        <p className="text-white text-xl mb-6 animate-pulse">Connect instantly with friends and colleagues.</p>
        <div className="flex justify-center space-x-4">
        <button 
          onClick={() => {
            setShowLoginForm(true);
            setShowLandingPage(false);
            setFadeIn(true);
            clearLoginForm();
          }}
          className="px-8 py-3 bg-white text-purple-600 font-semibold rounded-full shadow-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 hover:shadow-xl">
          Login
        </button>
        <button 
          onClick={() => {
            setShowRegisterForm(true);
            setShowLandingPage(false);
            setFadeIn(true);
            clearRegisterForm();
          }}
          className="px-8 py-3 bg-transparent text-white border-2 border-white font-semibold rounded-full hover:bg-white hover:text-purple-600 transition-all duration-300 transform hover:scale-105"
        >
          Sign Up
        </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        <div className="bg-white bg-opacity-95 p-6 rounded-xl shadow-lg text-center transform transition-all duration-500 hover:scale-105 hover:shadow-xl">
          <div className="text-4xl mb-3 animate-bounce">💬</div>
          <h3 className="text-xl font-bold mb-2 text-purple-800">Instant Messaging</h3>
          <p className="text-gray-700">Connect with friends in real-time with our secure messaging platform.</p>
        </div>
        
        <div className="bg-white bg-opacity-95 p-6 rounded-xl shadow-lg text-center transform transition-all duration-500 hover:scale-105 hover:shadow-xl">
          <div className="text-4xl mb-3 animate-pulse">🔒</div>
          <h3 className="text-xl font-bold mb-2 text-purple-800">Secure Chats</h3>
          <p className="text-gray-700">Your messages are private and secure with our encryption technology.</p>
        </div>
        
        <div className="bg-white bg-opacity-95 p-6 rounded-xl shadow-lg text-center transform transition-all duration-500 hover:scale-105 hover:shadow-xl">
          <div className="text-4xl mb-3 animate-bounce">🌐</div>
          <h3 className="text-xl font-bold mb-2 text-purple-800">Share Files</h3>
          <p className="text-gray-700">Send photos, videos, and files to your contacts with ease.</p>
        </div>
      </div>
      
      // Fix the JSX warning by updating your style tag
<style>{`
  @keyframes floating1 {
    0% { transform: translate(-50%, -50%) scale(1); opacity: 0.1; }
    50% { transform: translate(100vw, 20vh) scale(2); opacity: 0.2; }
    100% { transform: translate(200vw, -50%) scale(1); opacity: 0.1; }
  }
  @keyframes floating2 {
    0% { transform: translate(-30vw, -20vh) scale(1.5); opacity: 0.15; }
    50% { transform: translate(50vw, 30vh) scale(3); opacity: 0.25; }
    100% { transform: translate(130vw, 10vh) scale(1.5); opacity: 0.15; }
  }
  @keyframes floating3 {
    0% { transform: translate(-20vw, 20vh) scale(1); opacity: 0.1; }
    50% { transform: translate(40vw, -30vh) scale(2.5); opacity: 0.2; }
    100% { transform: translate(100vw, 20vh) scale(1); opacity: 0.1; }
  }
  .animate-floating1 {
    animation: floating1 30s infinite linear;
  }
  .animate-floating2 {
    animation: floating2 45s infinite linear;
  }
  .animate-floating3 {
    animation: floating3 60s infinite linear;
  }
`}</style>
    </div>
  );

  const renderLoginForm = () => (
    <div className={`flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-6 transition-opacity duration-1000 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md transform transition-all duration-500 hover:shadow-2xl">
        <h2 className="text-3xl font-bold mb-6 text-center text-purple-800">Welcome Back</h2>
        <div className="mb-4 transition-all duration-300 hover:translate-y-1">
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
          />
        </div>
        <div className="mb-6 transition-all duration-300 hover:translate-y-1">
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
          />
        </div>
        <button 
          onClick={handleLogin} 
          disabled={loading}
          className="w-full bg-purple-600 text-white p-3 rounded-lg font-semibold hover:bg-purple-700 transition-all duration-300 transform hover:scale-105 flex justify-center items-center"
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : 'Login'}
        </button>
        <div className="text-center mt-4">
          <p className="text-gray-600">Don't have an account? 
            <button onClick={() => {setShowRegisterForm(true); setShowLoginForm(false)}} className="ml-1 text-purple-600 font-semibold hover:underline transition-all duration-300">Sign Up</button>
          </p>
          <button 
            onClick={() => {
              setShowLandingPage(true); 
              setShowLoginForm(false);
              clearLoginForm();
            }}
            className="mt-4 text-purple-600 hover:underline transition-all duration-300 transform hover:translate-x-1 inline-flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );

  const renderRegisterForm = () => (
    <div className={`flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-6 transition-opacity duration-1000 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md transform transition-all duration-500 hover:shadow-2xl">
        <h2 className="text-3xl font-bold mb-6 text-center text-purple-800">Create Account</h2>
        <div className="mb-4 transition-all duration-300 hover:translate-y-1">
          <input 
            type="text" 
            placeholder="Username" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
          />
        </div>
        <div className="mb-4 transition-all duration-300 hover:translate-y-1">
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
          />
        </div>
        <div className="mb-6 transition-all duration-300 hover:translate-y-1">
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
          />
        </div>
        <button 
          onClick={handleRegister} 
          disabled={loading}
          className="w-full bg-purple-600 text-white p-3 rounded-lg font-semibold hover:bg-purple-700 transition-all duration-300 transform hover:scale-105 flex justify-center items-center"
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : 'Sign Up'}
        </button>
        <div className="text-center mt-4">
          <p className="text-gray-600">Already have an account? 
            <button onClick={() => {setShowLoginForm(true); setShowRegisterForm(false)}} className="ml-1 text-purple-600 font-semibold hover:underline transition-all duration-300">Login</button>
          </p>
          <button 
            onClick={() => {
              setShowLandingPage(true); 
              setShowRegisterForm(false);
              clearRegisterForm();
            }}
            className="mt-4 text-purple-600 hover:underline transition-all duration-300 transform hover:translate-x-1 inline-flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );

  const renderChatInterface = () => (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100">
      {/* Header with animated gradient */}
      <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white p-4 shadow-md relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-12 h-12 bg-white rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/3 w-16 h-16 bg-yellow-300 rounded-full blur-xl animate-pulse"></div>
        </div>
        <div className="container mx-auto flex justify-between items-center relative z-10">
          <h1 className="text-2xl font-bold transform transition-all duration-500 hover:scale-110">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-300">
              DuoChat
            </span>
          </h1>
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2">
              <div className="h-3 w-3 bg-green-400 rounded-full animate-pulse"></div>
              <span>Hi, {username}!</span>
            </div>
            <button 
              onClick={handleLogout} 
              className="bg-purple-700 hover:bg-purple-800 px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="flex flex-col md:flex-row flex-grow container mx-auto p-4 gap-4">
        {/* Sidebar */}
        <div className="bg-white rounded-xl shadow-lg p-4 w-full md:w-1/3 mb-4 md:mb-0 transform transition-all duration-500 hover:shadow-xl">
          <h2 className="text-xl font-semibold mb-4 text-purple-800 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            New Message
          </h2>
          <div className="space-y-3">
            <div className="relative transition-all duration-300 transform hover:translate-y-1">
              <input 
                type="text" 
                placeholder="Recipient's username" 
                value={receiverUsername} 
                onChange={(e) => setReceiverUsername(e.target.value)}
                className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            
            <div className="relative mt-3 transition-all duration-300 transform hover:translate-y-1">
              <input 
                type="text" 
                placeholder="Search messages..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          <div className="mt-8">
            <h3 className="text-lg font-medium mb-4 text-purple-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
              Recent Chats
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2" id="recent-chats">
              {Array.from(new Set([...messages.map(m => m.senderUsername), ...messages.map(m => m.receiverUsername)]))
                .filter(user => user !== username)
                .map((user, index) => (
                  <div
                    key={index}
                    onClick={() => setReceiverUsername(user)}
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                      receiverUsername === user ? 'bg-purple-100 border-l-4 border-purple-500' : 'bg-gray-50 hover:bg-purple-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className="rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 p-2 text-white mr-3">
                        {user.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{user}</h4>
                        <p className="text-xs text-gray-500">
                          {messages.filter(m => m.senderUsername === user || m.receiverUsername === user).length} messages
                        </p>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Message Area */}
        <div className="flex flex-col flex-grow bg-white rounded-xl shadow-lg p-4 transform transition-all duration-500 hover:shadow-xl">
          <div className="flex-grow overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg" id="message-container" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            {messages
              .filter(msg => 
                (msg.senderUsername === username && msg.receiverUsername === receiverUsername) || 
                (msg.senderUsername === receiverUsername && msg.receiverUsername === username)
              )
              .filter(msg => 
                searchTerm === '' || 
                msg.messageText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                msg.fileName?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((msg, index) => (
                <div 
                  key={index} 
                  className={`mb-4 flex ${msg.senderUsername === username ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`rounded-2xl px-4 py-3 max-w-xs lg:max-w-md shadow-sm ${
                      msg.senderUsername === username 
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    {msg.fileUrl && (
                      <div className="mb-2">
                        {msg.fileType?.startsWith('image/') ? (
                          <div className="relative group">
                            <img 
                              src={msg.fileUrl} 
                              alt={msg.fileName || 'Image'} 
                              className="rounded-lg max-w-full h-auto max-h-60 transition-all duration-300 group-hover:opacity-90"
                            />
                            <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px2 py-1 rounded">
                          {formatFileSize(msg.fileSize || 0)}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center p-3 bg-gray-100 bg-opacity-20 rounded-lg">
                        <div className="mr-3 text-white">
                          {getFileIcon(msg.fileType || 'application/octet-stream')}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="font-medium text-sm truncate">{msg.fileName}</p>
                          <p className="text-xs opacity-80">{formatFileSize(msg.fileSize || 0)}</p>
                        </div>
                        <a 
                          href={msg.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="ml-2 p-1 rounded-full hover:bg-white hover:bg-opacity-20 transition-all"
                          download
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>
                      </div>
                    )}
                  </div>
                )}
                {msg.messageText && <p className="mb-1">{msg.messageText}</p>}
                <div className={`text-right text-xs ${msg.senderUsername === username ? 'text-gray-200' : 'text-gray-500'}`}>
                  {formatMessageTime(msg.timestamp)}
                </div>
              </div>
            </div>
          ))}
          
        {messages.filter(msg => 
          (msg.senderUsername === username && msg.receiverUsername === receiverUsername) || 
          (msg.senderUsername === receiverUsername && msg.receiverUsername === username)
        ).length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-lg font-medium">No messages yet</p>
            <p className="text-sm">Start a conversation with {receiverUsername || 'someone'}</p>
          </div>
        )}
        
        {isTyping && receiverUsername && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-200 text-gray-800 rounded-2xl px-4 py-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* File Preview */}
      {selectedFile && (
        <div className="bg-gray-100 p-3 rounded-lg mb-3 relative">
          <div className="flex items-center">
            {filePreview ? (
              <img src={filePreview} alt="Preview" className="h-16 w-16 object-cover rounded" />
            ) : (
              <div className="h-16 w-16 flex items-center justify-center bg-gray-200 rounded">
                {getFileIcon(selectedFile.type)}
              </div>
            )}
            <div className="ml-3 flex-1">
              <p className="font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
            </div>
            <button 
              onClick={removeSelectedFile}
              className="ml-2 p-2 rounded-full hover:bg-gray-200 transition-all duration-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Message Input */}
      <div className="flex space-x-2">
        <button
          onClick={() => setShowFileOptions(!showFileOptions)}
          className="p-3 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-all duration-300 relative"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          
          {showFileOptions && (
            <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-lg shadow-lg w-48">
              <input
                type="file"
                id="file-upload"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept="*"
              />
              <button
                onClick={() => document.getElementById('file-upload').click()}
                className="w-full flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Image
              </button>
              <button
                onClick={() => document.getElementById('file-upload').click()}
                className="w-full flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Document
              </button>
            </div>
          )}
        </button>
        
        <div className="flex-1 relative">
          <input 
            type="text" 
            placeholder="Type your message..." 
            value={messageText} 
            onChange={(e) => {
              setMessageText(e.target.value);
              handleTyping();
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="w-full p-3 pl-4 pr-10 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
          />
        </div>
        
        <button 
          onClick={handleSendMessage}
          disabled={loading || (!messageText && !selectedFile)}
          className={`p-3 rounded-full transition-all duration-300 ${
            !messageText && !selectedFile
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md hover:shadow-lg transform hover:scale-105'
          }`}
        >
          {loading ? (
            <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
    </div>
  </div>
  
  {/* Footer */}
  <footer className="bg-white py-3 text-center text-gray-500 text-sm">
    <p>&copy; {new Date().getFullYear()} DuoChat. All rights reserved.</p>
  </footer>
</div>
);

return (
<div className="app">
{showLandingPage && renderLandingPage()}
{showLoginForm && renderLoginForm()}
{showRegisterForm && renderRegisterForm()}
{loggedIn && renderChatInterface()}
</div>
);
}

export default App;