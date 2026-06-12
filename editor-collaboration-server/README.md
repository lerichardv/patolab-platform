# PatoLab — Editor Collaboration Server

A standalone Node.js server that manages real-time collaborative document synchronization using **Hocuspocus v4** and **Yjs**, and provides an API endpoint for fast speech-to-text (voice dictation) chunk processing using **FFmpeg** and **Whisper.cpp**.

---

## Architecture & Workflow

The editor collaboration server acts as a WebSocket hub and HTTP endpoint. It works in tandem with the Laravel backend and React frontend via two key workflows:

### 1. Collaborative Editing (Hocuspocus + Yjs)
* **WebSocket upgrades**: Standard connection handshakes are intercepted via `crossws` and routed to the Hocuspocus engine.
* **Document Hydration (Laravel Webhook Integration)**: On connection (`onConnect`) and document load (`onLoadDocument`), the server communicates with the Laravel backend API (`/api/collaboration`) to fetch and restore document state.
* **State Synchronization**: Collaborative edits (including cursors) are synchronized in real-time across active editors.
* **Debounced Autosave**: Document edits (`onChange`) are debounced on the server for 1 second and then sent back to Laravel as HTML/Yjs updates for persistent storage.

### 2. Speech-to-Text Dictation (Voice Streaming)
1. **Streaming Chunks**: The React frontend records microphone audio and streams chunked audio payloads (`audio/webm;codecs=opus`) via HTTP `POST` requests every 2 seconds to the `/api/dictate-chunk` endpoint.
2. **Audio Transcoding**: The Express handler saves the upload and uses `ffmpeg` to upscale the Opus stream to a single-channel, 16kHz PCM WAV format required by Whisper.
3. **Whisper Transcription**: The server spawns a local `whisper-cli` process using optimized configuration parameters (`ggml-medium.bin` model, 4 CPU threads, lock-in Spanish language).
4. **Hallucination Filtering**: The transcription result is sanitized of non-speech markers (e.g., brackets/parentheses) and checked against a **Hallucination Guard** (which blocks Whisper silence artifacts like *"¡Suscríbete al canal!"*, *"suscríbete"*, *"gracias por"*).
5. **Yjs Text Injection**: If the text is valid, it is appended to the active editor's Hocuspocus room instance. The updated document content is then instantly broadcast to all editing peers via WebSockets.

---

## Installation & Setup

1. Make sure you have **Node.js** and **FFmpeg** installed on your system.
2. Clone/locate the `editor-collaboration-server` directory.
3. Create a `.env` file based on `.env.example` and configure the environment variables.
4. Install dependencies:
   ```bash
   npm install
   ```

---

## Running the Server

### Development Mode (with Nodemon auto-reload)
Runs on port `1234` by default:
```bash
npm run dev
```

### Production Mode (Standalone Node)
```bash
npm run start
```

### Production Mode via Supervisor
To ensure the server runs continuously in production, restarts automatically on failures, and starts up at system boot, you should configure it as a service using **Supervisor**.

1. Create a Supervisor configuration file (e.g., `/etc/supervisor/conf.d/patolab-collaboration.conf`):
   ```ini
   [program:patolab-collaboration]
   process_name=%(program_name)s_%(process_num)02d
   directory=/opt/homebrew/var/www/patolab/editor-collaboration-server
   command=/usr/bin/node index.js
   autostart=true
   autorestart=true
   user=www-data
   numprocs=1
   redirect_stderr=true
   stdout_logfile=/opt/homebrew/var/www/patolab/editor-collaboration-server/supervisor.log
   environment=PATH="/usr/bin:/usr/local/bin"
   ```
   > [!NOTE]
   > Make sure the `directory` matches the absolute path to your collaboration server directory, `command` points to the absolute path of your `node` binary (you can find this by running `which node`), and the `user` is set to the user account that has read/write permissions to that directory.

2. Reload Supervisor configurations and start the program:
   ```bash
   sudo supervisorctl reread
   sudo supervisorctl update
   sudo supervisorctl start patolab-collaboration:*
   ```

3. Manage the service:
   ```bash
   # Check status
   sudo supervisorctl status patolab-collaboration:*
   # Restart the service
   sudo supervisorctl restart patolab-collaboration:*
   ```

---

## Compilation & Model Setup

