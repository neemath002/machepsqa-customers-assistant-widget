(function() {
    // Default Configuration
    const defaultConfig = {
        webhookUrl: '',
        title: 'Chat with us',
        welcomeMessage: 'Hello! How can I help you today?',
        primaryColor: '#007bff',
        backgroundColor: '#f4f7f6',
        userBubbleColor: '#007bff',
        botBubbleColor: '#e9ecef',
        userTextColor: '#ffffff',
        botTextColor: '#333333',
        placeholder: 'Type your message...',
        position: 'right' // 'left' or 'right'
    };

    // Merge user config with defaults
    const config = Object.assign({}, defaultConfig, window.N8NChatWidgetConfig || {});

    // State management
    let isOpen = false;
    let sessionId = localStorage.getItem('n8n_chat_session_id') || crypto.randomUUID();
    localStorage.setItem('n8n_chat_session_id', sessionId);

    // Create and Inject Styles
    const style = document.createElement('style');
    style.textContent = `
        .n8n-chat-widget {
            position: fixed;
            bottom: 20px;
            ${config.position}: 20px;
            z-index: 1000;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .n8n-chat-button {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background-color: ${config.primaryColor};
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.3s ease;
        }
        .n8n-chat-button:hover {
            transform: scale(1.1);
        }
        .n8n-chat-button svg {
            width: 30px;
            height: 30px;
            fill: white;
        }
        .n8n-chat-window {
            position: absolute;
            bottom: 80px;
            ${config.position}: 0;
            width: 350px;
            height: 500px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            display: none;
            flex-direction: column;
            overflow: hidden;
            animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .n8n-chat-header {
            background: ${config.primaryColor};
            color: white;
            padding: 15px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .n8n-chat-messages {
            flex: 1;
            padding: 15px;
            overflow-y: auto;
            background: ${config.backgroundColor};
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .n8n-message {
            max-width: 80%;
            padding: 10px 14px;
            border-radius: 18px;
            font-size: 14px;
            line-height: 1.4;
            word-wrap: break-word;
        }
        .n8n-message.bot {
            align-self: flex-start;
            background: ${config.botBubbleColor};
            color: ${config.botTextColor};
            border-bottom-left-radius: 4px;
        }
        .n8n-message.user {
            align-self: flex-end;
            background: ${config.userBubbleColor};
            color: ${config.userTextColor};
            border-bottom-right-radius: 4px;
        }
        .n8n-chat-input-area {
            padding: 15px;
            border-top: 1px solid #eee;
            display: flex;
            gap: 10px;
        }
        .n8n-chat-input {
            flex: 1;
            border: 1px solid #ddd;
            border-radius: 20px;
            padding: 8px 15px;
            outline: none;
            font-size: 14px;
        }
        .n8n-chat-send {
            background: none;
            border: none;
            cursor: pointer;
            color: ${config.primaryColor};
            display: flex;
            align-items: center;
        }
        .n8n-typing-indicator {
            display: none;
            align-self: flex-start;
            background: ${config.botBubbleColor};
            padding: 10px 14px;
            border-radius: 18px;
            border-bottom-left-radius: 4px;
        }
        .dot {
            height: 6px;
            width: 6px;
            background-color: #999;
            border-radius: 50%;
            display: inline-block;
            margin-right: 2px;
            animation: bounce 1.3s linear infinite;
        }
        .dot:nth-child(2) { animation-delay: -1.1s; }
        .dot:nth-child(3) { animation-delay: -0.9s; }
        @keyframes bounce {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-4px); }
        }
    `;
    document.head.appendChild(style);

    // Create DOM Elements
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'n8n-chat-widget';
    
    widgetContainer.innerHTML = `
        <div class="n8n-chat-window" id="n8nChatWindow">
            <div class="n8n-chat-header">
                <span>${config.title}</span>
                <button style="background:none;border:none;color:white;cursor:pointer;font-size:20px;" id="n8nCloseChat">&times;</button>
            </div>
            <div class="n8n-chat-messages" id="n8nChatMessages">
                <div class="n8n-message bot">${config.welcomeMessage}</div>
            </div>
            <div class="n8n-typing-indicator" id="n8nTypingIndicator">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            </div>
            <form class="n8n-chat-input-area" id="n8nChatForm">
                <input type="text" class="n8n-chat-input" id="n8nChatInput" placeholder="${config.placeholder}" autocomplete="off">
                <button type="submit" class="n8n-chat-send">
                    <svg viewBox="0 0 24 24" width="24" height="24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
                </button>
            </form>
        </div>
        <div class="n8n-chat-button" id="n8nChatButton">
            <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"></path></svg>
        </div>
    `;
    document.body.appendChild(widgetContainer);

    // UI Logic
    const chatButton = document.getElementById('n8nChatButton');
    const chatWindow = document.getElementById('n8nChatWindow');
    const closeChat = document.getElementById('n8nCloseChat');
    const chatForm = document.getElementById('n8nChatForm');
    const chatInput = document.getElementById('n8nChatInput');
    const chatMessages = document.getElementById('n8nChatMessages');
    const typingIndicator = document.getElementById('n8nTypingIndicator');

    const toggleChat = () => {
        isOpen = !isOpen;
        chatWindow.style.display = isOpen ? 'flex' : 'none';
        if (isOpen) chatInput.focus();
    };

    chatButton.addEventListener('click', toggleChat);
    closeChat.addEventListener('click', toggleChat);

    const addMessage = (text, sender) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `n8n-message ${sender}`;
        msgDiv.textContent = text;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const sendMessageToN8N = async (message) => {
        if (!config.webhookUrl) {
            console.error('n8n Webhook URL is not configured.');
            return;
        }

        typingIndicator.style.display = 'block';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const response = await fetch(config.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: "sendMessage",
                    chatInput: message,
                    sessionId: sessionId,
                    timestamp: new Date().toISOString()
                })
            });

            const data = await response.json();
            
            // Handle different n8n response formats
            let botResponse = "Sorry, I couldn't process that.";
            if (Array.isArray(data) && data.length > 0) {
                botResponse = data[0].output || data[0].message || JSON.stringify(data[0]);
            } else if (data.output) {
                botResponse = data.output;
            } else if (data.message) {
                botResponse = data.message;
            } else if (typeof data === 'string') {
                botResponse = data;
            }

            addMessage(botResponse, 'bot');
        } catch (error) {
            console.error('Error communicating with n8n:', error);
            addMessage('Error: Could not connect to the chat service.', 'bot');
        } finally {
            typingIndicator.style.display = 'none';
        }
    };

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (message) {
            addMessage(message, 'user');
            chatInput.value = '';
            sendMessageToN8N(message);
        }
    });
})();
