const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 8080;

// GANTI URL INI DENGAN ALAMAT API AI ANDA YANG SUDAH ONLINE
const API_CHAT_URL = process.env.API_CHAT_URL || "https://URL-API-AI-ANDA.com/api/chat";

app.use(express.urlencoded({ extended: true }));

const initialHistory = [
  {
    role: "assistant",
    content: "This is Xystelsya, 007 Agent, Ready to listen your secret",
  }
];

function renderHalaman(history) {
  let template = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
  
  let chatHtml = "";
  for (let msg of history) {
    let kelas = msg.role === "user" ? "user-message" : "assistant-message";
    chatHtml += `<div class="message ${kelas}"><p>${msg.content}</p></div>`;
  }
  
  let jsonString = JSON.stringify(history).replace(/'/g, "&#39;");
  
  template = template.replace('{{CHAT_HISTORY_HTML}}', chatHtml);
  template = template.replace('{{CHAT_HISTORY_JSON}}', jsonString);
  return template;
}

app.get('/', (req, res) => {
  res.send(renderHalaman(initialHistory));
});

app.post('/kirim', async (req, res) => {
  let pesanUser = req.body.pesan_user;
  let historyRaw = req.body.chat_history;
  
  let history = initialHistory;
  try {
    if (historyRaw) history = JSON.parse(historyRaw);
  } catch (e) {
    history = initialHistory;
  }

  if (pesanUser && pesanUser.trim() !== "") {
    history.push({ role: "user", content: pesanUser.trim() });

    try {
      const response = await fetch(API_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history })
      });

      if (!response.ok) throw new Error("Gagal mengambil respon");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let responseText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (line.trim() !== "") {
            try {
              const jsonData = JSON.parse(line);
              if (jsonData.response) responseText += jsonData.response;
            } catch (e) {}
          }
        }
      }

      if (responseText === "") responseText = "Sorry, empty response.";
      history.push({ role: "assistant", content: responseText });

    } catch (error) {
      console.error(error);
      history.push({ role: "assistant", content: "Error connecting to AI API." });
    }
  }

  res.send(renderHalaman(history));
});

app.post('/reset', (req, res) => {
  res.send(renderHalaman(initialHistory));
});

app.listen(PORT, () => {
  console.log(`Server jalan di port: ${PORT}`);
});