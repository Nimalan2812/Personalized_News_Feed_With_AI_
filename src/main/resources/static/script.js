document.addEventListener('DOMContentLoaded', () => {
    // State
    let topics = JSON.parse(localStorage.getItem('forme_topics')) || ['Technology', 'AI'];
    let allNews = [];
    let savedArticles = JSON.parse(localStorage.getItem('forme_saved')) || [];
    let showingSaved = false;
    let currentChatArticle = null; // Track article context for chat
    let lastAiResponse = ""; // Track last AI response for context

    // Elements
    const topicInput = document.getElementById('topicInput');
    const addTopicBtn = document.getElementById('addTopicBtn');
    const topicList = document.getElementById('topicList');
    const newsGrid = document.getElementById('newsGrid');
    const loader = document.getElementById('loader');
    const emptyState = document.getElementById('emptyState');
    const errorState = document.getElementById('errorState');
    const refreshFeedBtn = document.getElementById('refreshFeedBtn');
    const backToHomeBtn = document.getElementById('backToHomeBtn');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');

    // Chat Elements
    const chatFab = document.getElementById('chatFab');
    const chatPanel = document.getElementById('chatPanel');
    const chatClose = document.getElementById('chatClose');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatQuickActions = document.getElementById('chatQuickActions');

    // Initialize
    initTheme();
    renderTopics();
    updateClock();
    setInterval(updateClock, 1000);
    fetchNews();

    // Event Listeners
    addTopicBtn.addEventListener('click', addTopic);
    topicInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTopic();
    });
    refreshFeedBtn.addEventListener('click', () => {
        showingSaved = false;
        document.querySelector('.feed-header h1').textContent = 'Trending For You';
        backToHomeBtn.classList.add('hidden');
        refreshFeedBtn.classList.remove('hidden');
        fetchNews();
    });

    backToHomeBtn.addEventListener('click', () => {
        showingSaved = false;
        document.querySelector('.feed-header h1').textContent = 'Trending For You';
        backToHomeBtn.classList.add('hidden');
        refreshFeedBtn.classList.remove('hidden');
        fetchNews();
    });
    darkModeToggle.addEventListener('click', toggleTheme);

    document.getElementById('savedArticlesBtn').addEventListener('click', () => {
        showingSaved = true;
        allNews = [...savedArticles];
        document.querySelector('.feed-header h1').textContent = '⭐ Saved Articles';
        backToHomeBtn.classList.remove('hidden');
        refreshFeedBtn.classList.add('hidden');
        renderNews();
        if (window.innerWidth <= 900) sidebar.classList.remove('open');
    });

    // Sidebar toggle for mobile
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 900 && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && e.target !== sidebarToggle) {
                sidebar.classList.remove('open');
            }
        }
    });

    // ===== Chat Logic =====
    chatFab.addEventListener('click', () => {
        chatPanel.classList.toggle('hidden');
        if (!chatPanel.classList.contains('hidden')) {
            chatInput.focus();
        }
    });

    chatClose.addEventListener('click', () => {
        chatPanel.classList.add('hidden');
    });

    chatSendBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });

    // Quick action buttons
    chatQuickActions.addEventListener('click', (e) => {
        const btn = e.target.closest('.quick-btn');
        if (!btn) return;

        const action = btn.dataset.action;
        let message = '';
        switch (action) {
            case 'explain':
                if (currentChatArticle) {
                    message = 'Explain this news article in simple, beginner-friendly terms.';
                } else if (lastAiResponse) {
                    message = 'Explain your last response in even simpler terms.';
                } else {
                    message = 'Explain the latest trending news in simple terms.';
                }
                break;
            case 'translate-tamil':
                if (currentChatArticle) {
                    message = 'Translate this news article title and description into Tamil.';
                } else {
                    message = 'Translate your last response into Tamil.';
                }
                break;
            case 'translate-hindi':
                if (currentChatArticle) {
                    message = 'Translate this news article title and description into Hindi.';
                } else {
                    message = 'Translate your last response into Hindi.';
                }
                break;
            case 'summarize':
                if (currentChatArticle) {
                    message = 'Give me a brief 3-line summary of this article.';
                } else if (lastAiResponse) {
                    message = 'Give me a brief summary of your last response.';
                } else {
                    message = 'Summarize the latest trending news briefly.';
                }
                break;
        }

        if (message) {
            addChatBubble('user', message);
            sendToAI(message);
        }
    });



    function sendChatMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        addChatBubble('user', message);
        chatInput.value = '';
        sendToAI(message);
    }

    function addChatBubble(type, text) {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${type}`;
        bubble.innerHTML = text.replace(/\n/g, '<br>');
        chatMessages.appendChild(bubble);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTypingIndicator() {
        const typing = document.createElement('div');
        typing.className = 'chat-typing';
        typing.id = 'chatTyping';
        typing.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
        chatMessages.appendChild(typing);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function removeTypingIndicator() {
        const typing = document.getElementById('chatTyping');
        if (typing) typing.remove();
    }

    function startChatCooldown() {
        chatInput.disabled = true;
        chatSendBtn.disabled = true;
        chatSendBtn.style.opacity = '0.5';
        chatSendBtn.style.cursor = 'not-allowed';
        
        let timeLeft = 5;
        const originalPlaceholder = chatInput.placeholder;
        chatInput.placeholder = `Please wait ${timeLeft}s...`;

        const timer = setInterval(() => {
            timeLeft--;
            if (timeLeft > 0) {
                chatInput.placeholder = `Please wait ${timeLeft}s...`;
            } else {
                clearInterval(timer);
                chatInput.disabled = false;
                chatSendBtn.disabled = false;
                chatSendBtn.style.opacity = '1';
                chatSendBtn.style.cursor = 'pointer';
                chatInput.placeholder = originalPlaceholder;
                chatInput.focus();
            }
        }, 1000);
    }

    async function sendToAI(message) {
        showTypingIndicator();

        try {
            const body = {
                message: message,
                articleTitle: currentChatArticle ? currentChatArticle.title : null,
                articleDescription: currentChatArticle ? currentChatArticle.description : null,
                lastResponse: lastAiResponse
            };

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            removeTypingIndicator();

            if (!response.ok) throw new Error('Failed to get response');

            const data = await response.json();
            lastAiResponse = data.reply;
            addChatBubble('ai', data.reply || 'Sorry, no response received.');
            
            // Start 5-second cooldown to prevent rate-limiting (429)
            startChatCooldown();
        } catch (error) {
            removeTypingIndicator();
            addChatBubble('ai', '⚠️ Error connecting to AI. Please make sure the server is running.');
            console.error('Chat error:', error);
        }
    }

    // Clock Logic
    function updateClock() {
        const now = new Date();
        const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        const display = document.getElementById('datetimeDisplay');
        if (display) display.textContent = now.toLocaleDateString('en-US', options);
    }

    // Theme Logic
    function initTheme() {
        const savedTheme = localStorage.getItem('forme_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('forme_theme', newTheme);
        updateThemeIcon(newTheme);
    }

    function updateThemeIcon(theme) {
        darkModeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }

    // Topic Logic
    function addTopic() {
        const newTopic = topicInput.value.trim();
        if (!newTopic) return;
        
        if (topics.some(t => t.toLowerCase() === newTopic.toLowerCase())) {
            alert('Topic already exists in your folder!');
            return;
        }

        topics.push(newTopic);
        saveTopics();
        renderTopics();
        topicInput.value = '';
        fetchNews();
    }

    function deleteTopic(topicToRemove) {
        topics = topics.filter(t => t !== topicToRemove);
        saveTopics();
        renderTopics();
        fetchNews();
    }

    function saveTopics() {
        localStorage.setItem('forme_topics', JSON.stringify(topics));
    }

    function getTopicIcon(topic) {
        const lower = topic.toLowerCase();
        if (lower.includes('ai') || lower.includes('artificial')) return '🧠';
        if (lower.includes('finance') || lower.includes('money')) return '💰';
        if (lower.includes('sport')) return '⚽';
        if (lower.includes('tech')) return '💻';
        if (lower.includes('health')) return '⚕️';
        if (lower.includes('science')) return '🔬';
        return '📌';
    }

    function renderTopics() {
        topicList.innerHTML = '';
        topics.forEach(topic => {
            const li = document.createElement('li');
            li.className = 'topic-item';
            
            const nameDiv = document.createElement('div');
            nameDiv.className = 'topic-name';
            nameDiv.innerHTML = `<span>${getTopicIcon(topic)}</span> ${topic}`;
            
            const delBtn = document.createElement('button');
            delBtn.innerHTML = `<svg class="trash-icon" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>`;
            delBtn.onclick = () => deleteTopic(topic);
            
            li.appendChild(nameDiv);
            li.appendChild(delBtn);
            topicList.appendChild(li);
        });
    }

    // News Fetching Logic
    async function fetchNews() {
        newsGrid.innerHTML = '';
        errorState.classList.add('hidden');
        
        if (topics.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        loader.classList.remove('hidden');
        allNews = [];

        try {
            const fetchPromises = topics.map(topic => 
                fetch(`/api/news?topic=${encodeURIComponent(topic)}`)
                    .then(res => {
                        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                        return res.json();
                    })
                    .then(articles => articles.map(art => ({ ...art, sourceTopic: topic })))
            );

            const results = await Promise.all(fetchPromises);
            allNews = results.flat().sort(() => 0.5 - Math.random());
            renderNews();
        } catch (error) {
            console.error('Failed to fetch news:', error);
            errorState.classList.remove('hidden');
        } finally {
            loader.classList.add('hidden');
        }
    }

    function renderNews() {
        newsGrid.innerHTML = '';
        if (allNews.length === 0) {
            let emptyMsg = showingSaved ? 'No saved articles yet!' : 'No recent news found';
            newsGrid.innerHTML = `<div class="empty-state"><h3>${emptyMsg}</h3><p>Try different topics or save some articles.</p></div>`;
            return;
        }

        allNews.forEach((article, index) => {
            const card = document.createElement('div');
            card.className = 'news-card';
            card.style.animationDelay = `${index * 0.08}s`;

            const imgWrapper = document.createElement('div');
            imgWrapper.className = 'img-wrapper';
            imgWrapper.style.overflow = 'hidden';

            const img = document.createElement('img');
            img.className = 'news-image';
            const fallbackImg = 'https://placehold.co/400x200/e2e8f0/64748b?text=Article+Preview+Unavailable';
            img.src = (article.urlToImage && article.urlToImage !== 'null') ? article.urlToImage : fallbackImg;
            img.alt = 'News Thumbnail';
            img.loading = 'lazy';
            img.onerror = function() { 
                this.onerror = null; 
                this.src = fallbackImg;
            };
            imgWrapper.appendChild(img);

            const content = document.createElement('div');
            content.className = 'news-content';

            const tag = document.createElement('span');
            tag.className = 'news-topic-tag';
            tag.textContent = article.sourceTopic;

            const title = document.createElement('h3');
            title.className = 'news-title';
            title.textContent = article.title;

            const desc = document.createElement('p');
            desc.className = 'news-desc';
            desc.textContent = article.description || 'No description available.';

            const actions = document.createElement('div');
            actions.className = 'news-actions';

            const isSaved = savedArticles.some(a => a.url === article.url);
            const saveBtn = document.createElement('button');
            saveBtn.className = `btn-save ${isSaved ? 'saved' : ''}`;
            saveBtn.innerHTML = isSaved ? '⭐' : '🤍';
            saveBtn.title = isSaved ? 'Unsave' : 'Save for later';
            saveBtn.onclick = () => toggleSaveArticle(article);

            const readFullBtn = document.createElement('a');
            readFullBtn.className = 'btn-read';
            readFullBtn.innerHTML = '📖 Read';
            readFullBtn.href = article.url;
            readFullBtn.target = '_blank';
            readFullBtn.rel = 'noopener noreferrer';

            actions.appendChild(saveBtn);
            actions.appendChild(readFullBtn);
            content.appendChild(tag);
            content.appendChild(title);
            content.appendChild(desc);
            content.appendChild(actions);

            card.appendChild(imgWrapper);
            card.appendChild(content);

            newsGrid.appendChild(card);
        });
    }

    function toggleSaveArticle(article) {
        const existsIndex = savedArticles.findIndex(a => a.url === article.url);
        if (existsIndex >= 0) {
            savedArticles.splice(existsIndex, 1);
        } else {
            savedArticles.push(article);
        }
        localStorage.setItem('forme_saved', JSON.stringify(savedArticles));
        
        if (showingSaved) {
            allNews = [...savedArticles];
        }
        renderNews();
    }

});
