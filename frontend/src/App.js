import React, { useState, useEffect, useRef } from 'react';

// API base URL - use relative URL in production, absolute in development
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' 
  : 'http://127.0.0.1:8000';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedModel, setSelectedModel] = useState('deepseek');
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const chatWindowRef = useRef(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/history`);
        const data = await response.json();
        setMessages(data.history);
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    };
    fetchHistory();
  }, []);

  // Close login form when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLoginForm && !event.target.closest('[data-login-section]')) {
        setShowLoginForm(false);
      }
    };
    if (showLoginForm) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showLoginForm]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatWindowRef.current) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        if (chatWindowRef.current) {
          chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (input.trim() && isLoggedIn) {
      const messageText = input;
      // Create new session if none exists
      if (!currentSessionId) {
        const newSessionId = Date.now().toString();
        const newSession = {
          id: newSessionId,
          title: 'New Chat',
          messages: [],
          createdAt: new Date().toISOString(),
        };
        setChatSessions([newSession, ...chatSessions]);
        setCurrentSessionId(newSessionId);
        setMessages([]);
      }
      
      const userMessage = { role: 'user', content: messageText };
      setMessages((prevMessages) => [...prevMessages, userMessage]);
      setInput('');
      
      try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: messageText, model: selectedModel }),
        });
        const data = await response.json();
        setMessages((prevMessages) => [...prevMessages, { role: 'assistant', content: data.response }]);
      } catch (error) {
        console.error("Error sending message:", error);
        setMessages((prevMessages) => [...prevMessages, { role: 'assistant', content: "Error: Could not get response from AI." }]);
      }
    }
  };

  const handleClearHistory = async () => {
    try {
      await fetch(`${API_BASE_URL}/clear_history`, {
        method: 'POST',
      });
      setMessages([]);
    } catch (error) {
      console.error("Error clearing chat history:", error);
    }
  };

  const handleLogin = () => {
    // Placeholder for actual authentication logic
    // Trim whitespace from inputs
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    
    // For now, accept any non-empty credentials (placeholder authentication)
    if (trimmedUsername && trimmedPassword) {
      setIsLoggedIn(true);
      setShowLoginForm(false);
      setUsername('');
      setPassword('');
    } else {
      alert('Please enter both username and password');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setMessages([]);
    setChatSessions([]);
    setCurrentSessionId(null);
  };

  const createNewChat = () => {
    const newSessionId = Date.now().toString();
    const newSession = {
      id: newSessionId,
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
    };
    setChatSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSessionId);
    setMessages([]);
  };

  const selectChatSession = (sessionId) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
    }
  };


  // Update current session when messages change
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      setChatSessions(prev => prev.map(session => {
        if (session.id === currentSessionId) {
          const firstUserMessage = messages.find(m => m.role === 'user');
          const title = firstUserMessage 
            ? (firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : ''))
            : 'New Chat';
          return {
            ...session,
            messages: messages,
            title: title,
          };
        }
        return session;
      }));
    }
  }, [messages, currentSessionId]);

  return (
    <div className="App" style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>ChatGPT Clone</h1>
        </div>
        <div style={styles.headerRight}>
          {isLoggedIn ? (
            <div style={styles.userSection}>
              <span style={styles.userName}>Welcome, {username}!</span>
              <button onClick={handleLogout} style={styles.logoutButton}>
                Logout
              </button>
            </div>
          ) : (
            <div style={styles.loginSection} data-login-section>
              <button 
                onClick={() => setShowLoginForm(!showLoginForm)} 
                style={styles.loginButton}
              >
                Login
              </button>
              {showLoginForm && (
                <div style={styles.loginForm}>
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={styles.loginInput}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && password) {
                        handleLogin();
                      }
                    }}
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={styles.loginInput}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && username && password) {
                        handleLogin();
                      }
                    }}
                  />
                  <button onClick={handleLogin} style={styles.loginSubmitButton}>
                    Sign In
                  </button>
                  <button 
                    onClick={() => setShowLoginForm(false)} 
                    style={styles.cancelButton}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      
      <div style={styles.mainContent}>
        <div style={styles.sidebar}>
          <button onClick={createNewChat} style={styles.newChatButton}>
            + New Chat
          </button>
          <div style={styles.chatHistory}>
            <div style={styles.chatHistoryTitle}>Chat History</div>
            {chatSessions.length === 0 ? (
              <div style={styles.noHistoryText}>No chat history yet</div>
            ) : (
              chatSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => selectChatSession(session.id)}
                  style={{
                    ...styles.chatHistoryItem,
                    ...(currentSessionId === session.id ? styles.chatHistoryItemActive : {})
                  }}
                >
                  <div style={styles.chatHistoryItemTitle}>{session.title}</div>
                  <div style={styles.chatHistoryItemTime}>
                    {new Date(session.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div style={styles.chatArea}>
          <div style={styles.controlsBar}>
            <select 
              style={styles.modelSelect}
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              <option value="deepseek">DeepSeek</option>
              <option value="supermind-agent-v1">Supermind Agent v1</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              <option value="gpt-5">GPT-5</option>
              <option value="grok-4-fast">Grok-4 Fast</option>
            </select>
            <button onClick={handleClearHistory} style={styles.clearHistoryButton}>
              Clear History
            </button>
          </div>
          
          <div ref={chatWindowRef} style={styles.chatWindow}>
            {messages.length === 0 ? (
              <div style={styles.emptyState}>
                <h2 style={styles.emptyStateTitle}>Start a conversation</h2>
                <p style={styles.emptyStateText}>
                  {isLoggedIn 
                    ? "Send a message to begin chatting with the AI." 
                    : "Please log in to start chatting."}
                </p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div key={index} style={msg.role === 'user' ? styles.userMessage : styles.aiMessage}>
                  <div style={styles.messageContent}>{msg.content}</div>
                </div>
              ))
            )}
          </div>
          
          <div style={styles.inputContainer}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && isLoggedIn) {
                  handleSendMessage();
                }
              }}
              style={styles.inputField}
              placeholder={isLoggedIn ? "Type your message..." : "Please log in to send messages"}
              disabled={!isLoggedIn}
            />
            <button 
              onClick={handleSendMessage} 
              style={isLoggedIn ? styles.sendButton : styles.sendButtonDisabled}
              disabled={!isLoggedIn}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: '15px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    borderBottom: '1px solid #e0e0e0',
    position: 'relative',
    zIndex: 100,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '600',
    color: '#333',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  userName: {
    color: '#666',
    fontSize: '14px',
  },
  logoutButton: {
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  loginSection: {
    position: 'relative',
  },
  loginButton: {
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  loginForm: {
    position: 'absolute',
    top: '50px',
    right: 0,
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minWidth: '250px',
    zIndex: 1000,
  },
  loginInput: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  loginSubmitButton: {
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    color: '#666',
    border: 'none',
    borderRadius: '6px',
    padding: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s',
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'row',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: '280px',
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  newChatButton: {
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    margin: '15px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  chatHistory: {
    flex: 1,
    overflowY: 'auto',
    padding: '10px',
  },
  chatHistoryTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '10px 15px',
    marginBottom: '5px',
  },
  chatHistoryItem: {
    padding: '12px 15px',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '5px',
    transition: 'background-color 0.2s',
    backgroundColor: 'transparent',
  },
  chatHistoryItemActive: {
    backgroundColor: '#f0f0f0',
  },
  chatHistoryItemTitle: {
    fontSize: '14px',
    color: '#333',
    fontWeight: '500',
    marginBottom: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  chatHistoryItemTime: {
    fontSize: '12px',
    color: '#999',
  },
  noHistoryText: {
    padding: '20px 15px',
    textAlign: 'center',
    color: '#999',
    fontSize: '14px',
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  controlsBar: {
    backgroundColor: '#ffffff',
    padding: '15px 30px',
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    borderBottom: '1px solid #e0e0e0',
  },
  modelSelect: {
    padding: '10px 15px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '14px',
    backgroundColor: 'white',
    cursor: 'pointer',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  clearHistoryButton: {
    backgroundColor: '#ff6b6b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  chatWindow: {
    flex: 1,
    padding: '30px',
    overflowY: 'auto',
    backgroundColor: '#f9f9f9',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    scrollBehavior: 'smooth',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#999',
  },
  emptyStateTitle: {
    fontSize: '24px',
    fontWeight: '500',
    margin: '0 0 10px 0',
    color: '#666',
  },
  emptyStateText: {
    fontSize: '16px',
    color: '#999',
    margin: 0,
  },
  userMessage: {
    alignSelf: 'flex-end',
    maxWidth: '70%',
    backgroundColor: '#667eea',
    color: 'white',
    borderRadius: '18px 18px 4px 18px',
    padding: '12px 18px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    maxWidth: '70%',
    backgroundColor: '#ffffff',
    color: '#333',
    borderRadius: '18px 18px 18px 4px',
    padding: '12px 18px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #e0e0e0',
  },
  messageContent: {
    fontSize: '15px',
    lineHeight: '1.5',
    wordWrap: 'break-word',
  },
  inputContainer: {
    display: 'flex',
    padding: '20px 30px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e0e0e0',
    gap: '10px',
  },
  inputField: {
    flex: 1,
    padding: '12px 18px',
    border: '1px solid #ddd',
    borderRadius: '24px',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  sendButton: {
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '24px',
    padding: '12px 24px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
    minWidth: '80px',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    color: 'white',
    border: 'none',
    borderRadius: '24px',
    padding: '12px 24px',
    cursor: 'not-allowed',
    fontSize: '15px',
    fontWeight: '500',
    minWidth: '80px',
  },
};

export default App;

