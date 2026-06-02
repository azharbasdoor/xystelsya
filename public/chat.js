/**
 * LLM Chat App (Sistem Anti-Crash & Ringan untuk WAP Phone)
 */

var chatMessages = document.getElementById("chat-messages");
var userInput = document.getElementById("user-input");
var statusText = document.getElementById("status-text");

var chatHistory = [];

// Fungsi Debugger Teks di Layar HP
function tulisStatus(pesan, isError) {
    statusText.style.display = "block";
    statusText.innerHTML = pesan;
    if (isError) statusText.style.color = "#ff4444";
    else statusText.style.color = "#ffff00";
}

// --- PENYIMPANAN DATA ANTI-CRASH ---
function simpanData(arrayData) {
    try {
        var str = "";
        var batas = [];
        
        // Buat Array baru manual (maksimal 6 pesan agar memori WAP tidak penuh)
        if (arrayData.length > 6) {
            batas.push(arrayData[0]); // Simpan pesan pembuka
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
        
        // Simpan ke LocalStorage dan Cookie
        if (window.localStorage) { localStorage.setItem("data_xt", str); }
        document.cookie = "data_xt=" + str + "; max-age=86400; path=/";
    } catch (e) {
        tulisStatus("Gagal menyimpan memori.", true);
    }
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
        
        if (str === "") return null;
        
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

// --- FUNGSI HAPUS OBROLAN ---
function eksekusiHapus(e) {
    if (e && e.preventDefault) e.preventDefault();
    try {
        if (window.localStorage) localStorage.removeItem("data_xt");
        document.cookie = "data_xt=; max-age=0; path=/";
        window.location.href = "?hapus=1";
    } catch(err) {}
    return false;
}

// --- FUNGSI TAMPILAN ---
function tambahPesanVisual(role, content) {
    var div = document.createElement("div");
    div.className = "message " + role + "-message";
    div.innerHTML = content;
    chatMessages.appendChild(div);
}

// --- INISIALISASI ---
try {
    chatHistory = muatData();
    // Jika tidak ada data tersimpan, buat data standar
    if (!chatHistory || chatHistory.length === 0) {
        chatHistory = [{ role: "assistant", content: "This is Xystelsya, 007 Agent, Ready to listen your secret." }];
        simpanData(chatHistory);
    } else {
        // Hapus elemen pesan bawaan HTML lalu render ulang riwayat
        chatMessages.innerHTML = "";
        for (var k = 0; k < chatHistory.length; k++) {
            tambahPesanVisual(chatHistory[k].role, chatHistory[k].content);
        }
    }
    window.scrollTo(0, 99999);
} catch(err) {
    tulisStatus("Error saat memuat: " + err.message, true);
}

// --- FUNGSI KIRIM API ---
function ekstrakTeks(txt) {
    var match = txt.match(/"response"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (match && match[1]) {
        return match[1].replace(/\\n/g, "<br>").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
    return "";
}

function eksekusiKirim(e) {
    if (e && e.preventDefault) e.preventDefault();
    
    try {
        var raw = userInput.value;
        var msg = "";
        for (var i = 0; i < raw.length; i++) {
            if (raw.charAt(i) !== ' ' && raw.charAt(i) !== '\n') {
                msg = raw.substring(i);
                break;
            }
        }
        if (msg === "") return false;

        // 1. Tampilkan di layar & simpan
        tambahPesanVisual("user", msg);
        chatHistory.push({ role: "user", content: msg });
        simpanData(chatHistory);

        userInput.value = "";
        tulisStatus("Sedang mengirim... Pastikan koneksi internet stabil.");
        window.scrollTo(0, 99999);

        // 2. Buat koneksi (kompatibel dgn browser super jadul)
        var xhr;
        if (window.XMLHttpRequest) xhr = new XMLHttpRequest();
        else xhr = new ActiveXObject("Microsoft.XMLHTTP");

        xhr.open("POST", "/api/chat?t=" + new Date().getTime(), true);
        xhr.setRequestHeader("Content-Type", "application/json");

        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200 || xhr.status === 201) {
                    var resText = "";
                    var lines = xhr.responseText.split("\n");
                    for (var x = 0; x < lines.length; x++) {
                        resText += ekstrakTeks(lines[x]);
                    }
                    
                    if (resText !== "") {
                        chatHistory.push({ role: "assistant", content: resText });
                        simpanData(chatHistory);
                        tulisStatus("[SUKSES] Silakan pencet tombol 'Refresh Chat' di bawah!", false);
                    } else {
                        tulisStatus("[ERROR] Teks balasan dari server kosong.", true);
                    }
                } else {
                    tulisStatus("[GAGAL] Server menolak (" + xhr.status + ")", true);
                }
            }
        };

        xhr.onerror = function() {
            tulisStatus("[ERROR] Internet terputus atau sinyal hilang.", true);
        };

        // 3. Rangkai data JSON manual anti-crash
        var payload = '{"messages":[';
        for (var y = 0; y < chatHistory.length; y++) {
            var s = chatHistory[y].content.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '');
            payload += '{"role":"' + chatHistory[y].role + '","content":"' + s + '"}';
            if (y < chatHistory.length - 1) payload += ',';
        }
        payload += ']}';

        xhr.send(payload);

    } catch (err) {
        tulisStatus("Error pengiriman: " + err.message, true);
    }
    
    return false;
}