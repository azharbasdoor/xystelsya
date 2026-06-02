/**
 * LLM Chat App (WAP Gateway & Legacy Phone Core Fix)
 */

var chatMessages = document.getElementById("chat-messages");
var userInput = document.getElementById("user-input");
var statusText = document.getElementById("status-text");

var chatHistory = [];

function tulisStatus(pesan, isError) {
    statusText.style.display = "block";
    statusText.innerHTML = pesan;
    if (isError) statusText.style.color = "#ff4444";
    else statusText.style.color = "#ffff00";
}

// --- ENGINE MEMORI PRIMITIF ---
function simpanData(arrayData) {
    try {
        var str = "";
        var batas = [];
        
        if (arrayData.length > 6) {
            batas.push(arrayData[0]); 
            for (var a = arrayData.length - 5; a < arrayData.length; a++) {
                batas.push(arrayData[a]);
            }
        } else {
            for (var b = 0; b < arrayData.length; b++) {
                batas.push(arrayData[b]);
            }
        }

        for (var i = 0; i < batas.length; i++) {
            var aman = batas[i].content.replace(/\|\|\|/g, "").replace(/:::/g, "");
            str += batas[i].role + ":::" + escape(aman);
            if (i < batas.length - 1) str += "|||";
        }
        
        if (window.localStorage) { localStorage.setItem("data_xt", str); }
        document.cookie = "data_xt=" + str + "; max-age=86400; path=/";
    } catch (e) {}
}

function muatData() {
    try {
        var str = "";
        if (window.localStorage && localStorage.getItem("data_xt")) {
            str = localStorage.getItem("data_xt");
        } else {
            var ca = document.cookie.split(';');
            for (var i = 0; i < ca.length; i++) {
                var c = ca[i];
                while (c.charAt(0) == ' ') c = c.substring(1, c.length);
                if (c.indexOf("data_xt=") == 0) str = c.substring(8);
            }
        }
        
        if (!str || str === "") return null;
        
        var hasil = [];
        var parts = str.split("|||");
        for (var j = 0; j < parts.length; j++) {
            var item = parts[j].split(":::");
            if (item.length === 2) {
                hasil.push({ role: item[0], content: unescape(item[1]) });
            }
        }
        return hasil;
    } catch (e) {
        return null;
    }
}

function eksekusiHapus() {
    try {
        if (window.localStorage) localStorage.removeItem("data_xt");
        document.cookie = "data_xt=; max-age=0; path=/";
        window.location.href = "?hapus=" + new Date().getTime();
    } catch(err) {}
    return false;
}

function tambahPesanVisual(role, content) {
    var div = document.createElement("div");
    div.className = "message " + role + "-message";
    div.innerHTML = content;
    chatMessages.appendChild(div);
}

// --- EKSTRAKTOR TEKS WAP ---
function ekstrakTeksDariStream(fullText) {
    var textHasil = "";
    var lines = fullText.split("\n");
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].replace(/^\s+|\s+$/g, '');
        if (line !== "") {
            var match = line.match(/"response"\s*:\s*"((?:[^"\\]|\\.)*)"/);
            if (match && match[1]) {
                var t = match[1];
                t = t.replace(/\\n/g, "<br>").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
                textHasil += t;
            }
        }
    }
    return textHasil;
}

// --- START OBROLAN ---
try {
    chatHistory = muatData();
    if (!chatHistory || chatHistory.length === 0) {
        chatHistory = [{ role: "assistant", content: "This is Xystelsya, 007 Agent, Ready to listen your secret." }];
        simpanData(chatHistory);
    } else {
        chatMessages.innerHTML = "";
        for (var k = 0; k < chatHistory.length; k++) {
            tambahPesanVisual(chatHistory[k].role, chatHistory[k].content);
        }
    }
    window.scrollTo(0, 99999);
} catch(err) {
    tulisStatus("Gagal memuat halaman.", true);
}

