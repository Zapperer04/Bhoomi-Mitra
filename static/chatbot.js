document.addEventListener("DOMContentLoaded", () => {
  const chatBox = document.getElementById("chatBox");
  const userInput = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");

  const state = {
    lang: "en",
    expectingText: false
  };

  function scrollBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
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
        headers: { "Content-Type": "application/json" },
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
      { label: "తెలుగు", val: "te" }
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

  showLanguageSelection();
});
