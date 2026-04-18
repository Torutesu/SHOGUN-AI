const { useState, useEffect } = React;

const LAYERS = [
  { id:'L1', num:'一', title:'Home', jp:'起動パッド', desc:'Launch pad', screens: window.L1Screens },
  { id:'L2', num:'二', title:'Memory ★', jp:'記憶', desc:'Core heart of SHOGUN', screens: window.L2Screens },
  { id:'L3', num:'三', title:'Chat', jp:'対話', desc:'Interaction layer', screens: window.L3Screens },
  { id:'L4', num:'四', title:'Agents ★', jp:'家臣', desc:'Execution layer', screens: window.L4Screens },
  { id:'L5', num:'五', title:'Work', jp:'任務', desc:'Operations layer', screens: window.L5Screens },
  { id:'L6', num:'六', title:'Capture', jp:'捕捉', desc:'Ingest layer', screens: window.L6Screens },
  { id:'L7', num:'七', title:'Integrations', jp:'接続', desc:'Connection layer', screens: window.L7Screens },
  { id:'L8', num:'八', title:'Settings', jp:'設定', desc:'System layer', screens: window.L8Screens },
];

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "annotations": false,
  "gridOverlay": false,
  "handwritten": false,
  "jpLabels": true
}/*EDITMODE-END*/;

function App(){
  const [activeLayer, setActiveLayer] = useState(() => localStorage.getItem('shogun-layer') || 'L1');
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => { localStorage.setItem('shogun-layer', activeLayer); }, [activeLayer]);

  useEffect(() => {
    document.body.classList.toggle('annotations', tweaks.annotations);
    document.body.classList.toggle('grid-overlay', tweaks.gridOverlay);
    document.body.classList.toggle('handwritten', tweaks.handwritten);
    document.body.classList.toggle('hide-jp', !tweaks.jpLabels);
  }, [tweaks]);

  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setEditMode(true);
      if (e.data?.type === '__deactivate_edit_mode') setEditMode(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({type:'__edit_mode_available'}, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const updateTweak = (k, v) => {
    const next = {...tweaks, [k]: v};
    setTweaks(next);
    window.parent.postMessage({type:'__edit_mode_set_keys', edits: {[k]: v}}, '*');
  };

  const layer = LAYERS.find(l => l.id === activeLayer);

  return (
    <div className="page">
      <div className="page-header">
        <div className="brand-mark">
          <div className="brand-seal">将</div>
          <div className="brand-text">
            <h1>SHOGUN AI · Wireframes</h1>
            <div className="sub">Information architecture · 8 layers · 2 variants per screen</div>
          </div>
        </div>
        <div/>
        <div className="page-meta">
          MID-FIDELITY · GREYSCALE<br/>
          BILINGUAL EN / JP<br/>
          TATAMI GRID · 24PT
        </div>
      </div>

      <div className="layer-nav">
        {LAYERS.map(l => (
          <button key={l.id} className={l.id===activeLayer?'active':''} onClick={()=>setActiveLayer(l.id)}>
            <span className="num">{l.id} · {l.num}</span>
            {l.title}
            <span className="jpsub">{l.jp}</span>
          </button>
        ))}
      </div>

      <div className="layer-meta">
        <h2>
          <span className="star">{layer.title.includes('★')?'★':''}</span>
          {layer.title.replace(' ★','')}
          <span className="jp-title">{layer.jp}</span>
        </h2>
        <div className="layer-desc">
          {layer.id} · {layer.desc}<br/>
          {layer.screens?.length || 0} SCREENS · {(layer.screens?.length || 0) * 2} VARIANTS
        </div>
      </div>

      <div className="screens">
        {(layer.screens || []).map((s, i) => (
          <div key={i} className="screen-row">
            <div className="row-label">
              <div className="code">{s.code}</div>
              <h3>{s.title}</h3>
              <div className="jp-sub">{s.jp}</div>
              <p>{s.desc}</p>
            </div>
            {s.variants.map((v, j) => (
              <div key={j} className="variant">
                <div className="variant-header">
                  <span className="tag">{v.label}</span>
                  <span className="kind">{v.kind}</span>
                </div>
                <div className="variant-body">
                  {v.render ? React.createElement(v.render) : null}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div id="tweaks-panel" className={editMode?'show':''}>
        <h6>TWEAKS <span style={{color:'var(--ink-4)'}}>⟡</span></h6>
        <div className="tweak-row">
          <span>Annotations</span>
          <input type="checkbox" checked={tweaks.annotations} onChange={e=>updateTweak('annotations', e.target.checked)}/>
        </div>
        <div className="tweak-row">
          <span>Grid overlay</span>
          <input type="checkbox" checked={tweaks.gridOverlay} onChange={e=>updateTweak('gridOverlay', e.target.checked)}/>
        </div>
        <div className="tweak-row">
          <span>Handwritten mode</span>
          <input type="checkbox" checked={tweaks.handwritten} onChange={e=>updateTweak('handwritten', e.target.checked)}/>
        </div>
        <div className="tweak-row">
          <span>JP labels visible</span>
          <input type="checkbox" checked={tweaks.jpLabels} onChange={e=>updateTweak('jpLabels', e.target.checked)}/>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
