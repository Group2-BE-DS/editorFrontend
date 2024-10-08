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
document.addEventListener('DOMContentLoaded', function () {
    // Initialize CodeMirror
    const editorElement = document.getElementById('editor');
    const languageSelect = document.getElementById('languageSelect');

    // Create a CodeMirror instance
    const editor = CodeMirror.fromTextArea(editorElement, {
        lineNumbers: true,
        mode: languageSelect.value, // Set the initial mode
        theme: 'dracula',
        autoCloseBrackets: true,
        matchBrackets: true,
        lineWrapping: true,
    });

    // Hide the original textarea
    editorElement.style.display = 'none';

    // Update the CodeMirror mode when the language is changed
    languageSelect.addEventListener('change', function () {
        const selectedMode = this.value;
        editor.setOption('mode', selectedMode);
    });
});
