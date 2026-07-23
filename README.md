import { useState, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// BASS BOSS by Camp & Cove — High School Team Edition
// Updated model: Boat Captain logging, Tournament Mode lockout, Review Mode
// ─────────────────────────────────────────────────────────────────────────────

const TEAM = {
  name:           "Cypress Creek Bass",
  school:         "Cypress Creek High School",
  mascot:         "Cougars",
  mascotEmoji:    "🐆",
  coach:          "Coach Dave Tanner",
  conference:     "THSBA District 7",
  season:         "2024–25",
  record:         "4-1",
  rankDistrict:   2,
  rankState:      14,
  primaryColor:   "#111008",
  accentColor:    "#c8a030",
  textOnPrimary:  "#f0e8c8",
};

// Tournament status: "upcoming" | "live" | "ended"
const TOURNAMENT = {
  name:             "District 7 Spring Qualifier",
  lake:             "Lake Fork",
  state:            "TX",
  date:             "May 3, 2025",
  status:           "live",   // change to "ended" to test Review Mode
  startTime:        "6:00 AM",
  endTime:          "2:00 PM",
  endsIn:           "2h 44m",
  format:           "2-angler boats · 5-fish limit · Catch & release",
  qualifying:       true,
  pointsAvailable:  150,
  limit:            5,
};

// Boats: each boat has a captain and a partner
const BOATS = [
  { id:"A1", captain:"Tyler Brooks",  partner:"Mason Reed",    captainGrade:11, partnerGrade:11 },
  { id:"A2", captain:"Jake Morales",  partner:"Cody Lane",     captainGrade:12, partnerGrade:12 },
  { id:"A3", captain:"Drew Callahan", partner:"Seth Kim",      captainGrade:10, partnerGrade:10 },
  { id:"A4", captain:"Ryan Odom",     partner:"Luis Vega",     captainGrade:9,  partnerGrade:9  },
];

const ROSTER = [
  { id:1, name:"Tyler Brooks",   grade:11, boat:"A1", role:"captain",  catches:3, weight:11.20, big:4.80, trend:"up",   topLure:"Senko",       topStructure:"Laydown",       bestCondition:"Full Moon · EXCELLENT",   seasonPts:420, events:5, avg:3.82, qualified:true,  bio:"2-year varsity · Team captain · Guntersville invite finalist" },
  { id:2, name:"Mason Reed",     grade:11, boat:"A1", role:"angler",   catches:2, weight: 8.45, big:4.10, trend:"up",   topLure:"Jig",         topStructure:"Brush Pile",    bestCondition:"Waxing Gibbous · MAJOR",  seasonPts:360, events:5, avg:2.98, qualified:true,  bio:"Finesse specialist · Strongest drop shot on the team" },
  { id:3, name:"Jake Morales",   grade:12, boat:"A2", role:"captain",  catches:2, weight: 7.30, big:4.90, trend:"same", topLure:"Drop Shot",   topStructure:"Creek Channel", bestCondition:"Fall · Morning MAJOR",    seasonPts:390, events:5, avg:3.21, qualified:true,  bio:"Senior captain · 3-year varsity · Big fish specialist" },
  { id:4, name:"Cody Lane",      grade:12, boat:"A2", role:"angler",   catches:1, weight: 3.20, big:3.20, trend:"down", topLure:"Crankbait",   topStructure:"Point",         bestCondition:"Spring · Full Moon",      seasonPts:290, events:5, avg:2.44, qualified:false, bio:"Power fishing specialist · Best at covering water fast" },
  { id:5, name:"Drew Callahan",  grade:10, boat:"A3", role:"captain",  catches:2, weight: 6.80, big:3.50, trend:"up",   topLure:"Spinnerbait", topStructure:"Grass/Weeds",   bestCondition:"Spring · Waxing Gibbous", seasonPts:310, events:4, avg:2.76, qualified:true,  bio:"Sophomore standout · Top 4 in only his 2nd season" },
  { id:6, name:"Seth Kim",       grade:10, boat:"A3", role:"angler",   catches:1, weight: 2.90, big:2.90, trend:"same", topLure:"Texas Rig",   topStructure:"Dock",          bestCondition:"Summer · Evening MINOR",  seasonPts:240, events:4, avg:2.10, qualified:false, bio:"Improving · Best dock-skipping accuracy on team" },
  { id:7, name:"Ryan Odom",      grade: 9, boat:"A4", role:"captain",  catches:0, weight: 0.00, big:0.00, trend:"down", topLure:"Topwater",    topStructure:"Flat",          bestCondition:"Fall · Dawn MAJOR",       seasonPts:140, events:3, avg:1.90, qualified:false, bio:"Freshman · Strong topwater game · High ceiling" },
  { id:8, name:"Luis Vega",      grade: 9, boat:"A4", role:"angler",   catches:1, weight: 3.10, big:3.10, trend:"up",   topLure:"Swimbait",    topStructure:"Open Water",    bestCondition:"Spring · EXCELLENT",      seasonPts:180, events:3, avg:2.20, qualified:false, bio:"Freshman · Natural instincts · Swimbaiter with big fish upside" },
];

const SEASON_STANDINGS = [
  { name:"Tyler Brooks",  grade:11, pts:420, events:5, big:5.40, avg:3.82, trend:"up"   },
  { name:"Jake Morales",  grade:12, pts:390, events:5, big:4.90, avg:3.21, trend:"same" },
  { name:"Mason Reed",    grade:11, pts:360, events:5, big:4.10, avg:2.98, trend:"up"   },
  { name:"Drew Callahan", grade:10, pts:310, events:4, big:3.80, avg:2.76, trend:"up"   },
  { name:"Cody Lane",     grade:12, pts:290, events:5, big:3.90, avg:2.44, trend:"down" },
  { name:"Seth Kim",      grade:10, pts:240, events:4, big:3.20, avg:2.10, trend:"same" },
  { name:"Luis Vega",     grade: 9, pts:180, events:3, big:3.10, avg:2.20, trend:"up"   },
  { name:"Ryan Odom",     grade: 9, pts:140, events:3, big:2.80, avg:1.90, trend:"same" },
];

// Sample catches for review mode demo
const SAMPLE_CATCHES = [
  { id:1, angler:"Tyler Brooks",  boat:"A1", weight:"4.80", lure:"Senko",       depth:"6",  structure:"Laydown",      time:"7:02 AM", period:"MAJOR", verifyCode:"FORK-25-T7K2", receiptId:"CC-T7K2AB", culled:false },
  { id:2, angler:"Mason Reed",    boat:"A1", weight:"4.10", lure:"Jig",         depth:"8",  structure:"Brush Pile",   time:"7:14 AM", period:"MAJOR", verifyCode:"FORK-25-M3P9", receiptId:"CC-M3P9CD", culled:false },
  { id:3, angler:"Tyler Brooks",  boat:"A1", weight:"3.20", lure:"Senko",       depth:"5",  structure:"Dock",         time:"7:41 AM", period:"MAJOR", verifyCode:"FORK-25-T8R1", receiptId:"CC-T8R1EF", culled:false },
  { id:4, angler:"Jake Morales",  boat:"A2", weight:"3.90", lure:"Drop Shot",   depth:"12", structure:"Creek Channel", time:"8:45 AM", period:"MINOR", verifyCode:"FORK-25-J4VQ", receiptId:"CC-J4VQGH", culled:false },
  { id:5, angler:"Drew Callahan", boat:"A3", weight:"3.50", lure:"Spinnerbait", depth:"4",  structure:"Grass/Weeds",  time:"8:22 AM", period:"MINOR", verifyCode:"FORK-25-D2NX", receiptId:"CC-D2NXIJ", culled:false },
  { id:6, angler:"Tyler Brooks",  boat:"A1", weight:"2.10", lure:"Crankbait",   depth:"9",  structure:"Point",        time:"9:10 AM", period:null,    verifyCode:"FORK-25-T9C3", receiptId:"CC-T9C3KL", culled:true,  culledAt:"9:45 AM" },
];

const SEASON_EVENTS = [
  { name:"Fall Classic",         lake:"Sam Rayburn", date:"Oct 12", place:1, pts:150, teamWeight:28.40 },
  { name:"Winter Invitational",  lake:"Lake Fork",   date:"Dec 7",  place:3, pts:110, teamWeight:22.10 },
  { name:"Spring Opener",        lake:"Toledo Bend", date:"Feb 22", place:2, pts:130, teamWeight:31.20 },
  { name:"District 7 Qualifier", lake:"Lake Texoma", date:"Mar 15", place:1, pts:150, teamWeight:34.80 },
  { name:"D7 Spring Qualifier",  lake:"Lake Fork",   date:"May 3",  place:null, pts:null, teamWeight:null, live:true },
];

// ── Design Tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:"#0a0900", card:"#111008", cardHi:"#1a1600",
  border:"#2a2000", borderHi:"#3a3000",
  blue:"#c8a030", blueDim:"#2a2000",
  gold:"#c8a030", goldDim:"#2a1a00",
  green:"#c8a030", greenDim:"#2a2000",
  red:"#ef4444", purple:"#f0c84a",
  text:"#f0e8c8", muted:"#a09060", dimmer:"#5a4820",
  font:"Georgia, 'Times New Roman', serif",
  mono:"monospace",
};

