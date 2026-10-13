(() => {
  const $ = (s) => document.querySelector(s);
  const canvas = $("#editorCanvas"), ctx = canvas.getContext("2d", { willReadFrequently: true });
  const wrap = $("#canvasWrap"), stage = $("#canvasStage"), welcome = $("#welcome");
  const fileInput = $("#fileInput"), toast = $("#toast");
  let docName = "", hasDocument = false, activeTool = "move", drawing = false, lastPoint = null;
  let undoStack = [], redoStack = [], baseImage = null, currentFilter = "original", deferredInstall = null;
  let layers = [{name:"Background",type:"image"}], cropStart = null, cropRect = null;

  function notify(message) {
    toast.textContent = message; toast.classList.add("show");
    clearTimeout(notify.timer); notify.timer = setTimeout(() => toast.classList.remove("show"), 2600);
  }
  function status(message) { $("#saveStatus").textContent = message; }
  function revealCanvas() { welcome.hidden = true; stage.hidden = false; hasDocument = true; }
  function updateDoc() {
    $("#docName").textContent = docName || "Untitled";
    $("#dimensions").textContent = `${canvas.width} × ${canvas.height} px`;
    renderLayers();
  }
  function fitCanvas(w,h) {
    canvas.width = Math.max(100, Math.min(5000, Math.round(w)));
    canvas.height = Math.max(100, Math.min(5000, Math.round(h)));
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0,0,canvas.width,canvas.height);
    revealCanvas(); updateDoc(); saveHistory(); status("Ready");
  }
  function saveHistory() {
    try {
      undoStack.push(ctx.getImageData(0,0,canvas.width,canvas.height));
      if (undoStack.length > 20) undoStack.shift();
      redoStack = [];
    } catch(e) {}
    updateHistoryButtons();
  }
  function updateHistoryButtons() {
    $("#undoBtn").style.opacity = undoStack.length > 1 ? "1" : ".45";
    $("#redoBtn").style.opacity = redoStack.length ? "1" : ".45";
  }
  function undo() {
    if (undoStack.length < 2) return notify("Nothing more to undo.");
    redoStack.push(ctx.getImageData(0,0,canvas.width,canvas.height));
    undoStack.pop(); ctx.putImageData(undoStack[undoStack.length-1],0,0); updateHistoryButtons(); status("Undo");
  }
  function redo() {
    if (!redoStack.length) return;
    const image = redoStack.pop(); undoStack.push(image); ctx.putImageData(image,0,0); updateHistoryButtons(); status("Redo");
  }
  function loadImage(file) {
    if (!file || !file.type.startsWith("image/")) return notify("Please choose a supported image file.");
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      ctx.clearRect(0,0,canvas.width,canvas.height); ctx.drawImage(img,0,0);
      baseImage = new Image(); baseImage.src = canvas.toDataURL("image/png");
      docName = file.name.replace(/\.[^.]+$/, "") || "Imported image";
      layers = [{name:docName,type:"image"}]; currentFilter = "original";
      revealCanvas(); updateDoc(); undoStack=[]; redoStack=[]; saveHistory(); renderLayers();
      status("Image opened"); notify("Image opened successfully.");
      URL.revokeObjectURL(url);
    };
    img.onerror = () => { URL.revokeObjectURL(url); notify("This image could not be opened."); };
    img.src = url;
  }
  function point(e) {
    const r = canvas.getBoundingClientRect();
    return {x:(e.clientX-r.left)*canvas.width/r.width, y:(e.clientY-r.top)*canvas.height/r.height};
  }
  function startDraw(e) {
    if (!hasDocument) return;
    if (activeTool === "move") return;
    if (activeTool === "text") {
      const p=point(e), text=prompt("Enter the text to add:");
      if (text) { ctx.save(); ctx.fillStyle=$("#colorPicker").value; ctx.font=`${+$("#fontSize").value||42}px "${$("#fontFamily").value}"`; ctx.textBaseline="top"; ctx.fillText(text,p.x,p.y); ctx.restore(); saveHistory(); status("Text added"); }
      setTool("move"); return;
    }
    if (activeTool === "eyedropper") {
      const p=point(e), d=ctx.getImageData(Math.floor(p.x),Math.floor(p.y),1,1).data;
      $("#colorPicker").value="#"+[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,"0")).join("");
      notify("Color picked."); setTool("move"); return;
    }
    if (activeTool === "crop") {
      if (!cropStart) { cropStart=point(e); cropRect=null; notify("Drag across the area you want to keep."); }
      else {
        const p=point(e), x=Math.min(cropStart.x,p.x), y=Math.min(cropStart.y,p.y), w=Math.abs(p.x-cropStart.x), h=Math.abs(p.y-cropStart.y);
        if (w>10 && h>10) {
          const data=ctx.getImageData(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
          canvas.width=data.width; canvas.height=data.height; ctx.putImageData(data,0,0); updateDoc(); saveHistory(); notify("Crop applied.");
        } else notify("Crop area was too small.");
        cropStart=null; cropRect=null; setTool("move");
      } return;
    }
    drawing=true; lastPoint=point(e); canvas.setPointerCapture?.(e.pointerId);
    ctx.beginPath(); ctx.moveTo(lastPoint.x,lastPoint.y);
    ctx.lineCap="round"; ctx.lineJoin="round"; ctx.lineWidth=+$("#brushSize").value;
    ctx.strokeStyle=activeTool==="eraser" ? "#ffffff" : $("#colorPicker").value;
    if (activeTool==="eraser") ctx.globalCompositeOperation="destination-out";
    else ctx.globalCompositeOperation="source-over";
    ctx.lineTo(lastPoint.x+.01,lastPoint.y+.01); ctx.stroke();
  }
  function drawMove(e) {
    const p=point(e); $("#cursorPos").textContent=`X: ${Math.round(p.x)}  Y: ${Math.round(p.y)}`;
    if (activeTool==="crop" && cropStart && e.buttons) { cropRect={x:Math.min(cropStart.x,p.x),y:Math.min(cropStart.y,p.y),w:Math.abs(p.x-cropStart.x),h:Math.abs(p.y-cropStart.y)}; return; }
    if (!drawing || !lastPoint) return;
    ctx.beginPath(); ctx.moveTo(lastPoint.x,lastPoint.y); ctx.lineTo(p.x,p.y); ctx.stroke(); lastPoint=p;
  }
  function endDraw() {
    if (!drawing) return;
    drawing=false; lastPoint=null; ctx.globalCompositeOperation="source-over"; saveHistory(); status("Edited");
  }
  function setTool(tool) {
    activeTool=tool; document.querySelectorAll("[data-tool]").forEach(b=>b.classList.toggle("active",b.dataset.tool===tool));
    canvas.style.cursor=tool==="move"?"default":tool==="text"?"text":tool==="crop"?"crosshair":"crosshair";
    if(tool!=="crop"){cropStart=null;cropRect=null;}
  }
  function renderLayers() {
    const list=$("#layersList"); if(!list) return;
    list.innerHTML="";
    if(!hasDocument){list.innerHTML='<div class="empty-layers">Open an image to start your layer stack.</div>';return;}
    layers.forEach((layer,i)=>{
      const row=document.createElement("div"); row.className="layer-row";
      row.innerHTML=`<span class="layer-dot">▧</span><span class="layer-name"></span><span class="visible">●</span>`;
      row.querySelector(".layer-name").textContent=layer.name;
      list.appendChild(row);
    });
  }
  function applyFilter(name) {
    if (!hasDocument) return notify("Open an image first.");
    const filters={original:"none",mono:"grayscale(1)",warm:"sepia(.45) saturate(1.25)",vivid:"saturate(1.8) contrast(1.08)",fade:"contrast(.78) brightness(1.08)",invert:"invert(1)"};
    // Render CSS-like filters into pixels by drawing the canvas into a temporary canvas.
    const temp=document.createElement("canvas"); temp.width=canvas.width; temp.height=canvas.height;
    const t=temp.getContext("2d"); t.filter=filters[name]||"none"; t.drawImage(canvas,0,0);
    ctx.save(); ctx.globalCompositeOperation="source-over"; ctx.clearRect(0,0,canvas.width,canvas.height); ctx.filter="none"; ctx.drawImage(temp,0,0); ctx.restore();
    currentFilter=name; document.querySelectorAll("[data-filter]").forEach(b=>b.classList.toggle("selected",b.dataset.filter===name));
    saveHistory(); status("Filter applied"); notify(`${name[0].toUpperCase()+name.slice(1)} filter applied.`);
  }
  function applyAdjustments() {
    if (!hasDocument) return notify("Open an image first.");
    const b=$("#brightness").value, c=$("#contrast").value, s=$("#saturation").value, blur=$("#blur").value;
    const temp=document.createElement("canvas"); temp.width=canvas.width; temp.height=canvas.height;
    const t=temp.getContext("2d"); t.filter=`brightness(${b}%) contrast(${c}%) saturate(${s}%) blur(${blur}px)`; t.drawImage(canvas,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height); ctx.filter="none"; ctx.drawImage(temp,0,0);
    saveHistory(); status("Adjustments applied"); notify("Adjustments applied to the canvas.");
  }
  function exportImage() {
    if(!hasDocument) return notify("Create or open a canvas first.");
    const format=$("#exportFormat").value, quality=(+$("#exportQuality").value)/100;
    const name=($("#exportName").value.trim()||"my-pixedit-artwork").replace(/[<>:"/\\|?*]+/g,"-");
    const a=document.createElement("a"); a.download=name+(format==="image/jpeg"?".jpg":format==="image/webp"?".webp":".png");
    a.href=canvas.toDataURL(format,quality); a.click(); $("#exportDialog").close(); notify("Your image download has started.");
  }
  function newCanvas() {
    const w=+$("#canvasWidth").value,h=+$("#canvasHeight").value,bg=$("#backgroundColor").value;
    if(w<100||h<100||w>5000||h>5000)return notify("Canvas dimensions must be between 100 and 5000 pixels.");
    canvas.width=w;canvas.height=h;ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    docName="Untitled";layers=[{name:"Background",type:"image"}];baseImage=null;revealCanvas();updateDoc();undoStack=[];redoStack=[];saveHistory();$("#newDialog").close();notify("New canvas created.");
  }

  $("#openWelcome").addEventListener("click",()=>fileInput.click());
  $("#newWelcome").addEventListener("click",()=>$("#newDialog").showModal());
  fileInput.addEventListener("change",e=>{loadImage(e.target.files[0]);e.target.value="";});
  $("#exportTop").addEventListener("click",()=>{if(!hasDocument)return notify("Open an image or create a canvas first.");$("#exportDialog").showModal();});
  $("#downloadBtn").addEventListener("click",e=>{e.preventDefault();exportImage();});
  $("#createCanvas").addEventListener("click",e=>{e.preventDefault();newCanvas();});
  $("#exportFormat").addEventListener("change",()=>{$("#qualityRow").hidden=$("#exportFormat").value==="image/png";});
  $("#brushSize").addEventListener("input",()=>$("#sizeOut").textContent=$("#brushSize").value+" px");
  [["brightness","%"],["contrast","%"],["saturation","%"],["blur"," px"]].forEach(([id,suffix])=>$("#"+id).addEventListener("input",e=>$("#"+id+"Out").textContent=e.target.value+suffix));
  $("#applyAdjust").addEventListener("click",applyAdjustments);
  $("#resetAdjust").addEventListener("click",()=>{ $("#brightness").value=100;$("#contrast").value=100;$("#saturation").value=100;$("#blur").value=0;["brightness","contrast","saturation","blur"].forEach(id=>$("#"+id+"Out").textContent=$("#"+id).value+(id==="blur"?" px":"%"));});
  document.querySelectorAll("[data-filter]").forEach(b=>b.addEventListener("click",()=>applyFilter(b.dataset.filter)));
  document.querySelectorAll("[data-tool]").forEach(b=>b.addEventListener("click",()=>setTool(b.dataset.tool)));
  $("#undoBtn").addEventListener("click",undo);$("#redoBtn").addEventListener("click",redo);
  document.querySelectorAll("[data-panel]").forEach(b=>b.addEventListener("click",()=>{
    document.querySelectorAll("[data-panel]").forEach(t=>t.classList.toggle("active",t===b));
    $("#adjustPanel").hidden=b.dataset.panel!=="adjust";$("#layersPanel").hidden=b.dataset.panel!=="layers";
  }));
  $("#addLayer").addEventListener("click",()=>{if(!hasDocument)return notify("Create a canvas first.");layers.push({name:"New layer "+(layers.length+1),type:"transparent"});renderLayers();notify("Layer placeholder added. Full compositing is a future upgrade.");});
  canvas.addEventListener("pointerdown",startDraw);canvas.addEventListener("pointermove",drawMove);canvas.addEventListener("pointerup",endDraw);canvas.addEventListener("pointercancel",endDraw);
  canvas.addEventListener("pointerleave",()=>{$("#cursorPos").textContent="Canvas";});
  wrap.addEventListener("dragover",e=>{e.preventDefault();wrap.classList.add("dragover");});
  wrap.addEventListener("dragleave",()=>wrap.classList.remove("dragover"));
  wrap.addEventListener("drop",e=>{e.preventDefault();wrap.classList.remove("dragover");const f=e.dataTransfer.files[0];if(f)loadImage(f);});
  document.querySelectorAll("[data-menu]").forEach(b=>b.addEventListener("click",()=>{
    const menu=b.dataset.menu;
    if(menu==="file"){const choice=prompt("File menu:\n1 — Open image\n2 — New canvas\n3 — Export image\nEnter 1, 2 or 3");if(choice==="1")fileInput.click();else if(choice==="2")$("#newDialog").showModal();else if(choice==="3")$("#exportTop").click();}
    if(menu==="edit"){const choice=prompt("Edit menu:\n1 — Undo\n2 — Redo\nEnter 1 or 2");if(choice==="1")undo();if(choice==="2")redo();}
    if(menu==="image")$("#adjustPanel").scrollIntoView({behavior:"smooth",block:"start"});
    if(menu==="help")notify("PixEdit starter: upload an image, choose a tool, edit, then export.");
  }));
  document.addEventListener("keydown",e=>{
    const tag=document.activeElement.tagName;
    if(["INPUT","TEXTAREA","SELECT"].includes(tag))return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();undo();}
    else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="y"){e.preventDefault();redo();}
    else if(e.key.toLowerCase()==="b")setTool("brush");
    else if(e.key.toLowerCase()==="e")setTool("eraser");
    else if(e.key.toLowerCase()==="t")setTool("text");
    else if(e.key.toLowerCase()==="v")setTool("move");
    else if(e.key==="Escape"){cropStart=null;setTool("move");}
  });
  window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("#installBtn").hidden=false;});
  $("#installBtn").addEventListener("click",async()=>{if(!deferredInstall)return notify("Use your browser menu and choose Install app or Add to Home screen.");deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("#installBtn").hidden=true;});
  window.addEventListener("appinstalled",()=>notify("PixEdit installed successfully."));
  if("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("/sw.js").catch(()=>{});
  // Start with a useful blank workspace, but keep the welcome screen for first-time users.
  updateHistoryButtons();
})();
