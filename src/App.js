import React, { useState, useEffect, useCallback } from 'react';
import { loadAll, saveAll, saveRecipe as persistRecipe, saveProducts as persistProducts } from './storage';
import {
  Leaf, Zap, FlaskConical, BarChart3, Network, Database,
  AlertTriangle, CheckCircle, Download, Save, X, Info,
  SlidersHorizontal, RefreshCw, Plus, Search, Settings,
  ChevronRight, ChevronLeft, BookOpen, HelpCircle
} from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import {
  solveRecipe, NUTRIENTS, PRODUCTS, PRESET_RECIPES,
  LITERATURE_RATIOS, MULDERS_INTERACTIONS, estimateEC, scaleTargetsToEC
} from './engine';
import './App.css';

// ─── Constants ────────────────────────────────────────────────
const DEFAULT_TARGETS = {
  NO3:145, NH4:3, P:25, K:200, Ca:115, Mg:40,
  S:0, Fe:4, Mn:1, Zn:0.6, Cu:0.15, B:0.1, Mo:0.15, Si:24,
};
const DEFAULT_OPTIONS = {
  supplyVolumeLiters:37854.12, stockVolumeLiters:189.271, concentrationFactor:100,
  ironSplit:{EDDHA:0.75,DTPA:0,EDTA:0.25},
  magSplit:{sulfate:0.75,nitrate:0.25},
  kSplit:{nitrate:0.90,sulfate:0.10},
  useAmmoniumSulfate:false, useSilica:true,
};
const CROP_CARDS = [
  {key:'Hoagland Solution 1 (1938)',  icon:'🔬',name:'Hoagland (1938)',     desc:'Classic standard, 21k+ citations',  ec:'~2.3'},
  {key:'Sonneveld General (2009)',    icon:'🏭',name:'Sonneveld (2009)',    desc:'Dutch commercial greenhouse',         ec:'~1.9'},
  {key:'Strawberry — Vegetative',    icon:'🍓',name:'Strawberry Veg',      desc:'Commercial runner establishment',     ec:'~1.6'},
  {key:'Strawberry — Fruiting',      icon:'🍓',name:'Strawberry Fruit',    desc:'Elevated K:Ca for fruit quality',      ec:'~1.7'},
  {key:'Tomato — Vegetative',        icon:'🍅',name:'Tomato Veg',          desc:'High N/Ca for vigorous growth',        ec:'~2.1'},
  {key:'Tomato — Fruiting',          icon:'🍅',name:'Tomato Fruit',        desc:'Elevated K for fruit set',             ec:'~2.1'},
  {key:'Lettuce (NFT/DWC)',          icon:'🥬',name:'Lettuce',             desc:'High Ca:K prevents tip-burn',          ec:'~1.8'},
  {key:'Cannabis — Vegetative',      icon:'🌿',name:'Cannabis Veg',        desc:'High N + Si, Caplan (2017)',           ec:'~2.0'},
  {key:'Cannabis — Flower',          icon:'🌿',name:'Cannabis Flower',     desc:'Reduced N, elevated P/K',              ec:'~2.0'},
  {key:'Basil / Herbs',             icon:'🌱',name:'Herbs / Basil',       desc:'Penn State Modified Sonneveld',        ec:'~1.5'},
];
const STEPS = [
  {id:'system',  label:'System',       sub:'Volumes & splits'},
  {id:'crop',    label:'Crop & Stage', sub:'Preset selection'},
  {id:'targets', label:'Targets',      sub:'Nutrient PPM'},
  {id:'mix',     label:'Product Mix',  sub:'Grams per product'},
  {id:'validate',label:'Validate',     sub:'Review & export'},
];
const MULDER_KEYS  = ['N','P','K','Ca','Mg','S','Fe','Mn','Zn','Cu','B','Mo'];
const MULDER_NAMES = {N:'Nitrogen',P:'Phosphorus',K:'Potassium',Ca:'Calcium',Mg:'Magnesium',S:'Sulfur',Fe:'Iron',Mn:'Manganese',Zn:'Zinc',Cu:'Copper',B:'Boron',Mo:'Molybdenum'};
const EMPTY_PROD   = {id:'',name:'',brand:'',tank:'B',solubility:'',composition:{NO3:0,NH4:0,P:0,K:0,Ca:0,Mg:0,S:0,Fe:0,Mn:0,Zn:0,Cu:0,B:0,Mo:0,Si:0}};

const f = (v,d=1) => (v===null||v===undefined||isNaN(v)) ? '—' : Number(v).toFixed(d);

