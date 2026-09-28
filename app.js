const PLOT_CONFIG = {responsive:true, displaylogo:false, modeBarButtonsToRemove:["lasso2d","select2d"]};
const BASE_LAYOUT = {
  margin:{l:66,r:20,t:52,b:58},
  paper_bgcolor:"#fff", plot_bgcolor:"#fff",
  font:{family:"Inter, system-ui, sans-serif", color:"#14213d"},
  xaxis:{gridcolor:"#eef0f3", zeroline:false},
  yaxis:{gridcolor:"#eef0f3", zeroline:false},
  hoverlabel:{namelength:-1}
};

function paceFmt(v){
  const m=Math.floor(v/60), s=v-m*60;
  return `${m}:${s.toFixed(1).padStart(4,"0")}`;
}
function timeFmt(v){
  const m=Math.floor(v/60), s=v-m*60;
  return `${m}:${s.toFixed(2).padStart(5,"0")}`;
}
function dateFmt(iso){
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB",{day:"numeric",month:"short"});
}

fetch("data/swims.json").then(r=>r.json()).then(data=>{
  const sessions=data.sessions;
  const latest=sessions[sessions.length-1];
  const pb=sessions.reduce((a,b)=>a.best_500m.pace_s_per_100m < b.best_500m.pace_s_per_100m ? a : b);

  document.getElementById("latestBest").textContent=`${paceFmt(latest.best_500m.pace_s_per_100m)} /100 m`;
  document.getElementById("pb500").textContent=`${paceFmt(pb.best_500m.pace_s_per_100m)} (${dateFmt(pb.date)})`;
  document.getElementById("latestStrokes").textContent=latest.best_500m.mean_strokes_per_25m.toFixed(2);

  Plotly.newPlot("progression",[
    {
      x:sessions.map(s=>s.date), y:sessions.map(s=>s.best_500m.pace_s_per_100m),
      type:"scatter", mode:"lines+markers+text", name:"Best 500 m",
      text:sessions.map(s=>paceFmt(s.best_500m.pace_s_per_100m)),
      textposition:"top center",
      customdata:sessions.map(s=>[s.best_500m.start_length,s.best_500m.end_length,timeFmt(s.best_500m.time_s),s.best_500m.mean_strokes_per_25m]),
      hovertemplate:"%{x}<br>Pace %{y:.1f} s/100m<br>500 m %{customdata[2]}<br>Lengths %{customdata[0]}–%{customdata[1]}<br>Strokes %{customdata[3]:.2f}/25m<extra></extra>"
    },
    {
      x:sessions.map(s=>s.date), y:sessions.map(()=>data.goal_pace_s_per_100m),
      type:"scatter", mode:"lines", name:"2:00 goal", line:{dash:"dash",width:1.5}
    }
  ],{
    ...BASE_LAYOUT,
    title:"Best rolling pause-free 500 m",
    yaxis:{...BASE_LAYOUT.yaxis,title:"Pace (s / 100 m)",autorange:"reversed"},
    xaxis:{...BASE_LAYOUT.xaxis,title:"Date"}
  },PLOT_CONFIG);

  const distTraces=sessions.map(s=>({
    y:s.best_500m.split_paces_s_per_100m,
    x:Array(20).fill(dateFmt(s.date)),
    type:"box", name:dateFmt(s.date),
    boxpoints:"all", jitter:.35, pointpos:0,
    marker:{size:6,opacity:.55},
    line:{width:2},
    hovertemplate:`${dateFmt(s.date)}<br>%{y:.1f} s/100m<extra></extra>`
  }));
  Plotly.newPlot("distributions",distTraces,{
    ...BASE_LAYOUT,
    title:"Best 500 m split distributions",
    showlegend:false,
    yaxis:{...BASE_LAYOUT.yaxis,title:"25 m split as pace (s / 100 m)",autorange:"reversed"},
    xaxis:{...BASE_LAYOUT.xaxis,title:"Swim date"}
  },PLOT_CONFIG);

  const sessionSelect=document.getElementById("sessionSelect");
  const scatterSelect=document.getElementById("scatterSelect");
  sessions.forEach((s,i)=>{
    const o=document.createElement("option"); o.value=i; o.textContent=dateFmt(s.date); sessionSelect.appendChild(o);
    const p=document.createElement("option"); p.value=i; p.textContent=dateFmt(s.date); scatterSelect.appendChild(p);
  });
  sessionSelect.value=sessions.length-1;

  function renderSession(i){
    const s=sessions[i];
    const pauseXs=s.pauses_after_length.map(l=>l+0.5);
    const traces=[{
      x:s.lengths.map(v=>v.length), y:s.lengths.map(v=>v.pace_s_per_100m),
      type:"scatter",mode:"lines+markers",name:"Pace",
      customdata:s.lengths.map(v=>[v.strokes,v.cadence,v.segment]),
      hovertemplate:"Length %{x}<br>Pace %{y:.1f} s/100m<br>Strokes %{customdata[0]}<br>Cadence %{customdata[1]}<br>Segment %{customdata[2]}<extra></extra>"
    }];
    const shapes=[
      ...pauseXs.map(x=>({type:"line",x0:x,x1:x,y0:0,y1:1,yref:"paper",line:{dash:"dot",width:1}})),
      {type:"rect",xref:"x",yref:"paper",x0:s.best_500m.start_length-.5,x1:s.best_500m.end_length+.5,y0:0,y1:1,fillcolor:"rgba(15,118,110,.08)",line:{width:0}}
    ];
    Plotly.newPlot("sessionPace",traces,{
      ...BASE_LAYOUT,
      title:`${dateFmt(s.date)} — length-by-length pace`,
      shapes,
      yaxis:{...BASE_LAYOUT.yaxis,title:"Pace (s / 100 m)",autorange:"reversed"},
      xaxis:{...BASE_LAYOUT.xaxis,title:"Length number"}
    },PLOT_CONFIG);
  }
  sessionSelect.addEventListener("change",e=>renderSession(+e.target.value));
  renderSession(sessions.length-1);

  function renderScatter(which){
    const selected=which==="all" ? sessions : [sessions[+which]];
    const traces=selected.map(s=>({
      x:s.lengths.map(v=>v.strokes),
      y:s.lengths.map(v=>v.pace_s_per_100m),
      mode:"markers",type:"scatter",name:dateFmt(s.date),
      marker:{size:8,opacity:.55},
      customdata:s.lengths.map(v=>[v.length,v.segment,v.distance_per_stroke_m]),
      hovertemplate:"Strokes %{x}<br>Pace %{y:.1f} s/100m<br>Length %{customdata[0]}<br>Segment %{customdata[1]}<br>Distance/stroke %{customdata[2]:.2f} m<extra>%{fullData.name}</extra>"
    }));
    Plotly.newPlot("paceStroke",traces,{
      ...BASE_LAYOUT,
      title:"Pace vs stroke count",
      yaxis:{...BASE_LAYOUT.yaxis,title:"Pace (s / 100 m)",autorange:"reversed"},
      xaxis:{...BASE_LAYOUT.xaxis,title:"Strokes per 25 m"}
    },PLOT_CONFIG);
  }
  scatterSelect.addEventListener("change",e=>renderScatter(e.target.value));
  renderScatter("all");

  const tbody=document.getElementById("summaryBody");
  sessions.forEach(s=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td>${dateFmt(s.date)}</td>
      <td>${s.distance_m} m</td>
      <td>${paceFmt(s.mean_pace_s_per_100m)}</td>
      <td class="best">${paceFmt(s.best_500m.pace_s_per_100m)}</td>
      <td>${timeFmt(s.best_500m.time_s)}</td>
      <td>${s.best_500m.mean_strokes_per_25m.toFixed(2)}</td>
      <td>L${s.best_500m.start_length}–${s.best_500m.end_length}</td>
      <td>${s.pauses_after_length.length}</td>`;
    tbody.appendChild(tr);
  });
}).catch(err=>{
  document.body.insertAdjacentHTML("beforeend",`<pre style="padding:20px;color:#b42318">Could not load swim data: ${err}</pre>`);
});
