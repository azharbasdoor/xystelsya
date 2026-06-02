/**
 * LLM Chat App Frontend (Universal dengan Fitur Cookie Backup)
 */

var chatMessages = document.getElementById("chat-messages");
var userInput = document.getElementById("user-input");
var sendButton = document.getElementById("send-button");
var typingIndicator = document.getElementById("typing-indicator");

var isProcessing = false;
var chatHistory = [];

// --- UTILITY COOKIE (Agar riwayat chat tidak hilang saat ditekan Refresh) ---
function setChatCookie(historyArray) {
    try {
        // Batasi riwayat maksimal 6 pesan terakhir agar muat di memori cookie ponsel jadul (< 4KB)
        var limitedHistory = historyArray;
        if (historyArray.length > 6) {
            var firstMsg = historyArray[0];
            var lastMessages = historyArray.slice(historyArray.length - 5);
            limitedHistory = [firstMsg];
            for (var i = 0; i < lastMessages.length; i++) {
                limitedHistory.push(lastMessages[i]);
            }
        }
        var str = JSON.stringify(limitedHistory);
        var date = new Date();
        date.setTime(date.getTime() + (24 * 60 * 60 * 1000)); // Aktif 1 hari
        document.cookie = "xystelsya_chat=" + encodeURIComponent(str) + "; expires=" + date.toUTCString() + "; path=/";
    } catch (e) {}
}

function getChatCookie() {
    try {
        var nameEQ = "xystelsya_chat=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) {
                var str = decodeURIComponent(c.substring(nameEQ.length, c.length));
                return JSON.parse(str);
            }
        }
    } catch (e) {}
    return null;
}

// --- INITIAL LOAD (Memuat Chat Pertama Kali) ---
function initChat() {
    chatHistory = getChatCookie();
    
    // Jika cookie kosong, buat pesan sambutan pertama
    if (!chatHistory || chatHistory.length === 0) {
        chatHistory = [
            {
                role: "assistant",
                content: "Hello, I'm Xystelsya, How can I help you?"
            }
        ];
    }
    
    // Tampilkan semua riwayat dari cookie ke layar
    chatMessages.innerHTML = "";
    for (var i = 0; i < chatHistory.length; i++) {
        var msg = chatHistory[i];
        if (msg.content !== "...") {
            addMessageVisual(msg.role, msg.content);
        }
    }
}

function addMessageVisual(role, content) {
    var messageEl = document.createElement("div");
    messageEl.className = "message " + role + "-message";
    messageEl.innerHTML = content;
    chatMessages.appendChild(messageEl);

    // Clearfix pemisah float agar layout tidak menumpuk
    var clearEl = document.createElement("div");
    clearEl.className = "clear";
    chatMessages.appendChild(clearEl);

    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageEl;
}

// --- LOGIKA PENGIRIMAN PESAN ---
function triggerSend(e) {
    if (e && e.preventDefault) {
        e.preventDefault(); // Mencegah reload halaman langsung di Android
    }
    sendMessage();
    return false; // Menghentikan submit form tradisional agar AJAX berjalan
}

function sendMessage() {
    var rawText = userInput.value;
    // Fungsi trim manual agar kompatibel dengan JavaScript versi sangat tua
    var message = rawText.replace(/^\s+|\s+$/g, '');

    if (message === "" || isProcessing) return;

    isProcessing = true;
    userInput.disabled = true;
    sendButton.disabled = true;

    // Tampilkan pesan user ke layar dan simpan ke cookie
    addMessageVisual("user", message);
    chatHistory.push({ role: "user", content: message });
    setChatCookie(chatHistory);

    userInput.value = "";
    typingIndicator.style.display = "block";
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Siapkan wadah kosong untuk balasan bot berikutnya
    var assistantMessageEl = addMessageVisual("assistant", "...");

    // Koneksi API via AJAX Klasik
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/chat", true);
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            typingIndicator.style.display = "none";
            isProcessing = false;
            userInput.disabled = false;
            sendButton.disabled = false;
            
            try { userInput.focus(); } catch (err) {}

            if (xhr.status === 200) {
                var responseText = "";
                var lines = xhr.responseText.split("\n");
                
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i].replace(/^\s+|\s+$/g, '');
                    if (line !== "") {
                        try {
                            var jsonData = JSON.parse(line);
                            if (jsonData.response) {
                                responseText += jsonData.response;
                            }
                        } catch (e) {}
                    }
                }
                
                // Masukkan teks balasan ke layar dan perbarui cookie riwayat
                assistantMessageEl.innerHTML = responseText;
                chatHistory.push({ role: "assistant", content: responseText });
                setChatCookie(chatHistory);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                
            } else {
                assistantMessageEl.innerHTML = "Gagal memproses. Silakan tekan tombol Refresh Chat.";
            }
        }
    };

    xhr.onerror = function() {
        typingIndicator.style.display = "none";
        isProcessing = false;
        userInput.disabled = false;
        sendButton.disabled = false;
        assistantMessageEl.innerHTML = "Koneksi terputus. Silakan tunggu sebentar lalu klik tombol Refresh Chat.";
    };

    var payload = JSON.stringify({ messages: chatHistory });
    xhr.send(payload);
}

// Jalankan inisialisasi obrolan saat halaman selesai dimuat
initChat();