/**
 * LLM Chat App (Super Kompatibel untuk Android & HP Keypad WAP Browser)
 */

var chatMessages = document.getElementById("chat-messages");
var userInput = document.getElementById("user-input");
var sendButton = document.getElementById("send-button");
var typingIndicator = document.getElementById("typing-indicator");

var isProcessing = false;
var chatHistory = [];

// --- UTILITY COOKIE PRIMITIF (Mencegah error JSON di browser WAP lama) ---
function setChatCookie(historyArray) {
    try {
        var limitedHistory = historyArray;
        // Batasi memori untuk hp jadul (maks 6 obrolan terakhir)
        if (historyArray.length > 6) {
            limitedHistory = [historyArray[0]];
            var lastMsgs = historyArray.slice(historyArray.length - 5);
            for(var x=0; x<lastMsgs.length; x++) { limitedHistory.push(lastMsgs[x]); }
        }
        
        // Buat string manual: role:::pesan|||role:::pesan (Menghindari error JSON.stringify)
        var str = "";
        for (var i = 0; i < limitedHistory.length; i++) {
            var safeContent = limitedHistory[i].content.replace(/\|\|\|/g, "").replace(/:::/g, "");
            str += limitedHistory[i].role + ":::" + escape(safeContent);
            if (i < limitedHistory.length - 1) str += "|||";
        }
        
        var date = new Date();
        date.setTime(date.getTime() + (24 * 60 * 60 * 1000)); 
        document.cookie = "xt_chat=" + str + "; expires=" + date.toUTCString() + "; path=/";
    } catch (e) {}
}

function getChatCookie() {
    try {
        var nameEQ = "xt_chat=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) {
                var str = c.substring(nameEQ.length, c.length);
                if (str === "") return null;
                
                // Pecah string manual (Menghindari error JSON.parse)
                var history = [];
                var parts = str.split("|||");
                for (var j = 0; j < parts.length; j++) {
                    var p = parts[j].split(":::");
                    if (p.length === 2) {
                        history.push({ role: p[0], content: unescape(p[1]) });
                    }
                }
                return history;
            }
        }
    } catch (e) {}
    return null;
}

// --- FUNGSI HAPUS OBROLAN ---
function clearChat() {
    // Matikan cookie dan ulangi halaman
    document.cookie = "xt_chat=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.reload();
}

// --- INITIAL LOAD ---
function initChat() {
    chatHistory = getChatCookie();
    
    if (!chatHistory || chatHistory.length === 0) {
        chatHistory = [
            {
                role: "assistant",
                content: "This is Xystelsya, 007 Agent, Ready to listen your secret."
            }
        ];
    }
    
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

    var clearEl = document.createElement("div");
    clearEl.className = "clear";
    chatMessages.appendChild(clearEl);

    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageEl;
}

// Ekstraktor Balasan Primitif (Fallback jika browser HP tidak mengenali object JSON API)
function extractResponseText(lineText) {
    if (window.JSON && window.JSON.parse) {
        try { 
            var d = JSON.parse(lineText); 
            return d.response ? d.response : ""; 
        } catch(e) {}
    } 
    // Fallback khusus untuk Sony Ericsson & Maui Browser
    var match = lineText.match(/"response"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (match && match[1]) {
        var text = match[1];
        return text.replace(/\\n/g, "<br>").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
    return "";
}

// --- LOGIKA PENGIRIMAN PESAN ---
function submitForm() {
    sendMessage();
    return false; // Cegah browser reload otomatis
}

function sendMessage() {
    var rawText = userInput.value;
    var message = rawText.replace(/^\s+|\s+$/g, '');

    if (message === "" || isProcessing) return;

    isProcessing = true;
    userInput.disabled = true;
    sendButton.disabled = true;

    addMessageVisual("user", message);
    chatHistory.push({ role: "user", content: message });
    setChatCookie(chatHistory);

    userInput.value = "";
    typingIndicator.style.display = "block";
    chatMessages.scrollTop = chatMessages.scrollHeight;

    var assistantMessageEl = addMessageVisual("assistant", "...");

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
                        responseText += extractResponseText(line);
                    }
                }
                
                if(responseText === "") {
                    responseText = "Data diterima, namun tidak bisa dibaca oleh browser. Silakan klik Refresh Chat.";
                }

                assistantMessageEl.innerHTML = responseText;
                chatHistory.push({ role: "assistant", content: responseText });
                setChatCookie(chatHistory);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                
            } else {
                assistantMessageEl.innerHTML = "Gagal memproses (" + xhr.status + "). Silakan klik Refresh Chat.";
            }
        }
    };

    xhr.onerror = function() {
        typingIndicator.style.display = "none";
        isProcessing = false;
        userInput.disabled = false;
        sendButton.disabled = false;
        assistantMessageEl.innerHTML = "Koneksi terputus. Silakan klik Refresh Chat.";
    };

    // Merakit JSON manual untuk payload API tanpa menggunakan JSON.stringify
    var payload = '{"messages":[';
    for(var k = 0; k < chatHistory.length; k++) {
        var safeForJson = chatHistory[k].content.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '');
        payload += '{"role":"' + chatHistory[k].role + '","content":"' + safeForJson + '"}';
        if(k < chatHistory.length - 1) payload += ',';
    }
    payload += ']}';

    xhr.send(payload);
}

// Inisialisasi saat script dimuat
initChat();