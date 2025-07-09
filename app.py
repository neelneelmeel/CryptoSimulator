from flask import Flask, request, render_template, redirect, url_for, jsonify, flash
import json
import time
from hashlib import sha256
from uuid import uuid4
from collections import defaultdict
from ecdsa import SigningKey, SECP256k1
import binascii

app = Flask(__name__)
app.config['SECRET_KEY'] = 'neelix_secret_key'

TRANSACTION_FEE = 0.1

class Block:
    def __init__(self, index, timestamp, transactions, previous_hash, nonce=0):
        self.index = index
        self.timestamp = timestamp
        self.transactions = transactions
        self.previous_hash = previous_hash
        self.nonce = nonce
        self.hash = self.compute_hash()

    def compute_hash(self):
        block_string = json.dumps(self.__dict__, sort_keys=True)
        return sha256(block_string.encode()).hexdigest()

class Blockchain:
    
    def __init__(self):
        self.blocks_mined = defaultdict(int)
        self.transactions_sent = defaultdict(int)
        self.chain = []
        self.current_transactions = []
        self.difficulty = 3
        self.balances = defaultdict(float)
        self.address_names = {}

    def create_genesis_block(self):
        genesis_block = Block(0, time.time(), [], "0")
        self.chain.append(genesis_block)

    def get_last_block(self):
        return self.chain[-1]

    def add_transaction(self, sender, recipient, amount):
        try:
            amount = float(amount)
        except ValueError:
            return False

        total_amount = amount + TRANSACTION_FEE if sender != "MINER" else amount

        if sender != "MINER" and self.balances.get(sender, 0) < total_amount:
            return False

        self.current_transactions.append({
            'sender': sender,
            'recipient': recipient,
            'amount': amount,
            'fee': TRANSACTION_FEE if sender != "MINER" else 0.0,
            'timestamp': time.time()
        })

        if sender != "MINER":
            self.balances[sender] -= total_amount
            self.transactions_sent[sender] += 1  # ✅ Count transactions

        self.balances[recipient] += amount
        return True

    def proof_of_work(self, block):
        block.nonce = 0
        block.hash = block.compute_hash()
        while not block.hash.startswith('0' * self.difficulty):
            block.nonce += 1
            block.hash = block.compute_hash()
        return block.hash

    def mine_block(self, miner):
        if not self.current_transactions:
            return None

        fee_total = sum(tx['fee'] for tx in self.current_transactions if tx['sender'] != "MINER")
        reward = 10.0 + fee_total
        self.blocks_mined[miner] += 1

        self.add_transaction(sender="MINER", recipient=miner, amount=reward)

        last_block = self.get_last_block()
        max_txns = 2
        transactions_to_include = self.current_transactions[:max_txns]

        new_block = Block(
        index=last_block.index + 1,
        timestamp=time.time(),
        transactions=transactions_to_include,
        previous_hash=last_block.hash
        )


        new_block.hash = self.proof_of_work(new_block)
        self.chain.append(new_block)
        self.current_transactions = self.current_transactions[max_txns:]

        self.current_transactions = []
        return new_block

    def to_dict(self):
        return [block.__dict__ for block in self.chain]

    def get_transaction_history(self):
        history = []
        for block in self.chain:
            for txn in block.transactions:
                txn_copy = txn.copy()
                txn_copy['block'] = block.index
                history.append(txn_copy)
        return history

blockchain = Blockchain()

def create_wallet():
    private_key_obj = SigningKey.generate(curve=SECP256k1)
    public_key_obj = private_key_obj.get_verifying_key()
    address = binascii.hexlify(public_key_obj.to_string()).decode('utf-8')
    private_key_hex = binascii.hexlify(private_key_obj.to_string()).decode('utf-8')
    return {'private_key': private_key_hex, 'address': address}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/send', methods=['POST'])
def send():
    sender = request.form['sender']
    recipient = request.form['recipient']
    amount = request.form['amount']
    success = blockchain.add_transaction(sender, recipient, amount)
    if not success:
        flash("Transaction failed. Check address and balance.", 'error')
    else:
        flash(f"Transaction for {amount} SIM submitted with {TRANSACTION_FEE} SIM fee.", 'success')
    return redirect(url_for('index'))

@app.route('/mine', methods=['POST'])
def mine():
    miner = request.form['miner']
    new_block = blockchain.mine_block(miner)
    if not new_block:
        flash("Nothing to mine! Add transactions first.", 'warning')
    else:
        flash(f"Success! Block #{new_block.index} mined by {miner[:10]}... with rewards.", 'success')
    return redirect(url_for('index'))

@app.route('/user/create', methods=['POST'])
def create_user():
    data = request.get_json()
    name = data.get('name') or f"User{len(blockchain.address_names)+1}"
    wallet = create_wallet()
    blockchain.balances[wallet['address']] = 0.0
    blockchain.address_names[wallet['address']] = name
    wallet['name'] = name
    return jsonify(wallet), 201

def create_named_wallet(name, initial_balance):
    wallet = create_wallet()
    blockchain.balances[wallet['address']] = initial_balance
    blockchain.address_names[wallet['address']] = name
    print(f"Created default account: {name}")
    print(f"Address: {wallet['address']}")
    print(f"Private Key: {wallet['private_key']}\n")
    return wallet


@app.route('/names')
def get_names():
    return jsonify(blockchain.address_names)

@app.route('/chain')
def get_chain():
    return jsonify(blockchain.to_dict())

@app.route('/balances')
def get_balances():
    return jsonify(blockchain.balances)

@app.route('/transactions')
def get_transactions():
    return jsonify(blockchain.get_transaction_history())

@app.route('/pending')
def get_pending_transactions():
    return jsonify(blockchain.current_transactions)

@app.route('/stats')
def stats():
    return jsonify({
        "blocks_mined": blockchain.blocks_mined,
        "transactions_sent": blockchain.transactions_sent
    })

if __name__ == '__main__':

    # --- Default named wallets ---
   default_users = [
    ("Alice", 100),
    ("Bob", 50),
    ("Charlie", 25)
]

for name, amount in default_users:
    create_named_wallet(name, amount)

blockchain.create_genesis_block()
app.run(debug=True)