function googleTranslateElementInit() {
  new google.translate.TranslateElement({
    pageLanguage: 'en',
    includedLanguages: 'hi,bn,te,mr,ta,gu,ur,kn,or,pa,ml,en', 
    layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
    autoDisplay: false
  }, 'google_translate_element');
}

// Style the Google Translate Widget to match Bhoomi Mitra's dark mode vibe
var css = `
    .skiptranslate iframe {
        display: none !important;
    }
    body {
        top: 0px !important;
    }
    #google_translate_element select {
        background-color: #1e293b;
        color: #ffffff;
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 5px 10px;
        font-family: 'DM Sans', sans-serif;
        font-size: 14px;
        outline: none;
        cursor: pointer;
    }
    #google_translate_element select:hover {
        border-color: #10b981;
    }
    /* Hide the google branding */
    .goog-te-gadget {
        color: transparent !important;
        font-size: 0px;
    }
    .goog-te-gadget .goog-te-combo {
        margin: 0;
    }
    .goog-logo-link {
        display: none !important;
    }
    .goog-te-gadget .goog-te-combo {
        color: #fff !important;
    }
`;
var style = document.createElement('style');
style.appendChild(document.createTextNode(css));
document.head.appendChild(style);

(function() {
  var gtScript = document.createElement('script');
  gtScript.type = 'text/javascript';
  gtScript.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  document.body.appendChild(gtScript);
})();
