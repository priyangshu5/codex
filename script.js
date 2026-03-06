// Telegram Web App initialization
const tg = window.Telegram.WebApp;
tg.expand(); // Expand to full height
tg.ready();  // Notify Telegram that the app is ready

// Display user info if available
const user = tg.initDataUnsafe?.user;
if (user) {
    document.getElementById('user-info').innerText = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';
} else {
    document.getElementById('user-info').innerText = 'Anonymous';
}

// ==================== STATE ====================
let apiKey = localStorage.getItem('openrouter_key') || '';
let selectedModel = localStorage.getItem('openrouter_model') || 'anthropic/claude-3.5-sonnet';

// Predefined snippets (static)
const snippets = {
    python: [
        { title: 'Flask Hello World', code: 'from flask import Flask\napp = Flask(__name__)\n\n@app.route("/")\ndef hello():\n    return "Hello, World!"\n\nif __name__ == "__main__":\n    app.run()' },
        { title: 'Read File', code: 'with open("file.txt", "r") as f:\n    content = f.read()\n    print(content)' }
    ],
    lua: [
        { title: 'Print Table', code: 'local t = {name="John", age=30}\nfor k,v in pairs(t) do\n    print(k, v)\nend' }
    ],
    cpp: [
        { title: 'Hello World', code: '#include <iostream>\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}' }
    ],
    android: [
        { title: 'Toast Message', code: 'Toast.makeText(getApplicationContext(), "Hello", Toast.LENGTH_SHORT).show();' }
    ],
    termux: [
        { title: 'Update Packages', code: 'pkg update && pkg upgrade -y' },
        { title: 'List Files', code: 'ls -la' }
    ]
};

// ==================== UI NAVIGATION ====================
const tabs = document.querySelectorAll('.tab-btn');
const sections = document.querySelectorAll('.section');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const target = tab.dataset.section;
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        // Show corresponding section
        sections.forEach(s => s.classList.remove('active'));
        document.getElementById(target).classList.add('active');
    });
});

// ==================== API CALL FUNCTION ====================
async function callOpenRouter(systemPrompt, userPrompt) {
    if (!apiKey) {
        throw new Error('OpenRouter API key not set. Go to Settings and save your key.');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': window.location.origin, // Optional, for rankings
            'X-Title': 'Priyangshu Codex'
        },
        body: JSON.stringify({
            model: selectedModel,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 706
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API request failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// ==================== SETTINGS ====================
document.getElementById('save-settings').addEventListener('click', () => {
    const newKey = document.getElementById('api-key').value.trim();
    const newModel = document.getElementById('model-select').value;
    if (newKey) {
        apiKey = newKey;
        localStorage.setItem('openrouter_key', newKey);
    }
    selectedModel = newModel;
    localStorage.setItem('openrouter_model', newModel);
    document.getElementById('settings-status').innerText = 'Settings saved!';
    setTimeout(() => {
        document.getElementById('settings-status').innerText = '';
    }, 2000);
});

// Load saved values into settings inputs
document.getElementById('api-key').value = apiKey;
document.getElementById('model-select').value = selectedModel;

// ==================== CODE GENERATOR ====================
document.getElementById('gen-btn').addEventListener('click', async () => {
    const prompt = document.getElementById('gen-prompt').value.trim();
    if (!prompt) {
        alert('Please enter a prompt.');
        return;
    }

    const resultDiv = document.getElementById('gen-result');
    const codeEl = document.getElementById('gen-code');
    resultDiv.classList.add('hidden');

    try {
        const system = 'You are an expert coding assistant. Generate clean, well-documented code for the given task. Return only the code without extra explanation unless asked.';
        const aiResponse = await callOpenRouter(system, prompt);
        codeEl.innerText = aiResponse;
        resultDiv.classList.remove('hidden');
    } catch (err) {
        alert('Error: ' + err.message);
    }
});

// ==================== ERROR FIX TOOL ====================
document.getElementById('fix-btn').addEventListener('click', async () => {
    const errorText = document.getElementById('error-input').value.trim();
    if (!errorText) {
        alert('Please paste an error message.');
        return;
    }

    const resultDiv = document.getElementById('fix-result');
    const contentDiv = document.getElementById('fix-content');
    resultDiv.classList.add('hidden');

    try {
        const system = 'You are a debugging expert. Explain the error, its cause, and provide a corrected code example. Format the response with clear sections.';
        const aiResponse = await callOpenRouter(system, errorText);
        contentDiv.innerHTML = aiResponse.replace(/\n/g, '<br>'); // simple line breaks
        resultDiv.classList.remove('hidden');
    } catch (err) {
        alert('Error: ' + err.message);
    }
});

// ==================== SNIPPET LIBRARY ====================
const categoryBtns = document.querySelectorAll('.category-btn');
let currentCategory = 'python';

categoryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        categoryBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.cat;
        displaySnippetList(currentCategory);
    });
});

function displaySnippetList(category) {
    const listDiv = document.getElementById('snippet-list');
    const snippetDisplay = document.getElementById('snippet-display');
    snippetDisplay.classList.add('hidden');
    const categorySnippets = snippets[category] || [];
    if (categorySnippets.length === 0) {
        listDiv.innerHTML = '<p>No snippets available.</p>';
        return;
    }
    let html = '';
    categorySnippets.forEach((snippet, index) => {
        html += `<div class="snippet-item" data-index="${index}">
            <div class="title">${snippet.title}</div>
            <div class="desc">Click to view code</div>
        </div>`;
    });
    listDiv.innerHTML = html;

    // Add click handlers to snippet items
    document.querySelectorAll('.snippet-item').forEach(item => {
        item.addEventListener('click', () => {
            const idx = item.dataset.index;
            const snippet = categorySnippets[idx];
            document.getElementById('snippet-code').innerText = snippet.code;
            document.getElementById('snippet-display').classList.remove('hidden');
        });
    });
}

// Initial display
displaySnippetList('python');

// ==================== PROMPT GENERATOR ====================
document.getElementById('prompt-btn').addEventListener('click', async () => {
    const category = document.getElementById('prompt-category').value;
    const desc = document.getElementById('prompt-desc').value.trim();
    const resultDiv = document.getElementById('prompt-result');
    const contentDiv = document.getElementById('prompt-content');
    resultDiv.classList.add('hidden');

    try {
        const system = 'You are an expert at writing effective prompts for AI. Generate a professional, detailed prompt for the given category and description.';
        const userInput = `Category: ${category}\nDescription: ${desc || 'General'}`;
        const aiResponse = await callOpenRouter(system, userInput);
        contentDiv.innerText = aiResponse;
        resultDiv.classList.remove('hidden');
    } catch (err) {
        alert('Error: ' + err.message);
    }
});

// ==================== SEND TO TELEGRAM ====================
function sendDataToTelegram(text) {
    tg.sendData(text); // Sends data back to the bot
}

// Attach send buttons
document.getElementById('gen-send').addEventListener('click', () => {
    const code = document.getElementById('gen-code').innerText;
    if (code) sendDataToTelegram(code);
});

document.getElementById('fix-send').addEventListener('click', () => {
    const content = document.getElementById('fix-content').innerText;
    if (content) sendDataToTelegram(content);
});

document.getElementById('snippet-send').addEventListener('click', () => {
    const code = document.getElementById('snippet-code').innerText;
    if (code) sendDataToTelegram(code);
});

document.getElementById('prompt-send').addEventListener('click', () => {
    const prompt = document.getElementById('prompt-content').innerText;
    if (prompt) sendDataToTelegram(prompt);
});

// Optional: close app after sending? Not necessary.