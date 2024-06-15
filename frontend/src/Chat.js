////// /react-chat-app/frontend/src/Chat.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { TextareaAutosize, Button, List, ListItem, ListItemText, Typography, Container, Paper, useMediaQuery, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import './Chat.css';
import { format } from 'date-fns';

const API_URL = 'http://localhost:5001';

const Chat = ({ user }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [typingStatus, setTypingStatus] = useState('');
    const [lastReadMessageId, setLastReadMessageId] = useState(null);
    const typingTimeoutRef = useRef(null);
    const bottomRef = useRef(null);
    const messagesEndRef = useRef(null);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const otherUser = user === 'Jeremy' ? 'Kasey' : 'Jeremy';
    const lastMessageId = useRef(null);
    const [isAtBottom, setIsAtBottom] = useState(true);

    const handleReadReceipts = useCallback(async () => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.name !== user) {
            try {
                await axios.put(`${API_URL}/messages/${lastMessage.id}/read`, { user }, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            } catch (error) {
                console.error('Error updating read status:', error);
            }
        }
    }, [messages, user]);

    const scrollToBottom = (behavior = 'auto') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const response = await axios.get(`${API_URL}/messages`, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                console.log('Fetched messages:', response.data);

                const newMessages = response.data;
                const wasAtBottom = isAtBottom;

                setMessages(newMessages);

                const lastReadMessage = newMessages.slice().reverse().find(msg => msg.readAt && msg.name === user);
                if (lastReadMessage) {
                    setLastReadMessageId(lastReadMessage.id);
                } else {
                    setLastReadMessageId(null);
                }

                const lastMessage = newMessages[newMessages.length - 1];
                if (newMessages.length > messages.length && lastMessage.name !== user) {
                    const newMessageSound = new Audio('/notification.wav');
                    newMessageSound.play().catch(error => {
                        console.log('Audio playback failed: ', error);
                    });
                }
                lastMessageId.current = lastMessage.id;

                if (wasAtBottom) {
                    scrollToBottom('smooth');
                }
            } catch (error) {
                console.error('Error fetching messages:', error);
            }
        };

        const fetchStatus = async () => {
            try {
                const response = await axios.get(`${API_URL}/status/${otherUser}`, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                console.log('Fetched status:', response.data);
                const { isTyping, lastReadMessageId } = response.data;
                setTypingStatus(isTyping ? `${otherUser} is typing...` : '');

                if (lastReadMessageId) {
                    const lastReadMessage = messages.find(msg => msg.id === lastReadMessageId);
                    if (lastReadMessage) {
                        setLastReadMessageId(lastReadMessage.id);
                    }
                }
            } catch (error) {
                console.error('Error fetching status:', error);
            }
        };

        fetchMessages();
        fetchStatus();

        const interval = setInterval(() => {
            fetchMessages();
            fetchStatus();
        }, 1000);

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                handleReadReceipts();
            }
        };

        const handleFocus = () => {
            handleReadReceipts();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [user, otherUser, handleReadReceipts, messages.length, isAtBottom]);

    const sendMessage = async () => {
        if (input.trim() !== "") {
            try {
                await axios.post(`${API_URL}/messages`, { name: user, text: input }, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                setInput('');
                setIsTyping(false);
                await axios.post(`${API_URL}/typing`, { user, isTyping: false }, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                clearTimeout(typingTimeoutRef.current);
            } catch (error) {
                console.error('Error sending message:', error);
            }
        }
    };

    const handleInputChange = async (e) => {
        setInput(e.target.value);
        if (!isTyping) {
            setIsTyping(true);
            try {
                await axios.post(`${API_URL}/typing`, { user, isTyping: true }, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            } catch (error) {
                console.error('Error updating typing status:', error);
            }
        }
        if (e.target.value === '') {
            setIsTyping(false);
            try {
                await axios.post(`${API_URL}/typing`, { user, isTyping: false }, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            } catch (error) {
                console.error('Error updating typing status:', error);
            }
        }
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(async () => {
            setIsTyping(false);
            try {
                await axios.post(`${API_URL}/typing`, { user, isTyping: false }, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            } catch (error) {
                console.error('Error updating typing status:', error);
            }
        }, 3000);
    };

    const handleScroll = () => {
        const element = bottomRef.current;
        if (element) {
            const { scrollTop, scrollHeight, clientHeight } = element;
            setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 50);
        }
    };

    const handleBlur = async () => {
        handleReadReceipts();
    };

    useEffect(() => {
        console.log('Messages state:', messages);
        if (isAtBottom) {
            scrollToBottom();
        }
    }, [messages]);

    return (
        <Container maxWidth={isMobile ? false : "sm"} className="chat-container">
            <Paper elevation={3} style={{ padding: '1rem', height: isMobile ? '100vh' : 'auto', display: 'flex', flexDirection: 'column', backgroundColor: '#1a1a1a' }}>
                <Typography variant="h4" align="center" gutterBottom style={{ color: 'white' }}>
                    Chat as {user}
                </Typography>
                <List
                    className="chat-list"
                    style={{ flexGrow: 1, overflowY: 'scroll', marginBottom: '1rem' }}
                    onScroll={handleScroll}
                    ref={bottomRef}
                >
                    {messages.map((message) => (
                        <React.Fragment key={message.id}>
                            <ListItem 
                                alignItems="flex-start"
                                className={message.name === user ? "chat-bubble user" : "chat-bubble other"}
                            >
                                <ListItemText
                                    primary={message.text.split('\n').map((line, index) => (
                                        <span key={index}>
                                            {line}
                                            <br />
                                        </span>
                                    ))}
                                    secondary={`${message.name}, ${new Date(message.timestamp).toLocaleString()}`}
                                />
                            </ListItem>
                            {message.id === lastReadMessageId && message.name === user && (
                                <Typography variant="body2" color="textSecondary" align="right" style={{ marginLeft: '1rem', color: 'white' }}>
                                    {`${otherUser} read your message at ${format(new Date(message.readAt), 'h:mm a')}`}
                                </Typography>
                            )}
                        </React.Fragment>
                    ))}
                    <div ref={messagesEndRef} />
                </List>
                <Typography variant="body2" color="textSecondary" align="center" gutterBottom>
                    {typingStatus}
                </Typography>
                <Box display="flex" alignItems="center" style={{ padding: '0.5rem', backgroundColor: '#2c2c2c', borderRadius: '15px' }}>
                    <TextareaAutosize
                        minRows={1}
                        maxRows={4}
                        placeholder="Type a message..."
                        value={input}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        style={{ flexGrow: 1, resize: 'none', padding: '10px', backgroundColor: '#1a1a1a', color: 'white', border: 'none', outline: 'none' }}
                    />
                    <Button
                        variant="contained"
                        className="send-button"
                        onClick={sendMessage}
                        style={{ marginLeft: '0.5rem', backgroundColor: '#007bff', color: 'white' }}
                    >
                        Send
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default Chat;
