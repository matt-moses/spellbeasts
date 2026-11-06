// The Spell Master: a snowy owl in a magician's hat. Inline SVG in the same ink-outline style as the creatures.
const INK = '#1d2433';
const ST = `stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"`;

export function spellMasterSvg({ size = 120, label = 'The Spell Master, a snowy owl in a magician hat' } = {}) {
  return `<svg class="spell-master" viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="${label}">
<path d="M46 108 l-4 7 M52 108 l0 8 M68 108 l0 8 M74 108 l4 7" fill="none" stroke="#f0a020" stroke-width="4" stroke-linecap="round"/>
<ellipse cx="60" cy="82" rx="33" ry="29" fill="#fff" ${ST}/>
<g fill="none" stroke="#8793aa" stroke-width="2.4" stroke-linecap="round"><path d="M48 80l5 3M60 88l5 3M70 78l5 3M52 95l5 3M66 99l4 2M44 92l4 3"/></g>
<path d="M30 70 Q22 92 38 104 Q42 84 40 68z" fill="#eef3fa" ${ST}/>
<path d="M90 70 Q98 92 82 104 Q78 84 80 68z" fill="#eef3fa" ${ST}/>
<g fill="none" stroke="#8793aa" stroke-width="2.2" stroke-linecap="round"><path d="M31 84l5 2M33 94l5 2M89 84l-5 2M87 94l-5 2"/></g>
<circle cx="60" cy="52" r="27" fill="#fff" ${ST}/>
<g fill="none" stroke="#8793aa" stroke-width="2.2" stroke-linecap="round"><path d="M40 60l4 2M80 60l-4 2M46 70l4 1M74 70l-4 1"/></g>
<circle cx="49" cy="52" r="9.5" fill="#ffd23f" ${ST}/><circle cx="71" cy="52" r="9.5" fill="#ffd23f" ${ST}/>
<circle cx="49" cy="52" r="4.6" fill="${INK}"/><circle cx="71" cy="52" r="4.6" fill="${INK}"/>
<circle cx="50.8" cy="50.2" r="1.6" fill="#fff"/><circle cx="72.8" cy="50.2" r="1.6" fill="#fff"/>
<path d="M56 60 L60 69 L64 60z" fill="#2b2f3a" ${ST}/>
<ellipse cx="60" cy="31" rx="33" ry="7.5" fill="#5b34b8" ${ST}/>
<path d="M40 30 Q52 12 66 2 Q68 18 82 30z" fill="#6d45d6" ${ST}/>
<path d="M42 29 Q60 36 80 29" fill="none" stroke="#ffc928" stroke-width="4.5" stroke-linecap="round"/>
<path d="M63 19 l1.8 3.8 4.2.5 -3.1 2.9 .8 4.1 -3.7 -2 -3.7 2 .8 -4.1 -3.1 -2.9 4.2 -.5z" fill="#ffc928" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
<path d="M88 86 L108 56" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
<path d="M88 86 L108 56" stroke="#a9733a" stroke-width="3.2" stroke-linecap="round"/>
<path d="M110 44 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4z" fill="#ffd23f" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
</svg>`;
}
