let addressNames = {};

function formatAddress(addr) {
  return addressNames[addr] || addr.slice(0, 10) + "...";
}

function clearTabs() {
  document.querySelectorAll(".tab-link").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
}

function showTab(tabId) {
  console.log("Switching to tab:", tabId);
  clearTabs();
  const tabElement = document.querySelector(`[data-tab='${tabId}']`);
  const paneElement = document.getElementById(tabId);
  if (tabElement) tabElement.classList.add("active");
  if (paneElement) paneElement.classList.add("active");

  if (tabId === "balances") fetchBalances();
  if (tabId === "explorer") fetchBlockchain();
  if (tabId === "history") fetchTransactions();
  if (tabId === "mine") fetchPendingTransactions();
  if (tabId === "stats") fetchStats();

}

async function fetchAddressNames() {
  try {
    const res = await fetch("/names");
    addressNames = await res.json();
  } catch {
    addressNames = {};
  }
}

async function fetchBalances() {
  const balanceList = document.getElementById("balanceList");
  balanceList.innerHTML = "Loading balances...";
  try {
    const res = await fetch("/balances");
    const data = await res.json();
    const txnRes = await fetch("/transactions");
    const txns = await txnRes.json();
    const minerRewards = {};
    txns.forEach(tx => {
      if (tx.sender === "MINER") {
        if (!minerRewards[tx.recipient]) minerRewards[tx.recipient] = 0;
        minerRewards[tx.recipient] += parseFloat(tx.amount);
      }
    });
    const output = Object.entries(data).map(([user, bal]) => `
      <div class='balance-item' style='display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;'>
        <p style='margin:0; word-break: break-all;'>
          <strong>User:</strong> ${formatAddress(user)}<br>
          <small style="opacity: 0.6;">${user}</small><br>
          <strong>Balance:</strong> ${bal.toFixed(2)} SIM<br>
          ${minerRewards[user] ? `<strong>Mined Rewards:</strong> ${minerRewards[user].toFixed(2)} SIM` : ""}
        </p>
        <button class='copy-btn' data-address='${user}'>Copy</button>
      </div>`).join("");
    balanceList.innerHTML = output || "No balances yet.";
  } catch {
    balanceList.innerText = "Failed to load balances.";
  }
}

async function fetchBlockchain() {
  const blockchainView = document.getElementById("blockchainView");
  blockchainView.innerHTML = "Loading blockchain...";
  try {
    const res = await fetch("/chain");
    const data = await res.json();
    const output = data.reverse().map(block => {
      const txDetails = block.transactions.map(tx => `
        <div style="padding: 6px 12px; margin-bottom: 8px; background: rgba(255,255,255,0.05); border-radius: 6px;">
          <strong>From:</strong> ${formatAddress(tx.sender)}<br>
          <strong>To:</strong> ${formatAddress(tx.recipient)}<br>
          <strong>Amount:</strong> ${tx.amount} SIM<br>
          ${tx.fee ? `<strong>Fee:</strong> ${tx.fee} SIM<br>` : ""}
        </div>`).join("");
      const txId = `tx-${block.index}`;
      return `
        <div class='block' style='border: 1px solid #555; padding: 10px; margin-bottom: 12px; border-radius: 5px;'>
          <p><strong>Block #${block.index}</strong></p>
          <p style='word-break: break-all;'><strong>Hash:</strong> ${block.hash}</p>
          <p style='word-break: break-all;'><strong>Prev Hash:</strong> ${block.previous_hash}</p>
          <p><strong>Nonce:</strong> ${block.nonce}</p>
          <p><strong>Transactions:</strong> ${block.transactions.length}</p>
          <button class="toggleTxBtn" data-target="${txId}" style="margin-top: 8px;">View Transactions</button>
          <div id="${txId}" class="tx-container" style="display: none; margin-top: 12px;">
            ${txDetails || "<em>No transactions</em>"}
          </div>
        </div>`;
    }).join("");
    blockchainView.innerHTML = output;
    document.querySelectorAll(".toggleTxBtn").forEach(btn => {
      btn.addEventListener("click", () => {
        const txDiv = document.getElementById(btn.dataset.target);
        const visible = txDiv.style.display === "block";
        txDiv.style.display = visible ? "none" : "block";
        btn.textContent = visible ? "View Transactions" : "Hide Transactions";
      });
    });
  } catch {
    blockchainView.innerText = "Failed to load blockchain.";
  }
}

