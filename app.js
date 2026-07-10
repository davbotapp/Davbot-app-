// ==========================================
// DAVBOT AI APP.JS - PARTIE 1/3
// Firebase + Mémoire + Interface
// ==========================================


// ================= API =================

const GEM_API =
"https://christus-gem-api.onrender.com";


const COPILOT_API =
"https://celestin-api.onrender.com/api/v1/copilot";



// ================= FIREBASE =================

import {initializeApp}
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";


import {
getDatabase,
ref,
push,
set,
onValue,
remove
}
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";



const firebaseConfig = {

apiKey:
"AIzaSyA24pBo8mBWiZssPtep--MMBdB7c8_Lu4U",

authDomain:
"starlink-investit.firebaseapp.com",

databaseURL:
"https://starlink-investit-default-rtdb.firebaseio.com",

projectId:
"starlink-investit"

};



const firebaseApp =
initializeApp(firebaseConfig);


const db =
getDatabase(firebaseApp);





// ================= ELEMENTS =================


const messages =
document.getElementById("messages");


const input =
document.getElementById("input");


const sendBtn =
document.getElementById("send");


const imageBtn =
document.getElementById("imageBtn");


const imageInput =
document.getElementById("imageInput");


const audioBtn =
document.getElementById("audioBtn");




// ================= SESSION =================


let sessionId =
localStorage.getItem("davbot_chat");



if(!sessionId){

sessionId =
Date.now().toString();


localStorage.setItem(
"davbot_chat",
sessionId
);

}





let pendingImage=null;

let pendingImagePreview=null;





// ================= IDENTITE DAVBOT =================


const identity = `

Tu es DAVBOT AI.

Tu es un assistant intelligent créé pour le projet DAVBOT.

Informations :

Nom : DAVBOT AI

Créateur du projet :
Ir David Mpongo 🇨🇩

Domaine :
- Intelligence artificielle
- Programmation
- Applications web et mobiles
- Technologie

Tu aides les utilisateurs avec des réponses utiles,
claires et professionnelles.

`;





// ================= NETTOYAGE =================


function cleanAnswer(text){

if(!text)
return "";

return text
.replace(/\*/g,"")
.replace(
/\bChatGPT\b/gi,
"DAVBOT AI"
);

}






// ================= AFFICHAGE MESSAGE =================


function addMessage(
text,
type,
image=false,
imageUrl=null
){


const box =
document.createElement("div");


box.className =
"msg "+type;



let content="";



if(image && imageUrl){


content = `

<div class="content">

${text}

<br>

<img 
src="${imageUrl}"
class="image-preview"
>

<br>


<a href="${imageUrl}"
download="davbot-image.jpg">

⬇ Télécharger

</a>


</div>


`;



}else{


content = `

<div class="content">
${type==="ai"
?cleanAnswer(text)
:text}
</div>

`;

}



content += `

<div class="actions">

<button onclick="copyMessage(this)">
📋
</button>


<button onclick="voiceMessage(this)">
🔊
</button>


<button onclick="deleteMessage(this)">
🗑️
</button>


</div>

`;



box.innerHTML=content;


messages.appendChild(box);


messages.scrollTop =
messages.scrollHeight;



return box;


}







// ================= SAUVEGARDE FIREBASE =================


function saveMessage(role,text){


const id =
push(
ref(
db,
"davbot/"+sessionId
)
).key;



set(

ref(
db,
"davbot/"+sessionId+"/"+id
),

{

role:role,

text:text,

time:Date.now()

}

);


}







// ================= CHARGER MEMOIRE =================


onValue(

ref(
db,
"davbot/"+sessionId
),

snap=>{


if(!snap.exists())
return;



messages.innerHTML="";



Object.values(
snap.val()
)

.sort(
(a,b)=>a.time-b.time
)

.forEach(m=>{


addMessage(
m.text,
m.role
);


});


});
// ==========================================
// DAVBOT AI APP.JS - PARTIE 2/3
// API IA + IMAGE + MEMOIRE
// ==========================================



// ================= REPONSE IA =================


