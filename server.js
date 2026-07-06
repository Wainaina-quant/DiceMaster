const express = require("express");
const session = require("express-session");
const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");
require("dotenv").config();

console.log("Consumer Key:", process.env.MPESA_CONSUMER_KEY ? "FOUND" : "MISSING");
console.log("Consumer Secret:", process.env.MPESA_CONSUMER_SECRET ? "FOUND" : "MISSING");
console.log("Shortcode:", process.env.MPESA_SHORTCODE ? "FOUND" : "MISSING");
console.log("Passkey:", process.env.MPESA_PASSKEY ? "FOUND" : "MISSING");
console.log("Callback:", process.env.CALLBACK_URL ? process.env.CALLBACK_URL : "MISSING");

const { stkPush } = require("./mpesa");
const app = express();
const db = new Database("database.db");

app.use(express.json());

app.use(express.static("public"));

app.use(session({
    secret: "dicemastersecret",
    resave: false,
    saveUninitialized: false
}));

// ---------- DATABASE ----------

db.prepare(`
CREATE TABLE IF NOT EXISTS users(

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    phone TEXT UNIQUE,

    password TEXT,

    verified INTEGER DEFAULT 0,

    balance REAL DEFAULT 1000,

    wins INTEGER DEFAULT 0,

    losses INTEGER DEFAULT 0,

    createdAt TEXT

)
`).run();

// ---------- BET HISTORY ----------

db.prepare(`
CREATE TABLE IF NOT EXISTS bets(

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    userId INTEGER,

    prediction TEXT,

    stake REAL,

    d1 INTEGER,

    d2 INTEGER,

    d3 INTEGER,

    total INTEGER,

    result TEXT,

    payout REAL,

    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP

)
`).run();

// ---------- HOME ----------

app.get("/", (req,res)=>{

    res.sendFile(__dirname + "/public/index.html");

});

// ==========================================
// REGISTER
// ==========================================

app.post("/register", async (req, res) => {

    const {

        phone,

        password,

        confirmPassword

    } = req.body;

    if (!phone || !password || !confirmPassword) {

        return res.json({

            success: false,

            message: "Fill all fields."

        });

    }

    // Kenyan phone validation

    if (!/^0(7|1)\d{8}$/.test(phone)) {

        return res.json({

            success: false,

            message: "Enter a valid Kenyan phone number."

        });

    }

    if (password !== confirmPassword) {

        return res.json({

            success: false,

            message: "Passwords do not match."

        });

    }

    if (password.length < 6) {

        return res.json({

            success: false,

            message: "Password must be at least 6 characters."

        });

    }

    const exists = db.prepare(

        "SELECT * FROM users WHERE phone=?"

    ).get(phone);

    if (exists) {

        return res.json({

            success: false,

            message: "Phone number already registered."

        });

    }

    const hash = await bcrypt.hash(password, 10);

    db.prepare(`

        INSERT INTO users(

            phone,

            password,

            verified,

            createdAt

        )

        VALUES(?,?,?,?)

    `).run(

        phone,

        hash,

        0,

        new Date().toISOString()

    );

    res.json({

        success: true,

        message: "Registration successful."

    });

});

// ==========================================
// LOGIN
// ==========================================

app.post("/login", async (req, res) => {

    const { phone, password } = req.body;

    if (!phone || !password) {

        return res.json({

            success: false,

            message: "Fill all fields."

        });

    }

    const user = db.prepare(

        "SELECT * FROM users WHERE phone=?"

    ).get(phone);

    if (!user) {

        return res.json({

            success: false,

            message: "Phone number not registered."

        });

    }

    if (user.verified === 0) {

        return res.json({

            success: false,

            message: "Please verify your phone number first."

        });

    }

    const ok = await bcrypt.compare(

        password,

        user.password

    );

    if (!ok) {

        return res.json({

            success: false,

            message: "Wrong password."

        });

    }

    req.session.user = user.id;

    res.json({

        success: true,

        message: "Login successful."

    });

});

// ==========================================
// TRANSACTIONS TABLE
// ==========================================

db.prepare(`

CREATE TABLE IF NOT EXISTS transactions(

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    userId INTEGER,

    checkoutRequestId TEXT,

    phone TEXT,

    amount REAL,

    type TEXT,

    status TEXT,

    createdAt TEXT

)

`).run();

// ---------- CURRENT USER ----------

app.get("/me",(req,res)=>{

    if(!req.session.user){

        return res.status(401).end();

    }

    const user=db.prepare(`
    SELECT
    id,
    username,
    balance,
    wins,
    losses
    FROM users
    WHERE id=?
    `).get(req.session.user);

    res.json(user);

});

// ---------- LOGOUT ----------

app.post("/logout",(req,res)=>{

    req.session.destroy(()=>{

        res.json({

            success:true

        });

    });

});

// ---------- BET ----------

