// =====================================
// DAVBOT AI APP.JS
// Créé par Ir David Mpongo 🇨🇩
// =====================================


// =============== API ==================

const GEM_API = "https://christus-gem-api.onrender.com";

const COPILOT_API = 
"https://celestin-api.onrender.com/api/v1/copilot";



// =============== FIREBASE =============

import { initializeApp } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";


import {

getDatabase,
ref,
push,
set,
onValue

}
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";



const firebaseConfig = {

apiKey: "AIzaSyA24pBo8mBWiZssPtep--MMBdB7c8_Lu4U",

authDomain: "starlink-investit.firebaseapp.com",

databaseURL:
"https://starlink-investit-default-rtdb.firebaseio.com",

projectId:"starlink-investit"

};



const firebaseApp =
initializeApp(firebaseConfig);



const db =
getDatabase(firebaseApp);





// =============== UTILISATEUR ===========


let sessionId =
localStorage.getItem("davbot_session")
||
Math.random().toString(36).substring(2,15);



localStorage.setItem(
"davbot_session",
sessionId
);





// =============== ELEMENTS ==============


const messages =
document.getElementById("messages");


const input =
document.getElementById("input");



const sendBtn =
document.getElementById("send");



let pendingImage=null;

let pendingImagePreview=null;






// =============== NETTOYAGE =============


function cleanAnswer(text){

if(!text) return "";

return text
.replace(/\*/g,"")
.replace(/\bChatGPT\b/gi,"DAVBOT AI");

}






// =============== AFFICHER MESSAGE =======


function addMessage(
text,
type,
isImage=false,
imageUrl=null
){


const div =
document.createElement("div");


div.className =
"msg "+type;



if(isImage && imageUrl){


div.innerHTML=`

<div class="content">

${text}

<br>

<img src="${imageUrl}">

<br>

<a href="${imageUrl}" download>
⬇️ Télécharger
</a>


</div>

`;


}

else{


div.innerHTML=`

<div class="content">

${type==="ai"
? cleanAnswer(text)
:text}

</div>


<div class="actions">

<button onclick="copyMessage(this)">
📋
</button>


<button onclick="speakMessage(this)">
🔊
</button>


<button onclick="deleteMessage(this)">
🗑️
</button>


</div>

`;


}



messages.appendChild(div);


messages.scrollTop =
messages.scrollHeight;


return div;


}






// =============== ECRITURE IA ============


function typingEffect(element,text){


let i=0;


element.innerHTML="";


let timer=setInterval(()=>{


element.innerHTML += text[i];


i++;


if(i>=text.length){

clearInterval(timer);

}


},35);


}
// =============== FIREBASE MESSAGE ===============


function saveMessage(role,text){


const id = push(
ref(db,`davbot/${sessionId}/messages`)
).key;



set(
ref(db,`davbot/${sessionId}/messages/${id}`),
{

role:role,

text:text,

time:Date.now()

}

);


}




// =============== API IA COPILOT =================


async function getAIResponse(message){


try{


const identity = `

Tu es DAVBOT AI.

Tu es une intelligence artificielle créée par Ir David Mpongo,
un développeur congolais 🇨🇩 âgé de 18 ans.

Tu aides les utilisateurs dans :
- programmation
- intelligence artificielle
- technologie
- création d'applications
- développement web et mobile
- questions générales

Tu dois toujours dire que tu es DAVBOT AI.
Ne dis jamais que tu es ChatGPT.

`;



const prompt =
identity +
"\nUtilisateur : " +
message;




const url =
`${COPILOT_API}?message=${encodeURIComponent(prompt)}&model=default`;



const response =
await fetch(url);



if(!response.ok){

throw new Error("API indisponible");

}



const data =
await response.json();



if(
data.success &&
data.data &&
data.data.answer
){


return cleanAnswer(
data.data.answer
);


}



return "Je n'ai pas trouvé de réponse.";



}

catch(error){


console.error(error);


return "❌ DAVBOT AI rencontre une erreur de connexion.";


}


}






// =============== GENERATION IMAGE =================


async function generateImage(prompt){


const response =
await fetch(
`${GEM_API}/generate`,
{

method:"POST",

headers:{
"Content-Type":"application/json"
},


body:JSON.stringify({

prompt:prompt,

format:"jpg",

ratio:"1:1"

})


}

);



if(!response.ok){

throw new Error("Erreur génération image");

}



const blob =
await response.blob();



return URL.createObjectURL(blob);


}






// =============== MODIFICATION IMAGE ===============


