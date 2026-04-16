const bookContainer = document.getElementById('book-container');
const loadingSpinner = document.getElementById('loading-spinner');

let fetchedBooksCache = [];
let currentSearchQuery = '';
let currentStartIndex = 0;

async function fetchBooks(query = "subject:fiction", startIndex = 0, isAppend = false) {
    currentSearchQuery = query;
    currentStartIndex = startIndex;

    if (!isAppend) {
        bookContainer.innerHTML = '';
        fetchedBooksCache = [];
    }
    
    document.getElementById('btn-load-more').style.display = 'none';
    loadingSpinner.style.display = 'block';

    try {
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=12&startIndex=${startIndex}&orderBy=relevance`;
        const response = await fetch(url);
        const data = await response.json();

        loadingSpinner.style.display = 'none';

        if (data.items) {
            processAndRenderBooks(data.items);
            if (data.items.length === 12) {
                document.getElementById('btn-load-more').style.display = 'inline-flex';
            }
        } else {
            if (!isAppend) {
                bookContainer.innerHTML = '<p style="text-align:center;width:100%;color:#a0aec0;">Không tìm thấy sách phù hợp.</p>';
            }
        }
    } catch (error) {
        loadingSpinner.style.display = 'none';
        if (!isAppend) bookContainer.innerHTML = '<p style="text-align:center;width:100%;color:red;">Lỗi kết nối máy chủ Google API.</p>';
        console.error("API Error:", error);
    }
}

function generateMockChapters(fullDescription) {
    if(!fullDescription || fullDescription.trim().length === 0) {
        return [{ title: "Phần 1: Giới thiệu chung", content: "Nội dung cuốn sách này chưa được xuất bản trích đoạn do vấn đề bản quyền." }];
    }

    const rawText = fullDescription.replace(/(<([^>]+)>)/gi, " ");
    const sentences = rawText.match(/[^\.!\?]+[\.!\?]+/g) || [rawText];
    
    if (sentences.length <= 4) return [{ title: "Trích đoạn duy nhất", content: fullDescription }];

    const chapters = [];
    const chunksCount = Math.min(3, Math.ceil(sentences.length / 3)); 
    const chunkSize = Math.ceil(sentences.length / chunksCount);
    
    for (let i = 0; i < chunksCount; i++) {
        const chunkSentences = sentences.slice(i * chunkSize, (i + 1) * chunkSize);
        chapters.push({
            title: i === 0 ? "Phần 1: Khởi đầu" : (i === chunksCount - 1 ? `Phần ${i+1}: Kết lại` : `Phần ${i+1}: Tiếp diễn`),
            content: chunkSentences.join(" ")
        });
    }
    return chapters;
}

function processAndRenderBooks(items) {
    items.forEach((item) => {
        const info = item.volumeInfo;
        const id = item.id;
        
        const title = info.title || "Chưa rõ tiêu đề";
        const author = info.authors ? info.authors.join(", ") : "Nhiều tác giả";
        const cover = info.imageLinks ? info.imageLinks.thumbnail.replace('http:', 'https:') : "https://via.placeholder.com/150x200?text=No+Cover";
        const desc = info.description || "";
        const lang = info.language || "en";
        
        // Link mua sách ưu tiên link trên Google Books, nếu ko có thì quăng lên Search.
        const buyLink = info.infoLink || `https://www.google.com/search?tbm=bks&q=${encodeURIComponent(title)}`;
        // Link Audio sẽ mở tab tìm kiếm Youtube bản Sách nói
        const audioLink = `https://www.youtube.com/results?search_query=${encodeURIComponent(title + " sách nói audiobook full")}`;
        
        const generatedChapters = generateMockChapters(desc);

        fetchedBooksCache.push({ id, title, author, cover, lang, buyLink, audioLink, chapters: generatedChapters });

        const card = document.createElement('div');
        card.className = 'book-card';
        card.innerHTML = `
            <img src="${cover}" alt="Cover" class="book-cover" loading="lazy">
            <h3 class="book-title">${title}</h3>
            <p class="book-author">${author}</p>
            <p style="font-size: 0.85rem; color:#a0aec0; margin-top:0.5rem">Có ${generatedChapters.length} Phần trích đoạn (${lang.toUpperCase()})</p>
            <button class="btn-open-reader" onclick="openReaderModal('${id}')">Mở Trình Đọc</button>
        `;
        bookContainer.appendChild(card);
    });
}