// ─── App root ─────────────────────────────────────────────────
export default function App() {
  const [step, setStep]               = useState(0);
  const [showProducts, setShowProducts]= useState(false);
  const [showSettings, setShowSettings]= useState(false);
  const [targets, setTargets]         = useState({...DEFAULT_TARGETS});
  const [options, setOptions]         = useState({...DEFAULT_OPTIONS});
  const [manualGrams, setManualGrams] = useState({});
  const [targetEC, setTargetEC]       = useState('');
  const [result, setResult]           = useState(null);
  const [recipeName, setRecipeName]   = useState('My Recipe');
  const [savedRecipes, setSavedRecipes]= useState({});
  const [customProducts,setCustomProducts]= useState([]);
  const [activePreset, setActivePreset]= useState(null);
  const [note, setNote]               = useState(null);
  const [storageReady, setStorageReady]= useState(false);

  // Load persisted data on mount
  useEffect(() => {
    loadAll().then(data => {
      if (data.recipes && Object.keys(data.recipes).length) setSavedRecipes(data.recipes);
      if (data.products && data.products.length) setCustomProducts(data.products);
      setStorageReady(true);
    });
  }, []);

  // Recalculate whenever inputs change
  useEffect(() => { setResult(solveRecipe(targets, options, manualGrams)); }, [targets,options,manualGrams]);

  // Auto-persist custom products whenever they change
  useEffect(() => { if (storageReady) persistProducts(customProducts); }, [customProducts, storageReady]);

  const notify = msg => { setNote(msg); setTimeout(()=>setNote(null),3000); };
  const setT = (k,v) => setTargets(p=>({...p,[k]:parseFloat(v)||0}));
  const setO = (k,v) => setOptions(p=>({...p,[k]:v}));
  const setON= (k,sk,v) => setOptions(p=>({...p,[k]:{...p[k],[sk]:parseFloat(v)||0}}));

  const loadPreset = key => {
    const p = PRESET_RECIPES[key]; if(!p) return;
    setTargets({...DEFAULT_TARGETS,...p.targets});
    setManualGrams({}); setActivePreset(key); setRecipeName(key);
    notify(`Loaded: ${key}`);
  };
  const applyEC = () => {
    const ec = parseFloat(targetEC); if(!ec||ec<=0) return;
    setTargets(scaleTargetsToEC(targets,ec)); setManualGrams({});
    notify(`Scaled to ${ec} mS/cm`);
  };
  const save = () => {
    const recipe = { targets:{...targets}, options:{...options}, date:new Date().toLocaleDateString() };
    setSavedRecipes(p => { const n={...p,[recipeName]:recipe}; saveAll({recipes:n,products:customProducts}); return n; });
    notify(`Saved: ${recipeName}`);
  };
  const exportCSV = () => {
    if(!result) return;
    const all=[...PRODUCTS,...customProducts];
    const rows=[
      ['FertiCalc — '+recipeName],['Generated',new Date().toLocaleString()],[],
      ['PRODUCT MIX'],['Product','Brand','Tank','Grams','Sol%'],
      ...all.filter(p=>(result.gramsInStock[p.id]||0)>0.01).map(p=>{
        const g=result.gramsInStock[p.id];
        return [p.name,p.brand||'',p.tank,g.toFixed(2),
          p.solubility?(g/(p.solubility*options.stockVolumeLiters*1000)*100).toFixed(1)+'%':'N/A'];
      }),
      [],[`NUTRIENT ANALYSIS`],['Nutrient','Target ppm','Delivered ppm','% Target'],
      ...NUTRIENTS.map(n=>{const t=targets[n.key]||0,d=result.deliveredPPM[n.key]||0;
        return[n.label,t.toFixed(2),d.toFixed(2),t>0?((d/t)*100).toFixed(1)+'%':'N/A'];}),
      [],[`EC`,result.ecEstimate+' mS/cm'],[`Total N`,result.totalN.toFixed(1)+' ppm'],
    ];
    const blob=new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=recipeName+'.csv'; a.click();
    notify('Exported CSV');
  };

  const p={step,setStep,targets,options,result,recipeName,manualGrams,targetEC,activePreset,
    customProducts,savedRecipes,setT,setO,setON,setTargets,setManualGrams,setTargetEC,
    applyEC,setRecipeName,loadPreset,save,exportCSV,setCustomProducts,setSavedRecipes,notify};

  return (
    <div className="app">
      {note && <div className="notification"><CheckCircle size={13}/> {note}</div>}

      {/* Top bar */}
      <header className="topbar">
<div className="tb-logo">
          <Leaf size={16} className="tb-logo-leaf"/>
          <span>FertiCalc</span>
          <span style={{fontSize:11,fontWeight:400,color:'var(--t3)',letterSpacing:0,marginLeft:2}}>Hydroponic Nutrient Calculator</span>
        </div>
        <div className="tb-recipe">
          <input className="tb-input" value={recipeName} onChange={e=>setRecipeName(e.target.value)} placeholder="Recipe name…"/>
          <select className="tb-select" onChange={e=>{if(e.target.value) loadPreset(e.target.value);}} value="">
            <option value="">Load preset…</option>
            {Object.keys(PRESET_RECIPES).map(k=><option key={k} value={k}>{k}</option>)}
          </select>
          {Object.keys(savedRecipes).length>0 && (
            <select className="tb-select" onChange={e=>{
              if(!e.target.value) return;
              const r=savedRecipes[e.target.value];
              if(r){setTargets(r.targets);setOptions(r.options);setManualGrams({});setRecipeName(e.target.value);notify(`Loaded: ${e.target.value}`);}
            }} value="">
              <option value="">My recipes…</option>
              {Object.keys(savedRecipes).map(k=><option key={k} value={k}>{k}</option>)}
            </select>
          )}
        </div>
        <div className="tb-center"/>
        <div className="tb-actions">
          <button className="btn btn-ghost btn-sm" onClick={()=>setShowProducts(true)}><Database size={13}/> Products</button>
          <button className="btn btn-ghost btn-sm" onClick={save}><Save size={13}/> Save</button>
          <button className="btn btn-ghost btn-sm" onClick={exportCSV}><Download size={13}/> Export</button>
          <button className="btn btn-ghost btn-sm" onClick={()=>setShowSettings(true)}><Settings size={13}/> Settings</button>
        </div>
      </header>

      {/* Stepper */}
      <div className="stepper-bar">
        <div className="stepper">
          {STEPS.map((s,i)=>(
            <React.Fragment key={s.id}>
              <button
                className={`step-btn ${i===step?'active':''} ${i<step?'past':''}`}
                onClick={()=>setStep(i)}
              >
                <div className="step-circle">
                  {i<step ? <CheckCircle size={11}/> : i+1}
                </div>
                <div className="step-text">
                  <span className="step-name">{s.label}</span>
                  <span className="step-sub">{s.sub}</span>
                </div>
              </button>
              {i<STEPS.length-1 && <div className="step-sep"/>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="app-body">
        <div className="main-scroll">
          {step===0 && <StepSystem {...p}/>}
          {step===1 && <StepCrop {...p}/>}
          {step===2 && <StepTargets {...p}/>}
          {step===3 && <StepMix {...p}/>}
          {step===4 && <StepValidate {...p}/>}
        </div>
        <LivePanel result={result} targets={targets}/>
      </div>

      {showProducts && <ProductsModal {...p} onClose={()=>setShowProducts(false)}/>}
      {showSettings && <SettingsModal options={options} setO={setO} setON={setON} targetEC={targetEC} setTargetEC={setTargetEC} applyEC={applyEC} onClose={()=>setShowSettings(false)}/>}
    </div>
  );
}

// ─── Step 1: System ───────────────────────────────────────────
function StepSystem({options,setO,setON,next}) {
  return (
    <div>
      <div className="page-header">
        <div className="page-title">System configuration</div>
        <div className="page-desc">Define your tank volumes and concentration parameters. These control how grams are calculated for your stock solution.</div>
      </div>

      <div className="card card-pad">
        <div className="card-title"><SlidersHorizontal size={12}/> Tank volumes</div>
        <div className="grid-2" style={{gap:20}}>
          <div className="field">
            <label className="field-label">Supply / recirculation volume<span className="field-note">({(options.supplyVolumeLiters/3.785).toFixed(0)} gal)</span></label>
            <input className="input" type="number" value={options.supplyVolumeLiters} onChange={e=>setO('supplyVolumeLiters',parseFloat(e.target.value)||0)}/>
            <span className="field-hint">Total volume of your recirculating reservoir, in liters</span>
          </div>
          <div className="field">
            <label className="field-label">Stock solution volume</label>
            <input className="input" type="number" value={options.stockVolumeLiters} onChange={e=>setO('stockVolumeLiters',parseFloat(e.target.value)||0)}/>
            <span className="field-hint">Volume of concentrate being prepared, in liters</span>
          </div>
          <div className="field">
            <label className="field-label">Concentration factor</label>
            <input className="input" type="number" value={options.concentrationFactor} onChange={e=>setO('concentrationFactor',parseFloat(e.target.value)||0)}/>
            <span className="field-hint">How many times more concentrated the stock is vs. the supply</span>
          </div>
        </div>
      </div>

      <div className="card card-pad" style={{marginTop:16}}>
        <div className="card-title"><FlaskConical size={12}/> Product splits</div>
        <div className="grid-3">
          <div>
            <div className="section-label" style={{marginBottom:10}}>Iron source<span style={{fontSize:10,color:'var(--t4)',fontWeight:400,textTransform:'none',letterSpacing:0,marginLeft:4}}>(must sum to 1)</span></div>
            {[['EDDHA','EDDHA (pH 4–9)'],['DTPA','DTPA (pH 5–7.5)'],['EDTA','EDTA (pH &lt;6.5)']].map(([k,l])=>(
              <div className="field" key={k} style={{marginBottom:10}}>
                <label className="field-label" dangerouslySetInnerHTML={{__html:l}}/>
                <input className="input" type="number" min="0" max="1" step="0.05" value={options.ironSplit[k]} onChange={e=>setON('ironSplit',k,e.target.value)}/>
              </div>
            ))}
          </div>
          <div>
            <div className="section-label" style={{marginBottom:10}}>Magnesium</div>
            {[['sulfate','MgSO₄ — Magnesium sulfate'],['nitrate','Mg(NO₃)₂ — Magnesium nitrate']].map(([k,l])=>(
              <div className="field" key={k} style={{marginBottom:10}}>
                <label className="field-label">{l}</label>
                <input className="input" type="number" min="0" max="1" step="0.05" value={options.magSplit[k]} onChange={e=>setON('magSplit',k,e.target.value)}/>
              </div>
            ))}
          </div>
          <div>
            <div className="section-label" style={{marginBottom:10}}>Potassium</div>
            {[['nitrate','KNO₃ — Potassium nitrate'],['sulfate','K₂SO₄ — Potassium sulfate']].map(([k,l])=>(
              <div className="field" key={k} style={{marginBottom:10}}>
                <label className="field-label">{l}</label>
                <input className="input" type="number" min="0" max="1" step="0.05" value={options.kSplit[k]} onChange={e=>setON('kSplit',k,e.target.value)}/>
              </div>
            ))}
            <div className="section-label" style={{marginBottom:8,marginTop:6}}>Options</div>
            <label className="toggle-row"><span>Use ammonium sulfate for NH₄</span><input type="checkbox" checked={options.useAmmoniumSulfate} onChange={e=>setO('useAmmoniumSulfate',e.target.checked)}/></label>
            <label className="toggle-row"><span>Include potassium silicate</span><input type="checkbox" checked={options.useSilica} onChange={e=>setO('useSilica',e.target.checked)}/></label>
          </div>
        </div>
      </div>

      <div className="step-footer">
        <span className="step-footer-info">Configuration is saved with each recipe</span>
        <button className="btn btn-primary" onClick={()=>setStep(1)}>Choose crop & stage <ChevronRight size={14}/></button>
      </div>
    </div>
  );

  function setStep(v){} // overridden by parent prop
}
// Fix: StepSystem needs setStep from props
function StepSystemFixed(props) {
  return <StepSystem {...props} next={()=>props.setStep(1)}/>;
}

// ─── Step 2: Crop & Stage ─────────────────────────────────────
function StepCrop({activePreset,loadPreset,setStep}) {
  return (
    <div>
      <div className="page-header">
        <div className="page-title">Crop & growth stage</div>
        <div className="page-desc">Select a scientifically validated starting point. All presets cite peer-reviewed literature or commercial greenhouse standards. Fine-tune every value in the next step.</div>
      </div>
      <div className="crop-grid">
        {CROP_CARDS.map(c=>(
          <button key={c.key} className={`crop-card ${activePreset===c.key?'sel':''}`} onClick={()=>loadPreset(c.key)}>
            <div className="crop-icon">{c.icon}</div>
            <div className="crop-name">{c.name}</div>
            <div className="crop-desc">{c.desc}</div>
            <div className="crop-ec">EC ~{c.ec} mS/cm</div>
          </button>
        ))}
      </div>
      {activePreset && PRESET_RECIPES[activePreset] && (
        <div style={{marginTop:14,padding:'10px 14px',background:'var(--teal-lt)',border:'1px solid var(--teal-bd)',borderRadius:'var(--r)',fontSize:12}}>
          <span style={{fontWeight:600,color:'var(--teal)'}}>Source: </span>
          <span style={{color:'var(--teal-dk)'}}>{PRESET_RECIPES[activePreset].source}</span>
        </div>
      )}
      <div className="step-footer">
        <button className="btn btn-ghost" onClick={()=>setStep(0)}><ChevronLeft size={14}/> Back</button>
        <span className="step-footer-info">{activePreset?`Loaded: ${activePreset}`:'Select a preset or proceed with current values'}</span>
        <button className="btn btn-primary" onClick={()=>setStep(2)}>Set nutrient targets <ChevronRight size={14}/></button>
      </div>
    </div>
  );
}

// ─── Step 3: Targets ──────────────────────────────────────────
function StepTargets({targets,result,setT,setStep}) {
  const macro=NUTRIENTS.filter(n=>n.type==='macro');
  const micro=NUTRIENTS.filter(n=>n.type==='micro');
  return (
    <div>
      <div className="page-header">
        <div className="page-title">Nutrient targets</div>
        <div className="page-desc">Set desired concentrations in your supply solution (PPM by weight). Cells turn green when delivered ≥95% of target, orange when under, red when over.</div>
      </div>
      <div className="nut-section-hd">Macronutrients</div>
      <div className="grid-4">
        {macro.map(n=><NC key={n.key} n={n} val={targets[n.key]??''} onChange={v=>setT(n.key,v)} del={result?.deliveredPPM[n.key]}/>)}
      </div>
      <div className="nut-section-hd" style={{marginTop:20}}>Micronutrients</div>
      <div className="grid-6">
        {micro.map(n=><NC key={n.key} n={n} val={targets[n.key]??''} onChange={v=>setT(n.key,v)} del={result?.deliveredPPM[n.key]}/>)}
      </div>
      <div className="step-footer">
        <button className="btn btn-ghost" onClick={()=>setStep(1)}><ChevronLeft size={14}/> Back</button>
        <span className="step-footer-info">Changes update the live summary panel in real time</span>
        <button className="btn btn-primary" onClick={()=>setStep(3)}>Review product mix <ChevronRight size={14}/></button>
      </div>
    </div>
  );
}

function NC({n,val,onChange,del}) {
  const t=parseFloat(val)||0;
  const pct=t>0&&del!==undefined?del/t:null;
  const s=pct===null?'':pct>=0.95&&pct<=1.15?'sg':pct<0.95?'sl':'sh';
  return (
    <div className={`nc ${s}`} title={n.note}>
      <div className="nc-top"><span className="nc-lbl">{n.label}</span><span className="nc-sym">{n.symbol}</span></div>
      <div className="nc-row">
        <input type="number" min="0" step={n.type==='micro'?.01:1} value={val} onChange={e=>onChange(e.target.value)} className="nc-inp"/>
        <span className="nc-unit">ppm</span>
      </div>
      {t>0&&pct!==null&&(
        <>
          <div className="nc-track"><div className={`nc-fill f${s[1]||'g'}`} style={{width:`${Math.min(100,pct*100)}%`}}/></div>
          <div className="nc-del">{f(del,n.type==='micro'?3:1)} delivered</div>
        </>
      )}
    </div>
  );
}

// ─── Step 4: Mix ──────────────────────────────────────────────
function StepMix({result,options,manualGrams,setManualGrams,customProducts,setStep,notify}) {
  const hasOv=Object.keys(manualGrams).length>0;
  const all=[...PRODUCTS,...customProducts];

  const renderTank=(label,cls,prods)=>{
    const rows=prods.filter(p=>(result?.gramsInStock[p.id]||0)>0.01||manualGrams[p.id]!==undefined);
    if(!rows.length) return null;
    const total=rows.reduce((s,p)=>s+(parseFloat(manualGrams[p.id]??result?.gramsInStock[p.id]??0)),0);
    return (
      <div key={label}>
        <div className="tank-head">
          <div className={`tank-pill ${cls}`}>{label}</div>
          <div className="tank-kg">{total>0?(total/1000).toFixed(2)+' kg total':''}</div>
        </div>
        <div className="card" style={{overflow:'hidden',marginBottom:16}}>
          <table className="tbl">
            <thead><tr><th style={{width:'42%'}}>Product</th><th className="r">Auto (g)</th><th className="r">Override (g)</th><th className="r">Sol%</th></tr></thead>
            <tbody>
              {rows.map(p=>{
                const auto=result?.gramsInStock[p.id]||0;
                const ov=manualGrams[p.id]!==undefined?manualGrams[p.id]:'';
                const g=ov!==''?parseFloat(ov)||0:auto;
                const sol=p.solubility?g/(p.solubility*options.stockVolumeLiters*1000):null;
                const sc=sol&&sol>1?'sol-err':sol&&sol>0.8?'sol-warn':'sol-ok';
                return (
                  <tr key={p.id} className={sol&&sol>0.8?'row-warn':''}>
                    <td><div className="td-pn">{p.name}</div><div className="td-pb">{p.brand}</div></td>
                    <td className="r td-dim">{auto>0.01?auto.toFixed(1):'—'}</td>
                    <td style={{textAlign:'right',paddingRight:6}}>
                      <input type="number" min="0" step="0.1"
                        className={`g-inp ${ov!==''?'ov':''}`}
                        placeholder={auto>0?auto.toFixed(1):'0'}
                        value={ov}
                        onChange={e=>{const v=e.target.value; setManualGrams(prev=>{const next={...prev};if(v==='')delete next[p.id];else next[p.id]=v;return next;});}}
                      />
                    </td>
                    <td className={`r ${sc}`}>{sol!==null?(sol*100).toFixed(1)+'%':'—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Product mix</div>
        <div className="page-desc">Calculated grams for your stock solution. Override any value to fine-tune — overridden entries appear in purple and recalculate delivered PPM instantly.</div>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:16,alignItems:'center'}}>
        {hasOv&&<button className="btn btn-ghost btn-sm" onClick={()=>setManualGrams({})}><RefreshCw size={12}/> Reset overrides</button>}
        <span style={{fontSize:12,color:'var(--t3)'}}>Stock: {options.stockVolumeLiters} L at {options.concentrationFactor}× — supply: {(options.supplyVolumeLiters/3785).toFixed(0)}k L</span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div>
          {renderTank('Tank A','tp-a',all.filter(p=>p.tank==='A'))}
          {renderTank('Tank AB','tp-ab',all.filter(p=>p.tank==='AB'))}
        </div>
        <div>{renderTank('Tank B','tp-b',all.filter(p=>p.tank==='B'))}</div>
      </div>
      <div className="step-footer">
        <button className="btn btn-ghost" onClick={()=>setStep(2)}><ChevronLeft size={14}/> Back</button>
        <span className="step-footer-info">Live summary updates on the right as you adjust values</span>
        <button className="btn btn-primary" onClick={()=>setStep(4)}>Review & validate <ChevronRight size={14}/></button>
      </div>
    </div>
  );
}

// ─── Step 5: Validate ─────────────────────────────────────────
function StepValidate({result,targets,setStep,save,exportCSV}) {
  const [mSel,setMSel]=useState(null);
  const [mFilt,setMFilt]=useState('all');
  if(!result) return <div className="empty-state"><p>Complete previous steps first.</p></div>;

  const warns=result.muldersWarnings||[];
  const health=warns.length===0?'ok':warns.some(w=>w.severity==='high')?'err':'warn';
  const getFor=k=>MULDERS_INTERACTIONS.filter(i=>i.from===k||i.to===k);
  const antag=mSel?getFor(mSel).filter(i=>i.type==='antagonism').map(i=>i.from===mSel?i.to:i.from):[];
  const syn  =mSel?getFor(mSel).filter(i=>i.type==='synergism').map(i=>i.from===mSel?i.to:i.from):[];
  const nSt  =k=>{if(!mSel||k===mSel)return'ms';if(antag.includes(k))return'ma';if(syn.includes(k))return'mn2';return'mr';};
  const aw   =k=>warns.some(w=>w.from===k||w.to===k);
  const fInts=MULDERS_INTERACTIONS.filter(i=>mFilt==='all'||i.type===mFilt);

  const radar=NUTRIENTS.map(n=>{
    const t=targets[n.key]||0,d=result.deliveredPPM[n.key]||0;
    const name=n.label.replace(/Nitrate-N/,'NO₃').replace(/Ammonium-N/,'NH₄').replace(/Phosphorus/,'P').replace(/Potassium/,'K').replace(/Calcium/,'Ca').replace(/Magnesium/,'Mg').replace(/Sulfate/,'S').replace(/Silica/,'Si').replace(/Molybdenum/,'Mo').replace(/Manganese/,'Mn').replace(/Copper/,'Cu').replace(/Boron/,'B').replace(/Zinc/,'Zn').replace(/Iron/,'Fe');
    return {name,target:t>0?100:0,delivered:t>0?Math.min(150,(d/t)*100):0};
  }).filter(d=>d.target>0);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Validate recipe</div>
        <div className="page-desc">Review nutrient accuracy, Mulder's interactions, and ratio analysis against literature standards.</div>
      </div>

      <div className={`health-banner hb-${health}`}>
        {health==='ok'?<CheckCircle size={18}/>:<AlertTriangle size={18}/>}
        {health==='ok'?'No significant Mulder\'s interactions detected — recipe looks balanced'
          :`${warns.length} interaction${warns.length>1?'s':''} detected — review the Mulder\'s panel below`}
      </div>

      <div className="stat-row">
        <div className="stat-card"><div className="stat-v" style={{color:'var(--amber)'}}>{f(result.ecEstimate,2)} <span style={{fontSize:13,fontWeight:400,color:'var(--t3)'}}>mS/cm</span></div><div className="stat-l">Predicted EC</div></div>
        <div className="stat-card"><div className="stat-v" style={{color:'var(--blue)'}}>{f(result.totalN)}</div><div className="stat-l">Total N (ppm)</div></div>
        <div className="stat-card"><div className="stat-v" style={{color:'var(--teal)'}}>{f(result.ratios['K:Ca'],2)}</div><div className="stat-l">K:Ca ratio</div></div>
        <div className="stat-card"><div className="stat-v" style={{color:'var(--purp)'}}>{f((result.ratios['NH4:TotalN']||0)*100,1)}<span style={{fontSize:13,fontWeight:400}}> %</span></div><div className="stat-l">NH₄ % of N</div></div>
      </div>

      <div className="val-grid">
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="card card-pad">
            <div className="card-title"><BarChart3 size={12}/> Nutrient accuracy</div>
            <div className="acc-list">
              {NUTRIENTS.map(n=>{
                const t=targets[n.key]||0,d=result.deliveredPPM[n.key]||0;
                if(!t) return null;
                const pct=d/t;
                const s=pct>=0.95&&pct<=1.15?'g':pct<0.95?'l':'h';
                return (
                  <div key={n.key} className="acc-row">
                    <span className="acc-lbl">{n.label}</span>
                    <div className="acc-track"><div className={`acc-fill af-${s}`} style={{width:`${Math.min(100,pct*75)}%`}}/></div>
                    <span className="acc-val">{f(d,n.type==='micro'?3:1)}</span>
                    <span className={`acc-pct ap-${s}`}>{(pct*100).toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {warns.length>0&&(
            <div className="card card-pad">
              <div className="card-title"><AlertTriangle size={12} style={{color:'var(--orange)'}}/> Active Mulder's interactions</div>
              {warns.map((w,i)=>(
                <div key={i} className={`mulder-row ${w.severity==='high'?'sh':'sm'}`}>
                  <div className="mulder-badges">
                    <span className="mb mb-from">{w.from}</span>
                    <span style={{fontSize:11,color:'var(--t3)'}}>antagonizes</span>
                    <span className="mb mb-to">{w.to}</span>
                    <span className={`mb ${w.severity==='high'?'mb-sh':'mb-sm'}`}>{w.severity==='high'?'High risk':'Moderate'}</span>
                  </div>
                  <div className="m-note">{w.note}</div>
                  {w.ratio&&<div className="m-ratio">Ratio: {w.ratio} — target {w.threshold}</div>}
                </div>
              ))}
            </div>
          )}

          <div className="card card-pad">
            <div className="card-title"><BarChart3 size={12}/> Balance radar</div>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radar}>
                <PolarGrid stroke="#e3e7ef"/>
                <PolarAngleAxis dataKey="name" tick={{fill:'#5c6880',fontSize:10}}/>
                <Radar name="Target" dataKey="target" stroke="#2563eb" fill="#2563eb" fillOpacity={0.06} strokeWidth={1.5}/>
                <Radar name="Delivered" dataKey="delivered" stroke="#0d9488" fill="#0d9488" fillOpacity={0.13} strokeWidth={1.5}/>
                <Tooltip contentStyle={{background:'#fff',border:'1px solid #e3e7ef',borderRadius:8,fontSize:12}}/>
              </RadarChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              <span style={{color:'#2563eb'}}>● Target (100%)</span>
              <span style={{color:'#0d9488'}}>● Delivered</span>
            </div>
          </div>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="card card-pad">
            <div className="card-title"><BarChart3 size={12}/> Ratios vs. literature</div>
            {Object.entries(LITERATURE_RATIOS).map(([k,obj])=>{
              const v=result.ratios[k]||0,pct=obj.value>0?v/obj.value:null,ok=pct&&pct>=0.8&&pct<=1.2;
              return (
                <div key={k} className="ratio-row" title={obj.note}>
                  <span className="ratio-key">{k}</span>
                  <span className="ratio-val">{f(v,3)}</span>
                  <span style={{fontSize:11,color:'var(--t3)',fontVariantNumeric:'tabular-nums'}}>{f(obj.value,3)}</span>
                  <span className={`rb ${ok?'rb-ok':'rb-off'}`}>{pct?(pct*100).toFixed(0)+'%':'—'}</span>
                </div>
              );
            })}
            <div style={{fontSize:10,color:'var(--t4)',marginTop:10,fontStyle:'italic'}}>Hover rows for notes · Sonneveld & Voogt (2009)</div>
          </div>

          <div className="card card-pad">
            <div className="card-title"><Network size={12}/> Mulder's chart</div>
            <div className="filter-row">
              {['all','antagonism','synergism'].map(fi=>(
                <button key={fi} className={`fb ${mFilt===fi?'act':''}`} onClick={()=>setMFilt(fi)}>
                  {fi==='all'?'All':fi==='antagonism'?'⊗ Antagonisms':'⊕ Synergisms'}
                </button>
              ))}
            </div>
            <div className="m-grid">
              {MULDER_KEYS.map(k=>(
                <button key={k} className={`mn ${mSel?nSt(k):''}`} onClick={()=>setMSel(mSel===k?null:k)}>
                  {aw(k)&&<span className="mn-dot"/>}
                  <span className="mn-sym">{k}</span>
                  <span className="mn-name">{MULDER_NAMES[k]}</span>
                </button>
              ))}
            </div>
            {mSel&&(
              <div style={{marginBottom:12}}>
                {antag.length>0&&<><div className="ig-hd a" style={{marginBottom:6}}>⊗ High {mSel} antagonizes</div>{antag.map(k=><div key={k} className="ig-row"><span className="ig-b a">{k}</span><span className="ig-note">{getFor(mSel).find(i=>(i.from===mSel&&i.to===k)||(i.to===mSel&&i.from===k))?.note}</span></div>)}</>}
                {syn.length>0&&<><div className="ig-hd s" style={{marginTop:10,marginBottom:6}}>⊕ {mSel} enhances</div>{syn.map(k=><div key={k} className="ig-row"><span className="ig-b s">{k}</span><span className="ig-note">{getFor(mSel).find(i=>(i.from===mSel&&i.to===k)||(i.to===mSel&&i.from===k))?.note}</span></div>)}</>}
              </div>
            )}
            <div className="int-scroll">
              <table className="tbl">
                <thead><tr><th>From</th><th></th><th>To</th><th>Effect</th></tr></thead>
                <tbody>
                  {fInts.map((i,idx)=>(
                    <tr key={idx}>
                      <td><strong>{i.from}</strong></td>
                      <td style={{textAlign:'center'}}><span style={{color:i.type==='antagonism'?'var(--red)':'var(--green)',fontWeight:700,fontSize:13}}>{i.type==='antagonism'?'⊗':'⊕'}</span></td>
                      <td><strong>{i.to}</strong></td>
                      <td style={{fontSize:11,color:'var(--t2)'}}>{i.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="step-footer">
        <button className="btn btn-ghost" onClick={()=>setStep(3)}><ChevronLeft size={14}/> Back</button>
        <span className="step-footer-info">EC method: Sonneveld equivalent charge formula (Acta Hort 481, 1999)</span>
        <button className="btn btn-ghost" onClick={save}><Save size={13}/> Save recipe</button>
        <button className="btn btn-primary" onClick={exportCSV}><Download size={13}/> Export CSV</button>
      </div>
    </div>
  );
}

// ─── Live Panel ───────────────────────────────────────────────
function LivePanel({result,targets}) {
  if(!result) return (
    <div className="live-panel">
      <div className="lp-head">Live summary</div>
      <div style={{fontSize:12,color:'var(--t3)'}}>Set targets to see live calculations.</div>
    </div>
  );
  const warns=result.muldersWarnings||[];
  const health=warns.length===0?'ok':warns.some(w=>w.severity==='high')?'err':'warn';
  return (
    <div className="live-panel">
      <div className="lp-ec">
        <div className="lp-ec-row"><span className="lp-ec-num">{f(result.ecEstimate,2)}</span><span className="lp-ec-unit">mS/cm</span></div>
        <div className="lp-ec-ci">95% CI: {f(result.ecInterval.lower,2)} – {f(result.ecInterval.upper,2)}</div>
      </div>

      <div>
        <div className="lp-head">Delivered</div>
        {[['Total N',result.totalN,1,'ppm'],['NO₃-N',result.deliveredPPM.NO3,1,'ppm'],['K',result.deliveredPPM.K,1,'ppm'],['Ca',result.deliveredPPM.Ca,1,'ppm'],['Mg',result.deliveredPPM.Mg,1,'ppm'],['P',result.deliveredPPM.P,1,'ppm'],['Fe',result.deliveredPPM.Fe,2,'ppm']].map(([l,v,d,u])=>(
          <div key={l} className="lp-row"><span className="lp-row-lbl">{l}</span><span className="lp-row-val">{f(v,d)} {u}</span></div>
        ))}
      </div>

      <div>
        <div className={`lp-alert ${health}`}>
          <div className="lp-alert-hd">{health==='ok'?<CheckCircle size={11}/>:<AlertTriangle size={11}/>}{health==='ok'?'Balanced':health==='err'?'High-risk':'Interactions'}</div>
          {warns.slice(0,3).map((w,i)=><div key={i} className="lp-alert-row"><strong>{w.from}→{w.to}:</strong> {w.note.split(' — ')[0]}</div>)}
          {warns.length>3&&<div className="lp-alert-row">+{warns.length-3} more in Validate</div>}
        </div>
      </div>

      {result.solubilityWarnings.length>0&&(
        <div className="lp-alert warn">
          <div className="lp-alert-hd"><AlertTriangle size={11}/> Solubility</div>
          {result.solubilityWarnings.map(w=><div key={w.product} className="lp-alert-row">{w.product}: {w.percent}%</div>)}
        </div>
      )}

      <div>
        <div className="lp-head">Key ratios</div>
        {Object.entries(LITERATURE_RATIOS).slice(0,5).map(([k,obj])=>{
          const v=result.ratios[k]||0,pct=obj.value>0?v/obj.value:null,ok=pct&&pct>=0.8&&pct<=1.2;
          return (
            <div key={k} className="ratio-row" title={obj.note}>
              <span className="ratio-key">{k}</span>
              <span className="ratio-val">{f(v,2)}</span>
              <span className={`rb ${ok?'rb-ok':'rb-off'}`}>{pct?(pct*100).toFixed(0)+'%':'—'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Products modal ───────────────────────────────────────────
function ProductsModal({result,options,customProducts,setCustomProducts,notify,onClose}) {
  const [search,setSearch]=useState('');
  const [editing,setEditing]=useState(null);
  const all=[...PRODUCTS,...customProducts];
  const isCustom=id=>!PRODUCTS.find(p=>p.id===id);
  const filtered=all.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||(p.brand||'').toLowerCase().includes(search.toLowerCase()));
  const sv=options?.stockVolumeLiters||189;

  const saveProduct=p=>{
    setCustomProducts(prev=>{const idx=prev.findIndex(x=>x.id===p.id);if(idx>=0){const n=[...prev];n[idx]=p;return n;}return[...prev,p];});
    setEditing(null); notify(p.name+' saved');
  };
  const del=id=>{setCustomProducts(prev=>prev.filter(p=>p.id!==id));notify('Removed');};

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{width:780,maxWidth:'96vw'}} onClick={e=>e.stopPropagation()}>
        <div className="modal-hd">
          <h2>Products</h2>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <div style={{position:'relative',display:'flex',alignItems:'center'}}>
              <Search size={12} style={{position:'absolute',left:9,color:'var(--t3)',pointerEvents:'none'}}/>
              <input style={{paddingLeft:28,background:'var(--s1)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:'5px 9px 5px 28px',fontSize:13,width:180,fontFamily:'var(--font)'}} placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <button className="btn btn-primary btn-sm" onClick={()=>setEditing({...EMPTY_PROD,id:'c_'+Date.now()})}><Plus size={12}/> Add product</button>
            <button className="btn-icon" onClick={onClose}><X size={15}/></button>
          </div>
        </div>
        <div style={{overflowY:'auto',maxHeight:'72vh'}}>
          <table className="pt">
            <thead><tr><th>Product</th><th>Brand</th><th>Tank</th><th>Composition</th><th className="r">Sol. g/mL</th><th className="r">In recipe</th><th className="r">Sol%</th><th></th></tr></thead>
            <tbody>
              {filtered.map(p=>{
                const g=result?.gramsInStock[p.id]||0;
                const sol=p.solubility&&g>0?g/(p.solubility*sv*1000):null;
                return (
                  <tr key={p.id} className={g>0.01?'active':''}>
                    <td><span className="pt-name">{p.name}</span>{isCustom(p.id)&&<span className="custom-badge">custom</span>}</td>
                    <td className="pt-brand">{p.brand||'—'}</td>
                    <td><span className={`tank-pill tp-${p.tank.toLowerCase()}`}>{p.tank}</span></td>
                    <td><div className="comp-pills">{Object.entries(p.composition).filter(([,v])=>v>0).map(([k,v])=><span key={k} className="comp-pill">{k}: {(v*100).toFixed(1)}%</span>)}</div></td>
                    <td className="r" style={{color:'var(--t2)'}}>{p.solubility||'—'}</td>
                    <td className={`r ${g>0.01?'pt-g':''}`}>{g>0.01?g.toFixed(1)+' g':'—'}</td>
                    <td className={`r ${sol&&sol>0.8?'sol-warn':''}`}>{sol?(sol*100).toFixed(1)+'%':'—'}</td>
                    <td style={{textAlign:'right',whiteSpace:'nowrap'}}>
                      <button className="btn-icon" onClick={()=>setEditing({...p})} title="Edit"><Info size={12}/></button>
                      {isCustom(p.id)&&<button className="btn-icon danger" onClick={()=>del(p.id)}><Trash2 size={12}/></button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {editing&&<ProductForm product={editing} isNew={!customProducts.find(p=>p.id===editing.id)} onSave={saveProduct} onClose={()=>setEditing(null)}/>}
    </div>
  );
}

function ProductForm({product,isNew,onSave,onClose}) {
  const [p,setP]=useState({...product});
  const keys=['NO3','NH4','P','K','Ca','Mg','S','Fe','Mn','Zn','Cu','B','Mo','Si'];
  const set=(k,v)=>setP(prev=>({...prev,[k]:v}));
  const setC=(k,v)=>setP(prev=>({...prev,composition:{...prev.composition,[k]:parseFloat(v)||0}}));
  const total=Object.values(p.composition).reduce((a,b)=>a+(b||0),0);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-hd"><h2>{isNew?'Add product':'Edit product'}</h2><button className="btn-icon" onClick={onClose}><X size={15}/></button></div>
        <div className="modal-bd">
          <div className="field"><label className="field-label">Product name *</label><input className="input" value={p.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Calcium Nitrate"/></div>
          <div className="modal-2col">
            <div className="field"><label className="field-label">Brand</label><input className="input" value={p.brand||''} onChange={e=>set('brand',e.target.value)} placeholder="e.g. Yara"/></div>
            <div className="field"><label className="field-label">Tank</label><select className="input select-input" value={p.tank} onChange={e=>set('tank',e.target.value)}><option value="A">A</option><option value="B">B</option><option value="AB">AB (both)</option></select></div>
          </div>
          <div className="field"><label className="field-label">Solubility (g/mL water)</label><input className="input" type="number" step="0.001" value={p.solubility||''} onChange={e=>set('solubility',parseFloat(e.target.value)||null)} placeholder="e.g. 0.30"/></div>
          <div className="modal-sec">Nutrient composition — fraction by elemental weight (e.g. 0.19 = 19%)</div>
          <div className="modal-grid">
            {keys.map(k=>(
              <div key={k} className="mc-row">
                <label className="mc-lbl">{k}</label>
                <input type="number" min="0" max="1" step="0.001" className="input" style={{fontSize:12,padding:'5px 7px',textAlign:'right'}} value={p.composition[k]||''} placeholder="0" onChange={e=>setC(k,e.target.value)}/>
                <span className="mc-pct">{((p.composition[k]||0)*100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
          <div className={`modal-sum ${total>1.01?'ms-bad':'ms-ok'}`}>Total: {(total*100).toFixed(1)}% {total>1.01?'⚠ exceeds 100%':total>0.5?'✓':''}</div>
        </div>
        <div className="modal-ft">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={()=>p.name&&onSave(p)} disabled={!p.name}>{isNew?'Add product':'Save changes'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Settings modal ───────────────────────────────────────────
function SettingsModal({options,setO,setON,targetEC,setTargetEC,applyEC,onClose}) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{width:560}} onClick={e=>e.stopPropagation()}>
        <div className="modal-hd"><h2>Settings & methodology</h2><button className="btn-icon" onClick={onClose}><X size={15}/></button></div>
        <div className="modal-bd">

          <div className="settings-section">
            <div className="settings-hd">Target EC scaler</div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <input className="input" type="number" step="0.1" min="0" placeholder="e.g. 1.8" value={targetEC} onChange={e=>setTargetEC(e.target.value)} style={{flex:1}}/>
              <span style={{fontSize:12,color:'var(--t3)',whiteSpace:'nowrap'}}>mS/cm</span>
              <button className="btn btn-primary btn-sm" onClick={()=>{applyEC();onClose();}}>Scale all targets</button>
            </div>
            <div className="field-hint">Proportionally scales all nutrient targets to hit the desired EC</div>
          </div>

          <div className="settings-section">
            <div className="settings-hd">EC calculation method</div>
            <div style={{background:'var(--s1)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:'12px 14px',fontSize:12.5,lineHeight:1.6,color:'var(--t1)'}}>
              <p style={{marginBottom:8}}><strong>Sonneveld equivalent charge formula</strong> — the standard used in Dutch commercial greenhouse production worldwide.</p>
              <p style={{marginBottom:8,fontFamily:'monospace',background:'var(--s2)',padding:'6px 10px',borderRadius:5,fontSize:12}}>EC (mS/cm) = Σ(ppm ÷ MW × |charge|) ÷ 20</p>
              <p style={{marginBottom:4}}>Each ion is converted to meq/L using its atomic weight and ionic charge, then summed and divided by 20. Si is excluded (non-ionic). Micronutrients contribute &lt;0.02 mS/cm and are omitted.</p>
              <p style={{color:'var(--t3)',fontSize:11}}>Source: Sonneveld, Voogt & Spaans (1999). A universal algorithm for calculation of nutrient solutions. <em>Acta Hort 481</em>:331–339.</p>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-hd">Nutrient ratio literature values</div>
            <div style={{fontSize:12,color:'var(--t1)',lineHeight:1.6}}>
              <p style={{marginBottom:4}}>Ratio benchmarks are taken from Sonneveld & Voogt (2009) <em>Plant Nutrition of Greenhouse Crops</em>, Springer, and Resh (2012) <em>Hydroponic Food Production</em>. Warnings fire when a ratio deviates &gt;20% from the literature average.</p>
              <p style={{color:'var(--t3)',fontSize:11}}>Mulder's interaction thresholds based on Mulder (1953), Bergmann (1992), and Marschner (2012).</p>
            </div>
          </div>

        </div>
        <div className="modal-ft"><button className="btn btn-ghost" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
