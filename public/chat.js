/**
 * LLM Chat App Frontend (Versi Kompatibel Ponsel Jadul)
 */

// DOM elements
var chatMessages = document.getElementById("chat-messages");
var userInput = document.getElementById("user-input");
var sendButton = document.getElementById("send-button");
var typingIndicator = document.getElementById("typing-indicator");

// Chat state
var chatHistory = [
  {
    role: "assistant",
    content: "Hello, I'm Xystelsya, How can I help you?"
  }
];
var isProcessing = false;

// Event Click untuk tombol Send
sendButton.onclick = function() {
    sendMessage();
};

// Event Enter pada Keypad (opsional, karena pengguna keypad biasanya menekan tombol 'Send')
userInput.onkeydown = function(e) {
    var key = e.keyCode || e.which;
    if (key === 13) {
        if(e.preventDefault) e.preventDefault();
        sendMessage();
        return false;
    }
};

/**
 * Menghapus spasi berlebih (pengganti .trim() untuk browser sangat lawas)
 */
function trimString(str) {
    return str.replace(/^\s+|\s+$/g, '');
}

/**
 * Helper function untuk menambah pesan ke layar
 */
function addMessageToChat(role, content) {
    var messageEl = document.createElement("div");
    messageEl.className = "message " + role + "-message";
    messageEl.innerHTML = content;
    
    chatMessages.appendChild(messageEl);

    // Clearfix agar layout float tidak berantakan
    var clearEl = document.createElement("div");
    clearEl.className = "clear";
    chatMessages.appendChild(clearEl);

    // Scroll otomatis ke bawah
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageEl; // Mengembalikan elemen jika perlu diperbarui nanti
}

/**
 * Mengirim pesan dengan AJAX Klasik (XMLHttpRequest)
 */
function sendMessage() {
    var message = trimString(userInput.value);

    // Jangan kirim jika kosong atau sedang proses
    if (message === "" || isProcessing) return;

    isProcessing = true;
    userInput.disabled = true;
    sendButton.disabled = true;

    // Tampilkan pesan pengguna
    addMessageToChat("user", message);

    // Bersihkan input dan tampilkan indikator loading
    userInput.value = "";
    typingIndicator.style.display = "block";

    chatHistory.push({ role: "user", content: message });

    // Siapkan kotak untuk balasan bot
    var assistantMessageEl = addMessageToChat("assistant", "...");

    // Kirim request ke API menggunakan metode AJAX klasik
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/chat", true);
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onreadystatechange = function() {
        // Angka 4 berarti proses request telah selesai
        if (xhr.readyState === 4) {
            typingIndicator.style.display = "none";
            isProcessing = false;
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.focus();

            if (xhr.status === 200) {
                // Memproses balasan. Jika API Anda mengirim format SSE per baris, 
                // kita kumpulkan dan gabungkan semuanya sekaligus saat proses selesai.
                var responseText = "";
                var lines = xhr.responseText.split("\n");
                
                for (var i = 0; i < lines.length; i++) {
                    var line = trimString(lines[i]);
                    if (line !== "") {
                        try {
                            var jsonData = JSON.parse(line);
                            if (jsonData.response) {
                                responseText += jsonData.response;
                            }
                        } catch (e) {
                            // Abaikan error parsing baris kosong
                        }
                    }
                }
                
                assistantMessageEl.innerHTML = responseText;
                chatHistory.push({ role: "assistant", content: responseText });
                chatMessages.scrollTop = chatMessages.scrollHeight;
                
            } else {
                assistantMessageEl.innerHTML = "Error processing request.";
            }
        }
    };

    // Penanganan jika internet terputus
    xhr.onerror = function() {
        typingIndicator.style.display = "none";
        isProcessing = false;
        userInput.disabled = false;
        sendButton.disabled = false;
        assistantMessageEl.innerHTML = "Connection error. Please try again.";
    };

    // Eksekusi kirim data
    var payload = JSON.stringify({ messages: chatHistory });
    xhr.send(payload);
}
      // Process SSE format
      const lines = chunk.split("\n");
      for (const line of lines) {
        try {
          const jsonData = JSON.parse(line);
          if (jsonData.response) {
            // Append new content to existing text
            responseText += jsonData.response;
            assistantMessageEl.querySelector("p").textContent = responseText;

            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }
        } catch (e) {
          console.error("Error parsing JSON:", e);
        }
      }
    }

    // Add completed response to chat history
    chatHistory.push({ role: "assistant", content: responseText });
  } catch (error) {
    console.error("Error:", error);
    addMessageToChat(
      "assistant",
      "Sorry, there was an error processing your request.",
    );
  } finally {
    // Hide typing indicator
    typingIndicator.classList.remove("visible");

    // Re-enable input
    isProcessing = false;
    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.focus();
  }
}

/**
 * Helper function to add message to chat
 */
function addMessageToChat(role, content) {
  const messageEl = document.createElement("div");
  messageEl.className = `message ${role}-message`;
  messageEl.innerHTML = `<p>${content}</p>`;
  chatMessages.appendChild(messageEl);

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
