require("dotenv").config();

const axios = require("axios");

// ==========================================
// GET ACCESS TOKEN
// ==========================================

async function getAccessToken() {

    const auth = Buffer.from(
        process.env.MPESA_CONSUMER_KEY +
        ":" +
        process.env.MPESA_CONSUMER_SECRET
    ).toString("base64");

    try {

        const response = await axios.get(
            "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
            {
                headers: {
                    Authorization: `Basic ${auth}`
                }
            }
        );

        return response.data.access_token;

    } catch (error) {

        console.log("========== OAUTH ERROR ==========");

        if (error.response) {

            console.log(error.response.data);

        } else {

            console.log(error.message);

        }

        console.log("===============================");

        throw error;

    }

}

// ==========================================
// STK PUSH
// ==========================================

async function stkPush(phone, amount) {

    const token = await getAccessToken();

    const shortcode = process.env.MPESA_SHORTCODE;

    const passkey = process.env.MPESA_PASSKEY;

    const timestamp = new Date()
        .toISOString()
        .replace(/[-:TZ.]/g, "")
        .slice(0, 14);

    const password = Buffer.from(
        shortcode +
        passkey +
        timestamp
    ).toString("base64");

    try {

        const response = await axios.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            {
                BusinessShortCode: shortcode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: "CustomerPayBillOnline",
                Amount: amount,
                PartyA: phone,
                PartyB: shortcode,
                PhoneNumber: phone,
                CallBackURL: process.env.CALLBACK_URL,
                AccountReference: "DiceMaster",
                TransactionDesc: "Wallet Deposit"
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        return response.data;

    } catch (error) {

        console.log("========== STK PUSH ERROR ==========");

        if (error.response) {

            console.log(error.response.data);

        } else {

            console.log(error.message);

        }

        console.log("===================================");

        throw error;

    }

}

module.exports = {

    stkPush

};