// ── Utilities ──────────────────────────────────────────────────────────────────
function generateVerifyCode(lakeName) {
  const prefix = lakeName.replace(/[^a-zA-Z]/g,"").toUpperCase().slice(0,4);
  const chars  = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rand   = Array.from({length:4},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
  return `${prefix}-25-${rand}`;
}
function getNow() {
  const now=new Date(), h=now.getHours(), m=now.getMinutes();
  const ampm=h>=12?"PM":"AM", hh=h===0?12:h>12?h-12:h;
  return `${hh}:${m.toString().padStart(2,"0")} ${ampm}`;
}

// ── Shared Atoms ───────────────────────────────────────────────────────────────
function LiveDot() {
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:"5px"}}>
      <span style={{width:"7px",height:"7px",borderRadius:"50%",background:C.red,display:"inline-block",animation:"pulse 1.4s ease-in-out infinite",boxShadow:`0 0 6px ${C.red}`}} />
      <span style={{fontSize:"9px",letterSpacing:"2px",color:C.red,fontWeight:"bold"}}>LIVE</span>
    </span>
  );
}
function Badge({label,color,border}) {
  return <span style={{background:`${color}18`,border:`1px solid ${border||color+"44"}`,borderRadius:"4px",padding:"2px 8px",fontSize:"9px",color,fontWeight:"bold",letterSpacing:"1.5px",textTransform:"uppercase"}}>{label}</span>;
}
function Trend({dir,size=12}) {
  if(dir==="up")   return <span style={{color:C.green, fontSize:`${size}px`}}>▲</span>;
  if(dir==="down") return <span style={{color:C.red,   fontSize:`${size}px`}}>▼</span>;
  return                  <span style={{color:C.dimmer,fontSize:`${size}px`}}>—</span>;
}
function RankBadge({rank,size=32}) {
  const colors={1:{bg:"#f0b42922",border:"#f0b429",text:"#f0b429"},2:{bg:"#9ab0c022",border:"#9ab0c0",text:"#9ab0c0"},3:{bg:"#cd7f3222",border:"#cd7f32",text:"#cd7f32"}};
  const c=colors[rank]||{bg:C.dimmer+"44",border:C.borderHi,text:C.muted};
  return <div style={{width:`${size}px`,height:`${size}px`,borderRadius:"50%",background:c.bg,border:`1px solid ${c.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:rank<=3?"13px":"11px",color:c.text,fontWeight:"bold",flexShrink:0}}>{rank<=3?["🥇","🥈","🥉"][rank-1]:rank}</div>;
}

// ── Mascot Header ──────────────────────────────────────────────────────────────
function MascotHeader({mini=false}) {
  if(mini) return (
    <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
      <div style={{width:"36px",height:"36px",borderRadius:"50%",background:`linear-gradient(135deg,${TEAM.primaryColor},#0a1830)`,border:`2px solid ${TEAM.accentColor}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",flexShrink:0,boxShadow:`0 0 12px ${TEAM.accentColor}44`}}>{TEAM.mascotEmoji}</div>
      <div>
        <div style={{fontSize:"9px",letterSpacing:"4px",color:C.muted,textTransform:"uppercase"}}>Bass Boss · Team Edition</div>
        <div style={{fontSize:"18px",color:C.text,lineHeight:1.2}}>{TEAM.name}</div>
      </div>
    </div>
  );
  return (
    <div style={{position:"relative",overflow:"hidden",borderRadius:"12px",marginBottom:"14px"}}>
      <div style={{background:`linear-gradient(135deg,${TEAM.primaryColor} 0%,#0a1020 60%,#08090d 100%)`,padding:"20px 18px 16px",borderRadius:"12px",border:`1px solid ${TEAM.accentColor}44`,position:"relative"}}>
        <div style={{position:"absolute",right:"-10px",top:"-10px",fontSize:"110px",opacity:0.07,lineHeight:1,userSelect:"none",pointerEvents:"none"}}>{TEAM.mascotEmoji}</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",position:"relative"}}>
          <div>
            <div style={{fontSize:"9px",letterSpacing:"4px",color:`${TEAM.accentColor}cc`,textTransform:"uppercase",marginBottom:"5px"}}>Bass Boss · Team Edition</div>
            <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
              <div style={{width:"50px",height:"50px",borderRadius:"50%",background:`linear-gradient(135deg,${TEAM.primaryColor},#0a1030)`,border:`2px solid ${TEAM.accentColor}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px",flexShrink:0,boxShadow:`0 0 20px ${TEAM.accentColor}55`}}>{TEAM.mascotEmoji}</div>
              <div>
                <div style={{fontSize:"21px",color:TEAM.textOnPrimary}}>{TEAM.name}</div>
                <div style={{fontSize:"11px",color:`${TEAM.textOnPrimary}88`,marginTop:"1px"}}>{TEAM.school}</div>
                <div style={{fontSize:"10px",color:`${TEAM.accentColor}cc`,marginTop:"1px"}}>{TEAM.conference} · {TEAM.season}</div>
              </div>
            </div>
          </div>
          <div style={{textAlign:"right",position:"relative"}}>
            {TOURNAMENT.status==="live" && <LiveDot />}
            <div style={{fontSize:"11px",color:`${TEAM.textOnPrimary}77`,marginTop:"4px"}}>{TOURNAMENT.name}</div>
            <div style={{display:"flex",gap:"5px",marginTop:"6px",justifyContent:"flex-end"}}>
              <span style={{background:`${TEAM.accentColor}22`,border:`1px solid ${TEAM.accentColor}66`,borderRadius:"4px",padding:"2px 8px",fontSize:"9px",color:TEAM.accentColor,fontWeight:"bold",letterSpacing:"1px"}}>District #{TEAM.rankDistrict}</span>
              <span style={{background:`${C.blue}22`,border:`1px solid ${C.blue}44`,borderRadius:"4px",padding:"2px 8px",fontSize:"9px",color:C.blue,fontWeight:"bold",letterSpacing:"1px"}}>State #{TEAM.rankState}</span>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:0,marginTop:"12px",background:"rgba(0,0,0,0.35)",borderRadius:"6px",overflow:"hidden",border:`1px solid ${TEAM.accentColor}22`}}>
          {[
            {value:TEAM.record,                                        label:"Record",      color:C.green},
            {value:`${ROSTER.reduce((s,a)=>s+parseFloat(a.weight),0).toFixed(1)} lbs`, label:"Team Today", color:TEAM.accentColor},
            {value:`${ROSTER.reduce((s,a)=>s+a.catches,0)}`,          label:"Fish Logged", color:C.text},
            {value:TOURNAMENT.status==="live"?TOURNAMENT.endsIn:"—",  label:"Remaining",   color:C.blue},
          ].map((s,i)=>(
            <div key={i} style={{flex:1,padding:"9px 6px",textAlign:"center",borderRight:i<3?`1px solid ${TEAM.accentColor}18`:"none"}}>
              <div style={{fontSize:"15px",color:s.color,fontWeight:"bold"}}>{s.value}</div>
              <div style={{fontSize:"7px",color:`${TEAM.textOnPrimary}55`,letterSpacing:"1px",marginTop:"2px",textTransform:"uppercase"}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Player Card ────────────────────────────────────────────────────────────────
function PlayerCard({angler,onClose}) {
  const rank     = SEASON_STANDINGS.findIndex(a=>a.name===angler.name)+1;
  const initials = angler.name.split(" ").map(n=>n[0]).join("");
  const [cardPhoto, setCardPhoto] = useState(null);
  const photoRef = useRef(null);

  const handleCardPhoto = (e) => {
    const file = e.target.files?.[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCardPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:"16px",backdropFilter:"blur(8px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{maxWidth:"320px",width:"100%",borderRadius:"14px",overflow:"hidden",boxShadow:`0 0 80px ${TEAM.accentColor}33,0 40px 80px rgba(0,0,0,0.9)`,fontFamily:C.font,animation:"cardPop 0.3s cubic-bezier(0.34,1.56,0.64,1)"}}>

        {/* ── Card top — full photo ── */}
        <div style={{position:"relative",height:"300px",background:`linear-gradient(160deg,${TEAM.primaryColor},#0a0900)`,overflow:"hidden"}}>

          {/* Photo or initials placeholder */}
          {cardPhoto ? (
            <img src={cardPhoto} alt={angler.name} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top",display:"block"}} />
          ) : (
            <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"12px"}}>
              <div style={{width:"100px",height:"100px",borderRadius:"50%",background:`linear-gradient(135deg,${TEAM.primaryColor},#0a0900)`,border:`3px solid ${TEAM.accentColor}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"36px",color:TEAM.accentColor,fontWeight:"bold"}}>
                {initials}
              </div>
              <div
                onClick={()=>photoRef.current?.click()}
                style={{background:`${TEAM.accentColor}18`,border:`1px dashed ${TEAM.accentColor}44`,borderRadius:"6px",padding:"8px 18px",cursor:"pointer",fontSize:"10px",color:TEAM.accentColor,letterSpacing:"1px",textTransform:"uppercase"}}
              >
                + Add Player Photo
              </div>
            </div>
          )}

          {/* Gradient overlay at bottom */}
          <div style={{position:"absolute",bottom:0,left:0,right:0,height:"140px",background:`linear-gradient(transparent,${TEAM.primaryColor}ee)`}} />

          {/* Team/season label top left */}
          <div style={{position:"absolute",top:"12px",left:"14px",fontSize:"8px",letterSpacing:"3px",color:`${TEAM.accentColor}cc`,textTransform:"uppercase"}}>
            {TEAM.name} · {TEAM.season}
          </div>

          {/* Rank badge top right */}
          <div style={{position:"absolute",top:"10px",right:"12px",background:"rgba(0,0,0,0.7)",border:`1px solid ${TEAM.accentColor}55`,borderRadius:"6px",padding:"4px 10px",textAlign:"center"}}>
            <div style={{fontSize:"18px",color:TEAM.accentColor,fontWeight:"bold",lineHeight:1}}>#{rank}</div>
            <div style={{fontSize:"7px",color:`${TEAM.accentColor}88`,letterSpacing:"1px"}}>SEASON</div>
          </div>

          {/* Change photo button if photo exists */}
          {cardPhoto && (
            <button onClick={()=>photoRef.current?.click()} style={{position:"absolute",top:"10px",left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,0.65)",border:`1px solid ${TEAM.accentColor}44`,borderRadius:"4px",padding:"4px 12px",cursor:"pointer",fontSize:"9px",color:TEAM.accentColor,letterSpacing:"1px",textTransform:"uppercase",fontFamily:C.font}}>
              Change Photo
            </button>
          )}

          {/* Name + role over gradient */}
          <div style={{position:"absolute",bottom:"14px",left:"14px",right:"14px"}}>
            <div style={{display:"flex",gap:"5px",marginBottom:"6px",flexWrap:"wrap"}}>
              {rank<=4 && <span style={{background:`${C.blue}55`,border:`1px solid ${C.blue}88`,borderRadius:"3px",padding:"2px 7px",fontSize:"8px",color:"#a0d0ff",letterSpacing:"1px",fontWeight:"bold"}}>★ STATE QUALIFIER</span>}
              {angler.role==="captain" && <span style={{background:`${C.purple}44`,border:`1px solid ${C.purple}66`,borderRadius:"3px",padding:"2px 7px",fontSize:"8px",color:`${C.purple}`,letterSpacing:"1px"}}>⚓ CAPTAIN</span>}
              {rank===1 && <span style={{background:`${TEAM.accentColor}33`,border:`1px solid ${TEAM.accentColor}66`,borderRadius:"3px",padding:"2px 7px",fontSize:"8px",color:TEAM.accentColor,letterSpacing:"1px"}}>TEAM LEADER</span>}
            </div>
            <div style={{fontSize:"26px",color:TEAM.textOnPrimary,lineHeight:1.1,fontWeight:"bold",textShadow:"0 2px 8px rgba(0,0,0,0.8)"}}>{angler.name}</div>
            <div style={{fontSize:"11px",color:`${TEAM.textOnPrimary}88`,marginTop:"3px"}}>Grade {angler.grade} · Boat {angler.boat} · {TEAM.school}</div>
          </div>

          {/* Hidden file input — camera OR library for player card (this is a portrait, not a catch) */}
          <input ref={photoRef} type="file" accept="image/*" onChange={handleCardPhoto} style={{display:"none"}} />
        </div>

        {/* ── Card bottom — compact stats ── */}
        <div style={{background:"#0e0d08",borderTop:`2px solid ${TEAM.accentColor}44`}}>

          {/* Key stats strip */}
          <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.border}`}}>
            {[
              {value:`${angler.seasonPts}`,label:"Season Pts", color:C.gold},
              {value:`${angler.weight}`,    label:"lbs Today",  color:C.gold},
              {value:`${angler.big}`,       label:"Big Fish",   color:C.gold},
              {value:`${angler.events}`,    label:"Events",     color:C.gold},
            ].map((s,i)=>(
              <div key={i} style={{flex:1,padding:"10px 4px",textAlign:"center",borderRight:i<3?`1px solid ${C.border}`:"none"}}>
                <div style={{fontSize:"16px",color:s.color,fontWeight:"bold",lineHeight:1}}>{s.value}</div>
                <div style={{fontSize:"7px",color:C.muted,marginTop:"3px",letterSpacing:"1px",textTransform:"uppercase"}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Scouting details — two columns */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0,borderBottom:`1px solid ${C.border}`}}>
            {[
              {label:"Top Lure",      value:angler.topLure},
              {label:"Top Structure", value:angler.topStructure},
              {label:"Season Avg",    value:`${angler.avg} lbs`},
              {label:"Best Period",   value:angler.bestCondition?.split("·")[1]?.trim()||"—"},
            ].map((s,i)=>(
              <div key={i} style={{padding:"8px 12px",borderRight:i%2===0?`1px solid ${C.border}`:"none",borderBottom:i<2?`1px solid ${C.border}`:"none"}}>
                <div style={{fontSize:"8px",color:C.dimmer,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"2px"}}>{s.label}</div>
                <div style={{fontSize:"12px",color:C.text}}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Scout notes */}
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`}}>
            <div style={{fontSize:"8px",color:`${TEAM.accentColor}88`,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"3px"}}>Scout Notes</div>
            <div style={{fontSize:"11px",color:`${TEAM.textOnPrimary}99`,fontStyle:"italic",lineHeight:1.5}}>{angler.bio}</div>
          </div>

          {/* Footer — Bass Boss branding */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 14px"}}>
            <div style={{fontSize:"9px",letterSpacing:"2px",color:C.dimmer,textTransform:"uppercase"}}>Bass Boss · by Camp & Cove</div>
            <button onClick={onClose} style={{background:"transparent",border:`1px solid ${TEAM.accentColor}33`,borderRadius:"4px",padding:"5px 14px",cursor:"pointer",color:`${TEAM.accentColor}88`,fontSize:"9px",letterSpacing:"2px",textTransform:"uppercase",fontFamily:C.font}}>Close</button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Roster Grid ────────────────────────────────────────────────────────────────
function RosterGrid() {
  const [selected,setSelected]=useState(null);
  return (
    <div style={{animation:"fadeUp 0.2s ease"}}>
      {selected && <PlayerCard angler={selected} onClose={()=>setSelected(null)} />}
      <div style={{fontSize:"9px",letterSpacing:"2px",color:C.muted,textTransform:"uppercase",marginBottom:"12px"}}>Team Roster · {ROSTER.length} Anglers — Tap for Player Card</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
        {ROSTER.map((angler,i)=>{
          const rank=SEASON_STANDINGS.findIndex(a=>a.name===angler.name)+1;
          const initials=angler.name.split(" ").map(n=>n[0]).join("");
          return (
            <div key={i} onClick={()=>setSelected(angler)} style={{background:`linear-gradient(160deg,${TEAM.primaryColor}88,#0e1019)`,border:`1px solid ${rank<=4?TEAM.accentColor+"44":C.border}`,borderRadius:"10px",overflow:"hidden",cursor:"pointer",transition:"transform 0.15s,border-color 0.15s"}}
              onMouseOver={e=>{e.currentTarget.style.borderColor=TEAM.accentColor+"88";e.currentTarget.style.transform="translateY(-2px)";}}
              onMouseOut={e=>{e.currentTarget.style.borderColor=rank<=4?TEAM.accentColor+"44":C.border;e.currentTarget.style.transform="translateY(0)";}}>
              <div style={{background:TEAM.primaryColor,padding:"10px 12px",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",right:"-8px",top:"-8px",fontSize:"44px",opacity:0.08,lineHeight:1}}>{TEAM.mascotEmoji}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",position:"relative"}}>
                  <div style={{width:"34px",height:"34px",borderRadius:"50%",background:"rgba(0,0,0,0.4)",border:`2px solid ${TEAM.accentColor}77`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",color:TEAM.accentColor,fontWeight:"bold"}}>{initials}</div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:"15px",color:TEAM.accentColor,fontWeight:"bold"}}>#{rank}</div>
                    {angler.role==="captain" && <div style={{fontSize:"7px",color:C.purple,letterSpacing:"1px"}}>CAPTAIN</div>}
                  </div>
                </div>
              </div>
              <div style={{padding:"10px 12px"}}>
                <div style={{fontSize:"13px",color:C.text,marginBottom:"1px"}}>{angler.name}</div>
                <div style={{fontSize:"10px",color:C.muted,marginBottom:"7px"}}>Gr {angler.grade} · {angler.topLure}</div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                  <div style={{textAlign:"center"}}><div style={{fontSize:"14px",color:C.green,fontWeight:"bold"}}>{angler.weight}</div><div style={{fontSize:"7px",color:C.muted}}>lbs today</div></div>
                  <div style={{textAlign:"center"}}><div style={{fontSize:"14px",color:TEAM.accentColor,fontWeight:"bold"}}>{angler.big}</div><div style={{fontSize:"7px",color:C.muted}}>big fish</div></div>
                  <div style={{textAlign:"center"}}><div style={{fontSize:"14px",color:C.text}}>{angler.seasonPts}</div><div style={{fontSize:"7px",color:C.muted}}>season pts</div></div>
                </div>
                <div style={{display:"flex",gap:"3px",marginTop:"4px"}}>
                  {[...Array(5)].map((_,fi)=>(
                    <div key={fi} style={{flex:1,height:"3px",borderRadius:"2px",background:fi<angler.catches?C.green:C.border,boxShadow:fi<angler.catches?`0 0 4px ${C.green}88`:"none"}} />
                  ))}
                </div>
                <div style={{fontSize:"7px",color:C.muted,marginTop:"3px"}}>{angler.catches}/5 fish</div>
                {rank<=4 && <div style={{marginTop:"6px",background:`${C.blue}18`,border:`1px solid ${C.blue}33`,borderRadius:"4px",padding:"2px 6px",display:"inline-block",fontSize:"7px",color:C.blue,letterSpacing:"1px",fontWeight:"bold"}}>STATE QUALIFIER</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Photo Capture ─────────────────────────────────────────────────────────────
// CAMERA ONLY — no library access. capture="environment" forces the rear camera.
// This is intentional: upload from library defeats the verify code integrity.
// A captain must photograph the live fish in the boat at the moment of logging.
function PhotoCapture({photo,onPhoto}) {
  const cameraRef=useRef(null);
  const handleFile=(e)=>{
    const file=e.target.files?.[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=(ev)=>onPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };
  return (
    <div style={{marginBottom:"14px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"7px"}}>
        <div style={{fontSize:"9px",letterSpacing:"2px",color:C.muted,textTransform:"uppercase"}}>Catch Photo</div>
        <div style={{fontSize:"9px",color:C.dimmer,display:"flex",alignItems:"center",gap:"4px"}}>
          <span>📷</span> Live camera only
        </div>
      </div>
      {photo ? (
        <div style={{position:"relative",borderRadius:"8px",overflow:"hidden",border:`1px solid ${C.gold}44`}}>
          <img src={photo} alt="Catch" style={{width:"100%",maxHeight:"220px",objectFit:"cover",display:"block"}} />
          <div style={{position:"absolute",inset:0,background:"linear-gradient(transparent 55%,rgba(0,0,0,0.85))"}} />
          {/* Live photo badge */}
          <div style={{position:"absolute",top:"10px",left:"10px",background:"rgba(0,0,0,0.7)",border:`1px solid ${C.gold}55`,borderRadius:"4px",padding:"3px 8px",display:"flex",alignItems:"center",gap:"5px"}}>
            <div style={{width:"6px",height:"6px",borderRadius:"50%",background:C.red,animation:"pulse 1.4s ease-in-out infinite"}} />
            <span style={{fontSize:"9px",color:C.gold,letterSpacing:"1px",fontWeight:"bold"}}>LIVE PHOTO</span>
          </div>
          <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:"10px",color:"rgba(255,255,255,0.6)"}}>✓ Photo locked to catch</span>
            <button
              onClick={()=>{onPhoto(null);if(cameraRef.current)cameraRef.current.value="";}}
              style={{background:"rgba(0,0,0,0.6)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:"4px",padding:"5px 12px",color:"rgba(255,255,255,0.8)",cursor:"pointer",fontSize:"10px",fontFamily:C.font}}
            >
              Retake
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={()=>cameraRef.current?.click()}
          style={{background:"#08090d",border:`2px dashed ${C.borderHi}`,borderRadius:"8px",padding:"28px 16px",display:"flex",flexDirection:"column",alignItems:"center",gap:"10px",cursor:"pointer",transition:"border-color 0.2s"}}
          onMouseOver={e=>e.currentTarget.style.borderColor=C.gold}
          onMouseOut={e=>e.currentTarget.style.borderColor=C.borderHi}
        >
          <div style={{width:"56px",height:"56px",borderRadius:"50%",background:`${C.gold}14`,border:`2px solid ${C.gold}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px"}}>📷</div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:"13px",color:C.text,marginBottom:"4px",fontWeight:"500"}}>Take a photo of the fish</div>
            <div style={{fontSize:"11px",color:C.muted}}>Rear camera opens automatically</div>
          </div>
          <div style={{background:`${C.gold}10`,border:`1px solid ${C.gold}22`,borderRadius:"4px",padding:"5px 12px",fontSize:"9px",color:C.gold,letterSpacing:"1px",textTransform:"uppercase"}}>
            Camera required · No uploads allowed
          </div>
        </div>
      )}
      {/* capture="environment" = rear camera. No accept="image/*" alone — must use capture to block library */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={{display:"none"}}
      />
    </div>
  );
}

// ── Cull Mode ──────────────────────────────────────────────────────────────────
function CullMode({catches,newCatch,onCull,onCancel}) {
  const [selected,setSelected]=useState(null);
  const active=catches.filter(c=>!c.culled).sort((a,b)=>parseFloat(a.weight)-parseFloat(b.weight));
  const activeWeight=active.reduce((s,c)=>s+parseFloat(c.weight||0),0);
  const newWeight=parseFloat(newCatch.weight||0);
  const gain=selected?(newWeight-parseFloat(selected.weight)).toFixed(2):null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.94)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:"16px",backdropFilter:"blur(6px)"}}>
      <div style={{background:C.card,border:`1px solid ${C.red}44`,borderRadius:"14px",maxWidth:"360px",width:"100%",overflow:"hidden",boxShadow:`0 0 60px ${C.red}18,0 30px 60px rgba(0,0,0,0.8)`,fontFamily:C.font,animation:"cardPop 0.3s cubic-bezier(0.34,1.56,0.64,1)",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{background:"linear-gradient(135deg,#1a0808,#0e0a0a)",borderBottom:`1px solid ${C.red}33`,padding:"16px 18px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px"}}>
            <span style={{fontSize:"20px"}}>⚖️</span>
            <div>
              <div style={{fontSize:"14px",color:C.red,letterSpacing:"1px"}}>Limit Reached — Cull Required</div>
              <div style={{fontSize:"11px",color:C.muted,marginTop:"1px"}}>Select a fish from your bag to release.</div>
            </div>
          </div>
          <div style={{background:`${C.green}12`,border:`1px solid ${C.green}33`,borderRadius:"8px",padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:"9px",color:C.green,letterSpacing:"2px",textTransform:"uppercase"}}>New Fish</div>
              <div style={{fontSize:"20px",color:C.green,fontWeight:"bold"}}>{newCatch.weight} lbs</div>
              <div style={{fontSize:"10px",color:C.muted}}>{newCatch.angler} · {newCatch.lure||"—"}</div>
            </div>
            <div style={{fontSize:"32px"}}>🐟</div>
          </div>
        </div>
        <div style={{padding:"14px 18px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"10px"}}>
            <div style={{fontSize:"9px",letterSpacing:"2px",color:C.muted,textTransform:"uppercase"}}>Current Bag · Tap to Release</div>
            <div style={{fontSize:"11px",color:C.text}}>{activeWeight.toFixed(2)} lbs</div>
          </div>
          {active.map((c,i)=>{
            const isSel=selected?.id===c.id;
            const wouldGain=newWeight>parseFloat(c.weight);
            return (
              <div key={i} onClick={()=>setSelected(isSel?null:c)} style={{background:isSel?`${C.red}18`:wouldGain?`${C.green}08`:C.cardHi,border:`1px solid ${isSel?C.red+"66":wouldGain?C.green+"33":C.border}`,borderRadius:"8px",padding:"10px 12px",marginBottom:"8px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",transition:"all 0.15s"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{fontSize:"18px"}}>{isSel?"🔄":"🐟"}</span>
                  <div>
                    <div style={{fontSize:"14px",color:isSel?C.red:C.text,fontWeight:isSel?"bold":"normal"}}>{c.weight} lbs · {c.angler}</div>
                    <div style={{fontSize:"10px",color:C.muted}}>{c.lure||"—"} · {c.time}</div>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  {wouldGain&&!isSel && <div style={{fontSize:"10px",color:C.green}}>+{(newWeight-parseFloat(c.weight)).toFixed(2)} lbs</div>}
                  {isSel && <div style={{fontSize:"10px",color:C.red}}>Release</div>}
                </div>
              </div>
            );
          })}
          {selected && (
            <div style={{background:parseFloat(gain)>0?`${C.green}12`:`${C.red}12`,border:`1px solid ${parseFloat(gain)>0?C.green:C.red}33`,borderRadius:"8px",padding:"10px 12px",marginBottom:"12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:"11px",color:C.muted}}>{activeWeight.toFixed(2)} → {(activeWeight-parseFloat(selected.weight)+newWeight).toFixed(2)} lbs</div>
              <div style={{fontSize:"20px",color:parseFloat(gain)>0?C.green:C.red,fontWeight:"bold"}}>{parseFloat(gain)>0?"+":""}{gain} lbs</div>
            </div>
          )}
          <div style={{display:"flex",gap:"8px"}}>
            <button onClick={()=>selected&&onCull(selected.id)} style={{flex:1,background:selected?C.red:C.border,border:"none",color:selected?"#fff":C.muted,padding:"12px",borderRadius:"6px",cursor:selected?"pointer":"default",fontSize:"11px",letterSpacing:"1px",textTransform:"uppercase",fontWeight:"bold",fontFamily:C.font}}>Release + Keep New</button>
            <button onClick={onCancel} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,padding:"12px 14px",borderRadius:"6px",cursor:"pointer",fontFamily:C.font,fontSize:"11px"}}>Cancel</button>
          </div>
          <div style={{marginTop:"10px",textAlign:"center",fontSize:"9px",color:C.dimmer,fontStyle:"italic"}}>Released fish marked CULLED in audit log · Verify code preserved</div>
        </div>
      </div>
    </div>
  );
}

// ── Receipt Card ───────────────────────────────────────────────────────────────
function ReceiptCard({catch:c,onClose}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:"16px",backdropFilter:"blur(6px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#0a0e0a",border:`1px solid ${C.green}44`,borderRadius:"14px",maxWidth:"340px",width:"100%",overflow:"hidden",boxShadow:`0 0 60px ${C.green}18,0 30px 60px rgba(0,0,0,0.8)`,fontFamily:C.font,maxHeight:"92vh",overflowY:"auto",animation:"cardPop 0.3s cubic-bezier(0.34,1.56,0.64,1)"}}>
        {c.photo ? (
          <div style={{position:"relative"}}>
            <img src={c.photo} alt="" style={{width:"100%",height:"190px",objectFit:"cover",display:"block"}} />
            <div style={{position:"absolute",inset:0,background:"linear-gradient(transparent 50%,#0a0e0a)"}} />
            <div style={{position:"absolute",top:"10px",left:"12px",fontSize:"8px",letterSpacing:"3px",color:"rgba(200,232,208,0.85)",textTransform:"uppercase",display:"flex",alignItems:"center",gap:"5px"}}><span>{TEAM.mascotEmoji}</span>{TEAM.name}</div>
            {c.verifyCode && <div style={{position:"absolute",top:"10px",right:"12px",background:"rgba(0,0,0,0.75)",border:`1px solid ${C.green}44`,borderRadius:"4px",padding:"3px 8px"}}><div style={{fontSize:"9px",color:C.green,fontFamily:C.mono,letterSpacing:"1px"}}>{c.verifyCode}</div></div>}
          </div>
        ) : (
          <div style={{background:`linear-gradient(135deg,${TEAM.primaryColor},#08090d)`,padding:"18px 20px",textAlign:"center",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",right:"-10px",bottom:"-10px",fontSize:"80px",opacity:0.06}}>{TEAM.mascotEmoji}</div>
            <div style={{fontSize:"8px",letterSpacing:"4px",color:`${TEAM.accentColor}99`,textTransform:"uppercase",marginBottom:"4px"}}>{TEAM.name}</div>
            <div style={{fontSize:"18px",color:C.text}}>Catch Receipt</div>
            <div style={{fontSize:"10px",color:`${TEAM.accentColor}77`,marginTop:"3px",fontStyle:"italic"}}>Built for the Bite</div>
          </div>
        )}
        <div style={{background:"linear-gradient(90deg,#100e00,#08090d,#100e00)",padding:"14px 20px",textAlign:"center",borderBottom:`1px solid ${C.border}`}}>
          <div style={{fontSize:"30px",color:C.green,fontWeight:"bold"}}>{c.weight?`${c.weight} lbs`:c.length?`${c.length}"`:"Caught"}</div>
          {c.weight&&c.length&&<div style={{fontSize:"11px",color:C.muted,marginTop:"1px"}}>{c.length}" · {c.weight} lbs</div>}
          <div style={{fontSize:"12px",color:"#c0a040",marginTop:"2px"}}>Largemouth Bass · {c.lake||c.boat}</div>
        </div>
        <div style={{padding:"12px 20px"}}>
          {[{label:"Angler",value:c.angler||"—"},{label:"Boat",value:c.boat||"—"},{label:"Time",value:c.time||"—"},{label:"Lure",value:c.lure||"—"},{label:"Depth",value:c.depth?`${c.depth} ft`:"—"},{label:"Structure",value:c.structure||"—"}].map((row,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",padding:"5px 0",borderBottom:i<5?`1px dashed ${C.border}`:"none"}}>
              <span style={{fontSize:"9px",letterSpacing:"2px",color:C.muted,textTransform:"uppercase"}}>{row.label}</span>
              <span style={{fontSize:"13px",color:C.text,textAlign:"right",maxWidth:"55%"}}>{row.value}</span>
            </div>
          ))}
        </div>
        {c.verifyCode && (
          <div style={{background:"#060a06",padding:"14px 20px",textAlign:"center",borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`}}>
            <div style={{fontSize:"8px",letterSpacing:"3px",color:C.dimmer,textTransform:"uppercase",marginBottom:"6px"}}>Verification Code</div>
            <div style={{fontSize:"22px",color:C.green,fontFamily:C.mono,letterSpacing:"5px",fontWeight:"bold"}}>{c.verifyCode}</div>
            <div style={{fontSize:"8px",color:C.dimmer,marginTop:"5px"}}>{c.timestamp?`Logged ${c.timestamp} · `:""}Timestamp locked</div>
            {c.culled && <div style={{marginTop:"6px"}}><Badge label="Culled" color={C.muted} /></div>}
          </div>
        )}
        <div style={{padding:"12px 20px",textAlign:"center"}}>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid ${C.borderHi}`,color:C.muted,padding:"8px 24px",borderRadius:"4px",cursor:"pointer",fontSize:"10px",letterSpacing:"2px",textTransform:"uppercase",fontFamily:C.font}}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Emergency System ──────────────────────────────────────────────────────────
function EmergencyButton({ boat, onAlert }) {
  const [phase, setPhase]       = useState("idle");   // idle | confirm | locating | sent
  const [holdTimer, setHoldTimer] = useState(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [location, setLocation] = useState(null);
  const intervalRef = useRef(null);

  const startHold = () => {
    if (phase !== "confirm") return;
    let progress = 0;
    intervalRef.current = setInterval(() => {
      progress += 3.33; // 100% in ~3 seconds
      setHoldProgress(progress);
      if (progress >= 100) {
        clearInterval(intervalRef.current);
        fireAlert();
      }
    }, 100);
  };

  const cancelHold = () => {
    clearInterval(intervalRef.current);
    setHoldProgress(0);
  };

  const fireAlert = () => {
    setPhase("locating");
    setHoldProgress(0);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            lat:  pos.coords.latitude.toFixed(6),
            lng:  pos.coords.longitude.toFixed(6),
            acc:  Math.round(pos.coords.accuracy),
            time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }),
          };
          setLocation(loc);
          setPhase("sent");
          onAlert({ boat, location: loc, timestamp: new Date().toISOString() });
        },
        () => {
          // GPS failed — send alert without coords
          const loc = { lat: "GPS unavailable", lng: "", acc: null, time: getNow() };
          setLocation(loc);
          setPhase("sent");
          onAlert({ boat, location: loc, timestamp: new Date().toISOString() });
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      const loc = { lat: "GPS not supported", lng: "", acc: null, time: getNow() };
      setLocation(loc);
      setPhase("sent");
      onAlert({ boat, location: loc, timestamp: new Date().toISOString() });
    }
  };

  const reset = () => { setPhase("idle"); setLocation(null); setHoldProgress(0); };

  // ── Sent confirmation ──
  if (phase === "sent") return (
    <div style={{ background: "#1a0808", border: `2px solid ${C.red}`, borderRadius: "12px", padding: "20px", marginBottom: "14px", animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
        <span style={{ fontSize: "26px" }}>🚨</span>
        <div>
          <div style={{ fontSize: "15px", color: C.red, fontWeight: "bold", letterSpacing: "1px" }}>EMERGENCY ALERT SENT</div>
          <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>Coach has been notified · {location?.time}</div>
        </div>
      </div>
      <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: "8px", padding: "12px 14px", marginBottom: "14px" }}>
        <div style={{ fontSize: "9px", letterSpacing: "2px", color: C.muted, textTransform: "uppercase", marginBottom: "6px" }}>Alert Details Sent</div>
        <div style={{ fontSize: "12px", color: C.text, marginBottom: "3px" }}>🚤 Boat {boat.id} · {boat.captain} & {boat.partner}</div>
        {location?.lat !== "GPS unavailable" && location?.lat !== "GPS not supported" ? (
          <>
            <div style={{ fontSize: "12px", color: C.text, marginBottom: "3px" }}>📍 {location?.lat}, {location?.lng}</div>
            {location?.acc && <div style={{ fontSize: "11px", color: C.muted }}>Accuracy: ±{location?.acc}m</div>}
            <a
              href={`https://maps.apple.com/?q=${location?.lat},${location?.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-block", marginTop: "8px", background: C.red, color: "#fff", padding: "8px 16px", borderRadius: "6px", fontSize: "11px", letterSpacing: "1px", textDecoration: "none", fontFamily: C.font }}
            >
              Open in Maps →
            </a>
          </>
        ) : (
          <div style={{ fontSize: "11px", color: C.red }}>⚠️ {location?.lat} — relay your position verbally</div>
        )}
      </div>
      <div style={{ fontSize: "11px", color: C.muted, textAlign: "center", marginBottom: "12px", lineHeight: 1.6 }}>
        Stay calm · Stay with the boat · The coach is on their way
      </div>
      <button onClick={reset} style={{ width: "100%", background: "transparent", border: `1px solid ${C.border}`, color: C.muted, padding: "10px", borderRadius: "6px", cursor: "pointer", fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", fontFamily: C.font }}>
        Dismiss
      </button>
    </div>
  );

  // ── Locating ──
  if (phase === "locating") return (
    <div style={{ background: "#1a0808", border: `2px solid ${C.red}66`, borderRadius: "12px", padding: "20px", marginBottom: "14px", textAlign: "center" }}>
      <div style={{ fontSize: "28px", marginBottom: "10px", animation: "pulse 1s ease-in-out infinite" }}>📍</div>
      <div style={{ fontSize: "14px", color: C.red }}>Getting GPS location…</div>
      <div style={{ fontSize: "11px", color: C.muted, marginTop: "4px" }}>Sending alert to coach</div>
    </div>
  );

  // ── Confirm (hold to confirm) ──
  if (phase === "confirm") return (
    <div style={{ background: "#1a0808", border: `2px solid ${C.red}`, borderRadius: "12px", padding: "18px", marginBottom: "14px", animation: "fadeUp 0.2s ease" }}>
      <div style={{ fontSize: "12px", color: C.red, letterSpacing: "1px", textAlign: "center", marginBottom: "14px" }}>
        ⚠️ HOLD BUTTON TO CONFIRM EMERGENCY
      </div>
      {/* Hold button with progress fill */}
      <div style={{ position: "relative", marginBottom: "12px", borderRadius: "10px", overflow: "hidden", border: `2px solid ${C.red}` }}>
        {/* Progress fill */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${holdProgress}%`, background: `${C.red}44`, transition: "none" }} />
        <button
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={startHold}
          onTouchEnd={cancelHold}
          style={{ position: "relative", width: "100%", background: "transparent", border: "none", padding: "18px", cursor: "pointer", fontFamily: C.font, color: C.red, fontSize: "14px", letterSpacing: "2px", textTransform: "uppercase", fontWeight: "bold", zIndex: 1 }}
        >
          🚨 HOLD 3 SECONDS TO SEND ALERT
        </button>
      </div>
      <button onClick={reset} style={{ width: "100%", background: "transparent", border: `1px solid ${C.border}`, color: C.muted, padding: "10px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontFamily: C.font }}>
        Cancel
      </button>
    </div>
  );

  // ── Idle ──
  return (
    <button
      onClick={() => setPhase("confirm")}
      style={{ width: "100%", background: "linear-gradient(135deg,#1a0808,#120606)", border: `1px solid ${C.red}55`, borderRadius: "10px", padding: "14px 18px", marginBottom: "14px", cursor: "pointer", fontFamily: C.font, display: "flex", alignItems: "center", gap: "14px" }}
      onMouseOver={e => e.currentTarget.style.borderColor = C.red}
      onMouseOut={e => e.currentTarget.style.borderColor = `${C.red}55`}
    >
      <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: `${C.red}22`, border: `2px solid ${C.red}66`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>🆘</div>
      <div style={{ textAlign: "left" }}>
        <div style={{ fontSize: "13px", color: C.red, fontWeight: "bold", letterSpacing: "1px" }}>EMERGENCY</div>
        <div style={{ fontSize: "10px", color: C.muted, marginTop: "2px" }}>Sends GPS + alert to coach instantly</div>
      </div>
    </button>
  );
}

// ── Emergency Alert Overlay (Coach view) ──────────────────────────────────────
function EmergencyAlert({ alert, onDismiss }) {
  const mapsUrl = alert.location?.lat && !alert.location.lat.includes("unavailable") && !alert.location.lat.includes("not supported")
    ? `https://maps.apple.com/?q=${alert.location.lat},${alert.location.lng}`
    : null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "16px", backdropFilter: "blur(4px)", animation: "fadeUp 0.2s ease" }}>
      <div style={{ background: "#0e0505", border: `3px solid ${C.red}`, borderRadius: "16px", maxWidth: "380px", width: "100%", overflow: "hidden", boxShadow: `0 0 80px ${C.red}44, 0 30px 60px rgba(0,0,0,0.9)`, fontFamily: C.font, animation: "emergencyPulse 1.5s ease-in-out infinite" }}>

        {/* Header */}
        <div style={{ background: C.red, padding: "16px 20px", textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "6px" }}>🚨</div>
          <div style={{ fontSize: "20px", color: "#fff", fontWeight: "bold", letterSpacing: "2px" }}>EMERGENCY ALERT</div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)", marginTop: "3px" }}>Received {new Date(alert.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}</div>
        </div>

        {/* Boat info */}
        <div style={{ padding: "18px 20px" }}>
          <div style={{ background: "rgba(255,0,0,0.08)", border: `1px solid ${C.red}33`, borderRadius: "10px", padding: "14px 16px", marginBottom: "14px" }}>
            <div style={{ fontSize: "9px", letterSpacing: "2px", color: C.muted, textTransform: "uppercase", marginBottom: "8px" }}>Boat in Distress</div>
            <div style={{ fontSize: "20px", color: C.text, marginBottom: "4px" }}>🚤 Boat {alert.boat.id}</div>
            <div style={{ fontSize: "14px", color: C.muted }}>⚓ {alert.boat.captain}</div>
            <div style={{ fontSize: "14px", color: C.muted, marginTop: "2px" }}>🎣 {alert.boat.partner}</div>
          </div>

          {/* Location */}
          <div style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${C.border}`, borderRadius: "10px", padding: "14px 16px", marginBottom: "16px" }}>
            <div style={{ fontSize: "9px", letterSpacing: "2px", color: C.muted, textTransform: "uppercase", marginBottom: "8px" }}>Last Known Location</div>
            {mapsUrl ? (
              <>
                <div style={{ fontSize: "13px", color: C.text, fontFamily: C.mono, marginBottom: "4px" }}>
                  📍 {alert.location.lat}, {alert.location.lng}
                </div>
                {alert.location.acc && (
                  <div style={{ fontSize: "11px", color: C.muted, marginBottom: "10px" }}>GPS accuracy: ±{alert.location.acc}m</div>
                )}
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "block", background: C.red, color: "#fff", padding: "13px", borderRadius: "8px", fontSize: "13px", letterSpacing: "2px", textDecoration: "none", textAlign: "center", fontFamily: C.font, fontWeight: "bold" }}
                >
                  📍 OPEN IN MAPS
                </a>
              </>
            ) : (
              <div style={{ fontSize: "12px", color: C.red }}>⚠️ GPS unavailable — contact boat by radio</div>
            )}
          </div>

          {/* Action checklist */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "9px", letterSpacing: "2px", color: C.muted, textTransform: "uppercase", marginBottom: "10px" }}>Immediate Actions</div>
            {[
              "Call 911 if life-threatening",
              "Contact tournament director",
              "Dispatch nearest boat to location",
              "Note time and conditions",
            ].map((action, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 0", borderBottom: i < 3 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: `${C.red}22`, border: `1px solid ${C.red}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: C.red, flexShrink: 0, fontWeight: "bold" }}>{i + 1}</div>
                <div style={{ fontSize: "12px", color: C.text }}>{action}</div>
              </div>
            ))}
          </div>

          <button
            onClick={onDismiss}
            style={{ width: "100%", background: "transparent", border: `1px solid ${C.red}44`, color: C.red, padding: "12px", borderRadius: "8px", cursor: "pointer", fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", fontFamily: C.font }}
          >
            Acknowledge &amp; Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Need Help System ──────────────────────────────────────────────────────────
const HELP_REASONS = [
  { icon: "🔧", label: "Engine / Motor trouble" },
  { icon: "⛽", label: "Out of fuel" },
  { icon: "💧", label: "Taking on water" },
  { icon: "🔋", label: "Dead battery" },
  { icon: "🪝", label: "Prop / trolling motor snagged" },
  { icon: "🧭", label: "Lost / need directions" },
  { icon: "🤒", label: "Minor injury — not emergency" },
  { icon: "📦", label: "Other issue" },
];

function NeedHelpButton({ boat, onAlert }) {
  const [phase, setPhase]       = useState("idle");   // idle | reason | locating | sent
  const [reason, setReason]     = useState(null);
  const [note, setNote]         = useState("");
  const [location, setLocation] = useState(null);

  const fireAlert = () => {
    setPhase("locating");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            lat:  pos.coords.latitude.toFixed(6),
            lng:  pos.coords.longitude.toFixed(6),
            acc:  Math.round(pos.coords.accuracy),
            time: getNow(),
          };
          setLocation(loc);
          setPhase("sent");
          onAlert({ boat, reason, note, location: loc, timestamp: new Date().toISOString() });
        },
        () => {
          const loc = { lat: "GPS unavailable", lng: "", acc: null, time: getNow() };
          setLocation(loc);
          setPhase("sent");
          onAlert({ boat, reason, note, location: loc, timestamp: new Date().toISOString() });
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      const loc = { lat: "GPS not supported", lng: "", acc: null, time: getNow() };
      setLocation(loc);
      setPhase("sent");
      onAlert({ boat, reason, note, location: loc, timestamp: new Date().toISOString() });
    }
  };

  const reset = () => { setPhase("idle"); setReason(null); setNote(""); setLocation(null); };

  // ── Sent ──
  if (phase === "sent") return (
    <div style={{ background: "#0e1208", border: `2px solid ${C.gold}`, borderRadius: "10px", padding: "16px 18px", marginBottom: "14px", animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <span style={{ fontSize: "22px" }}>✅</span>
        <div>
          <div style={{ fontSize: "14px", color: C.gold, fontWeight: "bold" }}>Help Request Sent</div>
          <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>Coach notified · {location?.time}</div>
        </div>
      </div>
      <div style={{ background: "rgba(0,0,0,0.35)", borderRadius: "8px", padding: "12px 14px", marginBottom: "12px" }}>
        <div style={{ fontSize: "13px", color: C.text, marginBottom: "4px" }}>{reason?.icon} {reason?.label}</div>
        {note && <div style={{ fontSize: "11px", color: C.muted, marginBottom: "4px", fontStyle: "italic" }}>"{note}"</div>}
        {location?.lat && !location.lat.includes("unavailable") ? (
          <>
            <div style={{ fontSize: "11px", color: C.text, fontFamily: C.mono, marginTop: "6px" }}>📍 {location.lat}, {location.lng}</div>
            <a href={`https://maps.apple.com/?q=${location.lat},${location.lng}`} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-block", marginTop: "8px", background: C.gold, color: "#1a0a00", padding: "7px 14px", borderRadius: "5px", fontSize: "11px", letterSpacing: "1px", textDecoration: "none", fontFamily: C.font, fontWeight: "bold" }}>
              Open in Maps →
            </a>
          </>
        ) : (
          <div style={{ fontSize: "11px", color: C.muted, marginTop: "4px" }}>GPS unavailable — coach will contact you</div>
        )}
      </div>
      <div style={{ fontSize: "11px", color: C.muted, textAlign: "center", marginBottom: "10px" }}>Stay with the boat · Coach is on the way</div>
      <button onClick={reset} style={{ width: "100%", background: "transparent", border: `1px solid ${C.border}`, color: C.muted, padding: "9px", borderRadius: "6px", cursor: "pointer", fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", fontFamily: C.font }}>Dismiss</button>
    </div>
  );

  // ── Locating ──
  if (phase === "locating") return (
    <div style={{ background: "#0e1208", border: `1px solid ${C.gold}55`, borderRadius: "10px", padding: "18px", marginBottom: "14px", textAlign: "center" }}>
      <div style={{ fontSize: "24px", marginBottom: "8px", animation: "pulse 1s ease-in-out infinite" }}>📍</div>
      <div style={{ fontSize: "13px", color: C.gold }}>Getting your location…</div>
      <div style={{ fontSize: "11px", color: C.muted, marginTop: "3px" }}>Sending help request to coach</div>
    </div>
  );

  // ── Reason selection ──
  if (phase === "reason") return (
    <div style={{ background: "#0e1208", border: `1px solid ${C.gold}55`, borderRadius: "10px", padding: "16px 18px", marginBottom: "14px", animation: "fadeUp 0.2s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div style={{ fontSize: "13px", color: C.gold }}>🛟 What do you need help with?</div>
        <button onClick={reset} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: "18px", lineHeight: 1 }}>×</button>
      </div>

      {/* Reason grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
        {HELP_REASONS.map((r, i) => (
          <button key={i} onClick={() => setReason(r)}
            style={{ background: reason?.label === r.label ? `${C.gold}22` : C.cardHi, border: `1px solid ${reason?.label === r.label ? C.gold : C.border}`, borderRadius: "8px", padding: "10px 8px", cursor: "pointer", fontFamily: C.font, display: "flex", alignItems: "center", gap: "8px", transition: "all 0.15s" }}
          >
            <span style={{ fontSize: "18px" }}>{r.icon}</span>
            <span style={{ fontSize: "11px", color: reason?.label === r.label ? C.gold : C.muted, textAlign: "left", lineHeight: 1.3 }}>{r.label}</span>
          </button>
        ))}
      </div>

      {/* Optional note */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ fontSize: "9px", letterSpacing: "2px", color: C.muted, textTransform: "uppercase", marginBottom: "5px" }}>Additional details (optional)</div>
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="e.g. near the boat ramp, cove 3…"
          style={{ width: "100%", background: "#08090d", border: `1px solid ${C.border}`, borderRadius: "4px", padding: "10px 12px", color: C.text, fontSize: "13px", fontFamily: C.font, outline: "none", boxSizing: "border-box" }}
        />
      </div>

      <button
        onClick={() => reason && fireAlert()}
        style={{ width: "100%", background: reason ? C.gold : C.border, border: "none", color: reason ? "#1a0a00" : C.muted, padding: "13px", borderRadius: "6px", cursor: reason ? "pointer" : "default", fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", fontWeight: "bold", fontFamily: C.font }}
      >
        🛟 Send Help Request + GPS
      </button>
    </div>
  );

  // ── Idle ──
  return (
    <button
      onClick={() => setPhase("reason")}
      style={{ width: "100%", background: "linear-gradient(135deg,#1a1208,#100e06)", border: `1px solid ${C.gold}44`, borderRadius: "10px", padding: "14px 18px", marginBottom: "14px", cursor: "pointer", fontFamily: C.font, display: "flex", alignItems: "center", gap: "14px" }}
      onMouseOver={e => e.currentTarget.style.borderColor = C.gold}
      onMouseOut={e => e.currentTarget.style.borderColor = `${C.gold}44`}
    >
      <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: `${C.gold}18`, border: `2px solid ${C.gold}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>🛟</div>
      <div style={{ textAlign: "left" }}>
        <div style={{ fontSize: "13px", color: C.gold, fontWeight: "bold", letterSpacing: "1px" }}>NEED HELP</div>
        <div style={{ fontSize: "10px", color: C.muted, marginTop: "2px" }}>Boat trouble, minor issue — sends GPS to coach</div>
      </div>
    </button>
  );
}

// ── Need Help Alert (Coach view) ──────────────────────────────────────────────
function NeedHelpAlert({ alert, onDismiss }) {
  const mapsUrl = alert.location?.lat && !alert.location.lat.includes("unavailable") && !alert.location.lat.includes("not supported")
    ? `https://maps.apple.com/?q=${alert.location.lat},${alert.location.lng}`
    : null;

  return (
    <div style={{ background: "#0e1208", border: `2px solid ${C.gold}`, borderRadius: "10px", padding: "16px 18px", marginBottom: "14px", animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
          <span style={{ fontSize: "22px", marginTop: "2px" }}>🛟</span>
          <div>
            <div style={{ fontSize: "13px", color: C.gold, fontWeight: "bold", letterSpacing: "1px" }}>HELP NEEDED — Boat {alert.boat.id}</div>
            <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>{alert.boat.captain} & {alert.boat.partner}</div>
            <div style={{ fontSize: "12px", color: C.text, marginTop: "6px" }}>{alert.reason?.icon} {alert.reason?.label}</div>
            {alert.note && <div style={{ fontSize: "11px", color: C.muted, marginTop: "3px", fontStyle: "italic" }}>"{alert.note}"</div>}
            {mapsUrl ? (
              <div style={{ marginTop: "8px" }}>
                <div style={{ fontSize: "10px", color: C.muted, fontFamily: C.mono, marginBottom: "6px" }}>📍 {alert.location.lat}, {alert.location.lng}</div>
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-block", background: C.gold, color: "#1a0a00", padding: "7px 14px", borderRadius: "5px", fontSize: "11px", letterSpacing: "1px", textDecoration: "none", fontFamily: C.font, fontWeight: "bold" }}>
                  📍 Open in Maps
                </a>
              </div>
            ) : (
              <div style={{ fontSize: "11px", color: C.muted, marginTop: "4px" }}>GPS unavailable — contact by radio</div>
            )}
          </div>
        </div>
        <button onClick={onDismiss} style={{ background: "transparent", border: `1px solid ${C.gold}33`, color: C.gold, padding: "6px 12px", borderRadius: "5px", cursor: "pointer", fontSize: "10px", fontFamily: C.font, flexShrink: 0, marginLeft: "10px" }}>
          Resolved ✓
        </button>
      </div>
    </div>
  );
}

// ── Boat Captain View ──────────────────────────────────────────────────────────
const LURES=["Senko","Spinnerbait","Crankbait","Frog","Jig","Swimbait","Drop Shot","Texas Rig","Carolina Rig","Topwater","Chatterbait","Shakey Head","Other"];
const STRUCTURES=["Dock","Laydown","Grass/Weeds","Creek Channel","Brush Pile","Rock/Riprap","Point","Flat","Ledge","Open Water","Timber","Other"];

function BoatCaptainView() {
  const boat        = BOATS[0]; // Boat A1 in demo
  const [myCatches, setMyCatches]     = useState([]);
  const [showForm,  setShowForm]      = useState(false);
  const [catcher,   setCatcher]       = useState(boat.captain);
  const [photo,     setPhoto]         = useState(null);
  const [weight,    setWeight]        = useState("");
  const [lure,      setLure]          = useState("");
  const [depth,     setDepth]         = useState("");
  const [structure, setStructure]     = useState("");
  const [pendingCull,setPendingCull]  = useState(null);
  const [viewReceipt,setViewReceipt]  = useState(null);

  const LIMIT = TOURNAMENT.limit;
  const activeCatches = myCatches.filter(c=>!c.culled);
  const culledCatches = myCatches.filter(c=>c.culled);

  const captainActive = activeCatches.filter(c=>c.angler===boat.captain);
  const partnerActive = activeCatches.filter(c=>c.angler===boat.partner);
  const totalActive   = captainActive.length + partnerActive.length;
  const boatWeight    = activeCatches.reduce((s,c)=>s+parseFloat(c.weight||0),0);

  const inp={background:"#08090d",border:`1px solid ${C.border}`,borderRadius:"4px",padding:"10px 12px",color:C.text,fontSize:"14px",fontFamily:C.font,outline:"none",width:"100%",boxSizing:"border-box"};
  const lbl={display:"block",fontSize:"9px",letterSpacing:"2px",color:C.muted,textTransform:"uppercase",marginBottom:"5px"};

  const handleSave=()=>{
    if(!weight) return;
    const now=new Date();
    const h=now.getHours(),m=now.getMinutes(),ampm=h>=12?"PM":"AM",hh=h===0?12:h>12?h-12:h;
    const rec={
      id:Date.now(), angler:catcher, boat:boat.id,
      photo, weight, lure, depth, structure,
      time:`${hh}:${m.toString().padStart(2,"0")} ${ampm}`,
      timestamp:now.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",second:"2-digit"}),
      verifyCode:generateVerifyCode(TOURNAMENT.lake),
      lake:TOURNAMENT.lake, tournament:TOURNAMENT.name,
      receiptId:"CC-"+Date.now().toString(36).toUpperCase().slice(-6),
    };
    setShowForm(false); setPhoto(null); setWeight(""); setLure(""); setDepth(""); setStructure("");
    if(totalActive>=LIMIT) { setPendingCull(rec); }
    else { setMyCatches(prev=>[...prev,rec]); setViewReceipt(rec); }
  };

  const handleCull=(culledId)=>{
    setMyCatches(prev=>[...prev.map(c=>c.id===culledId?{...c,culled:true,culledAt:getNow()}:c),pendingCull]);
    setPendingCull(null); setViewReceipt(pendingCull);
  };

  return (
    <div style={{animation:"fadeUp 0.3s ease"}}>
      {viewReceipt && <ReceiptCard catch={viewReceipt} onClose={()=>setViewReceipt(null)} />}
      {pendingCull  && <CullMode catches={myCatches} newCatch={pendingCull} onCull={handleCull} onCancel={()=>setPendingCull(null)} />}

      {/* Emergency button — always at the top, always visible */}
      <EmergencyButton boat={boat} onAlert={(alert) => {
        try { sessionStorage.setItem("cc_emergency", JSON.stringify(alert)); } catch {}
        window.dispatchEvent(new CustomEvent("cc_emergency", { detail: alert }));
      }} />

      {/* Need Help button — non-emergency boat issues */}
      <NeedHelpButton boat={boat} onAlert={(alert) => {
        window.dispatchEvent(new CustomEvent("cc_needhelp", { detail: alert }));
      }} />

      {/* Boat header */}
      <div style={{background:`linear-gradient(135deg,${TEAM.primaryColor}99,#0a1020)`,border:`1px solid ${TEAM.accentColor}44`,borderRadius:"12px",padding:"16px 18px",marginBottom:"14px"}}>
        <div style={{fontSize:"8px",letterSpacing:"3px",color:`${TEAM.accentColor}88`,textTransform:"uppercase",marginBottom:"6px",display:"flex",alignItems:"center",gap:"5px"}}><span>{TEAM.mascotEmoji}</span>Boat Captain · {boat.id}</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:"13px",color:C.text}}>⚓ {boat.captain} <span style={{color:C.purple,fontSize:"10px"}}>(You)</span></div>
            <div style={{fontSize:"13px",color:C.muted,marginTop:"3px"}}>🎣 {boat.partner}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:"26px",color:C.green,fontWeight:"bold"}}>{boatWeight.toFixed(2)}</div>
            <div style={{fontSize:"9px",color:C.muted,letterSpacing:"1px"}}>BOAT lbs</div>
          </div>
        </div>
        {/* Per-angler fish bars */}
        <div style={{marginTop:"12px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
          {[{name:boat.captain,count:captainActive.length},{name:boat.partner,count:partnerActive.length}].map((a,i)=>(
            <div key={i}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
                <span style={{fontSize:"9px",color:C.muted}}>{a.name.split(" ")[0]}</span>
                <span style={{fontSize:"9px",color:C.green}}>{a.count}/{LIMIT}</span>
              </div>
              <div style={{height:"5px",background:C.border,borderRadius:"3px",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${(a.count/LIMIT)*100}%`,background:a.count>=LIMIT?`linear-gradient(90deg,${C.gold},${C.red})`:`linear-gradient(90deg,#22c55e,#4a7cff)`,borderRadius:"3px"}} />
              </div>
            </div>
          ))}
        </div>
        {totalActive>=LIMIT && <div style={{marginTop:"8px",fontSize:"10px",color:C.gold,textAlign:"center"}}>⚖️ Limit reached — next catch triggers cull</div>}
      </div>

      {/* Log form or button */}
      {showForm ? (
        <div style={{background:C.card,border:`1px solid ${C.borderHi}`,borderRadius:"10px",padding:"18px",marginBottom:"14px",animation:"fadeUp 0.3s ease"}}>
          <div style={{fontSize:"10px",letterSpacing:"3px",color:C.muted,textTransform:"uppercase",marginBottom:"14px"}}>Log Tournament Catch · Boat {boat.id}</div>

          {/* Who caught it — the key new field */}
          <div style={{marginBottom:"14px"}}>
            <div style={lbl}>Who caught this fish?</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
              {[boat.captain,boat.partner].map((name,i)=>(
                <button key={i} onClick={()=>setCatcher(name)} style={{padding:"12px 8px",borderRadius:"8px",border:`2px solid ${catcher===name?C.green:C.border}`,background:catcher===name?`${C.green}18`:C.cardHi,cursor:"pointer",fontFamily:C.font,color:catcher===name?C.green:C.muted,fontSize:"12px",transition:"all 0.15s"}}>
                  {catcher===name?"✓ ":""}{name.split(" ")[0]}
                  {name===boat.captain && <div style={{fontSize:"9px",color:C.purple,marginTop:"2px"}}>Captain</div>}
                </button>
              ))}
            </div>
          </div>

          <PhotoCapture photo={photo} onPhoto={setPhoto} />

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"10px"}}>
            <div><label style={lbl}>Weight (lbs) *</label><input type="number" step="0.1" placeholder="4.2" value={weight} onChange={e=>setWeight(e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Depth (ft)</label><input type="number" placeholder="6" value={depth} onChange={e=>setDepth(e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Lure</label><select value={lure} onChange={e=>setLure(e.target.value)} style={{...inp,appearance:"none",cursor:"pointer"}}><option value="">Select…</option>{LURES.map(l=><option key={l} value={l}>{l}</option>)}</select></div>
            <div><label style={lbl}>Structure</label><select value={structure} onChange={e=>setStructure(e.target.value)} style={{...inp,appearance:"none",cursor:"pointer"}}><option value="">Select…</option>{STRUCTURES.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
          </div>

          <div style={{background:"#08090d",border:`1px solid ${C.border}`,borderRadius:"6px",padding:"10px",marginBottom:"14px",textAlign:"center"}}>
            <div style={{fontSize:"8px",letterSpacing:"2px",color:C.dimmer,textTransform:"uppercase",marginBottom:"4px"}}>Verify code generated on save</div>
            <div style={{fontSize:"18px",color:C.borderHi,fontFamily:C.mono,letterSpacing:"4px"}}>{TOURNAMENT.lake.replace(/[^a-zA-Z]/g,"").toUpperCase().slice(0,4)}-25-????</div>
            <div style={{fontSize:"9px",color:C.dimmer,marginTop:"3px"}}>Timestamp locked · Cannot be altered</div>
          </div>

          <div style={{display:"flex",gap:"8px"}}>
            <button onClick={handleSave} style={{flex:1,background:weight?C.green:C.border,border:"none",color:weight?"#001a0a":C.muted,padding:"13px",borderRadius:"6px",cursor:weight?"pointer":"default",fontSize:"11px",letterSpacing:"2px",textTransform:"uppercase",fontWeight:"bold",fontFamily:C.font}}>
              📷 Lock Catch + Generate Code
            </button>
            <button onClick={()=>setShowForm(false)} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,padding:"13px 14px",borderRadius:"6px",cursor:"pointer",fontFamily:C.font,fontSize:"12px"}}>Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={()=>setShowForm(true)} style={{width:"100%",background:"linear-gradient(135deg,#0a2a14,#080d0a)",border:`1px solid ${C.green}`,borderRadius:"8px",padding:"15px",marginBottom:"14px",cursor:"pointer",fontFamily:C.font,color:C.green,fontSize:"12px",letterSpacing:"3px",textTransform:"uppercase",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px"}}>
          <span style={{fontSize:"18px"}}>📷</span>
          {totalActive>=LIMIT?"Log Fish — Cull Required":"Log Catch + Photo"}
        </button>
      )}

      {/* Active bag */}
      {activeCatches.length>0 && (
        <div style={{marginBottom:"14px"}}>
          <div style={{fontSize:"9px",letterSpacing:"2px",color:C.muted,textTransform:"uppercase",marginBottom:"10px"}}>Active Bag · {activeCatches.length} fish</div>
          {activeCatches.map((c,i)=>(
            <div key={i} onClick={()=>setViewReceipt(c)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"11px 14px",marginBottom:"7px",display:"flex",gap:"10px",alignItems:"center",cursor:"pointer"}}
              onMouseOver={e=>e.currentTarget.style.borderColor=C.borderHi}
              onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
              <div style={{width:"42px",height:"42px",borderRadius:"7px",background:`${C.green}14`,border:`1px solid ${C.green}28`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",flexShrink:0}}>{c.photo?"📷":"🐟"}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:"14px",color:C.green,fontWeight:"bold"}}>{c.weight} lbs{c.lure?` · ${c.lure}`:""}</div>
                <div style={{fontSize:"10px",color:C.muted,marginTop:"1px"}}>{c.angler.split(" ")[0]} · {c.time}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:"9px",color:C.green,fontFamily:C.mono,letterSpacing:"1px"}}>{c.verifyCode}</div>
                <div style={{fontSize:"9px",color:C.muted,marginTop:"2px"}}>✓ Locked</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Culled audit */}
      {culledCatches.length>0 && (
        <div style={{marginBottom:"14px"}}>
          <div style={{fontSize:"9px",letterSpacing:"2px",color:C.dimmer,textTransform:"uppercase",marginBottom:"8px"}}>Culled Fish · Audit Log</div>
          {culledCatches.map((c,i)=>(
            <div key={i} style={{background:C.cardHi,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"9px 14px",marginBottom:"6px",display:"flex",justifyContent:"space-between",alignItems:"center",opacity:0.6}}>
              <div>
                <div style={{fontSize:"12px",color:C.muted,textDecoration:"line-through"}}>{c.weight} lbs · {c.angler.split(" ")[0]}</div>
                <div style={{fontSize:"9px",color:C.dimmer}}>Culled {c.culledAt}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:"9px",color:C.dimmer,fontFamily:C.mono}}>{c.verifyCode}</div>
                <Badge label="Culled" color={C.muted} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tournament Lockout Screen ──────────────────────────────────────────────────
function TournamentLockout({anglerName}) {
  return (
    <div style={{animation:"fadeUp 0.3s ease",paddingTop:"20px"}}>
      <div style={{background:`linear-gradient(135deg,${TEAM.primaryColor}88,#0a1020)`,border:`1px solid ${TEAM.accentColor}44`,borderRadius:"16px",padding:"32px 24px",textAlign:"center",marginBottom:"16px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",right:"-20px",top:"-20px",fontSize:"120px",opacity:0.05,lineHeight:1,userSelect:"none"}}>{TEAM.mascotEmoji}</div>
        <div style={{fontSize:"44px",marginBottom:"14px"}}>🔒</div>
        <div style={{fontSize:"18px",color:TEAM.textOnPrimary,marginBottom:"6px"}}>Tournament in Progress</div>
        <div style={{fontSize:"12px",color:`${TEAM.textOnPrimary}77`,marginBottom:"16px",lineHeight:1.6}}>
          Catch logging is locked during the tournament.<br/>Your boat captain is logging for your team.
        </div>
        <div style={{background:"rgba(0,0,0,0.3)",borderRadius:"8px",padding:"12px 16px",display:"inline-block"}}>
          <div style={{fontSize:"9px",letterSpacing:"2px",color:`${TEAM.accentColor}99`,textTransform:"uppercase",marginBottom:"4px"}}>Tournament ends</div>
          <div style={{fontSize:"22px",color:TEAM.accentColor,fontWeight:"bold"}}>{TOURNAMENT.endTime}</div>
          <div style={{fontSize:"10px",color:`${TEAM.textOnPrimary}55`,marginTop:"2px"}}>{TOURNAMENT.date} · {TOURNAMENT.lake}</div>
        </div>
      </div>

      {/* Live team feed — read only */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",overflow:"hidden",marginBottom:"14px"}}>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:"8px"}}>
          <LiveDot />
          <div style={{fontSize:"11px",color:C.muted,letterSpacing:"1px"}}>Team catch feed · Read only</div>
        </div>
        {SAMPLE_CATCHES.filter(c=>!c.culled).slice(0,4).map((c,i)=>(
          <div key={i} style={{padding:"10px 16px",borderBottom:i<3?`1px solid ${C.border}`:"none",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <span style={{fontSize:"13px",color:c.angler===anglerName?C.blue:C.text}}>{c.angler.split(" ")[0]}</span>
              <span style={{fontSize:"12px",color:C.muted,marginLeft:"8px"}}>🐟 {c.weight} lbs · {c.lure}</span>
            </div>
            <div style={{fontSize:"10px",color:C.muted}}>{c.time}</div>
          </div>
        ))}
      </div>

      <div style={{background:`${C.blue}10`,border:`1px solid ${C.blue}33`,borderRadius:"8px",padding:"12px 16px",textAlign:"center"}}>
        <div style={{fontSize:"11px",color:C.blue}}>Your receipts and stats will unlock when the tournament ends</div>
        <div style={{fontSize:"10px",color:C.muted,marginTop:"4px"}}>Come back at {TOURNAMENT.endTime} to review your catches</div>
      </div>
    </div>
  );
}

// ── Review Mode ────────────────────────────────────────────────────────────────
function ReviewMode({anglerName}) {
  const [viewReceipt,setViewReceipt] = useState(null);
  const myCatches  = SAMPLE_CATCHES.filter(c=>c.angler===anglerName);
  const active     = myCatches.filter(c=>!c.culled);
  const culled     = myCatches.filter(c=>c.culled);
  const totalWeight= active.reduce((s,c)=>s+parseFloat(c.weight),0).toFixed(2);
  const bigFish    = active.length?Math.max(...active.map(c=>parseFloat(c.weight))).toFixed(2):"0.00";
  const myStats    = SEASON_STANDINGS.find(a=>a.name===anglerName);

  return (
    <div style={{animation:"fadeUp 0.3s ease"}}>
      {viewReceipt && <ReceiptCard catch={viewReceipt} onClose={()=>setViewReceipt(null)} />}

      {/* Tournament complete banner */}
      <div style={{background:"linear-gradient(135deg,#100e00,#08090d)",border:`1px solid ${C.green}44`,borderRadius:"12px",padding:"16px 18px",marginBottom:"14px",textAlign:"center"}}>
        <div style={{fontSize:"28px",marginBottom:"8px"}}>🏆</div>
        <div style={{fontSize:"16px",color:C.green,marginBottom:"4px"}}>Tournament Complete</div>
        <div style={{fontSize:"11px",color:C.muted}}>{TOURNAMENT.name} · {TOURNAMENT.lake} · {TOURNAMENT.date}</div>
        <div style={{display:"flex",justifyContent:"space-around",marginTop:"14px"}}>
          {[{value:`${totalWeight} lbs`,label:"Your Weight"},{value:`${active.length}`,label:"Fish Caught"},{value:`${bigFish} lbs`,label:"Big Fish"}].map((s,i)=>(
            <div key={i} style={{textAlign:"center"}}>
              <div style={{fontSize:"20px",color:C.green,fontWeight:"bold"}}>{s.value}</div>
              <div style={{fontSize:"9px",color:C.muted,marginTop:"2px",letterSpacing:"1px"}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Catch receipts */}
      <div style={{fontSize:"9px",letterSpacing:"2px",color:C.muted,textTransform:"uppercase",marginBottom:"10px"}}>
        Your Catches · Tap to View Receipt
      </div>
      {active.map((c,i)=>(
        <div key={i} onClick={()=>setViewReceipt(c)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"12px 14px",marginBottom:"8px",display:"flex",gap:"12px",alignItems:"center",cursor:"pointer"}}
          onMouseOver={e=>e.currentTarget.style.borderColor=C.borderHi}
          onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
          <div style={{width:"44px",height:"44px",borderRadius:"7px",background:`${C.green}14`,border:`1px solid ${C.green}28`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",flexShrink:0}}>🐟</div>
          <div style={{flex:1}}>
            <div style={{fontSize:"15px",color:C.green,fontWeight:"bold"}}>{c.weight} lbs {c.lure?`· ${c.lure}`:""}</div>
            <div style={{fontSize:"10px",color:C.muted,marginTop:"1px"}}>{c.time} · {c.structure||"—"}{c.period?` · ${c.period}`:""}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:"9px",color:C.green,fontFamily:C.mono,letterSpacing:"1px"}}>{c.verifyCode}</div>
            <div style={{fontSize:"9px",color:C.muted,marginTop:"2px"}}>Tap for receipt →</div>
          </div>
        </div>
      ))}

      {/* Culled audit */}
      {culled.length>0 && (
        <div style={{marginBottom:"14px"}}>
          <div style={{fontSize:"9px",letterSpacing:"2px",color:C.dimmer,textTransform:"uppercase",marginBottom:"8px"}}>Culled This Tournament</div>
          {culled.map((c,i)=>(
            <div key={i} onClick={()=>setViewReceipt(c)} style={{background:C.cardHi,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"10px 14px",marginBottom:"6px",display:"flex",justifyContent:"space-between",alignItems:"center",opacity:0.7,cursor:"pointer"}}>
              <div>
                <div style={{fontSize:"12px",color:C.muted,textDecoration:"line-through"}}>{c.weight} lbs · {c.lure||"—"}</div>
                <div style={{fontSize:"9px",color:C.dimmer}}>Culled {c.culledAt}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:"9px",color:C.dimmer,fontFamily:C.mono}}>{c.verifyCode}</div>
                <Badge label="Culled" color={C.muted} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Updated season stats */}
      {myStats && (
        <div>
          <div style={{fontSize:"9px",letterSpacing:"2px",color:C.muted,textTransform:"uppercase",marginBottom:"10px"}}>Updated Season Stats</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"14px"}}>
            {[{label:"Season Pts",value:myStats.pts,color:C.blue},{label:"Big Fish",value:`${myStats.big} lbs`,color:C.gold},{label:"Season Avg",value:`${myStats.avg} lbs`,color:C.green}].map((s,i)=>(
              <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"12px",textAlign:"center"}}>
                <div style={{fontSize:"16px",color:s.color,fontWeight:"bold"}}>{s.value}</div>
                <div style={{fontSize:"8px",color:C.muted,marginTop:"3px",letterSpacing:"1px",textTransform:"uppercase"}}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{background:`${C.blue}10`,border:`1px solid ${C.blue}33`,borderRadius:"8px",padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:"11px",color:C.blue,letterSpacing:"1px"}}>State Qualifying</div>
              <div style={{fontSize:"13px",color:C.text,marginTop:"2px"}}>Top 4 · {myStats.pts} pts this season</div>
            </div>
            <Badge label="Qualified" color={C.blue} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Angler View — routes to lockout or review based on tournament status ───────
function AnglerView() {
  const [selectedAngler, setSelectedAngler] = useState(ROSTER[1].name); // Mason Reed — non-captain demo
  const angler = ROSTER.find(a=>a.name===selectedAngler)||ROSTER[1];

  return (
    <div style={{animation:"fadeUp 0.3s ease"}}>
      {/* Angler selector */}
      <div style={{marginBottom:"14px"}}>
        <div style={{fontSize:"9px",letterSpacing:"2px",color:C.muted,textTransform:"uppercase",marginBottom:"8px"}}>Viewing as</div>
        <div style={{display:"flex",gap:"6px",overflowX:"auto",paddingBottom:"4px"}}>
          {ROSTER.map((a,i)=>(
            <button key={i} onClick={()=>setSelectedAngler(a.name)} style={{flexShrink:0,background:selectedAngler===a.name?`${C.blue}22`:C.card,border:selectedAngler===a.name?`1px solid ${C.blue}`:`1px solid ${C.border}`,borderRadius:"20px",padding:"6px 14px",cursor:"pointer",fontFamily:C.font,fontSize:"11px",color:selectedAngler===a.name?C.blue:C.muted,whiteSpace:"nowrap",transition:"all 0.15s"}}>
              {a.name.split(" ")[0]}{a.role==="captain"?" ⚓":""}
            </button>
          ))}
        </div>
      </div>

      {TOURNAMENT.status === "live"
        ? <TournamentLockout anglerName={angler.name} />
        : <ReviewMode anglerName={angler.name} />
      }
    </div>
  );
}

// ── Parent Live View ───────────────────────────────────────────────────────────
function ParentView() {
  const [watching,setWatching]=useState("Tyler Brooks");
  const myKid=ROSTER.find(a=>a.name===watching);
  const myFeeds=SAMPLE_CATCHES.filter(c=>c.angler===watching&&!c.culled);
  const myRank=SEASON_STANDINGS.findIndex(a=>a.name===watching)+1;

  return (
    <div style={{animation:"fadeUp 0.3s ease"}}>
      <div style={{background:"linear-gradient(135deg,#0e1a30,#080d1a)",border:`1px solid ${C.blueDim}`,borderRadius:"10px",padding:"16px 18px",marginBottom:"12px",textAlign:"center"}}>
        <div style={{fontSize:"8px",letterSpacing:"3px",color:`${TEAM.accentColor}77`,textTransform:"uppercase",marginBottom:"6px",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}>
          <span style={{fontSize:"14px"}}>{TEAM.mascotEmoji}</span>{TEAM.name} · Live Feed<span style={{fontSize:"14px"}}>{TEAM.mascotEmoji}</span>
        </div>
        <div style={{fontSize:"20px",color:C.text}}>{TOURNAMENT.name}</div>
        <div style={{fontSize:"11px",color:C.muted,marginTop:"3px"}}>{TOURNAMENT.lake} · {TOURNAMENT.date}</div>
        <div style={{marginTop:"10px",display:"flex",justifyContent:"center",gap:"24px"}}>
          <div><div style={{fontSize:"20px",color:C.blue}}>{TOURNAMENT.status==="live"?TOURNAMENT.endsIn:"Ended"}</div><div style={{fontSize:"9px",color:C.muted,letterSpacing:"1px"}}>{TOURNAMENT.status==="live"?"REMAINING":"STATUS"}</div></div>
          <div><div style={{fontSize:"20px",color:C.green}}>{ROSTER.reduce((s,a)=>s+parseFloat(a.weight),0).toFixed(1)}</div><div style={{fontSize:"9px",color:C.muted,letterSpacing:"1px"}}>TEAM lbs</div></div>
        </div>
      </div>

      <div style={{fontSize:"9px",letterSpacing:"2px",color:C.muted,textTransform:"uppercase",marginBottom:"8px"}}>Following</div>
      <div style={{display:"flex",gap:"6px",overflowX:"auto",paddingBottom:"4px",marginBottom:"14px"}}>
        {ROSTER.map((a,i)=>(
          <button key={i} onClick={()=>setWatching(a.name)} style={{flexShrink:0,background:watching===a.name?`${C.blueDim}`:C.card,border:watching===a.name?`1px solid ${C.blue}`:`1px solid ${C.border}`,borderRadius:"20px",padding:"6px 14px",cursor:"pointer",fontFamily:C.font,fontSize:"12px",color:watching===a.name?C.blue:C.muted,whiteSpace:"nowrap"}}>
            {a.name.split(" ")[0]}
          </button>
        ))}
      </div>

      {myKid && (
        <div style={{background:"linear-gradient(135deg,#0e1a30,#080d1a)",border:`1px solid ${C.blue}44`,borderRadius:"12px",padding:"18px",marginBottom:"14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontSize:"20px",color:C.text}}>{myKid.name}</div>
              <div style={{fontSize:"11px",color:C.muted,marginTop:"2px"}}>Grade {myKid.grade} · Boat {myKid.boat}</div>
              <div style={{display:"flex",gap:"6px",marginTop:"8px",flexWrap:"wrap"}}>
                <Badge label={`Season #${myRank}`} color={myRank<=3?C.gold:C.blue} />
                <Badge label={TOURNAMENT.status==="live"?"On Water":"Tournament Complete"} color={TOURNAMENT.status==="live"?C.green:C.muted} />
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:"26px",color:C.green,fontWeight:"bold"}}>{myKid.weight}</div>
              <div style={{fontSize:"10px",color:C.muted,letterSpacing:"1px"}}>lbs today</div>
              <div style={{fontSize:"13px",color:C.text,marginTop:"4px"}}>{myKid.catches} fish</div>
            </div>
          </div>
          <div style={{marginTop:"14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
              <span style={{fontSize:"9px",color:C.muted,letterSpacing:"1px"}}>FISH LIMIT</span>
              <span style={{fontSize:"9px",color:C.muted}}>{myKid.catches} / 5</span>
            </div>
            <div style={{height:"6px",background:C.border,borderRadius:"3px",overflow:"hidden"}}>
              <div style={{height:"100%",width:`${(myKid.catches/5)*100}%`,background:`linear-gradient(90deg,${C.blue},${C.green})`,borderRadius:"3px"}} />
            </div>
          </div>
        </div>
      )}

      {myFeeds.length>0 ? (
        <div>
          <div style={{fontSize:"9px",letterSpacing:"2px",color:C.muted,textTransform:"uppercase",marginBottom:"10px"}}>{watching.split(" ")[0]}'s Catches</div>
          {myFeeds.map((c,i)=>(
            <div key={i} style={{background:C.card,border:`1px solid ${C.blueDim}`,borderRadius:"8px",padding:"11px 14px",marginBottom:"8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
                <div style={{width:"40px",height:"40px",borderRadius:"7px",background:`${C.green}18`,border:`1px solid ${C.green}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",flexShrink:0}}>🐟</div>
                <div>
                  <div style={{fontSize:"14px",color:C.green,fontWeight:"bold"}}>{c.weight} lbs</div>
                  <div style={{fontSize:"11px",color:C.muted}}>{c.lure} · {c.time}</div>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                {c.period && <Badge label={c.period} color={c.period==="MAJOR"?C.green:"#b07820"} />}
                <div style={{fontSize:"9px",color:C.muted,fontFamily:C.mono,marginTop:"4px"}}>{c.verifyCode}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"28px",textAlign:"center"}}>
          <div style={{fontSize:"28px",marginBottom:"8px",opacity:0.3}}>🎣</div>
          <div style={{fontSize:"12px",color:C.muted}}>No catches logged yet for {watching.split(" ")[0]}</div>
          <div style={{fontSize:"11px",color:C.dimmer,marginTop:"4px",fontStyle:"italic"}}>Updates appear the moment the boat captain logs a catch</div>
        </div>
      )}

      <div style={{textAlign:"center",marginTop:"20px",padding:"12px",borderTop:`1px solid ${C.border}`}}>
        <div style={{fontSize:"9px",color:C.dimmer,letterSpacing:"2px"}}>BASS BOSS · by Camp & Cove</div>
        <div style={{fontSize:"8px",color:C.dimmer,marginTop:"2px",fontStyle:"italic"}}>Live updates · No account needed · Share this link with your team</div>
      </div>
    </div>
  );
}

// ── Coach Dashboard ────────────────────────────────────────────────────────────
function CoachView({ emergencyAlert, onDismissEmergency, helpAlerts = [], onDismissHelp }) {
  const [subTab,setSubTab]=useState("live");
  const teamWeight=ROSTER.reduce((s,a)=>s+parseFloat(a.weight),0).toFixed(2);
  const teamFish=ROSTER.reduce((s,a)=>s+a.catches,0);

  return (
    <div style={{animation:"fadeUp 0.3s ease"}}>
      <MascotHeader />

      <div style={{display:"flex",gap:"3px",background:"#08090d",borderRadius:"6px",padding:"3px",border:`1px solid ${C.border}`,marginBottom:"14px"}}>
        {[{key:"live",label:"⚡ Live"},{key:"boats",label:"🚤 Boats"},{key:"roster",label:"📋 Roster"},{key:"season",label:"📊 Season"},{key:"weigh",label:"⚖️ Weigh-In"}].map(t=>(
          <button key={t.key} onClick={()=>setSubTab(t.key)} style={{flex:1,padding:"7px 3px",borderRadius:"4px",border:"none",cursor:"pointer",fontFamily:C.font,fontSize:"9px",background:subTab===t.key?C.card:"transparent",color:subTab===t.key?C.blue:C.dimmer,borderBottom:subTab===t.key?`2px solid ${C.blue}`:"2px solid transparent",transition:"all 0.15s"}}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab==="live" && (
        <div style={{animation:"fadeUp 0.2s ease"}}>

          {/* Emergency alert banner in coach live feed */}
          {emergencyAlert && (
            <div style={{ background: "#1a0808", border: `2px solid ${C.red}`, borderRadius: "10px", padding: "14px 16px", marginBottom: "14px", animation: "emergencyPulse 1.5s ease-in-out infinite" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <span style={{ fontSize: "24px" }}>🚨</span>
                  <div>
                    <div style={{ fontSize: "14px", color: C.red, fontWeight: "bold", letterSpacing: "1px" }}>EMERGENCY — BOAT {emergencyAlert.boat.id}</div>
                    <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>{emergencyAlert.boat.captain} & {emergencyAlert.boat.partner}</div>
                    {emergencyAlert.location?.lat && !emergencyAlert.location.lat.includes("unavailable") && (
                      <div style={{ fontSize: "10px", color: C.text, marginTop: "3px", fontFamily: C.mono }}>📍 {emergencyAlert.location.lat}, {emergencyAlert.location.lng}</div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
                  {emergencyAlert.location?.lat && !emergencyAlert.location.lat.includes("unavailable") && (
                    <a href={`https://maps.apple.com/?q=${emergencyAlert.location.lat},${emergencyAlert.location.lng}`} target="_blank" rel="noopener noreferrer"
                      style={{ background: C.red, color: "#fff", padding: "7px 12px", borderRadius: "6px", fontSize: "10px", letterSpacing: "1px", textDecoration: "none", fontFamily: C.font, fontWeight: "bold", textAlign: "center" }}>
                      📍 Maps
                    </a>
                  )}
                  <button onClick={onDismissEmergency} style={{ background: "transparent", border: `1px solid ${C.red}44`, color: C.red, padding: "7px 12px", borderRadius: "6px", fontSize: "10px", cursor: "pointer", fontFamily: C.font }}>
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Need help alerts — below emergency, above feed */}
          {helpAlerts.map(alert => (
            <NeedHelpAlert key={alert.id} alert={alert} onDismiss={() => onDismissHelp(alert.id)} />
          ))}

          <div style={{display:"flex",gap:0,background:C.card,borderRadius:"8px",overflow:"hidden",border:`1px solid ${C.border}`,marginBottom:"14px"}}>
            {[{value:teamWeight,label:"Team Weight",color:C.green},{value:teamFish,label:"Fish Logged",color:C.text},{value:"4/4",label:"Boats Active",color:C.blue},{value:`#${TEAM.rankDistrict}`,label:"District",color:C.gold}].map((s,i)=>(
              <div key={i} style={{flex:1,padding:"12px 6px",textAlign:"center",borderRight:i<3?`1px solid ${C.border}`:"none"}}>
                <div style={{fontSize:"18px",color:s.color,fontWeight:"bold"}}>{s.value}</div>
                <div style={{fontSize:"8px",color:C.muted,letterSpacing:"1px",marginTop:"2px",textTransform:"uppercase"}}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:"9px",letterSpacing:"2px",color:C.muted,textTransform:"uppercase",marginBottom:"10px"}}>Live Catch Feed</div>
          {SAMPLE_CATCHES.filter(c=>!c.culled).map((c,i)=>(
            <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"11px 14px",marginBottom:"8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                <div style={{width:"38px",height:"38px",borderRadius:"6px",background:`${C.green}18`,border:`1px solid ${C.green}28`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",flexShrink:0}}>🐟</div>
                <div>
                  <div style={{fontSize:"13px",color:C.text}}>{c.angler} <span style={{fontSize:"10px",color:C.muted}}>· Boat {c.boat}</span></div>
                  <div style={{fontSize:"11px",color:C.muted,marginTop:"1px"}}>{c.lure} · {c.time}{c.period?` · `:""}
                    {c.period && <span style={{color:c.period==="MAJOR"?C.green:"#b07820"}}>● {c.period}</span>}
                  </div>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:"15px",color:C.green,fontWeight:"bold"}}>{c.weight} lbs</div>
                <div style={{fontSize:"9px",color:C.muted,fontFamily:C.mono}}>{c.verifyCode}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab==="boats" && (
        <div style={{animation:"fadeUp 0.2s ease"}}>
          <div style={{fontSize:"9px",letterSpacing:"2px",color:C.muted,textTransform:"uppercase",marginBottom:"10px"}}>All Boats · Real-Time</div>
          {BOATS.map((boat,i)=>{
            const captainData=ROSTER.find(a=>a.name===boat.captain);
            const partnerData=ROSTER.find(a=>a.name===boat.partner);
            const boatWeight=((captainData?.weight||0)+(partnerData?.weight||0)).toFixed(2);
            const boatFish=(captainData?.catches||0)+(partnerData?.catches||0);
            return (
              <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",overflow:"hidden",marginBottom:"10px"}}>
                <div style={{background:C.cardHi,padding:"10px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"8px"}}><span style={{fontSize:"14px"}}>🚤</span><span style={{fontSize:"11px",color:C.muted,letterSpacing:"1px"}}>Boat {boat.id}</span><Badge label="Captain" color={C.purple} /></div>
                  <div style={{display:"flex",gap:"16px",textAlign:"right"}}>
                    <div><span style={{fontSize:"16px",color:C.green,fontWeight:"bold"}}>{boatWeight}</span><span style={{fontSize:"10px",color:C.muted,marginLeft:"3px"}}>lbs</span></div>
                    <div><span style={{fontSize:"16px",color:C.text}}>{boatFish}</span><span style={{fontSize:"10px",color:C.muted,marginLeft:"3px"}}>fish</span></div>
                  </div>
                </div>
                {[{data:captainData,isCaptain:true},{data:partnerData,isCaptain:false}].map(({data:a,isCaptain},j)=>(
                  <div key={j} style={{padding:"10px 14px",borderBottom:j===0?`1px solid ${C.border}`:"none",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                      <div style={{width:"30px",height:"30px",borderRadius:"50%",background:`${isCaptain?C.purple:C.blue}22`,border:`1px solid ${isCaptain?C.purple:C.blue}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",color:isCaptain?C.purple:C.blue,fontWeight:"bold",flexShrink:0}}>{a?.name.split(" ").map(n=>n[0]).join("")||"?"}</div>
                      <div>
                        <div style={{fontSize:"13px",color:C.text}}>{a?.name}</div>
                        <div style={{fontSize:"10px",color:C.muted}}>Gr {a?.grade}{isCaptain?" · ⚓ Logging":""}</div>
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:"14px",color:C.text}}>{a?.weight} <span style={{fontSize:"10px",color:C.muted}}>lbs</span></div>
                      <div style={{fontSize:"10px",color:C.muted}}>{a?.catches} fish</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {subTab==="roster" && <RosterGrid />}

      {subTab==="season" && (
        <div style={{animation:"fadeUp 0.2s ease"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"14px"}}>
            {[{label:"Season Record",value:TEAM.record,color:C.green},{label:"District Rank",value:`#${TEAM.rankDistrict}`,color:C.gold},{label:"State Rank",value:`#${TEAM.rankState}`,color:C.blue},{label:"Points (Top 4)",value:420+390+360+310,color:C.text}].map((s,i)=>(
              <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"14px",textAlign:"center"}}>
                <div style={{fontSize:"22px",color:s.color,fontWeight:"bold"}}>{s.value}</div>
                <div style={{fontSize:"9px",color:C.muted,marginTop:"3px",letterSpacing:"1px",textTransform:"uppercase"}}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:"9px",letterSpacing:"2px",color:C.muted,textTransform:"uppercase",marginBottom:"10px"}}>Event History</div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",overflow:"hidden",marginBottom:"14px"}}>
            {SEASON_EVENTS.map((e,i)=>(
              <div key={i} style={{padding:"12px 16px",borderBottom:i<SEASON_EVENTS.length-1?`1px solid ${C.border}`:"none",display:"flex",justifyContent:"space-between",alignItems:"center",background:e.live?`${C.blue}08`:"transparent"}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    <div style={{fontSize:"13px",color:e.live?C.blue:C.text}}>{e.name}</div>
                    {e.live && <LiveDot />}
                  </div>
                  <div style={{fontSize:"10px",color:C.muted,marginTop:"1px"}}>{e.lake} · {e.date}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  {e.live ? <div style={{fontSize:"11px",color:C.blue}}>In progress</div> : <><div style={{fontSize:"13px",color:e.place===1?C.gold:C.text}}>{e.place===1?"🥇":e.place===2?"🥈":e.place===3?"🥉":`${e.place}th`}</div><div style={{fontSize:"10px",color:C.muted}}>{e.pts} pts</div></>}
                </div>
              </div>
            ))}
          </div>
          <div style={{fontSize:"9px",letterSpacing:"2px",color:C.muted,textTransform:"uppercase",marginBottom:"10px"}}>Individual Season Standings</div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",overflow:"hidden"}}>
            {SEASON_STANDINGS.map((a,i)=>(
              <div key={i} style={{padding:"11px 16px",borderBottom:i<SEASON_STANDINGS.length-1?`1px solid ${C.border}`:"none",display:"flex",justifyContent:"space-between",alignItems:"center",background:i<4?`${C.blue}06`:"transparent"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <RankBadge rank={i+1} size={28} />
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                      <span style={{fontSize:"13px",color:C.text}}>{a.name}</span>
                      {i<4 && <Badge label="State" color={C.blue} />}
                    </div>
                    <div style={{fontSize:"10px",color:C.muted}}>Gr {a.grade} · {a.events} events · <Trend dir={a.trend} size={10} /></div>
                  </div>
                </div>
                <div style={{display:"flex",gap:"16px",textAlign:"right"}}>
                  <div style={{fontSize:"14px",color:i<4?C.blue:C.text,width:"36px",fontWeight:i<4?"bold":"normal"}}>{a.pts}</div>
                  <div style={{fontSize:"13px",color:C.muted,width:"32px"}}>{a.avg}</div>
                  <div style={{fontSize:"13px",color:C.muted,width:"28px"}}>{a.big}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{fontSize:"10px",color:C.dimmer,fontStyle:"italic",marginTop:"8px",textAlign:"center"}}>Top 4 anglers count toward state qualifying points</div>
        </div>
      )}

      {subTab==="weigh" && (
        <div style={{animation:"fadeUp 0.2s ease"}}>
          <div style={{background:"#1a0e0022",border:"1px solid #f0b42944",borderRadius:"8px",padding:"12px 14px",marginBottom:"14px",display:"flex",gap:"10px",alignItems:"center"}}>
            <span style={{fontSize:"18px"}}>⚖️</span>
            <div style={{fontSize:"12px",color:C.gold,lineHeight:1.5}}>Official weigh-in. Enter each boat's verify codes to confirm catches and post official weights. Boat captains bring their phone to the table.</div>
          </div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",padding:"16px",marginBottom:"14px"}}>
            <div style={{fontSize:"10px",letterSpacing:"2px",color:C.muted,textTransform:"uppercase",marginBottom:"12px"}}>Enter Verify Code</div>
            <div style={{display:"flex",gap:"8px",marginBottom:"10px"}}>
              <input placeholder="FORK-25-T7K2" style={{flex:1,background:"#08090d",border:`1px solid ${C.border}`,borderRadius:"4px",padding:"11px 14px",color:C.text,fontSize:"14px",fontFamily:C.mono,outline:"none",letterSpacing:"2px"}} />
              <button style={{background:C.blue,border:"none",borderRadius:"4px",padding:"11px 18px",cursor:"pointer",color:"#fff",fontSize:"12px",fontWeight:"bold",fontFamily:C.font,letterSpacing:"1px"}}>Look Up</button>
            </div>
            <div style={{fontSize:"9px",color:C.dimmer,fontStyle:"italic",textAlign:"center"}}>Captains log all catches · Codes are timestamped and tamper-evident</div>
          </div>
          <div style={{fontSize:"9px",letterSpacing:"2px",color:C.muted,textTransform:"uppercase",marginBottom:"10px"}}>Boat Check-In Status</div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"8px",overflow:"hidden"}}>
            {BOATS.map((boat,i)=>{
              const captainData=ROSTER.find(a=>a.name===boat.captain);
              const partnerData=ROSTER.find(a=>a.name===boat.partner);
              const total=((captainData?.weight||0)+(partnerData?.weight||0)).toFixed(2);
              return (
                <div key={i} style={{padding:"12px 16px",borderBottom:i<BOATS.length-1?`1px solid ${C.border}`:"none",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:"13px",color:C.text}}>Boat {boat.id} · {boat.captain.split(" ")[0]} & {boat.partner.split(" ")[0]}</div>
                    <div style={{fontSize:"10px",color:C.muted,marginTop:"1px"}}>{(captainData?.catches||0)+(partnerData?.catches||0)} fish · {total} lbs</div>
                  </div>
                  <Badge label={i<2?"Checked In":"Pending"} color={i<2?C.green:C.muted} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Coach Certification Course ────────────────────────────────────────────────
const COURSE_MODULES = [
  {
    id: 1,
    icon: "🏕️",
    title: "Welcome to Bass Boss",
    subtitle: "What this app does and how it fits your tournament day",
    duration: "3 min",
    steps: [
      {
        title: "Three tools in one app",
        content: "Bass Boss gives you three connected views: your Coach Dashboard to monitor everything, the Boat Captain view for on-water logging, and the Parent Live Feed so families can follow along from the ramp — no app download required.",
        visual: "📋 Coach  ·  ⚓ Captain  ·  👪 Parents",
      },
      {
        title: "How data flows",
        content: "Boat captains log catches on the water. Those catches appear instantly on your coach dashboard and the parent feed. Every catch gets a unique verify code with a locked timestamp — your digital paper trail for weigh-in.",
        visual: "⚓ Captain logs → 📋 Coach sees → 👪 Parents see",
      },
      {
        title: "Your four main tools",
        content: "Live Feed shows all catches as they happen. Boats tab shows per-boat weight at a glance. Weigh-In Station verifies catches at the ramp. Season tab tracks standings and state qualifying points all year.",
        visual: "⚡ Live  ·  🚤 Boats  ·  ⚖️ Weigh-In  ·  📊 Season",
      },
    ],
  },
  {
    id: 2,
    icon: "⚙️",
    title: "Pre-Tournament Setup",
    subtitle: "Everything to do the night before or morning of",
    duration: "5 min",
    steps: [
      {
        title: "Create your tournament",
        content: "From your Coach Dashboard, tap New Tournament. Enter the lake name, date, start and end time, fish limit, and whether it's a qualifying event. This sets the tournament window — angler phones lock out automatically at start time.",
        visual: "🏆 Tournament Name  ·  📅 Date  ·  ⏰ Times  ·  🐟 Limit",
      },
      {
        title: "Assign boat pairs",
        content: "Set up your boats in the Roster tab. Each boat needs a captain and a partner. The captain is the only one who logs catches — their phone is the only device on the water. Partners don't need the app during the tournament.",
        visual: "🚤 Boat A1: Tyler (⚓ Captain) + Mason (🎣 Angler)",
      },
      {
        title: "Share the parent link",
        content: "Before launch, tap Share Live Feed on your dashboard. This generates a link like campandcove.com/team/cypress-creek/live. Text it to your team parent group. Parents tap it on tournament morning — no account, no download, just the live feed.",
        visual: "🔗 campandcove.com/team/cypress-creek/live",
      },
      {
        title: "Brief your captains",
        content: "Each captain needs to know three things: (1) How to log a catch and select which angler caught it. (2) How cull mode works when they hit the 5-fish limit. (3) Where the Emergency and Need Help buttons are — and that they should never hesitate to use them.",
        visual: "📷 Log catch  ·  ⚖️ Cull  ·  🆘 Emergency  ·  🛟 Need Help",
      },
    ],
  },
  {
    id: 3,
    icon: "🎣",
    title: "Tournament Day — Captains",
    subtitle: "What happens on the water and what you monitor",
    duration: "4 min",
    steps: [
      {
        title: "Logging a catch",
        content: "Captain catches a fish (or their partner does). They tap Log Catch + Photo, select who caught it with the two-button toggle, take a photo with the rear camera, enter weight, lure, depth, and structure. Tap Lock — a unique verify code is generated instantly with a locked timestamp.",
        visual: "📷 Photo  ·  Who caught it?  ·  ⚖️ Weight  ·  🔒 Code generated",
      },
      {
        title: "The verify code",
        content: "Every catch gets a code like FORK-25-7X4K. This ties the photo, weight, angler name, boat, and exact time together in one tamper-evident record. At weigh-in you enter this code to confirm the catch is legitimate — the system shows the photo and timestamp.",
        visual: "FORK-25-7X4K  ·  Tyler Brooks  ·  4.8 lbs  ·  7:02 AM ✓",
      },
      {
        title: "Cull mode",
        content: "When a captain logs a 6th fish, cull mode triggers automatically. The screen shows their current 5-fish bag sorted lightest to heaviest, with a weight gain/loss preview for each possible cull. The captain taps the fish to release. The culled fish stays in the audit log with its verify code preserved.",
        visual: "Fish 6 logged → Bag appears → Tap to release → Weight updates",
      },
      {
        title: "What you see as coach",
        content: "Your Live Feed updates in real time as captains log catches. The Boats tab shows combined weight and fish count per boat. If a boat goes quiet for a long time, check in — the Need Help button is there if they have an issue.",
        visual: "🚤 Boat A1: 19.65 lbs · 5 fish  ·  🚤 Boat A2: 10.50 lbs · 3 fish",
      },
    ],
  },
  {
    id: 4,
    icon: "⚖️",
    title: "Weigh-In Station",
    subtitle: "Running a clean, dispute-free weigh-in",
    duration: "5 min",
    steps: [
      {
        title: "How weigh-in works",
        content: "Boats come to the ramp. The captain walks up with their phone showing their catch list. You open the Weigh-In tab on your dashboard. For each catch, the captain reads you their verify code — you type it in, the system shows the photo, angler name, and on-water weight.",
        visual: "Captain reads code → Coach enters code → System confirms → Scale weight entered",
      },
      {
        title: "Entering official weights",
        content: "Once the catch is verified, enter the scale weight. This becomes the official tournament weight — separate from the on-water estimate the captain logged. The final weight calculates automatically with any penalties applied.",
        visual: "On-water: 4.8 lbs  ·  Scale: 4.72 lbs  ·  Official: 4.72 lbs",
      },
      {
        title: "Applying penalties",
        content: "Two penalty types are built in. Dead fish: tap the Dead Fish toggle — 0.25 lb deducted automatically per standard rules. Other penalties: enter a custom weight deduction for any other infraction. The final official weight and penalty breakdown appear before you confirm.",
        visual: "💀 Dead fish: -0.25 lbs  ·  Other: -0.00 lbs  ·  Official: 4.47 lbs",
      },
      {
        title: "Live results",
        content: "Every confirmed catch posts to the official leaderboard instantly. Parents watching the live feed see the leaderboard update in real time. By the time the last boat weighs in, your results are already published. No spreadsheet, no waiting, no disputes.",
        visual: "🥇 Tyler Brooks  ·  18.42 lbs  ·  5 fish  ·  ✓ Official",
      },
    ],
  },
  {
    id: 5,
    icon: "🚨",
    title: "Safety Protocols",
    subtitle: "Emergency and help systems — know these before launch day",
    duration: "3 min",
    steps: [
      {
        title: "Two alert levels",
        content: "There are two separate buttons on every captain's screen. The red Emergency button is for life-threatening situations — someone overboard, medical emergency, capsizing. The gold Need Help button is for non-emergency issues — boat breakdown, engine trouble, out of fuel, minor injury.",
        visual: "🆘 EMERGENCY = call 911 level  ·  🛟 NEED HELP = send assistance",
      },
      {
        title: "How Emergency works",
        content: "Captain taps Emergency → confirmation screen appears → they hold the button for 3 seconds to prevent accidental presses → app captures GPS coordinates → your dashboard gets a pulsing red alert with their exact location and a one-tap Maps link. Alert stays on screen until you acknowledge it.",
        visual: "Tap → Hold 3s → GPS captured → Coach alerted → Maps link ready",
      },
      {
        title: "How Need Help works",
        content: "Captain taps Need Help → selects a reason (engine trouble, out of fuel, dead battery, etc.) → adds an optional note like 'near cove 3' → sends GPS to your dashboard. You see a gold card with their location and a Resolved button to dismiss when handled. Multiple help requests stack.",
        visual: "🔧 Engine trouble  ·  📍 GPS sent  ·  Coach dispatches help  ·  ✓ Resolved",
      },
      {
        title: "Brief your captains on safety",
        content: "Before every tournament, tell your captains: the Emergency button is there for a reason — use it without hesitation if anyone is in danger. There is no wrong time to press it. The 3-second hold is only to prevent accidents, not to make them think twice about using it in a real emergency.",
        visual: "✓ Know where the buttons are  ·  ✓ No hesitation in an emergency",
      },
    ],
  },
  {
    id: 6,
    icon: "📊",
    title: "Season Management",
    subtitle: "Tracking standings, qualifying points, and player development",
    duration: "4 min",
    steps: [
      {
        title: "Season standings",
        content: "The Season tab tracks cumulative points across all events automatically. Points from each tournament post when you close the event. The top 4 anglers by points count toward state qualifying — they're highlighted in blue with a State Qualifier badge.",
        visual: "#1 Tyler Brooks · 420 pts  ·  #2 Jake Morales · 390 pts  ·  STATE ✓",
      },
      {
        title: "Player cards",
        content: "Tap any angler in the Roster tab to open their player card — season rank, state qualifier status, today's stats, top lure, top structure, best conditions, and scout notes. Cards update automatically as data comes in. Great for parent conversations and recruiting.",
        visual: "🐆 Tyler Brooks · Grade 11 · Season #1 · STATE QUALIFIER",
      },
      {
        title: "Exporting results",
        content: "After every tournament, use Export Results in your dashboard to generate a CSV or PDF of official results. This is the format required for THSBA and SAF association submission. No more manual entry into spreadsheets — one tap, formatted correctly.",
        visual: "📤 Export → THSBA format → Submit to association",
      },
      {
        title: "Parent engagement",
        content: "The parent live feed link works for every tournament — just reshare it each event. Parents who follow along regularly become your most enthusiastic boosters. The branded catch receipts kids share after tournaments build the Bass Boss brand and your team's profile in the community.",
        visual: "📱 Parent link  ·  📷 Shareable receipts  ·  🏕️ Bass Boss branded",
      },
    ],
  },
];

function CoachCourse({ onComplete }) {
  const [phase, setPhase]             = useState("home");    // home | module | quiz | certificate
  const [activeModule, setActiveModule] = useState(null);
  const [activeStep, setActiveStep]   = useState(0);
  const [completed, setCompleted]     = useState(new Set());
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const totalSteps   = COURSE_MODULES.reduce((s, m) => s + m.steps.length, 0);
  const completedSteps = [...completed].reduce((s, id) => {
    const mod = COURSE_MODULES.find(m => m.id === id);
    return s + (mod?.steps.length || 0);
  }, 0);
  const progress = Math.round((completedSteps / totalSteps) * 100);
  const allDone  = completed.size === COURSE_MODULES.length;

  const openModule = (mod) => {
    setActiveModule(mod);
    setActiveStep(0);
    setPhase("module");
  };

  const nextStep = () => {
    if (activeStep < activeModule.steps.length - 1) {
      setActiveStep(s => s + 1);
    } else {
      setCompleted(prev => new Set([...prev, activeModule.id]));
      setPhase("home");
      setActiveModule(null);
    }
  };

  const prevStep = () => {
    if (activeStep > 0) setActiveStep(s => s - 1);
    else setPhase("home");
  };

  // Simple quiz — 3 questions
  const QUIZ = [
    {
      q: "During a tournament, which device logs catches on the water?",
      options: ["Every angler's phone", "The coach's phone", "The boat captain's phone only", "A shared tablet"],
      correct: 2,
    },
    {
      q: "What does the verify code prove?",
      options: ["The fish's weight", "That the catch was logged at a specific time with a locked timestamp", "The angler's identity", "The lake location"],
      correct: 1,
    },
    {
      q: "When should a captain use the Emergency button?",
      options: ["Only if the boat sinks", "When they need directions", "Any time someone's safety may be at risk — never hesitate", "Only after calling 911 first"],
      correct: 2,
    },
    {
      q: "What happens when an angler catches their 6th fish?",
      options: ["The catch is automatically discarded", "Cull mode opens — captain selects which fish to release", "The app blocks the entry", "Coach is notified to decide"],
      correct: 1,
    },
    {
      q: "Where does the parent live feed come from?",
      options: ["Parents download a separate app", "Coach shares a link — no login or download needed", "Parents log in with the team code", "Coach texts each parent individually"],
      correct: 1,
    },
  ];

  const quizScore = QUIZ.filter((q, i) => quizAnswers[i] === q.correct).length;
  const passed    = quizScore >= 4;

  // ── Certificate ──
  if (phase === "certificate") return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <div style={{ background: `linear-gradient(160deg, ${TEAM.primaryColor}, #0a1020)`, border: `2px solid ${TEAM.accentColor}`, borderRadius: "16px", padding: "32px 24px", textAlign: "center", position: "relative", overflow: "hidden", marginBottom: "16px" }}>
        <div style={{ position: "absolute", right: "-20px", top: "-20px", fontSize: "140px", opacity: 0.05, lineHeight: 1 }}>{TEAM.mascotEmoji}</div>
        <div style={{ fontSize: "44px", marginBottom: "12px" }}>🏆</div>
        <div style={{ fontSize: "9px", letterSpacing: "4px", color: `${TEAM.accentColor}99`, textTransform: "uppercase", marginBottom: "8px" }}>Bass Boss · Official Certification</div>
        <div style={{ fontSize: "22px", color: TEAM.textOnPrimary, marginBottom: "6px" }}>Tournament Director</div>
        <div style={{ fontSize: "13px", color: `${TEAM.textOnPrimary}88`, marginBottom: "20px" }}>Certified · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>

        <div style={{ background: "rgba(0,0,0,0.35)", borderRadius: "10px", padding: "16px 20px", marginBottom: "20px" }}>
          <div style={{ fontSize: "20px", color: TEAM.textOnPrimary }}>{TEAM.coach}</div>
          <div style={{ fontSize: "12px", color: `${TEAM.textOnPrimary}77`, marginTop: "4px" }}>{TEAM.school}</div>
          <div style={{ fontSize: "11px", color: `${TEAM.accentColor}99`, marginTop: "3px" }}>{TEAM.conference}</div>
        </div>

        <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap", marginBottom: "20px" }}>
          {COURSE_MODULES.map(m => (
            <span key={m.id} style={{ background: `${TEAM.accentColor}22`, border: `1px solid ${TEAM.accentColor}44`, borderRadius: "4px", padding: "3px 10px", fontSize: "10px", color: TEAM.accentColor }}>{m.icon} {m.title.split(" ").slice(0, 2).join(" ")}</span>
          ))}
        </div>

        <div style={{ fontSize: "9px", color: `${TEAM.textOnPrimary}44`, letterSpacing: "2px" }}>BASS BOSS · BY CAMP & COVE · THSBA RECOGNIZED</div>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "16px 18px", marginBottom: "14px" }}>
        <div style={{ fontSize: "10px", letterSpacing: "2px", color: C.muted, textTransform: "uppercase", marginBottom: "12px" }}>Quiz Results</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "32px", color: C.green, fontWeight: "bold" }}>{quizScore}/5</div>
          <Badge label="Certified ✓" color={C.green} />
        </div>
        {QUIZ.map((q, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 0", borderTop: `1px solid ${C.border}`, marginTop: "8px" }}>
            <span style={{ fontSize: "14px" }}>{quizAnswers[i] === q.correct ? "✅" : "❌"}</span>
            <div style={{ fontSize: "11px", color: quizAnswers[i] === q.correct ? C.text : C.muted, lineHeight: 1.4 }}>{q.q}</div>
          </div>
        ))}
      </div>

      <button onClick={onComplete} style={{ width: "100%", background: C.blue, border: "none", color: "#fff", padding: "14px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", fontWeight: "bold", fontFamily: C.font }}>
        Go to Dashboard →
      </button>
    </div>
  );

  // ── Quiz ──
  if (phase === "quiz") return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <div style={{ background: `linear-gradient(135deg, ${TEAM.primaryColor}88, #0a1020)`, border: `1px solid ${TEAM.accentColor}44`, borderRadius: "12px", padding: "20px 18px", marginBottom: "16px", textAlign: "center" }}>
        <div style={{ fontSize: "28px", marginBottom: "8px" }}>📝</div>
        <div style={{ fontSize: "17px", color: C.text }}>Certification Quiz</div>
        <div style={{ fontSize: "11px", color: C.muted, marginTop: "4px" }}>5 questions · Pass with 4 or more correct</div>
      </div>

      {!quizSubmitted ? (
        <div>
          {QUIZ.map((q, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "16px 18px", marginBottom: "12px" }}>
              <div style={{ fontSize: "9px", letterSpacing: "2px", color: C.muted, textTransform: "uppercase", marginBottom: "8px" }}>Question {i + 1} of {QUIZ.length}</div>
              <div style={{ fontSize: "14px", color: C.text, lineHeight: 1.5, marginBottom: "14px" }}>{q.q}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {q.options.map((opt, j) => (
                  <button key={j} onClick={() => setQuizAnswers(prev => ({ ...prev, [i]: j }))}
                    style={{ background: quizAnswers[i] === j ? `${C.blue}22` : C.cardHi, border: `1px solid ${quizAnswers[i] === j ? C.blue : C.border}`, borderRadius: "8px", padding: "11px 14px", cursor: "pointer", fontFamily: C.font, fontSize: "13px", color: quizAnswers[i] === j ? C.blue : C.muted, textAlign: "left", transition: "all 0.15s", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: quizAnswers[i] === j ? C.blue : C.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: quizAnswers[i] === j ? "#fff" : C.muted, flexShrink: 0, fontWeight: "bold" }}>
                      {["A","B","C","D"][j]}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={() => setQuizSubmitted(true)}
            disabled={Object.keys(quizAnswers).length < QUIZ.length}
            style={{ width: "100%", background: Object.keys(quizAnswers).length >= QUIZ.length ? C.blue : C.border, border: "none", color: Object.keys(quizAnswers).length >= QUIZ.length ? "#fff" : C.muted, padding: "14px", borderRadius: "8px", cursor: Object.keys(quizAnswers).length >= QUIZ.length ? "pointer" : "default", fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", fontWeight: "bold", fontFamily: C.font }}
          >
            Submit Quiz
          </button>
        </div>
      ) : (
        <div>
          {/* Results */}
          <div style={{ background: passed ? `${C.green}12` : `${C.red}12`, border: `2px solid ${passed ? C.green : C.red}`, borderRadius: "12px", padding: "20px", textAlign: "center", marginBottom: "16px" }}>
            <div style={{ fontSize: "36px", marginBottom: "10px" }}>{passed ? "🎉" : "📚"}</div>
            <div style={{ fontSize: "20px", color: passed ? C.green : C.red, fontWeight: "bold" }}>{passed ? "You passed!" : "Almost there"}</div>
            <div style={{ fontSize: "28px", color: C.text, margin: "10px 0", fontWeight: "bold" }}>{quizScore} / {QUIZ.length}</div>
            <div style={{ fontSize: "12px", color: C.muted }}>{passed ? "Excellent work. Your certification is ready." : `You need ${4 - quizScore} more correct. Review the material and try again.`}</div>
          </div>
          {passed ? (
            <button onClick={() => setPhase("certificate")} style={{ width: "100%", background: C.green, border: "none", color: "#001a0a", padding: "14px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", fontWeight: "bold", fontFamily: C.font }}>
              Get My Certificate →
            </button>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => { setPhase("home"); setQuizAnswers({}); setQuizSubmitted(false); }} style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, color: C.muted, padding: "13px", borderRadius: "8px", cursor: "pointer", fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", fontFamily: C.font }}>Review Modules</button>
              <button onClick={() => { setQuizAnswers({}); setQuizSubmitted(false); }} style={{ flex: 1, background: C.blue, border: "none", color: "#fff", padding: "13px", borderRadius: "8px", cursor: "pointer", fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", fontWeight: "bold", fontFamily: C.font }}>Retry Quiz</button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── Module lesson ──
  if (phase === "module" && activeModule) {
    const step     = activeModule.steps[activeStep];
    const isLast   = activeStep === activeModule.steps.length - 1;
    const stepsPct = ((activeStep + 1) / activeModule.steps.length) * 100;

    return (
      <div style={{ animation: "fadeUp 0.3s ease" }}>
        {/* Module header */}
        <div style={{ background: `linear-gradient(135deg,${TEAM.primaryColor}88,#0a1020)`, border: `1px solid ${TEAM.accentColor}44`, borderRadius: "12px", padding: "16px 18px", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{ fontSize: "24px" }}>{activeModule.icon}</span>
            <div>
              <div style={{ fontSize: "9px", letterSpacing: "3px", color: `${TEAM.accentColor}88`, textTransform: "uppercase" }}>Module {activeModule.id} of {COURSE_MODULES.length}</div>
              <div style={{ fontSize: "16px", color: C.text, marginTop: "2px" }}>{activeModule.title}</div>
            </div>
          </div>
          {/* Step progress bar */}
          <div style={{ height: "4px", background: "rgba(0,0,0,0.4)", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${stepsPct}%`, background: TEAM.accentColor, borderRadius: "2px", transition: "width 0.4s ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
            <span style={{ fontSize: "9px", color: `${TEAM.textOnPrimary}55` }}>Step {activeStep + 1} of {activeModule.steps.length}</span>
            <span style={{ fontSize: "9px", color: `${TEAM.accentColor}77` }}>{activeModule.duration}</span>
          </div>
        </div>

        {/* Step card */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", overflow: "hidden", marginBottom: "14px" }}>
          {/* Step title */}
          <div style={{ background: C.cardHi, padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "15px", color: C.text }}>{step.title}</div>
          </div>

          {/* Visual callout */}
          <div style={{ background: `${TEAM.primaryColor}33`, borderBottom: `1px solid ${C.border}`, padding: "14px 18px", textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: TEAM.accentColor, fontFamily: C.mono, letterSpacing: "1px", lineHeight: 1.8 }}>{step.visual}</div>
          </div>

          {/* Content */}
          <div style={{ padding: "18px 18px" }}>
            <div style={{ fontSize: "14px", color: C.text, lineHeight: 1.8 }}>{step.content}</div>
          </div>
        </div>

        {/* Step dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginBottom: "16px" }}>
          {activeModule.steps.map((_, i) => (
            <div key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: i <= activeStep ? TEAM.accentColor : C.border, transition: "background 0.3s", boxShadow: i === activeStep ? `0 0 8px ${TEAM.accentColor}` : "none" }} />
          ))}
        </div>

        {/* Nav buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={prevStep} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, padding: "13px 20px", borderRadius: "8px", cursor: "pointer", fontFamily: C.font, fontSize: "12px" }}>
            ← Back
          </button>
          <button onClick={nextStep} style={{ flex: 1, background: isLast ? C.green : C.blue, border: "none", color: isLast ? "#001a0a" : "#fff", padding: "13px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", fontWeight: "bold", fontFamily: C.font }}>
            {isLast ? "✓ Complete Module" : "Next →"}
          </button>
        </div>
      </div>
    );
  }

  // ── Home ──
  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      {/* Course header */}
      <div style={{ background: `linear-gradient(160deg,${TEAM.primaryColor},#0a1020)`, border: `1px solid ${TEAM.accentColor}44`, borderRadius: "14px", padding: "22px 20px", marginBottom: "16px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: "-16px", top: "-16px", fontSize: "100px", opacity: 0.06, lineHeight: 1 }}>{TEAM.mascotEmoji}</div>
        <div style={{ fontSize: "9px", letterSpacing: "4px", color: `${TEAM.accentColor}99`, textTransform: "uppercase", marginBottom: "6px" }}>Bass Boss · Coach Certification</div>
        <div style={{ fontSize: "21px", color: TEAM.textOnPrimary, marginBottom: "4px" }}>Tournament Director Course</div>
        <div style={{ fontSize: "12px", color: `${TEAM.textOnPrimary}77`, marginBottom: "16px" }}>{COURSE_MODULES.length} modules · ~{COURSE_MODULES.reduce((s,m)=>s+parseInt(m.duration),0)} minutes · Free with your subscription</div>

        {/* Overall progress */}
        <div style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "10px", color: `${TEAM.textOnPrimary}66`, letterSpacing: "1px", textTransform: "uppercase" }}>
            {allDone ? "Course Complete ✓" : `${completed.size} of ${COURSE_MODULES.length} modules done`}
          </span>
          <span style={{ fontSize: "13px", color: TEAM.accentColor, fontWeight: "bold" }}>{progress}%</span>
        </div>
        <div style={{ height: "8px", background: "rgba(0,0,0,0.4)", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg, ${TEAM.accentColor}, ${C.green})`, borderRadius: "4px", transition: "width 0.5s ease" }} />
        </div>

        {/* Start quiz if all done */}
        {allDone && (
          <button onClick={() => setPhase("quiz")} style={{ width: "100%", marginTop: "14px", background: C.green, border: "none", color: "#001a0a", padding: "13px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", fontWeight: "bold", fontFamily: C.font }}>
            Take Certification Quiz →
          </button>
        )}
      </div>

      {/* Module list */}
      <div style={{ fontSize: "9px", letterSpacing: "2px", color: C.muted, textTransform: "uppercase", marginBottom: "10px" }}>Course Modules</div>
      {COURSE_MODULES.map((mod, i) => {
        const done = completed.has(mod.id);
        const isNext = !done && (i === 0 || completed.has(COURSE_MODULES[i-1]?.id));
        return (
          <div key={mod.id} onClick={() => openModule(mod)}
            style={{ background: done ? `${C.green}08` : C.card, border: `1px solid ${done ? C.green+"33" : isNext ? C.borderHi : C.border}`, borderRadius: "10px", padding: "14px 16px", marginBottom: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "14px", transition: "all 0.15s" }}
            onMouseOver={e => e.currentTarget.style.borderColor = done ? C.green+"66" : TEAM.accentColor+"66"}
            onMouseOut={e => e.currentTarget.style.borderColor = done ? C.green+"33" : isNext ? C.borderHi : C.border}
          >
            {/* Status icon */}
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: done ? `${C.green}22` : isNext ? `${TEAM.accentColor}18` : `${C.border}44`, border: `2px solid ${done ? C.green : isNext ? TEAM.accentColor : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>
              {done ? "✅" : mod.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                <span style={{ fontSize: "14px", color: done ? C.green : isNext ? C.text : C.muted }}>{mod.title}</span>
                {isNext && !done && <Badge label="Up Next" color={TEAM.accentColor} />}
                {done && <Badge label="Done" color={C.green} />}
              </div>
              <div style={{ fontSize: "11px", color: C.dimmer }}>{mod.subtitle}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: "10px", color: C.dimmer }}>{mod.duration}</div>
              <div style={{ fontSize: "10px", color: C.dimmer, marginTop: "2px" }}>{mod.steps.length} steps</div>
            </div>
          </div>
        );
      })}

      {/* Quick reference card */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "14px 16px", marginTop: "6px" }}>
        <div style={{ fontSize: "9px", letterSpacing: "2px", color: C.muted, textTransform: "uppercase", marginBottom: "10px" }}>Quick Reference</div>
        {[
          { icon:"🆘", label:"Emergency", desc:"Hold 3 sec → GPS sent to coach" },
          { icon:"🛟", label:"Need Help",  desc:"Select reason → GPS sent to coach" },
          { icon:"📷", label:"Log Catch",  desc:"Photo → Who caught it → Weight → Code" },
          { icon:"⚖️", label:"Cull",       desc:"Auto-triggers on 6th fish" },
          { icon:"🔗", label:"Parent Link",desc:"Share before every tournament" },
        ].map((r,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"7px 0", borderBottom: i<4?`1px solid ${C.border}`:"none" }}>
            <span style={{ fontSize:"16px", width:"24px", textAlign:"center" }}>{r.icon}</span>
            <div>
              <span style={{ fontSize:"12px", color:C.text, fontWeight:"bold" }}>{r.label}</span>
              <span style={{ fontSize:"11px", color:C.muted, marginLeft:"8px" }}>{r.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────────
export default function HighSchoolApp() {
  const [view,setView]=useState("coach");
  const [emergencyAlert, setEmergencyAlert] = useState(null);
  const [helpAlerts, setHelpAlerts]         = useState([]);

  // Listen for emergency and help events from captain view
  useState(() => {
    const emergencyHandler = (e) => setEmergencyAlert(e.detail);
    const helpHandler      = (e) => setHelpAlerts(prev => [...prev, { ...e.detail, id: Date.now() }]);
    window.addEventListener("cc_emergency", emergencyHandler);
    window.addEventListener("cc_needhelp",  helpHandler);
    return () => {
      window.removeEventListener("cc_emergency", emergencyHandler);
      window.removeEventListener("cc_needhelp",  helpHandler);
    };
  });

  const views=[
    {key:"coach",  label:"Coach",   icon:"📋"},
    {key:"captain",label:"Captain", icon:"⚓"},
    {key:"angler", label:"Angler",  icon:"🎣"},
    {key:"parent", label:"Parent",  icon:"👪"},
    {key:"course", label:"Course",  icon:"🎓"},
  ];

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:C.font,color:C.text}}>
      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }
        @keyframes cardPop { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
        @keyframes emergencyPulse { 0%,100%{box-shadow:0 0 80px rgba(239,68,68,0.4)} 50%{box-shadow:0 0 120px rgba(239,68,68,0.8)} }
        * { box-sizing:border-box; }
        input::placeholder{color:#2a3050;}
        input:focus,select:focus{border-color:#4a7cff!important;outline:none;}
        select option{background:#0e1019;color:#e2e8f4;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:#1e2235;border-radius:2px;}
      `}</style>

      {/* Emergency alert — takes over everything when active */}
      {emergencyAlert && (
        <EmergencyAlert alert={emergencyAlert} onDismiss={() => setEmergencyAlert(null)} />
      )}

      {/* Emergency indicator in header when alert is active */}
      {emergencyAlert && (
        <div style={{ background: C.red, padding: "8px 16px", textAlign: "center", fontSize: "11px", color: "#fff", letterSpacing: "2px", fontWeight: "bold", animation: "pulse 1.5s ease-in-out infinite" }}>
          🚨 EMERGENCY ALERT ACTIVE — BOAT {emergencyAlert.boat.id}
        </div>
      )}

      {/* Header */}
      <div style={{background:"linear-gradient(180deg,#0e1019,#08090d)",borderBottom:`1px solid ${C.border}`,padding:"14px 16px 0"}}>
        <MascotHeader mini={true} />
        <div style={{display:"flex",gap:"3px",background:"#08090d",borderRadius:"6px 6px 0 0",padding:"3px 3px 0",marginTop:"12px"}}>
          {views.map(v=>(
            <button key={v.key} onClick={()=>setView(v.key)} style={{flex:1,padding:"9px 4px",borderRadius:"4px 4px 0 0",border:"none",cursor:"pointer",fontFamily:C.font,fontSize:"10px",letterSpacing:"0.3px",background:view===v.key?C.card:"transparent",color:view===v.key?C.blue:C.dimmer,borderBottom:view===v.key?`2px solid ${C.blue}`:"2px solid transparent",transition:"all 0.15s",display:"flex",alignItems:"center",justifyContent:"center",gap:"4px"}}>
              <span>{v.icon}</span><span>{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:"680px",margin:"0 auto",padding:"18px 16px 60px"}}>
        {view==="coach"   && <CoachView emergencyAlert={emergencyAlert} onDismissEmergency={() => setEmergencyAlert(null)} helpAlerts={helpAlerts} onDismissHelp={(id) => setHelpAlerts(prev => prev.filter(a => a.id !== id))} />}
        {view==="captain" && <BoatCaptainView />}
        {view==="angler"  && <AnglerView />}
        {view==="parent"  && <ParentView />}
        {view==="course"  && <CoachCourse onComplete={() => setView("coach")} />}
      </div>

      <div style={{textAlign:"center",padding:"14px",borderTop:`1px solid ${C.border}`,fontSize:"9px",color:C.dimmer,letterSpacing:"2px"}}>
        BASS BOSS · BY CAMP & COVE · BUILT FOR THE BITE
      </div>
    </div>
  );
}