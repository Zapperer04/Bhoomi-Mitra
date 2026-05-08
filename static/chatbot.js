document.addEventListener("DOMContentLoaded", () => {
  const chatBox = document.getElementById("chatBox");
  const userInput = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");
  const SESSION_KEY = "bm_chat_session_id";

  const state = {
    lang: "en",
    expectingText: false
  };

  function scrollBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function getSessionId() {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
        ? crypto.randomUUID()
        : `bm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  }

  function addBot(text) {
    const div = document.createElement("div");
    div.className = "botMsg";

    // Convert URLs to clickable links
    const linkedText = text.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" style="color:#4caf50;">$1</a>'
    );

    div.innerHTML = linkedText;
    chatBox.appendChild(div);
    scrollBottom();
  }

  function addUser(text) {
    const div = document.createElement("div");
    div.className = "userMsg";
    div.innerText = text;
    chatBox.appendChild(div);
    scrollBottom();
  }

  function clearOptions() {
    const existing = document.querySelector(".options");
    if (existing) existing.remove();
  }

  function enableInput(enable = true) {
    userInput.disabled = !enable;
    sendBtn.disabled = !enable;
    state.expectingText = enable;
    if (enable) userInput.focus();
  }

  function renderOptions(options) {
    clearOptions();

    const div = document.createElement("div");
    div.className = "options";

    options.forEach(opt => {
      const btn = document.createElement("button");
      btn.innerText = opt.label;
      btn.onclick = () => {
        if (opt.internal) {
          opt.internal();
        } else {
          sendAction(opt.action, opt.value, opt.label);
        }
      };
      div.appendChild(btn);
    });

    chatBox.appendChild(div);
    scrollBottom();
  }

  async function sendAction(action, value = null, label = null, text = null) {
    if (label) addUser(label);
    clearOptions();

    try {
      const res = await fetch("/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": getSessionId(),
        },
        body: JSON.stringify({
          action: action,
          value: value,
          text: text,
          lang: state.lang
        })
      });

      const data = await res.json();

      if (data.message) addBot(data.message);

      if (data.input === "text") {
        enableInput(true);
      } else {
        enableInput(false);
      }

      if (data.options) {
        renderOptions(data.options);
      }

    } catch (error) {
      console.error("Fetch error:", error);
      addBot("⚠️ Connection error. Please try again.");
    }
  }

  function handleSend() {
    const text = userInput.value.trim();
    if (!text || !state.expectingText) return;

    userInput.value = "";
    enableInput(false);

    addUser(text);
    sendAction(null, null, null, text);
  }

  sendBtn.onclick = handleSend;

  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSend();
  });

  function showLanguageSelection() {
    chatBox.innerHTML = "";
    addBot("Please select your preferred language / अपनी भाषा चुनें");

    const langs = [
      { label: "English", val: "en" },
      { label: "हिंदी", val: "hi" },
      { label: "বাংলা", val: "bn" },
      { label: "தமிழ்", val: "ta" },
      { label: "తెలుగు", val: "te" },
      { label: "मराठी", val: "mr" },
      { label: "ગુજરાતી", val: "gu" },
      { label: "اردو", val: "ur" },
      { label: "ಕನ್ನಡ", val: "kn" },
      { label: "ଓଡ଼ିଆ", val: "or" },
      { label: "ਪੰਜਾਬੀ", val: "pa" },
      { label: "മലയാളം", val: "ml" }
    ];

    renderOptions(langs.map(l => ({
      label: l.label,
      internal: () => setLang(l.val)
    })));
  }

  function setLang(lang) {
    state.lang = lang;
    sendAction(null);
  }

  // ── VOICE INPUT ───────────────────────────────────────────
  const voiceBtn = document.getElementById("voiceBtn");
  let recognition = null;

  if (window.SpeechRecognition || window.webkitSpeechRecognition) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = false;

    // Map internal lang codes to BCP-47 speech locales
    const langMap = {
      en: "en-IN", hi: "hi-IN", bn: "bn-IN", ta: "ta-IN",
      te: "te-IN", mr: "mr-IN", gu: "gu-IN", ur: "ur-PK",
      kn: "kn-IN", or: "or-IN", pa: "pa-IN", ml: "ml-IN"
    };

    recognition.onstart = () => {
      voiceBtn.classList.add("listening");
      userInput.placeholder = "Listening...";
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      userInput.value = transcript;
      handleSend();
    };

    recognition.onerror = (event) => {
      console.error("Speech error", event.error);
      stopListening();
    };

    recognition.onend = () => {
      stopListening();
    };

    function stopListening() {
      voiceBtn.classList.remove("listening");
      userInput.placeholder = "Type here...";
    }

    voiceBtn.onclick = () => {
      if (voiceBtn.classList.contains("listening")) {
        recognition.stop();
      } else {
        recognition.lang = langMap[state.lang] || "en-IN";
        recognition.start();
      }
    };
  } else {
    voiceBtn.style.display = "none";
  }

  showLanguageSelection();
});
