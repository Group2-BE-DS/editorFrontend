const CodeMirror = require('codemirror');
require('codemirror/mode/javascript/javascript');
require('codemirror/mode/python/python');
require('codemirror/mode/clike/clike');
require('codemirror/mode/xml/xml');
require('codemirror/mode/css/css');
require('codemirror/mode/php/php');
require('codemirror/mode/ruby/ruby');
require('codemirror/mode/go/go');

require('codemirror/lib/codemirror.css');
require('codemirror/theme/dracula.css');

let editor;
let socket;
let retryCount = 0;  // For reconnection attempts

// Initialize WebSocket with reconnection logic
function initializeWebSocket() {
    function connect() {
        socket = new WebSocket('ws://127.0.0.1:8000/ws/editor/');

        socket.onopen = function () {
            console.log("WebSocket connection established");
            retryCount = 0;
        };

        socket.onmessage = function (event) {
            const data = JSON.parse(event.data);
            handleIncomingChange(data);
        };

        socket.onclose = function () {
            console.log("WebSocket closed. Attempting to reconnect...");
            retryCount++;
            setTimeout(connect, Math.min(1000 * retryCount, 30000));  // Exponential backoff
        };

        socket.onerror = function (error) {
            console.log(`WebSocket error: ${error}`);
        };
    }

    connect();
}

// Handle incoming changes and update the editor accordingly
function handleIncomingChange(data) {
    if (data.type === 'change' && editor) {
        editor.operation(() => {
            editor.replaceRange(data.change.text, data.change.from, data.change.to, 'remote');
            if (data.cursor) {
                editor.setCursor(data.cursor);  // Set cursor position for other collaborators
            }
        });
    }
}

// Send local changes to the WebSocket, including cursor position
function sendChange(change) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'change',
            change: change,
            cursor: editor.getCursor()  // Include the cursor position in the data
        }));
    }
}

// Throttle change sending to reduce WebSocket message frequency
const throttledSendChange = _.throttle(sendChange, 200);  // 200ms delay

document.addEventListener('DOMContentLoaded', function () {
    const editorElement = document.getElementById('editor');
    const languageSelect = document.getElementById('languageSelect');

    // Initialize CodeMirror editor
    editor = CodeMirror.fromTextArea(editorElement, {
        lineNumbers: true,
        mode: languageSelect.value,
        theme: 'dracula',
        autoCloseBrackets: true,
        matchBrackets: true,
        lineWrapping: true,
    });

    editorElement.style.display = 'none';  // Hide original textarea

    // Update the editor's mode when the language changes
    languageSelect.addEventListener('change', function () {
        const selectedMode = this.value;
        editor.setOption('mode', selectedMode);
    });

    // Handle local changes and send them over the WebSocket
    editor.on('change', function (instance, changeObj) {
        if (changeObj.origin !== 'remote') {
            const change = {
                from: changeObj.from,
                to: changeObj.to,
                text: changeObj.text,
                removed: changeObj.removed
            };
            throttledSendChange(change);  // Send changes with throttling
        }
    });

    // Initialize the WebSocket connection
    initializeWebSocket();

    // Add event listener for the Generate README button
    document.getElementById('generate-readme').addEventListener('click', function() {
        // Open the README generator URL in a new window
        window.open('https://readme-ai.streamlit.app/', '_blank');
    });
});