// Khởi tạo một danh sách các đầu mục nổi tiếng đa ngôn ngữ
const defaultQueries = [
    'nhà giả kim', 
    'đắc nhân tâm', 
    'harry potter', 
    'tuổi trẻ đáng giá bao nhiêu', 
    'cây cam ngọt của tôi',
    'sách văn học',
    'Atomic Habits',
    'Sapiens: A Brief History of Humankind',
    'The Great Gatsby',
    'To Kill a Mockingbird'
];
// Mỗi lần refresh trang sẽ random tải 1 hạng mục để tránh trùng lặp và không bị Google chặn do câu lệnh quá dài
const randomLoadQuery = defaultQueries[Math.floor(Math.random() * defaultQueries.length)];
fetchBooks(randomLoadQuery);

document.getElementById('btn-load-more').addEventListener('click', () => {
    const btn = document.getElementById('btn-load-more');
    btn.innerHTML = "<i class='bx bx-loader-alt bx-spin' style='font-size: 1.2rem; margin-right: 5px;'></i> Đang tải...";
    fetchBooks(currentSearchQuery, currentStartIndex + 12, true).then(() => {
        btn.innerHTML = "<i class='bx bx-chevron-down' style='font-size: 1.2rem; margin-right: 5px;'></i> Tải Trang Kế Tiếp";
    });
});

document.getElementById('search-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter' && this.value.trim()) fetchBooks(this.value);
});


const readerModal = document.getElementById('reader-modal');
const readerCloseBtn = document.getElementById('reader-close-btn');

const sbCover = document.getElementById('reader-book-cover');
const sbTitle = document.getElementById('reader-book-title');
const sbAuthor = document.getElementById('reader-book-author');
const sbChapterList = document.getElementById('sidebar-chapters-list');

const contentTitle = document.getElementById('content-chapter-title');
const contentBody = document.getElementById('content-chapter-body');
const btnPlay = document.getElementById('btn-chapter-play');
const btnPause = document.getElementById('btn-chapter-pause');

let currentActiveBook = null;
let currentActiveChapterIndex = 0;

window.openReaderModal = function(bookId) {
    currentActiveBook = fetchedBooksCache.find(b => b.id === bookId);
    if(!currentActiveBook) return;

    sbCover.src = currentActiveBook.cover;
    sbTitle.innerText = currentActiveBook.title;
    sbAuthor.innerText = currentActiveBook.author;

    document.getElementById('btn-buy-book').href = currentActiveBook.buyLink;
    document.getElementById('btn-audio-book').href = currentActiveBook.audioLink;

    sbChapterList.innerHTML = '';
    currentActiveBook.chapters.forEach((chap, idx) => {
        const btn = document.createElement('button');
        btn.className = `chapter-item ${idx === 0 ? 'active' : ''}`;
        btn.innerText = chap.title;
        btn.onclick = () => loadChapter(idx, btn);
        sbChapterList.appendChild(btn);
    });

    loadChapter(0, sbChapterList.firstChild);
    stopTTS();
    readerModal.classList.add('active');
};

readerCloseBtn.addEventListener('click', () => {
    readerModal.classList.remove('active');
    stopTTS();
});

function loadChapter(chapIndex, chapButtonEl) {
    if(chapButtonEl) {
        document.querySelectorAll('.chapter-item').forEach(b => b.classList.remove('active'));
        chapButtonEl.classList.add('active');
    }
    currentActiveChapterIndex = chapIndex;
    const chapData = currentActiveBook.chapters[chapIndex];
    contentTitle.innerText = chapData.title;
    contentBody.innerHTML = `<p>${chapData.content.replace(/<br>/g, '</p><p>')}</p>`;
    stopTTS();
}

const synth = window.speechSynthesis;
let readerUtterance = null;
let isPlayingReader = false;
let isPaused = false;
const globalTtsStatus = document.getElementById('tts-status');
const ttsStatusText = document.getElementById('tts-status-text');

