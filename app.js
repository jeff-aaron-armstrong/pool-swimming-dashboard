const CONFIG={responsive:true,displaylogo:false,scrollZoom:false,modeBarButtonsToRemove:["lasso2d","select2d"]};
const COLORS=["#4fd1c5","#7aa2ff","#f6c177","#c4a7e7","#eb6f92","#9ccfd8","#f2ae49","#a7c7e7"];
const GRID="rgba(255,255,255,.07)", TXT="#edf4ff", MUTED="#8ca0ba";
const paceTicks=[120,125,130,135,140,145,150,155,160];

function paceFmt(v){const m=Math.floor(v/60),s=v-m*60;return m+":"+s.toFixed(1).padStart(4,"0");}
function timeFmt(v){const m=Math.floor(v/60),s=v-m*60;return m+":"+s.toFixed(2).padStart(5,"0");}
function dateFmt(iso){return new Date(iso+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"});}
function layout(){
  return {
    margin:{l:66,r:24,t:20,b:58},
    paper_bgcolor:"rgba(0,0,0,0)",plot_bgcolor:"rgba(0,0,0,0)",
    font:{family:"Inter, system-ui, sans-serif",color:TXT,size:11},
    xaxis:{gridcolor:GRID,zeroline:false,tickfont:{color:MUTED},titlefont:{color:MUTED}},
    yaxis:{gridcolor:GRID,zeroline:false,tickfont:{color:MUTED},titlefont:{color:MUTED}},
    legend:{orientation:"h",y:-.18,font:{size:10,color:MUTED}},
    hoverlabel:{bgcolor:"#07101d",bordercolor:"rgba(255,255,255,.15)",font:{color:TXT}}
  };
}
function paceAxis(title,min,max){
  return {title,autorange:"reversed",range:[max,min],tickmode:"array",tickvals:paceTicks,ticktext:paceTicks.map(paceFmt),gridcolor:GRID,zeroline:false,tickfont:{color:MUTED},titlefont:{color:MUTED}};
}
function ellipse(xs,ys,n=1.5,steps=100){
  const mx=xs.reduce((a,b)=>a+b,0)/xs.length, my=ys.reduce((a,b)=>a+b,0)/ys.length;
  let a=0,b=0,d=0;
  for(let i=0;i<xs.length;i++){const dx=xs[i]-mx,dy=ys[i]-my;a+=dx*dx;b+=dx*dy;d+=dy*dy;}
  a/=xs.length-1;b/=xs.length-1;d/=xs.length-1;
  const root=Math.sqrt(((a-d)/2)**2+b*b), l1=(a+d)/2+root, l2=Math.max(0,(a+d)/2-root);
  const th=.5*Math.atan2(2*b,a-d), c=Math.cos(th),s=Math.sin(th);
  const ex=[],ey=[];
  for(let i=0;i<=steps;i++){const t=2*Math.PI*i/steps,u=n*Math.sqrt(l1)*Math.cos(t),v=n*Math.sqrt(l2)*Math.sin(t);ex.push(mx+u*c-v*s);ey.push(my+u*s+v*c);}
  return {x:ex,y:ey,mx,my};
}

fetch("data/swims.json").then(r=>r.json()).then(data=>{
  const S=data.sessions, latest=S[S.length-1], pb=S.reduce((a,b)=>a.best_500m.pace_s_per_100m<b.best_500m.pace_s_per_100m?a:b);

  document.getElementById("latestBest").textContent=paceFmt(latest.best_500m.pace_s_per_100m)+" /100 m";
  document.getElementById("latestTime").textContent=timeFmt(latest.best_500m.time_s)+" for 500 m";
  document.getElementById("pb500").textContent=paceFmt(pb.best_500m.pace_s_per_100m)+" /100 m";
  document.getElementById("pbDate").textContent=dateFmt(pb.date)+" · "+timeFmt(pb.best_500m.time_s);
  document.getElementById("latestStrokes").textContent=latest.best_500m.mean_strokes_per_25m.toFixed(2);
  document.getElementById("latestDistance").textContent=latest.distance_m+" m";
  document.getElementById("latestWindow").textContent="Best window L"+latest.best_500m.start_length+"–"+latest.best_500m.end_length;

  const prog=[
    {x:S.map(s=>s.date),y:S.map(s=>s.best_500m.pace_s_per_100m),type:"scatter",mode:"lines+markers+text",name:"Best 500 m",
     line:{width:3,color:COLORS[0]},marker:{size:9,color:COLORS[0],line:{width:2,color:"#07101d"}},
     text:S.map(s=>paceFmt(s.best_500m.pace_s_per_100m)),textposition:"top center",textfont:{size:10,color:TXT},
     customdata:S.map(s=>[timeFmt(s.best_500m.time_s),s.best_500m.mean_strokes_per_25m,s.best_500m.start_length,s.best_500m.end_length]),
     hovertemplate:"%{x}<br><b>%{y:.1f} s/100 m</b><br>500 m %{customdata[0]}<br>%{customdata[1]:.2f} strokes/25 m<br>L%{customdata[2]}–%{customdata[3]}<extra></extra>"},
    {x:S.map(s=>s.date),y:S.map(()=>120),type:"scatter",mode:"lines",name:"2:00 goal",line:{width:1.5,dash:"dash",color:"rgba(255,255,255,.45)"},hoverinfo:"skip"}
  ];
  const lp=layout();lp.margin={l:70,r:30,t:20,b:55};lp.yaxis=paceAxis("Best 500 m pace",118,152);lp.xaxis={title:"Date",gridcolor:GRID,tickfont:{color:MUTED},titlefont:{color:MUTED}};
  Plotly.newPlot("progression",prog,lp,CONFIG);

  const violins=S.map((s,i)=>({
    type:"violin",name:dateFmt(s.date),x:Array(20).fill(dateFmt(s.date)),y:s.best_500m.lengths.map(v=>v.pace_s_per_100m),
    box:{visible:true},meanline:{visible:true},points:"all",jitter:.18,pointpos:0,
    marker:{size:5,opacity:.5,color:COLORS[i%COLORS.length]},line:{color:COLORS[i%COLORS.length],width:1.8},
    fillcolor:COLORS[i%COLORS.length],opacity:.55,hovertemplate:"%{x}<br>%{y:.1f} s/100 m<extra></extra>"
  }));
  const ld=layout();ld.margin={l:66,r:20,t:15,b:60};ld.showlegend=false;ld.violinmode="group";ld.yaxis=paceAxis("25 m split as pace",120,158);ld.xaxis={gridcolor:GRID,tickfont:{color:MUTED},titlefont:{color:MUTED}};
  Plotly.newPlot("distributions",violins,ld,CONFIG);

  const ellipseTraces=[];
  S.forEach((s,i)=>{
    const c=COLORS[i%COLORS.length], L=s.best_500m.lengths, xs=L.map(v=>v.strokes),ys=L.map(v=>v.pace_s_per_100m),e=ellipse(xs,ys);
    ellipseTraces.push({x:xs,y:ys,type:"scatter",mode:"markers",name:dateFmt(s.date),marker:{size:6,color:c,opacity:.38},
      hovertemplate:dateFmt(s.date)+"<br>%{x} strokes<br>%{y:.1f} s/100 m<extra></extra>"});
    ellipseTraces.push({x:e.x,y:e.y,type:"scatter",mode:"lines",showlegend:false,line:{color:c,width:3},hoverinfo:"skip"});
    ellipseTraces.push({x:[e.mx],y:[e.my],type:"scatter",mode:"markers",showlegend:false,marker:{symbol:"x",size:10,color:c,line:{width:2,color:c}},hoverinfo:"skip"});
  });
  const le=layout();le.margin={l:66,r:20,t:15,b:60};le.xaxis={title:"Strokes per 25 m",gridcolor:GRID,tickfont:{color:MUTED},titlefont:{color:MUTED},dtick:1};
  le.yaxis=paceAxis("25 m split as pace",120,158);le.legend={orientation:"h",y:-.22,font:{size:9,color:MUTED}};
  Plotly.newPlot("ellipses",ellipseTraces,le,CONFIG);

  const selector=document.getElementById("latestSelector");
  S.forEach((s,i)=>{const o=document.createElement("option");o.value=i;o.textContent=dateFmt(s.date);selector.appendChild(o);});
  selector.value=S.length-1;

  function detail(i){
    const s=S[i],L=s.best_500m.lengths,x=L.map((_,j)=>j+1),c=COLORS[i%COLORS.length];
    document.getElementById("latestDetailSubtitle").textContent=dateFmt(s.date)+" · L"+s.best_500m.start_length+"–L"+s.best_500m.end_length+" · "+timeFmt(s.best_500m.time_s);
    const traces=[
      {x,y:L.map(v=>v.pace_s_per_100m),type:"scatter",mode:"lines+markers",name:"Pace",line:{width:2.5,color:c},marker:{size:7,color:c},
       customdata:L.map(v=>[v.length,v.strokes,v.cadence]),hovertemplate:"Best-500 length %{x}<br>Pool length %{customdata[0]}<br>Pace %{y:.1f} s/100 m<br>%{customdata[1]} strokes<br>Cadence %{customdata[2]}<extra></extra>"},
      {x,y:L.map(v=>v.strokes),type:"bar",name:"Strokes",yaxis:"y2",marker:{color:"rgba(255,255,255,.15)"},hovertemplate:"%{y} strokes<extra></extra>"}
    ];
    const l=layout();l.margin={l:70,r:60,t:15,b:55};l.barmode="overlay";l.xaxis={title:"Length within best 500 m",dtick:1,gridcolor:GRID,tickfont:{color:MUTED},titlefont:{color:MUTED}};
    l.yaxis=paceAxis("Pace",120,158);l.yaxis2={title:"Strokes / 25 m",overlaying:"y",side:"right",rangemode:"tozero",gridcolor:"rgba(0,0,0,0)",tickfont:{color:MUTED},titlefont:{color:MUTED}};
    l.legend={orientation:"h",y:-.2,font:{size:10,color:MUTED}};
    Plotly.react("latestDetail",traces,l,CONFIG);
  }
  selector.addEventListener("change",e=>detail(+e.target.value));detail(S.length-1);

  const tbody=document.getElementById("summaryBody");
  S.forEach(s=>{
    const tr=document.createElement("tr");
    tr.innerHTML="<td>"+dateFmt(s.date)+"</td><td>"+s.distance_m+" m</td><td>"+paceFmt(s.mean_pace_s_per_100m)+"</td>"+
      "<td class='best'>"+paceFmt(s.best_500m.pace_s_per_100m)+"</td><td>"+timeFmt(s.best_500m.time_s)+"</td>"+
      "<td>"+s.best_500m.mean_strokes_per_25m.toFixed(2)+"</td><td>"+s.best_500m.pace_sd_s_per_100m.toFixed(1)+" s</td>"+
      "<td>L"+s.best_500m.start_length+"–"+s.best_500m.end_length+"</td>";
    tbody.appendChild(tr);
  });
}).catch(err=>{
  document.body.insertAdjacentHTML("beforeend","<pre style='padding:20px;color:#ff8a8a'>Could not load swim data: "+err+"</pre>");
});
