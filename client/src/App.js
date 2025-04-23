import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import LocalAIChat from './components/LocalAIChat';

// Configure axios defaults
axios.defaults.withCredentials = true;

// Configure socket connection
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
const socket = io(SOCKET_URL, {
  withCredentials: true,
  transports: ['websocket', 'polling']
});

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
  const [remoteTyping, setRemoteTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showFileOptions, setShowFileOptions] = useState(false);
  const fileInputRef = useRef(null);
  const [fadeIn, setFadeIn] = useState(false);
  // New state variables
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [userBio, setUserBio] = useState('');
  const [userAvatar, setUserAvatar] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [showDiscoverPage, setShowDiscoverPage] = useState(false);
  const [groups, setGroups] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImage, setModalImage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  // New state variables for adding members to group
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [selectedNewMembers, setSelectedNewMembers] = useState([]);
  const [darkTheme, setDarkTheme] = useState(false);
  // New state variable for Local AI Chat
  const [showLocalAIChat, setShowLocalAIChat] = useState(false);

  useEffect(() => {
    setFadeIn(true);
    const storedUsername = localStorage.getItem('username');
    const storedToken = localStorage.getItem('token');
    
    if (storedUsername && storedToken) {
      setUsername(storedUsername);
      setLoggedIn(true);
      setShowLandingPage(false);
      fetchMessages(storedUsername);
      fetchUserProfile(storedUsername);
      fetchGroups();
    }
  }, []);

  useEffect(() => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('darkTheme');
    if (savedTheme !== null) {
      setDarkTheme(savedTheme === 'true');
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkTheme(prefersDark);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !darkTheme;
    setDarkTheme(newTheme);
    localStorage.setItem('darkTheme', newTheme);
  };

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

  const fetchUserProfile = async (username) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserBio(response.data.bio || '');
      setUserAvatar(response.data.avatar || null);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAllUsers(response.data.filter(user => user.username !== username));
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGroups(response.data);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  useEffect(() => {
    socket.on("receiveMessage", (message) => {
      if ((message.senderUsername === username || 
          message.receiverUsername === username || 
          (message.groupId && message.members?.includes(username)))) {
        // Check if message already exists to prevent duplicates
        setMessages((prev) => {
          const messageExists = prev.some(msg => 
            msg._id === message._id || 
            (msg.timestamp === message.timestamp && 
             msg.senderUsername === message.senderUsername && 
             msg.content === message.content)
          );
          if (messageExists) return prev;
          return [...prev, message];
        });
        const messageContainer = document.getElementById('message-container');
        if (messageContainer) {
          setTimeout(() => {
            messageContainer.scrollTop = messageContainer.scrollHeight;
          }, 100);
        }
      }
    });

    socket.on("typing", ({ sender, receiver, groupId }) => {
      if (sender !== username && 
         ((receiver === username && sender === receiverUsername) || 
          (groupId && groupId === currentGroup?._id))) {
        setRemoteTyping(true);
        if (typingTimeout) clearTimeout(typingTimeout);
        const timeout = setTimeout(() => setRemoteTyping(false), 2000);
        setTypingTimeout(timeout);
      }
    });

    socket.on("messageDeleted", ({ messageId }) => {
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
    });

    return () => {
      socket.off("receiveMessage");
      socket.off("typing");
      socket.off("messageDeleted");
    };
  }, [username, receiverUsername, currentGroup]);

  const handleRegister = async () => {
    if (!username || !email || !password) {
      alert("Please fill in all fields");
      return;
    }
    
    try {
      setLoading(true);
      
      // Clear any previous error messages
      const errorElement = document.getElementById('register-error');
      if (errorElement) {
        errorElement.textContent = '';
        errorElement.classList.add('hidden');
      }
      
      // Make sure we're using the correct API endpoint
      const response = await axios.post('http://localhost:5000/api/register', { 
        username, 
        email, 
        password 
      });
      
      setLoading(false);
      alert(response.data.message);
      setShowRegisterForm(false);
      setShowLoginForm(true);
      
      // Clear form fields
      setUsername('');
      setEmail('');
      setPassword('');
    } catch (error) {
      setLoading(false);
      console.error("Registration error:", error);
      
      // Display error message to user
      const errorMessage = error.response?.data?.error || 'Error registering user. Please try again.';
      
      // If there's an error element, update it
      const errorElement = document.getElementById('register-error');
      if (errorElement) {
        errorElement.textContent = errorMessage;
        errorElement.classList.remove('hidden');
      } else {
        // Fallback to alert if error element doesn't exist
        alert(errorMessage);
      }
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please fill in all fields");
      return;
    }
    
    try {
      setLoading(true);
      
      // Clear any previous error messages
      const errorElement = document.getElementById('login-error');
      if (errorElement) {
        errorElement.textContent = '';
        errorElement.classList.add('hidden');
      }
      
      // Make sure we're using the correct API endpoint
      const response = await axios.post('http://localhost:5000/api/login', { 
        email, 
        password 
      });
      
      // Store token and username in localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('username', response.data.username);
      
      // Update state
      setUsername(response.data.username);
      setLoggedIn(true);
      setShowLandingPage(false);
      setShowLoginForm(false);
      
      // Fetch user data
      await Promise.all([
        fetchMessages(response.data.username),
        fetchUserProfile(response.data.username),
        fetchGroups()
      ]);
      
      // Clear form fields
      setEmail('');
      setPassword('');
      
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error("Login error:", error);
      
      // Display error message to user
      const errorMessage = error.response?.data?.error || 'Login failed. Please check your credentials and try again.';
      
      // If there's an error element, update it
      const errorElement = document.getElementById('login-error');
      if (errorElement) {
        errorElement.textContent = errorMessage;
        errorElement.classList.remove('hidden');
      } else {
        // Fallback to alert if error element doesn't exist
        alert(errorMessage);
      }
    }
  };

  const handleTyping = () => {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    setIsTyping(true);
    
    // Determine where to send typing notification
    if (currentGroup) {
      socket.emit("typing", { sender: username, groupId: currentGroup._id });
    } else {
      socket.emit("typing", { sender: username, receiver: receiverUsername });
    }
    
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

    if (file.size > 10 * 1024 * 1024) {
      alert("File size should be less than 10MB");
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }

    setShowFileOptions(false);
  };

  const handleSendMessage = async () => {
    if ((!username || !receiverUsername) && !currentGroup) {
      alert("❌ Please enter recipient username or select a group!");
      return;
    }
  
    if (!messageText && !selectedFile) {
      alert("❌ Please enter a message or select a file!");
      return;
    }
  
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
  
      // Check if it's a group message or direct message
      if (currentGroup) {
        let messageData = {
          senderUsername: username,
          groupId: currentGroup._id,
          messageText: messageText || undefined,
        };
  
        if (selectedFile) {
          const formData = new FormData();
          formData.append('file', selectedFile);
  
          const uploadResponse = await axios.post(
            'http://localhost:5000/api/upload',
            formData,
            { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } }
          );
  
          messageData = {
            ...messageData,
            file: {
              url: uploadResponse.data.fileUrl,
              name: uploadResponse.data.fileName,
              type: uploadResponse.data.fileType,
              size: uploadResponse.data.fileSize
            }
          };
        }
  
        const messageResponse = await axios.post(
          'http://localhost:5000/api/messages/send-group',
          messageData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
  
        // Remove direct state update and let socket handle it
        socket.emit('sendMessage', messageResponse.data.data);
      } else {
        // Check if recipient exists
        const checkResponse = await axios.get(
          `http://localhost:5000/api/check-user/${receiverUsername}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
  
        if (!checkResponse.data.exists) {
          alert("❌ Receiver username not found!");
          setLoading(false);
          return;
        }
  
        let messageData = {
          senderUsername: username,
          receiverUsername,
          messageText: messageText || undefined,
        };
  
        if (selectedFile) {
          const formData = new FormData();
          formData.append('file', selectedFile);
  
          const uploadResponse = await axios.post(
            'http://localhost:5000/api/upload',
            formData,
            { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } }
          );
  
          messageData = {
            ...messageData,
            file: {
              url: uploadResponse.data.fileUrl,
              name: uploadResponse.data.fileName,
              type: uploadResponse.data.fileType,
              size: uploadResponse.data.fileSize
            }
          };
        }
  
        const messageResponse = await axios.post(
          'http://localhost:5000/api/messages/send',
          messageData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
  
        // Remove direct state update and let socket handle it
        socket.emit('sendMessage', messageResponse.data.data);
      }
  
      setMessageText('');
      setSelectedFile(null);
      setFilePreview(null);
      setIsTyping(false);
  
      const messageContainer = document.getElementById('message-container');
      if (messageContainer) {
        setTimeout(() => {
          messageContainer.scrollTop = messageContainer.scrollHeight;
        }, 100);
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      alert(error.response?.data?.error || "Error sending message");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      socket.emit('deleteMessage', { messageId });
      setShowDeleteModal(false);
      setMessageToDelete(null);
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("Error deleting message");
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      if (userBio) formData.append('bio', userBio);
      if (userAvatar && typeof userAvatar !== 'string') formData.append('avatar', userAvatar);
      
      await axios.put('http://localhost:5000/api/user/profile', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}` 
        },
      });
      
      alert("Profile updated successfully!");
      setShowUserProfile(false);
      setLoading(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error updating profile");
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName || selectedGroupMembers.length === 0) {
      alert("Please enter a group name and select at least one member");
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/groups', {
        name: newGroupName,
        members: [...selectedGroupMembers, username]
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setGroups(prev => [...prev, response.data]);
      setNewGroupName('');
      setSelectedGroupMembers([]);
      setShowCreateGroup(false);
      alert("Group created successfully!");
      setLoading(false);
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Error creating group");
      setLoading(false);
    }
  };

  // Function to handle adding members to an existing group
  const handleAddMembersToGroup = async () => {
    if (!currentGroup || selectedNewMembers.length === 0) {
      alert("Please select at least one member to add");
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/api/groups/${currentGroup._id}/add-members`,
        { newMembers: selectedNewMembers },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update the current group with the new members
      setCurrentGroup(response.data.group);
      
      // Update the groups list
      setGroups(prev => 
        prev.map(group => 
          group._id === currentGroup._id ? response.data.group : group
        )
      );
      
      setSelectedNewMembers([]);
      setShowAddMembersModal(false);
      alert("Members added successfully!");
      setLoading(false);
    } catch (error) {
      console.error("Error adding members to group:", error);
      alert(error.response?.data?.error || "Error adding members to group");
      setLoading(false);
    }
  };

  // Function to toggle selection of a new member
  const toggleNewMember = (username) => {
    if (selectedNewMembers.includes(username)) {
      setSelectedNewMembers(prev => prev.filter(u => u !== username));
    } else {
      setSelectedNewMembers(prev => [...prev, username]);
    }
  };

  const selectGroup = (group) => {
    setCurrentGroup(group);
    setReceiverUsername('');
  };

  const openImageModal = (imageUrl) => {
    setModalImage(imageUrl);
    setShowImageModal(true);
  };

  const confirmDeleteMessage = (message) => {
    setMessageToDelete(message);
    setShowDeleteModal(true);
  };

  const handleProfileAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert("Avatar size should be less than 5MB");
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      alert("Please select an image file");
      return;
    }
    
    setUserAvatar(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      document.getElementById('avatar-preview').src = reader.result;
    };
    reader.readAsDataURL(file);
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
    setCurrentGroup(null);
    setGroups([]);
    setShowUserProfile(false);
    setShowDiscoverPage(false);
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

  const toggleDiscoverPage = () => {
    setShowDiscoverPage(!showDiscoverPage);
    if (!showDiscoverPage) {
      fetchAllUsers();
    }
    setShowUserProfile(false);
    setCurrentGroup(null);
    setReceiverUsername('');
  };

  const toggleUserProfile = () => {
    setShowUserProfile(!showUserProfile);
    setShowDiscoverPage(false);
    setCurrentGroup(null);
    setReceiverUsername('');
  };

  const toggleGroupMember = (username) => {
    if (selectedGroupMembers.includes(username)) {
      setSelectedGroupMembers(prev => prev.filter(u => u !== username));
    } else {
      setSelectedGroupMembers(prev => [...prev, username]);
    }
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
        
        {/* Error message display */}
        <div id="login-error" className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg hidden"></div>
        
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
          <button onClick={() => {setShowRegisterForm(true); setShowLoginForm(false)}} className="ml-1 text-purple-600 font-semibold hover:underline">
              Sign Up
            </button>
          </p>
        </div>
        <div className="text-center mt-4">
          <button 
            onClick={() => {setShowLandingPage(true); setShowLoginForm(false)}} 
            className="text-gray-500 hover:text-purple-600 transition-all duration-300"
          >
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
            <button onClick={() => {setShowLoginForm(true); setShowRegisterForm(false)}} className="ml-1 text-purple-600 font-semibold hover:underline">
              Login
            </button>
          </p>
        </div>
        <div className="text-center mt-4">
          <button 
            onClick={() => {setShowLandingPage(true); setShowRegisterForm(false)}} 
            className="text-gray-500 hover:text-purple-600 transition-all duration-300"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );

  const renderChatInterface = () => (
    <div className={`flex flex-col h-screen ${darkTheme ? 'dark-theme' : ''}`}>
      {/* Header */}
      <header className="bg-purple-600 text-white p-4 shadow-md z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">DuoChat</h1>
            <div className="flex items-center space-x-2">
              <div className="bg-purple-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {username}
              </div>
              {currentGroup ? (
                <span className="bg-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                  Group: {currentGroup.name}
                </span>
              ) : receiverUsername ? (
                <span className="bg-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                  Chat with: {receiverUsername}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {currentGroup && (
              <button 
                onClick={() => {
                  setShowAddMembersModal(true);
                  fetchAllUsers();
                }}
                className="p-2 rounded-full hover:bg-purple-700 transition-all duration-300"
                title="Add Members to Group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </button>
            )}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-purple-700 transition-all duration-300"
              title={darkTheme ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {darkTheme ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <button 
              onClick={toggleDiscoverPage}
              className={`p-2 rounded-full ${showDiscoverPage ? 'bg-purple-800' : 'hover:bg-purple-700'} transition-all duration-300`}
              title="Discover Users & Groups"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button 
              onClick={toggleUserProfile}
              className={`p-2 rounded-full ${showUserProfile ? 'bg-purple-800' : 'hover:bg-purple-700'} transition-all duration-300`}
              title="My Profile"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
            <button 
              onClick={toggleLocalAIChat}
              className={`p-2 rounded-full ${showLocalAIChat ? 'bg-purple-800' : 'hover:bg-purple-700'} transition-all duration-300`}
              title="Chat with Local AI"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-purple-700 transition-all duration-300"
              title="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Groups and contacts */}
        <div className="w-64 bg-white shadow-lg flex flex-col">
          <div className="p-4 border-b">
            <div className="relative">
              <input
                type="text"
                placeholder="Search users or groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          <div className="p-4 border-b">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-700">Groups</h3>
              <button 
                onClick={() => {
                  setShowCreateGroup(true);
                  fetchAllUsers();
                }}
                className="p-1 rounded-full hover:bg-gray-200 transition-all duration-300"
                title="Create New Group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto">
              {groups.filter(group => group.name.toLowerCase().includes(searchTerm.toLowerCase())).map((group) => (
                <div 
                  key={group._id}
                  onClick={() => selectGroup(group)}
                  className={`flex items-center p-2 rounded-lg mb-1 cursor-pointer transition-all duration-200 hover:bg-purple-100 ${currentGroup?._id === group._id ? 'bg-purple-100 border-l-4 border-purple-600' : ''}`}
                >
                  <div className="bg-purple-200 rounded-full p-2 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">{group.name}</div>
                    <div className="text-xs text-gray-500">{group.members.length} members</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto">
            <h3 className="font-semibold text-gray-700 mb-2">Recent Chats</h3>
            <div className="space-y-1">
              {Array.from(new Set(messages
                .filter(msg => 
                  !msg.groupId && 
                  (msg.senderUsername === username || msg.receiverUsername === username) &&
                  (msg.senderUsername.toLowerCase().includes(searchTerm.toLowerCase()) || 
                   msg.receiverUsername.toLowerCase().includes(searchTerm.toLowerCase()))
                )
                .map(msg => msg.senderUsername === username ? msg.receiverUsername : msg.senderUsername)
              )).map(chatUser => (
                <div 
                  key={chatUser}
                  onClick={() => {
                    setReceiverUsername(chatUser);
                    setCurrentGroup(null);
                  }}
                  className={`flex items-center p-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-purple-100 ${receiverUsername === chatUser ? 'bg-purple-100 border-l-4 border-purple-600' : ''}`}
                >
                  <div className="bg-gray-200 rounded-full h-10 w-10 flex items-center justify-center mr-3">
                    <span className="font-medium text-gray-700">{chatUser.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="font-medium">{chatUser}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col">
          {(showUserProfile || showDiscoverPage) ? (
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              {showUserProfile && renderUserProfile()}
              {showDiscoverPage && renderDiscoverPage()}
            </div>
          ) : showLocalAIChat ? (
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              <LocalAIChat />
            </div>
          ) : (
            <>
              <div id="message-container" className="flex-1 overflow-y-auto p-6 bg-white">
                {loading && (
                  <div className="flex justify-center items-center h-20">
                    <div className="loader"></div>
                  </div>
                )}
                
                {!loading && messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-lg font-medium">No messages yet</p>
                    <p>Start a conversation by sending a message!</p>
                  </div>
                )}
                
                {messages
                  .filter(msg => 
                    (currentGroup && msg.groupId === currentGroup._id) || 
                    (!currentGroup && !msg.groupId && ((msg.senderUsername === username && msg.receiverUsername === receiverUsername) || 
                    (msg.senderUsername === receiverUsername && msg.receiverUsername === username)))
                  )
                  .map((message, index) => (
                    <div 
                      key={message._id || index} 
                      className={`flex ${message.senderUsername === username ? 'justify-end' : 'justify-start'} mb-4 group`}
                    >
                      <div className={`relative max-w-xl ${message.senderUsername === username ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-800'} rounded-lg px-4 py-2 shadow`}>
                        {message.senderUsername !== username && (
                          <div className={`font-bold text-xs mb-1 ${currentGroup ? 'text-purple-700' : 'text-purple-600'}`}>
                            {message.senderUsername}
                          </div>
                        )}
                        
                        {message.messageText && (
                          <p className="text-sm whitespace-pre-wrap">{message.messageText}</p>
                        )}
                        
                        {message.file && (
                          <div className="mt-2">
                            {message.file.type.startsWith('image/') ? (
                              <div className="mt-2 relative">
                                <img 
                                  src={message.file.url} 
                                  alt="Image" 
                                  className="rounded max-w-full max-h-64 cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => openImageModal(message.file.url)}
                                />
                              </div>
                            ) : (
                              <a 
                                href={message.file.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={`flex items-center p-2 rounded ${message.senderUsername === username ? 'bg-purple-700 hover:bg-purple-800' : 'bg-gray-300 hover:bg-gray-400'} transition-colors duration-200`}
                              >
                                <div className="mr-2">
                                  {getFileIcon(message.file.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="truncate text-sm font-medium">{message.file.name}</div>
                                  <div className="text-xs opacity-80">{formatFileSize(message.file.size)}</div>
                                </div>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </a>
                            )}
                          </div>
                        )}
                        
                        <div className={`text-xs ${message.senderUsername === username ? 'text-purple-200' : 'text-gray-500'} mt-1`}>
                          {formatMessageTime(message.timestamp)}
                        </div>
                        
                        {message.senderUsername === username && (
                          <button
                            onClick={() => confirmDeleteMessage(message)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-full hover:bg-purple-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                {remoteTyping && (
                  <div className="flex justify-start mb-4">
                    <div className="bg-gray-200 text-gray-800 rounded-lg px-4 py-2 shadow">
                      <div className="flex items-center space-x-1">
                        <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce delay-75"></div>
                        <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce delay-150"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Message input area */}
              <div className="p-4 bg-white border-t">
                {selectedFile && (
                  <div className="mb-3 bg-gray-100 p-3 rounded-lg relative">
                    <button 
                      onClick={removeSelectedFile}
                      className="absolute top-1 right-1 bg-gray-200 rounded-full p-1 hover:bg-gray-300 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    
                    {filePreview ? (
                      <div className="flex justify-center">
                        <img src={filePreview} alt="Preview" className="max-h-40 rounded" />
                      </div>
                    ) : (
                      <div className="flex items-center">
                        {getFileIcon(selectedFile.type)}
                        <div className="ml-2">
                          <div className="text-sm font-medium truncate max-w-xs">{selectedFile.name}</div>
                          <div className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {!currentGroup && !receiverUsername && (
                  <div className="mb-3 p-3 bg-yellow-100 text-yellow-800 rounded-lg">
                    Please select a recipient or group to start messaging
                  </div>
                )}
                
                <div className="flex items-center">
                  <div className="relative mr-3">
                    <button 
                      onClick={() => setShowFileOptions(!showFileOptions)}
                      className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>
                    
                    {showFileOptions && (
                      <div className="absolute bottom-full left-0 mb-2 bg-white shadow-lg rounded-lg p-2 w-52 z-10">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          className="hidden"
                          id="fileInput"
                        />
                        <label 
                          htmlFor="fileInput"
                          className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Image
                        </label>
                        <label 
                          htmlFor="fileInput"
                          className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Document
                        </label>
                      </div>
                    )}
                  </div>
                  
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value);
                      handleTyping();
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={!currentGroup && !receiverUsername}
                    className="flex-1 p-3 bg-gray-100 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  
                  <button
                    onClick={handleSendMessage}
                    disabled={(!messageText && !selectedFile) || (!currentGroup && !receiverUsername) || loading}
                    className={`p-3 rounded-r-lg transition-colors ${(!messageText && !selectedFile) || (!currentGroup && !receiverUsername) ? 'bg-gray-300 text-gray-500' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
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
            </>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Create New Group</h3>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Group Name
              </label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter group name"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Select Members
              </label>
              <div className="max-h-60 overflow-y-auto border rounded p-2">
                {allUsers.map(user => (
                  <div 
                    key={user.username}
                    className="flex items-center p-2 hover:bg-gray-100 rounded"
                  >
                    <input
                      type="checkbox"
                      id={`user-${user.username}`}
                      checked={selectedGroupMembers.includes(user.username)}
                      onChange={() => toggleGroupMember(user.username)}
                      className="mr-2"
                    />
                    <label htmlFor={`user-${user.username}`} className="cursor-pointer flex-1">
                      {user.username}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateGroup(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : null}
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setShowImageModal(false)}>
          <div className="relative max-w-4xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <img src={modalImage} alt="Full view" className="rounded-lg w-full h-auto" />
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-2 right-2 bg-gray-800 text-white p-2 rounded-full hover:bg-gray-900 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-4">Delete Message</h3>
            <p className="mb-4">Are you sure you want to delete this message? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteMessage(messageToDelete._id)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Members Modal */}
      {showAddMembersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Add Members to {currentGroup?.name}</h3>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Select Members to Add
              </label>
              <div className="max-h-60 overflow-y-auto border rounded p-2">
                {allUsers
                  .filter(user => !currentGroup?.members.includes(user.username))
                  .map(user => (
                    <div 
                      key={user.username}
                      className="flex items-center p-2 hover:bg-gray-100 rounded"
                    >
                      <input
                        type="checkbox"
                        id={`new-user-${user.username}`}
                        checked={selectedNewMembers.includes(user.username)}
                        onChange={() => toggleNewMember(user.username)}
                        className="mr-2"
                      />
                      <label htmlFor={`new-user-${user.username}`} className="cursor-pointer flex-1">
                        {user.username}
                      </label>
                    </div>
                  ))}
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddMembersModal(false);
                  setSelectedNewMembers([]);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMembersToGroup}
                disabled={loading || selectedNewMembers.length === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : null}
                Add Members
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderUserProfile = () => (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-purple-800">My Profile</h2>
      <div className="bg-gray-50 p-6 rounded-lg shadow">
        <div className="flex items-center mb-6">
          <div className="relative">
            <img
              id="avatar-preview"
              src={userAvatar && typeof userAvatar === 'string' ? userAvatar : userAvatar ? URL.createObjectURL(userAvatar) : 'https://via.placeholder.com/100'}
              alt="User Avatar"
              className="w-24 h-24 rounded-full mr-4 object-cover"
            />
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 bg-purple-600 text-white p-2 rounded-full cursor-pointer hover:bg-purple-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </label>
            <input
              type="file"
              id="avatar-upload"
              accept="image/*"
              onChange={handleProfileAvatarChange}
              className="hidden"
            />
          </div>
          <div>
            <h3 className="text-xl font-semibold">{username}</h3>
            <p className="text-gray-600">Update your profile details below</p>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-2">Bio</label>
          <textarea
            value={userBio}
            onChange={(e) => setUserBio(e.target.value)}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            rows="4"
            placeholder="Tell something about yourself..."
          />
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setShowUserProfile(false)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdateProfile}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : null}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );

  const renderDiscoverPage = () => (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-purple-800">Discover Users</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allUsers.map(user => (
          <div
            key={user.username}
            className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all duration-200 cursor-pointer"
            onClick={() => {
              setReceiverUsername(user.username);
              setCurrentGroup(null);
              setShowDiscoverPage(false);
            }}
          >
            <div className="flex items-center">
              <img
                src={user.avatar || 'https://via.placeholder.com/50'}
                alt={`${user.username}'s avatar`}
                className="w-12 h-12 rounded-full mr-3 object-cover"
              />
              <div>
                <h3 className="font-semibold">{user.username}</h3>
                <p className="text-sm text-gray-600 truncate">{user.bio || 'No bio available'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {allUsers.length === 0 && (
        <p className="text-center text-gray-500 mt-4">No other users found.</p>
      )}
    </div>
  );

  const toggleLocalAIChat = () => {
    setShowLocalAIChat(!showLocalAIChat);
    setShowUserProfile(false);
    setShowDiscoverPage(false);
    setCurrentGroup(null);
    setReceiverUsername('');
  };

  return (
    <div className={`app ${darkTheme ? 'dark-theme' : ''}`}>
      {showLandingPage && renderLandingPage()}
      {showLoginForm && renderLoginForm()}
      {showRegisterForm && renderRegisterForm()}
      {loggedIn && renderChatInterface()}
      <style>{`
        .loader {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #9333ea;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .delay-75 { animation-delay: 0.075s; }
        .delay-150 { animation-delay: 0.15s; }
        
        /* Dark theme styles */
        .dark-theme {
          background-color: #121212;
          color: #e0e0e0;
        }
        
        /* Message container and messages */
        .dark-theme #message-container {
          background-color: #1a1a1a;
        }
        
        .dark-theme .bg-white {
          background-color: #1e1e1e;
        }
        
        .dark-theme .bg-gray-100 {
          background-color: #2d2d2d;
        }
        
        /* Message bubbles */
        .dark-theme .bg-purple-600.text-white {
          background-color: #6d28d9;
        }
        
        .dark-theme .bg-gray-200.text-gray-800 {
          background-color: #2d2d2d;
          color: #e0e0e0;
        }
        
        /* Input area */
        .dark-theme .bg-gray-100.rounded-l-lg {
          background-color: #2d2d2d;
          border-color: #4a4a4a;
        }
        
        .dark-theme .bg-gray-100.rounded-l-lg:focus {
          background-color: #363636;
        }
        
        /* Sidebar */
        .dark-theme .w-64.bg-white {
          background-color: #1e1e1e;
          border-right: 1px solid #333;
        }
        
        .dark-theme .text-gray-700 {
          color: #d0d0d0;
        }
        
        .dark-theme .text-gray-500 {
          color: #a0a0a0;
        }
        
        .dark-theme .text-gray-600 {
          color: #b0b0b0;
        }
        
        /* Search input */
        .dark-theme input[type="text"] {
          background-color: #2d2d2d;
          color: #e0e0e0;
          border-color: #4a4a4a;
        }
        
        .dark-theme input[type="text"]::placeholder {
          color: #888;
        }
        
        /* Hover states */
        .dark-theme .hover\:bg-gray-100:hover {
          background-color: #363636;
        }
        
        .dark-theme .hover\:bg-purple-700:hover {
          background-color: #5b21b6;
        }
        
        /* File attachments */
        .dark-theme .bg-gray-100.p-3.rounded-lg {
          background-color: #2d2d2d;
        }
        
        .dark-theme .bg-gray-200.rounded-full {
          background-color: #363636;
        }
        
        .dark-theme .hover\:bg-gray-300:hover {
          background-color: #404040;
        }
        
        /* Typing indicator */
        .dark-theme .animate-bounce {
          background-color: #4a4a4a;
        }
        
        /* Scrollbar */
        .dark-theme *::-webkit-scrollbar {
          width: 12px;
        }
        
        .dark-theme *::-webkit-scrollbar-track {
          background: #1e1e1e;
        }
        
        .dark-theme *::-webkit-scrollbar-thumb {
          background-color: #4a4a4a;
          border-radius: 20px;
          border: 3px solid #1e1e1e;
        }
        
        .dark-theme *::-webkit-scrollbar-thumb:hover {
          background-color: #5a5a5a;
        }
        
        /* Group and user list items */
        .dark-theme .border-l-4.border-purple-600 {
          border-left-color: #6d28d9;
          background-color: #2d2d2d;
        }
        
        /* Message time stamps */
        .dark-theme .text-gray-500, 
        .dark-theme .text-purple-200 {
          color: #888;
        }
        
        /* File upload button */
        .dark-theme .bg-gray-200.hover\:bg-gray-300 {
          background-color: #2d2d2d;
        }
        
        .dark-theme .bg-gray-200.hover\:bg-gray-300:hover {
          background-color: #363636;
        }
        
        /* Message options */
        .dark-theme .group-hover\:opacity-100 {
          color: #e0e0e0;
        }
        
        /* Warning messages */
        .dark-theme .bg-yellow-100.text-yellow-800 {
          background-color: #3d3000;
          color: #ffd700;
        }
        
        /* Modal styles */
        .dark-theme .fixed.inset-0.bg-black.bg-opacity-50 {
          background-color: rgba(0, 0, 0, 0.75);
        }
        
        .dark-theme .bg-white.rounded-lg.p-6 {
          background-color: #1e1e1e;
          border: 1px solid #333;
        }
        
        /* Modal buttons */
        .dark-theme .bg-gray-200.text-gray-800 {
          background-color: #363636;
          color: #e0e0e0;
        }
        
        .dark-theme .bg-gray-200.text-gray-800:hover {
          background-color: #404040;
        }
        
        /* Checkboxes and form elements */
        .dark-theme input[type="checkbox"] {
          background-color: #2d2d2d;
          border-color: #4a4a4a;
        }
        
        .dark-theme input[type="checkbox"]:checked {
          background-color: #6d28d9;
          border-color: #6d28d9;
        }
        
        /* Group members list */
        .dark-theme .max-h-60.overflow-y-auto.border {
          border-color: #333;
          background-color: #1a1a1a;
        }
        
        /* User cards in discover page */
        .dark-theme .bg-white.p-4.rounded-lg.shadow:hover {
          background-color: #2d2d2d;
        }
        
        /* Profile section */
        .dark-theme .bg-gray-50.p-6.rounded-lg.shadow {
          background-color: #1e1e1e;
        }
        
        .dark-theme textarea {
          background-color: #2d2d2d;
          color: #e0e0e0;
          border-color: #4a4a4a;
        }
        
        .dark-theme textarea:focus {
          background-color: #363636;
          border-color: #6d28d9;
        }
        
        /* Header and navigation */
        .dark-theme .bg-purple-600.text-white.p-4 {
          background-color: #4c1d95;
        }
        
        .dark-theme .bg-purple-800.px-3.py-1 {
          background-color: #5b21b6;
        }
        
        /* File preview */
        .dark-theme .bg-gray-100.p-3.rounded-lg.relative {
          background-color: #2d2d2d;
          border: 1px solid #333;
        }
        
        /* Loading spinner */
        .dark-theme .loader {
          border-color: #2d2d2d;
          border-top-color: #6d28d9;
        }
        
        /* Selected states */
        .dark-theme .bg-purple-100.border-l-4 {
          background-color: #2d2d2d;
          border-left-color: #6d28d9;
        }
        
        /* Avatar and image previews */
        .dark-theme .rounded-full.mr-3 {
          border: 2px solid #333;
        }
        
        /* Typing indicator */
        .dark-theme .bg-gray-500.rounded-full {
          background-color: #6d28d9;
        }
        
        /* Error messages */
        .dark-theme .text-red-500 {
          color: #ef4444;
        }
        
        /* Success messages */
        .dark-theme .text-green-500 {
          color: #10b981;
        }
        
        /* Links */
        .dark-theme a {
          color: #8b5cf6;
        }
        
        .dark-theme a:hover {
          color: #7c3aed;
        }
      `}</style>
    </div>
  );
}

export default App;