async function editImage(imageBase64,prompt){



const response =
await fetch(
`${GEM_API}/edit`,
{

method:"POST",

headers:{
"Content-Type":"application/json"
},


body:JSON.stringify({

image:imageBase64,

prompt:prompt,

format:"jpg"

})


}

);



if(!response.ok){

throw new Error("Erreur modification image");

}



const blob =
await response.blob();



return URL.createObjectURL(blob);



}






// =============== IMAGE EN BASE64 ================


function imageToBase64(file){


return new Promise((resolve,reject)=>{


const reader =
new FileReader();



reader.onload=()=>{


resolve(
reader.result.split(",")[1]
);


};



reader.onerror=reject;



reader.readAsDataURL(file);



});


}






// =============== DETECTION IMAGE ================


function isImageRequest(text){


const words=[

"génère",
"crée",
"dessine",
"image",
"photo",
"portrait",
"paysage",
"generate",
"create"

];


text=text.toLowerCase();



return words.some(
word=>text.includes(word)
);


}
// =============== ENVOYER MESSAGE =================


sendBtn.onclick = send;


input.addEventListener("keypress",e=>{

if(e.key==="Enter"){

send();

}

});





async function send(){


const text =
input.value.trim();



if(!text && !pendingImage)
return;



if(text){


addMessage(
text,
"user"
);


saveMessage(
"user",
text
);


input.value="";


}




// IMAGE GENERATION


if(text && isImageRequest(text)){


const loading =
addMessage(
"🎨 DAVBOT AI crée votre image...",
"ai"
);



try{


const image =
await generateImage(text);



loading.remove();



addMessage(
"🎨 Image générée par DAVBOT AI",
"ai",
true,
image
);



saveMessage(
"ai",
"Image générée"
);



}

catch(e){


loading.remove();


addMessage(
"❌ Erreur image",
"ai"
);


}



return;


}






// REPONSE IA


const loading =
addMessage(
"✍️ DAVBOT AI écrit...",
"ai"
);



const reply =
await getAIResponse(text);



loading.remove();



const aiMessage =
addMessage(
"",
"ai"
);



const content =
aiMessage.querySelector(".content");



typingEffect(
content,
reply
);



saveMessage(
"ai",
reply
);



speak(reply);



}








// =============== COPIER =================


window.copyMessage=function(btn){


const text =
btn.parentElement
.parentElement
.querySelector(".content")
.innerText;



navigator.clipboard.writeText(text);



};







// =============== SUPPRIMER ===============


window.deleteMessage=function(btn){


btn.parentElement
.parentElement
.remove();


};







// =============== VOIX ====================


function speak(text){


const speech =
new SpeechSynthesisUtterance(text);



speech.lang="fr-FR";


speech.rate=1;



speechSynthesis.cancel();



speechSynthesis.speak(
speech
);



}




window.speakMessage=function(btn){


const text =
btn.parentElement
.parentElement
.querySelector(".content")
.innerText;



speak(text);


};








// =============== IMAGE UPLOAD =============


const imageInput =
document.getElementById("imageInput");


const imageBtn =
document.getElementById("imageBtn");



if(imageBtn){


imageBtn.onclick=()=>{

imageInput.click();

};


}





if(imageInput){


imageInput.onchange=e=>{


const file =
e.target.files[0];



if(file){


pendingImage=file;



pendingImagePreview =
URL.createObjectURL(file);



addMessage(

`
📷 Image sélectionnée

<br>

<img src="${pendingImagePreview}">

`,

"user"

);



}



};



}









// =============== AUDIO =====================


const audioBtn =
document.getElementById("audioBtn");


let recorder;

let audioChunks=[];



if(audioBtn){



audioBtn.onclick=async()=>{



const stream =
await navigator.mediaDevices
.getUserMedia({
audio:true
});



recorder =
new MediaRecorder(stream);



audioChunks=[];



recorder.start();



audioBtn.innerHTML="⏹️";





recorder.ondataavailable=e=>{


audioChunks.push(e.data);


};





recorder.onstop=()=>{


const audio =
new Blob(audioChunks);



const url =
URL.createObjectURL(audio);



addMessage(

`
🎤 Message vocal

<br>

<audio controls src="${url}"></audio>

`,

"user"

);



audioBtn.innerHTML="🎤";



};





setTimeout(()=>{


recorder.stop();


},5000);



};



}








// =============== CHARGER MEMOIRE FIREBASE ============


onValue(

ref(db,`davbot/${sessionId}/messages`),

(snapshot)=>{


if(snapshot.exists()){


messages.innerHTML="";



Object.values(snapshot.val())
.forEach(msg=>{


addMessage(
msg.text,
msg.role
);


});


}



}

);