btnPlay.addEventListener('click', () => {
    if(!currentActiveBook) return;

    if (isPaused) {
        synth.resume();
        updatePlayState(true);
        return;
    }

    const rawText = currentActiveBook.chapters[currentActiveChapterIndex].content.replace(/(<([^>]+)>)/gi, " ");
    const lang = currentActiveBook.lang;
    
    readerUtterance = new SpeechSynthesisUtterance(rawText);
    
    if (lang === 'vi') {
        readerUtterance.lang = 'vi-VN';
        readerUtterance.rate = 0.92;
        readerUtterance.pitch = 1.05;
        const voices = synth.getVoices();
        const vietVoice = voices.find(v => v.lang === 'vi-VN' && (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Premium')));
        if(vietVoice) readerUtterance.voice = vietVoice;
    } else {
        readerUtterance.lang = 'en-US';
        readerUtterance.rate = 0.95;
        readerUtterance.pitch = 1.0;
        const voices = synth.getVoices();
        const engVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Alex')));
        if(engVoice) readerUtterance.voice = engVoice;
    }

    readerUtterance.onstart = () => updatePlayState(true);
    readerUtterance.onend = () => updatePlayState(false);
    readerUtterance.onerror = () => updatePlayState(false);

    synth.speak(readerUtterance);
});

btnPause.addEventListener('click', () => {
    if(synth.speaking && !synth.paused) {
        synth.pause();
        isPaused = true;
        updatePlayState(false, true); 
    }
});

function stopTTS() {
    synth.cancel();
    updatePlayState(false);
}
document.getElementById('tts-stop-btn').addEventListener('click', stopTTS);

function updatePlayState(isPlaying, setPaused=false) {
    isPlayingReader = isPlaying;
    isPaused = setPaused;
    
    if(isPlaying) {
        btnPlay.style.display = 'none';
        btnPause.style.display = 'flex';
        globalTtsStatus.classList.remove('hidden');
        ttsStatusText.innerText = `[${currentActiveBook.lang.toUpperCase()}] Đang lồng tiếng: ${currentActiveBook.chapters[currentActiveChapterIndex].title}`;
        globalTtsStatus.querySelector('.wave').style.opacity = '1';
    } else {
        btnPlay.style.display = 'flex';
        btnPause.style.display = 'none';
        if (isPaused) {
            ttsStatusText.innerText = "Đã tạm dừng lồng tiếng";
            globalTtsStatus.querySelector('.wave').style.opacity = '0.3';
        } else {
            globalTtsStatus.classList.add('hidden');
        }
    }
}


const aiToggleBtn = document.getElementById('ai-toggle-btn');
const aiWidget = document.getElementById('ai-widget');
const closeAiBtn = document.getElementById('close-ai-btn');
const moodChips = document.querySelectorAll('.mood-chip');
const chatBody = document.getElementById('ai-chat-body');
const typingIndicator = document.getElementById('ai-typing');

const moodKeywords = {
    'stress': 'sách thiền OR nghỉ ngơi OR giảm stress',
    'chill': 'văn học đời sống OR tản văn OR tịnh tâm',
    'motivation': 'sách tạo động lực OR self-help OR phát triển bản thân',
    'sad': 'sách tâm lý OR chữa lành OR yêu bản thân',
    'love': 'tiểu thuyết tình cảm OR ngôn tình',
    'business': 'sách kinh tế OR quản trị kinh doanh OR đầu tư',
    'sci-fi': 'khoa học viễn tưởng OR fantasy OR sci-fi',
    'history': 'sách lịch sử thế giới OR danh nhân lịch sử',
    'english': 'New York Times best seller english books OR classic english literature'
};

aiToggleBtn.addEventListener('click', () => aiWidget.classList.toggle('open'));
closeAiBtn.addEventListener('click', () => aiWidget.classList.remove('open'));

moodChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
        const mood = e.target.getAttribute('data-mood');
        const userText = e.target.innerText;
        
        document.querySelector('.mood-chips').style.display = 'none';
        appendMessage(userText, 'user-message');
        
        typingIndicator.style.display = 'flex';
        chatBody.scrollTop = chatBody.scrollHeight;
        
        setTimeout(() => {
            typingIndicator.style.display = 'none';
            handleAIResponse(mood);
        }, 1500);
    });
});

function appendMessage(text, className) {
    const div = document.createElement('div');
    div.className = `chat-message ${className}`;
    div.innerHTML = `<p>${text}</p>`;
    chatBody.insertBefore(div, typingIndicator);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function handleAIResponse(mood) {
    const query = moodKeywords[mood];
    
    const uiFriendlyNames = {
        'stress': 'Giảm Stress & Thiền định',
        'chill': 'Thư giãn & Đời sống',
        'motivation': 'Phát triển bản thân & Động lực',
        'sad': 'Chữa lành tâm hồn',
        'love': 'Tình yêu & Sự lãng mạn',
        'business': 'Sự nghiệp & Đầu tư',
        'sci-fi': 'Khoa học viễn tưởng',
        'history': 'Lịch sử hào hùng',
        'english': 'Tinh Hoa Sách Ngoại Văn (English)'
    };

    let answerResponse = `Tuyệt, tôi đang kết nối với hệ thống để lọc ra các kiệt tác xuất sắc nhất về chủ đề <b>"${uiFriendlyNames[mood]}"</b> cho bạn nhé.`;
    appendMessage(answerResponse, 'ai-message');

    document.getElementById('book-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
    fetchBooks(query);
    
    setTimeout(() => {
        document.querySelector('.mood-chips').style.display = 'flex';
    }, 1500);
}