async function fetchTransactions() {
  const transactionList = document.getElementById("transactionList");
  transactionList.innerHTML = "Loading transactions...";
  try {
    const res = await fetch("/transactions");
    const data = await res.json();
    const output = data.reverse().map(tx => `
      <p style='word-break: break-all;'>
        <strong>From:</strong> ${formatAddress(tx.sender)}<br>
        <strong>To:</strong> ${formatAddress(tx.recipient)}<br>
        <strong>Amount:</strong> ${tx.amount} SIM<br>
        ${tx.fee ? `<strong>Fee:</strong> ${tx.fee} SIM<br>` : ""}
        <small>(Block #${tx.block})</small>
      </p>`).join("<hr style='border-color: #444;'>");
    transactionList.innerHTML = output || "No transactions yet.";
  } catch {
    transactionList.innerText = "Failed to load transactions.";
  }
}

async function fetchPendingTransactions() {
  const pendingDiv = document.getElementById("pendingTransactions");
  pendingDiv.innerHTML = "Loading pending transactions...";
  try {
    const res = await fetch("/pending");
    const txns = await res.json();
    if (!txns.length) {
      pendingDiv.innerHTML = "<p>No pending transactions.</p>";
      return;
    }
    const output = txns.map(tx => `
      <div style="margin-bottom: 15px; border-bottom: 1px solid #444; padding-bottom: 10px;">
        <p style="word-break: break-all;">
          <strong>From:</strong> ${formatAddress(tx.sender)}<br>
          <strong>To:</strong> ${formatAddress(tx.recipient)}<br>
          <strong>Amount:</strong> ${tx.amount} SIM<br>
          ${tx.fee ? `<strong>Fee:</strong> ${tx.fee} SIM<br>` : ""}
        </p>
      </div>`).join("");
    pendingDiv.innerHTML = output;
  } catch {
    pendingDiv.innerHTML = "<p style='color: red;'>Failed to load pending transactions.</p>";
  }
}

function setupTabSwitching() {
  const tabs = document.querySelectorAll(".tab-link");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      showTab(tab.dataset.tab);
    });
  });
}

async function setup() {
  await fetchAddressNames();
  setupTabSwitching();
  showTab("send");

  const createUserBtn = document.getElementById("createUserBtn");
  const newWalletInfoDiv = document.getElementById("newWalletInfo");
  if (createUserBtn) {
    createUserBtn.addEventListener("click", async () => {
      const name = prompt("Enter a name for this wallet:") || "Unnamed";
      newWalletInfoDiv.style.display = "block";
      newWalletInfoDiv.innerHTML = `<p>Creating wallet...</p>`;
      try {
        const res = await fetch("/user/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name })
        });
        if (!res.ok) throw new Error(`Failed to create user (${res.status})`);
        const wallet = await res.json();
        newWalletInfoDiv.innerHTML = `
          <p><strong>New Wallet Created!</strong></p>
          <p><strong>Name:</strong> ${wallet.name}</p>
          <p><strong>Address:</strong><br> <input type="text" value="${wallet.address}" readonly /></p>
          <p><strong>Private Key (SAVE THIS!):</strong><br> <input type="text" value="${wallet.private_key}" readonly /></p>`;
        await fetchAddressNames();
        fetchBalances();
      } catch (e) {
        newWalletInfoDiv.innerHTML = `<p style="color: #ff6b6b;">Error: ${e.message}</p>`;
      }
    });
  }

  document.body.addEventListener('click', function (event) {
    if (event.target.classList.contains('copy-btn')) {
      const address = event.target.dataset.address;
      const tempInput = document.createElement('input');
      document.body.appendChild(tempInput);
      tempInput.value = address;
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      event.target.textContent = 'Copied!';
      setTimeout(() => {
        event.target.textContent = 'Copy';
      }, 1500);
    }
  });
}

async function fetchStats() {
  const statsDiv = document.getElementById("statsView");
  statsDiv.innerHTML = "Loading...";
  try {
    const res = await fetch("/stats");
    const data = await res.json();
    const blocks = data.blocks_mined;
    const txs = data.transactions_sent;

    const blockOutput = Object.entries(blocks).map(([user, count]) =>
      `<li><strong>${formatAddress(user)}:</strong> ${count} blocks</li>`
    ).join("");

    const txOutput = Object.entries(txs).map(([user, count]) =>
      `<li><strong>${formatAddress(user)}:</strong> ${count} transactions sent</li>`
    ).join("");

    statsDiv.innerHTML = `
      <h3>Blocks Mined</h3>
      <ul>${blockOutput || "<li>No blocks mined yet.</li>"}</ul>
      <h3>Transactions Sent</h3>
      <ul>${txOutput || "<li>No transactions yet.</li>"}</ul>
    `;
  } catch {
    statsDiv.innerHTML = "<p>Failed to load stats.</p>";
  }
}


window.addEventListener("load", setup);
// Ensure the script runs after the DOM is fully loaded