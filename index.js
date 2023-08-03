const express=require("express")
const cors = require("cors")
const server = express();
const PORT=process.env.PORT || 8000;
const mysql=require("mysql")
const cookie_parser= require("cookie-parser")
const nodemailer=require("nodemailer")
const escpos = require('escpos');
escpos.USB = require('escpos-usb');
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const bodyParser = require('body-parser')



//const device  = new escpos.USB();
//const options = { encoding: "GB18030" /* default */ } 
//const printer = new escpos.Printer(device, options);

server.use(bodyParser.json())
server.use(cors())
server.use(express.json())
server.use(cookie_parser())


server.get("/api/data_tilgang",async (req,res)=>{
    const connection = mysql.createConnection({
        host: process.env.NEXT_AZURE_HOST,
        user: process.env.NEXT_AZURE_USER_NAME,
        password: process.env.NEXT_AZURE_PASS,
        database: process.env.NEXT_AZURE_DATABASE,
        port: process.env.NEXT_AZURE_PORT
      })

    const kunde=await new Promise((resolve,reject)=>{
        connection.query(`SELECT * FROM kunde`, (err, results, fields) => {
        if(err){
            reject(err)
        } else{
            resolve(results)
        }
        })
    })

    const salg=await new Promise((resolve,reject)=>{
        connection.query(`SELECT * FROM salg`, (err, results, fields) => {
        if(err){
            reject(err)
        } else{
            resolve(results)
        }
        })
    })
    connection.end();

    res.status(200).json({kunde:kunde, salg:salg})
})



server.post("/api/change-state",(req,res)=>{
    const connection = mysql.createConnection({
        host: process.env.NEXT_AZURE_HOST,
        user: process.env.NEXT_AZURE_USER_NAME,
        password: process.env.NEXT_AZURE_PASS,
        database: process.env.NEXT_AZURE_DATABASE,
        port: process.env.NEXT_AZURE_PORT
    })

    req.body.forEach((element)=>{
        const info=element[0].split(",")
        const q1 = `UPDATE kunde SET status_ = "sendt" WHERE id = ${info[0]} AND betaling_id = "${info[1]}"`;
        connection.query(q1,(err,result,field)=>{
            if(err){
                return res.status(500)
            }
        })
        const q2 = `UPDATE salg SET status_ = "sendt" WHERE kunde_id = ${info[0]} AND betaling_id = "${info[1]}"`;
        connection.query(q2,(err,result,field)=>{
            if(err){
                return res.status(500)
            }
        })

        /*device.open(function(error){
            printer
            .font('a')
            .align('LT')
            .style('bu')
            .size(0.1, 0.1)
            .text(`FROM :`)
            .text(` Afzali Saffron \n Berglyveien 8B, 1262 Oslo \n Org.nr : 931655833`)
            .align("RT")
            .text(`To :`)
            .text(` ${info[3]} \n ${info[4]} \n ${info[5]}, ${info[6]} \n ${info[7]}`)
            .cut()
            .close()
        });
        */

        const htmll=`
        <h2> Dear ${info[3]}, Your order at Zsaffron has been sendt</h2>
        <h3> We once again give you the customer id:${info[0]} as a reference</h3> 
        <h4>Thank you for choosing Zsaffron and we hope to welcome you back again.`;
        
        const transporter=nodemailer.createTransport({
            service:"gmail",
            host:"smtp.gmail.com",
            secure:true,
            auth:{
                user:process.env.MAIL,
                pass:process.env.MAIL_PASS
            }
        })
        const resp=transporter.sendMail({
            from:"Zsaffron <zsaffroncontact@gmail.com>",
            to:info[2],
            subject:"shipping confirmation",
            html:htmll,
        })

    })

    connection.end()
    res.status(200).json({success:true})
})


server.listen(PORT,()=>{console.log(`app listening on http://localost:${PORT} `)})
