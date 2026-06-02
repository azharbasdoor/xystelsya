/**
 * LLM Chat App (WAP / Keypad Phone Super Fallback Edition)
 */

var chatMessages = document.getElementById("chat-messages");
var userInput = document.getElementById("user-input");
var sendButton = document.getElementById("send-button");
var statusText = document.getElementById("status-text");

var chatHistory = [];

// --- MANAJEMEN COOKIE PRIMITIF ---
function setChatCookie(historyArray) {
    try {
        var limited = historyArray;
        // Batas maksimal memori agar browser lawas tidak kehabisan RAM
        if (historyArray.length > 8) {
            limited = [historyArray[0]];
            var last = historyArray.slice(historyArray.length - 7);
            for(var x=0; x<last.length; x++) limited.push(last[x]);
        }
        
        var str = "";
        for (var i = 0; i < limited.length; i++) {
            var safeContent = limited[i].content.replace(/\|\|\|/g, "").replace(/:::/g, "");
            str += limited[i].role + ":::" + escape(safeContent);
            if (i < limited.length - 1) str += "|||";
        }
        
        document.cookie = "xtc_data=" + str + "; max-age=86400; path=/";
    } catch (e) {}
}

function getChatCookie() {
    try {
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i].replace(/^\s+|\s+$/g, '');
            if (c.indexOf("xtc_data=") == 0) {
                var str = c.substring(9);
                if (str === "") return null;
                
                var arr = [];
                var parts = str.split("|||");
                for (var j = 0; j < parts.length; j++) {
                    var p = parts[j].split(":::");
                    if (p.length === 2) {
                        arr.push({ role: p[0], content: unescape(p[1]) });
                    }
                }
                return arr;
            }
        }
    } catch (e) {}
    return null;
}

// --- FUNGSI HAPUS OBROLAN ---
function clearChatAction() {
    document.cookie = "xtc_data=; max-age=0; path=/";
    window.location.href = "?cleared=1"; // Perintah Native agar browser langsung reload
    return false;
}

// --- INISIALISASI HALAMAN ---
function initChat() {
    chatHistory = getChatCookie();
    
    if (!chatHistory || chatHistory.length === 0) {
        chatHistory = [{ role: "assistant", content: "This is Xystelsya, 007 Agent, Ready to listen your secret" }];
        setChatCookie(chatHistory);
    }
    
    chatMessages.innerHTML = "";
    for (var i = 0; i < chatHistory.length; i++) {
        addMessageVisual(chatHistory[i].role, chatHistory[i].content);
    }
    
    // Secara otomatis arahkan layar ke bagian input paling bawah saat halaman dibuka
    try {
        window.scrollTo(0, document.body.scrollHeight);
    } catch(e) {}
}

function addMessageVisual(role, content) {
    var div = document.createElement("div");
    div.className = "message " + role + "-message";
    div.innerHTML = content;
    chatMessages.appendChild(div);
}

// Alat Ekstrak Manual untuk API Chat
function extractFallback(txt) {
    if (window.JSON && JSON.parse) {
        try { var d = JSON.parse(txt); return d.response || ""; } catch(e) {}
    }
    var match = txt.match(/"response"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (match && match[1]) {
        return match[1].replace(/\\n/g, "<br>").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
    return "";
}

// --- LOGIKA PENGIRIMAN DATA ---
function submitChat() {
    var rawText = userInput.value;
    var message = rawText.replace(/^\s+|\s+$/g, '');

    if (message === "") return false;

    // 1. Catat pesan ke layar
    addMessageVisual("user", message);
    chatHistory.push({ role: "user", content: message });
    setChatCookie(chatHistory);

    // 2. Tampilkan teks status ke layar bahwa AI sedang berpikir
    userInput.value = "";
    statusText.style.display = "block";
    statusText.innerHTML = "Sistem sedang memproses. Jika tulisan ini berubah, silakan klik tombol [Refresh Chat] di bawah.";
    
    // Gulir layar ke bagian bawah
    try { window.scrollTo(0, document.body.scrollHeight); } catch(e) {}

    // 3. Eksekusi Jaringan Latar Belakang
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/chat", true);
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                var resText = "";
                var lines = xhr.responseText.split("\n");
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i].replace(/^\s+|\s+$/g, '');
                    if (line !== "") {
                        resText += extractFallback(line);
                    }
                }
                
                if (resText !== "") {
                    // Ketika jawaban didapat, simpan di memori, dan suruh user refresh!
                    chatHistory.push({ role: "assistant", content: resText });
                    setChatCookie(chatHistory);
                    statusText.innerHTML = "[Balasan Diterima!] Silakan klik tombol 'Cek Balasan / Refresh Chat' di bawah untuk membaca.";
                } else {
                    statusText.innerHTML = "Respon kosong dari AI. Silakan klik Refresh Chat untuk memastikan.";
                }
            } else {
                statusText.innerHTML = "Gagal memproses (" + xhr.status + "). Coba lagi nanti.";
            }
        }
    };

    xhr.onerror = function() {
        statusText.innerHTML = "Koneksi terputus. Silakan klik tombol Refresh Chat lalu coba kirim ulang.";
    };

    // Rangkai Data Pengiriman
    var payload = '{"messages":[';
    for(var k = 0; k < chatHistory.length; k++) {
        var safeForJson = chatHistory[k].content.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '');
        payload += '{"role":"' + chatHistory[k].role + '","content":"' + safeForJson + '"}';
        if(k < chatHistory.length - 1) payload += ',';
    }
    payload += ']}';

    xhr.send(payload);

    // Mencegah halaman langsung reload saat menekan kirim (sangat penting agar background network tetap jalan)
    return false;
}

// Mulai aplikasi
initChat();