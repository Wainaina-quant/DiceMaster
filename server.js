const express = require("express");
const session = require("express-session");
const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");
require("dotenv").config();

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

    username TEXT UNIQUE,

    password TEXT,

    balance REAL DEFAULT 1000,

    wins INTEGER DEFAULT 0,

    losses INTEGER DEFAULT 0

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

// ---------- REGISTER ----------

app.post("/register", async(req,res)=>{

    const {username,password}=req.body;

    if(!username || !password){

        return res.json({
            success:false,
            message:"Fill all fields."
        });

    }

    const exists=db.prepare(
        "SELECT * FROM users WHERE username=?"
    ).get(username);

    if(exists){

        return res.json({
            success:false,
            message:"Username already exists."
        });

    }

    const hash=await bcrypt.hash(password,10);

    db.prepare(`
    INSERT INTO users(username,password)
    VALUES(?,?)
    `).run(username,hash);

    res.json({

        success:true,

        message:"Registration successful."

    });

});

// ---------- LOGIN ----------

app.post("/login",async(req,res)=>{

    const {username,password}=req.body;

    const user=db.prepare(
        "SELECT * FROM users WHERE username=?"
    ).get(username);

    if(!user){

        return res.json({

            success:false,

            message:"Invalid username."

        });

    }

    const ok=await bcrypt.compare(
        password,
        user.password
    );

    if(!ok){

        return res.json({

            success:false,

            message:"Wrong password."

        });

    }

    req.session.user=user.id;

    res.json({

        success:true,

        message:"Login successful."

    });

});

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

        res.json({

            success: true,

            message: "STK Push sent.",

            data: response

        });

    } catch (error) {

        console.error(error.response?.data || error.message);

        res.json({

            success: false,

            message: "Failed to send STK Push."

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

    res.json({

        ResultCode: 0,

        ResultDesc: "Accepted"

    });

});

// ---------- START ----------

const PORT=3000;

app.listen(PORT,()=>{

    console.log(`Server running on http://localhost:${PORT}`);

});