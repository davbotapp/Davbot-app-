/* =====================================================
   DAVBOT AI APP.JS
   PARTIE 1/3
   Gemini + Memory + Chat + Projects
===================================================== */


/* ==============================
   CONFIG GEMINI 
============================== */

/* ==============================
   CONFIG DAVBOT API
============================== */

const DAVBOT_API =
"https://davbot-api-xw6y.vercel.app/api/doki";


/* ==============================
   STORAGE
============================== */


let userName =
localStorage.getItem(
"davbot_name"
);



let conversations =
JSON.parse(
localStorage.getItem(
"davbot_history"
) || "[]"
);



let projects =
JSON.parse(
localStorage.getItem(
"davbot_projects"
) || "[]"
);



let currentChat = [];





/* ==============================
   UTILITAIRE
============================== */


function saveData(){

localStorage.setItem(
"davbot_history",
JSON.stringify(conversations)
);


localStorage.setItem(
"davbot_projects",
JSON.stringify(projects)
);

}





/* ==============================
   UTILISATEUR
============================== */


function checkUser(){


if(!userName){


userName =
prompt(
"👋 Bonjour\nJe suis DAVBOT AI.\nQuel est ton nom ?"
);



if(!userName || userName.trim()===""){

userName="Utilisateur";

}


localStorage.setItem(
"davbot_name",
userName
);


}



document
.querySelectorAll("#userName")
.forEach(el=>{

el.textContent=userName;

});


}



checkUser();






/* ==============================
   ELEMENTS
============================== */


const chat =
document.getElementById(
"chat"
);



const input =
document.getElementById(
"messageInput"
);



const sendButton =
document.getElementById(
"sendButton"
);



const welcome =
document.getElementById(
"welcome"
);



const historyList =
document.getElementById(
"historyList"
);



const projectList =
document.getElementById(
"projectList"
);






/* ==============================
   MESSAGE
============================== */


function addMessage(
text,
role="assistant",
save=true
){


if(!chat)return;



if(welcome){

welcome.style.display="none";

}



const box =
document.createElement(
"div"
);



box.className =
"message "+role;





const avatar =
document.createElement(
"div"
);



avatar.className =
"avatar";



avatar.textContent =
role==="user"
?
"👤"
:
"🤖";






const bubble =
document.createElement(
"div"
);



bubble.className =
"bubble";



bubble.textContent =
text;





box.appendChild(
avatar
);


box.appendChild(
bubble
);



chat.appendChild(
box
);



chat.scrollTop =
chat.scrollHeight;




if(save){


currentChat.push({

role:role,

text:text

});


}



}





/* ==============================
   CHARGER HISTORIQUE
============================== */


function loadHistory(){


if(!historyList)return;



historyList.innerHTML="";



conversations
.slice()
.reverse()
.forEach(
(chatItem,index)=>{



let item =
document.createElement(
"div"
);



item.className =
"history-item";



let title =
chatItem.messages?.[0]?.text
||
"Nouvelle discussion";



item.textContent =
"💬 "+title.substring(0,25);



item.onclick=()=>{


currentChat =
chatItem.messages
||
[];




if(chat){


chat.innerHTML="";


currentChat.forEach(msg=>{


addMessage(
msg.text,
msg.role,
false
);


});


}


};



historyList.appendChild(
item
);



});


}






/* ==============================
   CHARGER PROJETS SIDEBAR
============================== */


function loadProjects(){


if(!projectList)return;



projectList.innerHTML="";



projects
.slice()
.reverse()
.forEach(project=>{


let item =
document.createElement(
"div"
);



item.className =
"history-item";



item.textContent =
"🚀 "+project.name;



projectList.appendChild(
item
);



});


}





loadHistory();

loadProjects();
/* =====================================================
   PARTIE 2/3
   GEMINI + CHAT SYSTEM
===================================================== */



/* ==============================
   APPEL GEMINI
============================== */




/* ==============================
   APPEL DAVBOT API
============================== */


async function askDoki(message){


const response = await fetch(
DAVBOT_API,
{
method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

message: message

})

}
);



const data = await response.json();



console.log(
"Réponse DAVBOT :",
data
);



if(!response.ok){

throw new Error(
data.message ||
"Erreur API DAVBOT"
);

}



return data.message;


}
/* ==============================
   INDICATEUR IA
============================== */


function showLoading(){


if(!chat)return null;



let box =
document.createElement(
"div"
);



box.className =
"message assistant";



box.id =
"davbot-loading";



box.innerHTML =

`

<div class="avatar">
🤖
</div>

<div class="bubble">

⏳ DAVBOT réfléchit...

</div>

`;



chat.appendChild(
box
);



chat.scrollTop =
chat.scrollHeight;



return box;


}