// --- PROSES KIRIM & ANTI SERVER FAILURE ---
function eksekusiKirim() {
    try {
        var raw = userInput.value;
        var msg = "";
        // Trim manual anti-crash
        for (var i = 0; i < raw.length; i++) {
            if (raw.charAt(i) !== ' ' && raw.charAt(i) !== '\n') {
                msg = raw.substring(i);
                break;
            }
        }
        if (msg === "") return false;

        // Tampilkan pesan user ke layar
        tambahPesanVisual("user", msg);
        chatHistory.push({ role: "user", content: msg });
        simpanData(chatHistory);

        userInput.value = "";
        tulisStatus("Sedang mengirim data ke server AI...");
        window.scrollTo(0, 99999);

        // Buat koneksi HTTP super aman untuk HP lawas
        var xhr;
        if (window.XMLHttpRequest) xhr = new XMLHttpRequest();
        else xhr = new ActiveXObject("Microsoft.XMLHTTP");

        xhr.open("POST", "/api/chat?r=" + new Date().getTime(), true);
        
        // Header Standar WAP & JSON
        xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        xhr.setRequestHeader("Accept", "application/json, text/plain, */*");
        
        // Amankan data teks manual tanpa regex untuk JSON payload
        var payload = '{"messages":[';
        for (var y = 0; y < chatHistory.length; y++) {
            var r = chatHistory[y].role;
            var c = chatHistory[y].content;
            var safeC = "";
            for (var idx = 0; idx < c.length; idx++) {
                var ch = c.charAt(idx);
                if (ch === '"') safeC += '\\"';
                else if (ch === '\\') safeC += '\\\\';
                else if (ch === '\n') safeC += '\\n';
                else if (ch === '\r') {}
                else safeC += ch;
            }
            payload += '{"role":"' + r + '","content":"' + safeC + '"}';
            if (y < chatHistory.length - 1) payload += ',';
        }
        payload += ']}';

        // TRIK UTAMA: Suntik panjang konten secara manual agar server/WAP gateway tidak menolak (Mencegah Server Failure)
        try { xhr.setRequestHeader("Content-Length", payload.length); } catch(e) {}

        var suksesTerbaca = false;

        xhr.onreadystatechange = function() {
            // HP Jadul membaca data di status 3 (sedang memuat) atau 4 (selesai)
            if (xhr.readyState === 3 || xhr.readyState === 4) {
                var responMentah = xhr.responseText;
                if (responMentah && responMentah.length > 0) {
                    var teksAi = ekstrakTeksDariStream(responMentah);
                    if (teksAi !== "") {
                        // Update jawaban terakhir ke memori
                        if (chatHistory[chatHistory.length - 1].role === "assistant") {
                            chatHistory[chatHistory.length - 1].content = teksAi;
                        } else {
                            chatHistory.push({ role: "assistant", content: teksAi });
                        }
                        simpanData(chatHistory);
                        tulisStatus("[BERHASIL] Balasan masuk! Silakan klik tombol '2. Cek Balasan / Refresh Chat' di bawah.", false);
                        suksesTerbaca = true;
                    }
                }
            }
            
            if (xhr.readyState === 4 && !suksesTerbaca) {
                // Jika server tetap membalas dengan status aneh (misal gateway operator mengubah kode HTTP menjadi 0)
                if (xhr.status === 200 || xhr.status === 201 || xhr.status === 0) {
                    tulisStatus("Pesan terkirim. Harap klik tombol '2. Cek Balasan / Refresh Chat' untuk melihat hasil.", false);
                } else {
                    tulisStatus("[GAGAL] Server Failure (Kode Error: " + xhr.status + "). Coba klik Refresh Chat lalu ketik ulang.", true);
                }
            }
        };

        xhr.onerror = function() {
            tulisStatus("Gangguan sinyal/WAP Gateway. Klik Refresh Chat lalu coba lagi.", true);
        };

        xhr.send(payload);

    } catch (err) {
        tulisStatus("Error internal HP: " + err.message, true);
    }
    
    return false;
}