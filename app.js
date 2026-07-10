// ==========================================
// DAVBOT AI APP.JS - PARTIE 1/3
// Assistant IA personnalisé
// ==========================================


// ================= API ====================

const GEM_API = "https://christus-gem-api.onrender.com";

const COPILOT_API =
"https://celestin-api.onrender.com/api/v1/copilot";




// ================= FIREBASE ===============

import { initializeApp }
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




// Configuration Firebase

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






// ================= ELEMENTS ===============


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







// ================= SESSION ================


let sessionId =
localStorage.getItem("davbot_session");



if(!sessionId){


sessionId =
Math.random()
.toString(36)
.substring(2,15);



localStorage.setItem(
"davbot_session",
sessionId
);


}





let pendingImage = null;

let pendingImagePreview = null;








// ================= NETTOYAGE ==============


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









// ================= AFFICHAGE MESSAGE ======


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


div.innerHTML = `


<div class="content">

${text}

<br>


<img 
src="${imageUrl}"
class="image-preview"
>


<br>


<a 
class="download"
href="${imageUrl}"
download="davbot-image.jpg">

⬇️ Télécharger

</a>


</div>



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



}

else{


div.innerHTML = `


<div class="content">

${type==="ai"
? cleanAnswer(text)
:text}

</div>




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



}



messages.appendChild(div);



messages.scrollTop =
messages.scrollHeight;



return div;



}









// ================= ECRITURE IA ============


function typingEffect(
element,
text
){



let i=0;



element.innerHTML="";



let timer =
setInterval(()=>{



element.innerHTML += text[i];



i++;



if(i>=text.length){


clearInterval(timer);


}



},35);



}








// ================= SAUVEGARDE FIREBASE ====


function saveMessage(
role,
text
){



const id =
push(
ref(db,`davbot/${sessionId}/messages`)
).key;




set(

ref(
db,
`davbot/${sessionId}/messages/${id}`
),

{


role:role,

text:text,

date:Date.now()


}


);



}
// ==========================================
// DAVBOT AI APP.JS - PARTIE 2/3
// API IA + IMAGE + MEMOIRE
// ==========================================



// =============== REPONSE IA COPILOT =================


async function getAIResponse(message){


try{


const identity = `

Tu es DAVBOT AI.

Tu es l'assistant intelligent intégré dans l'application DAVBOT.

Informations du projet :
- Nom : DAVBOT AI
- Créateur du projet : Ir David Mpongo 🇨🇩
- Domaine : intelligence artificielle, programmation, technologie, applications web et mobiles.

Tu aides les utilisateurs avec :
- programmation
- développement web
- développement mobile
- création d'applications
- intelligence artificielle
- questions générales.

Réponds de manière claire, professionnelle et utile.

`;



const prompt =
identity
+
"\nUtilisateur : "
+
message;




const url =
`${COPILOT_API}?message=${encodeURIComponent(prompt)}&model=default`;




const response =
await fetch(url);



if(!response.ok){

throw new Error(
"Erreur connexion IA"
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


console.error(
"Erreur IA:",
error
);



return "❌ DAVBOT AI est momentanément indisponible.";



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
"Erreur génération image"
);


}





const blob =
await response.blob();





if(
!blob.type.includes("image")
){


throw new Error(
"La réponse n'est pas une image"
);


}





return URL.createObjectURL(blob);





}









// =============== MODIFIER IMAGE =================



async function editImage(
imageBase64,
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

image:imageBase64,

prompt:prompt,

format:"jpg"


})


}


);





if(!response.ok){


throw new Error(
"Erreur modification image"
);


}





const blob =
await response.blob();





return URL.createObjectURL(blob);



}









// =============== IMAGE BASE64 ===================


function imageToBase64(file){


return new Promise(
(resolve,reject)=>{


const reader =
new FileReader();



reader.onload=()=>{


resolve(
reader.result.split(",")[1]
);



};



reader.onerror =
reject;



reader.readAsDataURL(file);



});


}









// =============== DETECTION IMAGE ===============