async function getAIResponse(userMessage){


try{


const prompt =

identity +

`

Historique de la conversation :
Tu dois garder le contexte de cette discussion.

Utilisateur :
${userMessage}

Réponds en français.
`;



const url =

`${COPILOT_API}?message=${encodeURIComponent(prompt)}&model=default`;




const response =

await fetch(url);



if(!response.ok){

throw new Error(
"Erreur serveur IA"
);

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


console.log(error);


return 
"❌ DAVBOT AI est indisponible actuellement.";

}


}








// ================= GENERATION IMAGE =================



async function generateImage(prompt){



const response =

await fetch(

`${GEM_API}/generate`,

{

method:"POST",


headers:{

"Content-Type":
"application/json"

},


body:JSON.stringify({

prompt:prompt,

ratio:"1:1",

format:"jpg"

})


}

);




if(!response.ok){

throw new Error(
"Erreur création image"
);

}




const blob =
await response.blob();



// Correction image invisible

if(!blob.type.includes("image")){


throw new Error(
"Le serveur n'a pas envoyé une image"
);


}



return URL.createObjectURL(blob);



}








// ================= MODIFICATION IMAGE =================



async function editImage(
base64,
prompt
){



const response =

await fetch(

`${GEM_API}/edit`,

{

method:"POST",


headers:{

"Content-Type":
"application/json"

},


body:JSON.stringify({

image:base64,

prompt:prompt,

format:"jpg"

})


}

);



const blob =
await response.blob();



if(!blob.type.includes("image")){

throw new Error(
"Image invalide"
);

}



return URL.createObjectURL(blob);


}








// ================= IMAGE EN BASE64 =================


function imageToBase64(file){


return new Promise(
(resolve,reject)=>{


const reader =
new FileReader();



reader.onload=()=>{


resolve(

reader.result
.split(",")[1]

);


};



reader.onerror =
reject;



reader.readAsDataURL(file);



});


}








// ================= DETECTION IMAGE =================



function isImageRequest(text){



const words=[


"image",

"photo",

"dessine",

"crée",

"cree",

"génère",

"genere",

"logo",

"portrait",

"paysage",

"draw",

"create"


];



text =
text.toLowerCase();



return words.some(

w=>text.includes(w)

);


}








// ================= NETTOYAGE PROMPT =================


function cleanPrompt(text){


return text

.replace(
/génère|genere|crée|cree|dessine|image|photo/gi,
""
)

.trim();


}








// ================= EFFET ECRITURE =================



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








// ================= CHARGEMENT =================



function loading(){



const box =
addMessage(

"🤖 DAVBOT AI réfléchit...",
"ai"

);



return box;


}
// ==========================================
// DAVBOT AI APP.JS - PARTIE 3/3
// ENVOI + AUDIO + VOIX + ACTIONS
// ==========================================



// ================= ENVOYER MESSAGE =================


async function send(){


const text =
input.value.trim();



if(!text && !pendingImage)
return;




// Message utilisateur

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





try{


// ===== CREATION IMAGE =====


if(
text &&
isImageRequest(text)
){


const wait =
addMessage(
"🎨 Création de l'image...",
"ai"
);



try{


const image =
await generateImage(
cleanPrompt(text)
);



wait.remove();



addMessage(

"🎨 Image créée par DAVBOT AI",

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


wait.remove();


addMessage(
"❌ Impossible de générer l'image",
"ai"
);


}


return;


}





// ===== REPONSE IA =====



const wait =
loading();



const reply =
await getAIResponse(text);



wait.remove();



const ai =
addMessage(
"",
"ai"
);



typingEffect(

ai.querySelector(".content"),

reply

);



saveMessage(
"ai",
reply
);



// Lecture automatique

speak(reply);



}



catch(error){


addMessage(
"❌ Erreur connexion",
"ai"
);


}



}








// ================= BOUTON ENVOI =================


if(sendBtn){

sendBtn.onclick =
send;

}





// Entrée clavier

input.addEventListener(

"keypress",

(e)=>{


if(e.key==="Enter"){

send();

}


});









// ================= IMAGE UPLOAD =================



if(imageBtn){


imageBtn.onclick=()=>{


imageInput.click();


};


}




if(imageInput){


imageInput.onchange=(e)=>{


const file =
e.target.files[0];



if(file){


pendingImage=file;


pendingImagePreview =
URL.createObjectURL(file);



addMessage(

"📷 Image envoyée",

"user",

true,

pendingImagePreview

);



}


};


}









// ================= TEXTE VERS VOIX =================


function speak(text){



const voice =
new SpeechSynthesisUtterance(text);



voice.lang="fr-FR";


voice.rate=1;



speechSynthesis.cancel();


speechSynthesis.speak(voice);


}




window.voiceMessage=function(btn){



const text =

btn.parentElement
.parentElement
.querySelector(".content")
.innerText;



speak(text);


};









// ================= COPIER =================


window.copyMessage=function(btn){



const text =

btn.parentElement
.parentElement
.querySelector(".content")
.innerText;



navigator.clipboard.writeText(text);



btn.innerHTML="✅";


setTimeout(()=>{

btn.innerHTML="📋";

},1000);


};









// ================= SUPPRIMER =================


window.deleteMessage=function(btn){


const msg =
btn.parentElement.parentElement;


msg.remove();


};









// ================= RECONNAISSANCE VOCALE =================


let recognition;



if(
"webkitSpeechRecognition" in window
){



recognition =
new webkitSpeechRecognition();



recognition.lang =
"fr-FR";


recognition.continuous=false;



recognition.onstart=()=>{


audioBtn.innerHTML="🎧";


};





recognition.onresult=(event)=>{


const text =

event.results[0][0]
.transcript;



input.value=text;



send();


};





recognition.onend=()=>{


audioBtn.innerHTML="🎤";


};







if(audioBtn){


audioBtn.onclick=()=>{


recognition.start();


};


}



}else{


if(audioBtn){


audioBtn.onclick=()=>{


alert(
"Micro non disponible"
);


};


}


}







// ================= NOUVELLE DISCUSSION =================


function newChat(){


sessionId =
Date.now().toString();



localStorage.setItem(
"davbot_chat",
sessionId
);



messages.innerHTML="";


addMessage(

"Bonjour 👋 Je suis DAVBOT AI. Nouvelle discussion créée.",

"ai"

);


}



window.newChat=newChat;
