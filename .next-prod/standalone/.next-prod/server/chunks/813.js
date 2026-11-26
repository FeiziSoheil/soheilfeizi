"use strict";exports.id=813,exports.ids=[813],exports.modules={80813:(a,b,c)=>{c.r(b),c.d(b,{BooleanController:()=>e,ColorController:()=>i,Controller:()=>d,FunctionController:()=>j,GUI:()=>p,NumberController:()=>k,OptionController:()=>l,StringController:()=>m,default:()=>p});class d{constructor(a,b,c,e,f="div"){this.parent=a,this.object=b,this.property=c,this._disabled=!1,this._hidden=!1,this.initialValue=this.getValue(),this.domElement=document.createElement(f),this.domElement.classList.add("lil-controller"),this.domElement.classList.add(e),this.$name=document.createElement("div"),this.$name.classList.add("lil-name"),d.nextNameID=d.nextNameID||0,this.$name.id=`lil-gui-name-${++d.nextNameID}`,this.$widget=document.createElement("div"),this.$widget.classList.add("lil-widget"),this.$disable=this.$widget,this.domElement.appendChild(this.$name),this.domElement.appendChild(this.$widget),this.domElement.addEventListener("keydown",a=>a.stopPropagation()),this.domElement.addEventListener("keyup",a=>a.stopPropagation()),this.parent.children.push(this),this.parent.controllers.push(this),this.parent.$children.appendChild(this.domElement),this._listenCallback=this._listenCallback.bind(this),this.name(c)}name(a){return this._name=a,this.$name.textContent=a,this}onChange(a){return this._onChange=a,this}_callOnChange(){this.parent._callOnChange(this),void 0!==this._onChange&&this._onChange.call(this,this.getValue()),this._changed=!0}onFinishChange(a){return this._onFinishChange=a,this}_callOnFinishChange(){this._changed&&(this.parent._callOnFinishChange(this),void 0!==this._onFinishChange&&this._onFinishChange.call(this,this.getValue())),this._changed=!1}reset(){return this.setValue(this.initialValue),this._callOnFinishChange(),this}enable(a=!0){return this.disable(!a)}disable(a=!0){return a===this._disabled||(this._disabled=a,this.domElement.classList.toggle("lil-disabled",a),this.$disable.toggleAttribute("disabled",a)),this}show(a=!0){return this._hidden=!a,this.domElement.style.display=this._hidden?"none":"",this}hide(){return this.show(!1)}options(a){let b=this.parent.add(this.object,this.property,a);return b.name(this._name),this.destroy(),b}min(a){return this}max(a){return this}step(a){return this}decimals(a){return this}listen(a=!0){return this._listening=a,void 0!==this._listenCallbackID&&(cancelAnimationFrame(this._listenCallbackID),this._listenCallbackID=void 0),this._listening&&this._listenCallback(),this}_listenCallback(){this._listenCallbackID=requestAnimationFrame(this._listenCallback);let a=this.save();a!==this._listenPrevValue&&this.updateDisplay(),this._listenPrevValue=a}getValue(){return this.object[this.property]}setValue(a){return this.getValue()!==a&&(this.object[this.property]=a,this._callOnChange(),this.updateDisplay()),this}updateDisplay(){return this}load(a){return this.setValue(a),this._callOnFinishChange(),this}save(){return this.getValue()}destroy(){this.listen(!1),this.parent.children.splice(this.parent.children.indexOf(this),1),this.parent.controllers.splice(this.parent.controllers.indexOf(this),1),this.parent.$children.removeChild(this.domElement)}}class e extends d{constructor(a,b,c){super(a,b,c,"lil-boolean","label"),this.$input=document.createElement("input"),this.$input.setAttribute("type","checkbox"),this.$input.setAttribute("aria-labelledby",this.$name.id),this.$widget.appendChild(this.$input),this.$input.addEventListener("change",()=>{this.setValue(this.$input.checked),this._callOnFinishChange()}),this.$disable=this.$input,this.updateDisplay()}updateDisplay(){return this.$input.checked=this.getValue(),this}}function f(a){let b,c;return(b=a.match(/(#|0x)?([a-f0-9]{6})/i))?c=b[2]:(b=a.match(/rgb\(\s*(\d*)\s*,\s*(\d*)\s*,\s*(\d*)\s*\)/))?c=parseInt(b[1]).toString(16).padStart(2,0)+parseInt(b[2]).toString(16).padStart(2,0)+parseInt(b[3]).toString(16).padStart(2,0):(b=a.match(/^#?([a-f0-9])([a-f0-9])([a-f0-9])$/i))&&(c=b[1]+b[1]+b[2]+b[2]+b[3]+b[3]),!!c&&"#"+c}let g={isPrimitive:!0,match:a=>"number"==typeof a,fromHexString:a=>parseInt(a.substring(1),16),toHexString:a=>"#"+a.toString(16).padStart(6,0)},h=[{isPrimitive:!0,match:a=>"string"==typeof a,fromHexString:f,toHexString:f},g,{isPrimitive:!1,match:a=>Array.isArray(a)||ArrayBuffer.isView(a),fromHexString(a,b,c=1){let d=g.fromHexString(a);b[0]=(d>>16&255)/255*c,b[1]=(d>>8&255)/255*c,b[2]=(255&d)/255*c},toHexString([a,b,c],d=1){let e=a*(d=255/d)<<16^b*d<<8^(c*d|0);return g.toHexString(e)}},{isPrimitive:!1,match:a=>Object(a)===a,fromHexString(a,b,c=1){let d=g.fromHexString(a);b.r=(d>>16&255)/255*c,b.g=(d>>8&255)/255*c,b.b=(255&d)/255*c},toHexString({r:a,g:b,b:c},d=1){let e=a*(d=255/d)<<16^b*d<<8^(c*d|0);return g.toHexString(e)}}];class i extends d{constructor(a,b,c,d){var e;super(a,b,c,"lil-color"),this.$input=document.createElement("input"),this.$input.setAttribute("type","color"),this.$input.setAttribute("tabindex",-1),this.$input.setAttribute("aria-labelledby",this.$name.id),this.$text=document.createElement("input"),this.$text.setAttribute("type","text"),this.$text.setAttribute("spellcheck","false"),this.$text.setAttribute("aria-labelledby",this.$name.id),this.$display=document.createElement("div"),this.$display.classList.add("lil-display"),this.$display.appendChild(this.$input),this.$widget.appendChild(this.$display),this.$widget.appendChild(this.$text),this._format=(e=this.initialValue,h.find(a=>a.match(e))),this._rgbScale=d,this._initialValueHexString=this.save(),this._textFocused=!1,this.$input.addEventListener("input",()=>{this._setValueFromHexString(this.$input.value)}),this.$input.addEventListener("blur",()=>{this._callOnFinishChange()}),this.$text.addEventListener("input",()=>{let a=f(this.$text.value);a&&this._setValueFromHexString(a)}),this.$text.addEventListener("focus",()=>{this._textFocused=!0,this.$text.select()}),this.$text.addEventListener("blur",()=>{this._textFocused=!1,this.updateDisplay(),this._callOnFinishChange()}),this.$disable=this.$text,this.updateDisplay()}reset(){return this._setValueFromHexString(this._initialValueHexString),this}_setValueFromHexString(a){if(this._format.isPrimitive){let b=this._format.fromHexString(a);this.setValue(b)}else this._format.fromHexString(a,this.getValue(),this._rgbScale),this._callOnChange(),this.updateDisplay()}save(){return this._format.toHexString(this.getValue(),this._rgbScale)}load(a){return this._setValueFromHexString(a),this._callOnFinishChange(),this}updateDisplay(){return this.$input.value=this._format.toHexString(this.getValue(),this._rgbScale),this._textFocused||(this.$text.value=this.$input.value.substring(1)),this.$display.style.backgroundColor=this.$input.value,this}}class j extends d{constructor(a,b,c){super(a,b,c,"lil-function"),this.$button=document.createElement("button"),this.$button.appendChild(this.$name),this.$widget.appendChild(this.$button),this.$button.addEventListener("click",a=>{a.preventDefault(),this.getValue().call(this.object),this._callOnChange()}),this.$button.addEventListener("touchstart",()=>{},{passive:!0}),this.$disable=this.$button}}class k extends d{constructor(a,b,c,d,e,f){super(a,b,c,"lil-number"),this._initInput(),this.min(d),this.max(e);let g=void 0!==f;this.step(g?f:this._getImplicitStep(),g),this.updateDisplay()}decimals(a){return this._decimals=a,this.updateDisplay(),this}min(a){return this._min=a,this._onUpdateMinMax(),this}max(a){return this._max=a,this._onUpdateMinMax(),this}step(a,b=!0){return this._step=a,this._stepExplicit=b,this}updateDisplay(){let a=this.getValue();if(this._hasSlider){let b=(a-this._min)/(this._max-this._min);b=Math.max(0,Math.min(b,1)),this.$fill.style.width=100*b+"%"}return this._inputFocused||(this.$input.value=void 0===this._decimals?a:a.toFixed(this._decimals)),this}_initInput(){this.$input=document.createElement("input"),this.$input.setAttribute("type","text"),this.$input.setAttribute("aria-labelledby",this.$name.id),window.matchMedia("(pointer: coarse)").matches&&(this.$input.setAttribute("type","number"),this.$input.setAttribute("step","any")),this.$widget.appendChild(this.$input),this.$disable=this.$input;let a=()=>{let a=parseFloat(this.$input.value);isNaN(a)||(this._stepExplicit&&(a=this._snap(a)),this.setValue(this._clamp(a)))},b=a=>{let b=parseFloat(this.$input.value);isNaN(b)||(this._snapClampSetValue(b+a),this.$input.value=this.getValue())},c=a=>{"Enter"===a.key&&this.$input.blur(),"ArrowUp"===a.code&&(a.preventDefault(),b(this._step*this._arrowKeyMultiplier(a))),"ArrowDown"===a.code&&(a.preventDefault(),b(-(this._step*this._arrowKeyMultiplier(a)*1)))},d=a=>{this._inputFocused&&(a.preventDefault(),b(this._step*this._normalizeMouseWheel(a)))},e=!1,f,g,h,i,j,k=a=>{f=a.clientX,g=h=a.clientY,e=!0,i=this.getValue(),j=0,window.addEventListener("mousemove",l),window.addEventListener("mouseup",m)},l=a=>{if(e){let b=a.clientX-f;Math.abs(a.clientY-g)>5?(a.preventDefault(),this.$input.blur(),e=!1,this._setDraggingStyle(!0,"vertical")):Math.abs(b)>5&&m()}if(!e){let b=a.clientY-h;j-=b*this._step*this._arrowKeyMultiplier(a),i+j>this._max?j=this._max-i:i+j<this._min&&(j=this._min-i),this._snapClampSetValue(i+j)}h=a.clientY},m=()=>{this._setDraggingStyle(!1,"vertical"),this._callOnFinishChange(),window.removeEventListener("mousemove",l),window.removeEventListener("mouseup",m)},n=()=>{this._inputFocused=!0},o=()=>{this._inputFocused=!1,this.updateDisplay(),this._callOnFinishChange()};this.$input.addEventListener("input",a),this.$input.addEventListener("keydown",c),this.$input.addEventListener("wheel",d,{passive:!1}),this.$input.addEventListener("mousedown",k),this.$input.addEventListener("focus",n),this.$input.addEventListener("blur",o)}_initSlider(){let a;this._hasSlider=!0,this.$slider=document.createElement("div"),this.$slider.classList.add("lil-slider"),this.$fill=document.createElement("div"),this.$fill.classList.add("lil-fill"),this.$slider.appendChild(this.$fill),this.$widget.insertBefore(this.$slider,this.$input),this.domElement.classList.add("lil-has-slider");let b=a=>{let b,c,d,e=this.$slider.getBoundingClientRect(),f=(b=e.left,c=e.right,d=this._min,(a-b)/(c-b)*(this._max-d)+d);this._snapClampSetValue(f)},c=a=>{this._setDraggingStyle(!0),b(a.clientX),window.addEventListener("mousemove",d),window.addEventListener("mouseup",e)},d=a=>{b(a.clientX)},e=()=>{this._callOnFinishChange(),this._setDraggingStyle(!1),window.removeEventListener("mousemove",d),window.removeEventListener("mouseup",e)},f=!1,g,h,i=a=>{a.preventDefault(),this._setDraggingStyle(!0),b(a.touches[0].clientX),f=!1},j=a=>{a.touches.length>1||(this._hasScrollBar?(g=a.touches[0].clientX,h=a.touches[0].clientY,f=!0):i(a),window.addEventListener("touchmove",k,{passive:!1}),window.addEventListener("touchend",l))},k=a=>{f?Math.abs(a.touches[0].clientX-g)>Math.abs(a.touches[0].clientY-h)?i(a):(window.removeEventListener("touchmove",k),window.removeEventListener("touchend",l)):(a.preventDefault(),b(a.touches[0].clientX))},l=()=>{this._callOnFinishChange(),this._setDraggingStyle(!1),window.removeEventListener("touchmove",k),window.removeEventListener("touchend",l)},m=this._callOnFinishChange.bind(this),n=b=>{if(Math.abs(b.deltaX)<Math.abs(b.deltaY)&&this._hasScrollBar)return;b.preventDefault();let c=this._normalizeMouseWheel(b)*this._step;this._snapClampSetValue(this.getValue()+c),this.$input.value=this.getValue(),clearTimeout(a),a=setTimeout(m,400)};this.$slider.addEventListener("mousedown",c),this.$slider.addEventListener("touchstart",j,{passive:!1}),this.$slider.addEventListener("wheel",n,{passive:!1})}_setDraggingStyle(a,b="horizontal"){this.$slider&&this.$slider.classList.toggle("lil-active",a),document.body.classList.toggle("lil-dragging",a),document.body.classList.toggle(`lil-${b}`,a)}_getImplicitStep(){return this._hasMin&&this._hasMax?(this._max-this._min)/1e3:.1}_onUpdateMinMax(){!this._hasSlider&&this._hasMin&&this._hasMax&&(this._stepExplicit||this.step(this._getImplicitStep(),!1),this._initSlider(),this.updateDisplay())}_normalizeMouseWheel(a){let{deltaX:b,deltaY:c}=a;return Math.floor(a.deltaY)!==a.deltaY&&a.wheelDelta&&(b=0,c=-a.wheelDelta/120*(this._stepExplicit?1:10)),b+-c}_arrowKeyMultiplier(a){let b=this._stepExplicit?1:10;return a.shiftKey?b*=10:a.altKey&&(b/=10),b}_snap(a){let b=0;return this._hasMin?b=this._min:this._hasMax&&(b=this._max),a-=b,a=parseFloat((a=Math.round(a/this._step)*this._step+b).toPrecision(15))}_clamp(a){return a<this._min&&(a=this._min),a>this._max&&(a=this._max),a}_snapClampSetValue(a){this.setValue(this._clamp(this._snap(a)))}get _hasScrollBar(){let a=this.parent.root.$children;return a.scrollHeight>a.clientHeight}get _hasMin(){return void 0!==this._min}get _hasMax(){return void 0!==this._max}}class l extends d{constructor(a,b,c,d){super(a,b,c,"lil-option"),this.$select=document.createElement("select"),this.$select.setAttribute("aria-labelledby",this.$name.id),this.$display=document.createElement("div"),this.$display.classList.add("lil-display"),this.$select.addEventListener("change",()=>{this.setValue(this._values[this.$select.selectedIndex]),this._callOnFinishChange()}),this.$select.addEventListener("focus",()=>{this.$display.classList.add("lil-focus")}),this.$select.addEventListener("blur",()=>{this.$display.classList.remove("lil-focus")}),this.$widget.appendChild(this.$select),this.$widget.appendChild(this.$display),this.$disable=this.$select,this.options(d)}options(a){return this._values=Array.isArray(a)?a:Object.values(a),this._names=Array.isArray(a)?a:Object.keys(a),this.$select.replaceChildren(),this._names.forEach(a=>{let b=document.createElement("option");b.textContent=a,this.$select.appendChild(b)}),this.updateDisplay(),this}updateDisplay(){let a=this.getValue(),b=this._values.indexOf(a);return this.$select.selectedIndex=b,this.$display.textContent=-1===b?a:this._names[b],this}}class m extends d{constructor(a,b,c){super(a,b,c,"lil-string"),this.$input=document.createElement("input"),this.$input.setAttribute("type","text"),this.$input.setAttribute("spellcheck","false"),this.$input.setAttribute("aria-labelledby",this.$name.id),this.$input.addEventListener("input",()=>{this.setValue(this.$input.value)}),this.$input.addEventListener("keydown",a=>{"Enter"===a.code&&this.$input.blur()}),this.$input.addEventListener("blur",()=>{this._callOnFinishChange()}),this.$widget.appendChild(this.$input),this.$disable=this.$input,this.updateDisplay()}updateDisplay(){return this.$input.value=this.getValue(),this}}var n=`.lil-gui {
  font-family: var(--font-family);
  font-size: var(--font-size);
  line-height: 1;
  font-weight: normal;
  font-style: normal;
  text-align: left;
  color: var(--text-color);
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  --background-color: #1f1f1f;
  --text-color: #ebebeb;
  --title-background-color: #111111;
  --title-text-color: #ebebeb;
  --widget-color: #424242;
  --hover-color: #4f4f4f;
  --focus-color: #595959;
  --number-color: #2cc9ff;
  --string-color: #a2db3c;
  --font-size: 11px;
  --input-font-size: 11px;
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  --font-family-mono: Menlo, Monaco, Consolas, "Droid Sans Mono", monospace;
  --padding: 4px;
  --spacing: 4px;
  --widget-height: 20px;
  --title-height: calc(var(--widget-height) + var(--spacing) * 1.25);
  --name-width: 45%;
  --slider-knob-width: 2px;
  --slider-input-width: 27%;
  --color-input-width: 27%;
  --slider-input-min-width: 45px;
  --color-input-min-width: 45px;
  --folder-indent: 7px;
  --widget-padding: 0 0 0 3px;
  --widget-border-radius: 2px;
  --checkbox-size: calc(0.75 * var(--widget-height));
  --scrollbar-width: 5px;
}
.lil-gui, .lil-gui * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
.lil-gui.lil-root {
  width: var(--width, 245px);
  display: flex;
  flex-direction: column;
  background: var(--background-color);
}
.lil-gui.lil-root > .lil-title {
  background: var(--title-background-color);
  color: var(--title-text-color);
}
.lil-gui.lil-root > .lil-children {
  overflow-x: hidden;
  overflow-y: auto;
}
.lil-gui.lil-root > .lil-children::-webkit-scrollbar {
  width: var(--scrollbar-width);
  height: var(--scrollbar-width);
  background: var(--background-color);
}
.lil-gui.lil-root > .lil-children::-webkit-scrollbar-thumb {
  border-radius: var(--scrollbar-width);
  background: var(--focus-color);
}
@media (pointer: coarse) {
  .lil-gui.lil-allow-touch-styles, .lil-gui.lil-allow-touch-styles .lil-gui {
    --widget-height: 28px;
    --padding: 6px;
    --spacing: 6px;
    --font-size: 13px;
    --input-font-size: 16px;
    --folder-indent: 10px;
    --scrollbar-width: 7px;
    --slider-input-min-width: 50px;
    --color-input-min-width: 65px;
  }
}
.lil-gui.lil-force-touch-styles, .lil-gui.lil-force-touch-styles .lil-gui {
  --widget-height: 28px;
  --padding: 6px;
  --spacing: 6px;
  --font-size: 13px;
  --input-font-size: 16px;
  --folder-indent: 10px;
  --scrollbar-width: 7px;
  --slider-input-min-width: 50px;
  --color-input-min-width: 65px;
}
.lil-gui.lil-auto-place, .lil-gui.autoPlace {
  max-height: 100%;
  position: fixed;
  top: 0;
  right: 15px;
  z-index: 1001;
}

.lil-controller {
  display: flex;
  align-items: center;
  padding: 0 var(--padding);
  margin: var(--spacing) 0;
}
.lil-controller.lil-disabled {
  opacity: 0.5;
}
.lil-controller.lil-disabled, .lil-controller.lil-disabled * {
  pointer-events: none !important;
}
.lil-controller > .lil-name {
  min-width: var(--name-width);
  flex-shrink: 0;
  white-space: pre;
  padding-right: var(--spacing);
  line-height: var(--widget-height);
}
.lil-controller .lil-widget {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: var(--widget-height);
}
.lil-controller.lil-string input {
  color: var(--string-color);
}
.lil-controller.lil-boolean {
  cursor: pointer;
}
.lil-controller.lil-color .lil-display {
  width: 100%;
  height: var(--widget-height);
  border-radius: var(--widget-border-radius);
  position: relative;
}
@media (hover: hover) {
  .lil-controller.lil-color .lil-display:hover:before {
    content: " ";
    display: block;
    position: absolute;
    border-radius: var(--widget-border-radius);
    border: 1px solid #fff9;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
  }
}
.lil-controller.lil-color input[type=color] {
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.lil-controller.lil-color input[type=text] {
  margin-left: var(--spacing);
  font-family: var(--font-family-mono);
  min-width: var(--color-input-min-width);
  width: var(--color-input-width);
  flex-shrink: 0;
}
.lil-controller.lil-option select {
  opacity: 0;
  position: absolute;
  width: 100%;
  max-width: 100%;
}
.lil-controller.lil-option .lil-display {
  position: relative;
  pointer-events: none;
  border-radius: var(--widget-border-radius);
  height: var(--widget-height);
  line-height: var(--widget-height);
  max-width: 100%;
  overflow: hidden;
  word-break: break-all;
  padding-left: 0.55em;
  padding-right: 1.75em;
  background: var(--widget-color);
}
@media (hover: hover) {
  .lil-controller.lil-option .lil-display.lil-focus {
    background: var(--focus-color);
  }
}
.lil-controller.lil-option .lil-display.lil-active {
  background: var(--focus-color);
}
.lil-controller.lil-option .lil-display:after {
  font-family: "lil-gui";
  content: "↕";
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  padding-right: 0.375em;
}
.lil-controller.lil-option .lil-widget,
.lil-controller.lil-option select {
  cursor: pointer;
}
@media (hover: hover) {
  .lil-controller.lil-option .lil-widget:hover .lil-display {
    background: var(--hover-color);
  }
}
.lil-controller.lil-number input {
  color: var(--number-color);
}
.lil-controller.lil-number.lil-has-slider input {
  margin-left: var(--spacing);
  width: var(--slider-input-width);
  min-width: var(--slider-input-min-width);
  flex-shrink: 0;
}
.lil-controller.lil-number .lil-slider {
  width: 100%;
  height: var(--widget-height);
  background: var(--widget-color);
  border-radius: var(--widget-border-radius);
  padding-right: var(--slider-knob-width);
  overflow: hidden;
  cursor: ew-resize;
  touch-action: pan-y;
}
@media (hover: hover) {
  .lil-controller.lil-number .lil-slider:hover {
    background: var(--hover-color);
  }
}
.lil-controller.lil-number .lil-slider.lil-active {
  background: var(--focus-color);
}
.lil-controller.lil-number .lil-slider.lil-active .lil-fill {
  opacity: 0.95;
}
.lil-controller.lil-number .lil-fill {
  height: 100%;
  border-right: var(--slider-knob-width) solid var(--number-color);
  box-sizing: content-box;
}

.lil-dragging .lil-gui {
  --hover-color: var(--widget-color);
}
.lil-dragging * {
  cursor: ew-resize !important;
}
.lil-dragging.lil-vertical * {
  cursor: ns-resize !important;
}

.lil-gui .lil-title {
  height: var(--title-height);
  font-weight: 600;
  padding: 0 var(--padding);
  width: 100%;
  text-align: left;
  background: none;
  text-decoration-skip: objects;
}
.lil-gui .lil-title:before {
  font-family: "lil-gui";
  content: "▾";
  padding-right: 2px;
  display: inline-block;
}
.lil-gui .lil-title:active {
  background: var(--title-background-color);
  opacity: 0.75;
}
@media (hover: hover) {
  body:not(.lil-dragging) .lil-gui .lil-title:hover {
    background: var(--title-background-color);
    opacity: 0.85;
  }
  .lil-gui .lil-title:focus {
    text-decoration: underline var(--focus-color);
  }
}
.lil-gui.lil-root > .lil-title:focus {
  text-decoration: none !important;
}
.lil-gui.lil-closed > .lil-title:before {
  content: "▸";
}
.lil-gui.lil-closed > .lil-children {
  transform: translateY(-7px);
  opacity: 0;
}
.lil-gui.lil-closed:not(.lil-transition) > .lil-children {
  display: none;
}
.lil-gui.lil-transition > .lil-children {
  transition-duration: 300ms;
  transition-property: height, opacity, transform;
  transition-timing-function: cubic-bezier(0.2, 0.6, 0.35, 1);
  overflow: hidden;
  pointer-events: none;
}
.lil-gui .lil-children:empty:before {
  content: "Empty";
  padding: 0 var(--padding);
  margin: var(--spacing) 0;
  display: block;
  height: var(--widget-height);
  font-style: italic;
  line-height: var(--widget-height);
  opacity: 0.5;
}
.lil-gui.lil-root > .lil-children > .lil-gui > .lil-title {
  border: 0 solid var(--widget-color);
  border-width: 1px 0;
  transition: border-color 300ms;
}
.lil-gui.lil-root > .lil-children > .lil-gui.lil-closed > .lil-title {
  border-bottom-color: transparent;
}
.lil-gui + .lil-controller {
  border-top: 1px solid var(--widget-color);
  margin-top: 0;
  padding-top: var(--spacing);
}
.lil-gui .lil-gui .lil-gui > .lil-title {
  border: none;
}
.lil-gui .lil-gui .lil-gui > .lil-children {
  border: none;
  margin-left: var(--folder-indent);
  border-left: 2px solid var(--widget-color);
}
.lil-gui .lil-gui .lil-controller {
  border: none;
}

.lil-gui label, .lil-gui input, .lil-gui button {
  -webkit-tap-highlight-color: transparent;
}
.lil-gui input {
  border: 0;
  outline: none;
  font-family: var(--font-family);
  font-size: var(--input-font-size);
  border-radius: var(--widget-border-radius);
  height: var(--widget-height);
  background: var(--widget-color);
  color: var(--text-color);
  width: 100%;
}
@media (hover: hover) {
  .lil-gui input:hover {
    background: var(--hover-color);
  }
  .lil-gui input:active {
    background: var(--focus-color);
  }
}
.lil-gui input:disabled {
  opacity: 1;
}
.lil-gui input[type=text],
.lil-gui input[type=number] {
  padding: var(--widget-padding);
  -moz-appearance: textfield;
}
.lil-gui input[type=text]:focus,
.lil-gui input[type=number]:focus {
  background: var(--focus-color);
}
.lil-gui input[type=checkbox] {
  appearance: none;
  width: var(--checkbox-size);
  height: var(--checkbox-size);
  border-radius: var(--widget-border-radius);
  text-align: center;
  cursor: pointer;
}
.lil-gui input[type=checkbox]:checked:before {
  font-family: "lil-gui";
  content: "✓";
  font-size: var(--checkbox-size);
  line-height: var(--checkbox-size);
}
@media (hover: hover) {
  .lil-gui input[type=checkbox]:focus {
    box-shadow: inset 0 0 0 1px var(--focus-color);
  }
}
.lil-gui button {
  outline: none;
  cursor: pointer;
  font-family: var(--font-family);
  font-size: var(--font-size);
  color: var(--text-color);
  width: 100%;
  border: none;
}
.lil-gui .lil-controller button {
  height: var(--widget-height);
  text-transform: none;
  background: var(--widget-color);
  border-radius: var(--widget-border-radius);
}
@media (hover: hover) {
  .lil-gui .lil-controller button:hover {
    background: var(--hover-color);
  }
  .lil-gui .lil-controller button:focus {
    box-shadow: inset 0 0 0 1px var(--focus-color);
  }
}
.lil-gui .lil-controller button:active {
  background: var(--focus-color);
}

@font-face {
  font-family: "lil-gui";
  src: url("data:application/font-woff2;charset=utf-8;base64,d09GMgABAAAAAALkAAsAAAAABtQAAAKVAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHFQGYACDMgqBBIEbATYCJAMUCwwABCAFhAoHgQQbHAbIDiUFEYVARAAAYQTVWNmz9MxhEgodq49wYRUFKE8GWNiUBxI2LBRaVnc51U83Gmhs0Q7JXWMiz5eteLwrKwuxHO8VFxUX9UpZBs6pa5ABRwHA+t3UxUnH20EvVknRerzQgX6xC/GH6ZUvTcAjAv122dF28OTqCXrPuyaDER30YBA1xnkVutDDo4oCi71Ca7rrV9xS8dZHbPHefsuwIyCpmT7j+MnjAH5X3984UZoFFuJ0yiZ4XEJFxjagEBeqs+e1iyK8Xf/nOuwF+vVK0ur765+vf7txotUi0m3N0m/84RGSrBCNrh8Ee5GjODjF4gnWP+dJrH/Lk9k4oT6d+gr6g/wssA2j64JJGP6cmx554vUZnpZfn6ZfX2bMwPPrlANsB86/DiHjhl0OP+c87+gaJo/gY084s3HoYL/ZkWHTRfBXvvoHnnkHvngKun4KBE/ede7tvq3/vQOxDXB1/fdNz6XbPdcr0Vhpojj9dG+owuSKFsslCi1tgEjirjXdwMiov2EioadxmqTHUCIwo8NgQaeIasAi0fTYSPTbSmwbMOFduyh9wvBrESGY0MtgRjtgQR8Q1bRPohn2UoCRZf9wyYANMXFeJTysqAe0I4mrherOekFdKMrYvJjLvOIUM9SuwYB5DVZUwwVjJJOaUnZCmcEkIZZrKqNvRGRMvmFZsmhP4VMKCSXBhSqUBxgMS7h0cZvEd71AWkEhGWaeMFcNnpqyJkyXgYL7PQ1MoSq0wDAkRtJIijkZSmqYTiSImfLiSWXIZwhRh3Rug2X0kk1Dgj+Iu43u5p98ghopcpSo0Uyc8SnjlYX59WUeaMoDqmVD2TOWD9a4pCRAzf2ECgwGcrHjPOWY9bNxq/OL3I/QjwEAAAA=") format("woff2");
}`;let o=!1;class p{constructor({parent:a,autoPlace:b=void 0===a,container:c,width:d,title:e="Controls",closeFolders:f=!1,injectStyles:g=!0,touchStyles:h=!0}={}){if(this.parent=a,this.root=a?a.root:this,this.children=[],this.controllers=[],this.folders=[],this._closed=!1,this._hidden=!1,this.domElement=document.createElement("div"),this.domElement.classList.add("lil-gui"),this.$title=document.createElement("button"),this.$title.classList.add("lil-title"),this.$title.setAttribute("aria-expanded",!0),this.$title.addEventListener("click",()=>this.openAnimated(this._closed)),this.$title.addEventListener("touchstart",()=>{},{passive:!0}),this.$children=document.createElement("div"),this.$children.classList.add("lil-children"),this.domElement.appendChild(this.$title),this.domElement.appendChild(this.$children),this.title(e),this.parent){this.parent.children.push(this),this.parent.folders.push(this),this.parent.$children.appendChild(this.domElement);return}this.domElement.classList.add("lil-root"),h&&this.domElement.classList.add("lil-allow-touch-styles"),!o&&g&&(!function(a){let b=document.createElement("style");b.innerHTML=a;let c=document.querySelector("head link[rel=stylesheet], head style");c?document.head.insertBefore(b,c):document.head.appendChild(b)}(n),o=!0),c?c.appendChild(this.domElement):b&&(this.domElement.classList.add("lil-auto-place","autoPlace"),document.body.appendChild(this.domElement)),d&&this.domElement.style.setProperty("--width",d+"px"),this._closeFolders=f}add(a,b,c,d,f){if(Object(c)===c)return new l(this,a,b,c);let g=a[b];switch(typeof g){case"number":return new k(this,a,b,c,d,f);case"boolean":return new e(this,a,b);case"string":return new m(this,a,b);case"function":return new j(this,a,b)}console.error(`gui.add failed
	property:`,b,`
	object:`,a,`
	value:`,g)}addColor(a,b,c=1){return new i(this,a,b,c)}addFolder(a){let b=new p({parent:this,title:a});return this.root._closeFolders&&b.close(),b}load(a,b=!0){return a.controllers&&this.controllers.forEach(b=>{!(b instanceof j)&&b._name in a.controllers&&b.load(a.controllers[b._name])}),b&&a.folders&&this.folders.forEach(b=>{b._title in a.folders&&b.load(a.folders[b._title])}),this}save(a=!0){let b={controllers:{},folders:{}};return this.controllers.forEach(a=>{if(!(a instanceof j)){if(a._name in b.controllers)throw Error(`Cannot save GUI with duplicate property "${a._name}"`);b.controllers[a._name]=a.save()}}),a&&this.folders.forEach(a=>{if(a._title in b.folders)throw Error(`Cannot save GUI with duplicate folder "${a._title}"`);b.folders[a._title]=a.save()}),b}open(a=!0){return this._setClosed(!a),this.$title.setAttribute("aria-expanded",!this._closed),this.domElement.classList.toggle("lil-closed",this._closed),this}close(){return this.open(!1)}_setClosed(a){this._closed!==a&&(this._closed=a,this._callOnOpenClose(this))}show(a=!0){return this._hidden=!a,this.domElement.style.display=this._hidden?"none":"",this}hide(){return this.show(!1)}openAnimated(a=!0){return this._setClosed(!a),this.$title.setAttribute("aria-expanded",!this._closed),requestAnimationFrame(()=>{let b=this.$children.clientHeight;this.$children.style.height=b+"px",this.domElement.classList.add("lil-transition");let c=a=>{a.target===this.$children&&(this.$children.style.height="",this.domElement.classList.remove("lil-transition"),this.$children.removeEventListener("transitionend",c))};this.$children.addEventListener("transitionend",c);let d=a?this.$children.scrollHeight:0;this.domElement.classList.toggle("lil-closed",!a),requestAnimationFrame(()=>{this.$children.style.height=d+"px"})}),this}title(a){return this._title=a,this.$title.textContent=a,this}reset(a=!0){return(a?this.controllersRecursive():this.controllers).forEach(a=>a.reset()),this}onChange(a){return this._onChange=a,this}_callOnChange(a){this.parent&&this.parent._callOnChange(a),void 0!==this._onChange&&this._onChange.call(this,{object:a.object,property:a.property,value:a.getValue(),controller:a})}onFinishChange(a){return this._onFinishChange=a,this}_callOnFinishChange(a){this.parent&&this.parent._callOnFinishChange(a),void 0!==this._onFinishChange&&this._onFinishChange.call(this,{object:a.object,property:a.property,value:a.getValue(),controller:a})}onOpenClose(a){return this._onOpenClose=a,this}_callOnOpenClose(a){this.parent&&this.parent._callOnOpenClose(a),void 0!==this._onOpenClose&&this._onOpenClose.call(this,a)}destroy(){this.parent&&(this.parent.children.splice(this.parent.children.indexOf(this),1),this.parent.folders.splice(this.parent.folders.indexOf(this),1)),this.domElement.parentElement&&this.domElement.parentElement.removeChild(this.domElement),Array.from(this.children).forEach(a=>a.destroy())}controllersRecursive(){let a=Array.from(this.controllers);return this.folders.forEach(b=>{a=a.concat(b.controllersRecursive())}),a}foldersRecursive(){let a=Array.from(this.folders);return this.folders.forEach(b=>{a=a.concat(b.foldersRecursive())}),a}}}};