function isImageRequest(text){



const keywords=[


"génère",

"genere",

"crée",

"cree",

"dessine",

"image",

"photo",

"portrait",

"paysage",

"logo",

"generate",

"create"


];




text =
text.toLowerCase();




return keywords.some(

word =>
text.includes(word)

);



}








// =============== NETTOYER PROMPT IMAGE =========



function cleanPrompt(text){



return text

.replace(
/génère|genere|crée|cree|dessine|image|photo/gi,
""
)

.trim();



}
// ==========================================
// DAVBOT AI APP.JS - PARTIE 3/3
// ENVOI + AUDIO + VOIX + MEMOIRE
// ==========================================


// =============== ENVOYER MESSAGE =================


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







// ===== IMAGE GENERATION =====


if(
text &&
isImageRequest(text)
){



const loading =
addMessage(
"🎨 DAVBOT AI génère l'image...",
"ai"
);



try{


const imageUrl =
await generateImage(
cleanPrompt(text)
);



loading.remove();



addMessage(
"🎨 Image créée par DAVBOT AI",
"ai",
true,
imageUrl
);



saveMessage(
"ai",
"Image générée"
);



}

catch(error){


loading.remove();



addMessage(
"❌ Impossible de créer l'image",
"ai"
);



}



return;


}







// ===== REPONSE IA =====



const loading =
addMessage(
"✍️ DAVBOT AI écrit...",
"ai"
);




const reply =
await getAIResponse(text);



loading.remove();




const aiBox =
addMessage(
"",
"ai"
);



const content =
aiBox.querySelector(".content");



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







// Bouton envoyer

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









// =============== LECTURE VOCALE =================



function speak(text){


const speech =
new SpeechSynthesisUtterance(text);



speech.lang =
"fr-FR";


speech.rate =
1;



speechSynthesis.cancel();



speechSynthesis.speak(
speech
);



}





window.voiceMessage =
function(btn){



const text =
btn
.parentElement
.parentElement
.querySelector(".content")
.innerText;



speak(text);



};









// =============== COPIER MESSAGE ================


window.copyMessage =
function(btn){



const text =
btn
.parentElement
.parentElement
.querySelector(".content")
.innerText;



navigator.clipboard.writeText(text);



};









// =============== SUPPRIMER MESSAGE =============



window.deleteMessage =
function(btn){



btn
.parentElement
.parentElement
.remove();



};









// =============== ENVOI IMAGE ===================



if(imageBtn){


imageBtn.onclick =
()=>{


imageInput.click();


};



}





if(imageInput){



imageInput.onchange =
(e)=>{


const file =
e.target.files[0];



if(file){


pendingImage =
file;



pendingImagePreview =
URL.createObjectURL(file);



addMessage(

`
📷 Image envoyée

<br>

<img 
class="image-preview"
src="${pendingImagePreview}"
>

`,

"user"

);



}



};



}









// =============== RECONNAISSANCE VOCALE ==========



let recognition;



if(
"webkitSpeechRecognition"
in window
){



recognition =
new webkitSpeechRecognition();



recognition.lang =
"fr-FR";



recognition.continuous =
false;




recognition.onstart =
()=>{


audioBtn.innerHTML =
"🎧";



};






recognition.onresult =
(event)=>{


const text =
event.results[0][0].transcript;



input.value =
text;



send();



};






recognition.onend =
()=>{


audioBtn.innerHTML =
"🎤";



};







if(audioBtn){


audioBtn.onclick =
()=>{


recognition.start();


};


}





}

else{


if(audioBtn){


audioBtn.onclick =
()=>{


alert(
"Reconnaissance vocale non disponible"
);


};


}



}









// =============== CHARGER MEMOIRE FIREBASE ========



onValue(

ref(
db,
`davbot/${sessionId}/messages`
),

(snapshot)=>{


if(
snapshot.exists()
){



messages.innerHTML="";



Object.values(
snapshot.val()
)

.sort(
(a,b)=>a.date-b.date
)

.forEach(
(msg)=>{


addMessage(
msg.text,
msg.role
);



});


}



});
