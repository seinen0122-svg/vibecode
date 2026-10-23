import type { Track, QuizQuestion } from "../types/vibecode";

export const tracks: Track[] = [
  {id:"t1",title:"The Night We Met",artist:"Lord Huron",genre:"Indie folk",mood:["nostalgic","melancholic","late night"],energy:2,known:true,color:"linear-gradient(135deg,#193d55,#b26b79)"},
  {id:"t2",title:"Space Song",artist:"Beach House",genre:"Dream pop",mood:["dreamy","melancholic","late night"],energy:2,known:true,color:"linear-gradient(135deg,#25204c,#d16b94)"},
  {id:"t3",title:"Sweet Disposition",artist:"The Temper Trap",genre:"Indie rock",mood:["hopeful","energetic","nostalgic"],energy:4,known:true,color:"linear-gradient(135deg,#f5a16a,#624c87)"},
  {id:"t4",title:"Show Me How",artist:"Men I Trust",genre:"Dream pop",mood:["dreamy","romantic","late night"],energy:2,color:"linear-gradient(135deg,#0f6c73,#d8c7a0)"},
  {id:"t5",title:"My Love Mine All Mine",artist:"Mitski",genre:"Indie",mood:["romantic","melancholic"],energy:1,color:"linear-gradient(135deg,#a17a62,#252d3d)"},
  {id:"t6",title:"Glue",artist:"Bicep",genre:"Electronic",mood:["dreamy","energetic","late night"],energy:4,color:"linear-gradient(135deg,#e78a68,#613f92)"},
  {id:"t7",title:"Sunsetz",artist:"Cigarettes After Sex",genre:"Dream pop",mood:["romantic","late night","melancholic"],energy:1,color:"linear-gradient(135deg,#5e657a,#d8a6b7)"},
  {id:"t8",title:"Borderline",artist:"Tame Impala",genre:"Psychedelic pop",mood:["dreamy","hopeful"],energy:3,color:"linear-gradient(135deg,#e8a75e,#d46d6d)"},
  {id:"t9",title:"A Walk",artist:"Tycho",genre:"Ambient electronic",mood:["focus","dreamy","hopeful"],energy:3,color:"linear-gradient(135deg,#5aa5ad,#e6d6a6)"},
  {id:"t10",title:"Archie, Marry Me",artist:"Alvvays",genre:"Indie pop",mood:["hopeful","romantic","energetic"],energy:4,color:"linear-gradient(135deg,#c77a83,#e6c8a0)"},
  {id:"t11",title:"Tadow",artist:"Masego, FKJ",genre:"Jazz/R&B",mood:["romantic","dreamy"],energy:3,color:"linear-gradient(135deg,#264c42,#d5a15e)"},
  {id:"t12",title:"Aaj Jaane Ki Zid Na Karo",artist:"Farida Khanum",genre:"Ghazal",mood:["nostalgic","romantic","late night"],energy:1,color:"linear-gradient(135deg,#a04c47,#e2bd91)"},
  {id:"t13",title:"Iktara",artist:"Kavita Seth, Amit Trivedi",genre:"Hindi indie",mood:["hopeful","nostalgic","romantic"],energy:2,color:"linear-gradient(135deg,#d08c6e,#563f63)"},
  {id:"t14",title:"Kasoor",artist:"Prateek Kuhad",genre:"Hindi indie",mood:["melancholic","romantic","late night"],energy:2,color:"linear-gradient(135deg,#424c69,#d19a84)"},
  {id:"t15",title:"Katchi Sera",artist:"Sai Abhyankkar",genre:"Tamil pop",mood:["romantic","energetic"],energy:4,color:"linear-gradient(135deg,#d07a3c,#693b65)"},
  {id:"t16",title:"Enjoy the Silence",artist:"Depeche Mode",genre:"Alternative",mood:["late night","dreamy"],energy:3,color:"linear-gradient(135deg,#20212f,#887caa)"},
  {id:"t17",title:"Odyssey",artist:"HOME",genre:"Synthwave",mood:["focus","dreamy","hopeful"],energy:3,color:"linear-gradient(135deg,#e9a1c9,#414f9c)"},
  {id:"t18",title:"Kerala",artist:"Bonobo",genre:"Downtempo",mood:["focus","dreamy"],energy:3,color:"linear-gradient(135deg,#4a8077,#d5b782)"},
  {id:"t19",title:"Jashn-e-Bahaaraa",artist:"A. R. Rahman, Javed Ali",genre:"Hindi film",mood:["romantic","nostalgic"],energy:2,color:"linear-gradient(135deg,#ab9a67,#60466b)"},
  {id:"t20",title:"Sun Models",artist:"ODESZA, Madelyn Grant",genre:"Electronic",mood:["hopeful","energetic"],energy:4,color:"linear-gradient(135deg,#e7b56e,#4a7e88)"},
];

export const questions: QuizQuestion[] = [
  {title:"What are you feeling right now?", key:"mood", options:[["Happy & alive","hopeful"],["A little lost","melancholic"],["Nostalgic","nostalgic"],["Romantic","romantic"],["In my own world","dreamy"],["Need to focus","focus"]]},
  {title:"What should the music do?", key:"intent", options:[["Make me feel understood","melancholic"],["Help me escape","dreamy"],["Give me energy","energetic"],["Slow everything down","late night"],["Make the moment cinematic","romantic"]]},
  {title:"Choose your setting", key:"setting", options:[["2 AM, lights off","late night"],["Golden-hour drive","hopeful"],["Rainy window seat","melancholic"],["Friends, no plans","energetic"],["Quiet cafe","focus"]]},
  {title:"Pick your musical comfort zone", key:"genre", options:[["Indie & alternative","Indie"],["Hindi indie & classics","Hindi"],["Electronic & house","Electronic"],["Dream pop & shoegaze","Dream pop"],["Anything, surprise me","any"]]},
  {title:"How adventurous should we be?", key:"novelty", options:[["Keep it familiar","familiar"],["A balanced mix","balanced"],["Deep cuts only","adventurous"]]},
];