function removeLoading(){


let load =
document.getElementById(
"davbot-loading"
);



if(load){

load.remove();

}


}






/* ==============================
   ENVOYER MESSAGE
============================== */


async function sendMessage(){



if(!input)return;



let text =
input.value.trim();




if(!text)return;



addMessage(
text,
"user"
);



input.value="";





let loading =
showLoading();




try{


let answer =
await askGemini(
text
);



removeLoading();



addMessage(
answer,
"assistant"
);



saveCurrentChat();





}

catch(error){


removeLoading();



addMessage(

"❌ Erreur Gemini : "
+
error.message,

"assistant"

);


}





}








/* ==============================
   BOUTON ENVOYER
============================== */


if(sendButton){


sendButton.onclick =
sendMessage;


}







/* ==============================
   ENTER POUR ENVOYER
============================== */


if(input){



input.addEventListener(

"keydown",

function(e){



if(
e.key==="Enter"
&&
!e.shiftKey
){


e.preventDefault();


sendMessage();


}


}


);


}







/* ==============================
   SAUVEGARDE CHAT ACTUEL
============================== */


function saveCurrentChat(){



if(currentChat.length===0)
return;



let exists =
conversations.find(
c =>
c.messages === currentChat
);



if(!exists){



conversations.push({

date:
new Date()
.toLocaleString(),


messages:
currentChat


});



localStorage.setItem(

"davbot_history",

JSON.stringify(conversations)

);


loadHistory();


}



}








/* ==============================
   NOUVELLE DISCUSSION
============================== */


const newChatButton =
document.getElementById(
"newChat"
);



if(newChatButton){



newChatButton.onclick =
()=>{


if(currentChat.length){


saveCurrentChat();


}



currentChat=[];



if(chat){

chat.innerHTML="";

}



if(welcome){

welcome.style.display=
"flex";

}



};


}






/* ==============================
   SUGGESTIONS
============================== */


document
.querySelectorAll(
".suggestion"
)
.forEach(button=>{



button.onclick =
()=>{


let msg =
button.dataset.msg;



if(input){


input.value =
msg;


sendMessage();


}


};



});
/* =====================================================
   PARTIE 3/3
   DAVBOT PROJECT SYSTEM
===================================================== */



/* ==============================
   CREATION PROJET
============================== */


const createProjectButton =
document.getElementById(
"createProject"
);




if(createProjectButton){



createProjectButton.onclick =
async function(){



const name =
document.getElementById(
"projectName"
)
.value
.trim();



const type =
document.getElementById(
"projectType"
)
.value;



const description =
document.getElementById(
"projectDescription"
)
.value
.trim();





if(!name){


alert(
"⚠️ Donne un nom au projet"
);


return;


}




const result =
document.getElementById(
"projectResult"
);



result.innerHTML =

`

<h2>
🤖 DAVBOT travaille...
</h2>

<p>
Création du plan du projet...
</p>

`;







try{



const answer =
await askGemini(

`

Crée un projet professionnel.

Nom :
${name}


Type :
${type}


Description :
${description}



Donne :

1. Objectif du projet

2. Fonctionnalités principales

3. Technologies conseillées

4. Étapes de développement

5. Conseils pour réussir


Réponds clairement.

`

);







const project = {


name:name,


type:type,


description:description,


result:answer,


date:
new Date()
.toLocaleString()


};






projects.push(
project
);



localStorage.setItem(

"davbot_projects",

JSON.stringify(projects)

);



loadProjects();






result.innerHTML =

`

<h2>

🚀 ${name}

</h2>


<p>

${answer}

</p>

`;



}

catch(error){



result.innerHTML =

`

<h2>
❌ Erreur
</h2>

<p>
${error.message}
</p>

`;



}



};



}







/* ==============================
   AFFICHAGE PROJETS
============================== */


function displayProjects(){


if(!projectList)return;



projectList.innerHTML="";



projects
.slice()
.reverse()
.forEach(project=>{



const item =
document.createElement(
"div"
);



item.className =
"history-item";



item.innerHTML =

`

🚀 ${project.name}

`;



item.onclick =
()=>{



const result =
document.getElementById(
"projectResult"
);



if(result){



result.innerHTML =

`

<h2>

${project.name}

</h2>


<p>

${project.result}

</p>

`;



}



};



projectList.appendChild(
item
);



});



}






displayProjects();







/* ==============================
   RESTAURATION NOM
============================== */


document
.querySelectorAll(
"#userName"
)
.forEach(el=>{


el.textContent =
userName ||
"Utilisateur";


});






/* ==============================
   LOG
============================== */


console.log(

"🤖 DAVBOT AI prêt"

);