app.post("/bet",(req,res)=>{

    if(!req.session.user){

        return res.status(401).json({

            message:"Login required"

        });

    }

    const{

        prediction,

        stake

    }=req.body;

    if(

        !stake ||

        stake<10

    ){

        return res.json({

            message:"Minimum stake is 10"

        });

    }

    const user=

    db.prepare(

        "SELECT * FROM users WHERE id=?"

    ).get(req.session.user);

    if(user.balance<stake){

        return res.json({

            message:"Insufficient balance"

        });

    }

    const d1=

    Math.floor(Math.random()*6)+1;

    const d2=

    Math.floor(Math.random()*6)+1;

    const d3=

    Math.floor(Math.random()*6)+1;

    const total=

    d1+d2+d3;

    const result=

    total%2===0

    ?"EVEN"

    :"ODD";

    let payout=0;

    let balance=user.balance-stake;

    let wins=user.wins;

    let losses=user.losses;

    if(result===prediction){

        payout=

        stake*1.92;

        balance+=payout;

        wins++;

    }

    else{

        losses++;

    }

    db.prepare(`

    UPDATE users

    SET

    balance=?,

    wins=?,

    losses=?

    WHERE id=?

    `).run(

        balance,

        wins,

        losses,

        user.id

    );

    db.prepare(`

    INSERT INTO bets(

        userId,

        prediction,

        stake,

        d1,

        d2,

        d3,

        total,

        result,

        payout

    )

    VALUES(

        ?,?,?,?,?,?,?,?,?

    )

    `).run(

        user.id,

        prediction,

        stake,

        d1,

        d2,

        d3,

        total,

        result,

        payout

    );

    res.json({

        d1,

        d2,

        d3,

        total,

        result,

        payout,

        balance,

        wins,

        losses,

        win:payout>0

    });

});

// ---------- HISTORY ----------

app.get("/history",(req,res)=>{

    if(!req.session.user){

        return res.status(401).json([]);

    }

    const history=

    db.prepare(`

    SELECT

    prediction,

    stake,

    total,

    result,

    payout,

    createdAt

    FROM bets

    WHERE userId=?

    ORDER BY id DESC

    LIMIT 10

    `).all(req.session.user);

    res.json(history);

});

// ==========================================
// MPESA DEPOSIT
// ==========================================

app.post("/deposit", async (req, res) => {

    if (!req.session.user) {

        return res.status(401).json({

            success: false,

            message: "Please login."

        });

    }

    const { phone, amount } = req.body;

    if (!phone || !amount) {

        return res.json({

            success: false,

            message: "Phone and amount are required."

        });

    }

    try {

        const response = await stkPush(

            phone,

            Number(amount)

        );

        console.log("STK RESPONSE:", response);

        // Save pending transaction

        db.prepare(`

        INSERT INTO transactions(

            userId,

            checkoutRequestId,

            phone,

            amount,

            type,

            status,

            createdAt

        )

        VALUES(?,?,?,?,?,?,?)

        `).run(

            req.session.user,

            response.CheckoutRequestID,

            phone,

            Number(amount),

            "DEPOSIT",

            "PENDING",

            new Date().toISOString()

        );

        res.json({

            success: true,

            message: "STK Push sent.",

            data: response

        });

    }

    catch(error){

        console.log(error.response?.data || error.message);

        res.json({

            success:false,

            message:"Failed to send STK Push."

        });

    }

});

// ---------- WITHDRAW ----------

app.post("/withdraw",(req,res)=>{

    if(!req.session.user){

        return res.status(401).json({

            message:"Login required"

        });

    }

    const{

        amount

    }=req.body;

    const user=

    db.prepare(

        "SELECT * FROM users WHERE id=?"

    ).get(req.session.user);

    if(

        amount<=0 ||

        amount>user.balance

    ){

        return res.json({

            message:"Insufficient balance"

        });

    }

    const balance=

    user.balance-amount;

    db.prepare(

        "UPDATE users SET balance=? WHERE id=?"

    ).run(

        balance,

        user.id

    );

    res.json({

        success:true,

        balance

    });

});

// ==========================================
// MPESA CALLBACK
// ==========================================

app.post("/api/mpesa/callback", express.json(), (req, res) => {

    console.log("====== MPESA CALLBACK ======");

    console.log(JSON.stringify(req.body, null, 2));

    const callback = req.body.Body.stkCallback;

    const checkoutRequestId = callback.CheckoutRequestID;

    const resultCode = callback.ResultCode;

    // Always acknowledge Safaricom immediately

    res.json({

        ResultCode: 0,

        ResultDesc: "Accepted"

    });

    // Payment failed

    if (resultCode !== 0) {

        db.prepare(`

        UPDATE transactions

        SET status='FAILED'

        WHERE checkoutRequestId=?

        `).run(checkoutRequestId);

        return;

    }

    // Find pending transaction

    const transaction = db.prepare(`

    SELECT *

    FROM transactions

    WHERE checkoutRequestId=?

    AND status='PENDING'

    `).get(checkoutRequestId);

    if (!transaction) {

        console.log("Transaction already processed or not found.");

        return;

    }

    // Credit wallet

    db.prepare(`

    UPDATE users

    SET balance = balance + ?

    WHERE id=?

    `).run(

        transaction.amount,

        transaction.userId

    );

    // Mark transaction completed

    db.prepare(`

    UPDATE transactions

    SET status='COMPLETED'

    WHERE id=?

    `).run(transaction.id);

    console.log("Wallet credited successfully.");

});

// ---------- START ----------

const PORT=3000;

app.listen(PORT,()=>{

    console.log(`Server running on http://localhost:${PORT}`);

});