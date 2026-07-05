// ==========================================
// DICE MASTER V2
// SCRIPT.JS
// PART 1
// ==========================================

// ---------- Screens ----------

const authScreen =
document.getElementById("authScreen");

const gameScreen =
document.getElementById("gameScreen");

// ---------- Forms ----------

const loginForm =
document.getElementById("loginForm");

const registerForm =
document.getElementById("registerForm");

const showLogin =
document.getElementById("showLogin");

const showRegister =
document.getElementById("showRegister");

const loginBtn =
document.getElementById("loginBtn");

const registerBtn =
document.getElementById("registerBtn");

const logoutBtn =
document.getElementById("logoutBtn");

// ---------- Player ----------

const playerName =
document.getElementById("playerName");

const balance =
document.getElementById("balance");

const wins =
document.getElementById("wins");

const losses =
document.getElementById("losses");

const authMessage =
document.getElementById("authMessage");

// ---------- Betting ----------

const evenBtn =
document.getElementById("evenBtn");

const oddBtn =
document.getElementById("oddBtn");

const totalDisplay =
document.getElementById("total");

const resultDisplay =
document.getElementById("result");

const messageDisplay =
document.getElementById("message");

const historyList =
document.getElementById("history");

// ---------- Dice ----------

const dice1 =
document.getElementById("dice1");

const dice2 =
document.getElementById("dice2");

const dice3 =
document.getElementById("dice3");

// ==========================================
// LOGIN / REGISTER TABS
// ==========================================

showLogin.onclick=()=>{

loginForm.style.display="block";

registerForm.style.display="none";

};

showRegister.onclick=()=>{

loginForm.style.display="none";

registerForm.style.display="block";

};

// ==========================================
// REGISTER
// ==========================================

registerBtn.onclick=async()=>{

const username=
document.getElementById(
"registerUsername").value;

const password=
document.getElementById(
"registerPassword").value;

const response=
await fetch("/register",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

username,
password

})

});

const data=
await response.json();

authMessage.innerText=
data.message;

};

// ==========================================
// LOGIN
// ==========================================

loginBtn.onclick=async()=>{

const username=
document.getElementById(
"loginUsername").value;

const password=
document.getElementById(
"loginPassword").value;

const response=
await fetch("/login",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

username,
password

})

});

const data=
await response.json();

authMessage.innerText=
data.message;

if(data.success){

loadUser();

}

};
// ==========================================
// DICE MASTER V2
// SCRIPT.JS
// PART 2
// ==========================================

// ---------- LOGOUT ----------

logoutBtn.onclick = async()=>{

    await fetch("/logout",{

        method:"POST"

    });

    location.reload();

};

// ==========================================
// LOAD USER
// ==========================================

async function loadUser(){

    const response =
    await fetch("/me");

    if(!response.ok){

        return;

    }

    const user =
    await response.json();

    authScreen.style.display="none";

    gameScreen.style.display="block";

    playerName.innerText=
    user.username;

    balance.innerText=
    Number(user.balance).toFixed(2);

    wins.innerText=
    user.wins;

    losses.innerText=
    user.losses;

}
// ==========================================
// WALLET MODALS
// ==========================================

const depositBtn = document.getElementById("depositBtn");
const withdrawBtn = document.getElementById("withdrawBtn");

const depositModal = document.getElementById("depositModal");
const withdrawModal = document.getElementById("withdrawModal");

const closeDeposit = document.getElementById("closeDeposit");
const closeWithdraw = document.getElementById("closeWithdraw");

const confirmDeposit = document.getElementById("confirmDeposit");
const confirmWithdraw = document.getElementById("confirmWithdraw");

// ---------- OPEN MODALS ----------

depositBtn.onclick = () => {

    depositModal.style.display = "flex";

};

withdrawBtn.onclick = () => {

    withdrawModal.style.display = "flex";

};

// ---------- CLOSE MODALS ----------

closeDeposit.onclick = () => {

    depositModal.style.display = "none";

};

closeWithdraw.onclick = () => {

    withdrawModal.style.display = "none";

};

// ---------- CLOSE WHEN CLICKING OUTSIDE ----------

window.onclick = (event) => {

    if(event.target === depositModal){

        depositModal.style.display = "none";

    }

    if(event.target === withdrawModal){

        withdrawModal.style.display = "none";

    }

};

// ==========================================
// MPESA DEPOSIT
// ==========================================

confirmDeposit.onclick = async () => {

    const phone = document
        .getElementById("depositPhone")
        .value
        .trim();

    const amount = Number(
        document.getElementById("depositAmount").value
    );
    let formattedPhone = phone;

if (formattedPhone.startsWith("0")) {

    formattedPhone = "254" + formattedPhone.substring(1);

}

    if (!/^0(7|1)\d{8}$/.test(phone)) {

        alert("Enter a valid Kenyan phone number.");

        return;

    }

    if (amount < 1) {

        alert("Enter a valid amount.");

        return;

    }

    confirmDeposit.disabled = true;

    confirmDeposit.innerText = "Sending STK...";

    try {

        const response = await fetch("/deposit", {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify({

    phone: formattedPhone,
    amount

})

        });

        const data = await response.json();

        if (data.success) {

            alert("STK Push sent. Check your phone.");

            depositModal.style.display = "none";

        } else {

            alert(data.message);

        }

    } catch (err) {

        alert("Network error.");

    }

    confirmDeposit.disabled = false;

    confirmDeposit.innerText = "Confirm Deposit";

};

