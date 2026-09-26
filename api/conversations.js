import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const file=path.join(path.dirname(fileURLToPath(import.meta.url)),"..","data","conversations.json");
async function read(){try{return JSON.parse(await fs.readFile(file,"utf8"))}catch{return {conversations:[]}}}
async function write(data){await fs.writeFile(file,JSON.stringify(data,null,2),"utf8")}
export default async function handler(req,res){
 res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Allow-Methods","GET,POST,DELETE,OPTIONS");res.setHeader("Access-Control-Allow-Headers","Content-Type");
 if(req.method==="OPTIONS")return res.status(204).end();
 if(req.method==="GET")return res.status(200).json(await read());
 if(req.method==="POST"){
   let body=req.body;if(typeof body==="string")try{body=JSON.parse(body)}catch{body={}};
   const conversations=Array.isArray(body?.conversations)?body.conversations.slice(0,100).map(c=>({id:String(c.id),title:String(c.title||"Nouvelle discussion").slice(0,120),messages:Array.isArray(c.messages)?c.messages.slice(-200).map(m=>({role:m.role==="assistant"?"assistant":"user",content:String(m.content).slice(0,12000)})):[],updatedAt:c.updatedAt||new Date().toISOString()})):[];
   await write({conversations});return res.status(200).json({success:true,conversations});
 }
 if(req.method==="DELETE"){await write({conversations:[]});return res.status(200).json({success:true})}
 return res.status(405).json({success:false,error:"Méthode non autorisée"});
}