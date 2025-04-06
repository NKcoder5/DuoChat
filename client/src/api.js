import axios from 'axios';

// Base URL of the backend
const API_URL = 'http://localhost:5000/api';

// ✅ User Registration API
export const registerUser = async (username, email, password) => {
  try {
    const response = await axios.post(`${API_URL}/users/register`, {
      username,
      email,
      password,
    });
    return response.data;
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
};

// ✅ Send Message API
export const sendMessage = async (senderId, receiverId, messageText) => {
  try {
    const response = await axios.post(`${API_URL}/messages/send`, {
      senderId,
      receiverId,
      messageText,
    });
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};
