const CONFIG={responsive:true,displaylogo:false,modeBarButtonsToRemove:["lasso2d","select2d"]};
const layoutBase={
  margin:{l:66,r:20,t:52,b:58},paper_bgcolor:"#fff",plot_bgcolor:"#fff",
  font:{family:"Inter, system-ui, sans-serif",color:"#14213d"},
  xaxis:{gridcolor:"#eef0f3",zeroline:false},
  yaxis:{gridcolor:"#eef0f3",zeroline:false},
  hoverlabel:{namelength:-1}
};
function paceFmt(v){const m=Math.floor(v/60),s=v-m*60;return `${m}:${s.toFixed(1).padStart(4,"0")}`;}
function timeFmt(v){const m=Math.floor(v/60),s=v-m*60;return `${m}:${s.toFixed(2).padStart(5,"0")}`;}
function dateFmt(iso){return new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB",{day:"numeric",month:"short"});}

fetch("data/swims.json").then(r=>r.json()).then(data=>{
  const s=data.sessions;
  const latest=s[s.length-1];
  const pb=s.reduce((a,b)=>a.best_500m.pace_s_per_100m<b.best_500m.pace_s_per_100m?a:b);

  document.getElementById("latestBest").textContent=`${paceFmt(latest.best_500m.pace_s_per_100m)} /100 m`;
  document.getElementById("pb500").textContent=`${paceFmt(pb.best_500m.pace_s_per_100m)} (${dateFmt(pb.date)})`;
  document.getElementById("latestStrokes").textContent=latest.best_500m.mean_strokes_per_25m.toFixed(2);

  Plotly.newPlot("progression",[
    {x:s.map(v=>v.date),y:s.map(v=>v.best_500m.pace_s_per_100m),type:"scatter",mode:"lines+markers+text",
     text:s.map(v=>paceFmt(v.best_500m.pace_s_per_100m)),textposition:"top center",name:"Best 500 m",
     customdata:s.map(v=>[timeFmt(v.best_500m.time_s),v.best_500m.start_length,v.best_500m.end_length,v.best_500m.mean_strokes_per_25m]),
     hovertemplate:"%{x}<br>pace %{y:.1f} s/100m<br>500 m %{customdata[0]}<br>L%{customdata[1]}–%{customdata[2]}<br>%{customdata[3]:.2f} strokes/25m<extra></extra>"},
    {x:s.map(v=>v.date),y:s.map(()=>data.goal_pace_s_per_100m),type:"scatter",mode:"lines",name:"2:00 goal",line:{dash:"dash",width:1.5}}
  ],{...layoutBase,title:"Best rolling pause-free 500 m",xaxis:{...layoutBase.xaxis,title:"Date"},
      yaxis:{...layoutBase.yaxis,title:"Pace (s / 100 m)",autorange:"reversed"}},CONFIG);

  Plotly.newPlot("strokeTrend",[
    {x:s.map(v=>v.date),y:s.map(v=>v.best_500m.mean_strokes_per_25m),type:"scatter",mode:"lines+markers+text",
     text:s.map(v=>v.best_500m.mean_strokes_per_25m.toFixed(2)),textposition:"top center",name:"Strokes /25m"}
  ],{...layoutBase,title:"Stroke count in each best 500 m",xaxis:{...layoutBase.xaxis,title:"Date"},
      yaxis:{...layoutBase.yaxis,title:"Mean strokes / 25 m"}},CONFIG);

  Plotly.newPlot("paceStroke",[
    {x:s.map(v=>v.best_500m.mean_strokes_per_25m),y:s.map(v=>v.best_500m.pace_s_per_100m),type:"scatter",mode:"markers+text",
     text:s.map(v=>dateFmt(v.date)),textposition:"top center",
     marker:{size:12,opacity:.8},
     customdata:s.map(v=>[timeFmt(v.best_500m.time_s),v.best_500m.start_length,v.best_500m.end_length]),
     hovertemplate:"%{text}<br>%{x:.2f} strokes/25m<br>%{y:.1f} s/100m<br>500 m %{customdata[0]}<br>L%{customdata[1]}–%{customdata[2]}<extra></extra>"}
  ],{...layoutBase,title:"Best 500 m: pace vs stroke count",xaxis:{...layoutBase.xaxis,title:"Strokes / 25 m"},
      yaxis:{...layoutBase.yaxis,title:"Pace (s / 100 m)",autorange:"reversed"}},CONFIG);

  Plotly.newPlot("wholeVsBest",[
    {x:s.map(v=>v.mean_pace_s_per_100m),y:s.map(v=>v.best_500m.pace_s_per_100m),type:"scatter",mode:"markers+text",
     text:s.map(v=>dateFmt(v.date)),textposition:"top center",marker:{size:12,opacity:.8}}
  ],{...layoutBase,title:"Whole-swim pace vs best 500 m",xaxis:{...layoutBase.xaxis,title:"Whole-swim mean pace (s / 100 m)"},
      yaxis:{...layoutBase.yaxis,title:"Best 500 m pace (s / 100 m)",autorange:"reversed"}},CONFIG);

  const tbody=document.getElementById("summaryBody");
  s.forEach(v=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td>${dateFmt(v.date)}</td><td>${v.distance_m} m</td><td>${paceFmt(v.mean_pace_s_per_100m)}</td>
      <td class="best">${paceFmt(v.best_500m.pace_s_per_100m)}</td><td>${timeFmt(v.best_500m.time_s)}</td>
      <td>${v.best_500m.mean_strokes_per_25m.toFixed(2)}</td><td>L${v.best_500m.start_length}–${v.best_500m.end_length}</td><td>${v.pauses}</td>`;
    tbody.appendChild(tr);
  });
}).catch(err=>{
  document.body.insertAdjacentHTML("beforeend",`<pre style="padding:20px;color:#b42318">Could not load swim data: ${err}</pre>`);
});