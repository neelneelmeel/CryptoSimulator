CryptoSim is a web-based blockchain simulation platform designed to help students and developers understand how blockchain and cryptocurrency systems work. It features interactive mining, transaction handling,
wallet management, and real-time blockchain visualization — all in a simple, elegant interface.

Features💼 Wallet creation with public/private keys
💸 Send transactions with optional fees
⛏️ Mine blocks (Proof-of-Work) and earn rewards + fees
📜 Blockchain Explorer to view all blocks and transactions
📊 Stats tab to show blocks mined and transactions sent per wallet
🎨 Modern dark theme with orange highlights
🧠 Automatic mining difficulty adjustment
🕒 Block limit: 2 transactions per block (simulated block size)
🧾 Flash messages and copy-to-clipboard buttons for better UX

Project Structure
cryptosim/
├── app.py               # Main Flask backend
├── templates/
│   └── index.html       # UI layout
├── static/
│   ├── style.css        # Modern CSS styling
│   └── script.js        # Tab switching, fetch calls, UI rendering