// ==========================================
// WITHDRAW (Temporary)
// ==========================================

confirmWithdraw.onclick = async () => {

    const amount = Number(

        document.getElementById("withdrawAmount").value

    );

    if(amount <= 0){

        alert("Enter a valid amount.");

        return;

    }

    const response = await fetch("/withdraw",{

        method:"POST",

        headers:{
            "Content-Type":"application/json"
        },

        body:JSON.stringify({

            amount

        })

    });

    const data = await response.json();

    if(data.success){

        balance.innerText = Number(data.balance).toFixed(2);

        withdrawModal.style.display = "none";

        alert("Withdrawal successful.");

    }else{

        alert(data.message);

    }

};
// ==========================================
// 3D DICE
// ==========================================

// ==========================================
// 3D DICE CONTROLLER
// ==========================================

const rotations = {

    1: "rotateX(0deg) rotateY(0deg)",

    2: "rotateX(90deg) rotateY(0deg)",

    3: "rotateY(-90deg)",

    4: "rotateY(90deg)",

    5: "rotateX(-90deg)",

    6: "rotateY(180deg)"

};

function setDice(cube, value){

    cube.style.transform = rotations[value];

}

function startRolling(){

    dice1.classList.add("rolling");
    dice2.classList.add("rolling");
    dice3.classList.add("rolling");

}

function stopRolling(d1,d2,d3){

    dice1.classList.remove("rolling");
    dice2.classList.remove("rolling");
    dice3.classList.remove("rolling");

    void dice1.offsetWidth;
    void dice2.offsetWidth;
    void dice3.offsetWidth;

    setDice(dice1,d1);
    setDice(dice2,d2);
    setDice(dice3,d3);

}
// ==========================================
// DICE MASTER V2
// SCRIPT.JS
// PART 3
// ==========================================

// ---------- BET BUTTONS ----------

evenBtn.onclick=()=>{

    placeBet("EVEN");

};

oddBtn.onclick=()=>{

    placeBet("ODD");

};

// ==========================================
// PLACE BET
// ==========================================

async function placeBet(prediction){

    const stake = Number(document.getElementById("stake").value);

    if(stake < 10){

        messageDisplay.className = "lose";
        messageDisplay.innerText = "Minimum stake is 10";
        return;

    }

    evenBtn.disabled = true;
    oddBtn.disabled = true;

    startRolling();

    try{

        const response = await fetch("/bet",{

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({

                prediction,
                stake

            })

        });

        const data = await response.json();

        setTimeout(()=>{

            if(data.message){

                stopRolling(1,1,1);

                messageDisplay.className="lose";
                messageDisplay.innerText=data.message;

                evenBtn.disabled=false;
                oddBtn.disabled=false;

                return;

            }

            stopRolling(

                data.d1,
                data.d2,
                data.d3

            );

            totalDisplay.innerText=data.total;

            resultDisplay.innerText=data.result;

            balance.innerText=
            Number(data.balance).toFixed(2);

            wins.innerText=data.wins;

            losses.innerText=data.losses;

            if(data.win){

                messageDisplay.className="win";
                messageDisplay.innerText="🎉 YOU WIN";

            }else{

                messageDisplay.className="lose";
                messageDisplay.innerText="❌ YOU LOST";

            }

            loadHistory();

            evenBtn.disabled=false;
            oddBtn.disabled=false;

        },1500);

    }

    catch(error){

        stopRolling(1,1,1);

        console.error(error);

        messageDisplay.className="lose";

        messageDisplay.innerText="Server error.";

        evenBtn.disabled=false;
        oddBtn.disabled=false;

    }

}
// ==========================================
// DICE MASTER V2
// SCRIPT.JS
// PART 4
// ==========================================

// ==========================================
// LOAD HISTORY
// ==========================================

async function loadHistory(){

    const response =
    await fetch("/history");

    if(!response.ok){

        return;

    }

    const history =
    await response.json();

    historyList.innerHTML="";

    history.forEach(bet=>{

        const li=
        document.createElement("li");

        li.innerHTML=

        `
        <strong>${bet.prediction}</strong>
        |
        ${bet.result}
        |
        Total:
        ${bet.total}
        |
        Stake:
        ${bet.stake}
        `;

        historyList.appendChild(li);

    });

}

// ==========================================
// DEFAULT DICE
// ==========================================

setDice(dice1,1);

setDice(dice2,1);

setDice(dice3,1);

// ==========================================
// AUTO LOGIN
// ==========================================

loadUser();


// ==========================================
// ENTER KEY LOGIN
// ==========================================

document.addEventListener("keypress",function(e){

    if(e.key==="Enter"){

        if(authScreen.style.display!=="none"){

            loginBtn.click();

        }

    }

});

// ==========================================
// END OF SCRIPT.JS
// ==========================================