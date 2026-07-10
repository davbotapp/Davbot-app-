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

import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";


import {
getDatabase,
ref,
push,
set,
onValue,
remove,
get
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



const app =
initializeApp(firebaseConfig);


const db =
getDatabase(app);





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
localStorage.getItem("davbot_session");



if(!sessionId){

sessionId =
"chat_"+Date.now();


localStorage.setItem(
"davbot_session",
sessionId
);

}



let pendingImage=null;

let pendingImagePreview=null;






// ================= IDENTITE =================


const identity = `

Tu es DAVBOT AI.

Nom : DAVBOT AI

Créateur du projet :
Ir David Mpongo 🇨🇩

Tu es un assistant intelligent spécialisé :

- programmation
- intelligence artificielle
- création d'applications
- technologie
- développement web et mobile

Réponds toujours clairement en français.

`;







// ================= NETTOYAGE =================


function cleanAnswer(text){


if(!text)
return "";


return text

.replace(/\*/g,"")

.replace(
/ChatGPT/gi,
"DAVBOT AI"
);


}







// ================= AFFICHAGE =================


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



let html="";



if(image && imageUrl){


html = `


<div class="content">

${text}


<br><br>


<img 
src="${imageUrl}"
class="image-preview"
loading="lazy"
>


<br>


<a href="${imageUrl}"
download="davbot-image.jpg">

⬇ Télécharger

</a>


</div>


`;



}else{


html = `


<div class="content">

${type==="ai"
?cleanAnswer(text)
:text}

</div>


`;

}



html += `


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



box.innerHTML=html;


messages.appendChild(box);


messages.scrollTop =
messages.scrollHeight;


return box;


}






// ================= SAUVEGARDE =================


function saveMessage(
role,
text,
image=null
){


const id =
push(
ref(
db,
"conversations/"+sessionId
)
).key;



set(

ref(
db,
"conversations/"+sessionId+"/"+id
),

{

role:role,

text:text,

image:image,

date:Date.now()

}


);


}






// ================= MEMOIRE =================


onValue(

ref(
db,
"conversations/"+sessionId
),

snapshot=>{


if(!snapshot.exists())
return;



messages.innerHTML="";



Object.values(snapshot.val())

.sort(
(a,b)=>a.date-b.date
)

.forEach(msg=>{


addMessage(
msg.text,
msg.role,
!!msg.image,
msg.image
);


});


});
// ==========================================
// DAVBOT AI APP.JS - PARTIE 2/3
// API IA + IMAGE + MEMOIRE
// ==========================================



// ================= RECUPERER HISTORIQUE =================


async function getHistory(){


const snap =
await get(
ref(
db,
"conversations/"+sessionId
)
);



if(!snap.exists())
return "";



let history="";



Object.values(snap.val())

.sort(
(a,b)=>a.date-b.date
)

.slice(-15)

.forEach(msg=>{


history +=

`

${msg.role} :
${msg.text}

`;



});



return history;


}








// ================= REPONSE IA =================



async function getAIResponse(message){


try{


const history =
await getHistory();



const prompt =


identity +


`

Historique :

${history}


Nouvelle question :

${message}


Réponds comme DAVBOT AI.
`;




const url =

`${COPILOT_API}?message=${encodeURIComponent(prompt)}&model=default`;




const response =
await fetch(url);



if(!response.ok){

throw new Error(
"Erreur API"
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



return "Je n'ai pas de réponse.";





}

catch(error){


console.log(error);


return "❌ DAVBOT AI rencontre un problème de connexion.";

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
"Génération impossible"
);

}




const blob =
await response.blob();





// Vérification image


if(
!blob.type.startsWith("image/")
){


throw new Error(
"Le serveur n'a pas retourné une image"
);


}





// Création URL visible


const imageURL =
URL.createObjectURL(blob);



return imageURL;



}








// ================= MODIFIER IMAGE =================



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




if(!response.ok){

throw new Error(
"Modification échouée"
);

}





const blob =
await response.blob();





return URL.createObjectURL(blob);



}








// ================= IMAGE BASE64 =================



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


}


);


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

"illustration",

"draw",

"create"


];



text=text.toLowerCase();



return words.some(
word=>text.includes(word)
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



function typingEffect(
element,
text
){


let i=0;


element.innerHTML="";



const timer =
setInterval(()=>{


element.innerHTML += text[i];


i++;


if(i>=text.length){

clearInterval(timer);

}


},35);


}








// ================= CHARGEMENT =================



function showLoading(){


return addMessage(

"🤖 DAVBOT AI réfléchit...",

"ai"

);


}
// ==========================================
// DAVBOT AI APP.JS - PARTIE 3/3
// ENVOI + AUDIO + ACTIONS
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



// ================= IMAGE =================



if(
text &&
isImageRequest(text)
){



const loading =
showLoading();



try{


const imageURL =
await generateImage(
cleanPrompt(text)
);



loading.remove();



addMessage(

"🎨 Image générée par DAVBOT AI",

"ai",

true,

imageURL

);



saveMessage(

"ai",

"Image générée",

imageURL

);



}

catch(error){


loading.remove();


addMessage(

"❌ Erreur génération image",

"ai"

);


}



return;


}






// ================= REPONSE IA =================



const loading =
showLoading();



const reply =
await getAIResponse(text);



loading.remove();



const box =
addMessage(

"",

"ai"

);



typingEffect(

box.querySelector(".content"),

reply

);



saveMessage(

"ai",

reply

);



speak(reply);



}

catch(error){



addMessage(

"❌ Erreur serveur",

"ai"

);



}



}









// ================= BOUTONS =================


if(sendBtn){


sendBtn.onclick =
send;


}




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









// ================= VOIX IA =================



function speak(text){


const speech =
new SpeechSynthesisUtterance(text);



speech.lang =
"fr-FR";


speech.rate=1;



speechSynthesis.cancel();


speechSynthesis.speak(speech);


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


const message =
btn.parentElement.parentElement;



message.remove();


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


if(audioBtn)

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


if(audioBtn)

audioBtn.innerHTML="🎤";


};






if(audioBtn){


audioBtn.onclick=()=>{


recognition.start();


};


}



}

else{


if(audioBtn){


audioBtn.onclick=()=>{


alert(
"Reconnaissance vocale non disponible"
);


};


}


}









// ================= NOUVELLE DISCUSSION =================



window.newChat=function(){



sessionId =
"chat_"+Date.now();



localStorage.setItem(

"davbot_session",

sessionId

);



messages.innerHTML="";



addMessage(

"👋 Nouvelle discussion DAVBOT AI",

"ai"

);



};
