const CodeMirror = require('codemirror');
require('codemirror/mode/javascript/javascript'); // JavaScript mode
require('codemirror/mode/python/python'); // Python mode
require('codemirror/mode/clike/clike'); // Java, C#, etc.
require('codemirror/mode/xml/xml'); // HTML mode
require('codemirror/mode/css/css'); // CSS mode
require('codemirror/mode/php/php'); // PHP mode
require('codemirror/mode/ruby/ruby'); // Ruby mode
require('codemirror/mode/go/go'); // Go mode

require('codemirror/lib/codemirror.css');
require('codemirror/theme/dracula.css'); // Optional: You can change the theme

// Initialize the CodeMirror editor
let editor;
window.onload = () => {
    editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
        mode: 'javascript', // Default mode
        theme: 'dracula', // Default theme
        lineNumbers: true,
        tabSize: 2,
        viewportMargin: Infinity // Keeps the height of the editor fixed
    });

    // Language Selector Event
    const languageSelect = document.getElementById('languageSelect');
    languageSelect.addEventListener('change', (event) => {
        const selectedLanguage = event.target.value;
        editor.setOption('mode', selectedLanguage); // Update the editor mode based on selection
    });
};