The voice dictation and AI grammar correction features rely on locally compiled instances of **whisper.cpp** and **llama.cpp** to ensure fast, offline, and secure execution.

### 1. Whisper.cpp Setup (Speech-to-Text)

To set up **whisper.cpp** for voice dictation:

1. Clone the repository to the desired location (default path configured is `/opt/homebrew/var/www/whisper.cpp`):
   ```bash
   git clone https://github.com/ggerganov/whisper.cpp.git /opt/homebrew/var/www/whisper.cpp
   cd /opt/homebrew/var/www/whisper.cpp
   ```

2. Compile the binaries:
   ```bash
   # Build the whisper-cli executable
   make whisper-cli
   ```

3. Download the Spanish-optimized medium model:
   ```bash
   bash ./models/download-ggml-model.sh medium
   ```

#### Default Environment Variables
* **WHISPER_PATH**: Directory of your compiled `whisper.cpp` build (default: `/opt/homebrew/var/www/whisper.cpp`).
* **WHISPER_MODEL**: Path to the binary model (default: `${WHISPER_PATH}/models/ggml-medium.bin`).
* **WHISPER_EXECUTABLE**: Path to the compiled CLI utility (default: `${WHISPER_PATH}/build/bin/whisper-cli`).

#### Command Line Verification
To test model accuracy, thread performance, and Spanish language compatibility directly inside your `whisper.cpp` installation:
```bash
./build/bin/whisper-cli -m models/ggml-medium.bin -f ~/Downloads/whisper-test.wav -l es -nt
```
* **`-m models/ggml-medium.bin`**: Specifies the 1.5GB medium model weights.
* **`-f ~/Downloads/whisper-test.wav`**: Specifies the input 16kHz mono WAV file.
* **`-l es`**: Locks language detection to Spanish to improve transcription speed and accuracy.
* **`-nt`**: Disables timestamp printing in the text output.

---

### 2. Llama.cpp Setup (AI Grammar Correction)

To set up **llama.cpp** for grammar and spelling corrections:

1. Clone the repository to the desired location (default path configured is `/opt/homebrew/var/www/llama.cpp`):
   ```bash
   git clone https://github.com/ggerganov/llama.cpp.git /opt/homebrew/var/www/llama.cpp
   cd /opt/homebrew/var/www/llama.cpp
   ```

2. Compile the binaries:
   ```bash
   make
   ```

3. Download the Instruct model weights (e.g., Llama-3.2-3B-Instruct-Q4_K_M.gguf) and place them in the `models/` directory:
   * Target path: `/opt/homebrew/var/www/llama.cpp/models/Llama-3.2-3B-Instruct-Q4_K_M.gguf`

#### Default Environment Variables
* **LLAMA_PATH**: Directory of your compiled `llama.cpp` build (default: `/opt/homebrew/var/www/llama.cpp`).
* **LLAMA_MODEL**: Path to the Instruct model (default: `${LLAMA_PATH}/models/Llama-3.2-3B-Instruct-Q4_K_M.gguf`).
* **LLAMA_EXECUTABLE**: Path to the compiled CLI utility (default: `${LLAMA_PATH}/build/bin/llama-cli`).

#### Command Line Verification
To test the deterministic single-shot grammar correction utility directly via your `llama.cpp` installation:
```bash
./build/bin/llama-completion -m models/Llama-3.2-3B-Instruct-Q4_K_M.gguf -p "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\nEres un corrector gramatical experto en informes médicos. Corrige la ortografía y la gramática en español del texto provisto. Devuelve ÚNICAMENTE el texto completamente corregido.<|eot_id|><|start_header_id|>user<|end_header_id|>\n\nejemplo de ttexto con erores<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n" --chat-template llama3 --predict 3000 --threads 1 --temp 0.01 --repeat-penalty 1.3 --no-display-prompt
```
* **`-m models/Llama-3.2-3B-Instruct-Q4_K_M.gguf`**: Specifies the quantized 3B Instruct model weights.
* **`-p "<prompt>"`**: The formatted ChatML prompt containing system constraints and target user text.
* **`--predict 3000`**: Restricts the maximum completion length (matching the 3000 characters limit).
* **`--threads 1`**: Pins CPU allocation to a single thread to optimize server resource utilization.
* **`--temp 0.01`**: Forces deterministic greedy token parsing.
* **`--no-display-prompt`**: Silences echoing of the input prompt in the stdout stream.

